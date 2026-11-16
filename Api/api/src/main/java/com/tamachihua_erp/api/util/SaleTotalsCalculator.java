package com.tamachihua_erp.api.util;

import java.math.BigDecimal;
import java.math.RoundingMode;

// Calcula los importes de una línea y de la venta.
// D-02: los precios de venta ya incluyen IVA, por lo que la base se obtiene
// dividiendo el total de la línea entre (1 + tasa / 100).
public final class SaleTotalsCalculator {

    private static final BigDecimal HUNDRED = new BigDecimal("100");

    private SaleTotalsCalculator() {
    }

    public record LineAmounts(
            BigDecimal lineSubtotal,
            BigDecimal taxAmount,
            BigDecimal lineTotal
    ) {
    }

    // Importe bruto de la línea antes del descuento: cantidad * precio.
    public static BigDecimal grossAmount(BigDecimal quantity, BigDecimal unitPrice) {
        return quantity.multiply(unitPrice).setScale(2, RoundingMode.HALF_UP);
    }

    public static LineAmounts calculate(
            BigDecimal quantity,
            BigDecimal unitPrice,
            BigDecimal discount,
            BigDecimal taxRate
    ) {

        BigDecimal gross = grossAmount(quantity, unitPrice);

        BigDecimal safeDiscount = discount == null ? BigDecimal.ZERO : discount;

        BigDecimal lineTotal = gross
                .subtract(safeDiscount)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal safeTaxRate = taxRate == null ? BigDecimal.ZERO : taxRate;

        BigDecimal divisor = BigDecimal.ONE.add(
                safeTaxRate.divide(HUNDRED, 6, RoundingMode.HALF_UP)
        );

        BigDecimal lineSubtotal = lineTotal.divide(divisor, 2, RoundingMode.HALF_UP);

        BigDecimal taxAmount = lineTotal
                .subtract(lineSubtotal)
                .setScale(2, RoundingMode.HALF_UP);

        return new LineAmounts(lineSubtotal, taxAmount, lineTotal);
    }
}
