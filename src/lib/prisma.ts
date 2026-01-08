import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client/extension'
import { env } from './env'

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL })
export const prisma = new PrismaClient({ adapter })
