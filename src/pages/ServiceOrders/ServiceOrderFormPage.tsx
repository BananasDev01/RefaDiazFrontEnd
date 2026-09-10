import { yupResolver } from '@hookform/resolvers/yup';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AssignmentTurnedInOutlinedIcon from '@mui/icons-material/AssignmentTurnedInOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import PlayArrowOutlinedIcon from '@mui/icons-material/PlayArrowOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import SearchIcon from '@mui/icons-material/Search';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Grid,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Slider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import PageHeader from '../../components/common/PageHeader';
import { useClient, useClients } from '../../hooks/useClients';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import {
  useReportedFailureTypes,
  useServiceOrder,
  useServiceOrderMutations,
} from '../../hooks/useServiceOrders';
import { useUsers } from '../../hooks/useUsers';
import type { Client, ClientVehicle } from '../../types/client.types';
import {
  SERVICE_ORDER_STATUS_LABELS,
  type ReportedFailureType,
  type ServiceOrder,
  type ServiceOrderCreateRequest,
  type ServiceOrderFormValues,
  type ServiceOrderUpdateRequest,
} from '../../types/serviceOrder.types';
import { serviceOrderSchema } from './serviceOrderSchema';
import { decodeServiceOrderLine, encodeServiceOrderLine } from './serviceOrderLineCodec';
import { ServiceOrderPdfActions } from './pdf/ServiceOrderPdfActions';
import ClientCreateDialog from '../Clients/ClientCreateDialog';
import ClientVehicleDialog from '../Clients/ClientVehicleDialog';

const DEFAULT_INFORMATIONAL_NOTE = 'Si aún con el mantenimiento vuelve a presentar calentamiento o gorgoteo en el recuperador, revisar con un mecánico fuga de compresión.';
const WARRANTY_LEGAL_TEXT = 'Radiadores Díaz se obliga por esta garantía a reparar, reemplazar o cubrir únicamente el valor del producto en cuestión. En ningún caso cubrirá materiales, mano de obra o partes suministradas, ni daños incidentales o consecuenciales derivados de una garantía.';
const warrantyOptions = [0, 3, 6, 12] as const;
const ADD_NEW_CLIENT_ID = -1;
const ADD_NEW_VEHICLE_ID = -1;
const ADD_NEW_CLIENT_OPTION: Client = {
  id: ADD_NEW_CLIENT_ID,
  externalId: 'add-new-client',
  clientName: '+ Añadir nuevo cliente',
  phoneNumber: '',
  phoneNormalized: '',
  active: true,
  vehicles: [],
};

const localDate = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
};

const nullableText = (value: string) => value.trim() || undefined;

const vehicleLabel = (vehicle: ClientVehicle) => {
  const name = [vehicle.carModel?.brand?.name, vehicle.carModel?.name, vehicle.modelYear]
    .filter(Boolean)
    .join(' ');
  const details = [vehicle.plate && `Placas ${vehicle.plate}`, vehicle.color, vehicle.version]
    .filter(Boolean)
    .join(' · ');
  return [name || 'Vehiculo sin modelo', details].filter(Boolean).join(' — ');
};

const createFormValues = (
  failureTypes: ReportedFailureType[],
  order?: ServiceOrder,
  initialClientId?: number | null
): ServiceOrderFormValues => {
  const selectedFailures = order?.reportedFailures ?? [];
  const hasStructuredLines = selectedFailures.some((failure) => (
    decodeServiceOrderLine(failure.otherText).structured
  ));
  const legacyTargetId = hasStructuredLines ? null : selectedFailures[0]?.reportedFailureTypeId ?? null;

  return {
  clientId: order?.clientId ?? initialClientId ?? null,
  clientVehicleId: order?.clientVehicleId ?? null,
  serviceDate: order?.serviceDate ?? localDate(),
  workManagerUserId: order?.workManagerUserId ?? '',
  importantInformation: order?.importantInformation ?? '',
  informationalNote: order?.informationalNote ?? DEFAULT_INFORMATIONAL_NOTE,
  compressionLeakDetected: order?.compressionLeakDetected ?? false,
  coolingSystemAirPressureDetected: order?.coolingSystemAirPressureDetected ?? false,
  radiatorSerialNumber: order?.radiatorSerialNumber ?? '',
  radiatorObstructionLevel: order?.radiatorObstructionLevel ?? null,
  subtotal: order?.subtotal ?? null,
  taxAmount: order?.taxAmount ?? 0,
  warrantyMonths: order?.warrantyMonths ?? null,
  internalNote: '',
  reportedFailures: failureTypes.map((type) => {
    const selected = order?.reportedFailures.find(
      (failure) => failure.reportedFailureTypeId === type.id
    );
    const decoded = decodeServiceOrderLine(selected?.otherText);
    const receivesLegacyFields = selected && type.id === legacyTargetId;
    return {
      reportedFailureTypeId: type.id,
      selected: Boolean(selected),
      customFailure: type.allowsFreeText ? decoded.customFailure : '',
      conceptName: decoded.conceptName || (receivesLegacyFields ? order?.authorizedWorkDescription ?? '' : ''),
      amount: decoded.amount ?? (
        receivesLegacyFields && selectedFailures.length === 1 && order?.subtotal !== undefined
          ? order.subtotal
          : null
      ),
      observation: decoded.observation || (receivesLegacyFields ? order?.vehicleOperationObservations ?? '' : ''),
      externalId: selected?.externalId,
    };
  }),
  };
};

const buildWriteFields = (values: ServiceOrderFormValues, failureTypes: ReportedFailureType[]) => {
  const selectedFailures = values.reportedFailures.filter((failure) => failure.selected);
  const failuresById = new Map(failureTypes.map((type) => [type.id, type]));
  const hasLineAmounts = selectedFailures.some((failure) => failure.amount !== null);
  const lineSubtotal = selectedFailures.reduce((sum, failure) => sum + (failure.amount ?? 0), 0);
  const authorizedWorkDescription = selectedFailures
    .filter((failure) => failure.conceptName.trim() || failure.amount !== null)
    .map((failure) => {
      const label = failuresById.get(failure.reportedFailureTypeId)?.label ?? 'Concepto';
      const concept = failure.conceptName.trim() || 'Sin descripción';
      const amount = failure.amount === null
        ? ''
        : ` - ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(failure.amount)}`;
      return `${label}: ${concept}${amount}`;
    })
    .join('\n');
  const vehicleOperationObservations = selectedFailures
    .filter((failure) => failure.observation.trim())
    .map((failure) => {
      const label = failuresById.get(failure.reportedFailureTypeId)?.label ?? 'Concepto';
      return `${label}: ${failure.observation.trim()}`;
    })
    .join('\n');

  return {
  clientVehicleId: values.clientVehicleId as number,
  serviceDate: values.serviceDate,
  workManagerUserId: nullableText(values.workManagerUserId),
  authorizedWorkDescription: nullableText(authorizedWorkDescription),
  vehicleOperationObservations: nullableText(vehicleOperationObservations),
  importantInformation: nullableText(values.importantInformation),
  informationalNote: nullableText(values.informationalNote),
  compressionLeakDetected: values.compressionLeakDetected,
  coolingSystemAirPressureDetected: values.coolingSystemAirPressureDetected,
  radiatorSerialNumber: nullableText(values.radiatorSerialNumber),
  radiatorObstructionLevel: values.radiatorObstructionLevel ?? undefined,
  subtotal: hasLineAmounts ? lineSubtotal : values.subtotal ?? undefined,
  taxAmount: values.taxAmount,
  warrantyMonths: values.warrantyMonths ?? undefined,
  legalTextSnapshot: { warrantyDisclaimer: WARRANTY_LEGAL_TEXT },
  reportedFailures: selectedFailures
    .map((failure) => ({
      externalId: failure.externalId ?? uuidv4(),
      reportedFailureTypeId: failure.reportedFailureTypeId,
      otherText: encodeServiceOrderLine(failure),
    })),
  internalNotes: values.internalNote.trim()
    ? [{ externalId: uuidv4(), note: values.internalNote.trim() }]
    : [],
  };
};

const Section = ({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) => (
  <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
    <Box sx={{ px: { xs: 2, md: 3 }, py: 2, bgcolor: 'grey.50' }}>
      <Typography variant="overline" color="secondary.main" fontWeight={750}>{eyebrow}</Typography>
      <Typography variant="h6" fontWeight={750}>{title}</Typography>
    </Box>
    <Divider />
    <Box sx={{ p: { xs: 2, md: 3 } }}>{children}</Box>
  </Paper>
);

interface ServiceOrderFormProps {
  order?: ServiceOrder;
  failureTypes: ReportedFailureType[];
  initialClientId?: number | null;
  returnTo?: string;
}

export const ServiceOrderForm = ({ order, failureTypes, initialClientId, returnTo }: ServiceOrderFormProps) => {
  const navigate = useNavigate();
  const isTerminal = order?.status === 'COMPLETED' || order?.status === 'CANCELLED';
  const [clientSearch, setClientSearch] = useState('');
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [isVehicleDialogOpen, setIsVehicleDialogOpen] = useState(false);
  const [transition, setTransition] = useState<'complete' | 'cancel' | null>(null);
  const debouncedClientSearch = useDebouncedValue(clientSearch.trim(), 300);
  const { data: clientResults, isFetching: isSearchingClients } = useClients({
    q: debouncedClientSearch || undefined,
    limit: 20,
    offset: 0,
  });
  const { users, isLoading: isLoadingUsers } = useUsers();
  const {
    createServiceOrder,
    updateServiceOrder,
    startServiceOrder,
    completeServiceOrder,
    cancelServiceOrder,
    isSaving,
    isTransitioning,
  } = useServiceOrderMutations();
  const methods = useForm<ServiceOrderFormValues>({
    resolver: yupResolver(serviceOrderSchema),
    defaultValues: createFormValues(failureTypes, order, initialClientId),
  });
  const {
    control,
    formState: { errors, isDirty },
    handleSubmit,
    reset,
    setValue,
  } = methods;
  const selectedClientId = useWatch({ control, name: 'clientId' });
  const subtotal = useWatch({ control, name: 'subtotal' }) ?? 0;
  const taxAmount = useWatch({ control, name: 'taxAmount' }) ?? 0;
  const reportedFailures = useWatch({ control, name: 'reportedFailures' });
  const { data: selectedClient, isLoading: isLoadingClient } = useClient(selectedClientId);
  const clientOptions = useMemo(() => {
    const options = clientResults?.data ?? [];
    const availableClients = !selectedClient || options.some((client) => client.id === selectedClient.id)
      ? options
      : [selectedClient, ...options];
    return [...availableClients, ADD_NEW_CLIENT_OPTION];
  }, [clientResults?.data, selectedClient]);
  const hasLineAmounts = reportedFailures.some((failure) => failure.selected && failure.amount !== null);
  const lineSubtotal = reportedFailures.reduce(
    (sum, failure) => sum + (failure.selected ? failure.amount ?? 0 : 0),
    0
  );
  const displayedSubtotal = hasLineAmounts ? lineSubtotal : Number(subtotal || 0);
  const total = displayedSubtotal + Number(taxAmount || 0);
  const backDestination = returnTo ?? '/service-orders';
  const backLabel = returnTo?.startsWith('/clients/') ? 'Volver al cliente' : 'Volver a órdenes';
  const orderReturnQuery = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : '';

  const saveValues = async (values: ServiceOrderFormValues) => {
    const writeFields = buildWriteFields(values, failureTypes);
    if (order) {
      const payload: ServiceOrderUpdateRequest = {
        ...writeFields,
        externalId: order.externalId,
        expectedVersion: order.version,
      };
      const updated = await updateServiceOrder({ externalId: order.externalId, payload });
      reset(createFormValues(failureTypes, updated));
      return updated;
    }

    const externalId = uuidv4();
    const payload: ServiceOrderCreateRequest = {
      ...writeFields,
      externalId,
      provisionalReference: `PEND-SER-${externalId.slice(0, 8).toUpperCase()}`,
    };
    return createServiceOrder(payload);
  };

  const saveDraft = handleSubmit(async (values) => {
    const saved = await saveValues(values);
    if (!order) {
      navigate(`/service-orders/${saved.externalId}${orderReturnQuery}`, { replace: true });
    }
  });

  const startOrder = handleSubmit(async (values) => {
    const currentOrder = !order || isDirty ? await saveValues(values) : order;
    if (!order) {
      navigate(`/service-orders/${currentOrder.externalId}${orderReturnQuery}`, { replace: true });
    }
    const started = await startServiceOrder({
      externalId: currentOrder.externalId,
      expectedVersion: currentOrder.version,
    });
    reset(createFormValues(failureTypes, started));
  });

  const primarySubmit = order?.status === 'IN_PROGRESS' ? saveDraft : startOrder;

  const confirmTransition = async () => {
    if (!order || !transition) return;
    if (transition === 'cancel') {
      const cancelled = await cancelServiceOrder({
        externalId: order.externalId,
        expectedVersion: order.version,
      });
      reset(createFormValues(failureTypes, cancelled));
      setTransition(null);
      return;
    }

    await handleSubmit(async (values) => {
      const currentOrder = isDirty ? await saveValues(values) : order;
      const completed = await completeServiceOrder({
        externalId: currentOrder.externalId,
        expectedVersion: currentOrder.version,
      });
      reset(createFormValues(failureTypes, completed));
      setTransition(null);
    })();
  };

  return (
    <Box component="form" onSubmit={(event) => void primarySubmit(event)} noValidate>
      <PageHeader
        title={order
          ? `Orden ${order.folioNumber ? `${order.folioSeries}-${order.folioNumber}` : order.provisionalReference}`
          : 'Nueva orden de servicio'}
        actionButton={(
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            {order && (
              <ServiceOrderPdfActions
                order={order}
                failureTypes={failureTypes}
                disabled={isSaving || isTransitioning || isDirty}
              />
            )}
            {order && !isTerminal && (
              <>
                <Button color="error" variant="outlined" startIcon={<CancelOutlinedIcon />} onClick={() => setTransition('cancel')} disabled={isTransitioning || isSaving}>
                  Cancelar orden
                </Button>
                {order.status === 'IN_PROGRESS' && (
                  <Button color="success" variant="outlined" startIcon={<AssignmentTurnedInOutlinedIcon />} onClick={() => setTransition('complete')} disabled={isTransitioning || isSaving}>
                    Completar
                  </Button>
                )}
              </>
            )}
            {!order && (
              <Button type="button" variant="outlined" startIcon={<SaveOutlinedIcon />} onClick={() => void saveDraft()} disabled={isSaving || isTransitioning}>
                Guardar borrador
              </Button>
            )}
            {order?.status === 'DRAFT' && (
              <Button type="button" variant="outlined" startIcon={<SaveOutlinedIcon />} onClick={() => void saveDraft()} disabled={isSaving || isTransitioning}>
                Guardar cambios
              </Button>
            )}
            {!isTerminal && (
              <Button type="submit" variant="contained" startIcon={order?.status === 'IN_PROGRESS' ? <SaveOutlinedIcon /> : <PlayArrowOutlinedIcon />} disabled={isSaving || isTransitioning}>
                {isSaving || isTransitioning
                  ? 'Procesando…'
                  : order?.status === 'IN_PROGRESS'
                  ? 'Guardar cambios'
                  : order?.status === 'DRAFT'
                  ? 'Iniciar orden'
                  : 'Crear orden'}
              </Button>
            )}
          </Stack>
        )}
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1} sx={{ mb: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(backDestination)}>{backLabel}</Button>
        {order && <Chip label={SERVICE_ORDER_STATUS_LABELS[order.status]} color={order.status === 'COMPLETED' ? 'success' : order.status === 'CANCELLED' ? 'error' : order.status === 'IN_PROGRESS' ? 'info' : 'default'} />}
      </Stack>

      {isTerminal && (
        <Alert severity={order?.status === 'COMPLETED' ? 'success' : 'warning'} sx={{ mb: 3 }}>
          Esta orden está {SERVICE_ORDER_STATUS_LABELS[order!.status].toLowerCase()} y se conserva como solo lectura.
        </Alert>
      )}

      <Box component="fieldset" disabled={isTerminal} sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}>
        <Stack spacing={3}>
          <Section eyebrow="Recepción" title="Cotización de trabajo o refacciones">
            <Grid container spacing={2.5}>
              <Grid size={{ xs: 12, md: 5 }}>
                <Controller
                  name="clientId"
                  control={control}
                  render={({ field }) => (
                    <Autocomplete<Client>
                      options={clientOptions}
                      value={selectedClient ?? null}
                      loading={isSearchingClients || isLoadingClient}
                      getOptionLabel={(client) => client.id === ADD_NEW_CLIENT_ID
                        ? client.clientName
                        : `${client.clientName} · ${client.phoneNumber}`}
                      isOptionEqualToValue={(option, value) => option.id === value.id}
                      onInputChange={(_, value, reason) => {
                        if (reason === 'input') setClientSearch(value);
                      }}
                      onChange={(_, client) => {
                        if (client?.id === ADD_NEW_CLIENT_ID) {
                          setIsClientDialogOpen(true);
                          return;
                        }
                        field.onChange(client?.id ?? null);
                        setValue('clientVehicleId', null, { shouldDirty: true, shouldValidate: true });
                      }}
                      renderOption={(props, client) => (
                        <li {...props} key={client.id}>
                          {client.id === ADD_NEW_CLIENT_ID ? (
                            <Stack direction="row" spacing={1} alignItems="center" color="primary.main" fontStyle="italic" fontWeight={700}>
                              <AddIcon fontSize="small" />
                              <span>Añadir nuevo cliente</span>
                            </Stack>
                          ) : (
                            <Box>
                              <Typography variant="body2" fontWeight={650}>{client.clientName}</Typography>
                              <Typography variant="caption" color="text.secondary">{client.phoneNumber}</Typography>
                            </Box>
                          )}
                        </li>
                      )}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          required
                          label="Buscar cliente"
                          placeholder="Nombre o celular"
                          error={Boolean(errors.clientId)}
                          helperText={errors.clientId?.message ?? 'El celular es el identificador principal.'}
                          slotProps={{
                            input: {
                              ...params.InputProps,
                              startAdornment: <><InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>{params.InputProps.startAdornment}</>,
                            },
                          }}
                        />
                      )}
                    />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 5 }}>
                <Controller
                  name="clientVehicleId"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth required error={Boolean(errors.clientVehicleId)}>
                      <InputLabel id="service-vehicle-label">Vehículo</InputLabel>
                      <Select
                        {...field}
                        value={field.value ?? ''}
                        onChange={(event) => {
                          const vehicleId = Number(event.target.value);
                          if (vehicleId === ADD_NEW_VEHICLE_ID) {
                            setIsVehicleDialogOpen(true);
                            return;
                          }
                          setValue('clientVehicleId', vehicleId, {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          });
                        }}
                        labelId="service-vehicle-label"
                        label="Vehículo"
                        disabled={!selectedClient}
                      >
                        {selectedClient?.vehicles.map((vehicle) => (
                          <MenuItem key={vehicle.clientVehicleId} value={vehicle.clientVehicleId}>{vehicleLabel(vehicle)}</MenuItem>
                        ))}
                        <MenuItem
                          value={ADD_NEW_VEHICLE_ID}
                          sx={{ mt: selectedClient?.vehicles.length ? 0.5 : 0, borderTop: selectedClient?.vehicles.length ? 1 : 0, borderColor: 'divider', color: 'primary.main', fontStyle: 'italic', fontWeight: 700 }}
                        >
                          <AddIcon fontSize="small" sx={{ mr: 1 }} />
                          Agregar vehículo
                        </MenuItem>
                      </Select>
                      <FormHelperText>{errors.clientVehicleId?.message ?? (selectedClient?.vehicles.length === 0 ? 'Agrega un vehículo para continuar.' : '')}</FormHelperText>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 2 }}>
                <Controller name="serviceDate" control={control} render={({ field }) => <TextField {...field} fullWidth required type="date" label="Fecha" slotProps={{ inputLabel: { shrink: true } }} error={Boolean(errors.serviceDate)} helperText={errors.serviceDate?.message} />} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Controller
                  name="workManagerUserId"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel id="work-manager-label">Encargado del trabajo (opcional)</InputLabel>
                      <Select {...field} labelId="work-manager-label" label="Encargado del trabajo (opcional)" disabled={isLoadingUsers}>
                        <MenuItem value=""><em>Sin asignar</em></MenuItem>
                        {users.filter((user) => user.active !== false).map((user) => (
                          <MenuItem key={user.id} value={user.id}>{[user.person?.name, user.person?.lastName].filter(Boolean).join(' ') || user.person?.email || user.id}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Controller name="radiatorSerialNumber" control={control} render={({ field }) => <TextField {...field} fullWidth label="Número o serie del radiador (opcional)" />} />
              </Grid>
            </Grid>
          </Section>

          <Section eyebrow="Diagnóstico" title="Renglones de trabajo">
            <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
              Selecciona una falla y captura en el mismo renglón el trabajo o refacción, su costo y las observaciones correspondientes.
            </Alert>

            <Box
              sx={{
                display: { xs: 'none', lg: 'grid' },
                gridTemplateColumns: 'minmax(220px, 0.9fr) minmax(310px, 0.85fr) minmax(360px, 1.25fr)',
                border: 1,
                borderColor: 'divider',
                borderBottom: 0,
                bgcolor: 'grey.100',
              }}
            >
              {[
                'Falla reportada',
                'Trabajo / refacción autorizada y costo',
                'Observaciones del funcionamiento o fallas',
              ].map((label, index) => (
                <Typography
                  key={label}
                  variant="overline"
                  fontWeight={800}
                  sx={{
                    px: 2,
                    py: 1.25,
                    lineHeight: 1.2,
                    borderLeft: index === 0 ? 0 : 1,
                    borderColor: 'divider',
                  }}
                >
                  {label}
                </Typography>
              ))}
            </Box>

            <Stack spacing={{ xs: 1.5, lg: 0 }}>
              {failureTypes.map((type, index) => {
                const isSelected = Boolean(reportedFailures[index]?.selected);
                return (
                  <Paper
                    key={type.id}
                    variant="outlined"
                    sx={{
                      display: { xs: 'block', lg: 'grid' },
                      gridTemplateColumns: 'minmax(220px, 0.9fr) minmax(310px, 0.85fr) minmax(360px, 1.25fr)',
                      borderColor: isSelected ? 'primary.light' : 'divider',
                      borderRadius: { xs: 1, lg: 0 },
                      bgcolor: isSelected ? 'background.paper' : 'grey.50',
                      transition: 'border-color 160ms ease, background-color 160ms ease',
                      '&:not(:last-of-type)': { borderBottomWidth: { lg: 0 } },
                    }}
                  >
                    <Box sx={{ px: 1.5, py: 1.25 }}>
                      <Controller
                        name={`reportedFailures.${index}.selected`}
                        control={control}
                        render={({ field }) => (
                          <FormControlLabel
                            sx={{ m: 0 }}
                            control={<Checkbox checked={field.value} onChange={(_, checked) => field.onChange(checked)} />}
                            label={<Typography variant="body2" fontWeight={isSelected ? 750 : 500}>{type.label}</Typography>}
                          />
                        )}
                      />
                      {type.allowsFreeText && (
                        <Collapse in={isSelected} unmountOnExit>
                          <Controller
                            name={`reportedFailures.${index}.customFailure`}
                            control={control}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                size="small"
                                fullWidth
                                label="Especificar falla (opcional)"
                                error={Boolean(errors.reportedFailures?.[index]?.customFailure)}
                                helperText={errors.reportedFailures?.[index]?.customFailure?.message}
                                sx={{ mt: 1 }}
                              />
                            )}
                          />
                        </Collapse>
                      )}
                    </Box>

                    <Box sx={{ px: 1.5, py: 1.25, borderLeft: { lg: 1 }, borderColor: { lg: 'divider' } }}>
                      <Collapse in={isSelected} unmountOnExit>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} alignItems="flex-start">
                          <Controller
                            name={`reportedFailures.${index}.conceptName`}
                            control={control}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                size="small"
                                fullWidth
                                label="Concepto o nota (opcional)"
                                placeholder="Ej. Tapón nuevo del cliente"
                                error={Boolean(errors.reportedFailures?.[index]?.conceptName)}
                                helperText={errors.reportedFailures?.[index]?.conceptName?.message}
                              />
                            )}
                          />
                          <Controller
                            name={`reportedFailures.${index}.amount`}
                            control={control}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                value={field.value ?? ''}
                                onChange={(event) => field.onChange(event.target.value === '' ? null : Number(event.target.value))}
                                size="small"
                                type="number"
                                label="Costo (opcional)"
                                error={Boolean(errors.reportedFailures?.[index]?.amount)}
                                helperText={errors.reportedFailures?.[index]?.amount?.message}
                                sx={{ width: { xs: '100%', sm: 145 }, flexShrink: 0 }}
                                slotProps={{
                                  input: { startAdornment: <InputAdornment position="start">$</InputAdornment> },
                                  htmlInput: { min: 0, step: '0.01' },
                                }}
                              />
                            )}
                          />
                        </Stack>
                      </Collapse>
                    </Box>

                    <Box sx={{ px: 1.5, py: 1.25, borderLeft: { lg: 1 }, borderColor: { lg: 'divider' } }}>
                      <Collapse in={isSelected} unmountOnExit>
                        <Controller
                          name={`reportedFailures.${index}.observation`}
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              size="small"
                              fullWidth
                              multiline
                              minRows={2}
                              label="Observación (opcional)"
                              placeholder="Ej. El tapón anterior no sella correctamente"
                              error={Boolean(errors.reportedFailures?.[index]?.observation)}
                              helperText={errors.reportedFailures?.[index]?.observation?.message}
                            />
                          )}
                        />
                      </Collapse>
                    </Box>
                  </Paper>
                );
              })}
            </Stack>
          </Section>

          <Section eyebrow="Revisión técnica" title="Información importante">
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 5 }}>
                <Stack spacing={2.5}>
                  <Paper variant="outlined" sx={{ p: 2, borderColor: 'error.light', bgcolor: 'rgba(217, 35, 45, 0.035)' }}>
                    <Typography variant="subtitle2" color="error.main" fontWeight={800} sx={{ mb: 0.5 }}>Condiciones detectadas (opcional)</Typography>
                    <Controller name="compressionLeakDetected" control={control} render={({ field }) => <FormControlLabel sx={{ alignItems: 'flex-start', m: 0 }} control={<Checkbox checked={field.value} onChange={(_, checked) => field.onChange(checked)} color="error" sx={{ mt: -0.5 }} />} label="Fuga de compresión detectada; el vehículo no debe circular en estas condiciones." />} />
                    <Divider sx={{ my: 1 }} />
                    <Controller name="coolingSystemAirPressureDetected" control={control} render={({ field }) => <FormControlLabel sx={{ alignItems: 'flex-start', m: 0 }} control={<Checkbox checked={field.value} onChange={(_, checked) => field.onChange(checked)} color="error" sx={{ mt: -0.5 }} />} label="Se detectó aire en el sistema de enfriamiento, generando presión por el momento controlada." />} />
                  </Paper>
                  <Box sx={{ px: 1 }}>
                    <Typography variant="subtitle2" fontWeight={750}>Radiador tapado (opcional)</Typography>
                    <Controller
                      name="radiatorObstructionLevel"
                      control={control}
                      render={({ field }) => (
                        <Box sx={{ px: 1.5, pt: 1.5 }}>
                          <Slider value={field.value ?? 0} onChange={(_, value) => field.onChange(value as number)} min={0} max={10} step={1} marks valueLabelDisplay="on" aria-label="Nivel de obstrucción del radiador" />
                          <Stack direction="row" justifyContent="space-between"><Typography variant="caption">0 · Libre</Typography><Typography variant="caption">10 · Tapado</Typography></Stack>
                        </Box>
                      )}
                    />
                  </Box>
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, md: 7 }}>
                <Controller name="importantInformation" control={control} render={({ field }) => <TextField {...field} fullWidth multiline minRows={10} label="Información importante (opcional)" />} />
              </Grid>
              <Grid size={12}>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Controller name="informationalNote" control={control} render={({ field }) => <TextField {...field} fullWidth multiline minRows={2} label="Nota informativa del formato (opcional)" helperText="Se imprime como advertencia debajo de las condiciones técnicas." />} />
                </Paper>
              </Grid>
              <Grid size={12}>
                <Paper variant="outlined" sx={{ p: 2, borderStyle: 'dashed', bgcolor: 'background.default' }}>
                  <Typography variant="overline" color="text.secondary" fontWeight={750}>Uso interno · no se imprime</Typography>
                  <Controller name="internalNote" control={control} render={({ field }) => <TextField {...field} fullWidth multiline minRows={2} label="Nota privada del taller (opcional)" helperText="Solo la verá el personal; nunca se mostrará al cliente ni en el PDF." sx={{ mt: 1 }} />} />
                </Paper>
              </Grid>
            </Grid>
          </Section>

          <Section eyebrow="Importes" title="Costo y garantía">
            <Grid container spacing={2.5} alignItems="flex-start">
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField
                  value={new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(displayedSubtotal)}
                  fullWidth
                  label="Costo del trabajo"
                  helperText={hasLineAmounts ? 'Suma automática de los costos capturados.' : 'Conserva el subtotal anterior hasta capturar costos por renglón.'}
                  slotProps={{ input: { readOnly: true } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Controller name="taxAmount" control={control} render={({ field }) => <TextField {...field} onChange={(event) => field.onChange(event.target.value === '' ? 0 : Number(event.target.value))} fullWidth required type="number" label="IVA" error={Boolean(errors.taxAmount)} helperText={errors.taxAmount?.message ?? 'Importe manual según el contrato.'} slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> }, htmlInput: { min: 0, step: '0.01' } }} />} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField value={new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(total)} fullWidth label="Total" slotProps={{ input: { readOnly: true } }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Controller
                  name="warrantyMonths"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel id="warranty-label">Garantía en piezas (opcional)</InputLabel>
                      <Select {...field} value={field.value ?? ''} onChange={(event) => {
                        const value = event.target.value as number | string;
                        field.onChange(value === '' ? null : Number(value));
                      }} labelId="warranty-label" label="Garantía en piezas (opcional)">
                        <MenuItem value=""><em>Sin especificar</em></MenuItem>
                        {warrantyOptions.map((months) => <MenuItem key={months} value={months}>{months === 0 ? 'Sin garantía' : `${months} meses`}</MenuItem>)}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid size={12}>
                <Alert severity="info" icon={false}><Typography variant="body2"><strong>Leyenda de garantía:</strong> {WARRANTY_LEGAL_TEXT}</Typography></Alert>
              </Grid>
            </Grid>
          </Section>
        </Stack>
      </Box>

      <Dialog open={transition !== null} onClose={() => !isTransitioning && setTransition(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{transition === 'complete' ? 'Completar orden' : 'Cancelar orden'}</DialogTitle>
        <DialogContent>
          <Typography>{transition === 'complete' ? 'Se guardarán los cambios pendientes y la orden quedará cerrada, sin posibilidad de edición.' : 'La orden quedará cancelada y ya no podrá editarse. Esta acción requiere confirmación.'}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransition(null)} disabled={isTransitioning || isSaving}>Volver</Button>
          <Button color={transition === 'cancel' ? 'error' : 'success'} variant="contained" onClick={() => void confirmTransition()} disabled={isTransitioning || isSaving}>
            {isTransitioning || isSaving ? 'Procesando…' : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>

      <ClientCreateDialog
        open={isClientDialogOpen}
        onClose={() => setIsClientDialogOpen(false)}
        onCreated={(client) => {
          setValue('clientId', client.id, { shouldDirty: true, shouldValidate: true });
          setValue('clientVehicleId', null, { shouldDirty: true });
          setIsClientDialogOpen(false);
          setIsVehicleDialogOpen(true);
        }}
      />

      {selectedClientId && (
        <ClientVehicleDialog
          clientId={selectedClientId}
          open={isVehicleDialogOpen}
          onClose={() => setIsVehicleDialogOpen(false)}
          onCreated={(_, clientVehicleId) => {
            setValue('clientVehicleId', clientVehicleId, {
              shouldDirty: true,
              shouldTouch: true,
              shouldValidate: true,
            });
          }}
        />
      )}
    </Box>
  );
};

const ServiceOrderFormPage = () => {
  const { serviceExternalId } = useParams<{ serviceExternalId: string }>();
  const [searchParams] = useSearchParams();
  const initialClientIdValue = searchParams.get('clientId');
  const initialClientId = initialClientIdValue && /^\d+$/.test(initialClientIdValue)
    ? Number(initialClientIdValue)
    : null;
  const returnToValue = searchParams.get('returnTo');
  const returnTo = returnToValue && /^\/clients\/\d+$/.test(returnToValue)
    ? returnToValue
    : undefined;
  const orderQuery = useServiceOrder(serviceExternalId ?? null);
  const failureTypesQuery = useReportedFailureTypes();

  if (orderQuery.isLoading || failureTypesQuery.isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;
  }

  if (orderQuery.isError || failureTypesQuery.isError || (serviceExternalId && !orderQuery.data)) {
    const error = orderQuery.error ?? failureTypesQuery.error;
    return <Alert severity="error">{error instanceof Error ? error.message : 'No fue posible preparar el formulario de la orden.'}</Alert>;
  }

  return (
    <ServiceOrderForm
      key={orderQuery.data ? `${orderQuery.data.externalId}-${orderQuery.data.version}` : 'new'}
      order={orderQuery.data}
      failureTypes={failureTypesQuery.data ?? []}
      initialClientId={initialClientId}
      returnTo={returnTo}
    />
  );
};

export default ServiceOrderFormPage;
