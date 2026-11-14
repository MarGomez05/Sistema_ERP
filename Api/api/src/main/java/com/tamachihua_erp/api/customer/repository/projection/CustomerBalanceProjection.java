package com.tamachihua_erp.api.customer.repository.projection;

import java.math.BigDecimal;

// Saldo pendiente por cliente: facturas emitidas (total - pagado).
public interface CustomerBalanceProjection {

    Long getCustomerId();

    BigDecimal getOutstandingBalance();
}
