import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from '../contexts/SnackbarContext';
import { listQuickPhrases, replaceQuickPhrases } from '../services/ServiceOrderService';
import type { ServiceQuickPhraseInput } from '../types/serviceOrder.types';

export const quickPhraseQueryKey = ['service-orders', 'quick-phrases', 'IMPORTANT_INFORMATION'] as const;

export const useQuickPhrases = (enabled = true) => {
  const queryClient = useQueryClient();
  const { showSnackbar } = useSnackbar();

  const query = useQuery({
    queryKey: quickPhraseQueryKey,
    queryFn: listQuickPhrases,
    enabled,
  });

  const save = useMutation({
    mutationFn: (phrases: ServiceQuickPhraseInput[]) => replaceQuickPhrases(phrases),
    onSuccess: (phrases) => {
      queryClient.setQueryData(quickPhraseQueryKey, phrases);
      showSnackbar('Frases guardadas.', 'success');
    },
    onError: (error: Error) => showSnackbar(`No se pudieron guardar las frases: ${error.message}`, 'error'),
  });

  return { phrases: query.data ?? [], isLoading: query.isLoading, isError: query.isError, save };
};
