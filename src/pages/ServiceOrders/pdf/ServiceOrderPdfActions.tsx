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

interface ServiceOrderPdfActionsProps {
  order: ServiceOrder;
  failureTypes: ReportedFailureType[];
  disabled?: boolean;
}

const safeFilename = (folio: string) => (
  `orden-servicio-${folio}`
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
);

export const ServiceOrderPdfActions = ({ order, failureTypes, disabled = false }: ServiceOrderPdfActionsProps) => {
  const [open, setOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const data = useMemo(() => mapServiceOrderToPdfData(order, failureTypes), [failureTypes, order]);
  const filename = `${safeFilename(data.folio)}.pdf`;

  useEffect(() => () => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
  }, [pdfUrl]);

  const openPreview = async () => {
    setOpen(true);
    setError(null);
    if (pdfUrl) return;

    try {
      const [{ pdf }, { ServiceOrderPdfDocument }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./ServiceOrderPdfDocument'),
      ]);
      const blob = await pdf(<ServiceOrderPdfDocument data={data} logoSource={logoSource} />).toBlob();
      setPdfUrl(URL.createObjectURL(blob));
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : 'No fue posible generar el PDF.');
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outlined"
        startIcon={<PictureAsPdfOutlinedIcon />}
        onClick={() => void openPreview()}
        disabled={disabled}
      >
        Vista previa PDF
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="lg">
        <DialogTitle>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={0.5}>
            <Typography variant="h6" component="span" fontWeight={750}>Orden {data.folio}</Typography>
            <Typography variant="body2" color="text.secondary">Documento tamaño carta</Typography>
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
              title={`Vista previa de la orden ${data.folio}`}
              src={pdfUrl}
              sx={{ display: 'block', width: '100%', height: { xs: '65vh', md: '72vh' }, border: 0, bgcolor: 'white' }}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2.5, py: 1.5 }}>
          <Button onClick={() => setOpen(false)}>Cerrar</Button>
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
