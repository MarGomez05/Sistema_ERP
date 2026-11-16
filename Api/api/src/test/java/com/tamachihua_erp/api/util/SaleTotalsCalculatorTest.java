package com.tamachihua_erp.api.util;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class SaleTotalsCalculatorTest {

    @Test
    void calculaLaBaseYElIvaDeUnPrecioQueYaIncluyeIva() {

        // Precio con IVA incluido: 113.00 => base 100.00 e IVA 13.00
        SaleTotalsCalculator.LineAmounts amounts =
                SaleTotalsCalculator.calculate(
                        new BigDecimal("1.00"),
                        new BigDecimal("113.00"),
                        BigDecimal.ZERO,
                        new BigDecimal("13.00")
                );

        assertThat(amounts.lineSubtotal()).isEqualByComparingTo("100.00");
        assertThat(amounts.taxAmount()).isEqualByComparingTo("13.00");
        assertThat(amounts.lineTotal()).isEqualByComparingTo("113.00");
    }

    @Test
    void aplicaDescuentoAntesDeSepararElIva() {

        // 5 x 20.00 = 100.00; descuento 10.00 => total 90.00; base 79.65 e IVA 10.35
        SaleTotalsCalculator.LineAmounts amounts =
                SaleTotalsCalculator.calculate(
                        new BigDecimal("5.00"),
                        new BigDecimal("20.00"),
                        new BigDecimal("10.00"),
                        new BigDecimal("13.00")
                );

        assertThat(amounts.lineTotal()).isEqualByComparingTo("90.00");
        assertThat(amounts.lineSubtotal()).isEqualByComparingTo("79.65");
        assertThat(amounts.taxAmount()).isEqualByComparingTo("10.35");
    }

    @Test
    void respetaLosProductosExentos() {

        SaleTotalsCalculator.LineAmounts amounts =
                SaleTotalsCalculator.calculate(
                        new BigDecimal("2.00"),
                        new BigDecimal("50.00"),
                        null,
                        BigDecimal.ZERO
                );

        assertThat(amounts.lineSubtotal()).isEqualByComparingTo("100.00");
        assertThat(amounts.taxAmount()).isEqualByComparingTo("0.00");
        assertThat(amounts.lineTotal()).isEqualByComparingTo("100.00");
    }

    @Test
    void redondeaElImporteBrutoConHalfUp() {

        BigDecimal gross = SaleTotalsCalculator.grossAmount(
                new BigDecimal("1.50"),
                new BigDecimal("10.01")
        );

        assertThat(gross).isEqualByComparingTo("15.02");
    }
}
