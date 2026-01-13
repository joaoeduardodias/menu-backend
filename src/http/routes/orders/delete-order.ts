import { prisma } from '@/lib/prisma'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod/v4'
import { BadRequestError } from '../_errors/bad-request-error'

const orderIdParamsSchema = z.object({
  id: z.cuid('Formato de ID inválido'),
})

export async function deleteOrder(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().delete('/orders/:id',
    {
      schema: {
        tags: ['Orders'],
        summary: 'Delete an order',
        operationId: 'deleteOrder',
        security: [
          { bearerAuth: [] },
        ],
        params: orderIdParamsSchema,
        response: {
          204: z.null(),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params

      const existingOrder = await prisma.order.findUnique({
        where: { id },

      })

      if (!existingOrder) {
        throw new BadRequestError('Pedido não encontrado.')
      }

      if (existingOrder.status === 'CONFIRMED' ||
        existingOrder.status === 'DELIVERED') {
        throw new BadRequestError(
          'Você não pode apagar pedidos confirmados ou em entrega.',
        )
      }

      try {
        await prisma.order.delete({
          where: { id },
        })

        return reply.status(204).send()
      } catch {
        throw new BadRequestError('Failed to delete order.')
      }
    },
  )
}
