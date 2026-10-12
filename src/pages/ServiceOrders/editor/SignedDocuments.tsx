import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useState } from 'react';
import {
  createUploadSession,
  getServiceDocumentUrl,
  inspectUploadSession,
  listServiceDocuments,
  mobileUploadUrl,
  revokeUploadSession,
  type ServiceUploadSession,
  type SignedServiceDocument,
} from '../../../services/ServiceDocumentService';
import type { ServiceOrder } from '../../../types/serviceOrder.types';
import DocumentUploadForm from '../DocumentUploadForm';
import { tone } from '../tokens';
import { folioLabel } from '../serviceOrderUtils';

interface SignedDocumentsProps {
  order: ServiceOrder;
  disabled: boolean;
}

/** Signed sheet capture: QR for the phone camera or a desktop file, tied to the order version. */
export const SignedDocuments = ({ order, disabled }: SignedDocumentsProps) => {
  const queryClient = useQueryClient();
  const documentsKey = ['service-orders', order.externalId, 'documents'];
  const [session, setSession] = useState<ServiceUploadSession | null>(null);
  const [mode, setMode] = useState<'qr' | 'file'>('qr');
  const [received, setReceived] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<SignedServiceDocument | null>(null);

  const documents = useQuery({ queryKey: documentsKey, queryFn: () => listServiceDocuments(order.externalId) });
  const create = useMutation({
    mutationFn: () => createUploadSession(order.externalId, order.version),
    onSuccess: (created) => { setSession(created); setReceived(false); setUploading(false); },
  });
  const revoke = useMutation({ mutationFn: revokeUploadSession, onSuccess: () => { setSession(null); create.reset(); } });
  const info = useQuery({
    queryKey: ['service-upload-status', session?.id],
    queryFn: () => inspectUploadSession(session!.token),
    enabled: Boolean(session),
    retry: false,
    refetchInterval: (query) => (query.state.data?.status === 'COMPLETED' || query.state.error || received ? false : 2500),
  });
  const file = useQuery({
    queryKey: ['service-document-url', preview?.externalId],
    queryFn: () => getServiceDocumentUrl(preview!.externalId),
    enabled: Boolean(preview),
    staleTime: 60_000,
  });
  const completed = received || info.data?.status === 'COMPLETED';
  useEffect(() => {
    if (completed) void queryClient.invalidateQueries({ queryKey: ['service-orders', order.externalId, 'documents'] });
  }, [completed, order.externalId, queryClient]);

  const current = documents.data?.find((doc) => doc.serviceVersion === order.version);
  const previous = documents.data?.filter((doc) => doc !== current) ?? [];
  const start = (nextMode: 'qr' | 'file') => { setMode(nextMode); create.mutate(); };
  const closeSession = () => { if (session && !uploading) revoke.mutate(session.id); };

  return (
    <Box>
      {documents.isPending ? <CircularProgress size={22} /> : documents.isError ? (
        <Alert severity="error" action={<Button size="small" onClick={() => void documents.refetch()}>Reintentar</Button>}>No se pudieron consultar los documentos firmados.</Alert>
      ) : (
        <Box sx={{ p: 1.5, borderRadius: 2.5, border: 1, ...(current
          ? { bgcolor: tone.successTint, borderColor: '#B9DEC8' }
          : { bgcolor: tone.warnTint, borderColor: tone.warnBorder }) }}
        >
          <Stack direction="row" spacing={1} alignItems="center" sx={{ color: current ? tone.successInk : tone.warnInk, fontWeight: 500 }}>
            {current ? <CheckCircleOutlineIcon fontSize="small" /> : <ErrorOutlineIcon fontSize="small" />}
            <Typography sx={{ fontWeight: 500, fontSize: 14, flex: 1 }}>{current ? 'Hoja firmada adjunta' : 'Hoja firmada pendiente'}</Typography>
            {current && <Button size="small" onClick={() => setPreview(current)} sx={{ color: tone.successInk }}>Ver</Button>}
          </Stack>
          {current && <Typography sx={{ fontSize: 12, color: tone.successInk, mt: 0.25 }}>{new Date(current.createdAt).toLocaleString('es-MX')} · versión {current.serviceVersion}</Typography>}
          <Stack direction="row" spacing={1} sx={{ mt: 1.25 }}>
            <Button fullWidth size="small" variant="outlined" startIcon={<QrCode2Icon />} disabled={disabled || create.isPending} onClick={() => start('qr')} sx={{ bgcolor: tone.card, height: 36 }}>
              Desde celular
            </Button>
            <Button fullWidth size="small" variant="outlined" color="inherit" startIcon={<UploadFileOutlinedIcon />} disabled={disabled || create.isPending} onClick={() => start('file')} sx={{ bgcolor: tone.card, height: 36, borderColor: tone.borderStrong }}>
              Subir archivo
            </Button>
          </Stack>
          {disabled && <Typography sx={{ fontSize: 12, color: tone.faint, mt: 1 }}>Guarda los cambios antes de adjuntar la hoja de esta versión.</Typography>}
        </Box>
      )}
      {create.error && <Alert severity="error" sx={{ mt: 1 }}>{create.error.message}</Alert>}
      {previous.length > 0 && (
        <Stack spacing={0.5} sx={{ mt: 1 }}>
          {previous.map((doc) => (
            <Stack key={doc.externalId} direction="row" alignItems="center" spacing={1}>
              <Typography sx={{ flex: 1, fontSize: 12, color: tone.faint }}>Hoja de la versión {doc.serviceVersion} · {new Date(doc.createdAt).toLocaleDateString('es-MX')}</Typography>
              <Button size="small" onClick={() => setPreview(doc)}>Ver</Button>
            </Stack>
          ))}
        </Stack>
      )}

      <Dialog open={Boolean(session)} onClose={closeSession} maxWidth="sm" fullWidth>
        <DialogTitle>{completed ? 'Documento recibido' : mode === 'qr' ? 'Escanea para adjuntar la hoja' : 'Adjuntar hoja firmada'}</DialogTitle>
        <DialogContent>
          {completed ? <Alert severity="success">La hoja quedó asociada a la orden.</Alert>
            : session && mode === 'file' ? <DocumentUploadForm token={session.token} onUploaded={() => { setUploading(false); setReceived(true); }} onBusyChange={setUploading} />
              : session && (
                <Stack spacing={2} alignItems="center">
                  <Typography>Orden {folioLabel(order)} · versión {session.serviceVersion}</Typography>
                  <Box sx={{ p: 2, bgcolor: 'white', border: 1, borderColor: tone.border, borderRadius: 2 }}>
                    <QRCodeSVG value={mobileUploadUrl(session.token)} size={224} title="QR para subir la hoja firmada" />
                  </Box>
                  <Typography textAlign="center" variant="body2">Escanea con la cámara del celular, toma la foto de la hoja completa y aparecerá aquí.</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Vence a las {new Date(session.expiresAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} · Al cerrar se cancela el enlace.
                  </Typography>
                </Stack>
              )}
          {info.error && !completed && <Alert severity="error" sx={{ mt: 2 }}>El enlace venció o no responde. Cierra y genera otro QR.</Alert>}
          {revoke.error && <Alert severity="error" sx={{ mt: 2 }}>No se pudo cancelar el enlace; caducará automáticamente.</Alert>}
        </DialogContent>
        <DialogActions>
          <Button disabled={revoke.isPending || uploading} onClick={closeSession}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(preview)} onClose={() => setPreview(null)} maxWidth="md" fullWidth>
        <DialogTitle>Hoja firmada · versión {preview?.serviceVersion}</DialogTitle>
        <DialogContent>
          {file.isPending ? <CircularProgress /> : file.error ? <Alert severity="error">No se pudo abrir el archivo.</Alert>
            : file.data && (file.data.mimeType.startsWith('image/')
              ? <Box component="img" src={file.data.url} alt="Hoja firmada adjunta" sx={{ width: '100%', maxHeight: '70vh', objectFit: 'contain' }} />
              : <Box component="iframe" src={file.data.url} title="PDF de la hoja firmada" sx={{ border: 0, width: '100%', height: '65vh' }} />)}
        </DialogContent>
        <DialogActions>
          {file.data && <Button component="a" href={file.data.url} target="_blank" rel="noopener noreferrer">Abrir / descargar</Button>}
          <Button onClick={() => setPreview(null)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
