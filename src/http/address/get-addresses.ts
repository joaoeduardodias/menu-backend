import { auth } from '@/http/middlewares/auth'
import { prisma } from '@/lib/prisma'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

const addressSchema = z.object({
  addresses: z.array(z.object({
    number: z.number().nullable(),
    name: z.string().nullable(),
    street: z.string(),
    complement: z.string().nullable(),
    neighborhood: z.string(),
    city: z.string(),
    zipCode: z.string(),
    isDefault: z.boolean(),
    id: z.string(),
  }))
})

export async function getAddresses(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().register(auth).get('/addresses',
    {
      schema: {
        tags: ['Address'],
        summary: 'Get user addresses',
        security: [
          { bearerAuth: [] },
        ],
        response: {
          200: addressSchema,
        },
      },
    },
    async (request, reply) => {
      const userId = await request.getCurrentUserId()

      const addresses = await prisma.address.findMany({
        where: { customerId: userId.sub },
        select: {
          city: true,
          complement: true,
          id: true,
          isDefault: true,
          name: true,
          neighborhood: true,
          number: true,
          street: true,
          zipCode: true
        },
        orderBy: [
          { isDefault: 'desc' },
        ],
      })

      return reply.send({ addresses })
    })
}
