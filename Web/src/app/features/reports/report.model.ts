// Contrato de reportes (ReportController y DTO del backend, fase 8).

export type ReportGroupBy = 'DAY' | 'MONTH';

export type ReportTab = 'sales' | 'receivables' | 'top-products' | 'stock';

export type StockExportFormat = 'PDF' | 'XLSX';

export interface SalesPeriod {
  period: string;
  label: string;
  salesCount: number;
  total: number;
}

export interface SalesReport {
  from: string;
  to: string;
  groupBy: ReportGroupBy;
  salesCount: number;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  series: SalesPeriod[];
}

export interface ReceivableBucket {
  key: string;
  label: string;
  invoiceCount: number;
  amount: number;
}

export interface ReceivableInvoice {
  invoiceId: number;
  invoiceNumber: string;
  customerName: string;
  issueDate: string;
  dueDate: string | null;
  total: number;
  paidTotal: number;
  balance: number;
  daysOverdue: number;
  bucket: string;
}

export interface ReceivablesReport {
  asOf: string;
  totalOutstanding: number;
  overdueOutstanding: number;
  currentOutstanding: number;
  invoiceCount: number;
  customerCount: number;
  buckets: ReceivableBucket[];
  invoices: ReceivableInvoice[];
}

export interface TopProduct {
  productId: number;
  productCode: string;
  productName: string;
  quantity: number;
  total: number;
  salesCount: number;
}

export interface TopProductsReport {
  from: string;
  to: string;
  products: TopProduct[];
}

export interface StockReportRow {
  productPresentationId: number;
  productCode: string;
  productName: string;
  presentationName: string;
  physicalStock: number;
  sellableStock: number;
  minStock: number;
  currentPrice: number | null;
  lowStock: boolean;
}

export interface StockReport {
  generatedAt: string;
  categoryId: number | null;
  categoryName: string;
  totalPresentations: number;
  lowStockPresentations: number;
  rows: StockReportRow[];
}

export const REPORT_GROUP_OPTIONS: ReadonlyArray<{ value: ReportGroupBy; label: string }> = [
  { value: 'DAY', label: 'Por día' },
  { value: 'MONTH', label: 'Por mes' },
];

export const RECEIVABLE_BUCKET_LABELS: Readonly<Record<string, string>> = {
  CURRENT: 'Al día',
  D1_30: '1 a 30 días',
  D31_60: '31 a 60 días',
  D61_90: '61 a 90 días',
  D90_PLUS: 'Más de 90 días',
};

export function reportBucketLabel(bucket: string): string {
  return RECEIVABLE_BUCKET_LABELS[bucket] ?? bucket;
}

export type ReportBucketTone = 'success' | 'warning' | 'danger';

// Tono del tramo según la antigüedad de la deuda.
export function reportBucketTone(bucket: string): ReportBucketTone {
  switch (bucket) {
    case 'CURRENT':
      return 'success';
    case 'D1_30':
      return 'warning';
    default:
      return 'danger';
  }
}

// Nombre del archivo de exportación de existencias.
export function stockExportFilename(format: StockExportFormat, date: string): string {
  return `existencias-${date}.${format === 'PDF' ? 'pdf' : 'xlsx'}`;
}

const QUANTITY_FORMAT = new Intl.NumberFormat('es-SV', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatQuantity(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : QUANTITY_FORMAT.format(value);
}
