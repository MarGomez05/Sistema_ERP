package com.tamachihua_erp.api.repository.projection;

import java.math.BigDecimal;

// Fila del reporte de productos más vendidos.
public interface TopProductProjection {

    Long getProductId();

    String getProductCode();

    String getProductName();

    BigDecimal getQuantity();

    BigDecimal getTotal();

    Long getSalesCount();
}
