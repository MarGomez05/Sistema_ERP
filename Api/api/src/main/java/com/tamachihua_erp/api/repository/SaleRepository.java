package com.tamachihua_erp.api.repository;

import com.tamachihua_erp.api.entity.Sale;
import com.tamachihua_erp.api.repository.projection.SaleReportProjection;
import com.tamachihua_erp.api.repository.projection.TopProductProjection;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

// Ventas del ERP (V3, contrato §11).
public interface SaleRepository
        extends JpaRepository<Sale, Long>,
        JpaSpecificationExecutor<Sale> {

    // Listado con cliente y vendedor para evitar N+1.
    @Override
    @EntityGraph(attributePaths = {"customer", "user"})
    Page<Sale> findAll(Specification<Sale> specification, Pageable pageable);

    // Detalle con líneas y datos de producto/presentación.
    @EntityGraph(attributePaths = {
            "customer",
            "user",
            "details",
            "details.productPresentation",
            "details.productPresentation.product",
            "details.productPresentation.presentation"
    })
    @Query("select distinct s from Sale s where s.id = :id")
    Optional<Sale> findDetailedById(@Param("id") Long id);

    // Bloquea la venta al confirmar o cancelar y evita dobles operaciones.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from Sale s where s.id = :id")
    Optional<Sale> findByIdForUpdate(@Param("id") Long id);

    // Una venta facturada no se cancela directamente (D-04, contrato §11).
    @Query(value = """
            SELECT COUNT(*) > 0
            FROM invoices i
            WHERE i.sale_id = :saleId
              AND i.status = 'ISSUED'
            """, nativeQuery = true)
    boolean existsIssuedInvoiceBySaleId(@Param("saleId") Long saleId);

    // Reporte de ventas por período: solo ventas confirmadas.
    @Query("""
            select s.saleDate as saleDate,
                   s.subtotal as subtotal,
                   s.discountTotal as discountTotal,
                   s.taxTotal as taxTotal,
                   s.total as total
            from Sale s
            where s.status = 'CONFIRMED'
              and s.saleDate >= :from
              and s.saleDate < :to
            order by s.saleDate asc
            """)
    List<SaleReportProjection> findConfirmedForReport(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to
    );

    // Productos más vendidos por cantidad, con desempate por importe.
    @Query(value = """
            SELECT p.id AS "productId",
                   p.code AS "productCode",
                   p.name AS "productName",
                   SUM(sd.quantity) AS "quantity",
                   SUM(sd.line_total) AS "total",
                   COUNT(DISTINCT s.id) AS "salesCount"
            FROM sale_details sd
            JOIN sales s ON s.id = sd.sale_id
            JOIN product_presentations pp ON pp.id = sd.product_presentation_id
            JOIN products p ON p.id = pp.product_id
            WHERE s.status = 'CONFIRMED'
              AND s.sale_date >= :from
              AND s.sale_date < :to
            GROUP BY p.id, p.code, p.name
            ORDER BY SUM(sd.quantity) DESC, SUM(sd.line_total) DESC
            LIMIT :limit
            """, nativeQuery = true)
    List<TopProductProjection> findTopProducts(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            @Param("limit") int limit
    );
}
