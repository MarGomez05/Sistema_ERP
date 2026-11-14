package com.tamachihua_erp.api.service;

import com.tamachihua_erp.api.dto.sale.SaleRequestDto;
import com.tamachihua_erp.api.dto.sale.SaleResponseDto;
import com.tamachihua_erp.api.dto.sale.SaleSummaryDto;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;

// Operaciones del módulo de ventas (contrato §11).
public interface SaleService {

    Page<SaleSummaryDto> findAll(
            LocalDate from,
            LocalDate to,
            Long customerId,
            String status,
            Long userId,
            Pageable pageable
    );

    SaleResponseDto findById(Long id, Long requesterId, boolean canViewAll);

    SaleResponseDto create(SaleRequestDto dto, Long userId);

    SaleResponseDto update(
            Long id,
            SaleRequestDto dto,
            Long requesterId,
            boolean canManageAll
    );

    SaleResponseDto confirm(Long id, Long requesterId, boolean canManageAll);

    SaleResponseDto cancel(Long id, String reason, Long userId);
}
