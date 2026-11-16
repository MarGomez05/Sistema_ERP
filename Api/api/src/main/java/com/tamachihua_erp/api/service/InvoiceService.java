package com.tamachihua_erp.api.service;

import com.tamachihua_erp.api.dto.billing.CreditNoteRequestDto;
import com.tamachihua_erp.api.dto.billing.InvoiceRequestDto;
import com.tamachihua_erp.api.dto.billing.InvoiceResponseDto;
import com.tamachihua_erp.api.dto.billing.InvoiceSummaryDto;
import com.tamachihua_erp.api.dto.billing.PaymentRequestDto;
import com.tamachihua_erp.api.dto.billing.PaymentResponseDto;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;

// Facturación, pagos y notas de crédito (contrato §12).
public interface InvoiceService {

    Page<InvoiceSummaryDto> findAll(
            LocalDate from,
            LocalDate to,
            Long customerId,
            String invoiceType,
            String status,
            Pageable pageable
    );

    InvoiceResponseDto findById(Long id);

    InvoiceResponseDto create(InvoiceRequestDto dto, Long userId);

    InvoiceResponseDto createFromSale(Long saleId, InvoiceRequestDto dto, Long userId);

    PaymentResponseDto addPayment(Long invoiceId, PaymentRequestDto dto, Long userId);

    List<PaymentResponseDto> findPayments(Long invoiceId);

    InvoiceResponseDto issueCreditNote(
            Long invoiceId,
            CreditNoteRequestDto dto,
            Long userId
    );
}
