package com.tamachihua_erp.api.dto.billing;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

// Detalle completo de una factura o nota de crédito (contrato §12.1).
public record InvoiceResponseDto(

        Long id,
        String invoiceNumber,
        String controlNumber,
        String invoiceType,
        String status,
        LocalDate issueDate,
        LocalDate dueDate,
        Long saleId,
        Long customerId,
        Long relatedInvoiceId,
        String relatedInvoiceNumber,
        String paymentCondition,
        BigDecimal subtotal,
        BigDecimal discountTotal,
        BigDecimal taxTotal,
        BigDecimal total,
        BigDecimal paidTotal,
        BigDecimal balance,
        String customerName,
        String customerDocumentType,
        String customerDocumentNumber,
        String customerNit,
        String customerNrc,
        String customerAddress,
        String customerEmail,
        String notes,
        List<InvoiceDetailResponseDto> details,
        LocalDateTime cancelledAt,
        String cancelReason
) {
}
