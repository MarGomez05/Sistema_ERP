package com.tamachihua_erp.api.service.impl;

import com.tamachihua_erp.api.dto.auth.*;
import com.tamachihua_erp.api.entity.User;
import com.tamachihua_erp.api.repository.UserRepository;
import com.tamachihua_erp.api.security.JwtService;
import com.tamachihua_erp.api.service.AuthService;

import lombok.RequiredArgsConstructor;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthServiceImpl implements AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final JwtService jwtService;

    @Value("${app.jwt.expiration}")
    private long expirationSeconds;

    @Override
    public LoginResponseDto login(LoginRequestDto request) {

        try {
            authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(
                            request.username(),
                            request.password()
                    )
            );

        } catch (AuthenticationException exception) {

            throw new BadCredentialsException(
                    "Credenciales inválidas"
            );
        }

        User user = userRepository.findByUsername(request.username())
                .or(() -> userRepository.findByEmailIgnoreCase(request.username()))
                .orElseThrow(() ->
                        new UsernameNotFoundException("Usuario no encontrado")
                );

        String token = jwtService.generateToken(user);

        UserAuthResponseDto userResponse =
                new UserAuthResponseDto(
                        user.getId(),
                        user.getUsername(),
                        user.getFullName(),
                        user.getRole().getCode()
                );

        return new LoginResponseDto(
                token,
                "Bearer",
                expirationSeconds,
                userResponse
        );
    }
}