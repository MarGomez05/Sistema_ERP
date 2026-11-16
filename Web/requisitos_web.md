# Diseño UX/UI y Desarrollo Frontend — ERP Empresarial

Actúa como un **Senior UX/UI Designer y Senior Frontend Developer especializado en aplicaciones empresariales SaaS y sistemas ERP modernos**.

Tu objetivo es diseñar y desarrollar una interfaz web para un ERP empresarial que transmita profesionalismo, simplicidad, confianza y eficiencia. La experiencia debe ser intuitiva, minimalista y visualmente atractiva, priorizando la comprensión de la información y la facilidad de uso.

## 1. Identidad visual y diseño

Antes de comenzar, analiza el logotipo ubicado en:

`/Documentacion/Logo`

Utiliza el logo como referencia principal para construir la identidad visual de toda la aplicación.

**Paleta de colores:**
- Extrae los colores principales y secundarios del logotipo.
- Genera una paleta complementaria de colores pastel muy sutiles.
- Utiliza fondos claros, superficies limpias y contrastes equilibrados.
- Evita colores demasiado saturados, brillantes o agresivos.
- Reserva los colores más destacados para acciones principales, indicadores y elementos importantes.
- Mantén consistencia visual en todos los módulos.

**Estilo visual:**
- Diseño minimalista, moderno y elegante.
- Inspiración en interfaces SaaS empresariales de alta calidad.
- Espaciado generoso y jerarquía visual clara.
- Bordes sutiles, sombras suaves y radios moderados.
- Tipografía moderna, legible y profesional.
- Iconografía consistente y fácilmente reconocible.
- Evitar elementos decorativos innecesarios.

## 2. Experiencia de usuario (UX)

La aplicación debe ser extremadamente intuitiva, incluso para usuarios con poca experiencia en sistemas ERP.

Prioriza los siguientes principios:

- Mostrar primero la información más importante.
- Facilitar la identificación de las acciones disponibles.
- Reducir la cantidad de pasos necesarios para completar tareas.
- Evitar interfaces sobrecargadas de información.
- Utilizar nombres y etiquetas que describan claramente cada funcionalidad.
- Mantener patrones de navegación consistentes.
- Proporcionar retroalimentación visual ante cualquier acción.
- Utilizar estados vacíos que expliquen qué hace cada módulo y cómo comenzar.
- Incorporar mensajes de confirmación, errores y advertencias comprensibles.

**La interfaz debe explicar visualmente qué hace el sistema y cómo ayuda a la empresa a gestionar sus operaciones.**

## 3. Dashboard principal

El dashboard debe ser el punto central de la aplicación y ofrecer una visión general del estado del negocio.

Debe destacar:

- Indicadores clave (KPI).
- Resúmenes de actividad.
- Movimientos recientes.
- Alertas importantes.
- Información relevante para la toma de decisiones.
- Accesos rápidos a las funcionalidades más utilizadas.

Utiliza tarjetas informativas con jerarquía visual, gráficos minimalistas y elementos que permitan identificar rápidamente situaciones importantes.

No llenes el dashboard de gráficos innecesarios. Cada elemento debe aportar información útil.

## 4. Navegación y estructura

Implementa una estructura de navegación profesional:

- Sidebar lateral con iconos y nombres descriptivos.
- Logotipo de la empresa en la parte superior.
- Menú organizado por módulos y funcionalidades.
- Opción para contraer y expandir el sidebar.
- Header superior con título de la sección, contexto de navegación y perfil del usuario.
- Breadcrumbs cuando aporten valor.
- Indicador visual de la sección activa.

La navegación debe ser consistente en toda la aplicación.

## 5. Componentes e interfaces

Diseña componentes reutilizables para:

- Tarjetas KPI.
- Tablas de datos.
- Formularios.
- Campos de búsqueda.
- Filtros.
- Selectores.
- Modales.
- Menús desplegables.
- Notificaciones.
- Badges de estados.
- Paginación.
- Gráficos.
- Estados de carga (skeletons).
- Estados vacíos.
- Mensajes de error y confirmación.

Las tablas deben priorizar la legibilidad y permitir identificar rápidamente los datos relevantes.

Los formularios deben estar organizados por secciones, tener etiquetas claras y mostrar validaciones comprensibles.

## 6. Animaciones y microinteracciones

Implementa animaciones profesionales, sutiles y fluidas.

Ejemplos:
- Transiciones suaves entre secciones.
- Aparición progresiva de tarjetas y elementos.
- Hover elegante en botones y tarjetas.
- Feedback visual al interactuar con controles.
- Animaciones discretas en modales y menús.
- Transiciones en indicadores y gráficos.

Las animaciones deben mejorar la percepción de calidad y facilitar la interacción, nunca distraer al usuario.

Respeta `prefers-reduced-motion` para usuarios que prefieran reducir las animaciones.

## 7. Arquitectura y tecnologías frontend

Utiliza:

- Angular con Standalone Components.
- Angular Signals para el manejo del estado reactivo.
- `input()` y `output()` cuando corresponda.
- `computed()` para valores derivados.
- `effect()` únicamente cuando sea necesario.
- Angular Router para la navegación.
- Lazy Loading para los módulos.
- Reactive Forms para formularios.
- Servicios para separar la lógica de negocio de la presentación.
- Componentes reutilizables y desacoplados.

Aplica buenas prácticas de arquitectura, separación de responsabilidades y mantenibilidad.

Evita componentes excesivamente grandes y lógica de negocio dentro de las plantillas.

## 8. Diseño responsive

La aplicación debe adaptarse correctamente a:
- Computadoras de escritorio.
- Laptops.
- Tablets.
- Dispositivos móviles.

En pantallas pequeñas, adapta el sidebar, las tablas, los formularios y las tarjetas para mantener una experiencia cómoda.

## 9. Reglas de desarrollo

- No inventes funcionalidades que no estén contempladas en los requerimientos del ERP.
- No modifiques la lógica de negocio ni los contratos de la API.
- Utiliza datos de demostración únicamente cuando sea necesario para construir la interfaz.
- Mantén preparada la integración con los endpoints REST existentes.
- Evita duplicación de código.
- Prioriza componentes reutilizables.
- Mantén una estructura de carpetas organizada.
- No agregues dependencias innecesarias.
- Utiliza iconos consistentes y evita emojis como sustitutos de iconografía profesional.

## 10. Resultado esperado

El resultado debe sentirse como un ERP SaaS comercial, moderno y profesional.

La interfaz debe transmitir:

- Claridad.
- Organización.
- Control.
- Confianza.
- Eficiencia.
- Facilidad de uso.

**Prioridad absoluta:** que un usuario pueda ingresar al sistema, comprender rápidamente qué información está viendo, identificar qué puede hacer y ejecutar sus tareas sin necesitar capacitación extensa.

No busques únicamente que la aplicación se vea bonita. Diseña una experiencia que comunique claramente el propósito del ERP y facilite el trabajo diario de la empresa.
