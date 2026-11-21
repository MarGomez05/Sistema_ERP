package com.tamachihua_erp.api.dto.report;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

// Productos más vendidos en el rango indicado (contrato §9, fase 8).
public record TopProductsReportDto(

        LocalDate from,
        LocalDate to,
        List<TopProductDto> products
) {
}
