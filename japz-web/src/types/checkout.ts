export type PaymentMethod = 'cash' | 'card' | 'digital' | 'gateway';
export type OrderType = 'dine-in' | 'take-out' | 'delivery';
export interface CheckoutItem {
  id: number | string;
  name: string;
  quantity: number;
  price: number;
  itemPrice?: number;
  selectedSize?: string | null;
  selectedFlavor?: string | null;
  selectedTemperature?: string | null;
}
export interface CheckoutDraft {
  total?: number | string;
  subtotal?: number | string;
  discount?: number | string;
  discountId?: number | string;
  discountPercent?: number;
  voucherCode?: string;
  voucherAmount?: number | string;
  items?: CheckoutItem[];
  itemCount?: number;
  paymentMethod?: PaymentMethod;
  gatewayMethod?: 'gcash' | 'card';
  customerName?: string;
  orderType?: OrderType;
  tableNumber?: string;
  deliveryAddress?: string;
  notes?: string;
}
export interface CheckoutDiscount { id: number; name: string; percentage: number; enabled: boolean }
export interface CheckoutVoucher { id?: number; code: string; amount: number | string; used: boolean; enabled: boolean; startDate: string; endDate: string }
