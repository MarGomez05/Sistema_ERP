package com.tamachihua_erp.api.dto.sale;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

// Detalle completo de una venta (contrato §11).
public record SaleResponseDto(

        Long id,
        String saleNumber,
        String status,
        LocalDateTime saleDate,
        SaleCustomerDto customer,
        SaleSellerDto seller,
        String paymentCondition,
        String paymentMethod,
        BigDecimal subtotal,
        BigDecimal discountTotal,
        BigDecimal taxTotal,
        BigDecimal total,
        BigDecimal paidTotal,
        Long invoiceId,
        String invoiceNumber,
        String notes,
        List<SaleDetailResponseDto> details,
        LocalDateTime cancelledAt,
        String cancelReason
) {
}
