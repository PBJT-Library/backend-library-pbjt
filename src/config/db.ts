import postgres from 'postgres';
import { env } from './env';

export const db = postgres({
  host: env.db.host,
  port: env.db.port,
  database: env.db.name,
  username: env.db.user,
  password: env.db.password,
});
