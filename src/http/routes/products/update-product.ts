import { prisma } from "@/lib/prisma"
import type { FastifyInstance } from "fastify"
import type { ZodTypeProvider } from "fastify-type-provider-zod"
import z from "zod"
import { BadRequestError } from "../_errors/bad-request-error"

export async function updateProduct(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().put(
    '/products/:id',
    {
      schema: {
        tags: ['Products'],
        summary: 'Update product',
        operationId: 'updateProduct',
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.cuid(),
        }),
        body: z.object({
          name: z.string().min(1).optional(),
          slug: z.string().min(1).optional(),
          description: z.string().optional(),
          price: z.number().int().positive().optional(),
          image: z.url().optional(),
          categoryId: z.cuid().optional(),
          popular: z.boolean().optional(),
          available: z.boolean().optional(),
        }),
        response: {
          204: z.null(),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params
      const { available, categoryId, description, image, name, popular, price, slug } = request.body


      const existing = await prisma.product.findUnique({ where: { id } })
      if (!existing) throw new BadRequestError('Produto não encontrado.')

      if (slug && slug !== existing.slug) {
        const slugCheck = await prisma.product.findUnique({ where: { slug: slug } })
        if (slugCheck) throw new BadRequestError('Slug já está em uso.')
      }

      if (categoryId) {
        const cat = await prisma.category.findUnique({ where: { id: categoryId } })
        if (!cat) throw new BadRequestError('Categoria inválida.')
      }

      await prisma.$transaction(async (tx) => {
        await tx.product.update({
          where: { id },
          data: {
            available,
            categoryId,
            description,
            image,
            name,
            popular,
            price,
            slug,
            updatedAt: new Date()

          },
        })
      })

      return reply.status(204).send()
    },
  )
}
