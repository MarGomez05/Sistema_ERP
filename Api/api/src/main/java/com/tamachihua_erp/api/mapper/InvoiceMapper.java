package com.tamachihua_erp.api.mapper;

import com.tamachihua_erp.api.dto.billing.InvoiceDetailResponseDto;
import com.tamachihua_erp.api.dto.billing.InvoiceResponseDto;
import com.tamachihua_erp.api.dto.billing.InvoiceSummaryDto;
import com.tamachihua_erp.api.dto.billing.PaymentResponseDto;
import com.tamachihua_erp.api.entity.Invoice;
import com.tamachihua_erp.api.entity.InvoiceDetail;
import com.tamachihua_erp.api.entity.InvoicePayment;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;

@Component
public class InvoiceMapper {

    public InvoiceSummaryDto toSummary(Invoice invoice) {

        return new InvoiceSummaryDto(
                invoice.getId(),
                invoice.getInvoiceNumber(),
                invoice.getInvoiceType(),
                invoice.getStatus(),
                invoice.getIssueDate(),
                invoice.getDueDate(),
                invoice.getSale() != null ? invoice.getSale().getId() : null,
                invoice.getCustomer() != null ? invoice.getCustomer().getId() : null,
                invoice.getCustomerName(),
                invoice.getPaymentCondition(),
                invoice.getSubtotal(),
                invoice.getDiscountTotal(),
                invoice.getTaxTotal(),
                invoice.getTotal(),
                invoice.getPaidTotal(),
                balance(invoice)
        );
    }

    public InvoiceResponseDto toResponse(Invoice invoice) {

        List<InvoiceDetailResponseDto> details = invoice.getDetails()
                .stream()
                .map(this::toDetailResponse)
                .toList();

        Invoice related = invoice.getRelatedInvoice();

        return new InvoiceResponseDto(
                invoice.getId(),
                invoice.getInvoiceNumber(),
                invoice.getControlNumber(),
                invoice.getInvoiceType(),
                invoice.getStatus(),
                invoice.getIssueDate(),
                invoice.getDueDate(),
                invoice.getSale() != null ? invoice.getSale().getId() : null,
                invoice.getCustomer() != null ? invoice.getCustomer().getId() : null,
                related != null ? related.getId() : null,
                related != null ? related.getInvoiceNumber() : null,
                invoice.getPaymentCondition(),
                invoice.getSubtotal(),
                invoice.getDiscountTotal(),
                invoice.getTaxTotal(),
                invoice.getTotal(),
                invoice.getPaidTotal(),
                balance(invoice),
                invoice.getCustomerName(),
                invoice.getCustomerDocumentType(),
                invoice.getCustomerDocumentNumber(),
                invoice.getCustomerNit(),
                invoice.getCustomerNrc(),
                invoice.getCustomerAddress(),
                invoice.getCustomerEmail(),
                invoice.getNotes(),
                details,
                invoice.getCancelledAt(),
                invoice.getCancelReason()
        );
    }

    public InvoiceDetailResponseDto toDetailResponse(InvoiceDetail detail) {

        return new InvoiceDetailResponseDto(
                detail.getId(),
                detail.getProductPresentation() != null
                        ? detail.getProductPresentation().getId()
                        : null,
                detail.getProductCode(),
                detail.getProductName(),
                detail.getPresentationCode(),
                detail.getPresentationName(),
                detail.getQuantity(),
                detail.getUnitPrice(),
                detail.getDiscount(),
                detail.getTaxRate(),
                detail.getTaxAmount(),
                detail.getLineSubtotal(),
                detail.getLineTotal()
        );
    }

    public PaymentResponseDto toPaymentResponse(InvoicePayment payment) {

        return new PaymentResponseDto(
                payment.getId(),
                payment.getInvoice().getId(),
                payment.getPaymentDate(),
                payment.getAmount(),
                payment.getPaymentMethod(),
                payment.getReference(),
                payment.getNotes(),
                payment.getUser().getId(),
                payment.getUser().getFullName(),
                payment.getCreatedAt()
        );
    }

    private BigDecimal balance(Invoice invoice) {

        BigDecimal total = invoice.getTotal() == null
                ? BigDecimal.ZERO
                : invoice.getTotal();

        BigDecimal paid = invoice.getPaidTotal() == null
                ? BigDecimal.ZERO
                : invoice.getPaidTotal();

        return total.subtract(paid);
    }
}
