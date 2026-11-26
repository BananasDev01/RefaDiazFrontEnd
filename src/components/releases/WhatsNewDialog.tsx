import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { formatReleaseDate, type Release } from '../../constants/releases';
import { ReleaseMediaView } from './ReleaseMediaView';

type WhatsNewDialogProps = {
  open: boolean;
  release: Release;
  onClose: () => void;
};

export const WhatsNewDialog = ({ open, release, onClose }: WhatsNewDialogProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [index, setIndex] = useState(0);
  const { changes } = release;
  const change = changes[index];
  const isLast = index === changes.length - 1;

  useEffect(() => {
    if (open) setIndex(0);
  }, [open, release.version]);

  if (!change) return null;

  const titleId = 'whats-new-title';

  return (
    <Dialog open={open} onClose={onClose} fullScreen={isMobile} maxWidth="md" fullWidth aria-labelledby={titleId}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', px: 3, pt: 2.5, pb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box>
          <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600, fontSize: 13 }}>
            Versión {release.version} · {formatReleaseDate(release.date)}
          </Typography>
          <Typography id={titleId} variant="h6" component="h2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
            Qué hay de nuevo
          </Typography>
        </Box>
        <IconButton onClick={onClose} aria-label="Cerrar novedades" edge="end">
          <CloseIcon />
        </IconButton>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 0.85fr) minmax(0, 1.15fr)' }, flex: 1, minHeight: 0 }}>
        {!isMobile && (
          <List dense sx={{ borderRight: 1, borderColor: 'divider', p: 1, overflowY: 'auto' }} aria-label="Cambios de esta versión">
            {changes.map((item, itemIndex) => {
              const Icon = item.icon;
              return (
                <ListItemButton
                  key={item.id}
                  selected={itemIndex === index}
                  onClick={() => setIndex(itemIndex)}
                  sx={{ borderRadius: 2, mb: 0.25, alignItems: 'flex-start', '&.Mui-selected': { bgcolor: 'rgba(42, 75, 141, 0.1)' } }}
                >
                  <ListItemIcon sx={{ minWidth: 36, mt: 0.25, color: itemIndex === index ? 'primary.main' : 'text.secondary' }}>
                    <Icon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={item.title}
                    slotProps={{ primary: { sx: { fontSize: 14, fontWeight: itemIndex === index ? 700 : 500, color: itemIndex === index ? 'primary.main' : 'text.primary', lineHeight: 1.35 } } }}
                  />
                </ListItemButton>
              );
            })}
          </List>
        )}

        <Box sx={{ p: { xs: 2, sm: 2.5 }, display: 'flex', flexDirection: 'column', gap: 1.5, overflowY: 'auto' }} aria-live="polite">
          <ReleaseMediaView change={change} />
          <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700, lineHeight: 1.35 }}>
            {change.title}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
            {change.description}
          </Typography>
          <Typography variant="body2" sx={{ color: 'primary.main', fontSize: 13 }}>
            Dónde: {change.where}
          </Typography>
        </Box>
      </Box>

      <DialogActions sx={{ px: 3, py: 1.5, borderTop: 1, borderColor: 'divider', justifyContent: 'space-between' }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {index + 1} de {changes.length}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={() => setIndex((value) => value - 1)} disabled={index === 0}>
            Anterior
          </Button>
          <Button variant="contained" onClick={() => (isLast ? onClose() : setIndex((value) => value + 1))}>
            {isLast ? 'Entendido' : 'Siguiente'}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};
