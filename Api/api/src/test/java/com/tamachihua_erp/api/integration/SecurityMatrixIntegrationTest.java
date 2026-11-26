package com.tamachihua_erp.api.integration;

import com.tamachihua_erp.api.entity.User;
import com.tamachihua_erp.api.support.AbstractIntegrationTest;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.springframework.http.HttpHeaders.AUTHORIZATION;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Matriz de seguridad por rol sobre endpoints reales (SecurityConfig).
 * Cada caso verifica que el rol recibe 200 o 403 según el contrato.
 */
class SecurityMatrixIntegrationTest extends AbstractIntegrationTest {

    @Test
    void laMatrizDeRolesSeCumpleEnLosEndpointsPrincipales() throws Exception {

        var base = data.seedBaseData();

        Map<String, User> users = Map.of(
                "ADMIN", base.admin(),
                "WAREHOUSE", base.warehouse(),
                "PURCHASING", base.purchasing(),
                "SELLER", base.seller()
        );

        List<Case> cases = List.of(
                // Proveedores: ADMIN y PURCHASING
                new Case("/api/suppliers", "ADMIN", 200),
                new Case("/api/suppliers", "PURCHASING", 200),
                new Case("/api/suppliers", "WAREHOUSE", 403),
                new Case("/api/suppliers", "SELLER", 403),

                // Usuarios: solo ADMIN
                new Case("/api/users", "ADMIN", 200),
                new Case("/api/users", "WAREHOUSE", 403),
                new Case("/api/users", "PURCHASING", 403),
                new Case("/api/users", "SELLER", 403),

                // Dashboard: resumen solo ADMIN y WAREHOUSE
                new Case("/api/dashboard/summary", "ADMIN", 200),
                new Case("/api/dashboard/summary", "WAREHOUSE", 200),
                new Case("/api/dashboard/summary", "PURCHASING", 403),
                new Case("/api/dashboard/summary", "SELLER", 403),

                // Bajo stock: ADMIN, WAREHOUSE y PURCHASING
                new Case("/api/dashboard/low-stock", "ADMIN", 200),
                new Case("/api/dashboard/low-stock", "WAREHOUSE", 200),
                new Case("/api/dashboard/low-stock", "PURCHASING", 200),
                new Case("/api/dashboard/low-stock", "SELLER", 403),

                // Reportes de inventario: ADMIN, WAREHOUSE y PURCHASING
                new Case("/api/reports/stock", "ADMIN", 200),
                new Case("/api/reports/stock", "WAREHOUSE", 200),
                new Case("/api/reports/stock", "PURCHASING", 200),
                new Case("/api/reports/stock", "SELLER", 403),

                // Reportes comerciales: ADMIN, PURCHASING y SELLER
                new Case("/api/reports/sales", "ADMIN", 200),
                new Case("/api/reports/sales", "PURCHASING", 200),
                new Case("/api/reports/sales", "SELLER", 200),
                new Case("/api/reports/sales", "WAREHOUSE", 403),

                // Productos: ADMIN, WAREHOUSE y PURCHASING
                new Case("/api/products", "ADMIN", 200),
                new Case("/api/products", "WAREHOUSE", 200),
                new Case("/api/products", "PURCHASING", 200),
                new Case("/api/products", "SELLER", 403),

                // Clientes: ADMIN, PURCHASING y SELLER
                new Case("/api/customers", "ADMIN", 200),
                new Case("/api/customers", "PURCHASING", 200),
                new Case("/api/customers", "SELLER", 200),
                new Case("/api/customers", "WAREHOUSE", 403),

                // Lotes: ADMIN, WAREHOUSE y PURCHASING
                new Case("/api/lots", "ADMIN", 200),
                new Case("/api/lots", "WAREHOUSE", 200),
                new Case("/api/lots", "PURCHASING", 200),
                new Case("/api/lots", "SELLER", 403),

                // Facturas: ADMIN, PURCHASING y SELLER
                new Case("/api/invoices", "ADMIN", 200),
                new Case("/api/invoices", "PURCHASING", 200),
                new Case("/api/invoices", "SELLER", 200),
                new Case("/api/invoices", "WAREHOUSE", 403)
        );

        for (Case testCase : cases) {
            mockMvc.perform(get(testCase.path())
                            .accept(APPLICATION_JSON)
                            .header(AUTHORIZATION, data.bearer(users.get(testCase.role()))))
                    .andExpect(status().is(testCase.expected()));
        }
    }

    @Test
    void sinTokenLosEndpointsProtegidosDevuelven401() throws Exception {

        data.seedBaseData();

        mockMvc.perform(get("/api/suppliers"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/users"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/products"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void losEndpointsDeLaAppMovilYaNoExisten() throws Exception {

        var base = data.seedBaseData();

        // Sin token, la regla general exige autenticación.
        mockMvc.perform(get("/api/app/products"))
                .andExpect(status().isUnauthorized());

        // Con token válido, el recurso ya no está mapeado.
        mockMvc.perform(get("/api/app/products")
                        .header(AUTHORIZATION, data.bearer(base.admin())))
                .andExpect(status().isNotFound());
    }

    private record Case(String path, String role, int expected) {}
}
