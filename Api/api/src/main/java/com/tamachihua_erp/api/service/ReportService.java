package com.tamachihua_erp.api.service;

import com.tamachihua_erp.api.dto.report.ReceivablesReportDto;
import com.tamachihua_erp.api.dto.report.ReportGroupBy;
import com.tamachihua_erp.api.dto.report.SalesReportDto;
import com.tamachihua_erp.api.dto.report.StockReportDto;
import com.tamachihua_erp.api.dto.report.TopProductsReportDto;

import java.time.LocalDate;

// Reportes comerciales y de inventario (fase 8).
public interface ReportService {

    SalesReportDto findSales(LocalDate from, LocalDate to, ReportGroupBy groupBy);

    ReceivablesReportDto findReceivables(LocalDate asOf);

    TopProductsReportDto findTopProducts(LocalDate from, LocalDate to, int limit);

    StockReportDto findStock(Long categoryId);
}
