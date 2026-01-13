import { prisma } from "@/lib/prisma"
import type { FastifyInstance } from "fastify"
import type { ZodTypeProvider } from "fastify-type-provider-zod"
import z from "zod"
import { BadRequestError } from "../_errors/bad-request-error"

export async function deleteProduct(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().delete(
    '/products/:id',
    {
      schema: {
        tags: ['Products'],
        summary: 'Delete product',
        operationId: 'deleteProduct',
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.cuid(),
        }),
        response: {
          204: z.null(),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params

      const prod = await prisma.product.findUnique({ where: { id } })
      if (!prod) throw new BadRequestError('Produto não encontrado.')

      await prisma.product.delete({ where: { id } })

      return reply.status(204).send()
    },
  )
}
