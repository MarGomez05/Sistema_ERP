package com.tamachihua_erp.api.dto.report;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

// Reporte de ventas confirmadas por período (contrato §9, fase 8).
public record SalesReportDto(

        LocalDate from,
        LocalDate to,
        String groupBy,
        long salesCount,
        BigDecimal subtotal,
        BigDecimal discountTotal,
        BigDecimal taxTotal,
        BigDecimal total,
        List<SalesPeriodDto> series
) {
}
