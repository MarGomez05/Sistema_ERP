export type RoleCode = 'ADMIN' | 'WAREHOUSE' | 'PURCHASING' | 'SELLER';

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

export const ROLE_LABELS: Record<RoleCode, string> = {
  ADMIN: 'Administrador',
  WAREHOUSE: 'Bodega',
  PURCHASING: 'Compras',
  SELLER: 'Ventas',
};
