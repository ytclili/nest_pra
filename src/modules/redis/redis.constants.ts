export const REDIS_CLIENT = Symbol('REDIS_CLIENT');
export const REDIS_SUBSCRIBER = Symbol('REDIS_SUBSCRIBER');
export const REDIS_OPTIONS = Symbol('REDIS_OPTIONS');

export type RedisModuleOptions = {
  url?: string;
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  tls?: boolean;
  keyPrefix?: string;
};
