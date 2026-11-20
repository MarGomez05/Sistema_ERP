package com.tamachihua_erp.api.util;

import com.tamachihua_erp.api.dto.report.ReportGroupBy;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ReportPeriodCalculatorTest {

    @Test
    void generaTodosLosDiasDelRango() {

        List<String> keys = ReportPeriodCalculator.keys(
                LocalDate.of(2026, 11, 1),
                LocalDate.of(2026, 11, 4),
                ReportGroupBy.DAY
        );

        assertThat(keys).containsExactly(
                "2026-11-01",
                "2026-11-02",
                "2026-11-03",
                "2026-11-04"
        );
    }

    @Test
    void generaTodosLosMesesDelRango() {

        List<String> keys = ReportPeriodCalculator.keys(
                LocalDate.of(2026, 10, 15),
                LocalDate.of(2026, 12, 2),
                ReportGroupBy.MONTH
        );

        assertThat(keys).containsExactly("2026-10", "2026-11", "2026-12");
    }

    @Test
    void construyeEtiquetasLegibles() {

        assertThat(ReportPeriodCalculator.label("2026-11-04", ReportGroupBy.DAY))
                .isEqualTo("04/11");

        assertThat(ReportPeriodCalculator.label("2026-11", ReportGroupBy.MONTH))
                .isEqualTo("11/2026");
    }

    @Test
    void usaElDiaComoAgrupacionPorDefecto() {

        assertThat(ReportGroupBy.from(null)).isEqualTo(ReportGroupBy.DAY);
        assertThat(ReportGroupBy.from("month")).isEqualTo(ReportGroupBy.MONTH);
        assertThat(ReportGroupBy.from(" DAY ")).isEqualTo(ReportGroupBy.DAY);
    }
}
