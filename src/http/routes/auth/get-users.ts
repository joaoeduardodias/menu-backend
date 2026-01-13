import type { Prisma } from '@/generated/prisma/client'
import { Role } from '@/generated/prisma/enums'
import { auth } from '@/http/middlewares/auth'
import { prisma } from '@/lib/prisma'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'

const getUsersQuerySchema = z.object({
  role: z.enum(Role).optional(),
  page: z
    .string()
    .transform(val => parseInt(val))
    .pipe(z.number().int().min(1))
    .default(1),

  limit: z
    .string()
    .transform(val => parseInt(val))
    .pipe(z.number().int().min(1))
    .default(20),
  search: z.string().optional(),
})

export async function getUsers(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().register(auth).get('/users', {
    schema: {
      tags: ['Auth'],
      summary: 'Get users.',
      operationId: 'getUsers',

      querystring: getUsersQuerySchema,
      security: [
        { bearerAuth: [] },
      ],
      response: {
        200: z.object({
          users: z.array(
            z.object({
              id: z.cuid(),
              name: z.string().nullable(),
              email: z.email(),
              phone: z.string().nullable(),
              city: z.string().nullable(),
              joinDate: z.date()
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
        }),
      },
    },
  }, async (request, reply) => {
    const { role, page, limit, search } = request.query
    const skip = (page - 1) * limit
    const normalizedSearch = search?.trim()
    const where: Prisma.UserWhereInput = {}

    if (role) {
      where.role = role
    }
    if (normalizedSearch) {
      where.OR = [
        ...(where.OR ?? []),
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        {
          addresses: {
            some: {
              city: {
                contains: search,
                mode: 'insensitive',
              },
              street: {
                contains: search,
                mode: 'insensitive',
              }
            },
          },
        },

      ]
    }

    const [users, total] = await Promise.all([
      await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          createdAt: true,
          addresses: {
            select: {
              id: true,
              street: true,
              city: true,
            },
            where: {
              isDefault: true,
            },
            take: 1,
          },
        },
        where,
        skip,
        take: limit,
        orderBy: {
          name: 'asc',
        },
      }),
      prisma.user.count({
        where: {
          role: where.role,
        },
      }),
    ])
    const totalPages = Math.ceil(total / limit)
    const formattedUsers = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      city: user.addresses.map(address => address.city)[0] || null,
      joinDate: user.createdAt,
    }))


    return reply.send({
      users: formattedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    })
  })
}
