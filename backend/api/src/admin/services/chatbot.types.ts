export interface AnalyticsData {
  type: 'orders' | 'revenue' | 'products' | 'customers';
  title: string;
  value: string | number;
  change?: number;
  details?: any;
}
