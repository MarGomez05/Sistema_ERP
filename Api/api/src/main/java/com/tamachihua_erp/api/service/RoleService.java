package com.tamachihua_erp.api.service;

import com.tamachihua_erp.api.dto.role.RoleCreateRequestDto;
import com.tamachihua_erp.api.dto.role.RoleOptionDto;
import com.tamachihua_erp.api.dto.role.RoleResponseDto;
import com.tamachihua_erp.api.dto.role.RoleUpdateRequestDto;

import java.util.List;

// Gestión de roles del sistema (solo ADMIN).
public interface RoleService {

    List<RoleResponseDto> findAll();

    List<RoleOptionDto> findActiveOptions();

    RoleResponseDto create(RoleCreateRequestDto dto);

    RoleResponseDto update(Long id, RoleUpdateRequestDto dto);

    void changeStatus(Long id, Boolean isActive);
}
