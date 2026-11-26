package com.tamachihua_erp.api.integration;

import com.tamachihua_erp.api.dto.sale.SaleResponseDto;
import com.tamachihua_erp.api.entity.User;
import com.tamachihua_erp.api.exception.InsufficientStockException;
import com.tamachihua_erp.api.repository.ProductLotRepository;
import com.tamachihua_erp.api.repository.SaleRepository;
import com.tamachihua_erp.api.service.SaleService;
import com.tamachihua_erp.api.support.AbstractIntegrationTest;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDate;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Concurrencia de ventas: dos confirmaciones simultáneas sobre el mismo lote
 * no pueden sobrevender (bloqueo pesimista de product_lots).
 */
class SaleConcurrencyIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private SaleService saleService;

    @Autowired
    private ProductLotRepository productLotRepository;

    @Autowired
    private SaleRepository saleRepository;

    @Test
    void dosConfirmacionesSimultaneasSobreElMismoLoteNoSobreveenden() throws Exception {

        var base = data.seedBaseData();
        var fixture = data.createProductFixture("CONC", base.admin());

        var lot = data.lot(
                fixture.presentation(),
                base.supplier(),
                base.admin(),
                "L-UNICO",
                LocalDate.now().plusDays(30),
                "10",
                "10",
                "10.00"
        );

        Long firstSale = data.createDraftSale(base.seller(), fixture.presentation(), "6");
        Long secondSale = data.createDraftSale(base.seller(), fixture.presentation(), "6");

        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);

        try {
            Future<Object> first = executor.submit(
                    confirmWhenReady(firstSale, base.admin(), ready, start)
            );
            Future<Object> second = executor.submit(
                    confirmWhenReady(secondSale, base.admin(), ready, start)
            );

            assertThat(ready.await(10, TimeUnit.SECONDS))
                    .as("los dos hilos deben quedar listos")
                    .isTrue();

            start.countDown();

            List<Object> results = List.of(
                    first.get(30, TimeUnit.SECONDS),
                    second.get(30, TimeUnit.SECONDS)
            );

            long confirmed = results.stream()
                    .filter(SaleResponseDto.class::isInstance)
                    .count();

            long rejected = results.stream()
                    .filter(InsufficientStockException.class::isInstance)
                    .count();

            assertThat(confirmed)
                    .as("solo una venta puede confirmarse")
                    .isEqualTo(1);

            assertThat(rejected)
                    .as("la otra debe rechazarse por stock insuficiente")
                    .isEqualTo(1);
        } finally {
            executor.shutdownNow();
        }

        // El stock final es 10 - 6 = 4, nunca negativo.
        assertThat(productLotRepository.findById(lot.getId()).orElseThrow()
                .getAvailableQuantity())
                .isEqualByComparingTo("4");

        long confirmedSales = saleRepository.findAll().stream()
                .filter(sale -> "CONFIRMED".equals(sale.getStatus()))
                .count();

        long draftSales = saleRepository.findAll().stream()
                .filter(sale -> "DRAFT".equals(sale.getStatus()))
                .count();

        assertThat(confirmedSales).isEqualTo(1);
        assertThat(draftSales).isEqualTo(1);
    }

    private Callable<Object> confirmWhenReady(
            Long saleId,
            User admin,
            CountDownLatch ready,
            CountDownLatch start
    ) {
        return () -> {
            ready.countDown();

            if (!start.await(10, TimeUnit.SECONDS)) {
                throw new IllegalStateException("No se liberó la barrera de inicio");
            }

            try {
                return saleService.confirm(saleId, admin.getId(), true);
            } catch (RuntimeException exception) {
                return exception;
            }
        };
    }
}
