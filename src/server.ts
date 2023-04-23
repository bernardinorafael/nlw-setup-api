import cors from '@fastify/cors'
import Fastify from 'fastify'

import { env } from './env'
import { appRoutes } from './routes'

const app = Fastify()

app.register(cors, {
  origin: ['http://localhost:3000'],
})

app.register(appRoutes, {
  prefix: 'habits',
})

app
  .listen({
    port: env.PORT,
  })
  .then(() => {
    console.log(`Server running at ${env.PORT}!`)
  })
  .catch((err) => {
    app.log.error(err)
    process.exit(1)
  })
