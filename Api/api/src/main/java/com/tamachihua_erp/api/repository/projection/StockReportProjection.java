package com.tamachihua_erp.api.repository.projection;

import java.math.BigDecimal;

// Fila del reporte de existencias por presentación activa.
public interface StockReportProjection {

    Long getProductPresentationId();

    String getProductCode();

    String getProductName();

    String getPresentationName();

    BigDecimal getPhysicalStock();

    BigDecimal getSellableStock();

    BigDecimal getMinStock();

    BigDecimal getCurrentPrice();
}
