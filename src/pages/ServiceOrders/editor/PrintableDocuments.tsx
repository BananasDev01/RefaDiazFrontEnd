import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { Alert, Box, CircularProgress, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { tone } from '../tokens';
import { pdfDocuments, type PdfActions } from './usePdfDocuments';

interface PrintableDocumentsProps {
  pdf: PdfActions;
  disabled: boolean;
}

export const PrintableDocuments = ({ pdf, disabled }: PrintableDocumentsProps) => (
  <Stack spacing={1}>
    {pdfDocuments.map((item) => (
      <Box key={item.kind} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.25, border: 1, borderColor: '#E3E7ED', borderRadius: 2.5 }}>
        <Box sx={{ color: tone.primary, display: 'flex' }} aria-hidden="true">{item.icon}</Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 500, fontSize: 14 }}>{item.title}</Typography>
          <Typography sx={{ fontSize: 12, color: tone.faint }}>{item.caption}</Typography>
        </Box>
        <Tooltip title={disabled ? 'Guarda los cambios para generar el PDF actualizado.' : 'Vista previa e impresión'}>
          <span>
            <IconButton aria-label={`Vista previa: ${item.title.toLowerCase()}`} disabled={disabled} onClick={() => pdf.open(item.kind)} sx={{ color: tone.primary }}>
              <VisibilityOutlinedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={disabled ? 'Guarda los cambios para generar el PDF actualizado.' : 'Descargar PDF'}>
          <span>
            <IconButton aria-label={`Descargar: ${item.title.toLowerCase()}`} disabled={disabled || pdf.downloading !== null} onClick={() => pdf.download(item.kind)} sx={{ color: tone.primary, bgcolor: tone.primaryTint, '&:hover': { bgcolor: tone.primarySoft } }}>
              {pdf.downloading === item.kind ? <CircularProgress size={18} /> : <DownloadOutlinedIcon fontSize="small" />}
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    ))}
    {pdf.error && <Alert severity="error">{pdf.error}</Alert>}
  </Stack>
);
