package com.tamachihua_erp.api.repository;

import com.tamachihua_erp.api.entity.Sale;
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
}
