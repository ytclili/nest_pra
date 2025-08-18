pipeline {
    agent any
    
    environment {
        // Docker 配置
        DOCKER_REGISTRY = 'your-registry.com'
        DOCKER_IMAGE = 'nestjs-app'
        DOCKER_TAG = "${BUILD_NUMBER}"
        
        // 应用配置
        APP_NAME = 'nestjs-backend'
        
        // 环境配置
        DEV_SERVER = 'dev-server.com'
        STAGING_SERVER = 'staging-server.com'
        PROD_SERVER = 'prod-server.com'
        
        // 凭据 ID (需要在 Jenkins 中配置)
        DOCKER_CREDENTIALS = 'docker-registry-credentials'
        SSH_CREDENTIALS = 'server-ssh-credentials'
        SONAR_CREDENTIALS = 'sonarqube-token'
    }
    
    tools {
        nodejs '18' // 需要在 Jenkins 中配置 Node.js 18
    }
    
    stages {
        stage('Checkout') {
            steps {
                echo '📥 检出代码...'
                checkout scm
                script {
                    env.GIT_COMMIT_SHORT = sh(
                        script: 'git rev-parse --short HEAD',
                        returnStdout: true
                    ).trim()
                }
            }
        }
        
        stage('Install Dependencies') {
            steps {
                echo '📦 安装依赖...'
                sh '''
                    npm ci --only=production=false
                    npm list --depth=0
                '''
            }
        }
        
        stage('Code Quality') {
            parallel {
                stage('Lint') {
                    steps {
                        echo '🔍 代码检查...'
                        // sh 'npm run lint'
                    }
                }
                
                stage('Format Check') {
                    steps {
                        echo '📝 格式检查...'
                        sh 'npm run format:check'
                    }
                }
                
                stage('Security Audit') {
                    steps {
                        echo '🔒 安全审计...'
                        sh 'npm audit --audit-level=high'
                    }
                }
            }
        }
        
        stage('Test') {
            parallel {
                stage('Unit Tests') {
                    steps {
                        echo '🧪 单元测试...'
                        sh 'npm run test:cov'
                    }
                    post {
                        always {
                            publishTestResults testResultsPattern: 'coverage/junit.xml'
                            publishCoverage adapters: [
                                istanbulCoberturaAdapter('coverage/cobertura-coverage.xml')
                            ], sourceFileResolver: sourceFiles('STORE_LAST_BUILD')
                        }
                    }
                }
                
                stage('E2E Tests') {
                    steps {
                        echo '🔄 端到端测试...'
                        sh '''
                            # 启动测试数据库
                            docker-compose -f docker-compose.test.yml up -d
                            sleep 10
                            
                            # 运行 E2E 测试
                            npm run test:e2e
                        '''
                    }
                    post {
                        always {
                            sh 'docker-compose -f docker-compose.test.yml down'
                        }
                    }
                }
            }
        }
        
        stage('SonarQube Analysis') {
            when {
                anyOf {
                    branch 'main'
                    branch 'develop'
                    changeRequest()
                }
            }
            steps {
                echo '📊 代码质量分析...'
                withSonarQubeEnv('SonarQube') {
                    sh '''
                        npx sonar-scanner \
                            -Dsonar.projectKey=${APP_NAME} \
                            -Dsonar.sources=src \
                            -Dsonar.tests=test \
                            -Dsonar.typescript.lcov.reportPaths=coverage/lcov.info \
                            -Dsonar.testExecutionReportPaths=coverage/test-reporter.xml
                    '''
                }
            }
        }
        
        stage('Build') {
            steps {
                echo '🏗️ 构建应用...'
                sh 'npm run build'
                
                // 构建 Docker 镜像
                script {
                    def image = docker.build("${DOCKER_REGISTRY}/${DOCKER_IMAGE}:${DOCKER_TAG}")
                    docker.withRegistry("https://${DOCKER_REGISTRY}", DOCKER_CREDENTIALS) {
                        image.push()
                        image.push('latest')
                    }
                }
            }
        }
        
        stage('Deploy to Development') {
            when {
                branch 'develop'
            }
            steps {
                echo '🚀 部署到开发环境...'
                script {
                    deployToEnvironment('development', DEV_SERVER)
                }
            }
        }
        
        stage('Deploy to Staging') {
            when {
                branch 'main'
            }
            steps {
                echo '🎭 部署到预发布环境...'
                script {
                    deployToEnvironment('staging', STAGING_SERVER)
                }
            }
        }
        
        stage('Approval for Production') {
            when {
                branch 'main'
            }
            steps {
                echo '⏳ 等待生产环境部署审批...'
                timeout(time: 30, unit: 'MINUTES') {
                    input message: '是否部署到生产环境?', 
                          ok: '部署',
                          submitterParameter: 'APPROVER'
                }
            }
        }
        
        stage('Deploy to Production') {
            when {
                branch 'main'
            }
            steps {
                echo '🌟 部署到生产环境...'
                script {
                    deployToEnvironment('production', PROD_SERVER)
                }
            }
        }
        
        stage('Health Check') {
            steps {
                echo '🏥 健康检查...'
                script {
                    def environment = env.BRANCH_NAME == 'main' ? 'production' : 
                                    env.BRANCH_NAME == 'develop' ? 'development' : 'staging'
                    
                    sh """
                        sleep 30
                        curl -f http://${getServerByEnv(environment)}/health || exit 1
                        curl -f http://${getServerByEnv(environment)}/metrics || exit 1
                    """
                }
            }
        }
    }
    
    post {
        always {
            echo '🧹 清理工作空间...'
            cleanWs()
        }
        
        success {
            echo '✅ 流水线执行成功!'
            script {
                if (env.BRANCH_NAME == 'main') {
                    // 发送成功通知
                    sendNotification('success', '生产环境部署成功')
                }
            }
        }
        
        failure {
            echo '❌ 流水线执行失败!'
            sendNotification('failure', '构建或部署失败')
        }
        
        unstable {
            echo '⚠️ 流水线不稳定!'
            sendNotification('unstable', '构建不稳定，请检查测试结果')
        }
    }
}

// 部署函数
def deployToEnvironment(environment, server) {
    withCredentials([sshUserPrivateKey(credentialsId: SSH_CREDENTIALS, keyFileVariable: 'SSH_KEY')]) {
        sh """
            # 复制部署脚本到服务器
            scp -i \$SSH_KEY -o StrictHostKeyChecking=no \
                scripts/deploy.sh jenkins@${server}:/tmp/
            
            # 执行部署
            ssh -i \$SSH_KEY -o StrictHostKeyChecking=no jenkins@${server} \
                "chmod +x /tmp/deploy.sh && \
                 /tmp/deploy.sh ${environment} ${DOCKER_REGISTRY}/${DOCKER_IMAGE}:${DOCKER_TAG}"
        """
    }
}

// 获取服务器地址
def getServerByEnv(environment) {
    switch(environment) {
        case 'development': return DEV_SERVER
        case 'staging': return STAGING_SERVER
        case 'production': return PROD_SERVER
        default: return DEV_SERVER
    }
}

// 发送通知
def sendNotification(status, message) {
    def color = status == 'success' ? 'good' : 
                status == 'failure' ? 'danger' : 'warning'
    
    // Slack 通知 (需要配置 Slack 插件)
    slackSend(
        channel: '#deployments',
        color: color,
        message: """
            *${APP_NAME}* - ${status.toUpperCase()}
            分支: ${env.BRANCH_NAME}
            构建: #${BUILD_NUMBER}
            提交: ${env.GIT_COMMIT_SHORT}
            消息: ${message}
            详情: ${BUILD_URL}
        """
    )
    
    // 邮件通知
    emailext(
        subject: "[Jenkins] ${APP_NAME} - ${status.toUpperCase()}",
        body: """
            <h3>${APP_NAME} 构建 ${status.toUpperCase()}</h3>
            <p><strong>分支:</strong> ${env.BRANCH_NAME}</p>
            <p><strong>构建号:</strong> #${BUILD_NUMBER}</p>
            <p><strong>提交:</strong> ${env.GIT_COMMIT_SHORT}</p>
            <p><strong>消息:</strong> ${message}</p>
            <p><strong>详情:</strong> <a href="${BUILD_URL}">${BUILD_URL}</a></p>
        """,
        to: 'dev-team@company.com'
    )
}
