package com.tamachihua_erp.api.dto.report;

import java.math.BigDecimal;

// Fila de producto más vendido.
public record TopProductDto(

        Long productId,
        String productCode,
        String productName,
        BigDecimal quantity,
        BigDecimal total,
        long salesCount
) {
}
