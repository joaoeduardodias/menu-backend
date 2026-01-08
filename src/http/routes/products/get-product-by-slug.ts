import { prisma } from '@/lib/prisma'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'
import { BadRequestError } from '../_errors/bad-request-error'

export async function getProduct(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get(
    '/products/:slug',
    {
      schema: {
        tags: ['Products'],
        summary: 'Get product by slug',
        params: z.object({
          slug: z.string("Slug é obrigatório").min(1),
        }),
        response: {
          200: z.object({
            id: z.cuid(),
            name: z.string(),
            slug: z.string(),
            description: z.string(),
            price: z.number(),
            image: z.string(),
            popular: z.boolean(),
            available: z.boolean(),
            categoryId: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { slug } = request.params

      const product = await prisma.product.findUnique({
        where: { slug },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          price: true,
          image: true,
          popular: true,
          available: true,
          categoryId: true,
        }
      })

      if (!product) {
        throw new BadRequestError('Produto não encontrado.')
      }

      return reply.status(200).send(product)
    },
  )
}
