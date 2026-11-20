package com.tamachihua_erp.api.dto.report;

import java.math.BigDecimal;

// Fila del reporte de existencias: física, vendible, mínimo y precio vigente.
public record StockReportRowDto(

        Long productPresentationId,
        String productCode,
        String productName,
        String presentationName,
        BigDecimal physicalStock,
        BigDecimal sellableStock,
        BigDecimal minStock,
        BigDecimal currentPrice,
        boolean lowStock
) {
}
