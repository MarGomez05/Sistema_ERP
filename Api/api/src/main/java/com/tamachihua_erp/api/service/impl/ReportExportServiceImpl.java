package com.tamachihua_erp.api.service.impl;

import com.tamachihua_erp.api.config.CompanyProperties;
import com.tamachihua_erp.api.dto.report.StockReportDto;
import com.tamachihua_erp.api.dto.report.StockReportRowDto;
import com.tamachihua_erp.api.service.ReportExportService;

import lombok.RequiredArgsConstructor;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDDocumentInformation;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;

import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

// Exportación del reporte de existencias en PDF y XLSX.
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportExportServiceImpl implements ReportExportService {

    private static final DateTimeFormatter DATE_FORMAT =
            DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final CompanyProperties company;

    @Override
    public byte[] stockPdf(StockReportDto report) {

        try (PDDocument document = new PDDocument()) {

            PdfWriter writer = new PdfWriter(document, company, report);

            writer.write();

            return writer.toBytes();
        } catch (IOException ex) {

            throw new IllegalStateException(
                    "No se pudo generar el PDF del reporte de existencias",
                    ex
            );
        }
    }

    @Override
    public byte[] stockXlsx(StockReportDto report) {

        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("Existencias");

            Styles styles = new Styles(workbook);

            writeExcelHeader(sheet, report, styles);
            writeExcelRows(sheet, report, styles);

            workbook.write(output);

            return output.toByteArray();
        } catch (IOException ex) {

            throw new IllegalStateException(
                    "No se pudo generar el archivo XLSX del reporte de existencias",
                    ex
            );
        }
    }

    // ------------------------------------------------------------------
    // Excel
    // ------------------------------------------------------------------

    private void writeExcelHeader(Sheet sheet, StockReportDto report, Styles styles) {

        Row title = sheet.createRow(0);
        cell(title, 0, "REPORTE DE EXISTENCIAS", styles.title);

        Row companyRow = sheet.createRow(1);
        cell(companyRow, 0, value(company.name()) + " · NIT " + value(company.nit()),
                styles.meta);

        Row generated = sheet.createRow(2);
        cell(generated, 0,
                "Generado: " + DATE_FORMAT.format(report.generatedAt())
                        + " · Filtro: " + report.categoryName(),
                styles.meta);

        Row summary = sheet.createRow(3);
        cell(summary, 0,
                report.totalPresentations() + " presentaciones · "
                        + report.lowStockPresentations() + " con bajo stock",
                styles.meta);

        Row header = sheet.createRow(5);

        String[] titles = {
                "Código",
                "Producto",
                "Presentación",
                "Existencia física",
                "Stock vendible",
                "Mínimo",
                "Precio vigente",
                "Estado"
        };

        for (int index = 0; index < titles.length; index++) {
            cell(header, index, titles[index], styles.header);
        }

        int[] widths = {16, 38, 26, 18, 16, 12, 16, 14};

        for (int index = 0; index < widths.length; index++) {
            sheet.setColumnWidth(index, widths[index] * 256);
        }

        sheet.setDefaultRowHeightInPoints(16);
    }

    private void writeExcelRows(Sheet sheet, StockReportDto report, Styles styles) {

        int rowIndex = 6;

        BigDecimal physicalTotal = BigDecimal.ZERO;
        BigDecimal sellableTotal = BigDecimal.ZERO;

        for (StockReportRowDto item : report.rows()) {

            Row row = sheet.createRow(rowIndex++);

            cell(row, 0, item.productCode(), styles.text);
            cell(row, 1, item.productName(), styles.text);
            cell(row, 2, item.presentationName(), styles.text);

            number(row, 3, item.physicalStock(), styles.quantity);
            number(row, 4, item.sellableStock(), styles.quantity);
            number(row, 5, item.minStock(), styles.quantity);

            if (item.currentPrice() == null) {
                cell(row, 6, "—", styles.text);
            } else {
                number(row, 6, item.currentPrice(), styles.money);
            }

            cell(row, 7, item.lowStock() ? "Bajo stock" : "Disponible",
                    item.lowStock() ? styles.danger : styles.success);

            physicalTotal = physicalTotal.add(item.physicalStock());
            sellableTotal = sellableTotal.add(item.sellableStock());
        }

        Row totals = sheet.createRow(rowIndex);

        cell(totals, 0, "Totales", styles.totalLabel);
        cell(totals, 3, quantity(physicalTotal), styles.totalNumber);
        cell(totals, 4, quantity(sellableTotal), styles.totalNumber);

        if (rowIndex > 6) {
            sheet.setAutoFilter(new CellRangeAddress(5, rowIndex - 1, 0, 7));
        }

        sheet.createFreezePane(0, 6);
    }

    private static void cell(Row row, int column, String value, CellStyle style) {

        Cell cell = row.createCell(column);

        cell.setCellValue(value == null ? "" : value);
        cell.setCellStyle(style);
    }

    private static void number(Row row, int column, BigDecimal value, CellStyle style) {

        Cell cell = row.createCell(column);

        cell.setCellValue(value == null ? 0d : value.doubleValue());
        cell.setCellStyle(style);
    }

    private static final class Styles {

        private final CellStyle title;
        private final CellStyle meta;
        private final CellStyle header;
        private final CellStyle text;
        private final CellStyle money;
        private final CellStyle quantity;
        private final CellStyle success;
        private final CellStyle danger;
        private final CellStyle totalLabel;
        private final CellStyle totalNumber;

        private Styles(Workbook workbook) {

            var titleFont = workbook.createFont();
            titleFont.setBold(true);
            titleFont.setFontHeightInPoints((short) 14);
            title = workbook.createCellStyle();
            title.setFont(titleFont);

            var metaFont = workbook.createFont();
            metaFont.setColor(IndexedColors.GREY_50_PERCENT.getIndex());
            metaFont.setFontHeightInPoints((short) 9);
            meta = workbook.createCellStyle();
            meta.setFont(metaFont);

            var headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            header = workbook.createCellStyle();
            header.setFont(headerFont);
            header.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
            header.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            header.setAlignment(HorizontalAlignment.LEFT);
            header.setBorderBottom(BorderStyle.THIN);

            text = workbook.createCellStyle();
            text.setBorderBottom(BorderStyle.HAIR);

            money = workbook.createCellStyle();
            money.setDataFormat(workbook.createDataFormat().getFormat("$#,##0.00"));
            money.setBorderBottom(BorderStyle.HAIR);
            money.setAlignment(HorizontalAlignment.RIGHT);

            quantity = workbook.createCellStyle();
            quantity.setDataFormat(workbook.createDataFormat().getFormat("#,##0.00"));
            quantity.setBorderBottom(BorderStyle.HAIR);
            quantity.setAlignment(HorizontalAlignment.RIGHT);

            var successFont = workbook.createFont();
            successFont.setColor(IndexedColors.GREEN.getIndex());
            success = workbook.createCellStyle();
            success.setFont(successFont);
            success.setBorderBottom(BorderStyle.HAIR);

            var dangerFont = workbook.createFont();
            dangerFont.setColor(IndexedColors.RED.getIndex());
            danger = workbook.createCellStyle();
            danger.setFont(dangerFont);
            danger.setBorderBottom(BorderStyle.HAIR);

            var totalFont = workbook.createFont();
            totalFont.setBold(true);
            totalLabel = workbook.createCellStyle();
            totalLabel.setFont(totalFont);
            totalLabel.setBorderTop(BorderStyle.THIN);

            totalNumber = workbook.createCellStyle();
            totalNumber.setFont(totalFont);
            totalNumber.setBorderTop(BorderStyle.THIN);
            totalNumber.setDataFormat(workbook.createDataFormat().getFormat("#,##0.00"));
            totalNumber.setAlignment(HorizontalAlignment.RIGHT);
        }
    }

    // ------------------------------------------------------------------
    // PDF
    // ------------------------------------------------------------------

    private static final class PdfWriter {

        private static final float PAGE_WIDTH = 842f;
        private static final float PAGE_HEIGHT = 595f;
        private static final float MARGIN = 36f;
        private static final float BOTTOM_LIMIT = 58f;
        private static final float ROW_HEIGHT = 17f;

        private static final float CODE_RIGHT = MARGIN + 70f;
        private static final float PRODUCT_RIGHT = CODE_RIGHT + 200f;
        private static final float PRESENTATION_RIGHT = PRODUCT_RIGHT + 130f;
        private static final float PHYSICAL_RIGHT = PRESENTATION_RIGHT + 75f;
        private static final float SELLABLE_RIGHT = PHYSICAL_RIGHT + 75f;
        private static final float MIN_RIGHT = SELLABLE_RIGHT + 65f;
        private static final float PRICE_RIGHT = MIN_RIGHT + 75f;
        private static final float STATUS_RIGHT = PAGE_WIDTH - MARGIN;

        private static final Rgb BRAND = new Rgb(0, 75, 135);
        private static final Rgb TEXT = new Rgb(33, 43, 54);
        private static final Rgb MUTED = new Rgb(100, 116, 132);
        private static final Rgb LIGHT = new Rgb(244, 247, 250);
        private static final Rgb BORDER = new Rgb(214, 222, 230);
        private static final Rgb WHITE = new Rgb(255, 255, 255);
        private static final Rgb SUCCESS = new Rgb(22, 101, 52);
        private static final Rgb DANGER = new Rgb(180, 38, 38);

        private final PDDocument document;
        private final CompanyProperties company;
        private final StockReportDto report;
        private final PDFont regular;
        private final PDFont bold;
        private final List<PDPage> pages = new ArrayList<>();

        private PDPageContentStream content;
        private float y;

        private PdfWriter(
                PDDocument document,
                CompanyProperties company,
                StockReportDto report
        ) {
            this.document = document;
            this.company = company;
            this.report = report;
            this.regular = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            this.bold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
        }

        private void write() throws IOException {

            PDDocumentInformation information = new PDDocumentInformation();

            information.setTitle("Reporte de existencias");
            information.setAuthor(value(company.name()));
            information.setCreator("TAMACHIHUA-ERP");

            document.setDocumentInformation(information);

            newPage();
            drawHeader();
            drawTableHeader();

            for (StockReportRowDto row : report.rows()) {

                if (y - ROW_HEIGHT < BOTTOM_LIMIT) {
                    newPage();
                    drawHeader();
                    drawTableHeader();
                }

                drawRow(row);
            }

            if (report.rows().isEmpty()) {
                color(content, MUTED);
                drawText(content, regular, 8.5f, MARGIN + 2, y - 12,
                        "No hay presentaciones activas para el filtro seleccionado.");
                y -= ROW_HEIGHT;
            }

            closeContent();
            drawFooters();
        }

        private byte[] toBytes() throws IOException {

            ByteArrayOutputStream output = new ByteArrayOutputStream();

            document.save(output);

            return output.toByteArray();
        }

        private void newPage() throws IOException {

            closeContent();

            PDPage page = new PDPage(new PDRectangle(PAGE_WIDTH, PAGE_HEIGHT));

            document.addPage(page);
            pages.add(page);

            content = new PDPageContentStream(document, page);

            y = PAGE_HEIGHT - MARGIN;
        }

        private void drawHeader() throws IOException {

            color(content, BRAND);
            drawText(content, bold, 14, MARGIN, PAGE_HEIGHT - 50, value(company.name()));

            color(content, MUTED);
            drawText(content, regular, 8, MARGIN, PAGE_HEIGHT - 64,
                    "NIT: " + value(company.nit()) + " · " + value(company.email()));

            color(content, BRAND);
            drawTextRight(content, bold, 12, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 50,
                    "REPORTE DE EXISTENCIAS");

            color(content, MUTED);
            drawTextRight(content, regular, 8, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 64,
                    "Generado: " + DATE_FORMAT.format(report.generatedAt()));

            drawTextRight(content, regular, 8, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 76,
                    "Filtro: " + report.categoryName());

            color(content, TEXT);
            drawText(content, bold, 9, MARGIN, PAGE_HEIGHT - 92,
                    report.totalPresentations() + " presentaciones · "
                            + report.lowStockPresentations() + " con bajo stock");

            drawLine(content, MARGIN, PAGE_HEIGHT - 100, PAGE_WIDTH - MARGIN,
                    PAGE_HEIGHT - 100, BORDER, 0.7f);

            y = PAGE_HEIGHT - 118;
        }

        private void drawTableHeader() throws IOException {

            fill(content, MARGIN - 4, y - 2, STATUS_RIGHT - MARGIN + 8, 18, BRAND);

            color(content, WHITE);
            drawText(content, bold, 7.6f, MARGIN, y + 4, "Código");
            drawText(content, bold, 7.6f, CODE_RIGHT, y + 4, "Producto");
            drawText(content, bold, 7.6f, PRODUCT_RIGHT, y + 4, "Presentación");
            drawTextRight(content, bold, 7.6f, PHYSICAL_RIGHT - 4, y + 4, "Física");
            drawTextRight(content, bold, 7.6f, SELLABLE_RIGHT - 4, y + 4, "Vendible");
            drawTextRight(content, bold, 7.6f, MIN_RIGHT - 4, y + 4, "Mínimo");
            drawTextRight(content, bold, 7.6f, PRICE_RIGHT - 4, y + 4, "Precio");
            drawTextRight(content, bold, 7.6f, STATUS_RIGHT - 4, y + 4, "Estado");

            y -= 20;
        }

        private void drawRow(StockReportRowDto row) throws IOException {

            color(content, TEXT);
            drawText(content, regular, 7.8f, MARGIN, y, fit(row.productCode(), regular, 7.8f, 64));
            drawText(content, regular, 7.8f, CODE_RIGHT,
                    y, fit(row.productName(), regular, 7.8f, 194));
            drawText(content, regular, 7.8f, PRODUCT_RIGHT,
                    y, fit(row.presentationName(), regular, 7.8f, 124));

            drawTextRight(content, regular, 7.8f, PHYSICAL_RIGHT - 4, y,
                    quantity(row.physicalStock()));
            drawTextRight(content, regular, 7.8f, SELLABLE_RIGHT - 4, y,
                    quantity(row.sellableStock()));
            drawTextRight(content, regular, 7.8f, MIN_RIGHT - 4, y,
                    quantity(row.minStock()));

            drawTextRight(
                    content,
                    regular,
                    7.8f,
                    PRICE_RIGHT - 4,
                    y,
                    row.currentPrice() == null ? "—" : money(row.currentPrice())
            );

            color(content, row.lowStock() ? DANGER : SUCCESS);
            drawTextRight(
                    content,
                    bold,
                    7.8f,
                    STATUS_RIGHT - 4,
                    y,
                    row.lowStock() ? "Bajo stock" : "Disponible"
            );

            drawLine(content, MARGIN, y - 5, STATUS_RIGHT, y - 5, BORDER, 0.35f);

            y -= ROW_HEIGHT;
        }

        private void drawFooters() throws IOException {

            int total = pages.size();

            for (int index = 0; index < total; index++) {

                try (PDPageContentStream footer = new PDPageContentStream(
                        document,
                        pages.get(index),
                        PDPageContentStream.AppendMode.APPEND,
                        true,
                        true
                )) {

                    drawLine(footer, MARGIN, 40, PAGE_WIDTH - MARGIN, 40, BORDER, 0.6f);

                    color(footer, MUTED);
                    drawText(footer, regular, 6.8f, MARGIN, 28,
                            value(company.name()) + " · NIT " + value(company.nit()));

                    drawTextRight(footer, regular, 6.8f, PAGE_WIDTH - MARGIN, 28,
                            "Página " + (index + 1) + " de " + total);
                }
            }
        }

        private void closeContent() throws IOException {

            if (content != null) {
                content.close();
                content = null;
            }
        }

        private void drawText(
                PDPageContentStream stream,
                PDFont font,
                float size,
                float x,
                float baseline,
                String value
        ) throws IOException {

            stream.beginText();
            stream.setFont(font, size);
            stream.newLineAtOffset(x, baseline);
            stream.showText(sanitize(value));
            stream.endText();
        }

        private void drawTextRight(
                PDPageContentStream stream,
                PDFont font,
                float size,
                float right,
                float baseline,
                String value
        ) throws IOException {

            String safe = sanitize(value);
            float width = font.getStringWidth(safe) / 1000f * size;

            drawText(stream, font, size, right - width, baseline, safe);
        }

        private void drawLine(
                PDPageContentStream stream,
                float x1,
                float y1,
                float x2,
                float y2,
                Rgb stroke,
                float width
        ) throws IOException {

            stream.setStrokingColor(
                    stroke.r() / 255f,
                    stroke.g() / 255f,
                    stroke.b() / 255f
            );
            stream.setLineWidth(width);
            stream.moveTo(x1, y1);
            stream.lineTo(x2, y2);
            stream.stroke();
        }

        private void fill(
                PDPageContentStream stream,
                float x,
                float y,
                float width,
                float height,
                Rgb fill
        ) throws IOException {

            stream.setNonStrokingColor(
                    fill.r() / 255f,
                    fill.g() / 255f,
                    fill.b() / 255f
            );
            stream.addRect(x, y, width, height);
            stream.fill();
        }

        private void color(PDPageContentStream stream, Rgb value) throws IOException {

            stream.setNonStrokingColor(
                    value.r() / 255f,
                    value.g() / 255f,
                    value.b() / 255f
            );
        }

        private String fit(String value, PDFont font, float size, float maxWidth)
                throws IOException {

            String text = sanitize(value);
            float width = font.getStringWidth(text) / 1000f * size;

            if (width <= maxWidth) {
                return text;
            }

            String suffix = "...";
            int length = text.length();

            while (length > 0) {

                String candidate = text.substring(0, length).stripTrailing() + suffix;

                if (font.getStringWidth(candidate) / 1000f * size <= maxWidth) {
                    return candidate;
                }

                length--;
            }

            return suffix;
        }

        private record Rgb(int r, int g, int b) {
        }
    }

    // ------------------------------------------------------------------
    // Formatos
    // ------------------------------------------------------------------

    private static String quantity(BigDecimal value) {

        if (value == null) {
            return "0.00";
        }

        return format(value, "#,##0.00");
    }

    private static String money(BigDecimal value) {

        return "$" + format(value, "#,##0.00");
    }

    private static String format(BigDecimal value, String pattern) {

        BigDecimal amount = value == null
                ? BigDecimal.ZERO
                : value.setScale(2, RoundingMode.HALF_UP);

        DecimalFormat format = new DecimalFormat(
                pattern,
                DecimalFormatSymbols.getInstance(Locale.US)
        );

        return format.format(amount);
    }

    private static String value(String value) {

        return value == null || value.isBlank() ? "No registrado" : value;
    }

    private static String sanitize(String value) {

        if (value == null || value.isBlank()) {
            return "-";
        }

        StringBuilder safe = new StringBuilder(value.length());

        for (char character : value.toCharArray()) {

            if (character == '\n' || character == '\r' || character == '\t') {
                safe.append(' ');
            } else if (character < 256) {
                safe.append(character);
            } else {
                safe.append('?');
            }
        }

        return safe.toString();
    }
}
