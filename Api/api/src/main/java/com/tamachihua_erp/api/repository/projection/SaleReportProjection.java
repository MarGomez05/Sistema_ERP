package com.tamachihua_erp.api.repository.projection;

import java.math.BigDecimal;
import java.time.LocalDateTime;

// Fila de venta confirmada para el reporte por período.
public interface SaleReportProjection {

    LocalDateTime getSaleDate();

    BigDecimal getSubtotal();

    BigDecimal getDiscountTotal();

    BigDecimal getTaxTotal();

    BigDecimal getTotal();
}
