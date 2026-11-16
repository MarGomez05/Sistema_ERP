package com.tamachihua_erp.api.service.impl;

import com.tamachihua_erp.api.dto.productpresentation.PresentationImageRequestDto;
import com.tamachihua_erp.api.dto.productpresentation.ProductPresentationRequestDto;
import com.tamachihua_erp.api.dto.productpresentation.ProductPresentationResponseDto;
import com.tamachihua_erp.api.entity.MeasureUnit;
import com.tamachihua_erp.api.entity.Presentation;
import com.tamachihua_erp.api.entity.Product;
import com.tamachihua_erp.api.entity.ProductPresentation;
import com.tamachihua_erp.api.exception.ResourceNotFoundException;
import com.tamachihua_erp.api.mapper.ProductPresentationMapper;
import com.tamachihua_erp.api.repository.PresentationRepository;
import com.tamachihua_erp.api.repository.ProductLotRepository;
import com.tamachihua_erp.api.repository.ProductPresentationRepository;
import com.tamachihua_erp.api.repository.ProductPriceRepository;
import com.tamachihua_erp.api.repository.ProductRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProductPresentationImageServiceImplTest {

    @Mock
    private ProductPresentationRepository repository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private PresentationRepository presentationRepository;

    @Mock
    private ProductPriceRepository productPriceRepository;

    @Mock
    private ProductLotRepository productLotRepository;

    private ProductPresentationServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new ProductPresentationServiceImpl(
                repository,
                productRepository,
                presentationRepository,
                productPriceRepository,
                productLotRepository,
                new ProductPresentationMapper()
        );
    }

    @Test
    void asignaImagenPorUrlYLaDevuelveEnLaRespuesta() {

        ProductPresentation presentation = presentationEntity();

        when(productRepository.findById(1L)).thenReturn(Optional.of(productEntity()));
        when(repository.findByProductIdAndId(1L, 8L))
                .thenReturn(Optional.of(presentation));
        when(repository.save(any(ProductPresentation.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        ProductPresentationResponseDto response = service.updateImage(
                1L,
                8L,
                new PresentationImageRequestDto(
                        "  https://cdn.example.com/productos/codo.jpg  ",
                        "  Codo PVC 1/2  "
                )
        );

        assertThat(response.imageUrl())
                .isEqualTo("https://cdn.example.com/productos/codo.jpg");
        assertThat(response.imageAlt()).isEqualTo("Codo PVC 1/2");
        assertThat(presentation.getImageUrl())
                .isEqualTo("https://cdn.example.com/productos/codo.jpg");
        assertThat(response.code()).isEqualTo("FON-002");
    }

    @Test
    void aceptaRutasRelativas() {

        ProductPresentation presentation = presentationEntity();

        when(productRepository.findById(1L)).thenReturn(Optional.of(productEntity()));
        when(repository.findByProductIdAndId(1L, 8L))
                .thenReturn(Optional.of(presentation));
        when(repository.save(any(ProductPresentation.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        ProductPresentationResponseDto response = service.updateImage(
                1L,
                8L,
                new PresentationImageRequestDto("/media/products/codo.jpg", null)
        );

        assertThat(response.imageUrl()).isEqualTo("/media/products/codo.jpg");
        assertThat(response.imageAlt()).isNull();
    }

    @Test
    void quitaLaImagenCuandoLaUrlVieneVacia() {

        ProductPresentation presentation = presentationEntity();
        presentation.setImageUrl("/media/products/vieja.jpg");
        presentation.setImageAlt("Imagen anterior");

        when(productRepository.findById(1L)).thenReturn(Optional.of(productEntity()));
        when(repository.findByProductIdAndId(1L, 8L))
                .thenReturn(Optional.of(presentation));
        when(repository.save(any(ProductPresentation.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        ProductPresentationResponseDto response = service.updateImage(
                1L,
                8L,
                new PresentationImageRequestDto("   ", null)
        );

        assertThat(response.imageUrl()).isNull();
        assertThat(response.imageAlt()).isNull();
        assertThat(presentation.getImageUrl()).isNull();
    }

    @Test
    void rechazaUnaPresentacionQueNoPerteneceAlProducto() {

        when(productRepository.findById(1L)).thenReturn(Optional.of(productEntity()));
        when(repository.findByProductIdAndId(1L, 99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.updateImage(
                1L,
                99L,
                new PresentationImageRequestDto("/media/products/codo.jpg", null)
        ))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("99");
    }

    @Test
    void creaLaPresentacionConImagen() {

        when(productRepository.findById(1L)).thenReturn(Optional.of(productEntity()));
        when(presentationRepository.findById(200L))
                .thenReturn(Optional.of(presentationEntity().getPresentation()));
        when(repository.existsByCodeIgnoreCase("FON-002")).thenReturn(false);
        when(repository.existsByProductIdAndPresentationId(1L, 200L)).thenReturn(false);
        when(repository.save(any(ProductPresentation.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        ProductPresentationResponseDto response = service.create(
                1L,
                new ProductPresentationRequestDto(
                        200L,
                        "FON-002",
                        new BigDecimal("10.00"),
                        "/media/products/codo.jpg",
                        "Codo PVC 1/2"
                )
        );

        assertThat(response.imageUrl()).isEqualTo("/media/products/codo.jpg");
        assertThat(response.imageAlt()).isEqualTo("Codo PVC 1/2");
        assertThat(response.stockStatus()).isEqualTo("OUT");
    }

    // ------------------------------------------------------------------
    // Datos de prueba
    // ------------------------------------------------------------------

    private ProductPresentation presentationEntity() {

        MeasureUnit unit = new MeasureUnit();
        unit.setId(1L);
        unit.setName("Unidad");
        unit.setCode("UND");

        Presentation base = new Presentation();
        base.setId(200L);
        base.setName("Unidad");
        base.setMeasureUnit(unit);
        base.setQuantity(new BigDecimal("1.00"));
        base.setIsActive(true);

        ProductPresentation presentation = new ProductPresentation();
        presentation.setId(8L);
        presentation.setCode("FON-002");
        presentation.setMinStock(new BigDecimal("10.00"));
        presentation.setIsActive(true);
        presentation.setProduct(productEntity());
        presentation.setPresentation(base);

        return presentation;
    }

    private Product productEntity() {

        Product product = new Product();
        product.setId(1L);
        product.setCode("FON-001");
        product.setName("Fontanería");
        product.setIsActive(true);

        return product;
    }
}
