package com.tamachihua_erp.api.dto.billing;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// Datos para emitir una nota de crédito (contrato §12.3).
public record CreditNoteRequestDto(

        @NotBlank(message = "El motivo de la nota de crédito es obligatorio")
        @Size(max = 255, message = "El motivo no puede superar los 255 caracteres")
        String reason,

        // Si es TRUE, las cantidades vuelven a los lotes de la venta.
        Boolean returnStock
) {
}
