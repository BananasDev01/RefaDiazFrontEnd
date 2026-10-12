import { Alert, Box, Button, LinearProgress, Stack, Typography } from '@mui/material';
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import { useEffect, useId, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { uploadSignedDocument } from '../../services/ServiceDocumentService';

export default function DocumentUploadForm({ token, onUploaded, onBusyChange }: { token: string; onUploaded: () => void; onBusyChange?: (busy: boolean) => void }) {
  const camera = useRef<HTMLInputElement>(null); const picker = useRef<HTMLInputElement>(null);
  const [file,setFile] = useState<File | null>(null); const [preview,setPreview] = useState('');
  const [error,setError] = useState(''); const id = useId();
  const upload = useMutation({mutationFn:(selected:File)=>uploadSignedDocument(token,selected),onSuccess:onUploaded});
  useEffect(()=>{onBusyChange?.(upload.isPending);},[onBusyChange,upload.isPending]);
  useEffect(()=>{ if(!file) { setPreview(''); return; } const url=URL.createObjectURL(file); setPreview(url); return ()=>URL.revokeObjectURL(url); },[file]);
  useEffect(()=>{ const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';}; if(upload.isPending) window.addEventListener('beforeunload',warn); return ()=>window.removeEventListener('beforeunload',warn); },[upload.isPending]);
  const choose=(selected?:File)=>{
    if(!selected) return;
    upload.reset(); setError('');
    if(selected.size>10*1024*1024) {setFile(null);setError('El archivo supera 10 MB. Reduce su tamaño o toma otra foto.');return;}
    if(!['image/jpeg','image/png','application/pdf'].includes(selected.type)) {setFile(null);setError('Usa JPG, PNG o PDF. Si tu foto está en HEIC, conviértela a JPG.');return;}
    setFile(selected);
  };
  return <Stack spacing={2}>
    <Typography color="text.secondary">Fotografía la hoja completa. Revisa que se distingan el folio, el contenido y la firma antes de guardarla.</Typography>
    <input id={`${id}-camera`} ref={camera} type="file" accept="image/jpeg,image/png" capture="environment" hidden onChange={e=>{choose(e.target.files?.[0]);e.target.value='';}} />
    <input id={`${id}-file`} ref={picker} type="file" accept="image/jpeg,image/png,application/pdf" hidden onChange={e=>{choose(e.target.files?.[0]);e.target.value='';}} />
    <Stack direction={{xs:'column',sm:'row'}} spacing={1}>
      <Button type="button" variant="outlined" disabled={upload.isPending} startIcon={<PhotoCameraOutlinedIcon />} onClick={()=>camera.current?.click()}>Tomar foto</Button>
      <Button type="button" variant="outlined" disabled={upload.isPending} startIcon={<UploadFileOutlinedIcon />} onClick={()=>picker.current?.click()}>Elegir archivo</Button>
    </Stack>
    {file && <Box sx={{border:1,borderColor:'divider',borderRadius:1,p:1.5}}>
      <Typography variant="body2" sx={{overflowWrap:'anywhere'}}>{file.name} · {(file.size/1024/1024).toFixed(1)} MB</Typography>
      {file.type.startsWith('image/') && preview && <Box component="img" src={preview} alt="Vista previa de la hoja firmada" sx={{width:'100%',maxHeight:420,objectFit:'contain',mt:1}} />}
      {file.type==='application/pdf' && preview && <Button component="a" href={preview} target="_blank" rel="noopener noreferrer">Revisar PDF seleccionado</Button>}
    </Box>}
    {(error || upload.error) && <Alert severity="error">{error || upload.error?.message}</Alert>}
    {upload.isPending && <Box role="status"><LinearProgress /><Typography variant="body2" sx={{mt:1}}>Guardando documento… Mantén esta página abierta.</Typography></Box>}
    <Button type="button" size="large" variant="contained" disabled={!file || upload.isPending} onClick={()=>file && upload.mutate(file)}>Guardar documento</Button>
    <Typography variant="caption" color="text.secondary">JPG, PNG o PDF · Hasta 10 MB · Se guardará la hoja tal como la adjuntes.</Typography>
  </Stack>;
}
