package com.tamachihua_erp.api.integration;

import com.tamachihua_erp.api.support.AbstractIntegrationTest;
import com.tamachihua_erp.api.support.TestDataFactory;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.springframework.http.HttpHeaders.AUTHORIZATION;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Login real contra la base de datos: credenciales, token y endpoint /me.
 * También confirma que el encabezado X-Client-Interface ya no se usa.
 */
class AuthLoginIntegrationTest extends AbstractIntegrationTest {

    @Test
    void loginConCredencialesValidasDevuelveTokenYUsuario() throws Exception {

        data.seedBaseData();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(APPLICATION_JSON)
                        .content(credentials("admin.test", TestDataFactory.PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.expiresIn").value(3600))
                .andExpect(jsonPath("$.user.username").value("admin.test"))
                .andExpect(jsonPath("$.user.role").value("ADMIN"));
    }

    @Test
    void loginConCorreoElectronicoTambienFunciona() throws Exception {

        data.seedBaseData();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(APPLICATION_JSON)
                        .content(credentials("compras.test@test.local", TestDataFactory.PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.role").value("PURCHASING"));
    }

    @Test
    void loginConContrasenaIncorrectaDevuelve401() throws Exception {

        data.seedBaseData();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(APPLICATION_JSON)
                        .content(credentials("admin.test", "incorrecta")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void loginDeUsuarioInactivoDevuelve401() throws Exception {

        var base = data.seedBaseData();
        data.user("inactivo.test", base.seller().getRole(), false);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(APPLICATION_JSON)
                        .content(credentials("inactivo.test", TestDataFactory.PASSWORD)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void meDevuelveLosDatosDelToken() throws Exception {

        var base = data.seedBaseData();

        mockMvc.perform(get("/api/auth/me")
                        .header(AUTHORIZATION, data.bearer(base.seller())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(base.seller().getId()))
                .andExpect(jsonPath("$.username").value("ventas.test"))
                .andExpect(jsonPath("$.fullName").value("Usuario ventas.test"))
                .andExpect(jsonPath("$.role").value("SELLER"));
    }

    @Test
    void meSinTokenDevuelve401() throws Exception {

        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void elEncabezadoXClientInterfaceSeIgnora() throws Exception {

        data.seedBaseData();

        // El cliente Angular no lo envía; si llega, ya no cambia el resultado.
        mockMvc.perform(post("/api/auth/login")
                        .header("X-Client-Interface", "app")
                        .contentType(APPLICATION_JSON)
                        .content(credentials("ventas.test", TestDataFactory.PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.role").value("SELLER"));
    }

    private String credentials(String username, String password) throws Exception {
        return objectMapper.writeValueAsString(Map.of(
                "username", username,
                "password", password
        ));
    }
}
