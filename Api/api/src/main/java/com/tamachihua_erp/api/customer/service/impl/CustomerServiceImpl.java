package com.tamachihua_erp.api.customer.service.impl;

import com.tamachihua_erp.api.customer.dto.CustomerCreditRequestDto;
import com.tamachihua_erp.api.customer.dto.CustomerOptionDto;
import com.tamachihua_erp.api.customer.dto.CustomerRequestDto;
import com.tamachihua_erp.api.customer.dto.CustomerResponseDto;
import com.tamachihua_erp.api.customer.entity.Customer;
import com.tamachihua_erp.api.customer.mapper.CustomerMapper;
import com.tamachihua_erp.api.customer.repository.CustomerRepository;
import com.tamachihua_erp.api.customer.repository.projection.CustomerBalanceProjection;
import com.tamachihua_erp.api.customer.service.CustomerService;
import com.tamachihua_erp.api.exception.ResourceConflictException;
import com.tamachihua_erp.api.exception.ResourceNotFoundException;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CustomerServiceImpl implements CustomerService {

    private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2);

    private final CustomerRepository repository;
    private final CustomerMapper mapper;

    @Override
    public Page<CustomerResponseDto> findAll(
            String search,
            Boolean isActive,
            String documentType,
            Pageable pageable
    ) {

        Specification<Customer> specification =
                (root, query, criteriaBuilder) -> criteriaBuilder.conjunction();

        if (search != null && !search.isBlank()) {

            String pattern = "%" + search.trim().toLowerCase(Locale.ROOT) + "%";

            specification = specification.and((root, query, cb) ->
                    cb.or(
                            cb.like(cb.lower(root.get("legalName")), pattern),
                            cb.like(cb.lower(root.get("tradeName")), pattern),
                            cb.like(cb.lower(root.get("documentNumber")), pattern),
                            cb.like(cb.lower(root.get("nit")), pattern),
                            cb.like(cb.lower(root.get("email")), pattern)
                    )
            );
        }

        if (isActive != null) {

            specification = specification.and((root, query, cb) ->
                    cb.equal(root.get("isActive"), isActive)
            );
        }

        if (documentType != null && !documentType.isBlank()) {

            String normalizedType = documentType.trim().toUpperCase(Locale.ROOT);

            specification = specification.and((root, query, cb) ->
                    cb.equal(root.get("documentType"), normalizedType)
            );
        }

        Page<Customer> page = repository.findAll(specification, pageable);

        Map<Long, BigDecimal> balances = findBalances(page.getContent());

        return page.map(customer -> mapper.toResponseDto(
                customer,
                balances.getOrDefault(customer.getId(), ZERO)
        ));
    }

    @Override
    public List<CustomerOptionDto> findActiveOptions() {

        return repository.findAllByIsActiveTrueOrderByLegalNameAsc()
                .stream()
                .map(mapper::toOptionDto)
                .toList();
    }

    @Override
    public CustomerResponseDto findById(Long id) {

        Customer customer = findCustomerOrThrow(id);

        return mapper.toResponseDto(
                customer,
                outstandingBalance(id)
        );
    }

    @Override
    @Transactional
    public CustomerResponseDto create(CustomerRequestDto dto) {

        validateUniqueFields(dto, null);

        Customer customer = new Customer();

        mapper.applyChanges(customer, dto);

        Customer saved = repository.save(customer);

        return mapper.toResponseDto(saved, ZERO);
    }

    @Override
    @Transactional
    public CustomerResponseDto update(Long id, CustomerRequestDto dto) {

        Customer customer = findCustomerOrThrow(id);

        validateUniqueFields(dto, id);

        mapper.applyChanges(customer, dto);

        Customer saved = repository.save(customer);

        return mapper.toResponseDto(saved, outstandingBalance(id));
    }

    @Override
    @Transactional
    public void changeStatus(Long id, Boolean isActive) {

        Customer customer = findCustomerOrThrow(id);

        customer.setIsActive(isActive);

        repository.save(customer);
    }

    @Override
    @Transactional
    public CustomerResponseDto changeCredit(Long id, CustomerCreditRequestDto dto) {

        Customer customer = findCustomerOrThrow(id);

        customer.setCreditLimit(dto.creditLimit());
        customer.setCreditDays(dto.creditDays());

        Customer saved = repository.save(customer);

        return mapper.toResponseDto(saved, outstandingBalance(id));
    }

    private Map<Long, BigDecimal> findBalances(List<Customer> customers) {

        if (customers.isEmpty()) {
            return Map.of();
        }

        List<Long> ids = customers.stream()
                .map(Customer::getId)
                .toList();

        Map<Long, BigDecimal> balances = new HashMap<>();

        for (CustomerBalanceProjection projection : repository.findOutstandingBalances(ids)) {
            balances.put(
                    projection.getCustomerId(),
                    projection.getOutstandingBalance()
            );
        }

        return balances;
    }

    private BigDecimal outstandingBalance(Long customerId) {

        BigDecimal balance = repository.sumOutstandingBalanceByCustomerId(customerId);

        return balance != null ? balance : ZERO;
    }

    private void validateUniqueFields(CustomerRequestDto dto, Long id) {

        String documentNumber = mapper.normalize(dto.documentNumber());

        if (documentNumber != null) {

            boolean taken = id == null
                    ? repository.existsByDocumentNumber(documentNumber)
                    : repository.existsByDocumentNumberAndIdNot(documentNumber, id);

            if (taken) {
                throw new ResourceConflictException(
                        "Ya existe un cliente con ese número de documento"
                );
            }
        }

        String nit = mapper.normalize(dto.nit());

        if (nit != null) {

            boolean taken = id == null
                    ? repository.existsByNit(nit)
                    : repository.existsByNitAndIdNot(nit, id);

            if (taken) {
                throw new ResourceConflictException("Ya existe un cliente con ese NIT");
            }
        }

        String nrc = mapper.normalize(dto.nrc());

        if (nrc != null) {

            boolean taken = id == null
                    ? repository.existsByNrc(nrc)
                    : repository.existsByNrcAndIdNot(nrc, id);

            if (taken) {
                throw new ResourceConflictException("Ya existe un cliente con ese NRC");
            }
        }

        String dui = mapper.normalize(dto.dui());

        if (dui != null) {

            boolean taken = id == null
                    ? repository.existsByDui(dui)
                    : repository.existsByDuiAndIdNot(dui, id);

            if (taken) {
                throw new ResourceConflictException("Ya existe un cliente con ese DUI");
            }
        }

        String email = mapper.normalize(dto.email());

        if (email != null) {

            boolean taken = id == null
                    ? repository.existsByEmailIgnoreCase(email)
                    : repository.existsByEmailIgnoreCaseAndIdNot(email, id);

            if (taken) {
                throw new ResourceConflictException("Ya existe un cliente con ese correo");
            }
        }
    }

    private Customer findCustomerOrThrow(Long id) {

        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No se encontró el cliente con ID: " + id
                ));
    }
}
