import { z } from 'zod/v4'

export const roleSchema = z.union([
  z.literal('ADMIN'),
  z.literal('CUSTOMER'),
])

export type Role = z.infer<typeof roleSchema>
