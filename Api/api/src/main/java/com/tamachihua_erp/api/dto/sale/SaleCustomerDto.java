package com.tamachihua_erp.api.dto.sale;

// Cliente asociado a una venta; nulo para consumidor final.
public record SaleCustomerDto(

        Long id,
        String legalName
) {
}
