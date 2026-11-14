package com.tamachihua_erp.api.dto.sale;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

// Línea de una venta (contrato §11).
public record SaleDetailRequestDto(

        @NotNull(message = "La presentación del producto es obligatoria")
        Long productPresentationId,

        @NotNull(message = "La cantidad es obligatoria")
        @DecimalMin(value = "0.01", message = "La cantidad debe ser mayor que cero")
        @Digits(integer = 10, fraction = 2, message = "La cantidad admite hasta 10 enteros y 2 decimales")
        BigDecimal quantity,

        @DecimalMin(value = "0.00", message = "El descuento no puede ser negativo")
        @Digits(integer = 10, fraction = 2, message = "El descuento admite hasta 10 enteros y 2 decimales")
        BigDecimal discount,

        // Opcional: si no viene, se usa el precio vigente de la presentación.
        @DecimalMin(value = "0.01", message = "El precio unitario debe ser mayor que cero")
        @Digits(integer = 8, fraction = 2, message = "El precio unitario admite hasta 8 enteros y 2 decimales")
        BigDecimal unitPrice
) {
}
