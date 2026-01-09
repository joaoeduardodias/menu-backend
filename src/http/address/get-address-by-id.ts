import { auth } from '@/http/middlewares/auth'
import { prisma } from '@/lib/prisma'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'
import { BadRequestError } from '../routes/_errors/bad-request-error'

const addressSchema = z.object({
  address: z.object({
    number: z.number().nullable(),
    street: z.string(),
    complement: z.string().nullable(),
    neighborhood: z.string().nullable(),
    city: z.string(),
    zipCode: z.string(),
    isDefault: z.boolean(),
    id: z.string(),
    customerId: z.string(),
  })
})

export async function getAddressById(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().register(auth).get('/addresses/:id',
    {
      schema: {
        tags: ['Address'],
        summary: 'Get address by ID',
        params: z.object({
          id: z.uuid(),
        }),
        security: [
          { bearerAuth: [] },
        ],
        response: {
          200: addressSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params
      const userId = await request.getCurrentUserId()

      const address = await prisma.address.findFirst({
        select: {
          id: true,
          number: true,
          street: true,
          complement: true,
          neighborhood: true,
          city: true,
          zipCode: true,
          isDefault: true,
          customerId: true,
        },
        where: {
          id,
          customerId: userId.sub,
        },
      })

      if (!address) {
        throw new BadRequestError('Endereço não encontrado')
      }

      return reply.send({ address })
    })
}
