package com.tamachihua_erp.api.support;

import com.tamachihua_erp.api.dto.sale.SaleDetailRequestDto;
import com.tamachihua_erp.api.dto.sale.SaleRequestDto;
import com.tamachihua_erp.api.dto.sale.SaleResponseDto;
import com.tamachihua_erp.api.entity.Customer;
import com.tamachihua_erp.api.entity.MeasureUnit;
import com.tamachihua_erp.api.entity.Presentation;
import com.tamachihua_erp.api.entity.Product;
import com.tamachihua_erp.api.entity.ProductCategory;
import com.tamachihua_erp.api.entity.ProductLot;
import com.tamachihua_erp.api.entity.ProductPresentation;
import com.tamachihua_erp.api.entity.ProductPrice;
import com.tamachihua_erp.api.entity.ProductType;
import com.tamachihua_erp.api.entity.Role;
import com.tamachihua_erp.api.entity.Supplier;
import com.tamachihua_erp.api.entity.User;
import com.tamachihua_erp.api.repository.CustomerRepository;
import com.tamachihua_erp.api.repository.MeasureUnitRepository;
import com.tamachihua_erp.api.repository.PresentationRepository;
import com.tamachihua_erp.api.repository.ProductCategoryRepository;
import com.tamachihua_erp.api.repository.ProductLotRepository;
import com.tamachihua_erp.api.repository.ProductPresentationRepository;
import com.tamachihua_erp.api.repository.ProductPriceRepository;
import com.tamachihua_erp.api.repository.ProductRepository;
import com.tamachihua_erp.api.repository.ProductTypeRepository;
import com.tamachihua_erp.api.repository.RoleRepository;
import com.tamachihua_erp.api.repository.SupplierRepository;
import com.tamachihua_erp.api.repository.UserRepository;
import com.tamachihua_erp.api.security.JwtService;
import com.tamachihua_erp.api.service.SaleService;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.beans.factory.annotation.Value;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Datos de prueba compartidos por las pruebas de integración.
 *
 * <p>Flyway crea el esquema pero no carga datos, así que cada prueba construye
 * sus propios roles, usuarios, catálogo y lotes.</p>
 */
public class TestDataFactory {

    public static final String PASSWORD = "Secreto123!";

    private static final String SUPPLIER_NIT = "0614-000000-001-1";
    private static final String CUSTOMER_DOCUMENT = "00000001-1";

    private final JdbcTemplate jdbcTemplate;
    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final MeasureUnitRepository measureUnitRepository;
    private final PresentationRepository presentationRepository;
    private final ProductCategoryRepository productCategoryRepository;
    private final ProductTypeRepository productTypeRepository;
    private final ProductRepository productRepository;
    private final ProductPresentationRepository productPresentationRepository;
    private final ProductPriceRepository productPriceRepository;
    private final SupplierRepository supplierRepository;
    private final ProductLotRepository productLotRepository;
    private final CustomerRepository customerRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final SaleService saleService;
    private final String dbMode;
    private final String schema;

    public TestDataFactory(
            JdbcTemplate jdbcTemplate,
            RoleRepository roleRepository,
            UserRepository userRepository,
            MeasureUnitRepository measureUnitRepository,
            PresentationRepository presentationRepository,
            ProductCategoryRepository productCategoryRepository,
            ProductTypeRepository productTypeRepository,
            ProductRepository productRepository,
            ProductPresentationRepository productPresentationRepository,
            ProductPriceRepository productPriceRepository,
            SupplierRepository supplierRepository,
            ProductLotRepository productLotRepository,
            CustomerRepository customerRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            SaleService saleService,
            @Value("${test.db.mode:container}") String dbMode,
            @Value("${spring.flyway.default-schema:public}") String schema
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.roleRepository = roleRepository;
        this.userRepository = userRepository;
        this.measureUnitRepository = measureUnitRepository;
        this.presentationRepository = presentationRepository;
        this.productCategoryRepository = productCategoryRepository;
        this.productTypeRepository = productTypeRepository;
        this.productRepository = productRepository;
        this.productPresentationRepository = productPresentationRepository;
        this.productPriceRepository = productPriceRepository;
        this.supplierRepository = supplierRepository;
        this.productLotRepository = productLotRepository;
        this.customerRepository = customerRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.saleService = saleService;
        this.dbMode = dbMode;
        this.schema = schema;
    }

    /** Vacía todas las tablas del esquema actual, sin tocar el historial de Flyway. */
    public void reset() {

        // Salvaguarda: el reset es destructivo. En modo local-pg exigimos un
        // esquema dedicado para no vaciar la base real del proyecto.
        if (!"container".equalsIgnoreCase(dbMode)
                && "public".equalsIgnoreCase(schema)) {
            throw new IllegalStateException(
                    "En modo local-pg define TEST_DB_SCHEMA con un esquema dedicado "
                            + "(distinto de public) antes de ejecutar las pruebas"
            );
        }

        String schema = jdbcTemplate.queryForObject(
                "select current_schema()",
                String.class
        );

        List<String> tables = jdbcTemplate.queryForList(
                """
                select tablename
                from pg_tables
                where schemaname = ?
                  and tablename <> 'flyway_schema_history'
                """,
                String.class,
                schema
        );

        if (tables.isEmpty()) {
            return;
        }

        String tableList = tables.stream()
                .map(table -> "\"" + table + "\"")
                .collect(Collectors.joining(", "));

        jdbcTemplate.execute(
                "TRUNCATE TABLE " + tableList + " RESTART IDENTITY CASCADE"
        );
    }

    /** Crea los cuatro roles y un usuario activo por rol. */
    public BaseData seedBaseData() {

        Role adminRole = role("ADMIN", "Administrador");
        Role warehouseRole = role("WAREHOUSE", "Bodega");
        Role purchasingRole = role("PURCHASING", "Compras");
        Role sellerRole = role("SELLER", "Vendedor");

        User admin = user("admin.test", adminRole, true);
        User warehouse = user("bodega.test", warehouseRole, true);
        User purchasing = user("compras.test", purchasingRole, true);
        User seller = user("ventas.test", sellerRole, true);

        return new BaseData(admin, warehouse, purchasing, seller, supplier());
    }

    public Role role(String code, String name) {
        Role role = new Role();
        role.setCode(code);
        role.setName(name);
        role.setDescription("Rol de prueba " + code);
        role.setIsActive(true);
        return roleRepository.save(role);
    }

    public User user(String username, Role role, boolean active) {
        User user = new User();
        user.setRole(role);
        user.setUsername(username);
        user.setPasswordHash(passwordEncoder.encode(PASSWORD));
        user.setFullName("Usuario " + username);
        user.setEmail(username + "@test.local");
        user.setIsActive(active);
        return userRepository.save(user);
    }

    public Supplier supplier() {
        Supplier supplier = new Supplier();
        supplier.setTradeName("Proveedor de prueba");
        supplier.setLegalName("Proveedor de Prueba S.A. de C.V.");
        supplier.setNit(SUPPLIER_NIT);
        supplier.setCreditDays(0);
        supplier.setIsActive(true);
        return supplierRepository.save(supplier);
    }

    public Customer customer(String legalName) {
        Customer customer = new Customer();
        customer.setCustomerType("NATURAL");
        customer.setDocumentType("DUI");
        customer.setDocumentNumber(CUSTOMER_DOCUMENT);
        customer.setLegalName(legalName);
        customer.setCreditLimit(BigDecimal.ZERO);
        customer.setCreditDays(0);
        customer.setIsActive(true);
        return customerRepository.save(customer);
    }

    /**
     * Crea un producto con una presentación y precio vigente de 113.00
     * (precio con IVA del 13 %).
     */
    public ProductFixture createProductFixture(String suffix, User admin) {

        MeasureUnit unit = new MeasureUnit();
        unit.setName("Unidad " + suffix);
        unit.setCode(("U" + suffix).substring(0, Math.min(10, suffix.length() + 1)));
        unit.setIsActive(true);
        unit = measureUnitRepository.save(unit);

        Presentation presentation = new Presentation();
        presentation.setMeasureUnit(unit);
        presentation.setName("Presentación " + suffix);
        presentation.setQuantity(BigDecimal.ONE);
        presentation.setIsActive(true);
        presentation = presentationRepository.save(presentation);

        ProductCategory category = new ProductCategory();
        category.setName("Categoría " + suffix);
        category.setIsActive(true);
        category = productCategoryRepository.save(category);

        ProductType type = new ProductType();
        type.setName("Tipo " + suffix);
        type.setIsActive(true);
        type = productTypeRepository.save(type);

        Product product = new Product();
        product.setProductCategory(category);
        product.setProductType(type);
        product.setCode("P-" + suffix);
        product.setName("Producto " + suffix);
        product.setRequiresExpiration(true);
        product.setTaxRate(new BigDecimal("13.00"));
        product.setIsActive(true);
        product = productRepository.save(product);

        ProductPresentation productPresentation = new ProductPresentation();
        productPresentation.setProduct(product);
        productPresentation.setPresentation(presentation);
        productPresentation.setCode("PP-" + suffix);
        productPresentation.setMinStock(BigDecimal.ONE);
        productPresentation.setIsActive(true);
        productPresentation = productPresentationRepository.save(productPresentation);

        ProductPrice price = new ProductPrice();
        price.setProductPresentation(productPresentation);
        price.setUser(admin);
        price.setPrice(new BigDecimal("113.00"));
        price.setStartDate(LocalDateTime.now());
        productPriceRepository.save(price);

        return new ProductFixture(product, productPresentation);
    }

    public ProductLot lot(
            ProductPresentation productPresentation,
            Supplier supplier,
            User user,
            String lotNumber,
            LocalDate expirationDate,
            String received,
            String available,
            String unitCost
    ) {
        ProductLot lot = new ProductLot();
        lot.setProductPresentation(productPresentation);
        lot.setSupplier(supplier);
        lot.setUser(user);
        lot.setLotNumber(lotNumber);
        lot.setInvoiceNumber("F-0001");
        lot.setInvoiceDate(LocalDate.now().minusDays(90));
        lot.setEntryDate(LocalDate.now().minusDays(90));
        lot.setExpirationDate(expirationDate);
        lot.setReceivedQuantity(new BigDecimal(received));
        lot.setAvailableQuantity(new BigDecimal(available));
        lot.setUnitCost(new BigDecimal(unitCost));
        lot.setIsActive(true);
        return productLotRepository.save(lot);
    }

    /** Crea una venta DRAFT a consumidor final, en efectivo. */
    public Long createDraftSale(
            User seller,
            ProductPresentation productPresentation,
            String quantity
    ) {
        SaleResponseDto sale = saleService.create(
                new SaleRequestDto(
                        null,
                        "CASH",
                        "CASH",
                        null,
                        List.of(new SaleDetailRequestDto(
                                productPresentation.getId(),
                                new BigDecimal(quantity),
                                BigDecimal.ZERO,
                                null
                        ))
                ),
                seller.getId()
        );

        return sale.id();
    }

    public String bearer(User user) {
        return "Bearer " + jwtService.generateToken(user);
    }

    public record BaseData(
            User admin,
            User warehouse,
            User purchasing,
            User seller,
            Supplier supplier
    ) {}

    public record ProductFixture(
            Product product,
            ProductPresentation presentation
    ) {}
}
