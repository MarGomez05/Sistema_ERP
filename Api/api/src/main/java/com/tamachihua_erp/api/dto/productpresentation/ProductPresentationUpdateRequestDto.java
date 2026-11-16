package com.tamachihua_erp.api.dto.productpresentation;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

// Datos para editar una presentación del producto: código, stock mínimo e imagen (contrato 5.2)
public record ProductPresentationUpdateRequestDto(

        @NotBlank(message = "El código de la presentación del producto es obligatorio")
        @Size(max = 50, message = "El código no puede superar los 50 caracteres")
        String code,

        @NotNull(message = "El stock mínimo es obligatorio")
        @DecimalMin(value = "0.01", message = "El stock mínimo debe ser mayor que 0")
        @Digits(integer = 10, fraction = 2,
                message = "El stock mínimo admite hasta 10 enteros y 2 decimales")
        BigDecimal minStock,

        // Vacío o nulo elimina la imagen de la presentación.
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
