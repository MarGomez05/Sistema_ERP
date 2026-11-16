package com.tamachihua_erp.api.dto.billing;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

// Pago registrado sobre una factura (contrato §12.2).
public record PaymentResponseDto(

        Long id,
        Long invoiceId,
        LocalDate paymentDate,
        BigDecimal amount,
        String paymentMethod,
        String reference,
        String notes,
        Long userId,
        String userName,
        LocalDateTime createdAt
) {
}
