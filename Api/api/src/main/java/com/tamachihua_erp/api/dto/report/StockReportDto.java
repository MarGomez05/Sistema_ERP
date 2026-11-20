package com.tamachihua_erp.api.dto.report;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

// Reporte de existencias por presentación activa (contrato §9).
public record StockReportDto(

        LocalDate generatedAt,
        Long categoryId,
        String categoryName,
        int totalPresentations,
        int lowStockPresentations,
        List<StockReportRowDto> rows
) {
}
