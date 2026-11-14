package com.tamachihua_erp.api.controller;

import com.tamachihua_erp.api.dto.customer.CustomerCreditRequestDto;
import com.tamachihua_erp.api.dto.customer.CustomerOptionDto;
import com.tamachihua_erp.api.dto.customer.CustomerRequestDto;
import com.tamachihua_erp.api.dto.customer.CustomerResponseDto;
import com.tamachihua_erp.api.service.CustomerService;
import com.tamachihua_erp.api.dto.common.PageResponseDto;
import com.tamachihua_erp.api.dto.common.StatusRequestDto;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

// Clientes (contrato §10). Roles definidos en SecurityConfig.
@RestController
@RequestMapping("/api/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService service;

    @GetMapping
    public ResponseEntity<PageResponseDto<CustomerResponseDto>> findAll(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(required = false) String documentType,
            @PageableDefault(page = 0, size = 20, sort = "legalName", direction = Sort.Direction.ASC)
            Pageable pageable
    ) {
        Pageable limitedPageable = pageable.getPageSize() > 100
                ? PageRequest.of(pageable.getPageNumber(), 100, pageable.getSort())
                : pageable;

        return ResponseEntity.ok(PageResponseDto.from(
                service.findAll(search, isActive, documentType, limitedPageable)
        ));
    }

    @GetMapping("/options")
    public ResponseEntity<List<CustomerOptionDto>> findActiveOptions() {
        return ResponseEntity.ok(service.findActiveOptions());
    }

    @GetMapping("/{id}")
    public ResponseEntity<CustomerResponseDto> findById(@PathVariable Long id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @PostMapping
    public ResponseEntity<CustomerResponseDto> create(
            @Valid @RequestBody CustomerRequestDto dto
    ) {
        CustomerResponseDto created = service.create(dto);

        return ResponseEntity
                .created(URI.create("/api/customers/" + created.id()))
                .body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<CustomerResponseDto> update(
            @PathVariable Long id,
            @Valid @RequestBody CustomerRequestDto dto
    ) {
        return ResponseEntity.ok(service.update(id, dto));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Void> changeStatus(
            @PathVariable Long id,
            @Valid @RequestBody StatusRequestDto dto
    ) {
        service.changeStatus(id, dto.isActive());
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/credit")
    public ResponseEntity<CustomerResponseDto> changeCredit(
            @PathVariable Long id,
            @Valid @RequestBody CustomerCreditRequestDto dto
    ) {
        return ResponseEntity.ok(service.changeCredit(id, dto));
    }
}
