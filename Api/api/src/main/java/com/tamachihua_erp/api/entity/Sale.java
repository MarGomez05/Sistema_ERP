package com.tamachihua_erp.api.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

// Venta del ERP. Tabla sales (V3). Estado: DRAFT → CONFIRMED → CANCELLED.
@Entity
@Table(name = "sales")
@Getter
@Setter
@NoArgsConstructor
public class Sale {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "sale_number", nullable = false, length = 30)
    private String saleNumber;

    // Nulo para consumidor final.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    private Customer customer;

    // Vendedor tomado del JWT, nunca del body.
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "sale_date", nullable = false)
    private LocalDateTime saleDate;

    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "payment_condition", nullable = false, length = 20)
    private String paymentCondition;

    @Column(name = "payment_method", length = 20)
    private String paymentMethod;

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

    @Column(name = "notes", length = 255)
    private String notes;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cancelled_by")
    private User cancelledBy;

    @Column(name = "cancel_reason", length = 255)
    private String cancelReason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "sale", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private List<SaleDetail> details = new ArrayList<>();

    public void addDetail(SaleDetail detail) {
        details.add(detail);
        detail.setSale(this);
    }

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();

        if (saleDate == null) {
            saleDate = now;
        }

        if (createdAt == null) {
            createdAt = now;
        }

        if (updatedAt == null) {
            updatedAt = now;
        }

        if (status == null) {
            status = "DRAFT";
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
