import { OrderStatus, PaymentMethod, type CouponType } from '@/generated/prisma/enums'
import { auth } from '@/http/middlewares/auth'
import { prisma } from '@/lib/prisma'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod/v4'
import { BadRequestError } from '../_errors/bad-request-error'

const orderItemSchema = z.object({
  productId: z.cuid(),
  quantity: z.number().int().min(1),
  unitPrice: z.number().positive(),
})

const createOrderSchema = z.object({
  status: z.enum(OrderStatus).default('PENDING'),
  paymentMethod: z.enum(PaymentMethod),
  addressId: z.cuid(),
  couponCode: z.string().trim().optional(),
  deliveryFee: z.number().int().nonnegative().default(500),
  items: z.array(orderItemSchema).min(1),
})

function calcItemsTotal(items: { quantity: number; unitPrice: number }[]) {
  return items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0)
}

function calcDiscount(coupon: { type: CouponType; value: number }, itemsTotal: number) {
  return coupon.type === 'PERCENT'
    ? Math.floor((itemsTotal * coupon.value) / 100)
    : coupon.value
}

export async function createOrder(app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .register(auth)
    .post(
      '/orders',
      {
        schema: {
          tags: ['Orders'],
          summary: 'Create order',
          operationId: 'createOrder',
          body: createOrderSchema,
          security: [{ bearerAuth: [] }],
          response: {
            201: z.object({
              orderId: z.cuid(),
            }),
          },
        },
      },
      async (request, reply) => {
        const user = await request.getCurrentUserId()
        const { status, addressId, items, paymentMethod, couponCode, deliveryFee } = request.body

        if (addressId) {
          const address = await prisma.address.findUnique({ where: { id: addressId } })
          if (!address || address.customerId !== user.sub) {
            throw new BadRequestError('Endereço inválido.')
          }
        }

        const itemsPayload = items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.quantity * item.unitPrice,
        }))

        const itemsTotal = calcItemsTotal(itemsPayload)


        let coupon: null | {
          id: string
          type: CouponType
          value: number
          minOrderValue: number | null
          maxUses: number | null
          usedCount: number
          expiresAt: Date | null
          isActive: boolean
        } = null

        if (couponCode) {
          coupon = await prisma.coupon.findUnique({ where: { code: couponCode } })

          if (!coupon || !coupon.isActive || (coupon.expiresAt && coupon.expiresAt < new Date())) {
            throw new BadRequestError('Cupom inválido ou expirado.')
          }

          if (coupon.minOrderValue && itemsTotal < coupon.minOrderValue) {
            throw new BadRequestError('Valor mínimo do pedido não atingido.')
          }

          if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
            throw new BadRequestError('Limite de uso do cupom atingido.')
          }

          const alreadyUsed = await prisma.couponUsage.findFirst({
            where: { couponId: coupon.id, userId: user.sub },
          })

          if (alreadyUsed) {
            throw new BadRequestError('Você já utilizou este cupom.')
          }
        }

        const discount = coupon ? calcDiscount(coupon, itemsTotal) : 0
        const total = Math.max(itemsTotal + deliveryFee - discount, 0)

        try {
          const order = await prisma.$transaction(async tx => {
            const createdOrder = await tx.order.create({
              data: {
                customerId: user.sub,
                status,
                paymentMethod,
                addressId,
                itemsTotal,
                deliveryFee,
                total,
                couponId: coupon?.id ?? null,
                items: {
                  create: itemsPayload,
                },
              },
            })

            if (coupon) {
              await tx.couponUsage.create({
                data: { couponId: coupon.id, userId: user.sub },
              })

              await tx.coupon.update({
                where: { id: coupon.id },
                data: { usedCount: { increment: 1 } },
              })
            }

            return createdOrder
          })

          return reply.status(201).send({ orderId: order.id })
        } catch (err) {
          console.error(err)
          throw new BadRequestError('Falha ao criar pedido.')
        }
      },
    )
}
