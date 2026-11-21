package com.tamachihua_erp.api.dto.report;

import java.math.BigDecimal;

// Tramo de antigüedad de la deuda.
public record ReceivableBucketDto(

        String key,
        String label,
        long invoiceCount,
        BigDecimal amount
) {
}
