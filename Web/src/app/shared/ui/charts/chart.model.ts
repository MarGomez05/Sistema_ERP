// Tipos compartidos por las gráficas del ERP (SVG/CSS, sin dependencias).
export type ChartTone = 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface DonutSegment {
  key: string;
  label: string;
  value: number;
  tone: ChartTone;
}

export interface ColumnChartItem {
  key: string;
  label: string;
  value: number;
  tone: ChartTone;
}

export interface StockBarItem {
  key: string;
  title: string;
  subtitle: string;
  current: number;
  minimum: number;
  missing: number;
  currentLabel: string;
  minimumLabel: string;
  missingLabel: string;
}
