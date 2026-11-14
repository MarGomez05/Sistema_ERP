package com.tamachihua_erp.api.dto.sale;

import java.math.BigDecimal;

// Línea de venta en la respuesta (contrato §11).
public record SaleDetailResponseDto(

        Long id,
        Long productPresentationId,
        Long productId,
        String productCode,
        String productName,
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
