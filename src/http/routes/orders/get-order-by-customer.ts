/* eslint-disable @stylistic/indent */
import type { Prisma } from '@/generated/prisma/client'
import { OrderStatus } from '@/generated/prisma/enums'
import { auth } from '@/http/middlewares/auth'
import { prisma } from '@/lib/prisma'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'
import { BadRequestError } from '../_errors/bad-request-error'

const getOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: z.enum(OrderStatus).optional(),
})

const responseOrders = z.object({
  orders: z.array(
    z.object({
      id: z.cuid(),
      status: z.enum(OrderStatus),
      createdAt: z.date(),
      updatedAt: z.date(),
      total: z.number(),
      itemsCount: z.number(),
      customer: z.object({
        id: z.cuid(),
        email: z.email(),
        name: z.string().nullable(),
      }),
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
      address: z.object({
        street: z.string(),
        number: z.number().nullable(),
        complement: z.string().nullable(),
        neighborhood: z.string(),
        city: z.string(),
        zipCode: z.string(),
      }),
    }),
  ),
  pagination: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
})

export async function getOrdersByCustomer(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>()
    .register(auth)
    .get('/orders/customer',
      {
        schema: {
          tags: ['Orders'],
          summary: 'Get customer orders',
          operationId: 'getOrdersByCustomer',
          querystring: getOrdersQuerySchema,
          security: [{ bearerAuth: [] }],
          response: { 200: responseOrders },
        },
      },
      async (request, reply) => {
        const { sub: customerId } = await request.getCurrentUserId()
        const { page, limit, status } = request.query
        const skip = (page - 1) * limit

        const user = await prisma.user.findUnique({ where: { id: customerId } })
        if (!user) throw new BadRequestError('Cliente não encontrado.')

        const where: Prisma.OrderWhereInput = { customerId }
        if (status) where.status = status

        try {
          const [orders, total] = await Promise.all([
            prisma.order.findMany({
              where,
              skip,
              take: limit,
              include: {
                items: {
                  include: {
                    product: { select: { id: true, name: true, slug: true } },
                  },
                },
                address: true,
                customer: { select: { id: true, name: true, email: true } },
              },
              orderBy: { createdAt: 'desc' },
            }),
            prisma.order.count({ where }),
          ])

          const mappedOrders = orders.map(order => ({
            id: order.id,
            status: order.status,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
            total: order.total,
            itemsCount: order.items.length,
            customer: {
              id: order.customer.id,
              name: order.customer.name,
              email: order.customer.email,
            },
            items: order.items.map(item => ({
              id: item.id,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              product: item.product,
            })),
            address: order.address && {
              street: order.address.street,
              number: order.address.number,
              complement: order.address.complement,
              neighborhood: order.address.neighborhood,
              city: order.address.city,
              zipCode: order.address.zipCode,
            },
          }))

          const totalPages = Math.ceil(total / limit)

          return reply.send({
            orders: mappedOrders,
            pagination: {
              page,
              limit,
              total,
              totalPages,
              hasNext: page < totalPages,
              hasPrev: page > 1,
            },
          })
        } catch (err) {
          console.error(err)
          throw new BadRequestError('Falha ao buscar pedidos do cliente.')
        }
      })
}
