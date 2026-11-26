import type { SvgIconComponent } from '@mui/icons-material';
import AbcIcon from '@mui/icons-material/Abc';
import BoltIcon from '@mui/icons-material/Bolt';
import ChecklistIcon from '@mui/icons-material/Checklist';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PersonAddAltIcon from '@mui/icons-material/PersonAddAlt';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import SearchIcon from '@mui/icons-material/Search';

export type ReleaseMedia = {
  type: 'image' | 'video';
  /** Ruta dentro de /public, por ejemplo /releases/1.01/nota-privada.mp4 */
  src: string;
  alt: string;
};

export type ReleaseChange = {
  id: string;
  title: string;
  description: string;
  /** Pantalla donde se encuentra el cambio, en palabras del usuario */
  where: string;
  /** Agrupa los cambios en el historial */
  module: string;
  icon: SvgIconComponent;
  media?: ReleaseMedia;
};

export type Release = {
  /** Versión como la ven los usuarios: 1.00, 1.01, 1.02… */
  version: string;
  /** Fecha de publicación en formato YYYY-MM-DD */
  date: string;
  summary?: string;
  changes: ReleaseChange[];
};

const media = (version: string, file: string, alt: string): ReleaseMedia => ({
  type: file.endsWith('.mp4') ? 'video' : 'image',
  src: `/releases/${version}/${file}`,
  alt,
});

/**
 * Historial de versiones para los usuarios, de la más reciente a la más antigua.
 * Al publicar una versión nueva agrega su entrada al inicio y súbele la versión a package.json.
 */
export const RELEASES: Release[] = [
  {
    version: '1.01',
    date: '2026-11-26',
    changes: [
      {
        id: 'quick-phrases',
        title: 'Frases rápidas',
        description: 'Toca «Frases» en Información importante y elige una: entra como viñeta y la puedes corregir. Con «Editar lista» agregas, cambias u ordenas las frases para todo el equipo.',
        where: 'Orden › Condiciones › Información importante',
        module: 'Órdenes de servicio',
        icon: BoltIcon,
        media: media('1.01', 'frases-rapidas.mp4', 'Se insertan dos frases rápidas en Información importante y se abre la edición de la lista'),
      },
      {
        id: 'compact-diagnosis',
        title: 'Diagnóstico en una sola lista',
        description: 'Cada concepto tiene su casilla. Al marcarlo, en el mismo renglón se abren observaciones y costo, sin subir y bajar la pantalla.',
        where: 'Orden › Diagnóstico y trabajo',
        module: 'Órdenes de servicio',
        icon: ChecklistIcon,
        media: media('1.01', 'diagnostico-compacto.mp4', 'Se marcan conceptos y se escriben sus observaciones y costo en el mismo renglón'),
      },
      {
        id: 'private-note',
        title: 'La nota privada ya se guarda',
        description: 'Escribe la nota y queda en la orden. Puedes corregirla cuando quieras, también después de entregada. Solo la ve el taller; nunca se imprime.',
        where: 'Orden › Condiciones › Nota privada del taller',
        module: 'Órdenes de servicio',
        icon: LockOutlinedIcon,
        media: media('1.01', 'nota-privada.mp4', 'Se escribe una nota privada y sigue ahí al volver a abrir la orden'),
      },
      {
        id: 'serial-on-complete',
        title: 'Número de serie: solo para completar',
        description: 'Puedes crear y guardar la orden sin serie. Al completarla sí se pide; si el radiador no tiene, toca «SIN SERIE».',
        where: 'Orden › Completar y entregar',
        module: 'Órdenes de servicio',
        icon: QrCode2Icon,
        media: media('1.01', 'serie-al-completar.mp4', 'Al completar sin serie se marca el campo y se usa el botón SIN SERIE'),
      },
      {
        id: 'client-prefill',
        title: 'Cliente nuevo más rápido',
        description: 'Lo que escribiste en el buscador pasa solo al formulario: si son números va a Celular y si es texto va a Nombre.',
        where: 'Nueva orden y Clientes › Nuevo cliente',
        module: 'Clientes',
        icon: PersonAddAltIcon,
        media: media('1.01', 'cliente-desde-busqueda.webp', 'Formulario de nuevo cliente con el celular ya escrito'),
      },
      {
        id: 'vehicle-first',
        title: 'El vehículo va primero en el listado',
        description: 'El modelo aparece grande junto al folio, para ubicar la orden de un vistazo. El cliente pasa a la siguiente columna.',
        where: 'Órdenes de servicio',
        module: 'Órdenes de servicio',
        icon: DirectionsCarIcon,
        media: media('1.01', 'vehiculo-primero.webp', 'Listado de órdenes con el modelo del vehículo resaltado'),
      },
      {
        id: 'deleted-orders',
        title: 'Órdenes eliminadas: ver y restaurar',
        description: 'Toca «Ver eliminadas» para saber cuándo, quién y por qué se eliminó una orden. Desde la orden puedes restaurarla.',
        where: 'Órdenes de servicio › Ver eliminadas',
        module: 'Órdenes de servicio',
        icon: DeleteOutlineIcon,
        media: media('1.01', 'ordenes-eliminadas.mp4', 'Se abre la lista de eliminadas y se restaura una orden'),
      },
      {
        id: 'search-serial',
        title: 'Busca también por número de serie',
        description: 'El buscador encuentra por folio, cliente, celular, vehículo, placas o número de serie, aunque la serie sea solo de números.',
        where: 'Órdenes de servicio › Buscador',
        module: 'Órdenes de servicio',
        icon: SearchIcon,
        media: media('1.01', 'buscar-por-serie.webp', 'Búsqueda por número de serie con el resultado encontrado'),
      },
      {
        id: 'spellcheck',
        title: 'Corrector ortográfico en español',
        description: 'Las palabras mal escritas se subrayan en rojo; dale clic derecho para ver sugerencias. Si no aparece, activa Español en los idiomas de Chrome.',
        where: 'Campos de texto de la orden',
        module: 'General',
        icon: AbcIcon,
        media: media('1.01', 'corrector.webp', 'Una palabra subrayada en rojo dentro de Información importante'),
      },
    ],
  },
  {
    version: '1.00',
    date: '2026-10-28',
    summary: 'Versión base: rediseño de clientes y órdenes de servicio, órdenes de pieza, solo dos estados (En progreso y Completada) y guardado automático.',
    changes: [],
  },
];

export const CURRENT_RELEASE = RELEASES[0];

export const formatReleaseDate = (date: string) =>
  new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${date}T00:00:00Z`));
