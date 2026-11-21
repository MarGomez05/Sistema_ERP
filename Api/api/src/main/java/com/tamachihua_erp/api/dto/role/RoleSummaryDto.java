package com.tamachihua_erp.api.dto.role;

// Versión corta del rol para la respuesta de un usuario: role {id, code, name}
public record RoleSummaryDto(

        Long id,
        String code,
        String name
) {
}
