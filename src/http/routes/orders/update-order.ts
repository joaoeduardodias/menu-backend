import { OrderStatus, PaymentMethod } from '@/generated/prisma/enums'
import { auth } from '@/http/middlewares/auth'
import { prisma } from '@/lib/prisma'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'
import { BadRequestError } from '../_errors/bad-request-error'

const orderIdParamsSchema = z.object({
  id: z.cuid('Invalid order ID format'),
})

const updateOrderSchema = z.object({
  addressId: z.cuid('Invalid address ID format').optional(),
  paymentMethod: z.enum(PaymentMethod).optional(),
  changeFor: z.number().int().positive().optional(),
  status: z.enum(OrderStatus).optional(),
  couponId: z.cuid('Invalid coupon ID format').nullable().optional(),
  items: z.array(z.object({
    productId: z.cuid('Invalid product ID format'),
    quantity: z.number().int().min(1),
    unitPrice: z.number().int().min(1),
  })).optional(),
})

export async function updateOrder(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().register(auth).put('/orders/:id',
    {
      schema: {
        tags: ['Orders'],
        summary: 'Update order',
        operationId: 'updateOrder',
        params: orderIdParamsSchema,
        body: updateOrderSchema,
        security: [
          { bearerAuth: [] },
        ],
        response: {
          204: z.null(),
        },
      },
    },
    async (request, reply) => {
      const { sub: customerId } = await request.getCurrentUserId()
      const { id } = request.params
      const { addressId, paymentMethod, changeFor, status, couponId, items } = request.body

      const existingOrder = await prisma.order.findUnique({
        where: { id },
      })

      if (!existingOrder) {
        throw new BadRequestError('Pedido não encontrado')
      }


      if (addressId) {
        const exists = await prisma.address.findUnique({ where: { id: addressId } })
        if (!exists) throw new BadRequestError('Endereço não encontrado.')
      }

      if (couponId) {
        const exists = await prisma.coupon.findUnique({ where: { id: couponId } })
        if (!exists) throw new BadRequestError('Cupom não encontrado')
      }

      try {
        await prisma.order.update({
          where: { id },
          data: {
            ...(customerId !== undefined && { customerId }),
            ...(addressId !== undefined && { addressId }),
            ...(paymentMethod !== undefined && { paymentMethod }),
            ...(changeFor !== undefined && { changeFor }),
            ...(couponId !== undefined && { couponId }),
            ...(status && {
              status,
              statusHistory: {
                create: { status },
              },
            }),
            ...(items && {
              items: {
                deleteMany: {},
                create: items.map(i => ({
                  productId: i.productId,
                  quantity: i.quantity,
                  unitPrice: i.unitPrice,
                  subtotal: i.unitPrice * i.quantity,
                })),
              },
            }),
          },
        })

        return reply.status(204).send()
      } catch (err) {
        throw new BadRequestError('Erro ao atualizar pedido.')
      }
    },
  )
}
