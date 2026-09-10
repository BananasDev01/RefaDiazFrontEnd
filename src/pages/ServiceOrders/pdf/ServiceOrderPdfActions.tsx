import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
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
import { useEffect, useMemo, useRef, useState } from 'react';
import logoSource from '../../../assets/LOGO CON CONTORNO BLANCO RD.png';
import type { ReportedFailureType, ServiceOrder } from '../../../types/serviceOrder.types';
import { mapServiceOrderToPdfData } from './serviceOrderPdfData';
import type { ServiceOrderPdfKind } from './ServiceOrderPdfDocument';

interface ServiceOrderPdfActionsProps {
  order: ServiceOrder;
  failureTypes: ReportedFailureType[];
  disabled?: boolean;
}

const safeFilename = (folio: string, kind: ServiceOrderPdfKind) => (
  `${kind === 'receipt' ? 'comprobante-servicio' : 'orden-servicio'}-${folio}`
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
);

export const ServiceOrderPdfActions = ({ order, failureTypes, disabled = false }: ServiceOrderPdfActionsProps) => {
  const [kind, setKind] = useState<ServiceOrderPdfKind | null>(null);
  const [preview, setPreview] = useState<{ key: string; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const data = useMemo(() => mapServiceOrderToPdfData(order, failureTypes), [failureTypes, order]);
  const generationKey = JSON.stringify([kind, data]);
  const pdfUrl = preview?.key === generationKey && !disabled ? preview.url : null;
  const filename = `${safeFilename(data.folio, kind ?? 'order')}.pdf`;
  const documentLabel = kind === 'receipt' ? 'Comprobante' : 'Orden';
  const closePreview = () => {
    setKind(null);
    setPreview(null);
  };

  useEffect(() => {
    if (!kind || disabled) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    setPreview(null);
    setError(null);
    const generate = async () => {
      try {
        const [{ pdf }, { ServiceOrderPdfDocument }] = await Promise.all([
          import('@react-pdf/renderer'),
          import('./ServiceOrderPdfDocument'),
        ]);
        if (cancelled) return;
        const blob = await pdf(<ServiceOrderPdfDocument kind={kind} data={data} logoSource={logoSource} />).toBlob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setPreview({ key: generationKey, url: objectUrl });
      } catch (generationError) {
        if (!cancelled) setError(generationError instanceof Error ? generationError.message : 'No fue posible generar el PDF.');
      }
    };
    void generate();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [data, disabled, generationKey, kind]);

  return (
    <>
      <Button
        type="button"
        variant="outlined"
        startIcon={<PictureAsPdfOutlinedIcon />}
        onClick={() => setKind('order')}
        disabled={disabled}
      >
        PDF de orden
      </Button>
      <Button type="button" variant="outlined" startIcon={<PictureAsPdfOutlinedIcon />} onClick={() => setKind('receipt')} disabled={disabled}>
        PDF de comprobante
      </Button>

      <Dialog open={kind !== null} onClose={closePreview} fullWidth maxWidth="lg">
        <DialogTitle>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={0.5}>
            <Typography variant="h6" component="span" fontWeight={750}>{documentLabel} {data.folio}</Typography>
            <Typography variant="body2" color="text.secondary">{kind === 'receipt' ? 'Comprobante independiente para el cliente' : 'Orden tamaño carta; textos extensos continúan en otra página'}</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ p: { xs: 1, sm: 2 }, bgcolor: 'grey.100' }}>
          {error ? (
            <Alert severity="error">{error}</Alert>
          ) : !pdfUrl ? (
            <Stack alignItems="center" justifyContent="center" spacing={2} sx={{ minHeight: 520 }}>
              <CircularProgress />
              <Typography color="text.secondary">Preparando el formato digital…</Typography>
            </Stack>
          ) : (
            <Box
              component="iframe"
              ref={iframeRef}
              title={`Vista previa: ${documentLabel.toLowerCase()} ${data.folio}`}
              src={pdfUrl}
              sx={{ display: 'block', width: '100%', height: { xs: '65vh', md: '72vh' }, border: 0, bgcolor: 'white' }}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2.5, py: 1.5 }}>
          <Button onClick={closePreview}>Cerrar</Button>
          <Button
            type="button"
            startIcon={<PrintOutlinedIcon />}
            onClick={() => iframeRef.current?.contentWindow?.print()}
            disabled={!pdfUrl}
          >
            Imprimir
          </Button>
          <Button
            component="a"
            href={pdfUrl ?? undefined}
            download={filename}
            variant="contained"
            startIcon={<DownloadOutlinedIcon />}
            disabled={!pdfUrl}
          >
            Descargar PDF
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
