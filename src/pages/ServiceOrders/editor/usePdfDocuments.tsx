import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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

export const pdfDocuments: { kind: ServiceOrderPdfKind; title: string; caption: string; icon: ReactNode; printHint: string }[] = [
  { kind: 'order', title: 'Orden de servicio', caption: 'Para firma del cliente', icon: <DescriptionOutlinedIcon />, printHint: 'Hoja carta; textos extensos continúan en otra página.' },
  { kind: 'receipt', title: 'Comprobante', caption: 'Talón para el cliente', icon: <ReceiptLongOutlinedIcon />, printHint: 'Imprimir en hoja carta vertical, tamaño real (100 %).' },
];

export interface PdfActions {
  open: (kind: ServiceOrderPdfKind) => void;
  download: (kind: ServiceOrderPdfKind) => void;
  downloading: ServiceOrderPdfKind | null;
  error: string | null;
}

/**
 * Preview, print and download for the order and receipt PDFs. The dialog is
 * rendered once by the editor so the header and the documents card share it.
 */
export function usePdfDocuments(order: ServiceOrder | undefined, failureTypes: ReportedFailureType[], disabled: boolean) {
  const data = useMemo(() => (order ? mapServiceOrderToPdfData(order, failureTypes) : null), [order, failureTypes]);
  const [previewKind, setPreviewKind] = useState<ServiceOrderPdfKind | null>(null);
  const [preview, setPreview] = useState<{ key: string; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<ServiceOrderPdfKind | null>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const generationKey = JSON.stringify([previewKind, data]);
  const previewUrl = preview?.key === generationKey && !disabled ? preview.url : null;

  useEffect(() => {
    if (!previewKind || disabled || !data) return;
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

  const open = useCallback((kind: ServiceOrderPdfKind) => { setError(null); setPreviewKind(kind); }, []);
  const close = () => { setPreviewKind(null); setPreview(null); };

  const download = useCallback(async (kind: ServiceOrderPdfKind) => {
    if (!data) return;
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
  }, [data]);

  const current = pdfDocuments.find((item) => item.kind === previewKind);
  const actions = useMemo<PdfActions>(() => ({ open, download: (kind) => void download(kind), downloading, error }), [download, downloading, error, open]);

  const dialog = (
    <Dialog open={previewKind !== null} onClose={close} fullWidth maxWidth="lg">
      <DialogTitle>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={0.5}>
          <Typography variant="h6" component="span" fontWeight={700}>{current?.title} {data?.folio}</Typography>
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
          <Box component="iframe" ref={frame} title={`Documento: ${current?.title.toLowerCase()} ${data?.folio}`} src={previewUrl} sx={{ display: 'block', width: '100%', height: '72vh', border: 0, bgcolor: 'white' }} />
        )}
      </DialogContent>
      <DialogActions sx={{ px: 2.5, py: 2, gap: 1 }}>
        <Button onClick={close}>Cerrar</Button>
        <Button component="a" href={previewUrl ?? undefined} download={previewKind && data ? filenameFor(previewKind, data.folio) : undefined} startIcon={<DownloadOutlinedIcon />} disabled={!previewUrl}>
          Descargar PDF
        </Button>
        <Button variant="contained" disableElevation startIcon={<PrintOutlinedIcon />} disabled={!previewUrl} onClick={() => frame.current?.contentWindow?.print()}>
          Imprimir
        </Button>
      </DialogActions>
    </Dialog>
  );

  return { actions, dialog };
}
