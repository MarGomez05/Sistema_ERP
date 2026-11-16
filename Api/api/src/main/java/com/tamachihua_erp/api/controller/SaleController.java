package com.tamachihua_erp.api.controller;

import com.tamachihua_erp.api.dto.billing.InvoiceRequestDto;
import com.tamachihua_erp.api.dto.billing.InvoiceResponseDto;
import com.tamachihua_erp.api.dto.common.PageResponseDto;
import com.tamachihua_erp.api.dto.sale.SaleCancelRequestDto;
import com.tamachihua_erp.api.dto.sale.SaleRequestDto;
import com.tamachihua_erp.api.dto.sale.SaleResponseDto;
import com.tamachihua_erp.api.dto.sale.SaleSummaryDto;
import com.tamachihua_erp.api.service.InvoiceService;
import com.tamachihua_erp.api.service.SaleService;

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

// Ventas (contrato §11). Roles definidos en SecurityConfig.
@RestController
@RequestMapping("/api/sales")
@RequiredArgsConstructor
public class SaleController {

    private final SaleService service;
    private final InvoiceService invoiceService;

    @GetMapping
    public ResponseEntity<PageResponseDto<SaleSummaryDto>> findAll(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long customerId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long userId,
            @PageableDefault(page = 0, size = 20, sort = "saleDate",
                    direction = Sort.Direction.DESC) Pageable pageable,
            @AuthenticationPrincipal Jwt jwt
    ) {
        Pageable limitedPageable = pageable.getPageSize() > 100
                ? PageRequest.of(pageable.getPageNumber(), 100, pageable.getSort())
                : pageable;

        // SELLER solo ve sus propias ventas; el resto consulta todas.
        Long effectiveUserId = canViewAll(jwt) ? userId : currentUserId(jwt);

        return ResponseEntity.ok(PageResponseDto.from(
                service.findAll(
                        from,
                        to,
                        customerId,
                        status,
                        effectiveUserId,
                        limitedPageable
                )
        ));
    }

    @GetMapping("/{id}")
    public ResponseEntity<SaleResponseDto> findById(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return ResponseEntity.ok(service.findById(
                id,
                currentUserId(jwt),
                canViewAll(jwt)
        ));
    }

    @PostMapping
    public ResponseEntity<SaleResponseDto> create(
            @Valid @RequestBody SaleRequestDto dto,
            @AuthenticationPrincipal Jwt jwt
    ) {
        SaleResponseDto created = service.create(dto, currentUserId(jwt));

        return ResponseEntity
                .created(URI.create("/api/sales/" + created.id()))
                .body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<SaleResponseDto> update(
            @PathVariable Long id,
            @Valid @RequestBody SaleRequestDto dto,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return ResponseEntity.ok(service.update(
                id,
                dto,
                currentUserId(jwt),
                canManageAll(jwt)
        ));
    }

    @PostMapping("/{id}/confirm")
    public ResponseEntity<SaleResponseDto> confirm(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return ResponseEntity.ok(service.confirm(
                id,
                currentUserId(jwt),
                canManageAll(jwt)
        ));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<SaleResponseDto> cancel(
            @PathVariable Long id,
            @Valid @RequestBody(required = false) SaleCancelRequestDto dto,
            @AuthenticationPrincipal Jwt jwt
    ) {
        String reason = dto == null ? null : dto.reason();

        return ResponseEntity.ok(service.cancel(id, reason, currentUserId(jwt)));
    }

    @PostMapping("/{id}/invoice")
    public ResponseEntity<InvoiceResponseDto> createInvoice(
            @PathVariable Long id,
            @Valid @RequestBody InvoiceRequestDto dto,
            @AuthenticationPrincipal Jwt jwt
    ) {
        InvoiceResponseDto created = invoiceService.createFromSale(
                id,
                dto,
                currentUserId(jwt)
        );

        return ResponseEntity
                .created(URI.create("/api/invoices/" + created.id()))
                .body(created);
    }

    private boolean canViewAll(Jwt jwt) {

        List<String> roles = roles(jwt);

        return roles.contains("ADMIN")
                || roles.contains("WAREHOUSE")
                || roles.contains("PURCHASING");
    }

    private boolean canManageAll(Jwt jwt) {

        return roles(jwt).contains("ADMIN");
    }

    private List<String> roles(Jwt jwt) {

        List<String> roles = jwt.getClaimAsStringList("roles");

        return roles == null ? List.of() : roles;
    }

    private Long currentUserId(Jwt jwt) {

        Number userId = jwt.getClaim("userId");

        if (userId == null) {
            throw new BadCredentialsException("Token inválido");
        }

        return userId.longValue();
    }
}
