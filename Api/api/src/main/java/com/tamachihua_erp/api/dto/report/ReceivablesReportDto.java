package com.tamachihua_erp.api.dto.report;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

// Cuentas por cobrar al corte indicado (contrato §9, fase 8).
public record ReceivablesReportDto(

        LocalDate asOf,
        BigDecimal totalOutstanding,
        BigDecimal overdueOutstanding,
        BigDecimal currentOutstanding,
        long invoiceCount,
        long customerCount,
        List<ReceivableBucketDto> buckets,
        List<ReceivableInvoiceDto> invoices
) {
}
