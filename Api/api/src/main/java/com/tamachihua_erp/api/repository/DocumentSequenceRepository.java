package com.tamachihua_erp.api.repository;

import com.tamachihua_erp.api.entity.DocumentSequence;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

// Correlativos por tipo de documento y año (V3, Implementacion.md §7).
public interface DocumentSequenceRepository
        extends JpaRepository<DocumentSequence, Long> {

    // Crea la fila del año si aún no existe; el UNIQUE evita duplicados concurrentes.
    @Modifying(flushAutomatically = true)
    @Query(value = """
            INSERT INTO document_sequences (document_type, prefix, year, current_number, version)
            VALUES (:documentType, :prefix, :year, 0, 0)
            ON CONFLICT (document_type, year) DO NOTHING
            """, nativeQuery = true)
    int ensureExists(
            @Param("documentType") String documentType,
            @Param("prefix") String prefix,
            @Param("year") Integer year
    );

    // SELECT ... FOR UPDATE: serializa la numeración de documentos concurrentes.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select ds from DocumentSequence ds
            where ds.documentType = :documentType
              and ds.year = :year
            """)
    Optional<DocumentSequence> findForUpdate(
            @Param("documentType") String documentType,
            @Param("year") Integer year
    );
}
