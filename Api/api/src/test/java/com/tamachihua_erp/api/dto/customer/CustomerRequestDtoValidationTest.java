package com.tamachihua_erp.api.dto.customer;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class CustomerRequestDtoValidationTest {

    private final Validator validator =
            Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    void aceptaUnClienteValido() {
        assertThat(validator.validate(validRequest())).isEmpty();
    }

    @Test
    void rechazaTipoDeClienteInvalido() {

        CustomerRequestDto dto = new CustomerRequestDto(
                "OTRO", "DUI", "01234567-8", "Juan Pérez", null,
                null, null, null, null, "7777-7777", "juan@example.com",
                BigDecimal.ZERO, 0
        );

        assertThat(messages(dto))
                .contains("El tipo de cliente debe ser NATURAL o BUSINESS");
    }

    @Test
    void rechazaNombreObligatorio() {

        CustomerRequestDto dto = new CustomerRequestDto(
                "NATURAL", null, null, "   ", null,
                null, null, null, null, null, null, null, null
        );

        assertThat(messages(dto))
                .contains("El nombre o razón social es obligatorio");
    }

    @Test
    void rechazaCreditoNegativo() {

        CustomerRequestDto dto = new CustomerRequestDto(
                "BUSINESS", "NIT", "0614-123456-101-2", "Agroservicio", null,
                "0614-123456-101-2", null, null, null, null, null,
                new BigDecimal("-1.00"), -5
        );

        assertThat(messages(dto))
                .contains("El límite de crédito no puede ser negativo")
                .contains("Los días de crédito no pueden ser negativos");
    }

    @Test
    void rechazaCorreoInvalido() {

        CustomerRequestDto dto = new CustomerRequestDto(
                "NATURAL", null, null, "Juan Pérez", null,
                null, null, null, null, null, "correo-invalido",
                null, null
        );

        assertThat(messages(dto))
                .contains("El correo no tiene un formato válido");
    }

    @Test
    void rechazaTipoDeDocumentoInvalido() {

        CustomerRequestDto dto = new CustomerRequestDto(
                "NATURAL", "CEDULA", "1", "Juan Pérez", null,
                null, null, null, null, null, null, null, null
        );

        assertThat(messages(dto))
                .contains("El tipo de documento debe ser DUI, NIT, PASSPORT o FOREIGN");
    }

    @Test
    void aceptaCamposOpcionalesVacios() {

        CustomerRequestDto dto = new CustomerRequestDto(
                "NATURAL", "", "", "Juan Pérez", "",
                "", "", "", "", "", "", null, null
        );

        assertThat(validator.validate(dto)).isEmpty();
    }

    private CustomerRequestDto validRequest() {
        return new CustomerRequestDto(
                "BUSINESS", "NIT", "0614-123456-101-2",
                "Agroservicio El Progreso, S.A.", "El Progreso",
                "0614-123456-101-2", "123456-7", null, "Santa Tecla",
                "2222-3333", "compras@elprogreso.com",
                new BigDecimal("5000.00"), 30
        );
    }

    private Set<String> messages(CustomerRequestDto dto) {
        return validator.validate(dto)
                .stream()
                .map(ConstraintViolation::getMessage)
                .collect(java.util.stream.Collectors.toSet());
    }
}
