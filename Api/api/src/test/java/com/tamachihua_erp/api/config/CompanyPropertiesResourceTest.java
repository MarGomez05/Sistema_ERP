package com.tamachihua_erp.api.config;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;

// Protege la codificación de los valores por defecto de la empresa.
// Spring Boot lee los .properties como ISO-8859-1, así que las tildes deben
// escribirse con escapes Unicode o se imprimen como mojibake en el PDF.
class CompanyPropertiesResourceTest {

    @Test
    void elValorPorDefectoDeLaDireccionConservaLaTilde() throws IOException {

        Properties properties = new Properties();

        try (InputStream input = getClass().getClassLoader()
                .getResourceAsStream("application.properties")) {

            assertThat(input).isNotNull();
            properties.load(input);
        }

        assertThat(properties.getProperty("app.company.address"))
                .isEqualTo("${COMPANY_ADDRESS:Lourdes Colón, La Libertad}");
    }
}
