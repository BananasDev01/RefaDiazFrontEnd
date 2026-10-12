import { useEffect, useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import type { ServiceOrderFormValues } from '../../../types/serviceOrder.types';
import { sumLineAmounts } from '../serviceOrderText';
import { toCents } from '../serviceOrderUtils';

/**
 * Subscribes to a value derived from the form and re-renders only when it changes,
 * so typing an observation does not re-render totals, chips or the header.
 * Selectors must return small JSON-serializable values.
 */
export function useFormSelector<T>(select: (values: ServiceOrderFormValues) => T): T {
  const { watch, getValues } = useFormContext<ServiceOrderFormValues>();
  const selectRef = useRef(select);
  selectRef.current = select;
  const [value, setValue] = useState(() => select(getValues()));
  const serialized = useRef(JSON.stringify(value));

  useEffect(() => {
    const update = () => {
      const next = selectRef.current(getValues());
      const nextSerialized = JSON.stringify(next);
      if (nextSerialized !== serialized.current) {
        serialized.current = nextSerialized;
        setValue(next);
      }
    };
    update();
    const subscription = watch(update);
    return () => subscription.unsubscribe();
  }, [watch, getValues]);

  return value;
}

export interface LineAmount {
  index: number;
  typeId: number;
  amount: number | null;
}

export interface Totals {
  lines: LineAmount[];
  subtotal: number;
  taxAmount: number;
  total: number;
  preserveLegacySubtotal: boolean;
}

export const selectTotals = (values: ServiceOrderFormValues): Totals => {
  const subtotal = values.preserveLegacySubtotal ? Number(values.subtotal ?? 0) : sumLineAmounts(values.reportedFailures);
  return {
    lines: values.reportedFailures.flatMap((row, index) => (row.selected ? [{ index, typeId: row.reportedFailureTypeId, amount: row.amount }] : [])),
    subtotal,
    taxAmount: Number(values.taxAmount ?? 0),
    total: (toCents(subtotal) + toCents(values.taxAmount)) / 100,
    preserveLegacySubtotal: values.preserveLegacySubtotal,
  };
};

export const useTotals = () => useFormSelector(selectTotals);
