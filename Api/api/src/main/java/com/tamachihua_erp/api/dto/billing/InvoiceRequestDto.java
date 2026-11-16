package com.tamachihua_erp.api.dto.billing;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

// Datos para emitir una factura desde una venta (contrato §12.1).
public record InvoiceRequestDto(

        // Obligatorio en POST /api/invoices; opcional en POST /api/sales/{id}/invoice.
        Long saleId,

        @NotBlank(message = "El tipo de factura es obligatorio")
        @Pattern(
                regexp = "CONSUMER|CCF",
                message = "El tipo de factura debe ser CONSUMER o CCF"
        )
        String invoiceType,

        @Size(max = 30, message = "El número de control no puede superar los 30 caracteres")
        String controlNumber,

        @Pattern(
                regexp = "^$|CASH|CREDIT",
                message = "La condición de pago debe ser CASH o CREDIT"
        )
        String paymentCondition,

        @Size(max = 255, message = "Las notas no pueden superar los 255 caracteres")
        String notes
) {
}
