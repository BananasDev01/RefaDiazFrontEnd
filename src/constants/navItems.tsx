// src/constants/navItems.ts
import type { SvgIconProps } from '@mui/material/SvgIcon';
import InventoryIcon from '@mui/icons-material/Inventory';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import DescriptionIcon from '@mui/icons-material/Description';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import { RoleName } from '../types/user.types';

export interface NavItem {
  text: string;
  icon: React.ReactElement<SvgIconProps>;
  path: string;
  roles: RoleName[];
}

export const mainNavItems: NavItem[] = [
  {
    text: 'Clientes',
    icon: <PeopleAltOutlinedIcon />,
    path: '/clients',
    roles: [RoleName.ADMIN, RoleName.EMPLOYEE],
  },
  {
    text: 'Ordenes de servicio',
    icon: <AssignmentOutlinedIcon />,
    path: '/service-orders',
    roles: [RoleName.ADMIN, RoleName.EMPLOYEE],
  },
  {
    text: 'Productos',
    icon: <InventoryIcon />,
    path: '/products',
    roles: [RoleName.ADMIN, RoleName.EMPLOYEE],
  },
  {
    text: 'Proveedores',
    icon: <LocalShippingIcon />,
    path: '/providers',
    roles: [RoleName.ADMIN, RoleName.EMPLOYEE],
  },
  {
    text: 'Notas de Vehiculos',
    icon: <DescriptionIcon />,
    path: '/vehicle-notes',
    roles: [RoleName.ADMIN, RoleName.EMPLOYEE],
  },
];

export const adminNavItems: NavItem[] = [
  {
    text: 'Administracion',
    icon: <AdminPanelSettingsIcon />,
    path: '/admin',
    roles: [RoleName.ADMIN],
  },
];
