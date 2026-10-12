# Órdenes y comprobantes: integración del formato aprobado

## Implementado en frontend

- El formulario conserva la falla general (`reportedFailureSummary`).
- Cada falla tiene importe opcional y observaciones; ya no se captura nombre de concepto.
- Los nombres de concepto del prototipo se recuperan como parte de las observaciones.
- El subtotal se suma en centavos. Un subtotal histórico sin desglose se conserva hasta que el usuario cambie costos o selecciones; borrar costos no restaura un subtotal anterior.
- La advertencia de calentamiento forma parte de la segunda condición técnica. Se conserva el texto de las órdenes anteriores sin duplicar la primera frase.
- Dos acciones independientes: PDF de orden y PDF de comprobante, con vista previa, descarga e impresión.
- Las exportaciones se agrupan en «Exportar PDF»; iniciar, completar y cancelar están en «Estado». Guardar es la acción principal de las órdenes existentes. El selector de encargado se retiró del formulario, conservando las asignaciones históricas.
- La orden conserva radiador tapado, firmas y garantía; no contiene el talón ni una sección separada de revisión técnica.
- La vista previa se invalida al cambiar los datos; las generaciones obsoletas se descartan y se liberan sus URLs.
- Notas privadas no forman parte del modelo de PDF. No hay datos particulares del ejemplo ni leyendas de prueba insertados en la plantilla de producción.
- El documento permite continuación cuando el texto excede una página; las páginas de la orden se identifican por folio y número.

## Reproducción

`npm run pdf:sample` genera ambos ejemplos desde la plantilla de producción en `output/pdf/`.
El script versionado usa datos de muestra y comprueba también compatibilidad con filas del prototipo `RDROW1`.
Los generadores de `tmp/pdfs/` no son dependencias de la aplicación.

`npm run api:generate -- /ruta/al/backend/supabase/docs/openapi.yaml` actualiza los tipos.
También admite `REFA_OPENAPI_PATH`; sin configuración busca el proyecto guardado y el worktree local conocido.

## Contrato y persistencia por renglón (2026-09-10)

Migración incremental del backend: `20260910160000_add_service_line_details.sql`.
Aplicada únicamente a Supabase local (`Refactor`, API 54521), sin reset ni reescritura de órdenes existentes.

- `service_reported_failure.amount` y `observation` almacenan datos nativos; `otherText` se reserva para el detalle opcional de Otros. Los demás tipos nunca lo envían.
- `lineTotalsMode: LINES` calcula el subtotal en el servidor sumando los renglones. `null` significa importe no capturado; `0` es un costo explícito. Borrar todos los costos produce subtotal cero.
- `lineTotalsMode: LEGACY` conserva el subtotal agregado de órdenes históricas sin inventar costos individuales. Solo permite renglones con importe nulo.
- Las órdenes del contrato anterior mantienen modo nulo y no cambian por la migración. Una actualización de una orden nativa sin modo explícito se rechaza para evitar pérdida silenciosa de datos.
- RPC, validaciones de Edge y OpenAPI admiten los campos nativos. Los tipos TypeScript se regeneraron desde ese contrato.
- El formulario y los datos de ambos PDFs leen los campos nativos. `RDROW1` permanece únicamente como compatibilidad de lectura y generación de muestras del prototipo; ya no se usa al guardar.
- Pruebas: contrato y dominio SQL existentes, regresión SQL con rollback de fixtures, validación/handler de Edge, formulario y mapeo PDF. La comprobación HTTP local cubre creación, edición, consulta y paso a en progreso.

Antes de desplegar: revisar y aplicar la migración en cada ambiente, después publicar Edge y frontend compatibles. No se ha desplegado en producción.

Fuera de esta entrega: PDF persistido en Storage, WhatsApp, firma digital capturada, catálogo independiente de trabajadores y funcionamiento offline.

## Mejoras operativas y borrador automático (2026-09-12)

- Ya no hay botón «Guardar borrador». Cada cambio se respalda en localStorage, separado por usuario y UUID de captura. El listado ofrece recuperar capturas pendientes.
- Al contar con cliente, vehículo y datos válidos, un borrador se sincroniza tras 1.2 segundos sin cambios. Las peticiones se serializan y usan un UUID estable. Una respuesta tardía no reinicia el formulario ni borra lo escrito mientras se enviaba.
- Los estados distinguen respaldo local, envío en curso, sincronización completa y errores. Un conflicto de versión o edición desde otra pestaña pausa la sincronización; no se sobrescribe automáticamente al otro operador.
- Una copia local limpia no reemplaza una versión más reciente del servidor. Las órdenes en progreso tienen respaldo local, pero conservan guardado explícito; completar guarda primero y conserva confirmación.
- Los respaldos locales no sustituyen al servidor: no sobreviven a borrar los datos del navegador, no se comparten entre dispositivos y pueden fallar si el almacenamiento está lleno. No se implementó una PWA ni funcionamiento offline completo.
- Se pueden eliminar copias locales no sincronizadas. Descartar un borrador ya creado en servidor usa la cancelación existente y conserva el registro histórico; no se añadió un endpoint de borrado físico.
- La barra inferior mantiene total y acción principal visibles; iniciar/completar ya no están ocultos en un menú. Los renglones vacíos se compactaron en móvil. La escala distingue «Sin evaluar» de cero y permite limpiar el valor. Retirar un renglón con datos ofrece deshacer.
- El listado conserva filtros en URL y posición de regreso, reinicia paginación al buscar, usa las claves de marca/modelo del contrato y muestra año, motivo y antigüedad. Incluye fechas, limpieza de filtros y reintento.

**Pendiente para la siguiente iteración:** historial de notas privadas con fecha y autor. No se implementó en esta entrega.

## Retroalimentación del cliente (2026-09-15)

- PDF de orden: logo más grande sin bloque de contacto superior; dirección al pie. Columnas 31% falla, 14% costo, 55% observaciones. Advertencias en mayúsculas/negritas y separadas, conservando ambos indicadores independientes.
- Serie en renglón independiente sobre radiador tapado. Bloque izquierdo 29%, información importante 71%, con mayor altura. Se preserva el campo histórico de encargado en el PDF: cambio a proveedor pendiente.
- Comprobante: página LETTER vertical (612 × 792 puntos), comprobante arriba y guía de corte. Imprimir en orientación vertical y tamaño real; el driver puede conservar una orientación manual que el PDF no puede forzar.
- Captura de información importante: editor visual Tiptap con viñetas, numeración, subrayado, resaltado y deshacer. El usuario ve el formato directamente al escribir, sin marcadores ni vista previa duplicada. La conversión conserva el contrato de texto `__subrayado__` y `==resaltado==` del campo existente, compatible con el PDF y las notas previas; no ejecuta HTML. Las condiciones recuperan el tamaño compacto y texto normal en pantalla; las mayúsculas/negritas se conservan exclusivamente en el reporte. No cambia el catálogo de fallas, pendiente de confirmación del cliente.
- Dos teléfonos en total: celular principal y `secondaryPhoneNumber` opcional. Alta y edición del segundo teléfono desde expediente. PDF usa ambos del snapshot de la orden, sin cambiar documentos anteriores por editar el contacto.
- Backend asociado: `20260915100000_add_client_secondary_phone.sql`, extensión de `POST /clients`, nuevo `PATCH /clients/{clientId}` restringido al segundo teléfono, búsqueda por ambos números y snapshots en creación/edición de orden. Contrato OpenAPI actualizado y tipos regenerados.
- **Actualización 2026-09-28:** migración aplicada en Supabase local, sin reset. No desplegada en producción. Test SQL preparado en `tests/database/client_secondary_phone_test.sql`; falta ejecutar su regresión al recuperar Docker.

## Ajustes y prueba de hoja firmada (2026-09-28)

- Logos de marcas mayores, folio sin prefijo visual SER (la serie interna se conserva), dos líneas para falla general, una sola línea de serie y mayor separación antes de radiador tapado.
- Comprobante separado con su composición horizontal original, a lo ancho de la parte superior de una página Letter vertical (no un comprobante estrecho con campos apilados). La impresión debe usar orientación vertical y tamaño real; la vista previa lo indica, pero no podemos anular una orientación manual del controlador.
- «Agregar otro» agrega renglones genéricos con costo y observaciones, sin nombre de concepto. Se conservan sus identificadores al guardar y recuperar; el PDF imprime todos. Solo OTHER admite repeticiones en la base de datos.
- «Documentos firmados» permite cargar una hoja desde escritorio o generar un QR temporal para el celular. La página móvil ofrece cámara o selección de JPG/PNG/PDF (10 MB). No requiere login, pero sí un token de carga aleatorio de 15 minutos, limitado a una orden y su versión. Cerrar el QR revoca el enlace pendiente.
- Se guarda la hoja completa en el bucket privado `service-documents`; se conserva un snapshot de la versión autorizada. Esto no extrae la firma, no comprueba su autenticidad ni guarda automáticamente el PDF original generado. Los documentos anteriores no se sobrescriben al modificar la orden.
- Solo personal autorizado puede listar y abrir documentos mediante URLs temporales. Las rutas públicas devuelven datos mínimos y no permiten consultar el expediente. La carga valida bytes/MIME, tamaño, expiración, exclusión de cargas simultáneas y reintentos por checksum.
- Backend: migraciones `20260928100000_repeat_other_service_rows.sql` y `20260928110000_signed_document_upload_sessions.sql`, función `service-documents`, contrato OpenAPI actualizado. Aplicadas únicamente en local. No hubo reset ni despliegue de producción.
- Validación pendiente: SQL de `tests/database/service_documents_repeat_other_test.sql` y recorrido real cámara → Storage → documento en escritorio. Docker dejó de responder después de aplicar las migraciones; las pruebas unitarias no sustituyen esa comprobación.

### Prueba local

Con Docker y Supabase operativos, servir las funciones desde el proyecto backend y ejecutar el frontend:

```sh
supabase functions serve --no-verify-jwt
# En el frontend; sustituir la IP por la IP LAN actual de la computadora:
VITE_API_REFA_BASE_PATH=/local-api VITE_DOCUMENT_UPLOAD_ORIGIN=http://192.168.1.5:5173 npm run dev -- --host 0.0.0.0
```

El proxy de Vite apunta al API local 54521. La computadora y el celular deben compartir red; localhost no sirve como destino del QR en otro dispositivo. HTTP se usa solo para esta prueba LAN; producción requiere HTTPS, migraciones y función desplegadas. `service-documents` valida la sesión de personal internamente; únicamente las rutas de capacidad temporal son públicas.

`npm run pdf:sample -- --stress-rows` genera una muestra con 24 renglones Otros y notas extensas en `tmp/pdfs/stress-feedback/` para comprobar paginación.

### Distribución adaptable del PDF

- Los renglones sin seleccionar son más compactos; los seleccionados crecen con sus observaciones, sin cambiar la tipografía ni cortar el texto.
- Diagnóstico ya no reserva altura vacía. Información importante crece con el contenido y conserva únicamente el espacio mínimo necesario para serie y radiador tapado.
- Importes, firmas, garantía y pie permanecen juntos en un bloque de cierre. Si el contenido realmente excede una hoja, continúa con folio y encabezado de continuación.
- No se modificó la pantalla de captura ni la distribución del comprobante separado.
- Regresión: `npm run pdf:sample -- --two-other-rows`, `npm run pdf:sample -- --stress-rows` y `node scripts/check-service-order-pdf-layout.mjs` (requiere Poppler). Comprueba una hoja para dos Otros, conservación de costos/notas en el caso extenso y cierre sin separarse.

## Rediseño de pantallas de órdenes y clientes (2026-10-11)

Reemplaza el listado, la captura de órdenes y el expediente del cliente. El listado de clientes, el contrato del API, el autosave (`useServiceDraft`), el esquema, el mapeo de datos y los PDFs no cambian.

- Orden nueva en dos pasos: primero cliente y vehículo (`ClientVehiclePicker`, búsqueda por celular, nombre o placas, alta de cliente y vehículo sin salir), luego la captura.
- Captura en dos columnas: Recepción, Diagnóstico y trabajo, Condiciones a la izquierda; Importe, Documentos y Entrega a la derecha. El total queda siempre visible en el encabezado fijo.
- Diagnóstico con chips del catálogo; cada falla marcada se vuelve una partida con observaciones y costo. «Otro concepto» agrega partidas OTHER repetibles. Quitar una partida con datos ofrece deshacer.
- IVA con interruptor al 16 % calculado en centavos sobre el subtotal. Un IVA histórico distinto de 0 y del 16 % se conserva y se avisa; solo se recalcula si el usuario lo pide.
- Listado con una sola búsqueda que detecta folio, celular o placas, filtro de fechas y antigüedad resaltada a partir de 7 y 14 días.
- Descartar un borrador desde `/service-orders/new` reemplaza la URL por la de la orden para que una recarga no reabra una captura nueva con el mismo identificador.
- Colores propios de estas pantallas en `src/pages/ServiceOrders/tokens.ts`; el tema global no cambia.

Validado de punta a punta contra Supabase local: alta de cliente y vehículo, borrador, inicio, edición, persistencia, PDFs de orden y comprobante, carga y consulta de hoja firmada, QR, completar, cancelar, expediente y lectura de órdenes históricas sin escritura.

## Ajustes posteriores al rediseño (2026-10-12)

- Órdenes completadas editables a petición del cliente: conservan su estado `COMPLETED` y se guardan con «Guardar cambios» (sin autosincronización, igual que las órdenes en progreso). Las canceladas siguen en solo lectura. Backend: `20261012100000_allow_editing_completed_services.sql` cambia solo la validación de estado de `update_service_v1`; aplicada en Supabase local, no en producción. OpenAPI y tipos actualizados.
- Pantalla de inicio: `/` y el inicio de sesión llevan a Órdenes de servicio.
- Celular y teléfono secundario: exactamente 10 dígitos; el campo solo acepta números y corta a 10. «Segundo teléfono» pasa a «Teléfono secundario».
- Rendimiento de la captura: el respaldo local se escribe con el primer cambio de cada ráfaga y otra vez al dejar de escribir 300 ms (y al salir, ocultar la pestaña o desmontar), en lugar de en cada tecla. Totales, chips, encabezado y secciones se suscriben solo a los valores que muestran (`useFormSelector`) y las secciones están memorizadas. Medido en jsdom al escribir 42 caracteres en una observación: render por tecla de 17.7 ms a 1.1 ms y escrituras a `localStorage` de 43 a 2.
