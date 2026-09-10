# Órdenes y comprobantes: integración del formato aprobado

## Implementado en frontend

- El formulario conserva la falla general (`reportedFailureSummary`).
- Cada falla tiene importe opcional y observaciones; ya no se captura nombre de concepto.
- Los nombres de concepto del prototipo se recuperan como parte de las observaciones.
- El subtotal se suma en centavos. Un subtotal histórico sin desglose se conserva hasta que el usuario cambie costos o selecciones; borrar costos no restaura un subtotal anterior.
- La advertencia de calentamiento forma parte de la segunda condición técnica. Se conserva el texto de las órdenes anteriores sin duplicar la primera frase.
- Dos acciones independientes: PDF de orden y PDF de comprobante, con vista previa, descarga e impresión.
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

## Pendiente: contrato y persistencia por renglón

No se ha modificado ni migrado Supabase durante esta integración de PDF.
El formulario aún utiliza el codec provisional `RDROW1` en `otherText` al escribir.
El backend de referencia prohíbe `other_text` para las fallas que no permiten texto libre.
Por tanto, las pruebas de interfaz y PDF no certifican el guardado real de renglones.

Para cerrar el bloqueo:

1. Agregar importe nullable y observación a `service_reported_failure` y al contrato de entrada/salida; reservar `otherText` para el detalle de Otros.
2. Distinguir las órdenes históricas con subtotal agregado de las nuevas con cálculo por renglón. Calcular/validar totales en el servidor y admitir borrado explícito de importes.
3. Acordar si Otros exige detalle o si sus observaciones bastan.
4. Actualizar RPC, validaciones y OpenAPI; regenerar tipos y retirar el codec de escritura (conservar lectura histórica).
5. Probar creación, edición, recarga, transiciones y ambos PDFs contra Supabase local. No aplicar migraciones en producción sin revisión.

Fuera de esta entrega: PDF persistido en Storage, WhatsApp, firma digital capturada, catálogo independiente de trabajadores y funcionamiento offline.
