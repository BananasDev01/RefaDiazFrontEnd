import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import logoSource from '../../../assets/LOGO CON CONTORNO BLANCO RD.png';
import type { ReportedFailureType, ServiceOrder } from '../../../types/serviceOrder.types';
import { mapServiceOrderToPdfData, type ServiceOrderPdfData } from '../pdf/serviceOrderPdfData';
import type { ServiceOrderPdfKind } from '../pdf/ServiceOrderPdfDocument';
import { tone } from '../tokens';

const renderPdf = async (kind: ServiceOrderPdfKind, data: ServiceOrderPdfData) => {
  const [{ pdf }, { ServiceOrderPdfDocument }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('../pdf/ServiceOrderPdfDocument'),
  ]);
  return pdf(<ServiceOrderPdfDocument kind={kind} data={data} logoSource={logoSource} />).toBlob();
};

const filenameFor = (kind: ServiceOrderPdfKind, folio: string) => (
  `${kind === 'receipt' ? 'comprobante-servicio' : 'orden-servicio'}-${folio}`
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
) + '.pdf';

const documents: { kind: ServiceOrderPdfKind; title: string; caption: string; icon: ReactNode; printHint: string }[] = [
  { kind: 'order', title: 'Orden de servicio', caption: 'Para firma del cliente', icon: <DescriptionOutlinedIcon />, printHint: 'Hoja carta; textos extensos continúan en otra página.' },
  { kind: 'receipt', title: 'Comprobante', caption: 'Talón para el cliente', icon: <ReceiptLongOutlinedIcon />, printHint: 'Imprimir en hoja carta vertical, tamaño real (100 %).' },
];

interface PrintableDocumentsProps {
  order: ServiceOrder;
  failureTypes: ReportedFailureType[];
  disabled: boolean;
}

export const PrintableDocuments = ({ order, failureTypes, disabled }: PrintableDocumentsProps) => {
  const data = useMemo(() => mapServiceOrderToPdfData(order, failureTypes), [order, failureTypes]);
  const [previewKind, setPreviewKind] = useState<ServiceOrderPdfKind | null>(null);
  const [preview, setPreview] = useState<{ key: string; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<ServiceOrderPdfKind | null>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const generationKey = JSON.stringify([previewKind, data]);
  const previewUrl = preview?.key === generationKey && !disabled ? preview.url : null;

  useEffect(() => {
    if (!previewKind || disabled) return;
    // Discard stale generations and release their object URLs.
    let cancelled = false;
    let objectUrl: string | null = null;
    setPreview(null);
    setError(null);
    renderPdf(previewKind, data)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setPreview({ key: generationKey, url: objectUrl });
      })
      .catch((failure: unknown) => {
        if (!cancelled) setError(failure instanceof Error ? failure.message : 'No fue posible generar el PDF.');
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [data, disabled, generationKey, previewKind]);

  const download = async (kind: ServiceOrderPdfKind) => {
    setDownloading(kind);
    setError(null);
    try {
      const url = URL.createObjectURL(await renderPdf(kind, data));
      const link = document.createElement('a');
      link.href = url;
      link.download = filenameFor(kind, data.folio);
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'No fue posible generar el PDF.');
    } finally {
      setDownloading(null);
    }
  };

  const current = documents.find((item) => item.kind === previewKind);

  return (
    <Stack spacing={1}>
      {documents.map((item) => (
        <Box key={item.kind} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.25, border: 1, borderColor: '#E3E7ED', borderRadius: 2.5 }}>
          <Box sx={{ color: tone.primary, display: 'flex' }} aria-hidden="true">{item.icon}</Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 500, fontSize: 14 }}>{item.title}</Typography>
            <Typography sx={{ fontSize: 12, color: tone.faint }}>{item.caption}</Typography>
          </Box>
          <Tooltip title={disabled ? 'Guarda los cambios para generar el PDF actualizado.' : 'Vista previa e impresión'}>
            <span>
              <IconButton aria-label={`Vista previa: ${item.title.toLowerCase()}`} disabled={disabled} onClick={() => setPreviewKind(item.kind)} sx={{ color: tone.primary }}>
                <VisibilityOutlinedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={disabled ? 'Guarda los cambios para generar el PDF actualizado.' : 'Descargar PDF'}>
            <span>
              <IconButton aria-label={`Descargar: ${item.title.toLowerCase()}`} disabled={disabled || downloading !== null} onClick={() => void download(item.kind)} sx={{ color: tone.primary, bgcolor: tone.primaryTint, '&:hover': { bgcolor: tone.primarySoft } }}>
                {downloading === item.kind ? <CircularProgress size={18} /> : <DownloadOutlinedIcon fontSize="small" />}
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      ))}
      {error && !previewKind && <Alert severity="error">{error}</Alert>}

      <Dialog open={previewKind !== null} onClose={() => { setPreviewKind(null); setPreview(null); }} fullWidth maxWidth="lg">
        <DialogTitle>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={0.5}>
            <Typography variant="h6" component="span" fontWeight={700}>{current?.title} {data.folio}</Typography>
            <Typography variant="body2" color="text.secondary">{current?.printHint}</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ p: { xs: 1, sm: 2 }, bgcolor: tone.ground }}>
          {error ? <Alert severity="error">{error}</Alert> : !previewUrl ? (
            <Stack alignItems="center" justifyContent="center" spacing={2} sx={{ minHeight: 520 }}>
              <CircularProgress />
              <Typography color="text.secondary">Preparando el documento…</Typography>
            </Stack>
          ) : (
            <Box component="iframe" ref={frame} title={`Documento: ${current?.title.toLowerCase()} ${data.folio}`} src={previewUrl} sx={{ display: 'block', width: '100%', height: '72vh', border: 0, bgcolor: 'white' }} />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2.5, py: 2, gap: 1 }}>
          <Button onClick={() => { setPreviewKind(null); setPreview(null); }}>Cerrar</Button>
          <Button startIcon={<PrintOutlinedIcon />} disabled={!previewUrl} onClick={() => frame.current?.contentWindow?.print()}>Imprimir</Button>
          <Button component="a" href={previewUrl ?? undefined} download={previewKind ? filenameFor(previewKind, data.folio) : undefined} variant="contained" disableElevation startIcon={<DownloadOutlinedIcon />} disabled={!previewUrl}>
            Descargar PDF
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};
