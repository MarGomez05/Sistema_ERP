import {
  ChartTone,
  ColumnChartItem,
  DonutSegment,
  StockBarItem,
} from '@shared/ui/charts/chart.model';
import { DashboardSummary, ExpiringLotItem, LowStockItem } from './dashboard.model';

// Distribución de los lotes activos entre sanos, por vencer y vencidos.
export function buildLotDonut(summary: DashboardSummary | null): DonutSegment[] {
  if (summary === null || summary.activeLots <= 0) {
    return [];
  }

  const activeLots = summary.activeLots;
  const expired = Math.min(Math.max(summary.expiredLots, 0), activeLots);
  const expiring = Math.min(Math.max(summary.expiringLots, 0), activeLots - expired);
  const healthy = Math.max(activeLots - expired - expiring, 0);

  return [
    { key: 'healthy', label: 'Sin alerta', value: healthy, tone: 'success' },
    { key: 'expiring', label: 'Por vencer (30 días)', value: expiring, tone: 'warning' },
    { key: 'expired', label: 'Vencidos', value: expired, tone: 'danger' },
  ];
}

interface ExpirationBucket {
  key: string;
  label: string;
  tone: ChartTone;
  matches: (daysRemaining: number) => boolean;
}

const EXPIRATION_BUCKETS: readonly ExpirationBucket[] = [
  {
    key: 'expired',
    label: 'Vencidos',
    tone: 'danger',
    matches: (days) => days < 0,
  },
  {
    key: 'days-0-7',
    label: '0–7 días',
    tone: 'warning',
    matches: (days) => days >= 0 && days <= 7,
  },
  {
    key: 'days-8-15',
    label: '8–15 días',
    tone: 'info',
    matches: (days) => days >= 8 && days <= 15,
  },
  {
    key: 'days-16-30',
    label: '16–30 días',
    tone: 'brand',
    matches: (days) => days >= 16 && days <= 30,
  },
];

// Agrupa los lotes del endpoint de vencimientos en rangos accionables.
export function buildExpirationBuckets(lots: readonly ExpiringLotItem[]): ColumnChartItem[] {
  return EXPIRATION_BUCKETS.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    tone: bucket.tone,
    value: lots.filter((lot) => bucket.matches(lot.daysRemaining)).length,
  }));
}

// Prepara las barras de stock actual vs mínimo de la página visible.
export function buildStockBars(items: readonly LowStockItem[]): StockBarItem[] {
  return items.map((item) => ({
    key: `${item.productId}-${item.presentationName}`,
    title: item.productName,
    subtitle: `${item.productCode} · ${item.presentationName}`,
    current: item.currentStock,
    minimum: item.minStock,
    missing: Math.max(item.minStock - item.currentStock, 0),
    currentLabel: '',
    minimumLabel: '',
    missingLabel: '',
  }));
}
