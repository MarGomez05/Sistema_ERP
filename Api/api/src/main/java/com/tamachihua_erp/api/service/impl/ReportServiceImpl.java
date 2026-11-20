package com.tamachihua_erp.api.service.impl;

import com.tamachihua_erp.api.dto.report.ReceivableBucketDto;
import com.tamachihua_erp.api.dto.report.ReceivableInvoiceDto;
import com.tamachihua_erp.api.dto.report.ReceivablesReportDto;
import com.tamachihua_erp.api.dto.report.ReportGroupBy;
import com.tamachihua_erp.api.dto.report.SalesPeriodDto;
import com.tamachihua_erp.api.dto.report.SalesReportDto;
import com.tamachihua_erp.api.dto.report.StockReportDto;
import com.tamachihua_erp.api.dto.report.StockReportRowDto;
import com.tamachihua_erp.api.dto.report.TopProductDto;
import com.tamachihua_erp.api.dto.report.TopProductsReportDto;
import com.tamachihua_erp.api.entity.Invoice;
import com.tamachihua_erp.api.exception.InvalidFieldException;
import com.tamachihua_erp.api.exception.ResourceNotFoundException;
import com.tamachihua_erp.api.repository.InvoiceRepository;
import com.tamachihua_erp.api.repository.ProductCategoryRepository;
import com.tamachihua_erp.api.repository.ProductPresentationRepository;
import com.tamachihua_erp.api.repository.SaleRepository;
import com.tamachihua_erp.api.repository.projection.SaleReportProjection;
import com.tamachihua_erp.api.repository.projection.StockReportProjection;
import com.tamachihua_erp.api.repository.projection.TopProductProjection;
import com.tamachihua_erp.api.service.ReportService;
import com.tamachihua_erp.api.util.ReceivableAging;
import com.tamachihua_erp.api.util.ReportPeriodCalculator;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportServiceImpl implements ReportService {

    private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    private static final int TOP_PRODUCTS_MAX = 50;

    private final SaleRepository saleRepository;
    private final InvoiceRepository invoiceRepository;
    private final ProductPresentationRepository productPresentationRepository;
    private final ProductCategoryRepository productCategoryRepository;

    @Override
    public SalesReportDto findSales(LocalDate from, LocalDate to, ReportGroupBy groupBy) {

        DateRange range = normalizeRange(from, to);
        ReportGroupBy grouping = groupBy == null ? ReportGroupBy.DAY : groupBy;

        List<SaleReportProjection> rows = saleRepository.findConfirmedForReport(
                range.from().atStartOfDay(),
                range.to().plusDays(1).atStartOfDay()
        );

        Map<String, PeriodTotal> periods = new LinkedHashMap<>();

        for (String key : ReportPeriodCalculator.keys(range.from(), range.to(), grouping)) {
            periods.put(key, new PeriodTotal());
        }

        long salesCount = 0;
        BigDecimal subtotal = ZERO;
        BigDecimal discountTotal = ZERO;
        BigDecimal taxTotal = ZERO;
        BigDecimal total = ZERO;

        for (SaleReportProjection row : rows) {

            salesCount++;
            subtotal = subtotal.add(money(row.getSubtotal()));
            discountTotal = discountTotal.add(money(row.getDiscountTotal()));
            taxTotal = taxTotal.add(money(row.getTaxTotal()));
            total = total.add(money(row.getTotal()));

            String key = ReportPeriodCalculator.key(row.getSaleDate().toLocalDate(), grouping);

            periods.computeIfAbsent(key, ignored -> new PeriodTotal())
                    .add(row.getTotal());
        }

        List<SalesPeriodDto> series = periods.entrySet()
                .stream()
                .map(entry -> new SalesPeriodDto(
                        entry.getKey(),
                        ReportPeriodCalculator.label(entry.getKey(), grouping),
                        entry.getValue().count,
                        money(entry.getValue().total)
                ))
                .toList();

        return new SalesReportDto(
                range.from(),
                range.to(),
                grouping.name(),
                salesCount,
                money(subtotal),
                money(discountTotal),
                money(taxTotal),
                money(total),
                series
        );
    }

    @Override
    public ReceivablesReportDto findReceivables(LocalDate asOf) {

        LocalDate date = asOf == null ? LocalDate.now() : asOf;

        List<Invoice> invoices = invoiceRepository.findReceivables(date);

        Map<String, BucketTotal> buckets = new LinkedHashMap<>();

        for (String key : ReceivableAging.buckets()) {
            buckets.put(key, new BucketTotal());
        }

        List<ReceivableInvoiceDto> rows = new ArrayList<>();
        Set<String> customers = new HashSet<>();

        BigDecimal totalOutstanding = ZERO;
        BigDecimal overdueOutstanding = ZERO;
        BigDecimal currentOutstanding = ZERO;

        for (Invoice invoice : invoices) {

            BigDecimal total = money(invoice.getTotal());
            BigDecimal paid = money(invoice.getPaidTotal());
            BigDecimal balance = money(total.subtract(paid));

            if (balance.signum() <= 0) {
                continue;
            }

            long daysOverdue = invoice.getDueDate() == null
                    ? 0L
                    : Math.max(0L, ChronoUnit.DAYS.between(invoice.getDueDate(), date));

            String bucket = ReceivableAging.bucket(daysOverdue);

            buckets.get(bucket).add(balance);

            totalOutstanding = totalOutstanding.add(balance);

            if (ReceivableAging.CURRENT.equals(bucket)) {
                currentOutstanding = currentOutstanding.add(balance);
            } else {
                overdueOutstanding = overdueOutstanding.add(balance);
            }

            String customerName = invoice.getCustomerName() == null
                    ? "Sin cliente"
                    : invoice.getCustomerName().trim();

            if (!customerName.isEmpty()) {
                customers.add(customerName);
            }

            rows.add(new ReceivableInvoiceDto(
                    invoice.getId(),
                    invoice.getInvoiceNumber(),
                    customerName,
                    invoice.getIssueDate(),
                    invoice.getDueDate(),
                    total,
                    paid,
                    balance,
                    daysOverdue,
                    bucket
            ));
        }

        rows.sort(
                Comparator.comparingLong(ReceivableInvoiceDto::daysOverdue)
                        .reversed()
                        .thenComparing(ReceivableInvoiceDto::balance, Comparator.reverseOrder())
        );

        List<ReceivableBucketDto> bucketRows = ReceivableAging.buckets()
                .stream()
                .map(key -> new ReceivableBucketDto(
                        key,
                        ReceivableAging.label(key),
                        buckets.get(key).count,
                        money(buckets.get(key).amount)
                ))
                .toList();

        return new ReceivablesReportDto(
                date,
                money(totalOutstanding),
                money(overdueOutstanding),
                money(currentOutstanding),
                rows.size(),
                customers.size(),
                bucketRows,
                rows
        );
    }

    @Override
    public TopProductsReportDto findTopProducts(LocalDate from, LocalDate to, int limit) {

        DateRange range = normalizeRange(from, to);
        int safeLimit = Math.min(Math.max(limit, 1), TOP_PRODUCTS_MAX);

        List<TopProductDto> products = saleRepository.findTopProducts(
                        range.from().atStartOfDay(),
                        range.to().plusDays(1).atStartOfDay(),
                        safeLimit
                )
                .stream()
                .map(this::toTopProduct)
                .toList();

        return new TopProductsReportDto(range.from(), range.to(), products);
    }

    @Override
    public StockReportDto findStock(Long categoryId) {

        LocalDate today = LocalDate.now();
        String categoryName = "Todas las categorías";

        if (categoryId != null) {
            categoryName = productCategoryRepository.findById(categoryId)
                    .map(category -> category.getName())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "No se encontró la categoría con ID: " + categoryId
                    ));
        }

        List<StockReportRowDto> rows = new ArrayList<>(
                productPresentationRepository.findStockReport(categoryId, today)
                        .stream()
                        .map(this::toStockRow)
                        .toList()
        );

        rows.sort(
                Comparator.comparing(StockReportRowDto::lowStock)
                        .reversed()
                        .thenComparing(StockReportRowDto::productName)
                        .thenComparing(StockReportRowDto::presentationName)
        );

        int lowStock = (int) rows.stream()
                .filter(StockReportRowDto::lowStock)
                .count();

        return new StockReportDto(
                today,
                categoryId,
                categoryName,
                rows.size(),
                lowStock,
                rows
        );
    }

    // ------------------------------------------------------------------
    // Mapeo y utilidades
    // ------------------------------------------------------------------

    private TopProductDto toTopProduct(TopProductProjection projection) {

        return new TopProductDto(
                projection.getProductId(),
                projection.getProductCode(),
                projection.getProductName(),
                quantity(projection.getQuantity()),
                money(projection.getTotal()),
                projection.getSalesCount() == null ? 0L : projection.getSalesCount()
        );
    }

    private StockReportRowDto toStockRow(StockReportProjection projection) {

        BigDecimal physical = quantity(projection.getPhysicalStock());
        BigDecimal sellable = quantity(projection.getSellableStock());
        BigDecimal minimum = quantity(projection.getMinStock());

        return new StockReportRowDto(
                projection.getProductPresentationId(),
                projection.getProductCode(),
                projection.getProductName(),
                projection.getPresentationName(),
                physical,
                sellable,
                minimum,
                projection.getCurrentPrice() == null
                        ? null
                        : money(projection.getCurrentPrice()),
                sellable.compareTo(minimum) <= 0
        );
    }

    private DateRange normalizeRange(LocalDate from, LocalDate to) {

        LocalDate today = LocalDate.now();
        LocalDate start = from == null ? today.withDayOfMonth(1) : from;
        LocalDate end = to == null ? today : to;

        if (start.isAfter(end)) {
            throw new InvalidFieldException(
                    "from",
                    "La fecha inicial no puede ser posterior a la final"
            );
        }

        return new DateRange(start, end);
    }

    private static BigDecimal money(BigDecimal value) {

        return value == null
                ? ZERO
                : value.setScale(2, RoundingMode.HALF_UP);
    }

    private static BigDecimal quantity(BigDecimal value) {

        return value == null
                ? BigDecimal.ZERO
                : value.setScale(2, RoundingMode.HALF_UP);
    }

    private record DateRange(LocalDate from, LocalDate to) {
    }

    private static final class PeriodTotal {

        private long count;
        private BigDecimal total = ZERO;

        private void add(BigDecimal amount) {
            count++;
            total = total.add(money(amount));
        }
    }

    private static final class BucketTotal {

        private long count;
        private BigDecimal amount = ZERO;

        private void add(BigDecimal value) {
            count++;
            amount = amount.add(value);
        }
    }
}
