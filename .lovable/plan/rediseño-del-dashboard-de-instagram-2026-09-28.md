# Rediseño del dashboard de Instagram

## Resultado

Transformar el panel actual para seguir de cerca la referencia adjunta: navegación lateral, fondo blanco/gris muy limpio, métricas compactas, selector de periodo, dos gráficas principales y una franja de contenido destacado con miniaturas reales.

## Pantallas y funciones

1. **Resumen**
   - Selector funcional de 7, 28 y 90 días.
   - Tarjetas de Vistas, Likes, Comentarios, Compartidos, Alcance y Engagement, con comparación contra el periodo anterior cuando haya datos suficientes.
   - Gráfica combinada de vistas, alcance e interacciones.
   - Segunda gráfica de evolución del engagement; no se inventarán datos de retención si Zernio no los entrega.
   - “Contenido destacado” con los cinco posts de mayor rendimiento, miniatura, tipo y vistas; al pulsar abre el detalle existente.

2. **Contenido**
   - Reutilizar y mejorar la cuadrícula de posts, filtros por tipo y orden por rendimiento/fecha.
   - Mantener el detalle y comentarios del post.

3. **Audiencia**
   - Integrar las gráficas actuales de edad, género, país y ciudad dentro del nuevo aspecto.

4. **Engagement**
   - Reunir tendencia, mejores horarios, frecuencia y desgaste de contenido en una sola sección organizada.

5. **Ingresos**
   - Como Zernio no aporta ingresos en el esquema actual, crear un registro manual real de colaboraciones/ventas: concepto, fecha, importe, estado y notas.
   - Totales por periodo, pendiente/cobrado y evolución mensual.

6. **Reportes**
   - Exportación funcional a CSV de resumen, métricas diarias, posts, audiencia e ingresos.
   - El archivo respetará el periodo seleccionado y usará los datos reales del usuario.

7. **Ajustes**
   - Preferencias persistentes: zona horaria, periodo predeterminado y moneda.
   - Estado de conexión, última actualización y botón para refrescar datos.
   - Cerrar sesión.

## Datos y seguridad

- Añadir tablas de ingresos y preferencias con permisos exclusivos para la cuenta autenticada, RLS y GRANTs explícitos.
- Ampliar las funciones protegidas para periodos, comparaciones, destacados, ingresos, ajustes y exportaciones.
- Mantener “Ideas IA” oculto y conservar todo su código.
- No añadir cifras simuladas: los estados sin datos lo indicarán claramente.

## Adaptación visual

- Escritorio: barra lateral fija y área principal amplia como la referencia.
- Móvil: cabecera compacta y navegación inferior/desplegable, sin solapamientos.
- Paleta clara neutral con acentos azul, naranja, violeta y verde para diferenciar métricas.
- Tipografía sans moderna, tarjetas de radio discreto, bordes finos y jerarquía densa.
- Movimiento mínimo en cambios de sección y estados de carga, respetando reducción de movimiento.

## Validación

- Verificar inicio de sesión, cambio de periodo, navegación completa, destacados, detalle de post, alta/edición de ingresos, guardado de ajustes y descargas CSV.
- Revisar escritorio y móvil, consola, solicitudes y compilación final.
