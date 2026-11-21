package com.tamachihua_erp.api.service.impl;

import com.tamachihua_erp.api.config.CompanyProperties;
import com.tamachihua_erp.api.dto.billing.InvoiceDetailResponseDto;
import com.tamachihua_erp.api.dto.billing.InvoiceResponseDto;
import com.tamachihua_erp.api.service.InvoicePdfService;

import lombok.RequiredArgsConstructor;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDDocumentInformation;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

// PDF de factura con encabezado de la empresa y snapshot fiscal del cliente.
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InvoicePdfServiceImpl implements InvoicePdfService {

    private static final DateTimeFormatter DATE_FORMAT =
            DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private static final DateTimeFormatter DATE_TIME_FORMAT =
            DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    private final CompanyProperties company;

    @Override
    public byte[] render(InvoiceResponseDto invoice) {

        try (PDDocument document = new PDDocument()) {

            PdfWriter writer = new PdfWriter(document, company, invoice);

            writer.write();

            return writer.toBytes();
        } catch (IOException ex) {

            throw new IllegalStateException(
                    "No se pudo generar el PDF de la factura "
                            + invoice.invoiceNumber(),
                    ex
            );
        }
    }

    // ------------------------------------------------------------------
    // Composición del documento
    // ------------------------------------------------------------------

    private static final class PdfWriter {

        private static final float PAGE_WIDTH = PDRectangle.A4.getWidth();
        private static final float PAGE_HEIGHT = PDRectangle.A4.getHeight();
        private static final float MARGIN = 42f;
        private static final float CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2);
        private static final float BOTTOM_LIMIT = 78f;

        private static final Rgb BRAND = new Rgb(0, 75, 135);
        private static final Rgb TEXT = new Rgb(33, 43, 54);
        private static final Rgb MUTED = new Rgb(100, 116, 132);
        private static final Rgb LIGHT = new Rgb(247, 247, 250);
        private static final Rgb BORDER = new Rgb(242, 252, 255);
        private static final Rgb WHITE = new Rgb(255, 255, 255);
        private static final Rgb SUCCESS = new Rgb(22, 101, 52);
        private static final Rgb DANGER = new Rgb(180, 38, 38);

        private static final float[] COLUMN_RIGHT = {
                MARGIN + 205f,
                MARGIN + 245f,
                MARGIN + 315f,
                MARGIN + 375f,
                MARGIN + 435f,
                MARGIN + 511f
        };

        private static final float ROW_HEIGHT = 28f;

        private final PDDocument document;
        private final CompanyProperties company;
        private final InvoiceResponseDto invoice;
        private final PDFont regular;
        private final PDFont bold;
        private final List<PDPage> pages = new ArrayList<>();

        private PDPageContentStream content;
        private float y;

        private PdfWriter(
                PDDocument document,
                CompanyProperties company,
                InvoiceResponseDto invoice
        ) {
            this.document = document;
            this.company = company;
            this.invoice = invoice;
            this.regular = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            this.bold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
        }

        private void write() throws IOException {

            document.setDocumentInformation(documentInformation());

            newFirstPage();
            drawFirstPageHeader();
            drawCustomerBox();
            drawTableTitle();
            drawTableHeader();

            List<InvoiceDetailResponseDto> details = invoice.details() == null
                    ? List.of()
                    : invoice.details();

            if (details.isEmpty()) {

                drawEmptyLines();
            } else {

                for (int index = 0; index < details.size(); index++) {

                    if (y - ROW_HEIGHT < BOTTOM_LIMIT) {
                        newPage(true);
                    }

                    drawDetailRow(details.get(index), index);
                }
            }

            drawTableClose();
            drawSummary();

            closeContent();
            drawFooters();
        }

        private byte[] toBytes() throws IOException {

            ByteArrayOutputStream output = new ByteArrayOutputStream();

            document.save(output);

            return output.toByteArray();
        }

        private PDDocumentInformation documentInformation() {

            PDDocumentInformation information = new PDDocumentInformation();

            information.setTitle(documentTitle() + " " + invoice.invoiceNumber());
            information.setAuthor(company.name());
            information.setSubject("Documento de facturación");
            information.setCreator("TAMACHIHUA-ERP");

            return information;
        }

        // ------------------------------------------------------------------
        // Páginas y encabezados
        // ------------------------------------------------------------------

        private void newFirstPage() throws IOException {

            PDPage page = new PDPage(PDRectangle.A4);

            document.addPage(page);
            pages.add(page);

            content = new PDPageContentStream(document, page);


            y = PAGE_HEIGHT - MARGIN;
        }

        private void newPage(boolean withTableHeader) throws IOException {

            closeContent();

            PDPage page = new PDPage(PDRectangle.A4);

            document.addPage(page);
            pages.add(page);

            content = new PDPageContentStream(document, page);


            color(content, BRAND);
            drawText(content, bold, 10.5f, MARGIN, PAGE_HEIGHT - 54, company.name());

            color(content, MUTED);
            drawTextRight(
                    content,
                    regular,
                    8.5f,
                    PAGE_WIDTH - MARGIN,
                    PAGE_HEIGHT - 54,
                    invoice.invoiceNumber() + " · continuación"
            );

            drawLine(content, MARGIN, PAGE_HEIGHT - 64, PAGE_WIDTH - MARGIN,
                    PAGE_HEIGHT - 64, BORDER, 0.7f);

            y = PAGE_HEIGHT - 86;

            if (withTableHeader) {
                drawTableHeader();
            }
        }


        private void drawFirstPageHeader() throws IOException {

            float textY = PAGE_HEIGHT - 58;

            color(content, BRAND);
            drawText(content, bold, 16, MARGIN, textY, company.name());

            textY -= 14;

            color(content, MUTED);
            drawText(content, regular, 8.5f, MARGIN, textY,
                    "NIT: " + value(company.nit()) + "    NRC: " + value(company.nrc()));

            textY -= 11;

            drawText(content, regular, 8.5f, MARGIN, textY, company.address());

            textY -= 11;

            drawText(content, regular, 8.5f, MARGIN, textY,
                    value(company.phone()) + " · " + value(company.email()));

            float boxX = PAGE_WIDTH - MARGIN - 233f;
            float boxTop = PAGE_HEIGHT - 44f;
            float boxHeight = 74f;

            fillAndStroke(
                    content,
                    boxX,
                    boxTop - boxHeight,
                    233f,
                    boxHeight,
                    LIGHT,
                    BORDER
            );

            float innerRight = boxX + 233f - 10f;

            color(content, BRAND);
            drawTextRight(
                    content,
                    bold,
                    documentTitle().length() > 24 ? 9.2f : 11.2f,
                    innerRight,
                    boxTop - 17,
                    documentTitle()
            );

            color(content, TEXT);
            drawTextRight(content, bold, 10, innerRight, boxTop - 32,
                    invoice.invoiceNumber());

            color(content, MUTED);
            drawTextRight(
                    content,
                    regular,
                    8,
                    innerRight,
                    boxTop - 44,
                    "Control: " + value(invoice.controlNumber())
            );

            drawTextRight(
                    content,
                    regular,
                    8,
                    innerRight,
                    boxTop - 55,
                    "Emisión: " + formatDate(invoice.issueDate())
            );

            color(content, statusColor());
            drawTextRight(
                    content,
                    bold,
                    8,
                    innerRight,
                    boxTop - 67,
                    statusLabel() + " · " + conditionLabel()
            );

            y = boxTop - boxHeight - 20;
        }

        private void drawCustomerBox() throws IOException {

            float boxHeight = 64f;

            fillAndStroke(
                    content,
                    MARGIN,
                    y - boxHeight,
                    CONTENT_WIDTH,
                    boxHeight,
                    LIGHT,
                    BORDER
            );

            color(content, MUTED);
            drawText(content, bold, 7.2f, MARGIN + 10, y - 14, "CLIENTE");

            color(content, TEXT);
            drawText(
                    content,
                    bold,
                    10,
                    MARGIN + 10,
                    y - 29,
                    fit(invoice.customerName(), bold, 10, 300)
            );

            color(content, MUTED);
            drawText(
                    content,
                    regular,
                    8.2f,
                    MARGIN + 10,
                    y - 42,
                    fit(customerTaxLine(), regular, 8.2f, 330)
            );

            drawText(
                    content,
                    regular,
                    8.2f,
                    MARGIN + 10,
                    y - 54,
                    fit("Dirección: " + value(invoice.customerAddress()), regular, 8.2f, 330)
            );

            drawTextRight(
                    content,
                    regular,
                    8.2f,
                    PAGE_WIDTH - MARGIN - 10,
                    y - 42,
                    fit(value(invoice.customerEmail()), regular, 8.2f, 150)
            );

            y -= boxHeight + 20;
        }

        private void drawTableTitle() throws IOException {

            color(content, BRAND);
            drawText(content, bold, 9, MARGIN, y, "DETALLE DE LA FACTURA");

            y -= 15;
        }

        private void drawTableHeader() throws IOException {

            fill(content, MARGIN, y - 20, CONTENT_WIDTH, 20, BRAND);

            color(content, WHITE);
            drawText(content, bold, 7.8f, MARGIN + 6, y - 13, "Descripción");
            drawTextRight(content, bold, 7.8f, COLUMN_RIGHT[0] - 4, y - 13, "Cant.");
            drawTextRight(content, bold, 7.8f, COLUMN_RIGHT[1] - 4, y - 13, "Precio");
            drawTextRight(content, bold, 7.8f, COLUMN_RIGHT[2] - 4, y - 13, "Descuento");
            drawTextRight(content, bold, 7.8f, COLUMN_RIGHT[3] - 4, y - 13, "IVA");
            drawTextRight(content, bold, 7.8f, COLUMN_RIGHT[4] - 6, y - 13, "Total");

            y -= 20;
        }

        private void drawDetailRow(InvoiceDetailResponseDto detail, int index)
                throws IOException {

            if (index % 2 == 1) {
                fill(content, MARGIN, y - ROW_HEIGHT, CONTENT_WIDTH, ROW_HEIGHT, LIGHT);
            }

            color(content, TEXT);
            drawText(
                    content,
                    bold,
                    8.2f,
                    MARGIN + 6,
                    y - 11,
                    fit(detail.productName(), bold, 8.2f, 190)
            );

            color(content, MUTED);
            drawText(
                    content,
                    regular,
                    7.2f,
                    MARGIN + 6,
                    y - 21,
                    fit(productMeta(detail), regular, 7.2f, 190)
            );

            color(content, TEXT);
            drawTextRight(content, regular, 8.2f, COLUMN_RIGHT[0] - 4, y - 17,
                    quantity(detail.quantity()));

            drawTextRight(content, regular, 8.2f, COLUMN_RIGHT[1] - 4, y - 17,
                    money(detail.unitPrice()));

            drawTextRight(content, regular, 8.2f, COLUMN_RIGHT[2] - 4, y - 17,
                    money(detail.discount()));

            drawTextRight(content, regular, 8.2f, COLUMN_RIGHT[3] - 4, y - 17,
                    money(detail.taxAmount()));

            drawTextRight(content, bold, 8.2f, COLUMN_RIGHT[4] - 6, y - 17,
                    money(detail.lineTotal()));

            drawLine(
                    content,
                    MARGIN,
                    y - ROW_HEIGHT,
                    PAGE_WIDTH - MARGIN,
                    y - ROW_HEIGHT,
                    BORDER,
                    0.4f
            );

            y -= ROW_HEIGHT;
        }

        private void drawEmptyLines() throws IOException {

            color(content, MUTED);
            drawText(content, regular, 8.5f, MARGIN + 6, y - 16,
                    "Este documento no tiene líneas registradas.");

            y -= ROW_HEIGHT;
        }

        private void drawTableClose() throws IOException {

            drawLine(
                    content,
                    MARGIN,
                    y,
                    PAGE_WIDTH - MARGIN,
                    y,
                    BRAND,
                    0.9f
            );

            y -= 18;
        }

        // ------------------------------------------------------------------
        // Resumen, notas y totales
        // ------------------------------------------------------------------

        private void drawSummary() throws IOException {

            if (y < 290) {
                newPage(false);
            }

            float leftWidth = 270f;
            float totalsX = PAGE_WIDTH - MARGIN - 223f;
            float totalsWidth = 223f;
            float notesTop = y;
            float notesBottom = drawNotes(notesTop, leftWidth);

            float totalsTop = notesTop;
            float totalsBottom = drawTotals(totalsTop, totalsX, totalsWidth);

            y = Math.min(notesBottom, totalsBottom) - 12;
        }

        private float drawNotes(float top, float width) throws IOException {

            float current = top;

            color(content, BRAND);
            drawText(content, bold, 8.2f, MARGIN, current, "OBSERVACIONES");

            current -= 13;

            color(content, TEXT);

            List<String> lines = wrap(
                    invoice.notes() == null || invoice.notes().isBlank()
                            ? "Sin observaciones registradas."
                            : invoice.notes(),
                    regular,
                    8f,
                    width
            );

            int printed = 0;

            for (String line : lines) {

                if (printed == 6) {
                    drawText(content, regular, 8f, MARGIN, current, "...");
                    current -= 11;
                    break;
                }

                drawText(content, regular, 8f, MARGIN, current, line);
                current -= 11;
                printed++;
            }

            if (invoice.relatedInvoiceNumber() != null) {

                current -= 4;

                color(content, MUTED);
                drawText(
                        content,
                        regular,
                        8f,
                        MARGIN,
                        current,
                        "Factura relacionada: " + invoice.relatedInvoiceNumber()
                );

                current -= 11;
            }

            if ("CANCELLED".equals(invoice.status())) {

                current -= 4;

                color(content, DANGER);
                drawText(content, bold, 8.2f, MARGIN, current, "DOCUMENTO CANCELADO");

                current -= 11;

                color(content, MUTED);
                drawText(
                        content,
                        regular,
                        8f,
                        MARGIN,
                        current,
                        "Fecha: " + formatDateTime(invoice.cancelledAt())
                );

                current -= 11;

                for (String line : wrap(
                        "Motivo: " + value(invoice.cancelReason()),
                        regular,
                        8f,
                        width
                )) {
                    drawText(content, regular, 8f, MARGIN, current, line);
                    current -= 11;
                }
            }

            return current;
        }

        private float drawTotals(float top, float x, float width) throws IOException {

            float current = top;

            drawAmountRow("Subtotal", invoice.subtotal(), current, x, width);
            current -= 16;

            drawAmountRow("Descuentos", invoice.discountTotal(), current, x, width);
            current -= 16;

            drawAmountRow("IVA", invoice.taxTotal(), current, x, width);
            current -= 20;

            fill(content, x, current - 7, width, 22, BRAND);

            color(content, WHITE);
            drawText(content, bold, 9, x + 9, current + 2, "TOTAL");

            drawTextRight(
                    content,
                    bold,
                    10,
                    x + width - 9,
                    current + 2,
                    money(invoice.total())
            );

            current -= 28;

            drawAmountRow("Pagado", invoice.paidTotal(), current, x, width);
            current -= 16;

            BigDecimal balance = invoice.balance() == null
                    ? BigDecimal.ZERO
                    : invoice.balance();

            color(content, balance.signum() > 0 ? DANGER : SUCCESS);
            drawText(content, bold, 8, x + 9, current, "Saldo pendiente");
            drawTextRight(content, bold, 8, x + width - 9, current, money(balance));
            current -= 16;

            return current;
        }

        private void drawAmountRow(
                String label,
                BigDecimal amount,
                float baseline,
                float x,
                float width
        ) throws IOException {

            color(content, MUTED);
            drawText(content, regular, 8, x + 9, baseline, label);

            color(content, TEXT);
            drawTextRight(content, bold, 8, x + width - 9, baseline, money(amount));
        }

        // ------------------------------------------------------------------
        // Pie de página
        // ------------------------------------------------------------------

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

                    drawLine(
                            footer,
                            MARGIN,
                            58,
                            PAGE_WIDTH - MARGIN,
                            58,
                            BORDER,
                            0.6f
                    );

                    color(footer, MUTED);
                    drawText(
                            footer,
                            regular,
                            7,
                            MARGIN,
                            44,
                            company.name() + " · NIT " + value(company.nit())
                                    + " · " + value(company.email())
                    );

                    drawTextRight(
                            footer,
                            regular,
                            7,
                            PAGE_WIDTH - MARGIN,
                            44,
                            "Página " + (index + 1) + " de " + total
                    );
                }
            }
        }

        // ------------------------------------------------------------------
        // Utilidades de dibujo
        // ------------------------------------------------------------------

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

            String safe = sanitize(value);

            stream.beginText();
            stream.setFont(font, size);
            stream.newLineAtOffset(x, baseline);
            stream.showText(safe);
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

        private void fillAndStroke(
                PDPageContentStream stream,
                float x,
                float y,
                float width,
                float height,
                Rgb fill,
                Rgb stroke
        ) throws IOException {

            stream.setNonStrokingColor(
                    fill.r() / 255f,
                    fill.g() / 255f,
                    fill.b() / 255f
            );
            stream.setStrokingColor(
                    stroke.r() / 255f,
                    stroke.g() / 255f,
                    stroke.b() / 255f
            );
            stream.setLineWidth(0.6f);
            stream.addRect(x, y, width, height);
            stream.fillAndStroke();
        }

        private void color(PDPageContentStream stream, Rgb value) throws IOException {

            stream.setNonStrokingColor(
                    value.r() / 255f,
                    value.g() / 255f,
                    value.b() / 255f
            );
        }

        // ------------------------------------------------------------------
        // Textos y formatos
        // ------------------------------------------------------------------

        private String documentTitle() {

            return switch (invoice.invoiceType()) {
                case "CCF" -> "COMPROBANTE DE CRÉDITO FISCAL";
                case "CREDIT_NOTE" -> "NOTA DE CRÉDITO";
                default -> "FACTURA DE CONSUMIDOR FINAL";
            };
        }

        private String statusLabel() {

            return switch (invoice.status()) {
                case "ISSUED" -> "Emitida";
                case "CANCELLED" -> "Anulada";
                case "DRAFT" -> "Borrador";
                default -> value(invoice.status());
            };
        }

        private Rgb statusColor() {

            return switch (invoice.status()) {
                case "CANCELLED" -> DANGER;
                case "ISSUED" -> SUCCESS;
                default -> MUTED;
            };
        }

        private String conditionLabel() {

            return "CREDIT".equals(invoice.paymentCondition()) ? "Crédito" : "Contado";
        }

        private String customerTaxLine() {

            List<String> parts = new ArrayList<>();

            boolean documentIsNit = "NIT".equalsIgnoreCase(invoice.customerDocumentType())
                    && invoice.customerDocumentNumber() != null;

            if (invoice.customerDocumentType() != null
                    || invoice.customerDocumentNumber() != null) {
                parts.add(
                        value(invoice.customerDocumentType())
                                + " " + value(invoice.customerDocumentNumber())
                );
            }

            boolean nitAlreadyPrinted = documentIsNit
                    && invoice.customerNit() != null
                    && invoice.customerNit().equals(invoice.customerDocumentNumber());

            if (invoice.customerNit() != null && !nitAlreadyPrinted) {
                parts.add("NIT: " + invoice.customerNit());
            }

            if (invoice.customerNrc() != null) {
                parts.add("NRC: " + invoice.customerNrc());
            }

            return parts.isEmpty() ? "Sin documento fiscal registrado" : String.join("    ", parts);
        }

        private String productMeta(InvoiceDetailResponseDto detail) {

            StringBuilder meta = new StringBuilder();

            if (detail.productCode() != null && !detail.productCode().isBlank()) {
                meta.append(detail.productCode());
            }

            if (detail.presentationName() != null && !detail.presentationName().isBlank()) {

                if (!meta.isEmpty()) {
                    meta.append(" · ");
                }

                meta.append(detail.presentationName());
            }

            return meta.isEmpty() ? "Sin presentación" : meta.toString();
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
                float candidateWidth = font.getStringWidth(candidate) / 1000f * size;

                if (candidateWidth <= maxWidth) {
                    return candidate;
                }

                length--;
            }

            return suffix;
        }

        private List<String> wrap(String value, PDFont font, float size, float maxWidth)
                throws IOException {

            String text = sanitize(value).replaceAll("\\s+", " ").trim();
            List<String> lines = new ArrayList<>();

            if (text.isEmpty()) {
                return lines;
            }

            StringBuilder current = new StringBuilder();

            for (String word : text.split(" ")) {

                String candidate = current.isEmpty()
                        ? word
                        : current + " " + word;

                if (font.getStringWidth(candidate) / 1000f * size <= maxWidth) {
                    current = new StringBuilder(candidate);
                    continue;
                }

                if (!current.isEmpty()) {
                    lines.add(current.toString());
                    current = new StringBuilder();
                }

                if (font.getStringWidth(word) / 1000f * size <= maxWidth) {
                    current = new StringBuilder(word);
                    continue;
                }

                StringBuilder chunk = new StringBuilder();

                for (char character : word.toCharArray()) {

                    String next = chunk.toString() + character;

                    if (font.getStringWidth(next) / 1000f * size > maxWidth
                            && !chunk.isEmpty()) {

                        lines.add(chunk.toString());
                        chunk = new StringBuilder();
                    }

                    chunk.append(character);
                }

                current = new StringBuilder(chunk);
            }

            if (!current.isEmpty()) {
                lines.add(current.toString());
            }

            return lines;
        }

        private static String quantity(BigDecimal value) {

            if (value == null) {
                return "-";
            }

            return value.stripTrailingZeros().toPlainString();
        }

        private static String money(BigDecimal value) {

            BigDecimal amount = value == null
                    ? BigDecimal.ZERO
                    : value.setScale(2, RoundingMode.HALF_UP);

            DecimalFormat format = new DecimalFormat(
                    "#,##0.00",
                    DecimalFormatSymbols.getInstance(Locale.US)
            );

            return "$" + format.format(amount);
        }

        private static String formatDate(LocalDate value) {

            return value == null ? "-" : DATE_FORMAT.format(value);
        }

        private static String formatDateTime(LocalDateTime value) {

            return value == null ? "-" : DATE_TIME_FORMAT.format(value);
        }

        private static String value(String value) {

            return value == null || value.isBlank() ? "No registrado" : value;
        }

        private static String sanitize(String value) {

            if (value == null || value.isBlank()) {
                return "-";
            }

            String normalized = value
                    .replace('\u00a0', ' ')
                    .replace('\u2013', '-')
                    .replace('\u2014', '-')
                    .replace('\u2018', '\'')
                    .replace('\u2019', '\'')
                    .replace('\u201c', '"')
                    .replace('\u201d', '"')
                    .replace('\u2026', '.')
                    .replace('\u2022', '-');

            StringBuilder safe = new StringBuilder(normalized.length());

            for (char character : normalized.toCharArray()) {

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

        private record Rgb(int r, int g, int b) {
        }
    }
}
