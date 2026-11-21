package com.tamachihua_erp.api.dto.role;

// Rol del panel con su estado y cantidad de usuarios activos.
public record RoleResponseDto(
        Long id,
        String code,
        String name,
        String description,
        Boolean isActive,
        long activeUsers
) {
}
