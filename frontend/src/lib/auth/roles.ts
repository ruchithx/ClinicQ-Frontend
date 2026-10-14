export type Role = 'ADMIN' | 'DOCTOR' | 'PHARMACIST';

export const ROLE_HOME: Record<Role, string> = {
  DOCTOR: '/doctor/dashboard',
  PHARMACIST: '/pharmacist/dashboard',
  ADMIN: '/admin/users',
};

export function getRoleHome(roles: string[]): string {
  if (roles.includes('DOCTOR')) return ROLE_HOME['DOCTOR'];
  if (roles.includes('PHARMACIST')) return ROLE_HOME['PHARMACIST'];
  if (roles.includes('ADMIN')) return ROLE_HOME['ADMIN'];
  return '/login';
}
