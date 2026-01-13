import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { BadRequestError } from '../_errors/bad-request-error'


export async function createUser(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post('/user',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Create user',
        operationId: 'createUser',

        body: z.object({
          name: z.string().min(1, 'Nome é obrigatório'),
          email: z.email('Formato de E-mail inválido'),
          password: z.string().min(6,
            'Senha deve ser maior que 6 caracteres'),
        }),
        response: {
          201: z.object({
            token: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { name, email, password } = request.body
      const userWithSameEmail = await prisma.user.findUnique({
        where: { email },
      })

      if (userWithSameEmail) {
        throw new BadRequestError('Já existe um usuário com o mesmo e-mail.')
      }

      const passwordHash = await hash(password, 6)

      const user = await prisma.user.create({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
        data: {
          name,
          email,
          passwordHash,
          role: 'CUSTOMER',
        },
      })
      const token = await reply.jwtSign(
        {
          sub: user.id,
          role: user.role,
        },
        {
          sign: {
            expiresIn: '7d',
          },
        })

      return reply.status(201).send({ token })
    })
}
