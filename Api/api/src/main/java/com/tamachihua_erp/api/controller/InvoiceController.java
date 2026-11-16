package com.tamachihua_erp.api.controller;

import com.tamachihua_erp.api.dto.billing.CreditNoteRequestDto;
import com.tamachihua_erp.api.dto.billing.InvoiceRequestDto;
import com.tamachihua_erp.api.dto.billing.InvoiceResponseDto;
import com.tamachihua_erp.api.dto.billing.InvoiceSummaryDto;
import com.tamachihua_erp.api.dto.billing.PaymentRequestDto;
import com.tamachihua_erp.api.dto.billing.PaymentResponseDto;
import com.tamachihua_erp.api.dto.common.PageResponseDto;
import com.tamachihua_erp.api.service.InvoiceService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.time.LocalDate;
import java.util.List;

// Facturación, pagos y notas de crédito (contrato §12).
@RestController
@RequestMapping("/api/invoices")
@RequiredArgsConstructor
public class InvoiceController {

    private final InvoiceService service;

    @GetMapping
    public ResponseEntity<PageResponseDto<InvoiceSummaryDto>> findAll(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long customerId,
            @RequestParam(required = false) String invoiceType,
            @RequestParam(required = false) String status,
            @PageableDefault(page = 0, size = 20, sort = "issueDate",
                    direction = Sort.Direction.DESC) Pageable pageable
    ) {
        Pageable limitedPageable = pageable.getPageSize() > 100
                ? PageRequest.of(pageable.getPageNumber(), 100, pageable.getSort())
                : pageable;

        return ResponseEntity.ok(PageResponseDto.from(
                service.findAll(
                        from,
                        to,
                        customerId,
                        invoiceType,
                        status,
                        limitedPageable
                )
        ));
    }

    @GetMapping("/{id}")
    public ResponseEntity<InvoiceResponseDto> findById(@PathVariable Long id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @PostMapping
    public ResponseEntity<InvoiceResponseDto> create(
            @Valid @RequestBody InvoiceRequestDto dto,
            @AuthenticationPrincipal Jwt jwt
    ) {
        InvoiceResponseDto created = service.create(dto, currentUserId(jwt));

        return ResponseEntity
                .created(URI.create("/api/invoices/" + created.id()))
                .body(created);
    }

    @PostMapping("/{id}/payments")
    public ResponseEntity<PaymentResponseDto> addPayment(
            @PathVariable Long id,
            @Valid @RequestBody PaymentRequestDto dto,
            @AuthenticationPrincipal Jwt jwt
    ) {
        PaymentResponseDto created = service.addPayment(
                id,
                dto,
                currentUserId(jwt)
        );

        return ResponseEntity
                .created(URI.create("/api/invoices/" + id + "/payments"))
                .body(created);
    }

    @GetMapping("/{id}/payments")
    public ResponseEntity<List<PaymentResponseDto>> findPayments(
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(service.findPayments(id));
    }

    @PostMapping("/{id}/credit-note")
    public ResponseEntity<InvoiceResponseDto> issueCreditNote(
            @PathVariable Long id,
            @Valid @RequestBody CreditNoteRequestDto dto,
            @AuthenticationPrincipal Jwt jwt
    ) {
        InvoiceResponseDto created = service.issueCreditNote(
                id,
                dto,
                currentUserId(jwt)
        );

        return ResponseEntity
                .created(URI.create("/api/invoices/" + created.id()))
                .body(created);
    }

    private Long currentUserId(Jwt jwt) {

        Number userId = jwt.getClaim("userId");

        if (userId == null) {
            throw new BadCredentialsException("Token inválido");
        }

        return userId.longValue();
    }
}
