package com.tamachihua_erp.api.customer.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

// Datos para crear o editar un cliente (contrato §10).
public record CustomerRequestDto(

        @NotBlank(message = "El tipo de cliente es obligatorio")
        @Pattern(
                regexp = "NATURAL|BUSINESS",
                message = "El tipo de cliente debe ser NATURAL o BUSINESS"
        )
        String customerType,

        @Pattern(
                regexp = "^$|DUI|NIT|PASSPORT|FOREIGN",
                message = "El tipo de documento debe ser DUI, NIT, PASSPORT o FOREIGN"
        )
        String documentType,

        @Size(max = 20, message = "El número de documento no puede superar los 20 caracteres")
        String documentNumber,

        @NotBlank(message = "El nombre o razón social es obligatorio")
        @Size(max = 200, message = "El nombre o razón social no puede superar los 200 caracteres")
        String legalName,

        @Size(max = 200, message = "El nombre comercial no puede superar los 200 caracteres")
        String tradeName,

        @Size(max = 17, message = "El NIT no puede superar los 17 caracteres")
        String nit,

        @Size(max = 10, message = "El NRC no puede superar los 10 caracteres")
        String nrc,

        @Size(max = 10, message = "El DUI no puede superar los 10 caracteres")
        String dui,

        @Size(max = 255, message = "La dirección no puede superar los 255 caracteres")
        String address,

        @Size(max = 20, message = "El teléfono no puede superar los 20 caracteres")
        @Pattern(
                regexp = "^$|^[0-9 +-]+$",
                message = "El teléfono solo admite dígitos, espacios, + y -"
        )
        String phone,

        @Email(message = "El correo no tiene un formato válido")
        @Size(max = 150, message = "El correo no puede superar los 150 caracteres")
        String email,

        @DecimalMin(value = "0.00", message = "El límite de crédito no puede ser negativo")
        @Digits(integer = 10, fraction = 2, message = "El límite de crédito admite hasta 10 enteros y 2 decimales")
        BigDecimal creditLimit,

        @Min(value = 0, message = "Los días de crédito no pueden ser negativos")
        Integer creditDays
) {
}
