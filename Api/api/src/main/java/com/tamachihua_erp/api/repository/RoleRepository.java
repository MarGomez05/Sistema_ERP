package com.tamachihua_erp.api.repository;

import com.tamachihua_erp.api.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RoleRepository extends JpaRepository<Role, Long> {

    Optional<Role> findByCode(String code);

    boolean existsByCode(String code);

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);

    List<Role> findAllByOrderByNameAsc();

    List<Role> findAllByIsActiveTrueOrderByNameAsc();
}
