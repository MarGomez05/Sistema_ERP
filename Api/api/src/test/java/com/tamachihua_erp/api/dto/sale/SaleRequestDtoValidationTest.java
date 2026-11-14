package com.tamachihua_erp.api.dto.sale;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

class SaleRequestDtoValidationTest {

    private final Validator validator =
            Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    void aceptaUnaVentaValida() {
        assertThat(validator.validate(validRequest())).isEmpty();
    }

    @Test
    void rechazaVentaSinLineas() {

        SaleRequestDto dto = new SaleRequestDto(
                null, "CASH", null, null, List.of()
        );

        assertThat(messages(dto))
                .contains("La venta debe tener al menos una línea");
    }

    @Test
    void rechazaCondicionDePagoInvalida() {

        SaleRequestDto dto = new SaleRequestDto(
                3L, "DEBIT", null, null, List.of(validDetail())
        );

        assertThat(messages(dto))
                .contains("La condición de pago debe ser CASH o CREDIT");
    }

    @Test
    void rechazaMetodoDePagoInvalido() {

        SaleRequestDto dto = new SaleRequestDto(
                3L, "CASH", "BITCOIN", null, List.of(validDetail())
        );

        assertThat(messages(dto))
                .contains("El método de pago debe ser CASH, CARD, TRANSFER u OTHER");
    }

    @Test
    void rechazaCantidadNoPositiva() {

        SaleDetailRequestDto detail = new SaleDetailRequestDto(
                10L, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.TEN
        );

        SaleRequestDto dto = new SaleRequestDto(
                3L, "CASH", null, null, List.of(detail)
        );

        assertThat(messages(dto))
                .contains("La cantidad debe ser mayor que cero");
    }

    @Test
    void rechazaDescuentoNegativo() {

        SaleDetailRequestDto detail = new SaleDetailRequestDto(
                10L, new BigDecimal("1.00"), new BigDecimal("-1.00"), null
        );

        SaleRequestDto dto = new SaleRequestDto(
                3L, "CASH", null, null, List.of(detail)
        );

        assertThat(messages(dto))
                .contains("El descuento no puede ser negativo");
    }

    @Test
    void rechazaNotasDemasiadoLargas() {

        SaleRequestDto dto = new SaleRequestDto(
                3L, "CASH", null, "x".repeat(256), List.of(validDetail())
        );

        assertThat(messages(dto))
                .contains("Las notas no pueden superar los 255 caracteres");
    }

    private SaleRequestDto validRequest() {
        return new SaleRequestDto(
                null, "CASH", "", "Venta de mostrador", List.of(validDetail())
        );
    }

    private SaleDetailRequestDto validDetail() {
        return new SaleDetailRequestDto(
                10L,
                new BigDecimal("2.00"),
                BigDecimal.ZERO,
                new BigDecimal("20.00")
        );
    }

    private Set<String> messages(SaleRequestDto dto) {
        return validator.validate(dto)
                .stream()
                .map(ConstraintViolation::getMessage)
                .collect(Collectors.toSet());
    }
}
