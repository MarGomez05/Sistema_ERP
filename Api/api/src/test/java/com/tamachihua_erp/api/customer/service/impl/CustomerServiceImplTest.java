package com.tamachihua_erp.api.customer.service.impl;

import com.tamachihua_erp.api.customer.dto.CustomerCreditRequestDto;
import com.tamachihua_erp.api.customer.dto.CustomerRequestDto;
import com.tamachihua_erp.api.customer.dto.CustomerResponseDto;
import com.tamachihua_erp.api.customer.entity.Customer;
import com.tamachihua_erp.api.customer.mapper.CustomerMapper;
import com.tamachihua_erp.api.customer.repository.CustomerRepository;
import com.tamachihua_erp.api.customer.repository.projection.CustomerBalanceProjection;
import com.tamachihua_erp.api.exception.ResourceConflictException;
import com.tamachihua_erp.api.exception.ResourceNotFoundException;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CustomerServiceImplTest {

    @Mock
    private CustomerRepository repository;

    private CustomerServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new CustomerServiceImpl(repository, new CustomerMapper());
    }

    @Test
    void creaClienteYNormalizaCamposOpcionales() {

        CustomerRequestDto dto = new CustomerRequestDto(
                "NATURAL", "DUI", "01234567-8", "Juan Pérez", "  ",
                "", "", "", "  ", "7777-7777", "juan@example.com", null, null
        );

        when(repository.save(any(Customer.class))).thenAnswer(invocation -> {
            Customer customer = invocation.getArgument(0);
            customer.setId(5L);
            customer.setCreatedAt(LocalDateTime.now());
            customer.setUpdatedAt(LocalDateTime.now());
            return customer;
        });

        CustomerResponseDto response = service.create(dto);

        assertThat(response.id()).isEqualTo(5L);
        assertThat(response.legalName()).isEqualTo("Juan Pérez");
        assertThat(response.tradeName()).isNull();
        assertThat(response.nit()).isNull();
        assertThat(response.address()).isNull();
        assertThat(response.creditLimit()).isEqualByComparingTo("0.00");
        assertThat(response.creditDays()).isZero();
        assertThat(response.outstandingBalance()).isEqualByComparingTo("0.00");

        verify(repository).existsByDocumentNumber("01234567-8");
        verify(repository).existsByEmailIgnoreCase("juan@example.com");
    }

    @Test
    void rechazaDocumentoDuplicado() {

        CustomerRequestDto dto = request("0614-123456-101-2", null, null);

        when(repository.existsByDocumentNumber("0614-123456-101-2")).thenReturn(true);

        assertThatThrownBy(() -> service.create(dto))
                .isInstanceOf(ResourceConflictException.class)
                .hasMessage("Ya existe un cliente con ese número de documento");
    }

    @Test
    void rechazaCorreoDuplicado() {

        CustomerRequestDto dto = request(null, null, "compras@elprogreso.com");

        when(repository.existsByEmailIgnoreCase("compras@elprogreso.com")).thenReturn(true);

        assertThatThrownBy(() -> service.create(dto))
                .isInstanceOf(ResourceConflictException.class)
                .hasMessage("Ya existe un cliente con ese correo");
    }

    @Test
    void devuelveClienteConSaldoPendiente() {

        Customer customer = customer(3L, "Agroservicio El Progreso, S.A.");

        when(repository.findById(3L)).thenReturn(Optional.of(customer));
        when(repository.sumOutstandingBalanceByCustomerId(3L))
                .thenReturn(new BigDecimal("125.50"));

        CustomerResponseDto response = service.findById(3L);

        assertThat(response.legalName()).isEqualTo("Agroservicio El Progreso, S.A.");
        assertThat(response.outstandingBalance()).isEqualByComparingTo("125.50");
    }

    @Test
    void fallaCuandoElClienteNoExiste() {

        when(repository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.findById(99L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("No se encontró el cliente con ID: 99");
    }

    @Test
    void actualizaCondicionesDeCredito() {

        Customer customer = customer(3L, "Agroservicio El Progreso, S.A.");

        when(repository.findById(3L)).thenReturn(Optional.of(customer));
        when(repository.save(customer)).thenReturn(customer);
        when(repository.sumOutstandingBalanceByCustomerId(3L))
                .thenReturn(new BigDecimal("250.00"));

        CustomerResponseDto response = service.changeCredit(
                3L,
                new CustomerCreditRequestDto(new BigDecimal("5000.00"), 30)
        );

        assertThat(response.creditLimit()).isEqualByComparingTo("5000.00");
        assertThat(response.creditDays()).isEqualTo(30);
        assertThat(response.outstandingBalance()).isEqualByComparingTo("250.00");
    }

    @Test
    void cambiaEstadoDelCliente() {

        Customer customer = customer(7L, "Ana López");

        when(repository.findById(7L)).thenReturn(Optional.of(customer));
        when(repository.save(customer)).thenReturn(customer);

        service.changeStatus(7L, false);

        assertThat(customer.getIsActive()).isFalse();
        verify(repository).save(customer);
    }

    @Test
    void listaClientesConSaldosEnUnaSolaConsulta() {

        Customer first = customer(1L, "Agroservicio El Progreso, S.A.");
        Customer second = customer(2L, "Ana López");

        Pageable pageable = PageRequest.of(0, 20);

        when(repository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(first, second), pageable, 2));

        CustomerBalanceProjection projection = mock(CustomerBalanceProjection.class);
        when(projection.getCustomerId()).thenReturn(1L);
        when(projection.getOutstandingBalance()).thenReturn(new BigDecimal("125.50"));

        when(repository.findOutstandingBalances(anyCollection()))
                .thenReturn(List.of(projection));

        Page<CustomerResponseDto> page = service.findAll(null, true, null, pageable);

        assertThat(page.getTotalElements()).isEqualTo(2);
        assertThat(page.getContent().get(0).outstandingBalance())
                .isEqualByComparingTo("125.50");
        assertThat(page.getContent().get(1).outstandingBalance())
                .isEqualByComparingTo("0.00");
    }

    private CustomerRequestDto request(
            String documentNumber,
            String nit,
            String email
    ) {
        return new CustomerRequestDto(
                "BUSINESS", "NIT", documentNumber, "Agroservicio El Progreso, S.A.",
                "El Progreso", nit, null, null, "Santa Tecla", "2222-3333", email,
                new BigDecimal("5000.00"), 30
        );
    }

    private Customer customer(Long id, String legalName) {

        Customer customer = new Customer();

        customer.setId(id);
        customer.setCustomerType("BUSINESS");
        customer.setLegalName(legalName);
        customer.setCreditLimit(new BigDecimal("5000.00"));
        customer.setCreditDays(30);
        customer.setIsActive(true);

        return customer;
    }
}
