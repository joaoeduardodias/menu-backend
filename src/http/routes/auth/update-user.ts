import { auth } from '@/http/middlewares/auth'
import { prisma } from '@/lib/prisma'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'
import { BadRequestError } from '../_errors/bad-request-error'

const updateUserSchema = z.object({
  name: z.string().optional(),
  phone: z.string().transform((s) => s.replace(/\D/g, ''))
    .refine((s) => s.length >= 10 && s.length <= 11, {
      message: 'Telefone inválido',
    }).optional(),
})
export async function updateUser(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().register(auth).put('/user',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Update user',
        operationId: 'updateUser',
        body: updateUserSchema,
        security: [
          { bearerAuth: [] },
        ],
        response: {
          204: z.null(),
        },
      },
    },
    async (request, reply) => {
      const userId = await request.getCurrentUserId()
      const { name, phone } = request.body

      const existingUser = await prisma.user.findUnique({
        where: { id: userId.sub },
      })

      if (!existingUser) {
        throw new BadRequestError('Usuário não encontrado.')
      }

      try {
        await prisma.user.update({
          where: {
            id: userId.sub,
          },
          data: {
            name,
            phone,
          },
        })
        return reply.status(204).send()
      } catch {
        throw new BadRequestError('Falha ao Atualizar usuário.')
      }
    },
  )
}
