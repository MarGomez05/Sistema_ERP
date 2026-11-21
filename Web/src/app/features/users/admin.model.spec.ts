import { describe, expect, it } from 'vitest';

import {
  Role,
  canDeactivateRole,
  isSystemRole,
  roleTone,
  toCreateRolePayload,
  toCreateUserPayload,
  toUpdateRolePayload,
  toUpdateUserPayload,
  userStatusLabel,
} from './admin.model';

function role(overrides: Partial<Role> = {}): Role {
  return {
    id: 2,
    code: 'WAREHOUSE',
    name: 'Bodega',
    description: 'Control de inventario',
    isActive: true,
    activeUsers: 1,
    ...overrides,
  };
}

describe('toCreateUserPayload', () => {
  it('recorta los textos y convierte el correo vacío en null', () => {
    expect(
      toCreateUserPayload({
        username: '  jlopez ',
        password: ' secreta123 ',
        fullName: '  José López  ',
        email: '   ',
        roleId: 3,
      }),
    ).toEqual({
      username: 'jlopez',
      password: ' secreta123 ',
      fullName: 'José López',
      email: null,
      roleId: 3,
    });
  });

  it('exige un rol seleccionado', () => {
    expect(() =>
      toCreateUserPayload({
        username: 'jlopez',
        password: 'secreta123',
        fullName: 'José López',
        email: '',
        roleId: null,
      }),
    ).toThrow('El rol es obligatorio');
  });
});

describe('toUpdateUserPayload', () => {
  it('envía solo los campos editables', () => {
    expect(
      toUpdateUserPayload({
        username: 'jlopez',
        password: '',
        fullName: '  José López ',
        email: ' jose@empresa.com ',
        roleId: 3,
      }),
    ).toEqual({
      fullName: 'José López',
      email: 'jose@empresa.com',
      roleId: 3,
    });
  });
});

describe('toCreateRolePayload', () => {
  it('normaliza el código a mayúsculas y recorta los textos', () => {
    expect(
      toCreateRolePayload({
        code: ' supervisor ',
        name: '  Supervisor de bodega ',
        description: '  Revisa el inventario  ',
      }),
    ).toEqual({
      code: 'SUPERVISOR',
      name: 'Supervisor de bodega',
      description: 'Revisa el inventario',
    });
  });
});

describe('toUpdateRolePayload', () => {
  it('no envía el código porque no se puede modificar', () => {
    expect(
      toUpdateRolePayload({
        code: 'WAREHOUSE',
        name: 'Bodega central',
        description: '   ',
      }),
    ).toEqual({
      name: 'Bodega central',
      description: null,
    });
  });
});

describe('reglas de roles', () => {
  it('reconoce los roles base del sistema', () => {
    expect(isSystemRole(role({ code: 'ADMIN' }))).toBe(true);
    expect(isSystemRole(role({ code: 'AUDITOR' }))).toBe(false);
  });

  it('no permite desactivar ADMIN ni un rol con usuarios activos', () => {
    expect(canDeactivateRole(role({ code: 'ADMIN', activeUsers: 0 }))).toBe(false);
    expect(canDeactivateRole(role({ code: 'WAREHOUSE', activeUsers: 2 }))).toBe(false);
    expect(canDeactivateRole(role({ code: 'AUDITOR', activeUsers: 0 }))).toBe(true);
  });

  it('asigna un color estable a cada rol', () => {
    expect(roleTone('ADMIN')).toBe('brand');
    expect(roleTone('WAREHOUSE')).toBe('info');
    expect(roleTone('PURCHASING')).toBe('warning');
    expect(roleTone('SELLER')).toBe('success');
    expect(roleTone('AUDITOR')).toBe('neutral');
  });

  it('etiqueta el estado del usuario', () => {
    expect(userStatusLabel(true)).toBe('Activo');
    expect(userStatusLabel(false)).toBe('Inactivo');
  });
});
