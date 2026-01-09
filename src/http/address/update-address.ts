import { auth } from '@/http/middlewares/auth'
import { prisma } from '@/lib/prisma'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'
import { BadRequestError } from '../routes/_errors/bad-request-error'

const addressSchema = z.object({
  street: z.string(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string(),
  zipCode: z.string(),
  name: z.string(),
  number: z.number(),
  isDefault: z.boolean().default(false),

})

const updateAddressSchema = addressSchema.partial()

export async function updateAddress(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().register(auth).put('/addresses/:id',
    {
      schema: {
        tags: ['Address'],
        summary: 'Update address',
        params: z.object({
          id: z.uuid(),
        }),
        body: updateAddressSchema,
        security: [
          { bearerAuth: [] },
        ],
        response: {
          204: z.null(),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params
      const { city, complement, isDefault, neighborhood, number, street, zipCode, name } = request.body
      const userId = await request.getCurrentUserId()

      const existingAddress = await prisma.address.findFirst({
        where: {
          id,
          customerId: userId.sub,
        },
      })

      if (!existingAddress) {
        throw new BadRequestError('Endereço não encontrado')
      }

      if (isDefault) {
        await prisma.address.updateMany({
          where: {
            customerId: userId.sub,
            id: { not: id },
          },
          data: { isDefault: false },
        })
      }

      await prisma.address.update({
        where: { id },
        data: {
          city,
          complement,
          isDefault,
          name,
          neighborhood,
          number,
          street,
          zipCode,

        },
      })

      return reply.status(204).send()
    })
}
