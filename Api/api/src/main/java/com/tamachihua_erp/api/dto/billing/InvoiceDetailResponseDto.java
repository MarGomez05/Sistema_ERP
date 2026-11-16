package com.tamachihua_erp.api.dto.billing;

import java.math.BigDecimal;

// Línea de factura con snapshot inmutable (contrato §12.1).
public record InvoiceDetailResponseDto(

        Long id,
        Long productPresentationId,
        String productCode,
        String productName,
        String presentationCode,
        String presentationName,
        BigDecimal quantity,
        BigDecimal unitPrice,
        BigDecimal discount,
        BigDecimal taxRate,
        BigDecimal taxAmount,
        BigDecimal lineSubtotal,
        BigDecimal lineTotal
) {
}
