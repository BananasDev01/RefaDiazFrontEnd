import { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import type { ReleaseChange } from '../../constants/releases';

type ReleaseMediaViewProps = {
  change: ReleaseChange;
};

export const ReleaseMediaView = ({ change }: ReleaseMediaViewProps) => {
  const [failed, setFailed] = useState(false);
  const { media, icon: Icon } = change;

  useEffect(() => setFailed(false), [change.id]);

  return (
    <Box
      sx={{
        aspectRatio: '16 / 10',
        width: '100%',
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: 'grey.100',
        border: 1,
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {media && !failed ? (
        media.type === 'video' ? (
          <Box
            key={media.src}
            component="video"
            src={media.src}
            aria-label={media.alt}
            autoPlay
            muted
            loop
            playsInline
            onError={() => setFailed(true)}
            sx={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
          />
        ) : (
          <Box
            key={media.src}
            component="img"
            src={media.src}
            alt={media.alt}
            onError={() => setFailed(true)}
            sx={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
          />
        )
      ) : (
        <Icon sx={{ fontSize: 56, color: 'primary.main', opacity: 0.5 }} aria-hidden />
      )}
    </Box>
  );
};
