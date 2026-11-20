package com.tamachihua_erp.api.service;

import com.tamachihua_erp.api.dto.report.StockReportDto;

// Genera los archivos exportables de los reportes.
public interface ReportExportService {

    byte[] stockPdf(StockReportDto report);

    byte[] stockXlsx(StockReportDto report);
}
