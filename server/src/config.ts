import 'dotenv/config';
import { z } from 'zod';
const schema=z.object({NODE_ENV:z.enum(['development','test','production']).default('development'),PORT:z.coerce.number().default(4000),MONGODB_URI:z.string().min(1),CLIENT_ORIGIN:z.string().url(),JWT_SECRET:z.string().min(32),COOKIE_SECURE:z.enum(['true','false']).default('false').transform(v=>v==='true'),LOG_LEVEL:z.string().default('info')});
const parsed=schema.safeParse(process.env); if(!parsed.success){const fields=parsed.error.issues.map(issue=>issue.path.join('.')||'configuration').join(', ');throw new Error(`Invalid server configuration (${fields}). Copy server/.env.example to server/.env and set the required values.`);} export const env=parsed.data;
