package com.tamachihua_erp.api.support;

import com.tamachihua_erp.api.TestcontainersConfiguration;
import tools.jackson.databind.ObjectMapper;

import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Base para las pruebas de integración.
 *
 * <p>Usa el perfil {@code test}. El datasource sale de Testcontainers o, sin
 * Docker, de las variables {@code TEST_DB_*} con {@code TEST_DB_MODE=local-pg}.
 * Antes de cada prueba se vacía el esquema para partir de un estado conocido.</p>
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import({TestcontainersConfiguration.class, TestDataFactory.class})
public abstract class AbstractIntegrationTest {

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected ObjectMapper objectMapper;

    @Autowired
    protected TestDataFactory data;

    @BeforeEach
    void resetDatabase() {
        data.reset();
    }
}
