import { prisma } from '@/lib/prisma'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod/v4'

export async function getProducts(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get(
    '/products',
    {
      schema: {
        tags: ['Products'],
        summary: 'List products',
        operationId: 'getProducts',
        querystring: z.object({
          page: z.coerce.number().int().min(1).default(1),
          limit: z.coerce.number().int().min(1).max(100).default(20),
          categoryId: z.cuid().optional(),
          popular: z.coerce.boolean().optional(),
          available: z.coerce.boolean().optional(),
        }),
        response: {
          200: z.object({
            products: z.array(z.object({
              id: z.string(),
              name: z.string(),
              slug: z.string(),
              price: z.number(),
              image: z.string(),
              popular: z.boolean(),
              available: z.boolean(),
            })),
            total: z.number(),
            page: z.number(),
            limit: z.number(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { page, limit, categoryId, popular, available } = request.query

      const where: any = {}
      if (categoryId) where.categoryId = categoryId
      if (popular !== undefined) where.popular = popular
      if (available !== undefined) where.available = available

      const [total, products] = await Promise.all([
        prisma.product.count({ where }),
        prisma.product.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
      ])

      return reply.status(200).send({
        products,
        total,
        page,
        limit,
      })
    },
  )
}
