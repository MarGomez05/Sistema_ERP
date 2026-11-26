package com.tamachihua_erp.api.integration;

import com.tamachihua_erp.api.exception.InsufficientStockException;
import com.tamachihua_erp.api.repository.ProductLotRepository;
import com.tamachihua_erp.api.service.SaleService;
import com.tamachihua_erp.api.support.AbstractIntegrationTest;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Confirmación de ventas con FEFO: primero vence antes, nunca lotes vencidos.
 */
class SaleFefoIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private SaleService saleService;

    @Autowired
    private ProductLotRepository productLotRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void confirmaConsumiendoPrimeroElLoteQueVenceAntes() throws Exception {

        var base = data.seedBaseData();
        var fixture = data.createProductFixture("FEFO", base.admin());

        LocalDate today = LocalDate.now();

        var first = data.lot(fixture.presentation(), base.supplier(), base.admin(),
                "L-A", today.plusDays(10), "5", "5", "10.00");
        var second = data.lot(fixture.presentation(), base.supplier(), base.admin(),
                "L-B", today.plusDays(40), "5", "5", "10.00");
        var noExpiration = data.lot(fixture.presentation(), base.supplier(), base.admin(),
                "L-C", null, "5", "5", "10.00");

        Long saleId = data.createDraftSale(
                base.seller(),
                fixture.presentation(),
                "7"
        );

        saleService.confirm(saleId, base.admin().getId(), true);

        assertThat(available(first.getId())).isEqualByComparingTo("0");
        assertThat(available(second.getId())).isEqualByComparingTo("3");
        assertThat(available(noExpiration.getId())).isEqualByComparingTo("5");

        List<String> allocatedLots = jdbcTemplate.queryForList(
                """
                select l.lot_number
                from sale_lot_allocations a
                join product_lots l on l.id = a.product_lot_id
                join sale_details d on d.id = a.sale_detail_id
                where d.sale_id = ?
                order by a.id
                """,
                String.class,
                saleId
        );

        assertThat(allocatedLots).containsExactly("L-A", "L-B");

        List<BigDecimal> quantities = jdbcTemplate.queryForList(
                """
                select a.quantity
                from sale_lot_allocations a
                join sale_details d on d.id = a.sale_detail_id
                where d.sale_id = ?
                order by a.id
                """,
                BigDecimal.class,
                saleId
        );

        assertThat(quantities)
                .usingElementComparator(BigDecimal::compareTo)
                .containsExactly(new BigDecimal("5.00"), new BigDecimal("2.00"));
    }

    @Test
    void noVendeLotesVencidosAunqueHayaCantidadSuficiente() throws Exception {

        var base = data.seedBaseData();
        var fixture = data.createProductFixture("VENCIDO", base.admin());

        LocalDate today = LocalDate.now();

        var sellable = data.lot(fixture.presentation(), base.supplier(), base.admin(),
                "L-VIGENTE", today.plusDays(30), "5", "5", "10.00");
        var expired = data.lot(fixture.presentation(), base.supplier(), base.admin(),
                "L-VENCIDO", today.minusDays(1), "100", "100", "10.00");

        Long saleId = data.createDraftSale(
                base.seller(),
                fixture.presentation(),
                "20"
        );

        assertThatThrownBy(() -> saleService.confirm(saleId, base.admin().getId(), true))
                .isInstanceOf(InsufficientStockException.class)
                .hasMessageContaining("disponible: 5.00");

        // La venta queda en DRAFT y ningún lote cambia.
        assertThat(available(sellable.getId())).isEqualByComparingTo("5");
        assertThat(available(expired.getId())).isEqualByComparingTo("100");

        assertThat(jdbcTemplate.queryForObject(
                "select status from sales where id = ?",
                String.class,
                saleId
        )).isEqualTo("DRAFT");
    }

    private BigDecimal available(Long lotId) {
        return productLotRepository.findById(lotId)
                .orElseThrow()
                .getAvailableQuantity();
    }
}
