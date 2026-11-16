// Contrato del dashboard (DashboardSummaryDto, LowStockItemDto,
// ExpiringLotItemDto del backend).

export interface DashboardSummary {
  activeProducts: number;
  lowStockProducts: number;
  activeLots: number;
  expiringLots: number;
  expiredLots: number;
}

export interface LowStockItem {
  productId: number;
  productCode: string;
  productName: string;
  presentationName: string;
  currentStock: number;
  minStock: number;
  missing: number;
}

export type ExpirationSeverity = 'EXPIRED' | 'RED' | 'YELLOW' | 'NONE';

export interface ExpiringLotItem {
  lotId: number;
  productName: string;
  presentationName: string;
  lotNumber: string;
  expirationDate: string;
  daysRemaining: number;
  severity: ExpirationSeverity;
  label: string;
}
