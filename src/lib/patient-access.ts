import type { User } from '@/lib/auth-server'
import type { PatientPermissions } from '@/lib/patient'

const managementRoles = new Set<User['role']>([
  'admin',
  'mentor',
  'intern',
  'professional',
  'therapist',
  'receptionist',
])

export function getPatientPermissions(user: Pick<User, 'role'>): PatientPermissions {
  const canManage = managementRoles.has(user.role)
  return {
    canCreate: canManage,
    canEdit: canManage,
    canChangeStatus: canManage,
    canDelete: user.role === 'admin',
  }
}

export function assertPatientAccess(user: Pick<User, 'role'>, operation: keyof PatientPermissions) {
  if (!getPatientPermissions(user)[operation]) throw new Error('Permissões insuficientes')
}
