package com.tamachihua_erp.api.repository;

import com.tamachihua_erp.api.entity.ProductPresentation;
import com.tamachihua_erp.api.repository.projection.LowStockProjection;
import com.tamachihua_erp.api.repository.projection.StockReportProjection;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.time.LocalDate;

public interface ProductPresentationRepository
        extends JpaRepository<ProductPresentation, Long> {

    // Presentaciones de un producto (panel), incluye inactivas
    @EntityGraph(attributePaths = {"presentation", "presentation.measureUnit"})
    List<ProductPresentation> findByProductIdOrderByPresentationNameAsc(Long productId);

    // Presentaciones activas de un producto (app y stock del listado)
    @EntityGraph(attributePaths = {"presentation", "presentation.measureUnit"})
    List<ProductPresentation> findByProductIdAndIsActiveTrueOrderByPresentationNameAsc(Long productId);

    // Presentaciones activas de varios productos (evita N+1 en el listado)
    @EntityGraph(attributePaths = {"presentation", "presentation.measureUnit"})
    List<ProductPresentation> findByProductIdInAndIsActiveTrueOrderByPresentationNameAsc(
            Collection<Long> productIds
    );

    // Verifica que la presentación del producto pertenezca al producto de la ruta
    Optional<ProductPresentation> findByProductIdAndId(Long productId, Long id);

    // Presentación con producto y presentación base, para registrar un lote
    @EntityGraph(attributePaths = {"product", "presentation", "presentation.measureUnit"})
    @Query("select pp from ProductPresentation pp where pp.id = :id")
    Optional<ProductPresentation> findDetailedById(@Param("id") Long id);

    // Combinación producto + presentación única (uq_product_presentations_product_presentation)
    boolean existsByProductIdAndPresentationId(Long productId, Long presentationId);

    // Código único en todo el sistema (uq_product_presentations_code)
    boolean existsByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCaseAndIdNot(String code, Long id);

    // Bloquea la fila de la presentación al cambiar el precio (contrato 5.3)
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select pp from ProductPresentation pp where pp.id = :id")
    Optional<ProductPresentation> findByIdForUpdate(@Param("id") Long id);

    // Búsqueda de la app por código exacto de presentación (sin distinguir mayúsculas)
    @Query("""
            select distinct pp.product.id
            from ProductPresentation pp
            where lower(pp.code) = lower(:code)
            """)
    List<Long> findProductIdsByPresentationCode(@Param("code") String code);

    // Bajo stock: existencia derivada de lotes activos <= stock mínimo (HU-12)
    @Query(value = """
            SELECT p.id AS "productId",
                   p.code AS "productCode",
                   p.name AS "productName",
                   pr.name AS "presentationName",
                   COALESCE((
                       SELECT SUM(l.available_quantity)
                       FROM product_lots l
                       WHERE l.product_presentation_id = pp.id
                         AND l.is_active = TRUE
                         AND l.available_quantity > 0
                   ), 0) AS "currentStock",
                   pp.min_stock AS "minStock"
            FROM product_presentations pp
            JOIN products p ON p.id = pp.product_id
            JOIN presentations pr ON pr.id = pp.presentation_id
            WHERE pp.is_active = TRUE
              AND p.is_active = TRUE
              AND COALESCE((
                    SELECT SUM(l.available_quantity)
                    FROM product_lots l
                    WHERE l.product_presentation_id = pp.id
                      AND l.is_active = TRUE
                      AND l.available_quantity > 0
              ), 0) <= pp.min_stock
            ORDER BY p.name ASC, pr.name ASC
            """, countQuery = """
            SELECT COUNT(*)
            FROM product_presentations pp
            JOIN products p ON p.id = pp.product_id
            WHERE pp.is_active = TRUE
              AND p.is_active = TRUE
              AND COALESCE((
                    SELECT SUM(l.available_quantity)
                    FROM product_lots l
                    WHERE l.product_presentation_id = pp.id
                      AND l.is_active = TRUE
                      AND l.available_quantity > 0
              ), 0) <= pp.min_stock
            """, nativeQuery = true)
    Page<LowStockProjection> findLowStock(Pageable pageable);

    @Query(value = """
            SELECT p.id AS "productId",
                   p.code AS "productCode",
                   p.name AS "productName",
                   pr.name AS "presentationName",
                   COALESCE((
                       SELECT SUM(l.available_quantity)
                       FROM product_lots l
                       WHERE l.product_presentation_id = pp.id
                         AND l.is_active = TRUE
                         AND l.available_quantity > 0
                   ), 0) AS "currentStock",
                   pp.min_stock AS "minStock"
            FROM product_presentations pp
            JOIN products p ON p.id = pp.product_id
            JOIN presentations pr ON pr.id = pp.presentation_id
            WHERE pp.is_active = TRUE
              AND p.is_active = TRUE
              AND COALESCE((
                    SELECT SUM(l.available_quantity)
                    FROM product_lots l
                    WHERE l.product_presentation_id = pp.id
                      AND l.is_active = TRUE
                      AND l.available_quantity > 0
              ), 0) <= pp.min_stock
            ORDER BY p.name ASC, pr.name ASC
            """, nativeQuery = true)
    List<LowStockProjection> findLowStockList();

    @Query(value = """
            SELECT COUNT(*)
            FROM product_presentations pp
            JOIN products p ON p.id = pp.product_id
            WHERE pp.is_active = TRUE
              AND p.is_active = TRUE
              AND COALESCE((
                    SELECT SUM(l.available_quantity)
                    FROM product_lots l
                    WHERE l.product_presentation_id = pp.id
                      AND l.is_active = TRUE
                      AND l.available_quantity > 0
              ), 0) <= pp.min_stock
            """, nativeQuery = true)
    long countLowStock();

    // Reporte de existencias: física, vendible (excluye vencidos), mínimo y precio vigente.
    @Query(value = """
            SELECT pp.id AS "productPresentationId",
                   p.code AS "productCode",
                   p.name AS "productName",
                   pr.name AS "presentationName",
                   COALESCE((
                       SELECT SUM(l.available_quantity)
                       FROM product_lots l
                       WHERE l.product_presentation_id = pp.id
                         AND l.is_active = TRUE
                         AND l.available_quantity > 0
                   ), 0) AS "physicalStock",
                   COALESCE((
                       SELECT SUM(l.available_quantity)
                       FROM product_lots l
                       WHERE l.product_presentation_id = pp.id
                         AND l.is_active = TRUE
                         AND l.available_quantity > 0
                         AND (l.expiration_date IS NULL OR l.expiration_date >= :today)
                   ), 0) AS "sellableStock",
                   pp.min_stock AS "minStock",
                   (SELECT prc.price
                    FROM product_prices prc
                    WHERE prc.product_presentation_id = pp.id
                      AND prc.end_date IS NULL) AS "currentPrice"
            FROM product_presentations pp
            JOIN products p ON p.id = pp.product_id
            JOIN presentations pr ON pr.id = pp.presentation_id
            WHERE pp.is_active = TRUE
              AND p.is_active = TRUE
              AND (:categoryId IS NULL OR p.product_category_id = :categoryId)
            ORDER BY p.name ASC, pr.name ASC
            """, nativeQuery = true)
    List<StockReportProjection> findStockReport(
            @Param("categoryId") Long categoryId,
            @Param("today") LocalDate today
    );
}
