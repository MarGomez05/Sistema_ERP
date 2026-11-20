package com.tamachihua_erp.api.dto.report;

import java.math.BigDecimal;

// Punto de la serie temporal del reporte de ventas.
public record SalesPeriodDto(

        String period,
        String label,
        long salesCount,
        BigDecimal total
) {
}
