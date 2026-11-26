package com.tamachihua_erp.api;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * PostgreSQL para las pruebas.
 *
 * Por defecto se levanta un contenedor (modo {@code container}). Para trabajar
 * sin Docker se usa {@code TEST_DB_MODE=local-pg} y las variables
 * {@code TEST_DB_URL}, {@code TEST_DB_USERNAME} y {@code TEST_DB_PASSWORD}.
 */
@TestConfiguration(proxyBeanMethods = false)
public class TestcontainersConfiguration {

	@Bean
	@ServiceConnection
	@ConditionalOnProperty(
			name = "test.db.mode",
			havingValue = "container",
			matchIfMissing = true
	)
	PostgreSQLContainer postgresContainer() {
		return new PostgreSQLContainer(DockerImageName.parse("postgres:latest"));
	}

}
