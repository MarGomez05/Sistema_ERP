package com.tamachihua_erp.api.service.impl;

import com.tamachihua_erp.api.dto.sale.SaleDetailRequestDto;
import com.tamachihua_erp.api.dto.sale.SaleRequestDto;
import com.tamachihua_erp.api.dto.sale.SaleResponseDto;
import com.tamachihua_erp.api.entity.Customer;
import com.tamachihua_erp.api.entity.Invoice;
import com.tamachihua_erp.api.entity.Presentation;
import com.tamachihua_erp.api.entity.Product;
import com.tamachihua_erp.api.entity.ProductLot;
import com.tamachihua_erp.api.entity.ProductPresentation;
import com.tamachihua_erp.api.entity.ProductPrice;
import com.tamachihua_erp.api.entity.Sale;
import com.tamachihua_erp.api.entity.SaleDetail;
import com.tamachihua_erp.api.entity.SaleLotAllocation;
import com.tamachihua_erp.api.entity.User;
import com.tamachihua_erp.api.exception.InsufficientStockException;
import com.tamachihua_erp.api.exception.ResourceConflictException;
import com.tamachihua_erp.api.mapper.SaleMapper;
import com.tamachihua_erp.api.repository.CustomerRepository;
import com.tamachihua_erp.api.repository.InvoiceRepository;
import com.tamachihua_erp.api.repository.ProductLotRepository;
import com.tamachihua_erp.api.repository.ProductPresentationRepository;
import com.tamachihua_erp.api.repository.ProductPriceRepository;
import com.tamachihua_erp.api.repository.SaleRepository;
import com.tamachihua_erp.api.repository.UserRepository;
import com.tamachihua_erp.api.service.DocumentSequenceService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import org.mockito.ArgumentMatchers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SaleServiceImplTest {

    @Mock
    private SaleRepository saleRepository;

    @Mock
    private InvoiceRepository invoiceRepository;

    @Mock
    private CustomerRepository customerRepository;

    @Mock
    private ProductPresentationRepository productPresentationRepository;

    @Mock
    private ProductPriceRepository productPriceRepository;

    @Mock
    private ProductLotRepository productLotRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private DocumentSequenceService documentSequenceService;

    private SaleServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new SaleServiceImpl(
                saleRepository,
                invoiceRepository,
                customerRepository,
                productPresentationRepository,
                productPriceRepository,
                productLotRepository,
                userRepository,
                documentSequenceService,
                new SaleMapper()
        );
    }

    @Test
    void creaLaVentaEnBorradorConTotalesCalculados() {

        ProductPresentation presentation =
                presentation(10L, "Clavo 2 pulgadas", "Caja", "13.00");

        when(productPresentationRepository.findDetailedById(10L))
                .thenReturn(Optional.of(presentation));

        ProductPrice price = new ProductPrice();
        price.setPrice(new BigDecimal("113.00"));

        when(productPriceRepository.findByProductPresentationIdAndEndDateIsNull(10L))
                .thenReturn(Optional.of(price));

        when(userRepository.getReferenceById(2L)).thenReturn(user(2L, "Juan Pérez"));

        when(documentSequenceService.nextNumber("SALE")).thenReturn("V-2026-000001");

        when(saleRepository.save(any(Sale.class))).thenAnswer(invocation -> {
            Sale sale = invocation.getArgument(0);
            sale.setId(99L);
            return sale;
        });

        SaleRequestDto dto = new SaleRequestDto(
                null,
                "CASH",
                "",
                "Venta de mostrador",
                List.of(new SaleDetailRequestDto(
                        10L,
                        new BigDecimal("1.00"),
                        BigDecimal.ZERO,
                        null
                ))
        );

        SaleResponseDto response = service.create(dto, 2L);

        assertThat(response.id()).isEqualTo(99L);
        assertThat(response.saleNumber()).isEqualTo("V-2026-000001");
        assertThat(response.status()).isEqualTo("DRAFT");
        assertThat(response.subtotal()).isEqualByComparingTo("100.00");
        assertThat(response.taxTotal()).isEqualByComparingTo("13.00");
        assertThat(response.total()).isEqualByComparingTo("113.00");
        assertThat(response.details()).hasSize(1);
        assertThat(response.details().get(0).lineTotal())
                .isEqualByComparingTo("113.00");
    }

    @Test
    void confirmaLaVentaAsignandoLotesEnOrdenFefo() {

        ProductPresentation presentation =
                presentation(10L, "Clavo 2 pulgadas", "Caja", "13.00");

        Sale sale = draftSale(presentation, new BigDecimal("5.00"));

        when(saleRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(sale));

        ProductLot firstLot = lot(50L, "2.00");
        ProductLot secondLot = lot(51L, "10.00");

        when(productLotRepository.findSellableLotsForUpdate(
                ArgumentMatchers.eq(10L),
                any(LocalDate.class)
        )).thenReturn(List.of(firstLot, secondLot));

        when(saleRepository.save(any(Sale.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        SaleResponseDto response = service.confirm(1L, 2L, true);

        assertThat(response.status()).isEqualTo("CONFIRMED");
        assertThat(firstLot.getAvailableQuantity()).isEqualByComparingTo("0.00");
        assertThat(secondLot.getAvailableQuantity()).isEqualByComparingTo("7.00");

        SaleDetail detail = sale.getDetails().get(0);

        assertThat(detail.getAllocations()).hasSize(2);
        assertThat(detail.getAllocations().get(0).getQuantity())
                .isEqualByComparingTo("2.00");
        assertThat(detail.getAllocations().get(1).getQuantity())
                .isEqualByComparingTo("3.00");
    }

    @Test
    void rechazaConfirmarSinStockVendible() {

        ProductPresentation presentation =
                presentation(10L, "Clavo 2 pulgadas", "Caja", "13.00");

        Sale sale = draftSale(presentation, new BigDecimal("5.00"));

        when(saleRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(sale));
        when(productLotRepository.findSellableLotsForUpdate(
                ArgumentMatchers.eq(10L),
                any(LocalDate.class)
        )).thenReturn(List.of(lot(50L, "1.00")));

        assertThatThrownBy(() -> service.confirm(1L, 2L, true))
                .isInstanceOf(InsufficientStockException.class)
                .hasMessageContaining("Stock insuficiente");
    }

    @Test
    void cancelaLaVentaConfirmadaYDevuelveElStock() {

        ProductPresentation presentation =
                presentation(10L, "Clavo 2 pulgadas", "Caja", "13.00");

        Sale sale = draftSale(presentation, new BigDecimal("2.00"));
        sale.setStatus("CONFIRMED");

        ProductLot allocatedLot = lot(50L, "3.00");

        SaleLotAllocation allocation = new SaleLotAllocation(
                allocatedLot,
                new BigDecimal("2.00"),
                new BigDecimal("10.00")
        );

        sale.getDetails().get(0).addAllocation(allocation);

        when(saleRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(sale));
        when(saleRepository.existsIssuedInvoiceBySaleId(1L)).thenReturn(false);
        when(productLotRepository.findByIdForUpdate(50L))
                .thenReturn(Optional.of(allocatedLot));
        when(userRepository.getReferenceById(9L)).thenReturn(user(9L, "María Rivas"));
        when(saleRepository.save(any(Sale.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        SaleResponseDto response = service.cancel(1L, "Cliente desistió", 9L);

        assertThat(response.status()).isEqualTo("CANCELLED");
        assertThat(response.cancelReason()).isEqualTo("Cliente desistió");
        assertThat(allocatedLot.getAvailableQuantity()).isEqualByComparingTo("5.00");
    }

    @Test
    void noCancelaUnaVentaConFacturaEmitida() {

        ProductPresentation presentation =
                presentation(10L, "Clavo 2 pulgadas", "Caja", "13.00");

        Sale sale = draftSale(presentation, new BigDecimal("2.00"));
        sale.setStatus("CONFIRMED");

        when(saleRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(sale));
        when(saleRepository.existsIssuedInvoiceBySaleId(1L)).thenReturn(true);

        assertThatThrownBy(() -> service.cancel(1L, null, 9L))
                .isInstanceOf(ResourceConflictException.class)
                .hasMessageContaining("nota de crédito");
    }

    @Test
    void rechazaConfirmarSiSuperaElLimiteDeCredito() {

        ProductPresentation presentation =
                presentation(10L, "Clavo 2 pulgadas", "Caja", "13.00");

        Sale sale = draftSale(presentation, new BigDecimal("1.00"));
        sale.setPaymentCondition("CREDIT");
        sale.setTotal(new BigDecimal("113.00"));

        Customer customer = customer(8L, "Agroservicio El Progreso, S.A.");
        customer.setCreditLimit(new BigDecimal("50.00"));
        customer.setCreditDays(30);

        sale.setCustomer(customer);

        when(saleRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(sale));
        when(customerRepository.sumOutstandingBalanceByCustomerId(8L))
                .thenReturn(new BigDecimal("10.00"));

        assertThatThrownBy(() -> service.confirm(1L, 2L, true))
                .isInstanceOf(ResourceConflictException.class)
                .hasMessageContaining("límite de crédito");
    }

    @Test
    void unVendedorNoPuedeVerVentasDeOtroVendedor() {

        ProductPresentation presentation =
                presentation(10L, "Clavo 2 pulgadas", "Caja", "13.00");

        Sale sale = draftSale(presentation, new BigDecimal("1.00"));

        when(saleRepository.findDetailedById(1L)).thenReturn(Optional.of(sale));

        assertThatThrownBy(() -> service.findById(1L, 999L, false))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("No tienes permiso");
    }

    @Test
    void exponeLaFacturaEmitidaEnElDetalleDeLaVenta() {

        ProductPresentation presentation =
                presentation(10L, "Clavo 2 pulgadas", "Caja", "13.00");

        Sale sale = draftSale(presentation, new BigDecimal("1.00"));

        Invoice invoice = new Invoice();
        invoice.setId(40L);
        invoice.setInvoiceNumber("F-2026-000001");

        when(saleRepository.findDetailedById(1L)).thenReturn(Optional.of(sale));
        when(invoiceRepository.findBySaleId(1L)).thenReturn(Optional.of(invoice));

        SaleResponseDto response = service.findById(1L, 2L, false);

        assertThat(response.invoiceId()).isEqualTo(40L);
        assertThat(response.invoiceNumber()).isEqualTo("F-2026-000001");
    }

    @Test
    void soloSeEditaUnaVentaEnBorrador() {

        ProductPresentation presentation =
                presentation(10L, "Clavo 2 pulgadas", "Caja", "13.00");

        Sale sale = draftSale(presentation, new BigDecimal("1.00"));
        sale.setStatus("CONFIRMED");

        when(saleRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(sale));

        SaleRequestDto dto = new SaleRequestDto(
                null,
                "CASH",
                null,
                null,
                List.of(new SaleDetailRequestDto(
                        10L,
                        BigDecimal.ONE,
                        BigDecimal.ZERO,
                        BigDecimal.TEN
                ))
        );

        assertThatThrownBy(() -> service.update(1L, dto, 2L, true))
                .isInstanceOf(ResourceConflictException.class)
                .hasMessageContaining("DRAFT");
    }

    // ------------------------------------------------------------------
    // Datos de prueba
    // ------------------------------------------------------------------

    private Sale draftSale(ProductPresentation presentation, BigDecimal quantity) {

        Sale sale = new Sale();

        sale.setId(1L);
        sale.setSaleNumber("V-2026-000001");
        sale.setStatus("DRAFT");
        sale.setPaymentCondition("CASH");
        sale.setSaleDate(LocalDateTime.now());
        sale.setUser(user(2L, "Juan Pérez"));
        sale.setSubtotal(new BigDecimal("100.00"));
        sale.setDiscountTotal(BigDecimal.ZERO);
        sale.setTaxTotal(new BigDecimal("13.00"));
        sale.setTotal(new BigDecimal("113.00"));
        sale.setPaidTotal(BigDecimal.ZERO);

        SaleDetail detail = new SaleDetail();

        detail.setProductPresentation(presentation);
        detail.setQuantity(quantity);
        detail.setUnitPrice(new BigDecimal("20.00"));
        detail.setDiscount(BigDecimal.ZERO);
        detail.setTaxRate(new BigDecimal("13.00"));
        detail.setTaxAmount(new BigDecimal("11.50"));
        detail.setLineSubtotal(new BigDecimal("100.00"));
        detail.setLineTotal(new BigDecimal("113.00"));

        sale.addDetail(detail);

        return sale;
    }

    private ProductPresentation presentation(
            Long id,
            String productName,
            String presentationName,
            String taxRate
    ) {

        Product product = new Product();
        product.setId(100L);
        product.setCode("P-100");
        product.setName(productName);
        product.setIsActive(true);
        product.setTaxRate(new BigDecimal(taxRate));

        Presentation base = new Presentation();
        base.setId(200L);
        base.setName(presentationName);

        ProductPresentation presentation = new ProductPresentation();

        presentation.setId(id);
        presentation.setProduct(product);
        presentation.setPresentation(base);
        presentation.setIsActive(true);

        return presentation;
    }

    private ProductLot lot(Long id, String availableQuantity) {

        ProductLot lot = new ProductLot();

        lot.setId(id);
        lot.setAvailableQuantity(new BigDecimal(availableQuantity));
        lot.setUnitCost(new BigDecimal("10.00"));
        lot.setIsActive(true);

        return lot;
    }

    private User user(Long id, String fullName) {

        User user = new User();

        user.setId(id);
        user.setFullName(fullName);
        user.setUsername("user" + id);
        user.setIsActive(true);

        return user;
    }

    private Customer customer(Long id, String legalName) {

        Customer customer = new Customer();

        customer.setId(id);
        customer.setLegalName(legalName);
        customer.setIsActive(true);
        customer.setCreditLimit(BigDecimal.ZERO);
        customer.setCreditDays(0);

        return customer;
    }
}
