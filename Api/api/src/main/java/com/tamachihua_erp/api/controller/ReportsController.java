package com.tamachihua_erp.api.controller;

import com.tamachihua_erp.api.dto.report.ReceivablesReportDto;
import com.tamachihua_erp.api.dto.report.ReportGroupBy;
import com.tamachihua_erp.api.dto.report.SalesReportDto;
import com.tamachihua_erp.api.dto.report.StockReportDto;
import com.tamachihua_erp.api.dto.report.TopProductsReportDto;

import com.tamachihua_erp.api.exception.InvalidFieldException;
import com.tamachihua_erp.api.service.ReportExportService;
import com.tamachihua_erp.api.service.ReportService;

import lombok.RequiredArgsConstructor;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.Locale;

// Reportes comerciales y de inventario (contrato §9, fase 8).
@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportsController {

    private final ReportService service;
    private final ReportExportService exportService;

    // GET: ventas confirmadas por período.
    @GetMapping("/sales")
    public ResponseEntity<SalesReportDto> findSales(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,

            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,

            @RequestParam(required = false, defaultValue = "DAY") String groupBy
    ) {
        return ResponseEntity.ok(
                service.findSales(from, to, ReportGroupBy.from(groupBy))
        );
    }

    // GET: cuentas por cobrar al corte indicado.
    @GetMapping("/receivables")
    public ResponseEntity<ReceivablesReportDto> findReceivables(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate asOf
    ) {
        return ResponseEntity.ok(service.findReceivables(asOf));
    }

    // GET: productos más vendidos en el rango.
    @GetMapping("/top-products")
    public ResponseEntity<TopProductsReportDto> findTopProducts(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,

            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,

            @RequestParam(required = false, defaultValue = "10") int limit
    ) {
        return ResponseEntity.ok(service.findTopProducts(from, to, limit));
    }

    // GET: existencias por presentación activa.
    @GetMapping("/stock")
    public ResponseEntity<StockReportDto> findStock(
            @RequestParam(required = false) Long categoryId
    ) {
        return ResponseEntity.ok(service.findStock(categoryId));
    }

    // GET: exportación de existencias en PDF o XLSX.
    @GetMapping("/stock/export")
    public ResponseEntity<byte[]> exportStock(
            @RequestParam(required = false, defaultValue = "PDF") String format,
            @RequestParam(required = false) Long categoryId
    ) {
        String normalized = format == null
                ? "PDF"
                : format.trim().toUpperCase(Locale.ROOT);

        if (!"PDF".equals(normalized) && !"XLSX".equals(normalized)) {
            throw new InvalidFieldException(
                    "format",
                    "El formato de exportación debe ser PDF o XLSX"
            );
        }

        StockReportDto report = service.findStock(categoryId);

        boolean pdf = "PDF".equals(normalized);

        byte[] content = pdf
                ? exportService.stockPdf(report)
                : exportService.stockXlsx(report);

        String filename = "existencias-"
                + report.generatedAt()
                + (pdf ? ".pdf" : ".xlsx");

        ContentDisposition disposition = ContentDisposition.attachment()
                .filename(filename, StandardCharsets.UTF_8)
                .build();

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .contentType(
                        pdf
                                ? MediaType.APPLICATION_PDF
                                : MediaType.parseMediaType(
                                        "application/vnd.openxmlformats-officedocument"
                                                + ".spreadsheetml.sheet"
                                )
                )
                .contentLength(content.length)
                .body(content);
    }
}
