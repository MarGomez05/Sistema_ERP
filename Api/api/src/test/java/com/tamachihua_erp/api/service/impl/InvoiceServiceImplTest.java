package com.tamachihua_erp.api.service.impl;

import com.tamachihua_erp.api.dto.billing.CreditNoteRequestDto;
import com.tamachihua_erp.api.dto.billing.InvoiceRequestDto;
import com.tamachihua_erp.api.dto.billing.InvoiceResponseDto;
import com.tamachihua_erp.api.dto.billing.PaymentRequestDto;
import com.tamachihua_erp.api.dto.billing.PaymentResponseDto;
import com.tamachihua_erp.api.entity.Customer;
import com.tamachihua_erp.api.entity.Invoice;
import com.tamachihua_erp.api.entity.InvoiceDetail;
import com.tamachihua_erp.api.entity.Presentation;
import com.tamachihua_erp.api.entity.Product;
import com.tamachihua_erp.api.entity.ProductLot;
import com.tamachihua_erp.api.entity.ProductPresentation;
import com.tamachihua_erp.api.entity.Sale;
import com.tamachihua_erp.api.entity.SaleDetail;
import com.tamachihua_erp.api.entity.SaleLotAllocation;
import com.tamachihua_erp.api.entity.User;
import com.tamachihua_erp.api.exception.InvalidFieldException;
import com.tamachihua_erp.api.exception.ResourceConflictException;
import com.tamachihua_erp.api.mapper.InvoiceMapper;
import com.tamachihua_erp.api.repository.InvoicePaymentRepository;
import com.tamachihua_erp.api.repository.InvoiceRepository;
import com.tamachihua_erp.api.repository.ProductLotRepository;
import com.tamachihua_erp.api.repository.SaleRepository;
import com.tamachihua_erp.api.repository.UserRepository;
import com.tamachihua_erp.api.service.DocumentSequenceService;

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
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InvoiceServiceImplTest {

    @Mock
    private InvoiceRepository invoiceRepository;

    @Mock
    private InvoicePaymentRepository paymentRepository;

    @Mock
    private SaleRepository saleRepository;

    @Mock
    private ProductLotRepository productLotRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private DocumentSequenceService documentSequenceService;

    private InvoiceServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new InvoiceServiceImpl(
                invoiceRepository,
                paymentRepository,
                saleRepository,
                productLotRepository,
                userRepository,
                documentSequenceService,
                new InvoiceMapper()
        );
    }

    @Test
    void emiteFacturaDeConsumidorFinalConSnapshot() {

        Sale sale = confirmedSale(null, "CASH");

        when(saleRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(sale));
        when(invoiceRepository.existsBySaleId(1L)).thenReturn(false);
        when(documentSequenceService.nextNumber("INVOICE"))
                .thenReturn("F-2026-000001");
        when(userRepository.getReferenceById(2L)).thenReturn(user(2L, "Juan Pérez"));
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(invocation -> {
            Invoice invoice = invocation.getArgument(0);
            invoice.setId(40L);
            return invoice;
        });

        InvoiceRequestDto dto = new InvoiceRequestDto(
                null, "CONSUMER", null, "CASH", "Venta de mostrador"
        );

        InvoiceResponseDto response = service.createFromSale(1L, dto, 2L);

        assertThat(response.id()).isEqualTo(40L);
        assertThat(response.invoiceNumber()).isEqualTo("F-2026-000001");
        assertThat(response.invoiceType()).isEqualTo("CONSUMER");
        assertThat(response.status()).isEqualTo("ISSUED");
        assertThat(response.customerName()).isEqualTo("Consumidor final");
        assertThat(response.dueDate()).isNull();
        assertThat(response.total()).isEqualByComparingTo("113.00");
        assertThat(response.taxTotal()).isEqualByComparingTo("13.00");
        assertThat(response.details()).hasSize(1);
        assertThat(response.details().get(0).productCode()).isEqualTo("P-100");
        assertThat(response.details().get(0).presentationCode()).isEqualTo("PP-010");
    }

    @Test
    void emiteFacturaCcfACreditoConSnapshotFiscalYVencimiento() {

        Customer customer = customer(8L, "Agroservicio El Progreso, S.A.");
        customer.setCreditDays(30);

        Sale sale = confirmedSale(customer, "CREDIT");

        when(saleRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(sale));
        when(invoiceRepository.existsBySaleId(1L)).thenReturn(false);
        when(invoiceRepository.existsByControlNumber("A-001234")).thenReturn(false);
        when(documentSequenceService.nextNumber("CCF"))
                .thenReturn("CCF-2026-000040");
        when(userRepository.getReferenceById(2L)).thenReturn(user(2L, "Juan Pérez"));
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(invocation -> {
            Invoice invoice = invocation.getArgument(0);
            invoice.setId(41L);
            return invoice;
        });

        InvoiceRequestDto dto = new InvoiceRequestDto(
                1L, "CCF", "A-001234", "CREDIT", null
        );

        InvoiceResponseDto response = service.createFromSale(1L, dto, 2L);

        assertThat(response.invoiceNumber()).isEqualTo("CCF-2026-000040");
        assertThat(response.controlNumber()).isEqualTo("A-001234");
        assertThat(response.customerName())
                .isEqualTo("Agroservicio El Progreso, S.A.");
        assertThat(response.customerNit()).isEqualTo("0614-123456-101-2");
        assertThat(response.customerNrc()).isEqualTo("123456-7");
        assertThat(response.dueDate()).isEqualTo(LocalDate.now().plusDays(30));
    }

    @Test
    void soloFacturaVentasConfirmadas() {

        Sale sale = confirmedSale(null, "CASH");
        sale.setStatus("DRAFT");

        when(saleRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(sale));

        InvoiceRequestDto dto = new InvoiceRequestDto(
                null, "CONSUMER", null, "CASH", null
        );

        assertThatThrownBy(() -> service.createFromSale(1L, dto, 2L))
                .isInstanceOf(ResourceConflictException.class)
                .hasMessageContaining("CONFIRMED");
    }

    @Test
    void rechazaUnaSegundaFacturaParaLaMismaVenta() {

        Sale sale = confirmedSale(null, "CASH");

        when(saleRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(sale));
        when(invoiceRepository.existsBySaleId(1L)).thenReturn(true);

        InvoiceRequestDto dto = new InvoiceRequestDto(
                null, "CONSUMER", null, "CASH", null
        );

        assertThatThrownBy(() -> service.createFromSale(1L, dto, 2L))
                .isInstanceOf(ResourceConflictException.class)
                .hasMessageContaining("ya tiene una factura");
    }

    @Test
    void exigeQueLaCondicionDePagoCoincidaConLaVenta() {

        Sale sale = confirmedSale(null, "CASH");

        when(saleRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(sale));
        when(invoiceRepository.existsBySaleId(1L)).thenReturn(false);

        InvoiceRequestDto dto = new InvoiceRequestDto(
                null, "CONSUMER", null, "CREDIT", null
        );

        assertThatThrownBy(() -> service.createFromSale(1L, dto, 2L))
                .isInstanceOf(InvalidFieldException.class)
                .hasMessageContaining("debe coincidir con la venta");
    }

    @Test
    void registraPagoYActualizaElSaldoPagado() {

        Invoice invoice = issuedInvoice(40L, "ISSUED");
        invoice.setPaidTotal(BigDecimal.ZERO);

        User user = user(2L, "Juan Pérez");

        when(invoiceRepository.findByIdForUpdate(40L))
                .thenReturn(Optional.of(invoice));
        when(userRepository.getReferenceById(2L)).thenReturn(user);
        when(paymentRepository.save(any())).thenAnswer(invocation -> {
            com.tamachihua_erp.api.entity.InvoicePayment payment =
                    invocation.getArgument(0);
            payment.setId(5L);
            return payment;
        });

        PaymentRequestDto dto = new PaymentRequestDto(
                LocalDate.now(),
                new BigDecimal("50.00"),
                "CASH",
                "REF-1",
                "Abono"
        );

        PaymentResponseDto response = service.addPayment(40L, dto, 2L);

        assertThat(response.id()).isEqualTo(5L);
        assertThat(response.invoiceId()).isEqualTo(40L);
        assertThat(response.amount()).isEqualByComparingTo("50.00");
        assertThat(response.userName()).isEqualTo("Juan Pérez");
        assertThat(invoice.getPaidTotal()).isEqualByComparingTo("50.00");
        assertThat(invoice.getTotal().subtract(invoice.getPaidTotal()))
                .isEqualByComparingTo("63.00");
    }

    @Test
    void rechazaPagosQueSuperanElTotal() {

        Invoice invoice = issuedInvoice(40L, "ISSUED");
        invoice.setPaidTotal(new BigDecimal("100.00"));

        when(invoiceRepository.findByIdForUpdate(40L))
                .thenReturn(Optional.of(invoice));

        PaymentRequestDto dto = new PaymentRequestDto(
                LocalDate.now(),
                new BigDecimal("50.00"),
                "CASH",
                null,
                null
        );

        assertThatThrownBy(() -> service.addPayment(40L, dto, 2L))
                .isInstanceOf(ResourceConflictException.class)
                .hasMessageContaining("saldo pendiente");
    }

    @Test
    void emiteNotaDeCreditoYDevuelveStock() {

        Sale sale = confirmedSale(null, "CASH");

        ProductLot lot = new ProductLot();
        lot.setId(50L);
        lot.setAvailableQuantity(new BigDecimal("8.00"));

        SaleLotAllocation allocation = new SaleLotAllocation(
                lot,
                new BigDecimal("2.00"),
                new BigDecimal("10.00")
        );

        sale.getDetails().get(0).addAllocation(allocation);

        Invoice original = issuedInvoice(40L, "ISSUED");
        original.setSale(sale);
        original.setInvoiceNumber("CCF-2026-000040");

        User user = user(9L, "María Rivas");

        when(invoiceRepository.findByIdForUpdate(40L))
                .thenReturn(Optional.of(original));
        when(saleRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(sale));
        when(documentSequenceService.nextNumber("CREDIT_NOTE"))
                .thenReturn("NC-2026-000001");
        when(userRepository.getReferenceById(9L)).thenReturn(user);
        when(productLotRepository.findByIdForUpdate(50L))
                .thenReturn(Optional.of(lot));
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(invocation -> {
            Invoice invoice = invocation.getArgument(0);
            if (invoice.getId() == null) {
                invoice.setId(41L);
            }
            return invoice;
        });

        InvoiceResponseDto response = service.issueCreditNote(
                40L,
                new CreditNoteRequestDto("Devolución de mercadería", true),
                9L
        );

        assertThat(response.id()).isEqualTo(41L);
        assertThat(response.invoiceType()).isEqualTo("CREDIT_NOTE");
        assertThat(response.relatedInvoiceId()).isEqualTo(40L);
        assertThat(response.relatedInvoiceNumber()).isEqualTo("CCF-2026-000040");
        assertThat(response.details()).hasSize(1);
        assertThat(original.getStatus()).isEqualTo("CANCELLED");
        assertThat(sale.getStatus()).isEqualTo("CANCELLED");
        assertThat(lot.getAvailableQuantity()).isEqualByComparingTo("10.00");
    }

    @Test
    void emiteNotaDeCreditoSinDevolverStock() {

        Sale sale = confirmedSale(null, "CASH");

        ProductLot lot = new ProductLot();
        lot.setId(50L);
        lot.setAvailableQuantity(new BigDecimal("8.00"));

        sale.getDetails().get(0).addAllocation(new SaleLotAllocation(
                lot,
                new BigDecimal("2.00"),
                new BigDecimal("10.00")
        ));

        Invoice original = issuedInvoice(40L, "ISSUED");
        original.setSale(sale);

        when(invoiceRepository.findByIdForUpdate(40L))
                .thenReturn(Optional.of(original));
        when(saleRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(sale));
        when(documentSequenceService.nextNumber("CREDIT_NOTE"))
                .thenReturn("NC-2026-000002");
        when(userRepository.getReferenceById(9L)).thenReturn(user(9L, "María Rivas"));
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(invocation -> {
            Invoice invoice = invocation.getArgument(0);
            if (invoice.getId() == null) {
                invoice.setId(42L);
            }
            return invoice;
        });

        service.issueCreditNote(
                40L,
                new CreditNoteRequestDto("Corrección de precio", false),
                9L
        );

        assertThat(sale.getStatus()).isEqualTo("CANCELLED");
        assertThat(lot.getAvailableQuantity()).isEqualByComparingTo("8.00");
    }

    // ------------------------------------------------------------------
    // Datos de prueba
    // ------------------------------------------------------------------

    private Sale confirmedSale(Customer customer, String paymentCondition) {

        Sale sale = new Sale();

        sale.setId(1L);
        sale.setSaleNumber("V-2026-000001");
        sale.setStatus("CONFIRMED");
        sale.setPaymentCondition(paymentCondition);
        sale.setCustomer(customer);
        sale.setUser(user(2L, "Juan Pérez"));
        sale.setSaleDate(LocalDateTime.now());
        sale.setSubtotal(new BigDecimal("100.00"));
        sale.setDiscountTotal(BigDecimal.ZERO);
        sale.setTaxTotal(new BigDecimal("13.00"));
        sale.setTotal(new BigDecimal("113.00"));
        sale.setPaidTotal(BigDecimal.ZERO);

        SaleDetail detail = new SaleDetail();

        detail.setId(500L);
        detail.setProductPresentation(presentation());
        detail.setQuantity(new BigDecimal("1.00"));
        detail.setUnitPrice(new BigDecimal("113.00"));
        detail.setDiscount(BigDecimal.ZERO);
        detail.setTaxRate(new BigDecimal("13.00"));
        detail.setTaxAmount(new BigDecimal("13.00"));
        detail.setLineSubtotal(new BigDecimal("100.00"));
        detail.setLineTotal(new BigDecimal("113.00"));

        sale.addDetail(detail);

        return sale;
    }

    private Invoice issuedInvoice(Long id, String status) {

        Invoice invoice = new Invoice();

        invoice.setId(id);
        invoice.setInvoiceNumber("CCF-2026-000040");
        invoice.setInvoiceType("CCF");
        invoice.setStatus(status);
        invoice.setPaymentCondition("CASH");
        invoice.setIssueDate(LocalDate.now());
        invoice.setCustomerName("Consumidor final");
        invoice.setSubtotal(new BigDecimal("100.00"));
        invoice.setDiscountTotal(BigDecimal.ZERO);
        invoice.setTaxTotal(new BigDecimal("13.00"));
        invoice.setTotal(new BigDecimal("113.00"));
        invoice.setPaidTotal(BigDecimal.ZERO);
        invoice.setCreatedBy(user(2L, "Juan Pérez"));

        InvoiceDetail detail = new InvoiceDetail();

        detail.setId(700L);
        detail.setProductPresentation(presentation());
        detail.setProductCode("P-100");
        detail.setProductName("Clavo de acero");
        detail.setPresentationCode("PP-010");
        detail.setPresentationName("Caja 25 lb");
        detail.setQuantity(new BigDecimal("1.00"));
        detail.setUnitPrice(new BigDecimal("113.00"));
        detail.setDiscount(BigDecimal.ZERO);
        detail.setTaxRate(new BigDecimal("13.00"));
        detail.setTaxAmount(new BigDecimal("13.00"));
        detail.setLineSubtotal(new BigDecimal("100.00"));
        detail.setLineTotal(new BigDecimal("113.00"));

        invoice.addDetail(detail);

        return invoice;
    }

    private ProductPresentation presentation() {

        Product product = new Product();
        product.setId(100L);
        product.setCode("P-100");
        product.setName("Clavo de acero");
        product.setIsActive(true);

        Presentation base = new Presentation();
        base.setId(200L);
        base.setName("Caja 25 lb");

        ProductPresentation presentation = new ProductPresentation();

        presentation.setId(10L);
        presentation.setCode("PP-010");
        presentation.setProduct(product);
        presentation.setPresentation(base);
        presentation.setIsActive(true);

        return presentation;
    }

    private Customer customer(Long id, String legalName) {

        Customer customer = new Customer();

        customer.setId(id);
        customer.setLegalName(legalName);
        customer.setDocumentType("NIT");
        customer.setDocumentNumber("0614-123456-101-2");
        customer.setNit("0614-123456-101-2");
        customer.setNrc("123456-7");
        customer.setAddress("San Salvador");
        customer.setEmail("cliente@example.com");
        customer.setCreditLimit(new BigDecimal("5000.00"));
        customer.setCreditDays(30);
        customer.setIsActive(true);

        return customer;
    }

    private User user(Long id, String fullName) {

        User user = new User();

        user.setId(id);
        user.setUsername("user" + id);
        user.setFullName(fullName);
        user.setIsActive(true);

        return user;
    }
}
