package com.tamachihua_erp.api.customer.repository;

import com.tamachihua_erp.api.customer.entity.Customer;
import com.tamachihua_erp.api.customer.repository.projection.CustomerBalanceProjection;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;

// Clientes naturales y jurídicos (contrato §10).
public interface CustomerRepository
        extends JpaRepository<Customer, Long>,
        JpaSpecificationExecutor<Customer> {

    List<Customer> findAllByIsActiveTrueOrderByLegalNameAsc();

    boolean existsByDocumentNumber(String documentNumber);

    boolean existsByDocumentNumberAndIdNot(String documentNumber, Long id);

    boolean existsByNit(String nit);

    boolean existsByNitAndIdNot(String nit, Long id);

    boolean existsByNrc(String nrc);

    boolean existsByNrcAndIdNot(String nrc, Long id);

    boolean existsByDui(String dui);

    boolean existsByDuiAndIdNot(String dui, Long id);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCaseAndIdNot(String email, Long id);

    // Saldo pendiente de un cliente: facturas emitidas no canceladas.
    @Query(value = """
            SELECT COALESCE(SUM(i.total - i.paid_total), 0) AS "outstandingBalance"
            FROM invoices i
            WHERE i.customer_id = :customerId
              AND i.status = 'ISSUED'
            """, nativeQuery = true)
    BigDecimal sumOutstandingBalanceByCustomerId(@Param("customerId") Long customerId);

    // Saldos de una página de clientes en una sola consulta.
    @Query(value = """
            SELECT i.customer_id AS "customerId",
                   COALESCE(SUM(i.total - i.paid_total), 0) AS "outstandingBalance"
            FROM invoices i
            WHERE i.customer_id IN (:customerIds)
              AND i.status = 'ISSUED'
            GROUP BY i.customer_id
            """, nativeQuery = true)
    List<CustomerBalanceProjection> findOutstandingBalances(
            @Param("customerIds") Collection<Long> customerIds
    );
}
