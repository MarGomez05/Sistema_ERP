package com.tamachihua_erp.api.dto.sale;

import jakarta.validation.constraints.Size;

// Motivo opcional al cancelar una venta (contrato §11).
public record SaleCancelRequestDto(

        @Size(max = 255, message = "El motivo no puede superar los 255 caracteres")
        String reason
) {
}
