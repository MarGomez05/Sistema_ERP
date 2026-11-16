package com.tamachihua_erp.api.dto.sale;

// Vendedor que registró la venta (tomado del JWT).
public record SaleSellerDto(

        Long id,
        String fullName
) {
}
