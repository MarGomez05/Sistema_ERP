package com.tamachihua_erp.api.service;

// Genera números consecutivos por tipo de documento y año (V3, Implementacion.md §7).
public interface DocumentSequenceService {

    String nextNumber(String documentType);
}
