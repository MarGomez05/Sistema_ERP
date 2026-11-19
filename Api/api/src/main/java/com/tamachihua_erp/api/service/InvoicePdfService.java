package com.tamachihua_erp.api.service;

import com.tamachihua_erp.api.dto.billing.InvoiceResponseDto;

// Renderiza una factura o nota de crédito como documento PDF.
public interface InvoicePdfService {

    byte[] render(InvoiceResponseDto invoice);
}
