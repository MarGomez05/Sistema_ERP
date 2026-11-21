package com.tamachihua_erp.api.service.impl;

import com.tamachihua_erp.api.config.CompanyProperties;
import com.tamachihua_erp.api.dto.report.StockReportDto;
import com.tamachihua_erp.api.dto.report.StockReportRowDto;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ReportExportServiceImplTest {

    private ReportExportServiceImpl service;

    @BeforeEach
    void setUp() {

        CompanyProperties company = new CompanyProperties(
                "MARERP S.A. DE C.V.",
                "06852248-1",
                "123456-7",
                "Lourdes Colón, La Libertad",
                "2578-2910",
                "admin@elprogreso.example"
        );

        service = new ReportExportServiceImpl(company);
    }

    @Test
    void generaUnPdfConEncabezadoValido() {

        byte[] pdf = service.stockPdf(report());

        assertThat(pdf).isNotEmpty();
        assertThat(new String(pdf, 0, 5)).isEqualTo("%PDF-");
    }

    @Test
    void generaUnXlsxValido() {

        byte[] xlsx = service.stockXlsx(report());

        assertThat(xlsx).isNotEmpty();
        // Los archivos XLSX son contenedores ZIP.
        assertThat(xlsx[0]).isEqualTo((byte) 'P');
        assertThat(xlsx[1]).isEqualTo((byte) 'K');
    }

    @Test
    void generaArchivosAunqueNoHayaExistencias() {

        StockReportDto empty = new StockReportDto(
                LocalDate.of(2026, 11, 19),
                null,
                "Todas las categorías",
                0,
                0,
                List.of()
        );

        assertThat(service.stockPdf(empty)).isNotEmpty();
        assertThat(service.stockXlsx(empty)).isNotEmpty();
    }

    private static StockReportDto report() {

        return new StockReportDto(
                LocalDate.of(2026, 11, 19),
                3L,
                "Abarrotes",
                2,
                1,
                List.of(
                        new StockReportRowDto(
                                1L,
                                "P-001",
                                "Harina de maíz",
                                "Saco 100 lb",
                                new BigDecimal("120.00"),
                                new BigDecimal("120.00"),
                                new BigDecimal("50.00"),
                                new BigDecimal("18.50"),
                                false
                        ),
                        new StockReportRowDto(
                                2L,
                                "P-002",
                                "Azúcar",
                                "Caja 25 lb",
                                new BigDecimal("10.00"),
                                BigDecimal.ZERO,
                                new BigDecimal("20.00"),
                                null,
                                true
                        )
                )
        );
    }
}
