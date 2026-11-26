import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Drawer as MuiDrawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider, styled, type Theme, type CSSObject, IconButton, Tooltip } from '@mui/material';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import { CURRENT_RELEASE } from '../../constants/releases';
import { mainNavItems, adminNavItems } from '../../constants/navItems.tsx';

const drawerWidth = 240;

const openedMixin = (theme: Theme): CSSObject => ({
  width: drawerWidth,
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: 'hidden',
});

const closedMixin = (theme: Theme): CSSObject => ({
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: 'hidden',
  width: `calc(${theme.spacing(7)} + 1px)`,
  [theme.breakpoints.up('sm')]: {
    width: `calc(${theme.spacing(8)} + 1px)`,
  },
});

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end', // Alinea el ícono de chevron a la derecha
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
}));

const Drawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    width: drawerWidth,
    flexShrink: 0,
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    ...(open && {
      ...openedMixin(theme),
      '& .MuiDrawer-paper': openedMixin(theme),
    }),
    ...(!open && {
      ...closedMixin(theme),
      '& .MuiDrawer-paper': closedMixin(theme),
    }),
  }),
);

interface SidebarProps {
  open: boolean;
  handleDrawerClose: () => void;
  isMobile?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ open, handleDrawerClose, isMobile = false }) => {
  const navigate = useNavigate();
  const showLabels = open || isMobile;

  const handleNavigate = (path: string) => {
    navigate(path);
    if (isMobile) {
      handleDrawerClose();
    }
  };

  const drawerContent = (
    <>
      <DrawerHeader>
        <IconButton onClick={handleDrawerClose}>
          <ChevronLeftIcon />
        </IconButton>
      </DrawerHeader>
      <Divider />
      <List>
        {mainNavItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ display: 'block' }}>
            <Tooltip title={item.text} placement="right" disableHoverListener={showLabels}>
              <ListItemButton
                onClick={() => handleNavigate(item.path)}
                sx={{ minHeight: 48, justifyContent: showLabels ? 'initial' : 'center', px: 2.5 }}
              >
                <ListItemIcon sx={{ minWidth: 0, mr: showLabels ? 3 : 'auto', justifyContent: 'center' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} sx={{ opacity: showLabels ? 1 : 0 }} />
              </ListItemButton>
            </Tooltip>
          </ListItem>
        ))}
      </List>
      <Divider />
      <List>
        {adminNavItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ display: 'block' }}>
            <Tooltip title={item.text} placement="right" disableHoverListener={showLabels}>
              <ListItemButton
                onClick={() => handleNavigate(item.path)}
                sx={{ minHeight: 48, justifyContent: showLabels ? 'initial' : 'center', px: 2.5 }}
              >
                <ListItemIcon sx={{ minWidth: 0, mr: showLabels ? 3 : 'auto', justifyContent: 'center' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} sx={{ opacity: showLabels ? 1 : 0 }} />
              </ListItemButton>
            </Tooltip>
          </ListItem>
        ))}
      </List>
      <Box sx={{ flex: 1 }} />
      <Divider />
      <List>
        <ListItem disablePadding sx={{ display: 'block' }}>
          <Tooltip title={`Novedades · versión ${CURRENT_RELEASE.version}`} placement="right" disableHoverListener={showLabels}>
            <ListItemButton
              onClick={() => handleNavigate('/releases')}
              sx={{ minHeight: 48, justifyContent: showLabels ? 'initial' : 'center', px: 2.5 }}
            >
              <ListItemIcon sx={{ minWidth: 0, mr: showLabels ? 3 : 'auto', justifyContent: 'center', color: 'primary.main' }}>
                <AutoAwesomeOutlinedIcon />
              </ListItemIcon>
              <ListItemText primary="Novedades" sx={{ opacity: showLabels ? 1 : 0 }} />
              {showLabels && (
                <Box component="span" sx={{ fontSize: 12, color: 'text.secondary' }}>
                  v{CURRENT_RELEASE.version}
                </Box>
              )}
            </ListItemButton>
          </Tooltip>
        </ListItem>
      </List>
    </>
  );

  if (isMobile) {
    return (
      <MuiDrawer
        variant="temporary"
        open={open}
        onClose={handleDrawerClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
      >
        {drawerContent}
      </MuiDrawer>
    );
  }

  return (
    <Drawer variant="permanent" open={open}>
      {drawerContent}
    </Drawer>
  );
};
