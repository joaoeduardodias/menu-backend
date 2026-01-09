import { OrderStatus } from '@/generated/prisma/enums'
import { auth } from '@/http/middlewares/auth'
import { prisma } from '@/lib/prisma'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'
import { BadRequestError } from '../_errors/bad-request-error'

const checkoutBodySchema = z.object({
  addressId: z.cuid('Invalid address ID format'),
})

const orderResponseSchema = z.object({
  order: z.object({
    id: z.string(),
    items: z.array(z.object({
      product: z.object({
        id: z.string(),
        name: z.string(),
      }),
    })),
  }).nullable()
})

export async function checkout(app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .register(auth)
    .post('/cart/checkout',
      {
        schema: {
          tags: ['Cart'],
          summary: 'Checkout cart',
          body: checkoutBodySchema,
          security: [
            { bearerAuth: [] },
          ],
          response: {
            200: orderResponseSchema,
          },
        },
      },
      async (request, reply) => {
        const { addressId } = request.body
        const userId = await request.getCurrentUserId()

        const address = await prisma.address.findFirst({
          where: {
            id: addressId,
            customerId: userId.sub,
          },
        })

        if (!address) {
          throw new BadRequestError('Endereço não encontrado.')
        }

        const cart = await prisma.order.findFirst({
          where: {
            customerId: userId.sub,
            status: OrderStatus.PENDING,
          },
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        })

        if (!cart || cart.items.length === 0) {
          throw new BadRequestError('Carrinho está vazio.')
        }

        await prisma.order.update({
          where: { id: cart.id },
          data: {
            status: OrderStatus.CONFIRMED,
            addressId,
            statusHistory: {
              create: {
                status: OrderStatus.CONFIRMED,
              },
            },
          },
        })

        const order = await prisma.order.findUnique({
          where: { id: cart.id },
          select: {
            id: true,
            items: {
              select: {
                product: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        })

        return reply.send({ order })
      },
    )
}
