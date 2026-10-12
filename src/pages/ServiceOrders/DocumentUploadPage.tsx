import { Alert, Box, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { inspectUploadSession } from '../../services/ServiceDocumentService';
import DocumentUploadForm from './DocumentUploadForm';
export default function DocumentUploadPage() {
  const [token] = useState(()=>window.location.hash.slice(1));
  const [done,setDone] = useState(false);
  const valid = /^[a-f0-9]{64}$/.test(token);
  const session = useQuery({queryKey:['document-upload',token],queryFn:()=>inspectUploadSession(token),enabled:valid,retry:false,refetchOnWindowFocus:true});
  const complete = done || session.data?.status==='COMPLETED';
  return <Box component="main" sx={{minHeight:'100dvh',bgcolor:'grey.50',p:{xs:2,sm:4}}}>
    <Paper variant="outlined" sx={{maxWidth:560,mx:'auto',p:{xs:2.5,sm:4}}}>
      <Stack spacing={2.5}>
        <Typography variant="overline" color="primary">Radiadores Díaz</Typography>
        <Typography variant="h5" component="h1" fontWeight={750}>Adjuntar hoja firmada</Typography>
        {!valid ? <Alert severity="error">El enlace no es válido. Escanea un nuevo QR desde la orden.</Alert>
          : session.isPending ? <CircularProgress aria-label="Revisando enlace" />
          : session.error ? <><Alert severity="error">{session.error.message}</Alert><Button onClick={()=>void session.refetch()}>Volver a intentar</Button></>
          : complete ? <Alert severity="success">Documento recibido y asociado a la orden. Ya puedes cerrar esta página.</Alert>
          : session.data && <>
            <Typography>Orden N.º {session.data.folio} · Versión {session.data.serviceVersion}</Typography>
            <DocumentUploadForm token={token} onUploaded={()=>setDone(true)} />
            <Typography variant="caption" color="text.secondary">Enlace válido hasta {new Date(session.data.expiresAt).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'})}. No permite consultar ni modificar el expediente.</Typography>
          </>}
      </Stack>
    </Paper>
  </Box>;
}
