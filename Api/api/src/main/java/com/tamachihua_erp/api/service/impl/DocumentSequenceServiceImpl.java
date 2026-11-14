package com.tamachihua_erp.api.service.impl;

import com.tamachihua_erp.api.entity.DocumentSequence;
import com.tamachihua_erp.api.repository.DocumentSequenceRepository;
import com.tamachihua_erp.api.service.DocumentSequenceService;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DocumentSequenceServiceImpl implements DocumentSequenceService {

    private static final Map<String, String> PREFIXES = Map.of(
            "SALE", "V-",
            "INVOICE", "F-",
            "CCF", "CCF-",
            "CREDIT_NOTE", "NC-"
    );

    private final DocumentSequenceRepository repository;

    @Override
    @Transactional
    public String nextNumber(String documentType) {

        String prefix = PREFIXES.get(documentType);

        if (prefix == null) {
            throw new IllegalArgumentException(
                    "Tipo de documento no soportado: " + documentType
            );
        }

        int year = LocalDate.now().getYear();

        // Crea la fila del año si no existe; luego se bloquea para serializar.
        repository.ensureExists(documentType, prefix, year);

        DocumentSequence sequence = repository.findForUpdate(documentType, year)
                .orElseThrow(() -> new IllegalStateException(
                        "No se pudo obtener la secuencia del documento " + documentType
                ));

        long next = sequence.getCurrentNumber() + 1;

        sequence.setCurrentNumber(next);

        repository.save(sequence);

        return prefix + year + "-" + String.format(Locale.ROOT, "%06d", next);
    }
}
