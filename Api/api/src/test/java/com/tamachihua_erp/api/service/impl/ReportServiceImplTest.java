package com.tamachihua_erp.api.service.impl;

import com.tamachihua_erp.api.dto.report.ReceivablesReportDto;
import com.tamachihua_erp.api.dto.report.ReportGroupBy;
import com.tamachihua_erp.api.dto.report.SalesPeriodDto;
import com.tamachihua_erp.api.dto.report.SalesReportDto;
import com.tamachihua_erp.api.dto.report.StockReportDto;
import com.tamachihua_erp.api.dto.report.StockReportRowDto;
import com.tamachihua_erp.api.dto.report.TopProductsReportDto;
import com.tamachihua_erp.api.entity.Invoice;
import com.tamachihua_erp.api.entity.ProductCategory;
import com.tamachihua_erp.api.exception.ResourceNotFoundException;
import com.tamachihua_erp.api.repository.InvoiceRepository;
import com.tamachihua_erp.api.repository.ProductCategoryRepository;
import com.tamachihua_erp.api.repository.ProductPresentationRepository;
import com.tamachihua_erp.api.repository.SaleRepository;
import com.tamachihua_erp.api.repository.projection.SaleReportProjection;
import com.tamachihua_erp.api.repository.projection.StockReportProjection;
import com.tamachihua_erp.api.repository.projection.TopProductProjection;
import com.tamachihua_erp.api.util.ReceivableAging;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReportServiceImplTest {

    @Mock
    private SaleRepository saleRepository;

    @Mock
    private InvoiceRepository invoiceRepository;

    @Mock
    private ProductPresentationRepository productPresentationRepository;

    @Mock
    private ProductCategoryRepository productCategoryRepository;

    private ReportServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new ReportServiceImpl(
                saleRepository,
                invoiceRepository,
                productPresentationRepository,
                productCategoryRepository
        );
    }

    @Test
    void agregaLasVentasPorDiaEIncluyeDiasSinMovimiento() {

        SaleReportProjection first = sale(
                LocalDateTime.of(2026, 11, 2, 10, 30),
                "100.00", "10.00", "13.00", "103.00"
        );
        SaleReportProjection second = sale(
                LocalDateTime.of(2026, 11, 2, 16, 0),
                "50.00", "0.00", "6.50", "56.50"
        );

        when(saleRepository.findConfirmedForReport(any(), any()))
                .thenReturn(List.of(first, second));

        SalesReportDto report = service.findSales(
                LocalDate.of(2026, 11, 1),
                LocalDate.of(2026, 11, 3),
                ReportGroupBy.DAY
        );

        assertThat(report.salesCount()).isEqualTo(2);
        assertThat(report.subtotal()).isEqualByComparingTo("150.00");
        assertThat(report.discountTotal()).isEqualByComparingTo("10.00");
        assertThat(report.taxTotal()).isEqualByComparingTo("19.50");
        assertThat(report.total()).isEqualByComparingTo("159.50");

        assertThat(report.series()).extracting(SalesPeriodDto::period)
                .containsExactly("2026-11-01", "2026-11-02", "2026-11-03");

        assertThat(report.series().get(1).salesCount()).isEqualTo(2);
        assertThat(report.series().get(1).total()).isEqualByComparingTo("159.50");
        assertThat(report.series().get(0).total()).isEqualByComparingTo("0.00");
    }

    @Test
    void agrupaLasVentasPorMes() {

        List<SaleReportProjection> rows = List.of(
                sale(LocalDateTime.of(2026, 10, 5, 9, 0),
                        "100.00", "0.00", "13.00", "113.00"),
                sale(LocalDateTime.of(2026, 11, 5, 9, 0),
                        "200.00", "0.00", "26.00", "226.00")
        );

        when(saleRepository.findConfirmedForReport(any(), any()))
                .thenReturn(rows);

        SalesReportDto report = service.findSales(
                LocalDate.of(2026, 10, 1),
                LocalDate.of(2026, 11, 30),
                ReportGroupBy.MONTH
        );

        assertThat(report.series()).extracting(SalesPeriodDto::period)
                .containsExactly("2026-10", "2026-11");

        assertThat(report.series()).extracting(SalesPeriodDto::label)
                .containsExactly("10/2026", "11/2026");
    }

    @Test
    void rechazaUnRangoInvertido() {

        assertThatThrownBy(() -> service.findSales(
                LocalDate.of(2026, 11, 10),
                LocalDate.of(2026, 11, 1),
                ReportGroupBy.DAY
        )).hasMessageContaining("no puede ser posterior");
    }

    @Test
    void clasificaLasCuentasPorCobrarYSumaSusTramos() {

        LocalDate asOf = LocalDate.of(2026, 11, 20);

        when(invoiceRepository.findReceivables(asOf)).thenReturn(List.of(
                invoice("FAC-1", "Ana Pérez", LocalDate.of(2026, 11, 25),
                        "100.00", "40.00"),
                invoice("FAC-2", "Ana Pérez", LocalDate.of(2026, 10, 1),
                        "200.00", "0.00"),
                invoice("FAC-3", "Luis Gómez", LocalDate.of(2026, 5, 1),
                        "50.00", "50.00")
        ));

        ReceivablesReportDto report = service.findReceivables(asOf);

        assertThat(report.invoiceCount()).isEqualTo(2);
        assertThat(report.customerCount()).isEqualTo(1);
        assertThat(report.totalOutstanding()).isEqualByComparingTo("260.00");
        assertThat(report.currentOutstanding()).isEqualByComparingTo("60.00");
        assertThat(report.overdueOutstanding()).isEqualByComparingTo("200.00");

        assertThat(report.buckets())
                .filteredOn(bucket -> ReceivableAging.CURRENT.equals(bucket.key()))
                .singleElement()
                .satisfies(bucket -> {
                    assertThat(bucket.amount()).isEqualByComparingTo("60.00");
                    assertThat(bucket.invoiceCount()).isEqualTo(1);
                });

        assertThat(report.buckets())
                .filteredOn(bucket -> ReceivableAging.D31_60.equals(bucket.key()))
                .singleElement()
                .satisfies(bucket -> assertThat(bucket.amount()).isEqualByComparingTo("200.00"));

        // Las facturas pagadas por completo no forman parte del reporte.
        assertThat(report.invoices()).extracting(item -> item.invoiceNumber())
                .containsExactly("FAC-2", "FAC-1");
    }

    @Test
    void calculaElReporteDeExistenciasYSuBajoStock() {

        List<StockReportProjection> stockRows = List.of(
                stock(1L, "P-001", "Harina", "Saco 100 lb",
                        "120.00", "120.00", "50.00", "18.50"),
                stock(2L, "P-002", "Azúcar", "Caja 25 lb",
                        "10.00", "0.00", "20.00", null)
        );

        when(productPresentationRepository.findStockReport(eq(null), any()))
                .thenReturn(stockRows);

        StockReportDto report = service.findStock(null);

        assertThat(report.categoryName()).isEqualTo("Todas las categorías");
        assertThat(report.totalPresentations()).isEqualTo(2);
        assertThat(report.lowStockPresentations()).isEqualTo(1);

        assertThat(report.rows()).extracting(StockReportRowDto::productCode)
                .containsExactly("P-002", "P-001");

        assertThat(report.rows().get(0).lowStock()).isTrue();
        assertThat(report.rows().get(0).currentPrice()).isNull();
        assertThat(report.rows().get(1).currentPrice()).isEqualByComparingTo("18.50");
    }

    @Test
    void rechazaUnaCategoriaInexistente() {

        when(productCategoryRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.findStock(99L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("99");
    }

    @Test
    void armaElRankingDeProductosMasVendidos() {

        List<TopProductProjection> ranking = List.of(
                topProduct(1L, "P-001", "Harina", "30.00", "555.00", 4L)
        );

        when(saleRepository.findTopProducts(any(), any(), anyInt()))
                .thenReturn(ranking);

        TopProductsReportDto report = service.findTopProducts(
                LocalDate.of(2026, 11, 1),
                LocalDate.of(2026, 11, 30),
                10
        );

        assertThat(report.products()).hasSize(1);
        assertThat(report.products().get(0).quantity()).isEqualByComparingTo("30.00");
        assertThat(report.products().get(0).total()).isEqualByComparingTo("555.00");
        assertThat(report.products().get(0).salesCount()).isEqualTo(4);
    }

    private static SaleReportProjection sale(
            LocalDateTime date,
            String subtotal,
            String discount,
            String tax,
            String total
    ) {
        SaleReportProjection projection = mock(SaleReportProjection.class);

        when(projection.getSaleDate()).thenReturn(date);
        when(projection.getSubtotal()).thenReturn(new BigDecimal(subtotal));
        when(projection.getDiscountTotal()).thenReturn(new BigDecimal(discount));
        when(projection.getTaxTotal()).thenReturn(new BigDecimal(tax));
        when(projection.getTotal()).thenReturn(new BigDecimal(total));

        return projection;
    }

    private static TopProductProjection topProduct(
            Long id,
            String code,
            String name,
            String quantity,
            String total,
            Long salesCount
    ) {
        TopProductProjection projection = mock(TopProductProjection.class);

        when(projection.getProductId()).thenReturn(id);
        when(projection.getProductCode()).thenReturn(code);
        when(projection.getProductName()).thenReturn(name);
        when(projection.getQuantity()).thenReturn(new BigDecimal(quantity));
        when(projection.getTotal()).thenReturn(new BigDecimal(total));
        when(projection.getSalesCount()).thenReturn(salesCount);

        return projection;
    }

    private static StockReportProjection stock(
            Long id,
            String code,
            String name,
            String presentation,
            String physical,
            String sellable,
            String minimum,
            String price
    ) {
        StockReportProjection projection = mock(StockReportProjection.class);

        when(projection.getProductPresentationId()).thenReturn(id);
        when(projection.getProductCode()).thenReturn(code);
        when(projection.getProductName()).thenReturn(name);
        when(projection.getPresentationName()).thenReturn(presentation);
        when(projection.getPhysicalStock()).thenReturn(new BigDecimal(physical));
        when(projection.getSellableStock()).thenReturn(new BigDecimal(sellable));
        when(projection.getMinStock()).thenReturn(new BigDecimal(minimum));
        when(projection.getCurrentPrice())
                .thenReturn(price == null ? null : new BigDecimal(price));

        return projection;
    }

    private static Invoice invoice(
            String number,
            String customer,
            LocalDate dueDate,
            String total,
            String paid
    ) {
        Invoice invoice = new Invoice();

        invoice.setInvoiceNumber(number);
        invoice.setCustomerName(customer);
        invoice.setIssueDate(dueDate.minusDays(30));
        invoice.setDueDate(dueDate);
        invoice.setTotal(new BigDecimal(total));
        invoice.setPaidTotal(new BigDecimal(paid));

        return invoice;
    }
}
