# Checklist de Accesibilidad (a11y)
## Memoria Viva Pico Truncado — Etapa 6.0

Preservar y hacer accesible el patrimonio histórico comunitario implica garantizar que personas con discapacidad puedan recorrer el portal. Este checklist detalla los lineamientos y resultados de la auditoría de accesibilidad sobre las rutas públicas principales.

---

### 1. Rutas Auditadas
* **Inicio** (`/`)
* **Buscador y Listado** (`/contributions`)
* **Detalle de Aporte** (`/contributions/[slug]`)

---

### 2. Criterios de Evaluación y Cumplimiento

#### A. Navegación por Teclado y Foco Visible
- [ ] **Tabulación secuencial**: Es posible recorrer todos los enlaces y botones interactivos (menú, cuadro de búsqueda, cards de aporte, botones de error, paginador) usando la tecla `Tab` de manera lógica (de arriba a abajo, de izquierda a derecha).
- [ ] **Foco de teclado visible**: Todos los elementos interactivos tienen un anillo de foco visible (por ejemplo, mediante la clase CSS `:focus-visible` o `:focus`) con un contraste de al menos 3:1 respecto al fondo.
- [ ] **Trampas de foco**: No existen componentes que atrapen el foco de teclado impidiendo que el usuario continúe tabulando.

#### B. Semántica y Estructura (Landmarks & Headings)
- [ ] **Regiones Semánticas (Landmarks)**: El sitio utiliza etiquetas HTML5 estructuradas de manera correcta: `<header>`, `<main>`, `<nav>`, `<footer>` y `<section>`.
- [ ] **Jerarquía de Encabezados**: Cada página dispone de un único encabezado principal `<h1>` (e.g. Título del Proyecto en la Home, Título de la Contribución en el Detalle). La jerarquía subsecuente (`<h2>`, `<h3>`) respeta el orden lógico descendente sin saltos estructurales (por ejemplo, saltar de `<h1>` a `<h4>`).

#### C. Formularios y Búsqueda (Buscador y Filtros)
- [ ] **Asociación de Etiquetas**: El campo de texto de búsqueda tiene una etiqueta explícita o atributo de accesibilidad válido (`aria-label="Buscar aportes históricos"` o `<label htmlFor="...">`).
- [ ] **Elementos de Filtro**: Los controles de filtro (chips, selectores de orden) anuncian su estado y son activables vía teclado (barra espaciadora / enter).
- [ ] **Mensajes de Estado de Búsqueda**: La cantidad de resultados obtenidos tras filtrar se expone de forma accesible para que los lectores de pantalla puedan anunciar los cambios en el listado dinámico.

#### D. Contraste de Color y Textos Alternativos
- [ ] **Relación de Contraste**: Los textos principales y secundarios (incluyendo las leyendas de insignias y las fechas) cumplen con el contraste mínimo WCAG AA (mínimo 4.5:1 para texto normal, 3:1 para texto grande).
- [ ] **Textos alternativos en imágenes (alt)**: Toda imagen cargada en la galería multimedia o en la portada cuenta con un atributo `alt` descriptivo. Las imágenes meramente decorativas tienen un atributo `alt=""` vacío para ser omitidas por lectores de pantalla.

#### E. Experiencia Móvil y Estados de Error
- [ ] **Objetivos de Toque**: Todos los enlaces y botones interactivos tienen un área de contacto mínima de `44x44px` en pantallas táctiles móviles para evitar pulsaciones erróneas.
- [ ] **Respuestas de Error**: Las alertas e indicaciones de error se exponen de forma clara y accesible, utilizando colores coherentes pero sin depender únicamente del color para comunicar el fallo (acompañado de texto o iconos).

---

### 3. Recomendaciones y Hallazgos para Mejoras Futuras
1. **Salto de Contenido**: Implementar un enlace oculto al inicio de la página ("Saltar al contenido principal") enfocado al teclado, permitiendo a usuarios con lectores de pantalla omitir el menú de navegación del encabezado.
2. **Atributos ARIA en Filtros**: Enriquecer los componentes de chips de filtros con `aria-pressed="true/false"` para informar con mayor precisión si se encuentran activos.
