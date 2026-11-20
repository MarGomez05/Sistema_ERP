package com.tamachihua_erp.api.repository;

import com.tamachihua_erp.api.entity.Invoice;
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

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.time.LocalDate;

// Facturas y notas de crédito (V4, contrato §12).
public interface InvoiceRepository
        extends JpaRepository<Invoice, Long>,
        JpaSpecificationExecutor<Invoice> {

    // Listado con el usuario emisor para evitar N+1.
    @Override
    @EntityGraph(attributePaths = "createdBy")
    Page<Invoice> findAll(Specification<Invoice> specification, Pageable pageable);

    // Detalle con snapshot de líneas y referencias.
    @EntityGraph(attributePaths = {
            "createdBy",
            "cancelledBy",
            "relatedInvoice",
            "details"
    })
    @Query("select distinct i from Invoice i where i.id = :id")
    Optional<Invoice> findDetailedById(@Param("id") Long id);

    // Serializa pagos y notas de crédito sobre la misma factura.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from Invoice i where i.id = :id")
    Optional<Invoice> findByIdForUpdate(@Param("id") Long id);

    // Una venta solo puede tener una factura (índice único parcial).
    boolean existsBySaleId(Long saleId);

    boolean existsByControlNumber(String controlNumber);

    Optional<Invoice> findBySaleId(Long saleId);

    // Facturas de varias ventas en una sola consulta para el listado.
    @Query("select i from Invoice i where i.sale.id in :saleIds")
    List<Invoice> findBySaleIdIn(@Param("saleIds") Collection<Long> saleIds);

    // Cuentas por cobrar: facturas emitidas con saldo, sin notas de crédito.
    @Query("""
            select i from Invoice i
            where i.status = 'ISSUED'
              and i.invoiceType <> 'CREDIT_NOTE'
              and i.total > i.paidTotal
              and i.issueDate <= :asOf
            order by i.issueDate asc, i.id asc
            """)
    List<Invoice> findReceivables(@Param("asOf") LocalDate asOf);
}
