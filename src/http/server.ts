import { env } from '@/lib/env'
import fastifyCors from '@fastify/cors'
import fastifyJwt from '@fastify/jwt'
import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUi from '@fastify/swagger-ui'
import { fastify } from 'fastify'
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { errorHandler } from './error-handler'
import { authRoutes } from './routes/auth'
import { cartRoutes } from './routes/cart'
import { couponRoutes } from './routes/coupons'
import { ordersRoutes } from './routes/orders'
import { productRoutes } from './routes/products'

const app = fastify().withTypeProvider<ZodTypeProvider>()

app.setSerializerCompiler(serializerCompiler)
app.setValidatorCompiler(validatorCompiler)
app.setErrorHandler(errorHandler)

app.register(fastifySwagger, {
  openapi: {
    info: {
      title: 'Api Documentation - Menu Digital',
      description: 'API documentation for Menu digital',
      version: '1.0.0',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  transform: jsonSchemaTransform,
})

app.register(fastifySwaggerUi, {
  routePrefix: '/docs',
})

app.register(fastifyCors)
app.register(fastifyJwt, {
  secret: env.JWT_SECRET,
})




app.register(productRoutes)
app.register(ordersRoutes)
app.register(authRoutes)
app.register(cartRoutes)
app.register(couponRoutes)

app.listen({ port: env.PORT, host: '0.0.0.0' }, () => {
  console.log(`🚀 HTTP server running on http://0.0.0.0:${env.PORT}`)
})