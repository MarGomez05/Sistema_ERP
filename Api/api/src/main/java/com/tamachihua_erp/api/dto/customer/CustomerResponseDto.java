package com.tamachihua_erp.api.dto.customer;

import java.math.BigDecimal;
import java.time.LocalDateTime;

// Respuesta de la API para un cliente (contrato §10).
public record CustomerResponseDto(

        Long id,
        String customerType,
        String documentType,
        String documentNumber,
        String legalName,
        String tradeName,
        String nit,
        String nrc,
        String dui,
        String address,
        String phone,
        String email,
        BigDecimal creditLimit,
        Integer creditDays,
        BigDecimal outstandingBalance,
        Boolean isActive,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
