package com.tamachihua_erp.api.service.impl;

import com.tamachihua_erp.api.dto.user.UserCreateRequestDto;
import com.tamachihua_erp.api.dto.user.UserResponseDto;
import com.tamachihua_erp.api.dto.user.UserUpdateRequestDto;
import com.tamachihua_erp.api.entity.Role;
import com.tamachihua_erp.api.entity.User;
import com.tamachihua_erp.api.exception.InvalidFieldException;
import com.tamachihua_erp.api.exception.ResourceConflictException;
import com.tamachihua_erp.api.exception.ResourceNotFoundException;
import com.tamachihua_erp.api.mapper.UserMapper;
import com.tamachihua_erp.api.repository.RoleRepository;
import com.tamachihua_erp.api.repository.UserRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceImplTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    private UserServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new UserServiceImpl(
                userRepository,
                roleRepository,
                passwordEncoder,
                new UserMapper()
        );
    }

    @Test
    void creaUnUsuarioConContrasenaCifradaYCorreoOpcional() {

        when(userRepository.existsByUsernameIgnoreCase("jlopez")).thenReturn(false);
        when(roleRepository.findById(4L)).thenReturn(Optional.of(role(4L, "SELLER", true)));
        when(passwordEncoder.encode("secreta123")).thenReturn("hash");
        when(userRepository.save(any(User.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        UserResponseDto created = service.create(
                new UserCreateRequestDto("  jlopez ", "secreta123", "  José López  ", "   ", 4L)
        );

        assertThat(created.username()).isEqualTo("jlopez");
        assertThat(created.fullName()).isEqualTo("José López");
        assertThat(created.email()).isNull();
        assertThat(created.role().code()).isEqualTo("SELLER");
    }

    @Test
    void rechazaUnNombreDeUsuarioDuplicado() {

        when(userRepository.existsByUsernameIgnoreCase("admin")).thenReturn(true);

        assertThatThrownBy(() -> service.create(
                new UserCreateRequestDto("admin", "secreta123", "Administrador", null, 1L)
        ))
                .isInstanceOf(ResourceConflictException.class)
                .hasMessageContaining("usuario");

        verify(userRepository, never()).save(any());
    }

    @Test
    void noAsignaUnRolInactivo() {

        when(userRepository.existsByUsernameIgnoreCase("jlopez")).thenReturn(false);
        when(roleRepository.findById(5L)).thenReturn(Optional.of(role(5L, "AUDITOR", false)));

        assertThatThrownBy(() -> service.create(
                new UserCreateRequestDto("jlopez", "secreta123", "José López", null, 5L)
        ))
                .isInstanceOf(InvalidFieldException.class)
                .hasMessageContaining("inactivo");
    }

    @Test
    void impideQueUnAdministradorSeQuiteSuPropioRol() {

        User admin = user(1L, "admin", role(1L, "ADMIN", true), true);

        when(userRepository.findWithRoleById(1L)).thenReturn(Optional.of(admin));
        when(roleRepository.findById(4L)).thenReturn(Optional.of(role(4L, "SELLER", true)));

        assertThatThrownBy(() -> service.update(
                1L,
                new UserUpdateRequestDto("Administrador", null, 4L),
                1L
        ))
                .isInstanceOf(ResourceConflictException.class)
                .hasMessageContaining("su propio rol");
    }

    @Test
    void impideQuitarElRolAlUltimoAdministradorActivo() {

        User admin = user(1L, "admin", role(1L, "ADMIN", true), true);

        when(userRepository.findWithRoleById(1L)).thenReturn(Optional.of(admin));
        when(roleRepository.findById(4L)).thenReturn(Optional.of(role(4L, "SELLER", true)));
        when(userRepository.countByRoleCodeAndIsActiveTrue("ADMIN")).thenReturn(1L);

        assertThatThrownBy(() -> service.update(
                1L,
                new UserUpdateRequestDto("Administrador", null, 4L),
                99L
        ))
                .isInstanceOf(ResourceConflictException.class)
                .hasMessageContaining("último administrador");
    }

    @Test
    void impideQueUnAdministradorDesactiveSuPropioUsuario() {

        User admin = user(1L, "admin", role(1L, "ADMIN", true), true);

        when(userRepository.findWithRoleById(1L)).thenReturn(Optional.of(admin));

        assertThatThrownBy(() -> service.changeStatus(1L, false, 1L))
                .isInstanceOf(ResourceConflictException.class)
                .hasMessageContaining("su propio usuario");

        verify(userRepository, never()).save(any());
    }

    @Test
    void impideDesactivarAlUltimoAdministradorActivo() {

        User admin = user(1L, "admin", role(1L, "ADMIN", true), true);

        when(userRepository.findWithRoleById(1L)).thenReturn(Optional.of(admin));
        when(userRepository.countByRoleCodeAndIsActiveTrue("ADMIN")).thenReturn(1L);

        assertThatThrownBy(() -> service.changeStatus(1L, false, 99L))
                .isInstanceOf(ResourceConflictException.class)
                .hasMessageContaining("último administrador");
    }

    @Test
    void activaUnUsuarioInactivo() {

        User user = user(7L, "vendedor", role(4L, "SELLER", true), false);

        when(userRepository.findWithRoleById(7L)).thenReturn(Optional.of(user));
        when(userRepository.save(user)).thenReturn(user);

        service.changeStatus(7L, true, 1L);

        assertThat(user.getIsActive()).isTrue();
    }

    @Test
    void fallaSiElUsuarioNoExiste() {

        when(userRepository.findWithRoleById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.findById(99L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("99");
    }

    private static Role role(Long id, String code, boolean isActive) {

        Role role = new Role();

        role.setId(id);
        role.setCode(code);
        role.setName(code);
        role.setIsActive(isActive);

        return role;
    }

    private static User user(Long id, String username, Role role, boolean isActive) {

        User user = new User();

        user.setId(id);
        user.setUsername(username);
        user.setFullName(username);
        user.setPasswordHash("hash");
        user.setRole(role);
        user.setIsActive(isActive);

        return user;
    }
}
