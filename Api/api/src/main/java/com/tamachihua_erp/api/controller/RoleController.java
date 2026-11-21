package com.tamachihua_erp.api.controller;

import com.tamachihua_erp.api.dto.common.StatusRequestDto;
import com.tamachihua_erp.api.dto.role.RoleCreateRequestDto;
import com.tamachihua_erp.api.dto.role.RoleOptionDto;
import com.tamachihua_erp.api.dto.role.RoleResponseDto;
import com.tamachihua_erp.api.dto.role.RoleUpdateRequestDto;
import com.tamachihua_erp.api.service.RoleService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

// Roles del sistema: lectura y gestión exclusiva de ADMIN.
@RestController
@RequestMapping("/api/roles")
@RequiredArgsConstructor
public class RoleController {

    private final RoleService roleService;

    @GetMapping
    public ResponseEntity<List<RoleResponseDto>> findAll() {

        return ResponseEntity.ok(roleService.findAll());
    }

    @GetMapping("/options")
    public ResponseEntity<List<RoleOptionDto>> findActiveOptions() {

        return ResponseEntity.ok(roleService.findActiveOptions());
    }

    @PostMapping
    public ResponseEntity<RoleResponseDto> create(
            @Valid @RequestBody RoleCreateRequestDto dto
    ) {
        RoleResponseDto created = roleService.create(dto);

        return ResponseEntity
                .created(URI.create("/api/roles/" + created.id()))
                .body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<RoleResponseDto> update(
            @PathVariable Long id,
            @Valid @RequestBody RoleUpdateRequestDto dto
    ) {
        return ResponseEntity.ok(roleService.update(id, dto));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Void> changeStatus(
            @PathVariable Long id,
            @Valid @RequestBody StatusRequestDto dto
    ) {
        roleService.changeStatus(id, dto.isActive());

        return ResponseEntity.noContent().build();
    }
}
