import type { ProductAvailability } from './types';

const TONE_CLASSES: Record<ProductAvailability['status'], string> = {
  in_stock: 'text-emerald-600',
  limited: 'text-amber-600',
  backorder: 'text-rose-600',
  unknown: 'text-slate-600',
};

const FORMATTER = typeof Intl !== 'undefined'
  ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  : null;

export function describeAvailability(availability?: ProductAvailability | null) {
  if (!availability) return null;

  let label: string;
  const { status, available } = availability;

  switch (status) {
    case 'backorder':
      label = 'Backorder';
      break;
    case 'limited':
      label = 'Limited availability';
      break;
    case 'in_stock':
      label = 'In stock';
      break;
    default:
      label = 'Availability update coming soon';
      break;
  }

  if (typeof available === 'number') {
    if (status === 'limited' && available > 0) {
      label += ` · ${available} left`;
    } else if (status === 'in_stock') {
      label += ` · ${available} available`;
    }
  }

  const asOfLabel = availability.asOf && FORMATTER
    ? `As of ${FORMATTER.format(new Date(availability.asOf))}`
    : undefined;

  return {
    label,
    toneClass: TONE_CLASSES[status],
    asOfLabel,
  };
}
