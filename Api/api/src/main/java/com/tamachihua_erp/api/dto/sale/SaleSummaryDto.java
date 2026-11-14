package com.tamachihua_erp.api.dto.sale;

import java.math.BigDecimal;
import java.time.LocalDateTime;

// Fila del listado paginado de ventas.
public record SaleSummaryDto(

        Long id,
        String saleNumber,
        String status,
        LocalDateTime saleDate,
        Long customerId,
        String customerName,
        Long sellerId,
        String sellerName,
        String paymentCondition,
        String paymentMethod,
        BigDecimal subtotal,
        BigDecimal discountTotal,
        BigDecimal taxTotal,
        BigDecimal total,
        BigDecimal paidTotal
) {
}
