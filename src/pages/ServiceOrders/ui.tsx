import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import DirectionsCarOutlinedIcon from '@mui/icons-material/DirectionsCarOutlined';
import { Box, Typography, type BoxProps, type SxProps, type Theme } from '@mui/material';
import type { ReactNode } from 'react';
import type { ServiceOrderCategory, ServiceOrderStatus } from '../../types/serviceOrder.types';
import { SERVICE_ORDER_CATEGORY_LABELS, SERVICE_ORDER_STATUS_LABELS } from '../../types/serviceOrder.types';
import { daysLabel, initials } from './serviceOrderUtils';
import { cardSx, tone } from './tokens';

export const PageCanvas = ({ children, sx }: { children: ReactNode; sx?: SxProps<Theme> }) => (
  <Box
    sx={[
      {
        bgcolor: tone.ground,
        color: tone.text,
        m: { xs: -1.5, sm: -2, md: -3 },
        minHeight: { xs: 'calc(100vh - 56px)', sm: 'calc(100vh - 64px)' },
        fontSize: 14,
      },
      ...(Array.isArray(sx) ? sx : [sx]),
    ]}
  >
    {children}
  </Box>
);

export const PageContainer = ({ children, sx }: { children: ReactNode; sx?: SxProps<Theme> }) => (
  <Box sx={[{ maxWidth: 1360, mx: 'auto', px: { xs: 2, md: 4 } }, ...(Array.isArray(sx) ? sx : [sx])]}>{children}</Box>
);

interface SectionCardProps extends Omit<BoxProps, 'title'> {
  id: string;
  title: ReactNode;
  action?: ReactNode;
  description?: ReactNode;
}

export const SectionCard = ({ id, title, action, description, children, sx, ...rest }: SectionCardProps) => (
  <Box component="section" aria-labelledby={id} sx={[cardSx, { p: { xs: 2, md: 2.5 } }, ...(Array.isArray(sx) ? sx : [sx])]} {...rest}>
    <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1.5, mb: description ? 0.5 : 2 }}>
      <Typography id={id} component="h2" sx={{ fontSize: 16, fontWeight: 700, color: tone.ink }}>{title}</Typography>
      {action}
    </Box>
    {description && <Typography sx={{ color: tone.faint, mb: 1.75, fontSize: 14 }}>{description}</Typography>}
    {children}
  </Box>
);

export const FieldLabel = ({ children, id, htmlFor }: { children: ReactNode; id?: string; htmlFor?: string }) => (
  <Typography component={htmlFor ? 'label' : 'span'} id={id} htmlFor={htmlFor} sx={{ display: 'block', fontSize: 13, fontWeight: 500, color: tone.muted, mb: 0.75 }}>
    {children}
  </Typography>
);

export const PlateBadge = ({ plate, size = 'md' }: { plate?: string | null; size?: 'sm' | 'md' }) => (
  plate ? (
    <Box
      component="span"
      aria-label={`Placas ${plate}`}
      sx={{
        display: 'inline-block',
        border: '1.5px solid currentColor',
        borderRadius: 1,
        px: 0.75,
        fontWeight: 700,
        fontSize: size === 'sm' ? 11 : 12,
        letterSpacing: '0.06em',
        lineHeight: 1.6,
        whiteSpace: 'nowrap',
        color: size === 'sm' ? tone.muted : tone.text,
      }}
    >
      {plate.toUpperCase()}
    </Box>
  ) : null
);

const statusTone: Record<ServiceOrderStatus, { bg: string; fg: string }> = {
  IN_PROGRESS: { bg: tone.primarySoft, fg: tone.primaryDark },
  COMPLETED: { bg: tone.successTint, fg: tone.successInk },
  CANCELLED: { bg: tone.dangerTint, fg: tone.dangerInk },
};

export const StatusPill = ({ status }: { status: ServiceOrderStatus }) => (
  <Box component="span" sx={{ display: 'inline-block', px: 1.25, py: 0.375, borderRadius: 999, bgcolor: statusTone[status].bg, color: statusTone[status].fg, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
    {SERVICE_ORDER_STATUS_LABELS[status]}
  </Box>
);

export const CategoryIcon = ({ category, fontSize = 'small' }: { category: ServiceOrderCategory; fontSize?: 'small' | 'inherit' }) => (
  category === 'PART'
    ? <BuildOutlinedIcon fontSize={fontSize} sx={{ color: tone.partInk }} aria-hidden="true" />
    : <DirectionsCarOutlinedIcon fontSize={fontSize} sx={{ color: tone.faint }} aria-hidden="true" />
);

export const CategoryPill = ({ category }: { category: ServiceOrderCategory }) => (
  <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1.25, py: 0.375, borderRadius: 999, bgcolor: category === 'PART' ? tone.partTint : tone.ground, color: category === 'PART' ? tone.partInk : tone.muted, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
    <CategoryIcon category={category} fontSize="inherit" />
    {SERVICE_ORDER_CATEGORY_LABELS[category]}
  </Box>
);

export const AgePill = ({ days }: { days: number }) => {
  const colors = days >= 14
    ? { bg: tone.dangerTint, fg: tone.dangerInk }
    : days >= 7
      ? { bg: '#FFF1D6', fg: tone.warnInk }
      : { bg: tone.ground, fg: tone.muted };
  return (
    <Box component="span" sx={{ display: 'inline-block', px: 1, py: 0.25, borderRadius: 999, bgcolor: colors.bg, color: colors.fg, fontSize: 12, fontWeight: 700 }}>
      {daysLabel(days)}
    </Box>
  );
};

export const IconTile = ({ children }: { children: ReactNode }) => (
  <Box sx={{ width: 40, height: 40, borderRadius: 2.5, bgcolor: tone.primaryTint, color: tone.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
    {children}
  </Box>
);

export const Avatar = ({ name, size = 40 }: { name: string; size?: number }) => (
  <Box aria-hidden="true" sx={{ width: size, height: size, borderRadius: '50%', bgcolor: tone.primaryTint, color: tone.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: size * 0.36, flex: 'none' }}>
    {initials(name)}
  </Box>
);

