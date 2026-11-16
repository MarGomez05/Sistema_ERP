package com.tamachihua_erp.api.dto.sale;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

// Datos para crear o editar una venta en DRAFT (contrato §11).
public record SaleRequestDto(

        // Opcional: nulo para consumidor final.
        Long customerId,

        @NotBlank(message = "La condición de pago es obligatoria")
        @Pattern(
                regexp = "CASH|CREDIT",
                message = "La condición de pago debe ser CASH o CREDIT"
        )
        String paymentCondition,

        @Pattern(
                regexp = "^$|CASH|CARD|TRANSFER|OTHER",
                message = "El método de pago debe ser CASH, CARD, TRANSFER u OTHER"
        )
        String paymentMethod,

        @Size(max = 255, message = "Las notas no pueden superar los 255 caracteres")
        String notes,

        @NotEmpty(message = "La venta debe tener al menos una línea")
        List<@Valid SaleDetailRequestDto> details
) {
}
