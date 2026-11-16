package com.tamachihua_erp.api.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

// Factura emitida. Tabla invoices (V4). Es inmutable: se cancela con nota de crédito.
@Entity
@Table(name = "invoices")
@Getter
@Setter
@NoArgsConstructor
public class Invoice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "invoice_number", nullable = false, length = 30)
    private String invoiceNumber;

    // Número de control para CCF preimpreso. Opcional y único.
    @Column(name = "control_number", length = 30)
    private String controlNumber;

    // CONSUMER, CCF o CREDIT_NOTE.
    @Column(name = "invoice_type", nullable = false, length = 20)
    private String invoiceType;

    // Nulo en notas de crédito.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sale_id")
    private Sale sale;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    private Customer customer;

    // Factura original cuando el documento es nota de crédito.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "related_invoice_id")
    private Invoice relatedInvoice;

    @Column(name = "issue_date", nullable = false)
    private LocalDate issueDate;

    @Column(name = "due_date")
    private LocalDate dueDate;

    // DRAFT, ISSUED o CANCELLED.
    @Column(name = "status", nullable = false, length = 20)
    private String status;

    // CASH o CREDIT.
    @Column(name = "payment_condition", nullable = false, length = 20)
    private String paymentCondition;

    @Column(name = "subtotal", nullable = false, precision = 12, scale = 2)
    private BigDecimal subtotal;

    @Column(name = "discount_total", nullable = false, precision = 12, scale = 2)
    private BigDecimal discountTotal;

    @Column(name = "tax_total", nullable = false, precision = 12, scale = 2)
    private BigDecimal taxTotal;

    @Column(name = "total", nullable = false, precision = 12, scale = 2)
    private BigDecimal total;

    @Column(name = "paid_total", nullable = false, precision = 12, scale = 2)
    private BigDecimal paidTotal;

    // Snapshot fiscal del cliente al emitir.
    @Column(name = "customer_name", nullable = false, length = 200)
    private String customerName;

    @Column(name = "customer_document_type", length = 10)
    private String customerDocumentType;

    @Column(name = "customer_document_number", length = 20)
    private String customerDocumentNumber;

    @Column(name = "customer_nit", length = 17)
    private String customerNit;

    @Column(name = "customer_nrc", length = 10)
    private String customerNrc;

    @Column(name = "customer_address", length = 255)
    private String customerAddress;

    @Column(name = "customer_email", length = 150)
    private String customerEmail;

    @Column(name = "notes", length = 255)
    private String notes;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cancelled_by")
    private User cancelledBy;

    @Column(name = "cancel_reason", length = 255)
    private String cancelReason;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private List<InvoiceDetail> details = new ArrayList<>();

    public void addDetail(InvoiceDetail detail) {
        details.add(detail);
        detail.setInvoice(this);
    }

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();

        if (createdAt == null) {
            createdAt = now;
        }

        if (updatedAt == null) {
            updatedAt = now;
        }

        if (status == null) {
            status = "ISSUED";
        }

        if (subtotal == null) {
            subtotal = BigDecimal.ZERO;
        }

        if (discountTotal == null) {
            discountTotal = BigDecimal.ZERO;
        }

        if (taxTotal == null) {
            taxTotal = BigDecimal.ZERO;
        }

        if (total == null) {
            total = BigDecimal.ZERO;
        }

        if (paidTotal == null) {
            paidTotal = BigDecimal.ZERO;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
