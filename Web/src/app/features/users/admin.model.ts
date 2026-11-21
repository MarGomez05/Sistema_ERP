// Contrato de usuarios y roles del panel (solo ADMIN).

export type AdminTab = 'users' | 'roles';

export type RoleTone = 'neutral' | 'brand' | 'info' | 'warning' | 'success' | 'danger';

export interface RoleSummary {
  id: number;
  code: string;
  name: string;
}

export interface RoleOption {
  id: number;
  code: string;
  name: string;
}

export interface Role {
  id: number;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  activeUsers: number;
}

export interface UserRecord {
  id: number;
  username: string;
  fullName: string;
  email: string | null;
  role: RoleSummary;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserQuery {
  search: string;
  roleId: number | null;
  isActive: boolean | null;
  page: number;
  size: number;
}

export interface UserFormValue {
  username: string;
  password: string;
  fullName: string;
  email: string;
  roleId: number | null;
}

export interface UserCreatePayload {
  username: string;
  password: string;
  fullName: string;
  email: string | null;
  roleId: number;
}

export interface UserUpdatePayload {
  fullName: string;
  email: string | null;
  roleId: number;
}

export interface RoleFormValue {
  code: string;
  name: string;
  description: string;
}

export interface RoleCreatePayload {
  code: string;
  name: string;
  description: string | null;
}

export interface RoleUpdatePayload {
  name: string;
  description: string | null;
}

export const SYSTEM_ROLE_CODES = ['ADMIN', 'WAREHOUSE', 'PURCHASING', 'SELLER'] as const;

// Los roles base conservan su código porque la API lo usa para los permisos.
export function isSystemRole(role: Role): boolean {
  return (SYSTEM_ROLE_CODES as readonly string[]).includes(role.code);
}

export function canDeactivateRole(role: Role): boolean {
  return role.code !== 'ADMIN' && role.activeUsers === 0;
}

export function roleTone(code: string): RoleTone {
  switch (code) {
    case 'ADMIN':
      return 'brand';
    case 'WAREHOUSE':
      return 'info';
    case 'PURCHASING':
      return 'warning';
    case 'SELLER':
      return 'success';
    default:
      return 'neutral';
  }
}

function trimmedOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function toCreateUserPayload(value: UserFormValue): UserCreatePayload {
  if (value.roleId === null) {
    throw new Error('El rol es obligatorio');
  }

  return {
    username: value.username.trim(),
    password: value.password,
    fullName: value.fullName.trim(),
    email: trimmedOrNull(value.email),
    roleId: value.roleId,
  };
}

export function toUpdateUserPayload(value: UserFormValue): UserUpdatePayload {
  if (value.roleId === null) {
    throw new Error('El rol es obligatorio');
  }

  return {
    fullName: value.fullName.trim(),
    email: trimmedOrNull(value.email),
    roleId: value.roleId,
  };
}

export function toCreateRolePayload(value: RoleFormValue): RoleCreatePayload {
  return {
    code: value.code.trim().toUpperCase(),
    name: value.name.trim(),
    description: trimmedOrNull(value.description),
  };
}

export function toUpdateRolePayload(value: RoleFormValue): RoleUpdatePayload {
  return {
    name: value.name.trim(),
    description: trimmedOrNull(value.description),
  };
}

export function userStatusLabel(isActive: boolean): string {
  return isActive ? 'Activo' : 'Inactivo';
}
