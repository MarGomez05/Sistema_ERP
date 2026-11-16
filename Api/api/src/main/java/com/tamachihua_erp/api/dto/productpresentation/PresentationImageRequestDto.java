package com.tamachihua_erp.api.dto.productpresentation;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

// Datos para asignar o quitar la imagen de una presentación (contrato 5.2, D-06).
// Solo se guarda la referencia: no se suben binarios a PostgreSQL.
public record PresentationImageRequestDto(

        // Nulo o vacío elimina la imagen.
        @Size(max = 500, message = "La URL de la imagen no puede superar los 500 caracteres")
        @Pattern(
                regexp = "^\\s*$|^(https?://\\S+|/\\S+)$",
                message = "La URL de la imagen debe usar http(s) o una ruta relativa que empiece con /"
        )
        String imageUrl,

        @Size(max = 150, message = "El texto alternativo no puede superar los 150 caracteres")
        String imageAlt
) {
}
