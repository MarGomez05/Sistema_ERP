package com.tamachihua_erp.api.customer.mapper;

import com.tamachihua_erp.api.customer.dto.CustomerOptionDto;
import com.tamachihua_erp.api.customer.dto.CustomerRequestDto;
import com.tamachihua_erp.api.customer.dto.CustomerResponseDto;
import com.tamachihua_erp.api.customer.entity.Customer;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
public class CustomerMapper {

    public CustomerResponseDto toResponseDto(
            Customer customer,
            BigDecimal outstandingBalance
    ) {

        return new CustomerResponseDto(
                customer.getId(),
                customer.getCustomerType(),
                customer.getDocumentType(),
                customer.getDocumentNumber(),
                customer.getLegalName(),
                customer.getTradeName(),
                customer.getNit(),
                customer.getNrc(),
                customer.getDui(),
                customer.getAddress(),
                customer.getPhone(),
                customer.getEmail(),
                customer.getCreditLimit(),
                customer.getCreditDays(),
                outstandingBalance,
                customer.getIsActive(),
                customer.getCreatedAt(),
                customer.getUpdatedAt()
        );
    }

    public CustomerOptionDto toOptionDto(Customer customer) {

        return new CustomerOptionDto(
                customer.getId(),
                customer.getLegalName()
        );
    }

    public void applyChanges(Customer customer, CustomerRequestDto dto) {

        customer.setCustomerType(dto.customerType().trim());
        customer.setDocumentType(normalize(dto.documentType()));
        customer.setDocumentNumber(normalize(dto.documentNumber()));
        customer.setLegalName(dto.legalName().trim());
        customer.setTradeName(normalize(dto.tradeName()));
        customer.setNit(normalize(dto.nit()));
        customer.setNrc(normalize(dto.nrc()));
        customer.setDui(normalize(dto.dui()));
        customer.setAddress(normalize(dto.address()));
        customer.setPhone(normalize(dto.phone()));
        customer.setEmail(normalize(dto.email()));
        customer.setCreditLimit(
                dto.creditLimit() != null ? dto.creditLimit() : BigDecimal.ZERO
        );
        customer.setCreditDays(dto.creditDays() != null ? dto.creditDays() : 0);
    }

    public String normalize(String value) {

        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }
}
