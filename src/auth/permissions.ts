import type { AbilityBuilder } from '@casl/ability'

import type { AppAbility } from './ability'
import type { User } from './models/user'
import type { Role } from './roles'

type PermissionsByRole = (
  user: User,
  builder: AbilityBuilder<AppAbility>,
) => void

export const permissions: Record<Role, PermissionsByRole> = {
  ADMIN: (_, { can }) => {
    can('manage', 'all')
  },

  CUSTOMER: (user, { can }) => {
    can('get', 'Product')
    can(['create', 'get'], 'Order', { userId: { $eq: user.id } })
    can(['create', 'update', 'get'], 'Cart', { userId: { $eq: user.id } })
  }
}
