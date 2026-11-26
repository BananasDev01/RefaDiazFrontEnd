import { useState } from 'react';
import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import PageHeader from '../../components/common/PageHeader';
import { WhatsNewDialog } from '../../components/releases/WhatsNewDialog';
import { CURRENT_RELEASE, RELEASES, formatReleaseDate, type Release, type ReleaseChange } from '../../constants/releases';

const groupByModule = (changes: ReleaseChange[]) =>
  changes.reduce<Map<string, ReleaseChange[]>>((groups, change) => {
    groups.set(change.module, [...(groups.get(change.module) ?? []), change]);
    return groups;
  }, new Map());

export const ReleaseHistoryPage = () => {
  const [viewing, setViewing] = useState<Release | null>(null);

  return (
    <Box sx={{ maxWidth: 820 }}>
      <PageHeader title="Historial de cambios" />
      <Stack spacing={2}>
        {RELEASES.map((release) => {
          const isCurrent = release.version === CURRENT_RELEASE.version;
          return (
            <Paper key={release.version} variant="outlined" component="section" aria-labelledby={`release-${release.version}`} sx={{ p: { xs: 2, sm: 3 }, bgcolor: 'background.default' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                <Typography id={`release-${release.version}`} variant="h6" component="h2" sx={{ fontWeight: 700 }}>
                  Versión {release.version}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {formatReleaseDate(release.date)}
                </Typography>
                {isCurrent && <Chip label="Actual" size="small" color="primary" variant="outlined" />}
                {release.changes.length > 0 && (
                  <Button size="small" startIcon={<PlayCircleOutlineIcon />} onClick={() => setViewing(release)} sx={{ ml: { sm: 'auto' } }}>
                    Ver con imágenes
                  </Button>
                )}
              </Box>

              {release.summary && (
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1, lineHeight: 1.6 }}>
                  {release.summary}
                </Typography>
              )}

              {[...groupByModule(release.changes)].map(([module, changes]) => (
                <Box key={module} sx={{ mt: 2 }}>
                  <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '0.06em' }}>
                    {module}
                  </Typography>
                  <Stack component="ul" spacing={1.25} sx={{ listStyle: 'none', p: 0, m: 0, mt: 0.5 }}>
                    {changes.map((change) => {
                      const Icon = change.icon;
                      return (
                        <Box component="li" key={change.id} sx={{ display: 'flex', gap: 1.5 }}>
                          <Icon fontSize="small" sx={{ color: 'primary.main', mt: 0.25 }} aria-hidden />
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{change.title}</Typography>
                            <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.55 }}>{change.description}</Typography>
                          </Box>
                        </Box>
                      );
                    })}
                  </Stack>
                </Box>
              ))}
            </Paper>
          );
        })}
      </Stack>

      {viewing && <WhatsNewDialog open release={viewing} onClose={() => setViewing(null)} />}
    </Box>
  );
};
