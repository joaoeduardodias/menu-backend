import { Role } from '@/generated/prisma/enums'
import { auth } from '@/http/middlewares/auth'
import { prisma } from '@/lib/prisma'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'
import { BadRequestError } from '../_errors/bad-request-error'

export async function getProfile(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().register(auth).get('/profile', {
    schema: {
      tags: ['Auth'],
      summary: 'Get authenticated user profile.',
      operationId: 'getProfile',

      security: [
        { bearerAuth: [] },
      ],
      response: {
        200: z.object({
          user: z.object({
            id: z.cuid(),
            name: z.string().nullable(),
            email: z.email(),
            phone: z.string().nullable(),
            role: z.enum(Role),
          }),
        }),
      },
    },
  }, async (request, reply) => {
    const userId = await request.getCurrentUserId()
    const user = await prisma.user.findUnique({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
      },
      where: {
        id: userId.sub,
      },
    })
    if (!user) {
      throw new BadRequestError('Usuário não encontrado.')
    }
    return reply.send({ user })
  })
}
