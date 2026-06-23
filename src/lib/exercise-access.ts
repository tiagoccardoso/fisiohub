import type { User } from '@/lib/auth-server'
import type { ExercisePermissions } from '@/lib/exercise'

const exerciseManagerRoles = new Set<User['role']>([
  'admin',
  'mentor',
])

export function getExercisePermissions(user: Pick<User, 'role'>): ExercisePermissions {
  const canManage = exerciseManagerRoles.has(user.role)
  return {
    canCreate: canManage,
    canEdit: canManage,
    canDelete: canManage,
  }
}

export function assertExerciseAccess(
  user: Pick<User, 'role'>,
  operation: keyof ExercisePermissions
) {
  if (!getExercisePermissions(user)[operation]) {
    throw new Error('Permissões insuficientes')
  }
}
