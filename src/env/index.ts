import 'dotenv/config'

import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['production', 'development']).default('development'),
  DATABASE_URL: z.string({ required_error: 'DATABASE_URL not provided!' }),
  PORT: z.coerce
    .number({ required_error: 'Server PORT not provided!' })
    .default(3333),
})

const _env = envSchema.safeParse(process.env)

if (_env.success === false) {
  console.error('Invalid enviroment variables.', _env.error.format())
  throw new Error('Invalid enviroment variables.')
}

export const env = _env.data
