package com.tamachihua_erp.api.exception;

// Stock vendible insuficiente al confirmar una venta (contrato §11: 409 INSUFFICIENT_STOCK).
public class InsufficientStockException extends RuntimeException {

    public InsufficientStockException(String message) {
        super(message);
    }
}
