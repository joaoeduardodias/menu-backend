import { OrderStatus, PaymentMethod } from '@/generated/prisma/enums'
import { prisma } from '@/lib/prisma'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'
import { BadRequestError } from '../_errors/bad-request-error'

const orderIdParamsSchema = z.object({
  id: z.string().cuid('Invalid order ID format'),
})

const responseOrder = z.object({
  order: z.object({
    id: z.cuid(),
    orderNumber: z.number(),
    status: z.enum(OrderStatus),
    paymentMethod: z.enum(PaymentMethod),
    items: z.array(z.object({
      id: z.cuid(),
      quantity: z.number(),
      unitPrice: z.number(),
      product: z.object({
        id: z.cuid(),
        name: z.string(),
        slug: z.string(),
      }),
    })),
    itemsCount: z.number(),
    itemsTotal: z.number(),
    deliveryFee: z.number(),
    total: z.number(),
    createdAt: z.date(),
    updatedAt: z.date(),
    customer: z.object({
      id: z.cuid(),
      email: z.email(),
      name: z.string().nullable(),
      phone: z.string().nullable(),
    }),
    address: z.object({
      id: z.cuid(),
      street: z.string(),
      number: z.number().nullable(),
      complement: z.string().nullable(),
      neighborhood: z.string(),
      city: z.string(),
      zipCode: z.string(),
    }),
  }),
})

export async function getOrderById(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get(
    '/orders/:id',
    {
      schema: {
        tags: ['Orders'],
        summary: 'Get order by ID',
        operationId: 'getOrderById',
        security: [{ bearerAuth: [] }],
        params: orderIdParamsSchema,
        response: { 200: responseOrder },
      },
    },
    async (request, reply) => {
      const { id } = request.params

      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          address: true,
        },
      })

      if (!order) {
        throw new BadRequestError('Pedido não encontrado.')
      }

      const response = {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentMethod: order.paymentMethod,
        items: order.items.map(i => ({
          id: i.id,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          product: i.product,
        })),
        itemsCount: order.items.length,
        itemsTotal: order.itemsTotal,
        deliveryFee: order.deliveryFee,
        total: order.total,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        customer: order.customer,
        address: order.address && {
          id: order.address.id,
          street: order.address.street,
          number: order.address.number,
          complement: order.address.complement,
          neighborhood: order.address.neighborhood,
          city: order.address.city,
          zipCode: order.address.zipCode,
        },
      }

      return reply.status(200).send({ order: response })
    },
  )
}
