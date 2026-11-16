package com.tamachihua_erp.api.dto.billing;

import java.math.BigDecimal;
import java.time.LocalDate;

// Fila del listado paginado de facturas (contrato §12).
public record InvoiceSummaryDto(

        Long id,
        String invoiceNumber,
        String invoiceType,
        String status,
        LocalDate issueDate,
        LocalDate dueDate,
        Long saleId,
        Long customerId,
        String customerName,
        String paymentCondition,
        BigDecimal subtotal,
        BigDecimal discountTotal,
        BigDecimal taxTotal,
        BigDecimal total,
        BigDecimal paidTotal,
        BigDecimal balance
) {
}
