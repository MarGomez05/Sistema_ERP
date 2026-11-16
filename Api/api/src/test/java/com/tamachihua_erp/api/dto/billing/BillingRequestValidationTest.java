package com.tamachihua_erp.api.dto.billing;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

class BillingRequestValidationTest {

    private final Validator validator =
            Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    void aceptaUnaFacturaValida() {
        assertThat(validator.validate(invoice("CCF"))).isEmpty();
    }

    @Test
    void rechazaTipoDeFacturaInvalido() {

        assertThat(messages(invoice("TICKET")))
                .contains("El tipo de factura debe ser CONSUMER o CCF");
    }

    @Test
    void rechazaCondicionDePagoInvalida() {

        InvoiceRequestDto dto = new InvoiceRequestDto(
                1L, "CCF", null, "DEBIT", null
        );

        assertThat(messages(dto))
                .contains("La condición de pago debe ser CASH o CREDIT");
    }

    @Test
    void rechazaNumeroDeControlDemasiadoLargo() {

        InvoiceRequestDto dto = new InvoiceRequestDto(
                1L, "CCF", "x".repeat(31), "CASH", null
        );

        assertThat(messages(dto))
                .contains("El número de control no puede superar los 30 caracteres");
    }

    @Test
    void aceptaUnPagoValido() {
        assertThat(validator.validate(payment(LocalDate.now(), "50.00"))).isEmpty();
    }

    @Test
    void rechazaPagoFuturo() {

        assertThat(messages(payment(LocalDate.now().plusDays(1), "50.00")))
                .contains("La fecha del pago no puede ser futura");
    }

    @Test
    void rechazaMontoNoPositivo() {

        assertThat(messages(payment(LocalDate.now(), "0.00")))
                .contains("El monto debe ser mayor que cero");
    }

    @Test
    void rechazaMetodoDePagoInvalido() {

        PaymentRequestDto dto = new PaymentRequestDto(
                LocalDate.now(),
                new BigDecimal("10.00"),
                "BITCOIN",
                null,
                null
        );

        assertThat(messages(dto))
                .contains("El método de pago debe ser CASH, CARD, TRANSFER, CHECK u OTHER");
    }

    @Test
    void rechazaNotaDeCreditoSinMotivo() {

        CreditNoteRequestDto dto = new CreditNoteRequestDto("   ", true);

        assertThat(messages(dto))
                .contains("El motivo de la nota de crédito es obligatorio");
    }

    private InvoiceRequestDto invoice(String invoiceType) {
        return new InvoiceRequestDto(
                1L, invoiceType, "A-001", "CASH", "Factura de prueba"
        );
    }

    private PaymentRequestDto payment(LocalDate date, String amount) {
        return new PaymentRequestDto(
                date,
                new BigDecimal(amount),
                "CASH",
                "REF-1",
                null
        );
    }

    private <T> Set<String> messages(T dto) {
        return validator.validate(dto)
                .stream()
                .map(ConstraintViolation::getMessage)
                .collect(Collectors.toSet());
    }
}
