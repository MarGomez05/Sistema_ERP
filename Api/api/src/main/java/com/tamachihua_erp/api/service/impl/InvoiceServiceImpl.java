package com.tamachihua_erp.api.service.impl;

import com.tamachihua_erp.api.dto.billing.CreditNoteRequestDto;
import com.tamachihua_erp.api.dto.billing.InvoiceRequestDto;
import com.tamachihua_erp.api.dto.billing.InvoiceResponseDto;
import com.tamachihua_erp.api.dto.billing.InvoiceSummaryDto;
import com.tamachihua_erp.api.dto.billing.PaymentRequestDto;
import com.tamachihua_erp.api.dto.billing.PaymentResponseDto;
import com.tamachihua_erp.api.entity.Customer;
import com.tamachihua_erp.api.entity.Invoice;
import com.tamachihua_erp.api.entity.InvoiceDetail;
import com.tamachihua_erp.api.entity.InvoicePayment;
import com.tamachihua_erp.api.entity.ProductLot;
import com.tamachihua_erp.api.entity.ProductPresentation;
import com.tamachihua_erp.api.entity.Sale;
import com.tamachihua_erp.api.entity.SaleDetail;
import com.tamachihua_erp.api.entity.SaleLotAllocation;
import com.tamachihua_erp.api.entity.User;
import com.tamachihua_erp.api.exception.InvalidFieldException;
import com.tamachihua_erp.api.exception.ResourceConflictException;
import com.tamachihua_erp.api.exception.ResourceNotFoundException;
import com.tamachihua_erp.api.mapper.InvoiceMapper;
import com.tamachihua_erp.api.repository.InvoicePaymentRepository;
import com.tamachihua_erp.api.repository.InvoiceRepository;
import com.tamachihua_erp.api.repository.ProductLotRepository;
import com.tamachihua_erp.api.repository.SaleRepository;
import com.tamachihua_erp.api.repository.UserRepository;
import com.tamachihua_erp.api.service.DocumentSequenceService;
import com.tamachihua_erp.api.service.InvoiceService;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InvoiceServiceImpl implements InvoiceService {

    private static final String STATUS_ISSUED = "ISSUED";
    private static final String STATUS_CANCELLED = "CANCELLED";
    private static final String SALE_CONFIRMED = "CONFIRMED";
    private static final String SALE_CANCELLED = "CANCELLED";
    private static final String TYPE_CONSUMER = "CONSUMER";
    private static final String TYPE_CCF = "CCF";
    private static final String TYPE_CREDIT_NOTE = "CREDIT_NOTE";
    private static final String CONDITION_CASH = "CASH";
    private static final String CONDITION_CREDIT = "CREDIT";
    private static final String CONSUMER_FINAL = "Consumidor final";
    private static final String DOCUMENT_INVOICE = "INVOICE";
    private static final String DOCUMENT_CCF = "CCF";
    private static final String DOCUMENT_CREDIT_NOTE = "CREDIT_NOTE";

    private static final Set<String> INVOICE_TYPES = Set.of(
            TYPE_CONSUMER,
            TYPE_CCF,
            TYPE_CREDIT_NOTE
    );

    private static final Set<String> INVOICE_STATUSES = Set.of(
            "DRAFT",
            STATUS_ISSUED,
            STATUS_CANCELLED
    );

    private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2);

    private final InvoiceRepository invoiceRepository;
    private final InvoicePaymentRepository paymentRepository;
    private final SaleRepository saleRepository;
    private final ProductLotRepository productLotRepository;
    private final UserRepository userRepository;
    private final DocumentSequenceService documentSequenceService;
    private final InvoiceMapper mapper;

    @Override
    public Page<InvoiceSummaryDto> findAll(
            LocalDate from,
            LocalDate to,
            Long customerId,
            String invoiceType,
            String status,
            Pageable pageable
    ) {

        Specification<Invoice> specification =
                (root, query, criteriaBuilder) -> criteriaBuilder.conjunction();

        if (from != null) {

            specification = specification.and((root, query, cb) ->
                    cb.greaterThanOrEqualTo(root.get("issueDate"), from)
            );
        }

        if (to != null) {

            specification = specification.and((root, query, cb) ->
                    cb.lessThanOrEqualTo(root.get("issueDate"), to)
            );
        }

        if (customerId != null) {

            specification = specification.and((root, query, cb) ->
                    cb.equal(root.get("customer").get("id"), customerId)
            );
        }

        if (invoiceType != null && !invoiceType.isBlank()) {

            String normalized = normalizeInvoiceType(invoiceType);

            specification = specification.and((root, query, cb) ->
                    cb.equal(root.get("invoiceType"), normalized)
            );
        }

        if (status != null && !status.isBlank()) {

            String normalized = normalizeStatus(status);

            specification = specification.and((root, query, cb) ->
                    cb.equal(root.get("status"), normalized)
            );
        }

        return invoiceRepository.findAll(specification, pageable)
                .map(mapper::toSummary);
    }

    @Override
    public InvoiceResponseDto findById(Long id) {

        Invoice invoice = invoiceRepository.findDetailedById(id)
                .orElseThrow(() -> invoiceNotFound(id));

        return mapper.toResponse(invoice);
    }

    @Override
    @Transactional
    public InvoiceResponseDto create(InvoiceRequestDto dto, Long userId) {

        if (dto.saleId() == null) {
            throw new InvalidFieldException(
                    "saleId",
                    "La venta es obligatoria para emitir la factura"
            );
        }

        return createFromSale(dto.saleId(), dto, userId);
    }

    @Override
    @Transactional
    public InvoiceResponseDto createFromSale(
            Long saleId,
            InvoiceRequestDto dto,
            Long userId
    ) {

        if (dto.saleId() != null && !dto.saleId().equals(saleId)) {
            throw new InvalidFieldException(
                    "saleId",
                    "El identificador de la venta no coincide con la ruta"
            );
        }

        // Bloquea la venta para impedir dos facturas concurrentes.
        Sale sale = saleRepository.findByIdForUpdate(saleId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No se encontró la venta con ID: " + saleId
                ));

        if (!SALE_CONFIRMED.equals(sale.getStatus())) {
            throw new ResourceConflictException(
                    "Solo se puede facturar una venta en estado CONFIRMED"
            );
        }

        if (invoiceRepository.existsBySaleId(saleId)) {
            throw new ResourceConflictException(
                    "La venta ya tiene una factura emitida"
            );
        }

        String invoiceType = normalizeInvoiceType(dto.invoiceType());

        Customer customer = sale.getCustomer();

        if (TYPE_CCF.equals(invoiceType) && customer == null) {
            throw new InvalidFieldException(
                    "invoiceType",
                    "La factura CCF requiere un cliente registrado"
            );
        }

        String paymentCondition = resolvePaymentCondition(
                dto.paymentCondition(),
                sale.getPaymentCondition()
        );

        String controlNumber = normalize(dto.controlNumber());

        if (controlNumber != null
                && invoiceRepository.existsByControlNumber(controlNumber)) {
            throw new ResourceConflictException(
                    "El número de control ya está registrado"
            );
        }

        User user = userRepository.getReferenceById(userId);

        LocalDate issueDate = LocalDate.now();

        Invoice invoice = new Invoice();

        invoice.setInvoiceNumber(documentSequenceService.nextNumber(
                TYPE_CCF.equals(invoiceType) ? DOCUMENT_CCF : DOCUMENT_INVOICE
        ));
        invoice.setControlNumber(controlNumber);
        invoice.setInvoiceType(invoiceType);
        invoice.setSale(sale);
        invoice.setCustomer(customer);
        invoice.setIssueDate(issueDate);
        invoice.setDueDate(resolveDueDate(issueDate, paymentCondition, customer));
        invoice.setStatus(STATUS_ISSUED);
        invoice.setPaymentCondition(paymentCondition);
        invoice.setSubtotal(safe(sale.getSubtotal()));
        invoice.setDiscountTotal(safe(sale.getDiscountTotal()));
        invoice.setTaxTotal(safe(sale.getTaxTotal()));
        invoice.setTotal(safe(sale.getTotal()));
        invoice.setPaidTotal(ZERO);
        invoice.setNotes(normalize(dto.notes()));
        invoice.setCreatedBy(user);

        applyCustomerSnapshot(invoice, customer);

        for (SaleDetail detail : sale.getDetails()) {
            invoice.addDetail(buildSnapshot(detail));
        }

        return mapper.toResponse(invoiceRepository.save(invoice));
    }

    @Override
    @Transactional
    public PaymentResponseDto addPayment(
            Long invoiceId,
            PaymentRequestDto dto,
            Long userId
    ) {

        Invoice invoice = invoiceRepository.findByIdForUpdate(invoiceId)
                .orElseThrow(() -> invoiceNotFound(invoiceId));

        if (!STATUS_ISSUED.equals(invoice.getStatus())) {
            throw new ResourceConflictException(
                    "Solo se pueden registrar pagos sobre una factura ISSUED"
            );
        }

        BigDecimal amount = dto.amount().setScale(2, RoundingMode.HALF_UP);

        if (amount.signum() <= 0) {
            throw new InvalidFieldException(
                    "amount",
                    "El monto del pago debe ser mayor que cero"
            );
        }

        BigDecimal newPaidTotal = safe(invoice.getPaidTotal()).add(amount);

        if (newPaidTotal.compareTo(safe(invoice.getTotal())) > 0) {
            throw new ResourceConflictException(
                    "El pago supera el saldo pendiente. Total: "
                            + safe(invoice.getTotal()).toPlainString()
                            + ", pagado: " + safe(invoice.getPaidTotal()).toPlainString()
                            + ", saldo: "
                            + safe(invoice.getTotal())
                                    .subtract(safe(invoice.getPaidTotal()))
                                    .toPlainString()
            );
        }

        InvoicePayment payment = new InvoicePayment();

        payment.setInvoice(invoice);
        payment.setPaymentDate(
                dto.paymentDate() == null ? LocalDate.now() : dto.paymentDate()
        );
        payment.setAmount(amount);
        payment.setPaymentMethod(normalizePaymentMethod(dto.paymentMethod()));
        payment.setReference(normalize(dto.reference()));
        payment.setNotes(normalize(dto.notes()));
        payment.setUser(userRepository.getReferenceById(userId));

        InvoicePayment saved = paymentRepository.save(payment);

        invoice.setPaidTotal(newPaidTotal);

        invoiceRepository.save(invoice);

        return mapper.toPaymentResponse(saved);
    }

    @Override
    public List<PaymentResponseDto> findPayments(Long invoiceId) {

        if (!invoiceRepository.existsById(invoiceId)) {
            throw invoiceNotFound(invoiceId);
        }

        return paymentRepository
                .findByInvoiceIdOrderByPaymentDateDescIdDesc(invoiceId)
                .stream()
                .map(mapper::toPaymentResponse)
                .toList();
    }

    @Override
    @Transactional
    public InvoiceResponseDto issueCreditNote(
            Long invoiceId,
            CreditNoteRequestDto dto,
            Long userId
    ) {

        Invoice original = invoiceRepository.findByIdForUpdate(invoiceId)
                .orElseThrow(() -> invoiceNotFound(invoiceId));

        if (!STATUS_ISSUED.equals(original.getStatus())) {
            throw new ResourceConflictException(
                    "Solo se puede emitir nota de crédito sobre una factura ISSUED"
            );
        }

        if (TYPE_CREDIT_NOTE.equals(original.getInvoiceType())) {
            throw new ResourceConflictException(
                    "No se puede emitir una nota de crédito sobre otra nota de crédito"
            );
        }

        String reason = normalize(dto.reason());

        if (reason == null) {
            throw new InvalidFieldException(
                    "reason",
                    "El motivo de la nota de crédito es obligatorio"
            );
        }

        User user = userRepository.getReferenceById(userId);

        LocalDate issueDate = LocalDate.now();

        Invoice creditNote = new Invoice();

        creditNote.setInvoiceNumber(
                documentSequenceService.nextNumber(DOCUMENT_CREDIT_NOTE)
        );
        creditNote.setInvoiceType(TYPE_CREDIT_NOTE);
        creditNote.setRelatedInvoice(original);
        creditNote.setCustomer(original.getCustomer());
        creditNote.setIssueDate(issueDate);
        creditNote.setDueDate(null);
        creditNote.setStatus(STATUS_ISSUED);
        // Una nota de crédito no es una venta a crédito.
        creditNote.setPaymentCondition(CONDITION_CASH);
        creditNote.setSubtotal(safe(original.getSubtotal()));
        creditNote.setDiscountTotal(safe(original.getDiscountTotal()));
        creditNote.setTaxTotal(safe(original.getTaxTotal()));
        creditNote.setTotal(safe(original.getTotal()));
        creditNote.setPaidTotal(ZERO);
        creditNote.setNotes(reason);
        creditNote.setCreatedBy(user);

        copyCustomerSnapshot(original, creditNote);

        for (InvoiceDetail detail : original.getDetails()) {
            creditNote.addDetail(copySnapshot(detail));
        }

        original.setStatus(STATUS_CANCELLED);
        original.setCancelledAt(LocalDateTime.now());
        original.setCancelledBy(user);
        original.setCancelReason(reason);

        invoiceRepository.save(original);

        Invoice saved = invoiceRepository.save(creditNote);

        cancelRelatedSale(original, saved, dto.returnStock(), user);

        return mapper.toResponse(saved);
    }

    // ------------------------------------------------------------------
    // Snapshot e importes
    // ------------------------------------------------------------------

    private InvoiceDetail buildSnapshot(SaleDetail detail) {

        ProductPresentation presentation = detail.getProductPresentation();

        InvoiceDetail snapshot = new InvoiceDetail();

        snapshot.setProductPresentation(presentation);
        snapshot.setProductCode(presentation.getProduct().getCode());
        snapshot.setProductName(presentation.getProduct().getName());
        snapshot.setPresentationCode(presentation.getCode());
        snapshot.setPresentationName(presentation.getPresentation().getName());
        snapshot.setQuantity(detail.getQuantity());
        snapshot.setUnitPrice(detail.getUnitPrice());
        snapshot.setDiscount(safe(detail.getDiscount()));
        snapshot.setTaxRate(safe(detail.getTaxRate()));
        snapshot.setTaxAmount(safe(detail.getTaxAmount()));
        snapshot.setLineSubtotal(safe(detail.getLineSubtotal()));
        snapshot.setLineTotal(safe(detail.getLineTotal()));
        snapshot.setUnitCost(weightedUnitCost(detail));

        return snapshot;
    }

    private InvoiceDetail copySnapshot(InvoiceDetail original) {

        InvoiceDetail snapshot = new InvoiceDetail();

        snapshot.setProductPresentation(original.getProductPresentation());
        snapshot.setProductCode(original.getProductCode());
        snapshot.setProductName(original.getProductName());
        snapshot.setPresentationCode(original.getPresentationCode());
        snapshot.setPresentationName(original.getPresentationName());
        snapshot.setQuantity(original.getQuantity());
        snapshot.setUnitPrice(original.getUnitPrice());
        snapshot.setDiscount(original.getDiscount());
        snapshot.setTaxRate(original.getTaxRate());
        snapshot.setTaxAmount(original.getTaxAmount());
        snapshot.setLineSubtotal(original.getLineSubtotal());
        snapshot.setLineTotal(original.getLineTotal());
        snapshot.setUnitCost(original.getUnitCost());

        return snapshot;
    }

    private void applyCustomerSnapshot(Invoice invoice, Customer customer) {

        if (customer == null) {

            invoice.setCustomerName(CONSUMER_FINAL);
            return;
        }

        invoice.setCustomerName(customer.getLegalName());
        invoice.setCustomerDocumentType(customer.getDocumentType());
        invoice.setCustomerDocumentNumber(customer.getDocumentNumber());
        invoice.setCustomerNit(customer.getNit());
        invoice.setCustomerNrc(customer.getNrc());
        invoice.setCustomerAddress(customer.getAddress());
        invoice.setCustomerEmail(customer.getEmail());
    }

    private void copyCustomerSnapshot(Invoice source, Invoice target) {

        target.setCustomerName(source.getCustomerName());
        target.setCustomerDocumentType(source.getCustomerDocumentType());
        target.setCustomerDocumentNumber(source.getCustomerDocumentNumber());
        target.setCustomerNit(source.getCustomerNit());
        target.setCustomerNrc(source.getCustomerNrc());
        target.setCustomerAddress(source.getCustomerAddress());
        target.setCustomerEmail(source.getCustomerEmail());
    }

    // Costo promedio ponderado de los lotes consumidos por la línea.
    private BigDecimal weightedUnitCost(SaleDetail detail) {

        if (detail.getAllocations() == null || detail.getAllocations().isEmpty()) {
            return null;
        }

        BigDecimal totalQuantity = BigDecimal.ZERO;
        BigDecimal totalCost = BigDecimal.ZERO;

        for (SaleLotAllocation allocation : detail.getAllocations()) {

            totalQuantity = totalQuantity.add(allocation.getQuantity());
            totalCost = totalCost.add(
                    allocation.getQuantity().multiply(allocation.getUnitCost())
            );
        }

        if (totalQuantity.signum() == 0) {
            return null;
        }

        return totalCost.divide(totalQuantity, 2, RoundingMode.HALF_UP);
    }

    // ------------------------------------------------------------------
    // Nota de crédito y devolución de stock
    // ------------------------------------------------------------------

    private void cancelRelatedSale(
            Invoice original,
            Invoice creditNote,
            Boolean returnStock,
            User user
    ) {

        if (original.getSale() == null) {
            return;
        }

        Sale sale = saleRepository.findByIdForUpdate(original.getSale().getId())
                .orElse(null);

        if (sale == null || !SALE_CONFIRMED.equals(sale.getStatus())) {
            return;
        }

        if (Boolean.TRUE.equals(returnStock)) {
            restoreStock(sale);
        }

        sale.setStatus(SALE_CANCELLED);
        sale.setCancelledAt(LocalDateTime.now());
        sale.setCancelledBy(user);
        sale.setCancelReason(
                "Nota de crédito " + creditNote.getInvoiceNumber()
        );

        saleRepository.save(sale);
    }

    private void restoreStock(Sale sale) {

        for (SaleDetail detail : sale.getDetails()) {

            for (SaleLotAllocation allocation : detail.getAllocations()) {

                ProductLot lot = productLotRepository
                        .findByIdForUpdate(allocation.getProductLot().getId())
                        .orElseThrow(() -> new ResourceNotFoundException(
                                "No se encontró el lote con ID: "
                                        + allocation.getProductLot().getId()
                        ));

                lot.setAvailableQuantity(
                        lot.getAvailableQuantity().add(allocation.getQuantity())
                );
            }
        }
    }

    // ------------------------------------------------------------------
    // Reglas y utilidades
    // ------------------------------------------------------------------

    private String resolvePaymentCondition(String requested, String saleCondition) {

        String normalizedSale = normalizeCondition(saleCondition);

        String normalizedRequested = requested == null || requested.isBlank()
                ? normalizedSale
                : normalizeCondition(requested);

        if (!normalizedSale.equals(normalizedRequested)) {
            throw new InvalidFieldException(
                    "paymentCondition",
                    "La condición de pago de la factura debe coincidir con la venta ("
                            + normalizedSale + ")"
            );
        }

        return normalizedRequested;
    }

    private LocalDate resolveDueDate(
            LocalDate issueDate,
            String paymentCondition,
            Customer customer
    ) {

        if (!CONDITION_CREDIT.equals(paymentCondition)) {
            return null;
        }

        if (customer == null) {
            throw new InvalidFieldException(
                    "paymentCondition",
                    "Una factura a crédito requiere un cliente registrado"
            );
        }

        int days = customer.getCreditDays() == null || customer.getCreditDays() <= 0
                ? 1
                : customer.getCreditDays();

        return issueDate.plusDays(days);
    }

    private String normalizeInvoiceType(String invoiceType) {

        String normalized = invoiceType == null
                ? null
                : invoiceType.trim().toUpperCase(Locale.ROOT);

        if (normalized == null || !INVOICE_TYPES.contains(normalized)) {
            throw new InvalidFieldException(
                    "invoiceType",
                    "El tipo de factura debe ser CONSUMER, CCF o CREDIT_NOTE"
            );
        }

        return normalized;
    }

    private String normalizeStatus(String status) {

        String normalized = status.trim().toUpperCase(Locale.ROOT);

        if (!INVOICE_STATUSES.contains(normalized)) {
            throw new InvalidFieldException(
                    "status",
                    "El estado debe ser DRAFT, ISSUED o CANCELLED"
            );
        }

        return normalized;
    }

    private String normalizeCondition(String condition) {

        if (condition == null || condition.isBlank()) {
            return CONDITION_CASH;
        }

        String normalized = condition.trim().toUpperCase(Locale.ROOT);

        if (!CONDITION_CASH.equals(normalized)
                && !CONDITION_CREDIT.equals(normalized)) {
            throw new InvalidFieldException(
                    "paymentCondition",
                    "La condición de pago debe ser CASH o CREDIT"
            );
        }

        return normalized;
    }

    private String normalizePaymentMethod(String paymentMethod) {

        if (paymentMethod == null || paymentMethod.isBlank()) {
            throw new InvalidFieldException(
                    "paymentMethod",
                    "El método de pago es obligatorio"
            );
        }

        return paymentMethod.trim().toUpperCase(Locale.ROOT);
    }

    private BigDecimal safe(BigDecimal value) {
        return value == null ? ZERO : value;
    }

    private String normalize(String value) {

        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }

    private ResourceNotFoundException invoiceNotFound(Long id) {

        return new ResourceNotFoundException(
                "No se encontró la factura con ID: " + id
        );
    }
}
