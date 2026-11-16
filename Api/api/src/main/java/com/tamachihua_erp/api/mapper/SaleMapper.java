package com.tamachihua_erp.api.mapper;

import com.tamachihua_erp.api.dto.sale.SaleCustomerDto;
import com.tamachihua_erp.api.dto.sale.SaleDetailResponseDto;
import com.tamachihua_erp.api.dto.sale.SaleResponseDto;
import com.tamachihua_erp.api.dto.sale.SaleSellerDto;
import com.tamachihua_erp.api.dto.sale.SaleSummaryDto;
import com.tamachihua_erp.api.entity.ProductPresentation;
import com.tamachihua_erp.api.entity.Sale;
import com.tamachihua_erp.api.entity.SaleDetail;

import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class SaleMapper {

    public SaleSummaryDto toSummary(Sale sale) {

        return new SaleSummaryDto(
                sale.getId(),
                sale.getSaleNumber(),
                sale.getStatus(),
                sale.getSaleDate(),
                sale.getCustomer() != null ? sale.getCustomer().getId() : null,
                customerName(sale),
                sale.getUser().getId(),
                sale.getUser().getFullName(),
                sale.getPaymentCondition(),
                sale.getPaymentMethod(),
                sale.getSubtotal(),
                sale.getDiscountTotal(),
                sale.getTaxTotal(),
                sale.getTotal(),
                sale.getPaidTotal()
        );
    }

    public SaleResponseDto toResponse(Sale sale) {

        SaleCustomerDto customer = sale.getCustomer() == null
                ? null
                : new SaleCustomerDto(
                        sale.getCustomer().getId(),
                        sale.getCustomer().getLegalName()
                );

        SaleSellerDto seller = new SaleSellerDto(
                sale.getUser().getId(),
                sale.getUser().getFullName()
        );

        List<SaleDetailResponseDto> details = sale.getDetails()
                .stream()
                .map(this::toDetailResponse)
                .toList();

        return new SaleResponseDto(
                sale.getId(),
                sale.getSaleNumber(),
                sale.getStatus(),
                sale.getSaleDate(),
                customer,
                seller,
                sale.getPaymentCondition(),
                sale.getPaymentMethod(),
                sale.getSubtotal(),
                sale.getDiscountTotal(),
                sale.getTaxTotal(),
                sale.getTotal(),
                sale.getPaidTotal(),
                sale.getNotes(),
                details,
                sale.getCancelledAt(),
                sale.getCancelReason()
        );
    }

    public SaleDetailResponseDto toDetailResponse(SaleDetail detail) {

        ProductPresentation presentation = detail.getProductPresentation();

        return new SaleDetailResponseDto(
                detail.getId(),
                presentation.getId(),
                presentation.getProduct().getId(),
                presentation.getProduct().getCode(),
                presentation.getProduct().getName(),
                presentation.getPresentation().getName(),
                detail.getQuantity(),
                detail.getUnitPrice(),
                detail.getDiscount(),
                detail.getTaxRate(),
                detail.getTaxAmount(),
                detail.getLineSubtotal(),
                detail.getLineTotal()
        );
    }

    private String customerName(Sale sale) {

        if (sale.getCustomer() == null) {
            return "Consumidor final";
        }

        return sale.getCustomer().getLegalName();
    }
}
