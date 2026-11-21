package com.tamachihua_erp.api.service.impl;

import com.tamachihua_erp.api.dto.role.RoleCreateRequestDto;
import com.tamachihua_erp.api.dto.role.RoleOptionDto;
import com.tamachihua_erp.api.dto.role.RoleResponseDto;
import com.tamachihua_erp.api.dto.role.RoleUpdateRequestDto;
import com.tamachihua_erp.api.entity.Role;
import com.tamachihua_erp.api.exception.ResourceConflictException;
import com.tamachihua_erp.api.exception.ResourceNotFoundException;
import com.tamachihua_erp.api.repository.RoleRepository;
import com.tamachihua_erp.api.repository.UserRepository;
import com.tamachihua_erp.api.service.RoleService;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RoleServiceImpl implements RoleService {

    private static final String ADMIN_ROLE = "ADMIN";

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;

    @Override
    public List<RoleResponseDto> findAll() {

        return roleRepository.findAllByOrderByNameAsc()
                .stream()
                .map(this::toResponseDto)
                .toList();
    }

    @Override
    public List<RoleOptionDto> findActiveOptions() {

        return roleRepository.findAllByIsActiveTrueOrderByNameAsc()
                .stream()
                .map(role -> new RoleOptionDto(
                        role.getId(),
                        role.getCode(),
                        role.getName()
                ))
                .toList();
    }

    @Override
    @Transactional
    public RoleResponseDto create(RoleCreateRequestDto dto) {

        String code = dto.code().trim().toUpperCase(Locale.ROOT);

        if (roleRepository.existsByCode(code)) {
            throw new ResourceConflictException("Ya existe un rol con ese código");
        }

        String name = dto.name().trim();

        if (roleRepository.existsByNameIgnoreCase(name)) {
            throw new ResourceConflictException("Ya existe un rol con ese nombre");
        }

        Role role = new Role();

        role.setCode(code);
        role.setName(name);
        role.setDescription(normalizeDescription(dto.description()));
        role.setIsActive(true);

        return toResponseDto(roleRepository.save(role));
    }

    @Override
    @Transactional
    public RoleResponseDto update(Long id, RoleUpdateRequestDto dto) {

        Role role = findRoleOrThrow(id);

        String name = dto.name().trim();

        if (roleRepository.existsByNameIgnoreCaseAndIdNot(name, id)) {
            throw new ResourceConflictException("Ya existe otro rol con ese nombre");
        }

        role.setName(name);
        role.setDescription(normalizeDescription(dto.description()));

        return toResponseDto(roleRepository.save(role));
    }

    @Override
    @Transactional
    public void changeStatus(Long id, Boolean isActive) {

        Role role = findRoleOrThrow(id);

        if (Boolean.FALSE.equals(isActive)) {

            // El rol ADMIN no se desactiva: bloquearía a todos los administradores.
            if (ADMIN_ROLE.equals(role.getCode())) {
                throw new ResourceConflictException(
                        "El rol ADMIN no se puede desactivar"
                );
            }

            long activeUsers = userRepository.countByRoleIdAndIsActiveTrue(id);

            if (activeUsers > 0) {
                throw new ResourceConflictException(
                        "No se puede desactivar un rol con usuarios activos. "
                                + "Reasigna primero a esos usuarios"
                );
            }
        }

        role.setIsActive(isActive);

        roleRepository.save(role);
    }

    private RoleResponseDto toResponseDto(Role role) {

        long activeUsers = userRepository.countByRoleIdAndIsActiveTrue(role.getId());

        return new RoleResponseDto(
                role.getId(),
                role.getCode(),
                role.getName(),
                role.getDescription(),
                role.getIsActive(),
                activeUsers
        );
    }

    private String normalizeDescription(String description) {

        if (description == null || description.isBlank()) {
            return null;
        }

        return description.trim();
    }

    private Role findRoleOrThrow(Long id) {

        return roleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No se encontró el rol con ID: " + id
                ));
    }
}
