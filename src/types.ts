export interface Product {
  id: string;
  name: string;
  category: string;
  unit: string;
  price?: number; // Optional as prices can vary slightly in real shops
  image: string;
  featured?: boolean;
}

export type OrderStatus = 'Pending' | 'Confirmed' | 'Purchased' | 'Out For Delivery' | 'Delivered';

export interface CustomerDetails {
  name: string;
  mobile: string;
  alternateMobile?: string;
  address: string;
  landmark: string;
  area: string;
  pincode?: string;
  instructions?: string;
  customerNotes?: string;
  paymentMethod: 'Cash' | 'UPI';
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface PurchaseRecord {
  orderId: string;
  vendorId: string;
  vendorName: string;
  purchaseAmount: number;
  purchasedItems: string;
  billNumber: string;
  purchaseDate: string;
  billImage?: string; // Data URL or placeholder
}

export interface Runner {
  id: string;
  name: string;
  mobile: string;
  status: 'Active' | 'On Delivery' | 'Offline';
  assignedOrdersCount: number;
}

export interface Order {
  id: string; // LX2026xxxx
  date: string; // DD-MM-YYYY
  time: string; // HH:MM AM/PM
  customerDetails: CustomerDetails;
  items: CartItem[];
  estimatedAmount: number;
  deliveryCharge: number;
  totalAmount: number;
  status: OrderStatus;
  customerNotes?: string;
  purchase?: PurchaseRecord; // Optional until purchase recorded
  runnerId?: string; // Assigned delivery runner ID
  runnerName?: string; // Assigned delivery runner Name
  appliedDiscount?: number;
  appliedOfferCode?: string;
}

export interface CustomerSummary {
  id: string;
  name: string;
  mobile: string;
  address: string;
  totalOrders: number;
  lastOrderDate: string;
}

export interface Vendor {
  id: string;
  shopName: string;
  ownerName: string;
  mobile: string;
  category: string;
  address: string;
  openingTime: string; // e.g. "08:00 AM"
  closingTime: string; // e.g. "09:00 PM"
  status: 'Active' | 'Inactive';
}

export type UserRole = 'Customer' | 'Admin' | 'Staff';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export interface BroadcastMessage {
  id: string;
  senderName: string;
  title: string;
  message: string;
  createdAt: string;
  type: 'info' | 'warning' | 'urgent';
}

export interface Offer {
  id: string;
  title: string;
  description: string;
  discountType: 'percentage' | 'flat' | 'free-delivery' | 'banner-only';
  discountValue?: number;
  minOrderValue?: number;
  bannerColor?: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
}

