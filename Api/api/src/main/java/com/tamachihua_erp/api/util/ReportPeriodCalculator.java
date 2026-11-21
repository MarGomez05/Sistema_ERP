package com.tamachihua_erp.api.util;

import com.tamachihua_erp.api.dto.report.ReportGroupBy;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

// Claves y etiquetas de los períodos del reporte de ventas.
public final class ReportPeriodCalculator {

    private static final DateTimeFormatter DAY_LABEL = DateTimeFormatter.ofPattern("dd/MM");
    private static final DateTimeFormatter MONTH_LABEL = DateTimeFormatter.ofPattern("MM/yyyy");

    private ReportPeriodCalculator() {
    }

    public static String key(LocalDate date, ReportGroupBy groupBy) {

        return groupBy == ReportGroupBy.MONTH
                ? YearMonth.from(date).toString()
                : date.toString();
    }

    // Períodos completos del rango, en orden, para incluir tramos sin ventas.
    public static List<String> keys(LocalDate from, LocalDate to, ReportGroupBy groupBy) {

        Set<String> keys = new LinkedHashSet<>();

        if (groupBy == ReportGroupBy.MONTH) {

            YearMonth end = YearMonth.from(to);

            for (YearMonth current = YearMonth.from(from);
                 !current.isAfter(end);
                 current = current.plusMonths(1)) {

                keys.add(current.toString());
            }

            return List.copyOf(keys);
        }

        for (LocalDate current = from; !current.isAfter(to); current = current.plusDays(1)) {
            keys.add(current.toString());
        }

        return new ArrayList<>(keys);
    }

    public static String label(String key, ReportGroupBy groupBy) {

        if (groupBy == ReportGroupBy.MONTH) {
            return MONTH_LABEL.format(YearMonth.parse(key));
        }

        return DAY_LABEL.format(LocalDate.parse(key));
    }
}
