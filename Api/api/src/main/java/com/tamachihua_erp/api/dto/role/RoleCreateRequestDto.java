package com.tamachihua_erp.api.dto.role;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

// Datos para crear un rol desde el panel (solo ADMIN).
// El código se normaliza a mayúsculas en el servicio.
public record RoleCreateRequestDto(

        @NotBlank(message = "El código del rol es obligatorio")
        @Size(max = 20, message = "El código no puede superar los 20 caracteres")
        @Pattern(
                regexp = "^[A-Za-z][A-Za-z_]*$",
                message = "El código solo admite letras y guiones bajos"
        )
        String code,

        @NotBlank(message = "El nombre del rol es obligatorio")
        @Size(max = 50, message = "El nombre no puede superar los 50 caracteres")
        String name,

        @Size(max = 255, message = "La descripción no puede superar los 255 caracteres")
        String description
) {
}
