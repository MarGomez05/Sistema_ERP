package com.tamachihua_erp.api.service.impl;

import com.tamachihua_erp.api.config.CompanyProperties;
import com.tamachihua_erp.api.dto.billing.InvoiceDetailResponseDto;
import com.tamachihua_erp.api.dto.billing.InvoiceResponseDto;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class InvoicePdfServiceImplTest {

    private final InvoicePdfServiceImpl service = new InvoicePdfServiceImpl(
            new CompanyProperties(
                    "MARERP S.A. DE C.V.",
                    "06852248-1",
                    "123456-7",
                    "Lourdes Colón, La Libertad",
                    "2578-2910",
                    "admin@elprogreso.example"
            )
    );

    @Test
    void generaPdfConEncabezadoEmpresaClienteYDetalle() throws IOException {

        byte[] pdf = service.render(invoice());

        assertThat(new String(pdf, 0, 4, StandardCharsets.US_ASCII)).isEqualTo("%PDF");

        try (PDDocument document = Loader.loadPDF(pdf)) {

            assertThat(document.getNumberOfPages()).isEqualTo(1);

            String text = new PDFTextStripper().getText(document);

            assertThat(text)
                    .contains("MARERP S.A. DE C.V.")
                    .contains("06852248-1")
                    .contains("F-2026-000001")
                    .contains("Cliente Ejemplo, S.A.")
                    .contains("Cemento gris")
                    .contains("TOTAL")
                    .contains("$113.00");
        }
    }

    private InvoiceResponseDto invoice() {

        InvoiceDetailResponseDto detail = new InvoiceDetailResponseDto(
                1L,
                10L,
                "P-100",
                "Cemento gris",
                "PR-01",
                "Bolsa 50 kg",
                new BigDecimal("2.00"),
                new BigDecimal("50.00"),
                BigDecimal.ZERO,
                new BigDecimal("13.00"),
                new BigDecimal("11.50"),
                new BigDecimal("100.00"),
                new BigDecimal("113.00")
        );

        return new InvoiceResponseDto(
                40L,
                "F-2026-000001",
                "CCF-0001",
                "CCF",
                "ISSUED",
                LocalDate.of(2026, 11, 18),
                LocalDate.of(2026, 12, 18),
                1L,
                8L,
                null,
                null,
                "CREDIT",
                new BigDecimal("100.00"),
                BigDecimal.ZERO,
                new BigDecimal("13.00"),
                new BigDecimal("113.00"),
                new BigDecimal("13.00"),
                new BigDecimal("100.00"),
                "Cliente Ejemplo, S.A.",
                "NIT",
                "0614-123456-101-2",
                "0614-123456-101-2",
                "123456-7",
                "Calle Principal, San Salvador",
                "cliente@example.com",
                "Factura de prueba",
                List.of(detail),
                null,
                null
        );
    }
}
