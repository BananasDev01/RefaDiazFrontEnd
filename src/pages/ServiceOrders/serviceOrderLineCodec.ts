import type { ServiceOrder } from '../../types/serviceOrder.types';

const STRUCTURED_LINE_PREFIX = 'RDROW1:';

interface SerializedServiceOrderLine {
  l?: string;
  c?: string;
  a?: number;
  o?: string;
}

export interface ServiceOrderLineDetails {
  customFailure: string;
  conceptName: string;
  amount: number | null;
  observation: string;
}

export interface DecodedServiceOrderLine extends ServiceOrderLineDetails {
  structured: boolean;
}

const cleanText = (value: unknown) => typeof value === 'string' ? value.trim() : '';

export const readServiceOrderLine = (
  line: ServiceOrder['reportedFailures'][number] | undefined,
  nativeContract: boolean,
): DecodedServiceOrderLine => nativeContract ? {
  structured: true,
  customFailure: line?.otherText?.trim() ?? '',
  conceptName: '',
  amount: line?.amount ?? null,
  observation: line?.observation?.trim() ?? '',
} : decodeServiceOrderLine(line?.otherText);

export const decodeServiceOrderLine = (value?: string | null): DecodedServiceOrderLine => {
  const text = value?.trim() ?? '';
  if (!text.startsWith(STRUCTURED_LINE_PREFIX)) {
    return {
      structured: false,
      customFailure: text,
      conceptName: '',
      amount: null,
      observation: '',
    };
  }

  try {
    const parsed = JSON.parse(text.slice(STRUCTURED_LINE_PREFIX.length)) as SerializedServiceOrderLine;
    const amount = typeof parsed.a === 'number' && Number.isFinite(parsed.a) && parsed.a >= 0
      ? parsed.a
      : null;

    return {
      structured: true,
      customFailure: cleanText(parsed.l),
      conceptName: cleanText(parsed.c),
      amount,
      observation: cleanText(parsed.o),
    };
  } catch {
    return {
      structured: false,
      customFailure: text,
      conceptName: '',
      amount: null,
      observation: '',
    };
  }
};

export const encodeServiceOrderLine = (line: ServiceOrderLineDetails): string | undefined => {
  const payload: SerializedServiceOrderLine = {};
  const customFailure = line.customFailure.trim();
  const conceptName = line.conceptName.trim();
  const observation = line.observation.trim();

  if (customFailure) payload.l = customFailure;
  if (conceptName) payload.c = conceptName;
  if (line.amount !== null && Number.isFinite(line.amount)) payload.a = line.amount;
  if (observation) payload.o = observation;

  return Object.keys(payload).length > 0
    ? `${STRUCTURED_LINE_PREFIX}${JSON.stringify(payload)}`
    : undefined;
};
