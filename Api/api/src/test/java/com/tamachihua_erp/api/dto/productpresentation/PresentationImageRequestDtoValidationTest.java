package com.tamachihua_erp.api.dto.productpresentation;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;

import org.junit.jupiter.api.Test;

import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

class PresentationImageRequestDtoValidationTest {

    private final Validator validator =
            Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    void aceptaUnaUrlAbsoluta() {

        assertThat(validator.validate(
                new PresentationImageRequestDto(
                        "https://cdn.example.com/productos/codo.jpg",
                        "Codo PVC de 1/2 pulgada"
                )
        )).isEmpty();
    }

    @Test
    void aceptaUnaRutaRelativa() {

        assertThat(validator.validate(
                new PresentationImageRequestDto("/media/products/codo.jpg", null)
        )).isEmpty();
    }

    @Test
    void aceptaImagenVaciaParaQuitarla() {

        assertThat(validator.validate(new PresentationImageRequestDto(null, null))).isEmpty();
        assertThat(validator.validate(new PresentationImageRequestDto("   ", null))).isEmpty();
    }

    @Test
    void rechazaEsquemasNoPermitidos() {

        assertThat(messages(new PresentationImageRequestDto("javascript:alert(1)", null)))
                .contains("La URL de la imagen debe usar http(s) o una ruta relativa que empiece con /");

        assertThat(messages(new PresentationImageRequestDto("ftp://example.com/a.jpg", null)))
                .contains("La URL de la imagen debe usar http(s) o una ruta relativa que empiece con /");

        assertThat(messages(new PresentationImageRequestDto("productos/codo.jpg", null)))
                .contains("La URL de la imagen debe usar http(s) o una ruta relativa que empiece con /");
    }

    @Test
    void rechazaUrlDemasiadoLarga() {

        String url = "https://example.com/" + "a".repeat(500);

        assertThat(messages(new PresentationImageRequestDto(url, null)))
                .contains("La URL de la imagen no puede superar los 500 caracteres");
    }

    @Test
    void rechazaTextoAlternativoDemasiadoLargo() {

        assertThat(messages(new PresentationImageRequestDto(
                "/media/products/codo.jpg",
                "a".repeat(151)
        ))).contains("El texto alternativo no puede superar los 150 caracteres");
    }

    private Set<String> messages(PresentationImageRequestDto dto) {

        return validator.validate(dto)
                .stream()
                .map(ConstraintViolation::getMessage)
                .collect(Collectors.toSet());
    }
}
