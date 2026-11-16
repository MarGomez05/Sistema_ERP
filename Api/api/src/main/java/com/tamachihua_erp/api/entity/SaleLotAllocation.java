package com.tamachihua_erp.api.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

// Lote consumido por una línea de venta (FEFO). Tabla sale_lot_allocations (V3).
// Permite devolver las cantidades al lote correcto cuando la venta se cancela.
@Entity
@Table(name = "sale_lot_allocations")
@Getter
@Setter
@NoArgsConstructor
public class SaleLotAllocation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sale_detail_id", nullable = false)
    private SaleDetail saleDetail;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_lot_id", nullable = false)
    private ProductLot productLot;

    @Column(name = "quantity", nullable = false, precision = 12, scale = 2)
    private BigDecimal quantity;

    // Costo unitario congelado del lote. Solo uso interno.
    @Column(name = "unit_cost", nullable = false, precision = 10, scale = 2)
    private BigDecimal unitCost;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public SaleLotAllocation(ProductLot productLot, BigDecimal quantity, BigDecimal unitCost) {
        this.productLot = productLot;
        this.quantity = quantity;
        this.unitCost = unitCost;
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
