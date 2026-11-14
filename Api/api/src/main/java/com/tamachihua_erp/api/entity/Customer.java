package com.tamachihua_erp.api.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

// Cliente natural o jurídico. Tabla customers (Endpoints-API.md §10).
@Entity
@Table(name = "customers")
@Getter
@Setter
@NoArgsConstructor
public class Customer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // NATURAL o BUSINESS
    @Column(name = "customer_type", nullable = false, length = 20)
    private String customerType;

    @Column(name = "document_type", length = 10)
    private String documentType;

    @Column(name = "document_number", length = 20)
    private String documentNumber;

    @Column(name = "legal_name", nullable = false, length = 200)
    private String legalName;

    @Column(name = "trade_name", length = 200)
    private String tradeName;

    @Column(name = "nit", length = 17)
    private String nit;

    @Column(name = "nrc", length = 10)
    private String nrc;

    @Column(name = "dui", length = 10)
    private String dui;

    @Column(name = "address", length = 255)
    private String address;

    @Column(name = "phone", length = 20)
    private String phone;

    @Column(name = "email", length = 150)
    private String email;

    @Column(name = "credit_limit", nullable = false, precision = 12, scale = 2)
    private BigDecimal creditLimit;

    @Column(name = "credit_days", nullable = false)
    private Integer creditDays;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();

        if (createdAt == null) {
            createdAt = now;
        }

        if (updatedAt == null) {
            updatedAt = now;
        }

        if (isActive == null) {
            isActive = true;
        }

        if (creditLimit == null) {
            creditLimit = BigDecimal.ZERO;
        }

        if (creditDays == null) {
            creditDays = 0;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
