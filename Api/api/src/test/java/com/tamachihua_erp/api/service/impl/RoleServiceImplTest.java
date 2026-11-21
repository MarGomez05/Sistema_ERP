package com.tamachihua_erp.api.service.impl;

import com.tamachihua_erp.api.dto.role.RoleCreateRequestDto;
import com.tamachihua_erp.api.dto.role.RoleResponseDto;
import com.tamachihua_erp.api.dto.role.RoleUpdateRequestDto;
import com.tamachihua_erp.api.entity.Role;
import com.tamachihua_erp.api.exception.ResourceConflictException;
import com.tamachihua_erp.api.exception.ResourceNotFoundException;
import com.tamachihua_erp.api.repository.RoleRepository;
import com.tamachihua_erp.api.repository.UserRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RoleServiceImplTest {

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private UserRepository userRepository;

    private RoleServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new RoleServiceImpl(roleRepository, userRepository);
    }

    @Test
    void creaUnRolNormalizandoElCodigo() {

        when(roleRepository.existsByCode("AUDITOR")).thenReturn(false);
        when(roleRepository.existsByNameIgnoreCase("Auditor")).thenReturn(false);
        when(roleRepository.save(any(Role.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        RoleResponseDto created = service.create(
                new RoleCreateRequestDto("  auditor ", "  Auditor  ", "  Solo lectura  ")
        );

        assertThat(created.code()).isEqualTo("AUDITOR");
        assertThat(created.name()).isEqualTo("Auditor");
        assertThat(created.description()).isEqualTo("Solo lectura");
        assertThat(created.isActive()).isTrue();
        assertThat(created.activeUsers()).isZero();
    }

    @Test
    void rechazaUnCodigoDuplicado() {

        when(roleRepository.existsByCode("ADMIN")).thenReturn(true);

        assertThatThrownBy(() -> service.create(
                new RoleCreateRequestDto("ADMIN", "Administrador", null)
        ))
                .isInstanceOf(ResourceConflictException.class)
                .hasMessageContaining("código");

        verify(roleRepository, never()).save(any());
    }

    @Test
    void rechazaUnNombreDuplicadoAlCrear() {

        when(roleRepository.existsByCode("AUDITOR")).thenReturn(false);
        when(roleRepository.existsByNameIgnoreCase("Bodega")).thenReturn(true);

        assertThatThrownBy(() -> service.create(
                new RoleCreateRequestDto("AUDITOR", "Bodega", null)
        ))
                .isInstanceOf(ResourceConflictException.class)
                .hasMessageContaining("nombre");
    }

    @Test
    void actualizaNombreYDescripcion() {

        Role role = role(3L, "SELLER", "Vendedor", true);

        when(roleRepository.findById(3L)).thenReturn(Optional.of(role));
        when(roleRepository.existsByNameIgnoreCaseAndIdNot("Ventas", 3L)).thenReturn(false);
        when(roleRepository.save(role)).thenReturn(role);

        RoleResponseDto updated = service.update(
                3L,
                new RoleUpdateRequestDto("Ventas", "  Atención al cliente  ")
        );

        assertThat(updated.name()).isEqualTo("Ventas");
        assertThat(updated.description()).isEqualTo("Atención al cliente");
        assertThat(updated.code()).isEqualTo("SELLER");
    }

    @Test
    void rechazaUnNombreDuplicadoAlEditar() {

        when(roleRepository.findById(3L)).thenReturn(Optional.of(role(3L, "SELLER", "Vendedor", true)));
        when(roleRepository.existsByNameIgnoreCaseAndIdNot("Bodega", 3L)).thenReturn(true);

        assertThatThrownBy(() -> service.update(
                3L,
                new RoleUpdateRequestDto("Bodega", null)
        ))
                .isInstanceOf(ResourceConflictException.class)
                .hasMessageContaining("nombre");
    }

    @Test
    void noPermiteDesactivarElRolAdmin() {

        when(roleRepository.findById(1L)).thenReturn(Optional.of(role(1L, "ADMIN", "Administrador", true)));

        assertThatThrownBy(() -> service.changeStatus(1L, false))
                .isInstanceOf(ResourceConflictException.class)
                .hasMessageContaining("ADMIN");

        verify(roleRepository, never()).save(any());
    }

    @Test
    void noPermiteDesactivarUnRolConUsuariosActivos() {

        Role role = role(2L, "WAREHOUSE", "Bodega", true);

        when(roleRepository.findById(2L)).thenReturn(Optional.of(role));
        when(userRepository.countByRoleIdAndIsActiveTrue(2L)).thenReturn(2L);

        assertThatThrownBy(() -> service.changeStatus(2L, false))
                .isInstanceOf(ResourceConflictException.class)
                .hasMessageContaining("usuarios activos");

        verify(roleRepository, never()).save(any());
    }

    @Test
    void desactivaUnRolSinUsuariosActivos() {

        Role role = role(4L, "AUDITOR", "Auditor", true);

        when(roleRepository.findById(4L)).thenReturn(Optional.of(role));
        when(userRepository.countByRoleIdAndIsActiveTrue(4L)).thenReturn(0L);
        when(roleRepository.save(role)).thenReturn(role);

        service.changeStatus(4L, false);

        assertThat(role.getIsActive()).isFalse();
    }

    @Test
    void listaTodasLasOpcionesActivas() {

        when(roleRepository.findAllByIsActiveTrueOrderByNameAsc())
                .thenReturn(List.of(role(1L, "ADMIN", "Administrador", true)));

        var options = service.findActiveOptions();

        assertThat(options).hasSize(1);
        assertThat(options.get(0).code()).isEqualTo("ADMIN");
        assertThat(options.get(0).name()).isEqualTo("Administrador");
    }

    @Test
    void fallaSiElRolNoExiste() {

        when(roleRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.update(99L, new RoleUpdateRequestDto("X", null)))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("99");
    }

    private static Role role(Long id, String code, String name, boolean isActive) {

        Role role = new Role();

        role.setId(id);
        role.setCode(code);
        role.setName(name);
        role.setIsActive(isActive);

        return role;
    }
}
