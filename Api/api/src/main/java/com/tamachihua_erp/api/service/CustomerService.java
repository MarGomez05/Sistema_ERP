package com.tamachihua_erp.api.service;

import com.tamachihua_erp.api.dto.customer.CustomerCreditRequestDto;
import com.tamachihua_erp.api.dto.customer.CustomerOptionDto;
import com.tamachihua_erp.api.dto.customer.CustomerRequestDto;
import com.tamachihua_erp.api.dto.customer.CustomerResponseDto;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

// Operaciones del módulo de clientes (contrato §10).
public interface CustomerService {

    Page<CustomerResponseDto> findAll(
            String search,
            Boolean isActive,
            String documentType,
            Pageable pageable
    );

    List<CustomerOptionDto> findActiveOptions();

    CustomerResponseDto findById(Long id);

    CustomerResponseDto create(CustomerRequestDto dto);

    CustomerResponseDto update(Long id, CustomerRequestDto dto);

    void changeStatus(Long id, Boolean isActive);

    CustomerResponseDto changeCredit(Long id, CustomerCreditRequestDto dto);
}
