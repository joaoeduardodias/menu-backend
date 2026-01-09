import type { Prisma } from '@/generated/prisma/client'
import { OrderStatus, PaymentMethod } from '@/generated/prisma/enums'
import { prisma } from '@/lib/prisma'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'
import { BadRequestError } from '../_errors/bad-request-error'

const getOrdersQuerySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().min(1)).default(1),
  limit: z.string().transform(Number).pipe(z.number().int().min(1)).default(10),
  status: z.enum(OrderStatus).optional(),
  search: z.string().optional(),
  customerId: z.cuid().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
})

const responseOrders = z.object({
  orders: z.array(
    z.object({
      id: z.cuid(),
      orderNumber: z.number(),
      status: z.enum(OrderStatus),
      paymentMethod: z.enum(PaymentMethod),
      total: z.number(),
      itemsCount: z.number(),
      createdAt: z.date(),
      updatedAt: z.date(),
      customer: z.object({
        id: z.cuid(),
        email: z.email(),
        name: z.string().nullable(),
        phone: z.string().nullable(),
      }).nullable(),
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
        number: z.number().nullable(),
        name: z.string().nullable(),
        street: z.string(),
        complement: z.string().nullable(),
        neighborhood: z.string().nullable(),
        city: z.string(),
        zipCode: z.string(),
      }).nullable(),
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

export async function getOrders(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get(
    '/orders',
    {
      schema: {
        tags: ['Orders'],
        summary: 'List all orders',
        security: [{ bearerAuth: [] }],
        querystring: getOrdersQuerySchema,
        response: { 200: responseOrders },
      },
    },
    async (request, reply) => {
      const {
        page,
        limit,
        status,
        customerId,
        startDate,
        search,
        endDate,
      } = request.query

      const skip = (page - 1) * limit

      const where: Prisma.OrderWhereInput = {}

      if (status) where.status = status
      if (customerId) where.customerId = customerId

      if (startDate || endDate) {
        where.createdAt = {}
        if (startDate) where.createdAt.gte = startDate
        if (endDate) where.createdAt.lte = endDate
      }

      const normalizedSearch = search?.trim()
      if (normalizedSearch) {
        where.OR = [
          ...(where.OR ?? []),
          { customer: { name: { contains: normalizedSearch, mode: 'insensitive' } } },
          { customer: { email: { contains: normalizedSearch, mode: 'insensitive' } } },
          { customer: { phone: { contains: normalizedSearch, mode: 'insensitive' } } },
        ]
      }

      try {
        const [orders, total] = await Promise.all([
          prisma.order.findMany({
            where,
            skip,
            take: limit,
            select: {
              id: true,
              paymentMethod: true,
              orderNumber: true,
              status: true,
              createdAt: true,
              updatedAt: true,
              items: {
                select: {
                  id: true,
                  quantity: true,
                  unitPrice: true,
                  product: {
                    select: {
                      id: true,
                      name: true,
                      slug: true,
                    },
                  },
                },
              },
              address: {
                select: {
                  city: true,
                  neighborhood: true,
                  name: true,
                  number: true,
                  street: true,
                  complement: true,
                  zipCode: true,
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
            },
            orderBy: { createdAt: 'desc' },
          }),
          prisma.order.count({ where }),
        ])

        const ordersWithTotal = orders.map(order => {
          const items = order.items.map(item => {
            return {
              id: item.id,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              product: {
                id: item.product.id,
                name: item.product.name,
                slug: item.product.slug,
              },
            }
          })

          const total = items.reduce(
            (sum, it) => sum + (Number(it.unitPrice) * it.quantity),
            0,
          )

          return {
            ...order,
            items,
            total,
            itemsCount: items.length,
          }
        })

        const totalPages = Math.ceil(total / limit)

        return reply.send({
          orders: ordersWithTotal,
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
        throw new BadRequestError('Failed to fetch orders.')
      }
    },
  )
}
