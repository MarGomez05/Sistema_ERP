// Los roles base del sistema; ADMIN puede crear roles adicionales desde el panel.
export type KnownRoleCode = 'ADMIN' | 'WAREHOUSE' | 'PURCHASING' | 'SELLER';

// El rol de la sesión puede ser cualquier código registrado en la base de datos.
export type RoleCode = string;

export interface AuthUser {
  id: number;
  username: string;
  fullName: string;
  role: RoleCode;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: AuthUser;
}

// Sesión persistida en el navegador.
export interface StoredSession {
  token: string;
  user: AuthUser;
  expiresAt: number;
}

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  WAREHOUSE: 'Bodega',
  PURCHASING: 'Compras',
  SELLER: 'Ventas',
};

// Los roles personalizados se muestran con su propio código.
export function roleLabel(code: string | null | undefined): string {
  if (!code) {
    return '';
  }

  return ROLE_LABELS[code] ?? code;
}
