package com.tamachihua_erp.api.dto.report;

import java.math.BigDecimal;
import java.time.LocalDate;

// Factura con saldo pendiente dentro del reporte de cuentas por cobrar.
public record ReceivableInvoiceDto(

        Long invoiceId,
        String invoiceNumber,
        String customerName,
        LocalDate issueDate,
        LocalDate dueDate,
        BigDecimal total,
        BigDecimal paidTotal,
        BigDecimal balance,
        long daysOverdue,
        String bucket
) {
}
