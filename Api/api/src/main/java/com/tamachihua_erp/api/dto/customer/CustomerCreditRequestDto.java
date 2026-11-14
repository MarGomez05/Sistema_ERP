package com.tamachihua_erp.api.dto.customer;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

// Actualización de las condiciones de crédito de un cliente (contrato §10).
public record CustomerCreditRequestDto(

        @NotNull(message = "El límite de crédito es obligatorio")
        @DecimalMin(value = "0.00", message = "El límite de crédito no puede ser negativo")
        @Digits(integer = 10, fraction = 2, message = "El límite de crédito admite hasta 10 enteros y 2 decimales")
        BigDecimal creditLimit,

        @NotNull(message = "Los días de crédito son obligatorios")
        @Min(value = 0, message = "Los días de crédito no pueden ser negativos")
        Integer creditDays
) {
}
