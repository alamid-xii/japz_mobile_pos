// utils/helpers.ts
import { Order } from '../types/orders';

// Format currency
export const formatCurrency = (amount: number): string => {
  return `₱${amount.toFixed(2)}`;
};

// Format time
export const formatTime = (date: string): string => {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Generate order number
export const generateOrderNumber = (): string => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD-${timestamp}${random}`;
};

// Calculate order total
export const calculateOrderTotal = (items: Order['items']): number => {
  return items.reduce((total, item) => total + (item.price * item.quantity), 0);
};

// Filter orders by status
export const filterOrdersByStatus = (orders: Order[], status: Order['status']): Order[] => {
  return orders.filter(order => order.status === status);
};

// Debounce function
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};