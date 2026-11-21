package com.tamachihua_erp.api.dto.role;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// Edición de un rol: el código no cambia porque la API lo usa para los permisos.
public record RoleUpdateRequestDto(

        @NotBlank(message = "El nombre del rol es obligatorio")
        @Size(max = 50, message = "El nombre no puede superar los 50 caracteres")
        String name,

        @Size(max = 255, message = "La descripción no puede superar los 255 caracteres")
        String description
) {
}
