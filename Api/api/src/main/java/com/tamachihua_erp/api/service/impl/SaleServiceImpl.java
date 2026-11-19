package com.tamachihua_erp.api.service.impl;

import com.tamachihua_erp.api.dto.sale.SaleDetailRequestDto;
import com.tamachihua_erp.api.dto.sale.SaleRequestDto;
import com.tamachihua_erp.api.dto.sale.SaleResponseDto;
import com.tamachihua_erp.api.dto.sale.SaleSummaryDto;
import com.tamachihua_erp.api.entity.Customer;
import com.tamachihua_erp.api.entity.Invoice;
import com.tamachihua_erp.api.entity.ProductLot;
import com.tamachihua_erp.api.entity.ProductPresentation;
import com.tamachihua_erp.api.entity.ProductPrice;
import com.tamachihua_erp.api.entity.Sale;
import com.tamachihua_erp.api.entity.SaleDetail;
import com.tamachihua_erp.api.entity.SaleLotAllocation;
import com.tamachihua_erp.api.exception.InsufficientStockException;
import com.tamachihua_erp.api.exception.InvalidFieldException;
import com.tamachihua_erp.api.exception.ResourceConflictException;
import com.tamachihua_erp.api.exception.ResourceNotFoundException;
import com.tamachihua_erp.api.mapper.SaleMapper;
import com.tamachihua_erp.api.repository.CustomerRepository;
import com.tamachihua_erp.api.repository.InvoiceRepository;
import com.tamachihua_erp.api.repository.ProductLotRepository;
import com.tamachihua_erp.api.repository.ProductPresentationRepository;
import com.tamachihua_erp.api.repository.ProductPriceRepository;
import com.tamachihua_erp.api.repository.SaleRepository;
import com.tamachihua_erp.api.repository.UserRepository;
import com.tamachihua_erp.api.service.DocumentSequenceService;
import com.tamachihua_erp.api.service.SaleService;
import com.tamachihua_erp.api.util.SaleTotalsCalculator;
import com.tamachihua_erp.api.util.SaleTotalsCalculator.LineAmounts;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SaleServiceImpl implements SaleService {

    private static final String STATUS_DRAFT = "DRAFT";
    private static final String STATUS_CONFIRMED = "CONFIRMED";
    private static final String STATUS_CANCELLED = "CANCELLED";
    private static final String CONDITION_CREDIT = "CREDIT";
    private static final String DOCUMENT_TYPE_SALE = "SALE";
    private static final Set<String> VALID_STATUSES = Set.of(
            STATUS_DRAFT,
            STATUS_CONFIRMED,
            STATUS_CANCELLED
    );

    private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2);
    private static final BigDecimal DEFAULT_TAX_RATE = new BigDecimal("13.00");

    private final SaleRepository repository;
    private final InvoiceRepository invoiceRepository;
    private final CustomerRepository customerRepository;
    private final ProductPresentationRepository productPresentationRepository;
    private final ProductPriceRepository productPriceRepository;
    private final ProductLotRepository productLotRepository;
    private final UserRepository userRepository;
    private final DocumentSequenceService documentSequenceService;
    private final SaleMapper mapper;

    @Override
    public Page<SaleSummaryDto> findAll(
            LocalDate from,
            LocalDate to,
            Long customerId,
            String status,
            Long userId,
            Pageable pageable
    ) {

        Specification<Sale> specification =
                (root, query, criteriaBuilder) -> criteriaBuilder.conjunction();

        if (from != null) {

            LocalDateTime start = from.atStartOfDay();

            specification = specification.and((root, query, cb) ->
                    cb.greaterThanOrEqualTo(root.get("saleDate"), start)
            );
        }

        if (to != null) {

            LocalDateTime end = to.plusDays(1).atStartOfDay();

            specification = specification.and((root, query, cb) ->
                    cb.lessThan(root.get("saleDate"), end)
            );
        }

        if (customerId != null) {

            specification = specification.and((root, query, cb) ->
                    cb.equal(root.get("customer").get("id"), customerId)
            );
        }

        if (status != null && !status.isBlank()) {

            String normalized = normalizeStatus(status);

            specification = specification.and((root, query, cb) ->
                    cb.equal(root.get("status"), normalized)
            );
        }

        if (userId != null) {

            specification = specification.and((root, query, cb) ->
                    cb.equal(root.get("user").get("id"), userId)
            );
        }

        Page<Sale> page = repository.findAll(specification, pageable);
        Map<Long, Invoice> invoices = invoicesBySale(page.getContent());

        return page.map(sale -> mapper.toSummary(sale, invoices.get(sale.getId())));
    }

    @Override
    public SaleResponseDto findById(Long id, Long requesterId, boolean canViewAll) {

        Sale sale = repository.findDetailedById(id)
                .orElseThrow(() -> saleNotFound(id));

        assertCanView(sale, requesterId, canViewAll);

        Invoice invoice = invoiceRepository.findBySaleId(id).orElse(null);

        return mapper.toResponse(sale, invoice);
    }

    @Override
    @Transactional
    public SaleResponseDto create(SaleRequestDto dto, Long userId) {

        Customer customer = resolveCustomer(dto.customerId());

        validateCreditCustomer(dto.paymentCondition(), customer);

        Sale sale = new Sale();

        sale.setSaleNumber(documentSequenceService.nextNumber(DOCUMENT_TYPE_SALE));
        sale.setUser(userRepository.getReferenceById(userId));
        sale.setCustomer(customer);
        sale.setSaleDate(LocalDateTime.now());
        sale.setStatus(STATUS_DRAFT);
        sale.setPaymentCondition(dto.paymentCondition());
        sale.setPaymentMethod(normalizePaymentMethod(dto.paymentMethod()));
        sale.setNotes(normalize(dto.notes()));
        sale.setPaidTotal(ZERO);

        applyDetails(sale, dto.details());

        return mapper.toResponse(repository.save(sale));
    }

    @Override
    @Transactional
    public SaleResponseDto update(
            Long id,
            SaleRequestDto dto,
            Long requesterId,
            boolean canManageAll
    ) {

        Sale sale = repository.findByIdForUpdate(id)
                .orElseThrow(() -> saleNotFound(id));

        assertCanManage(sale, requesterId, canManageAll);

        if (!STATUS_DRAFT.equals(sale.getStatus())) {
            throw new ResourceConflictException(
                    "Solo se puede editar una venta en estado DRAFT"
            );
        }

        Customer customer = resolveCustomer(dto.customerId());

        validateCreditCustomer(dto.paymentCondition(), customer);

        sale.setCustomer(customer);
        sale.setPaymentCondition(dto.paymentCondition());
        sale.setPaymentMethod(normalizePaymentMethod(dto.paymentMethod()));
        sale.setNotes(normalize(dto.notes()));

        // Elimina las líneas anteriores antes de reinsertar para respetar
        // la restricción única (sale_id, product_presentation_id).
        sale.getDetails().clear();
        repository.saveAndFlush(sale);

        applyDetails(sale, dto.details());

        return mapper.toResponse(repository.save(sale));
    }

    @Override
    @Transactional
    public SaleResponseDto confirm(Long id, Long requesterId, boolean canManageAll) {

        Sale sale = repository.findByIdForUpdate(id)
                .orElseThrow(() -> saleNotFound(id));

        assertCanManage(sale, requesterId, canManageAll);

        if (!STATUS_DRAFT.equals(sale.getStatus())) {
            throw new ResourceConflictException(
                    "Solo se puede confirmar una venta en estado DRAFT"
            );
        }

        if (sale.getDetails().isEmpty()) {
            throw new ResourceConflictException("La venta no tiene líneas");
        }

        validateCreditOnConfirm(sale);

        LocalDate today = LocalDate.now();

        for (SaleDetail detail : sale.getDetails()) {
            allocateLots(detail, today);
        }

        sale.setStatus(STATUS_CONFIRMED);

        return mapper.toResponse(repository.save(sale));
    }

    @Override
    @Transactional
    public SaleResponseDto cancel(Long id, String reason, Long userId) {

        Sale sale = repository.findByIdForUpdate(id)
                .orElseThrow(() -> saleNotFound(id));

        if (STATUS_CANCELLED.equals(sale.getStatus())) {
            throw new ResourceConflictException("La venta ya está cancelada");
        }

        if (repository.existsIssuedInvoiceBySaleId(id)) {
            throw new ResourceConflictException(
                    "La venta tiene una factura emitida; debe emitirse una nota de crédito"
            );
        }

        if (STATUS_CONFIRMED.equals(sale.getStatus())) {
            restoreStock(sale);
        }

        sale.setStatus(STATUS_CANCELLED);
        sale.setCancelledAt(LocalDateTime.now());
        sale.setCancelledBy(userRepository.getReferenceById(userId));
        sale.setCancelReason(normalize(reason));

        return mapper.toResponse(repository.save(sale));
    }

    // ------------------------------------------------------------------
    // Cálculo de líneas y totales
    // ------------------------------------------------------------------

    private void applyDetails(Sale sale, List<SaleDetailRequestDto> lines) {

        Set<Long> seenPresentations = new HashSet<>();

        BigDecimal subtotal = ZERO;
        BigDecimal discountTotal = ZERO;
        BigDecimal taxTotal = ZERO;
        BigDecimal total = ZERO;

        for (SaleDetailRequestDto line : lines) {

            if (!seenPresentations.add(line.productPresentationId())) {
                throw new InvalidFieldException(
                        "details",
                        "No se puede repetir la misma presentación en la venta"
                );
            }

            ProductPresentation presentation =
                    resolvePresentation(line.productPresentationId());

            BigDecimal quantity = line.quantity().setScale(2, RoundingMode.HALF_UP);
            BigDecimal unitPrice = resolveUnitPrice(presentation, line.unitPrice());
            BigDecimal discount = line.discount() == null
                    ? ZERO
                    : line.discount().setScale(2, RoundingMode.HALF_UP);

            BigDecimal gross = SaleTotalsCalculator.grossAmount(quantity, unitPrice);

            if (discount.compareTo(gross) > 0) {
                throw new InvalidFieldException(
                        "details",
                        "El descuento no puede superar el subtotal de la línea"
                );
            }

            BigDecimal taxRate = presentation.getProduct().getTaxRate() == null
                    ? DEFAULT_TAX_RATE
                    : presentation.getProduct().getTaxRate();

            LineAmounts amounts =
                    SaleTotalsCalculator.calculate(quantity, unitPrice, discount, taxRate);

            SaleDetail detail = new SaleDetail();

            detail.setProductPresentation(presentation);
            detail.setQuantity(quantity);
            detail.setUnitPrice(unitPrice);
            detail.setDiscount(discount);
            detail.setTaxRate(taxRate);
            detail.setTaxAmount(amounts.taxAmount());
            detail.setLineSubtotal(amounts.lineSubtotal());
            detail.setLineTotal(amounts.lineTotal());

            sale.addDetail(detail);

            subtotal = subtotal.add(amounts.lineSubtotal());
            discountTotal = discountTotal.add(discount);
            taxTotal = taxTotal.add(amounts.taxAmount());
            total = total.add(amounts.lineTotal());
        }

        sale.setSubtotal(subtotal.setScale(2, RoundingMode.HALF_UP));
        sale.setDiscountTotal(discountTotal.setScale(2, RoundingMode.HALF_UP));
        sale.setTaxTotal(taxTotal.setScale(2, RoundingMode.HALF_UP));
        sale.setTotal(total.setScale(2, RoundingMode.HALF_UP));
    }

    // ------------------------------------------------------------------
    // FEFO con bloqueo pesimista
    // ------------------------------------------------------------------

    private void allocateLots(SaleDetail detail, LocalDate today) {

        Long presentationId = detail.getProductPresentation().getId();

        List<ProductLot> lots = productLotRepository
                .findSellableLotsForUpdate(presentationId, today);

        BigDecimal remaining = detail.getQuantity();

        for (ProductLot lot : lots) {

            if (remaining.signum() <= 0) {
                break;
            }

            BigDecimal take = remaining.min(lot.getAvailableQuantity());

            if (take.signum() <= 0) {
                continue;
            }

            lot.setAvailableQuantity(lot.getAvailableQuantity().subtract(take));

            detail.addAllocation(new SaleLotAllocation(
                    lot,
                    take,
                    lot.getUnitCost()
            ));

            remaining = remaining.subtract(take);
        }

        if (remaining.signum() > 0) {

            BigDecimal available = detail.getQuantity().subtract(remaining);

            throw new InsufficientStockException(
                    "Stock insuficiente para " + productName(detail)
                            + ". Solicitado: " + detail.getQuantity().toPlainString()
                            + ", disponible: " + available.toPlainString()
            );
        }
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
    // Reglas de negocio
    // ------------------------------------------------------------------

    private Customer resolveCustomer(Long customerId) {

        if (customerId == null) {
            return null;
        }

        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new InvalidFieldException(
                        "customerId", "El cliente no existe o está inactivo"
                ));

        if (!Boolean.TRUE.equals(customer.getIsActive())) {
            throw new InvalidFieldException(
                    "customerId", "El cliente no existe o está inactivo"
            );
        }

        return customer;
    }

    private ProductPresentation resolvePresentation(Long productPresentationId) {

        ProductPresentation presentation = productPresentationRepository
                .findDetailedById(productPresentationId)
                .orElseThrow(() -> new InvalidFieldException(
                        "details",
                        "La presentación del producto no existe o está inactiva"
                ));

        boolean active = Boolean.TRUE.equals(presentation.getIsActive())
                && Boolean.TRUE.equals(presentation.getProduct().getIsActive());

        if (!active) {
            throw new InvalidFieldException(
                    "details",
                    "La presentación del producto no existe o está inactiva"
            );
        }

        return presentation;
    }

    private BigDecimal resolveUnitPrice(
            ProductPresentation presentation,
            BigDecimal requestedPrice
    ) {

        if (requestedPrice != null) {
            return requestedPrice.setScale(2, RoundingMode.HALF_UP);
        }

        ProductPrice currentPrice = productPriceRepository
                .findByProductPresentationIdAndEndDateIsNull(presentation.getId())
                .orElseThrow(() -> new InvalidFieldException(
                        "details",
                        "La presentación " + presentation.getPresentation().getName()
                                + " del producto " + presentation.getProduct().getName()
                                + " no tiene un precio vigente"
                ));

        return currentPrice.getPrice().setScale(2, RoundingMode.HALF_UP);
    }

    private void validateCreditCustomer(String paymentCondition, Customer customer) {

        if (CONDITION_CREDIT.equals(paymentCondition) && customer == null) {
            throw new InvalidFieldException(
                    "customerId",
                    "Una venta a crédito requiere un cliente registrado"
            );
        }
    }

    private void validateCreditOnConfirm(Sale sale) {

        Customer customer = sale.getCustomer();

        if (customer != null && !Boolean.TRUE.equals(customer.getIsActive())) {
            throw new ResourceConflictException(
                    "El cliente de la venta está inactivo"
            );
        }

        if (!CONDITION_CREDIT.equals(sale.getPaymentCondition())) {
            return;
        }

        if (customer == null) {
            throw new ResourceConflictException(
                    "Una venta a crédito requiere un cliente registrado"
            );
        }

        if (customer.getCreditDays() == null || customer.getCreditDays() <= 0) {
            throw new ResourceConflictException(
                    "El cliente no tiene días de crédito configurados"
            );
        }

        BigDecimal balance = customerRepository
                .sumOutstandingBalanceByCustomerId(customer.getId());

        BigDecimal outstanding = balance == null ? ZERO : balance;

        BigDecimal creditLimit = customer.getCreditLimit() == null
                ? ZERO
                : customer.getCreditLimit();

        if (outstanding.add(sale.getTotal()).compareTo(creditLimit) > 0) {
            throw new ResourceConflictException(
                    "La venta supera el límite de crédito del cliente. "
                            + "Saldo pendiente: " + outstanding.toPlainString()
                            + ", límite: " + creditLimit.toPlainString()
            );
        }
    }

    // ------------------------------------------------------------------
    // Visibilidad y utilidades
    // ------------------------------------------------------------------

    private void assertCanView(Sale sale, Long requesterId, boolean canViewAll) {

        if (canViewAll) {
            return;
        }

        if (!sale.getUser().getId().equals(requesterId)) {
            throw new AccessDeniedException(
                    "No tienes permiso para ver esta venta"
            );
        }
    }

    private void assertCanManage(Sale sale, Long requesterId, boolean canManageAll) {

        if (canManageAll) {
            return;
        }

        if (!sale.getUser().getId().equals(requesterId)) {
            throw new AccessDeniedException(
                    "No tienes permiso para modificar esta venta"
            );
        }
    }

    private String normalizeStatus(String status) {

        String normalized = status.trim().toUpperCase(Locale.ROOT);

        if (!VALID_STATUSES.contains(normalized)) {
            throw new InvalidFieldException(
                    "status",
                    "El estado debe ser DRAFT, CONFIRMED o CANCELLED"
            );
        }

        return normalized;
    }

    private String normalizePaymentMethod(String paymentMethod) {

        if (paymentMethod == null || paymentMethod.isBlank()) {
            return null;
        }

        return paymentMethod.trim().toUpperCase(Locale.ROOT);
    }

    private String normalize(String value) {

        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }

    private String productName(SaleDetail detail) {

        return detail.getProductPresentation().getProduct().getName()
                + " (" + detail.getProductPresentation().getPresentation().getName() + ")";
    }

    private Map<Long, Invoice> invoicesBySale(List<Sale> sales) {

        List<Long> saleIds = sales.stream()
                .map(Sale::getId)
                .filter(Objects::nonNull)
                .toList();

        if (saleIds.isEmpty()) {
            return Map.of();
        }

        return invoiceRepository.findBySaleIdIn(saleIds)
                .stream()
                .filter(invoice -> invoice.getSale() != null)
                .collect(Collectors.toMap(
                        invoice -> invoice.getSale().getId(),
                        Function.identity(),
                        (first, ignored) -> first
                ));
    }

    private ResourceNotFoundException saleNotFound(Long id) {

        return new ResourceNotFoundException(
                "No se encontró la venta con ID: " + id
        );
    }
}
