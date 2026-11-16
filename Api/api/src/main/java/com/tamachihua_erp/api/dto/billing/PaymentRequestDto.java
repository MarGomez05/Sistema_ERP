package com.tamachihua_erp.api.dto.billing;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

// Datos para registrar un pago (contrato §12.2).
public record PaymentRequestDto(

        @NotNull(message = "La fecha del pago es obligatoria")
        @PastOrPresent(message = "La fecha del pago no puede ser futura")
        LocalDate paymentDate,

        @NotNull(message = "El monto es obligatorio")
        @DecimalMin(value = "0.01", message = "El monto debe ser mayor que cero")
        @Digits(integer = 10, fraction = 2, message = "El monto admite hasta 10 enteros y 2 decimales")
        BigDecimal amount,

        @NotBlank(message = "El método de pago es obligatorio")
        @Pattern(
                regexp = "CASH|CARD|TRANSFER|CHECK|OTHER",
                message = "El método de pago debe ser CASH, CARD, TRANSFER, CHECK u OTHER"
        )
        String paymentMethod,

        @Size(max = 50, message = "La referencia no puede superar los 50 caracteres")
        String reference,

        @Size(max = 255, message = "Las notas no pueden superar los 255 caracteres")
        String notes
) {
}
