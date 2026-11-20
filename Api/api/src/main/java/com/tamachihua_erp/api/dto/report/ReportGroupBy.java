package com.tamachihua_erp.api.dto.report;

import com.tamachihua_erp.api.exception.InvalidFieldException;

import java.util.Locale;

// Agrupación de la serie temporal del reporte de ventas.
public enum ReportGroupBy {

    DAY,
    MONTH;

    public static ReportGroupBy from(String value) {

        if (value == null || value.isBlank()) {
            return DAY;
        }

        try {
            return valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new InvalidFieldException(
                    "groupBy",
                    "La agrupación debe ser DAY o MONTH"
            );
        }
    }
}
