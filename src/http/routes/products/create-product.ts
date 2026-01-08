/* eslint-disable @stylistic/max-len */

import { auth } from '@/http/middlewares/auth'
import { prisma } from '@/lib/prisma'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod/v4'
import { BadRequestError } from '../_errors/bad-request-error'

const createProductSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().min(1),
  price: z.number().int().positive(),
  image: z.url(),
  categoryId: z.cuid(),
  popular: z.boolean().default(false),
  available: z.boolean().default(true),
})

export async function createProduct(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().register(auth).post(
    '/products',
    {
      schema: {
        tags: ['Products'],
        summary: 'Create product',
        body: createProductSchema,
        security: [{ bearerAuth: [] }],
        response: {
          201: z.object({
            productId: z.cuid(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { available, categoryId, description, image, name, popular, price, slug } = request.body

      const existing = await prisma.product.findUnique({ where: { slug: slug } })
      if (existing) {
        throw new BadRequestError('Já existe um produto com este slug.')
      }

      const category = await prisma.category.findUnique({ where: { id: categoryId } })
      if (!category) {
        throw new BadRequestError('Categoria inválida.')
      }

      try {
        const product = await prisma.product.create({
          data: {
            name: name,
            slug: slug,
            description: description,
            price: price,
            image: image,
            categoryId: categoryId,
            popular: popular,
            available: available,
          },
        })


        return reply.status(201).send({ productId: product.id })
      } catch (err) {
        console.error('Erro ao criar produto:', err)
        if (err instanceof BadRequestError) {
          throw err
        }
        throw new BadRequestError('Falha ao criar produto.')
      }
    },
  )
}
