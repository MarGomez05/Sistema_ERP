package com.tamachihua_erp.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

// Datos fiscales y de contacto de la empresa que se imprimen en los PDF.
@ConfigurationProperties(prefix = "app.company")
public record CompanyProperties(

        String name,
        String nit,
        String nrc,
        String address,
        String phone,
        String email
) {
}
