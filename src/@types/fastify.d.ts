import type { Role } from '@/generated/prisma/enums'
import 'fastify'

declare module 'fastify' {
  export interface FastifyRequest {
    getCurrentUserId(): Promise<{ role: Role, sub: string }>
  }
}
