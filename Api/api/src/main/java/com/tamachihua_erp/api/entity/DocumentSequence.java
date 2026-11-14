package com.tamachihua_erp.api.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

// Correlativo por tipo de documento y año. Tabla document_sequences (V3).
// Se lee con bloqueo pesimista antes de incrementar el número.
@Entity
@Table(name = "document_sequences")
@Getter
@Setter
@NoArgsConstructor
public class DocumentSequence {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // SALE, INVOICE, CCF o CREDIT_NOTE
    @Column(name = "document_type", nullable = false, length = 20)
    private String documentType;

    @Column(name = "prefix", nullable = false, length = 10)
    private String prefix;

    @Column(name = "year", nullable = false)
    private Integer year;

    @Column(name = "current_number", nullable = false)
    private Long currentNumber;

    @Column(name = "version", nullable = false)
    private Long version;

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

        if (currentNumber == null) {
            currentNumber = 0L;
        }

        if (version == null) {
            version = 0L;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
