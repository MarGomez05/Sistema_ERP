package com.tamachihua_erp.api.repository;

import com.tamachihua_erp.api.entity.InvoicePayment;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

// Pagos aplicados a facturas (V4, contrato §12.2).
public interface InvoicePaymentRepository
        extends JpaRepository<InvoicePayment, Long> {

    @EntityGraph(attributePaths = "user")
    List<InvoicePayment> findByInvoiceIdOrderByPaymentDateDescIdDesc(Long invoiceId);

    @Query("""
            select coalesce(sum(p.amount), 0)
            from InvoicePayment p
            where p.invoice.id = :invoiceId
            """)
    BigDecimal sumByInvoiceId(@Param("invoiceId") Long invoiceId);
}
