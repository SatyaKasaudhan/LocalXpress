import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, ShoppingCart, ArrowRight, CheckCircle2, MapPin, 
  Phone, MessageSquare, ShieldAlert, Sparkles, Plus, Minus, Trash2, 
  HelpCircle, ChevronDown, ChevronUp, Star, Mail, Map, CreditCard,
  Check, Store, RefreshCw, ClipboardList, Calendar, Download, History
} from 'lucide-react';
import { Product, CartItem, CustomerDetails, Order, Offer } from '../types';
import { INITIAL_PRODUCTS } from '../mockData';
import { isStoreOpen, getTodayDateStr, getFormattedTime } from '../utils';
import { useToast } from './Toast';
import LocalXpressLogo from './LocalXpressLogo';

interface PublicWebsiteProps {
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, delta: number) => void;
  clearCart: () => void;
  onSubmitOrder: (details: CustomerDetails, discount?: number, appliedOfferCode?: string) => void;
  googleFormUrl: string;
  setGoogleFormUrl: (url: string) => void;
  onNavigateToAdmin: () => void;
  orders: Order[];
  whatsappNumber?: string;
  lastPlacedOrder: Order | null;
  onClearLastPlacedOrder: () => void;
  products?: Product[];
  productsLoading?: boolean;
  ordersLoading?: boolean;
  offers?: Offer[];
  shopTitle?: string;
  shopHeroHeadline?: string;
  shopHeroDescription?: string;
  serviceRadius?: string;
  workingHours?: string;
  baseDeliveryCharge?: number;
  freeDeliveryThreshold?: number;
}

const CATEGORIES = [
  'Grocery', 'Fruits & Vegetables', 'Bakery', 'Medicines', 'Dairy', 
  'Restaurant Food', 'Stationery', 'Electronics', 'Fashion', 'Gift Items', 
  'Household Items', 'Others'
];

export default function PublicWebsite({
  cart,
  addToCart,
  removeFromCart,
  updateQuantity,
  clearCart,
  onSubmitOrder,
  googleFormUrl,
  setGoogleFormUrl,
  onNavigateToAdmin,
  orders,
  productsLoading = false,
  ordersLoading = false,
  whatsappNumber = '919260933792',
  lastPlacedOrder,
  onClearLastPlacedOrder,
  products = INITIAL_PRODUCTS,
  offers = [],
  shopTitle = 'Local Xpress',
  shopHeroHeadline = 'Anything you need from local shops, delivered in minutes.',
  shopHeroDescription = 'We shop for you! From groceries and medicines to fresh bakes and hot restaurant food. We buy directly from your favorite local shops in Siddharthnagar & Birdpur and deliver straight to your doorstep.',
  serviceRadius = '5 KM',
  workingHours = '5 AM - 11 PM',
  baseDeliveryCharge = 40,
  freeDeliveryThreshold = 500,
}: PublicWebsiteProps) {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedOffer, setAppliedOffer] = useState<Offer | null>(null);

  // Order History Tracking States
  const [inputMobile, setInputMobile] = useState(() => localStorage.getItem('lx_tracked_mobile') || '');
  const [searchedMobile, setSearchedMobile] = useState(() => localStorage.getItem('lx_tracked_mobile') || '');
  const [showRecentDropdown, setShowRecentDropdown] = useState(false);

  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('lx_recent_tracked_mobiles');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.filter((item): item is string => typeof item === 'string').slice(0, 3);
        }
      }
      const single = localStorage.getItem('lx_tracked_mobile');
      return single ? [single] : [];
    } catch {
      return [];
    }
  });

  const saveRecentSearch = (mobile: string) => {
    const cleaned = mobile.trim();
    if (!cleaned) return;
    setRecentSearches(prev => {
      const filtered = prev.filter(m => m !== cleaned);
      const next = [cleaned, ...filtered].slice(0, 3);
      localStorage.setItem('lx_recent_tracked_mobiles', JSON.stringify(next));
      return next;
    });
  };

  // Handle URL deep-linking on mount (e.g., from WhatsApp notifications)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const trackId = params.get('track');
    
    if (trackId) {
      setInputMobile(trackId);
      setSearchedMobile(trackId);
      localStorage.setItem('lx_tracked_mobile', trackId);
      
      setTimeout(() => {
        const element = document.getElementById('order-history');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 300);
    }
  }, []);

  const handleSearchMobile = (e?: React.FormEvent | React.KeyboardEvent) => {
    if (e) {
      e.preventDefault();
    }
    const cleaned = inputMobile.trim();
    setSearchedMobile(cleaned);
    localStorage.setItem('lx_tracked_mobile', cleaned);
    if (cleaned) {
      saveRecentSearch(cleaned);
    }
    setShowRecentDropdown(false);
  };

  const handleSelectRecentSearch = (mobile: string) => {
    setInputMobile(mobile);
    setSearchedMobile(mobile);
    localStorage.setItem('lx_tracked_mobile', mobile);
    saveRecentSearch(mobile);
    setShowRecentDropdown(false);
  };

  const handleTrackPlacedOrder = (orderId: string) => {
    onClearLastPlacedOrder();
    setInputMobile(orderId);
    setSearchedMobile(orderId);
    saveRecentSearch(orderId);
    localStorage.setItem('lx_tracked_mobile', orderId);
    
    setTimeout(() => {
      const element = document.getElementById('order-history');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  const trackedOrders = useMemo(() => {
    const searchVal = searchedMobile.trim();
    if (!searchVal) return [];
    
    const matchesOrderId = (order: Order) => {
      const orderIdLower = order.id.toLowerCase();
      const queryLower = searchVal.toLowerCase();
      return orderIdLower === queryLower || orderIdLower.includes(queryLower);
    };

    const cleanSearch = searchVal.replace(/\D/g, '');
    
    return orders
      .filter(order => {
        if (matchesOrderId(order)) {
          return true;
        }
        if (cleanSearch) {
          const primaryMobile = (order.customerDetails.mobile || '').replace(/\D/g, '');
          const altMobile = (order.customerDetails.alternateMobile || '').replace(/\D/g, '');
          return primaryMobile.includes(cleanSearch) || altMobile.includes(cleanSearch);
        }
        return false;
      })
      .sort((a, b) => b.id.localeCompare(a.id)); // Newest first
  }, [orders, searchedMobile]);

  const handleContactAboutOrder = (orderId: string) => {
    const text = encodeURIComponent(`Hello Local Xpress team. I would like to check the delivery status of my Order: ${orderId}. Please assist!`);
    window.open(`https://wa.me/${whatsappNumber}?text=${text}`, '_blank');
  };

  const getStepIndex = (status: string): number => {
    const mapping: Record<string, number> = {
      'Pending': 0,
      'Confirmed': 1,
      'Purchased': 2,
      'Out For Delivery': 3,
      'Delivered': 4,
    };
    return mapping[status] ?? 0;
  };

  const currentOrder = useMemo(() => {
    if (trackedOrders.length === 0) return null;
    const activeOrder = trackedOrders.find(order => order.status !== 'Delivered');
    return activeOrder || trackedOrders[0];
  }, [trackedOrders]);

  const handleDownloadReceipt = (order: Order) => {
    const orderId = order.id;
    const date = order.date;
    const time = order.time || '';
    const customer = order.customerDetails;
    const items = order.items;

    const itemsHtml = items.map((item: any, idx: number) => {
      const name = item.productName || item.product?.name || 'Unknown Product';
      const vendor = item.vendorShopName || 'Local Partner';
      const price = item.price || item.product?.price || 0;
      const quantity = item.quantity || 0;
      const subtotal = price * quantity;

      return `
        <tr>
          <td style="border-bottom: 1px solid #eee; padding: 12px 10px; font-size: 13px; text-align: left;">${idx + 1}</td>
          <td style="border-bottom: 1px solid #eee; padding: 12px 10px; font-size: 13px; text-align: left;">
            <strong>${name}</strong><br>
            <small style="color: #666; font-size: 11px;">Vendor: ${vendor}</small>
          </td>
          <td style="border-bottom: 1px solid #eee; padding: 12px 10px; font-size: 13px; text-align: center;">${quantity}</td>
          <td style="border-bottom: 1px solid #eee; padding: 12px 10px; font-size: 13px; text-align: right;">₹${price}</td>
          <td style="border-bottom: 1px solid #eee; padding: 12px 10px; font-size: 13px; text-align: right;">₹${subtotal}</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Local Xpress Receipt - ${orderId}</title>
  <style>
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      color: #1a1a1a;
      background-color: #f4f4f5;
      line-height: 1.5;
      padding: 40px 20px;
      margin: 0;
    }
    .receipt-container {
      max-width: 680px;
      margin: 0 auto;
      background-color: #ffffff;
      border: 1px solid #e4e4e7;
      border-radius: 24px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
      padding: 44px;
    }
    .header {
      border-bottom: 3px solid #ff6321;
      padding-bottom: 24px;
      margin-bottom: 32px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .brand {
      color: #ff6321;
      font-size: 26px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: -0.5px;
      margin: 0;
    }
    .brand-tag {
      font-size: 11px;
      font-weight: 600;
      color: #71717a;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-top: 6px;
      margin-bottom: 0;
    }
    .receipt-title {
      font-size: 20px;
      font-weight: 800;
      color: #09090b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0;
      text-align: right;
    }
    .status-badge {
      display: inline-block;
      margin-top: 8px;
      font-size: 11px;
      font-weight: 700;
      color: #ff6321;
      background-color: #fff7ed;
      border: 1px solid #ffedd5;
      padding: 4px 12px;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 36px;
      margin-bottom: 36px;
    }
    .meta-box h3 {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #a1a1aa;
      margin-top: 0;
      margin-bottom: 12px;
      border-bottom: 2px solid #f4f4f5;
      padding-bottom: 6px;
    }
    .meta-box p {
      margin: 6px 0;
      font-size: 13px;
      color: #3f3f46;
    }
    .meta-box strong {
      color: #09090b;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 36px;
    }
    .items-table th {
      background-color: #fafafa;
      border-bottom: 2px solid #e4e4e7;
      color: #52525b;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      padding: 12px 10px;
    }
    .totals-box {
      float: right;
      width: 280px;
      margin-bottom: 36px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 13px;
      color: #3f3f46;
    }
    .totals-row.grand-total {
      border-top: 2px solid #ff6321;
      padding-top: 12px;
      margin-top: 8px;
      font-size: 18px;
      font-weight: 900;
      color: #ff6321;
    }
    .clear {
      clear: both;
    }
    .footer {
      border-top: 1px solid #e4e4e7;
      padding-top: 24px;
      text-align: center;
      color: #71717a;
      font-size: 12px;
    }
    .btn-print {
      display: inline-block;
      background-color: #ff6321;
      color: #ffffff;
      border: none;
      padding: 12px 24px;
      font-size: 14px;
      font-weight: 700;
      border-radius: 12px;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.15s ease;
      box-shadow: 0 4px 10px rgba(255, 99, 33, 0.15);
    }
    .btn-print:hover {
      background-color: #e55319;
      box-shadow: 0 6px 14px rgba(255, 99, 33, 0.25);
    }
    .no-print-bar {
      max-width: 680px;
      margin: 0 auto 24px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-family: sans-serif;
    }
    @media print {
      body {
        background-color: #ffffff;
        color: #000000;
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
      .receipt-container {
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        max-width: 100% !important;
      }
    }
  </style>
</head>
<body>
  <div class="no-print-bar no-print">
    <span style="font-size: 13px; color: #71717a; font-weight: 600;">Generated Receipt for Order #${orderId}</span>
    <button class="btn-print" onclick="window.print()">Print / Save PDF</button>
  </div>

  <div class="receipt-container">
    <div class="header">
      <div>
        <h1 class="brand">Local Xpress</h1>
        <p class="brand-tag">Your Hyperlocal Town Courier</p>
      </div>
      <div style="text-align: right;">
        <h2 class="receipt-title">Order Receipt</h2>
        <span class="status-badge">${order.status}</span>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-box">
        <h3>Order Details</h3>
        <p><strong>Order ID:</strong> <span style="font-family: monospace; font-weight: 700; color: #ff6321;">${orderId}</span></p>
        <p><strong>Date:</strong> ${date} ${time ? 'at ' + time : ''}</p>
        <p><strong>Payment Method:</strong> ${customer.paymentMethod || 'Cash on Delivery'}</p>
      </div>
      <div class="meta-box">
        <h3>Delivery To</h3>
        <p><strong>Name:</strong> ${customer.name}</p>
        <p><strong>Mobile:</strong> ${customer.mobile} ${customer.alternateMobile ? '/ ' + customer.alternateMobile : ''}</p>
        <p><strong>Address:</strong> ${customer.address}</p>
        <p><strong>Area:</strong> ${customer.landmark ? customer.landmark + ', ' : ''}${customer.area}${customer.pincode ? ' - ' + customer.pincode : ''}</p>
        ${customer.instructions ? `<p><strong>Note:</strong> <em style="color: #71717a;">"${customer.instructions}"</em></p>` : ''}
        ${order.customerNotes ? `<p><strong>Customer Notes:</strong> <em style="color: #ea580c;">"${order.customerNotes}"</em></p>` : ''}
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 40px; text-align: left;">#</th>
          <th style="text-align: left;">Item Description</th>
          <th style="width: 80px; text-align: center;">Qty</th>
          <th style="width: 100px; text-align: right;">Unit Price</th>
          <th style="width: 100px; text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div class="totals-box">
      <div class="totals-row">
        <span>Bill Items Total:</span>
        <strong style="color: #09090b;">₹${order.totalAmount}</strong>
      </div>
      <div class="totals-row">
        <span>Local Delivery Charge:</span>
        <strong style="color: #09090b;">₹${order.deliveryCharge}</strong>
      </div>
      <div class="totals-row grand-total">
        <span>Grand Total:</span>
        <span>₹${order.totalAmount + order.deliveryCharge}</span>
      </div>
    </div>
    
    <div class="clear"></div>

    <div class="footer">
      <p style="font-weight: 800; color: #18181b; margin-bottom: 8px;">Thank you for shopping with Local Xpress!</p>
      <p style="margin: 0; color: #71717a; font-size: 11px;">This is a computer-generated proof of delivery receipt. For physical queries, please contact our helpline.</p>
    </div>
  </div>
</body>
</html>
    `;

    // Trigger download
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `LocalXpress_Receipt_${orderId}.html`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState<Record<number, boolean>>({});
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [altMobile, setAltMobile] = useState('');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [area, setArea] = useState('Siddharthnagar');
  const [pincode, setPincode] = useState('272207');
  const [instructions, setInstructions] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI'>('UPI');

  // Contact form
  const [contactName, setContactName] = useState('');
  const [contactMsg, setContactMsg] = useState('');

  const isBusinessHours = isStoreOpen();

  // Scroll to section helper
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            product.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  const activeOffers = useMemo(() => {
    return offers.filter(o => o.status === 'Active');
  }, [offers]);

  // Calculate prices
  const cartSubtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + (item.product.price || 0) * item.quantity, 0);
  }, [cart]);

  const deliveryCharge = useMemo(() => {
    if (cartSubtotal === 0) return 0;
    if (cartSubtotal > freeDeliveryThreshold) return 20; // Discounted for high orders
    return baseDeliveryCharge; // Standard charge
  }, [cartSubtotal, baseDeliveryCharge, freeDeliveryThreshold]);

  // Dynamic Offer discount computation
  const calculatedDiscount = useMemo(() => {
    if (!appliedOffer || cartSubtotal === 0) return 0;
    if (appliedOffer.minOrderValue && cartSubtotal < appliedOffer.minOrderValue) return 0;

    if (appliedOffer.discountType === 'percentage') {
      return Math.round(((cartSubtotal * (appliedOffer.discountValue || 0)) / 100) * 100) / 100;
    }
    if (appliedOffer.discountType === 'flat') {
      return Math.min(appliedOffer.discountValue || 0, cartSubtotal);
    }
    if (appliedOffer.discountType === 'free-delivery') {
      return deliveryCharge;
    }
    return 0;
  }, [appliedOffer, cartSubtotal, deliveryCharge]);

  const cartTotal = Math.max(0, cartSubtotal + deliveryCharge - calculatedDiscount);

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !mobile || !address || !landmark || !area) {
      showToast('Please fill out all required (*) fields.', 'error');
      return;
    }

    setCheckoutSubmitting(true);
    
    setTimeout(() => {
      const details: CustomerDetails = {
        name,
        mobile,
        alternateMobile: altMobile,
        address,
        landmark,
        area,
        pincode,
        instructions,
        customerNotes,
        paymentMethod,
      };

      onSubmitOrder(details, calculatedDiscount, appliedOffer?.id || '');
      setAppliedOffer(null);
      setCheckoutSubmitting(false);
      setCheckoutOpen(false);
      
      // Clear checkout fields
      setName('');
      setMobile('');
      setAltMobile('');
      setAddress('');
      setLandmark('');
      setInstructions('');
      setCustomerNotes('');
    }, 1000);
  };

  const toggleFaq = (index: number) => {
    setFaqOpen(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName || !contactMsg) return;
    const waText = encodeURIComponent(`Hello Local Xpress Team, my name is ${contactName}.\n\nMessage:\n${contactMsg}`);
    window.open(`https://wa.me/${whatsappNumber}?text=${waText}`, '_blank');
    setContactName('');
    setContactMsg('');
  };

  return (
    <div className="flex-1 bg-white">
      {/* Active Promotional Offers Banner */}
      {activeOffers.length > 0 && (
        <div className="bg-orange-600 text-white py-2 px-4 text-center font-display text-xs md:text-sm font-semibold tracking-wide flex items-center justify-center gap-2 relative z-20 shadow-md">
          <Sparkles className="h-4 w-4 animate-pulse shrink-0 text-orange-200" />
          <div className="overflow-x-auto whitespace-nowrap scrollbar-none flex items-center justify-center gap-4 py-0.5">
            {activeOffers.map((o, idx) => (
              <span key={o.id} className="inline-flex items-center gap-1.5">
                {idx > 0 && <span className="text-orange-300 font-normal select-none">|</span>}
                <span className="bg-orange-800 text-[10px] px-1.5 py-0.5 rounded font-mono uppercase">{o.id}</span>
                <span>{o.title}</span>
                <span className="text-orange-200 font-normal">({o.description})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 1. HERO SECTION */}
      <section id="home" className="relative bg-gradient-to-b from-neutral-900 to-neutral-950 text-white overflow-hidden py-16 px-4 md:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 text-left space-y-6">
            <span className="inline-flex items-center gap-1.5 bg-orange-500/10 text-orange-400 text-xs px-3 py-1 rounded-full border border-orange-500/20 font-semibold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" /> No Inventory Model • 100% Genuine Shops
            </span>
            <h1 className="font-display font-bold text-4xl md:text-5xl tracking-tight text-white leading-[1.1]">
              {shopHeroHeadline}
            </h1>
            <p className="text-neutral-400 text-sm md:text-base max-w-xl leading-relaxed">
              {shopHeroDescription}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <button
                onClick={() => scrollToSection('categories')}
                className="bg-orange-500 hover:bg-orange-600 text-white font-medium px-8 py-3.5 rounded-xl transition shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                Browse Shop Catalog <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => scrollToSection('how-it-works')}
                className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white font-medium px-6 py-3.5 rounded-xl transition border border-neutral-700/50 flex items-center justify-center gap-2 cursor-pointer"
              >
                How It Works
              </button>
            </div>
          </div>
          
          {/* Quick Stats Grid */}
          <div className="lg:col-span-5 grid grid-cols-2 gap-4">
            <div className="bg-neutral-900/60 border border-neutral-800/80 p-6 rounded-2xl">
              <div className="text-orange-500 font-display font-bold text-3xl">{serviceRadius}</div>
              <p className="text-neutral-400 text-xs font-mono tracking-wider mt-1 uppercase font-semibold">Service Radius</p>
              <p className="text-neutral-500 text-xs mt-2">Ultra-local express delivery service</p>
            </div>
            <div className="bg-neutral-900/60 border border-neutral-800/80 p-6 rounded-2xl">
              <div className="text-orange-500 font-display font-bold text-3xl">{workingHours}</div>
              <p className="text-neutral-400 text-xs font-mono tracking-wider mt-1 uppercase font-semibold">Working Hours</p>
              <p className="text-neutral-500 text-xs mt-2">Serving your essential needs day and night</p>
            </div>
            <div className="bg-neutral-900/60 border border-neutral-800/80 p-6 rounded-2xl">
              <div className="text-orange-500 font-display font-bold text-3xl">0%</div>
              <p className="text-neutral-400 text-xs font-mono tracking-wider mt-1 uppercase font-semibold">Inventory Markup</p>
              <p className="text-neutral-500 text-xs mt-2">Same shop prices. We only charge a small delivery fee</p>
            </div>
            <div className="bg-neutral-900/60 border border-neutral-800/80 p-6 rounded-2xl">
              <div className="text-orange-500 font-display font-bold text-3xl">WhatsApp</div>
              <p className="text-neutral-400 text-xs font-mono tracking-wider mt-1 uppercase font-semibold">Instant Order</p>
              <p className="text-neutral-500 text-xs mt-2">No sign-up. Just build cart and send directly to our WhatsApp</p>
            </div>
          </div>
        </div>
      </section>

      {/* WARNING CHIP IF STORE CLOSED */}
      {!isBusinessHours && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-800 px-4 py-3 text-center text-sm font-medium flex items-center justify-center gap-2">
          <ShieldAlert className="h-5 w-5 text-amber-600 animate-pulse" />
          <span>Local Xpress business hours are 5:00 AM to 11:00 PM. You can still pre-book orders; we will process them first thing in the morning!</span>
        </div>
      )}

      {/* 2. SERVICES SECTION */}
      <section id="services" className="py-16 px-4 bg-neutral-50 border-y border-neutral-100">
        <div className="max-w-7xl mx-auto text-center space-y-3">
          <span className="text-xs font-bold text-orange-500 tracking-widest uppercase">Our Services</span>
          <h2 className="font-display font-bold text-3xl text-neutral-900">What we can fetch for you</h2>
          <p className="text-neutral-500 max-w-2xl mx-auto text-sm">
            We partner with the best vendors in town to source authentic, freshly prepared items directly on-demand.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10 text-left">
            <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm space-y-3">
              <div className="bg-orange-100 text-orange-600 p-3 rounded-xl w-fit">
                <Store className="h-6 w-6" />
              </div>
              <h3 className="font-display font-bold text-lg text-neutral-800">Fresh Groceries & Bakery</h3>
              <p className="text-neutral-600 text-sm leading-relaxed">
                Daily milk, butter, freshly baked whole wheat breads, organic vegetables, lentils, and essential spices from trusted town grocers.
              </p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm space-y-3">
              <div className="bg-emerald-100 text-emerald-600 p-3 rounded-xl w-fit">
                <Phone className="h-6 w-6" />
              </div>
              <h3 className="font-display font-bold text-lg text-neutral-800">Medicines & Pharmacy</h3>
              <p className="text-neutral-600 text-sm leading-relaxed">
                Emergency tablets, wellness supplements, sanitizers, and pediatric needs sourced from certified medical distributors nearby.
              </p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm space-y-3">
              <div className="bg-sky-100 text-sky-600 p-3 rounded-xl w-fit">
                <MessageSquare className="h-6 w-6" />
              </div>
              <h3 className="font-display font-bold text-lg text-neutral-800">Restaurant Hot Meals</h3>
              <p className="text-neutral-600 text-sm leading-relaxed">
                Craving Kadhai Paneer, South Indian Dosas, or local delicacies? We pick them hot from premium diners and deliver them immediate.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CATEGORIES SECTOR */}
      <section id="categories" className="py-16 px-4 max-w-7xl mx-auto text-center space-y-8">
        <div className="space-y-3">
          <span className="text-xs font-bold text-orange-500 tracking-widest uppercase">Browse Categories</span>
          <h2 className="font-display font-bold text-3xl text-neutral-900">Explore Town Shops</h2>
          <p className="text-neutral-500 max-w-xl mx-auto text-sm">
            Select a category to filter our dynamic catalogue and discover daily prices.
          </p>
        </div>

        {/* Category Pill Grid */}
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition cursor-pointer ${
              selectedCategory === 'All'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/10'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            All Products
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/10'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* 4. PRODUCT CATALOG */}
      <section id="featured" className="py-12 px-4 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="text-left">
            <h3 className="font-display font-bold text-2xl text-neutral-900">
              {selectedCategory === 'All' ? 'Featured Shop Catalog' : `${selectedCategory} Items`}
            </h3>
            <p className="text-xs text-neutral-500 mt-1">
              Showing {filteredProducts.length} high-demand local items
            </p>
          </div>
          
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search rice, bread, fruits, medicines..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-neutral-400 hover:text-neutral-600"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Product Cards Grid */}
        {productsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div 
                key={`product-skeleton-${idx}`}
                className="bg-white border border-neutral-100 rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between h-full p-4 animate-pulse space-y-4"
              >
                <div className="aspect-video bg-neutral-200 rounded-xl w-full" />
                <div className="space-y-3 flex-1">
                  <div className="h-4 bg-neutral-200 rounded-md w-3/4" />
                  <div className="h-3 bg-neutral-100 rounded-md w-1/2" />
                </div>
                <div className="flex items-center justify-between pt-2">
                  <div className="space-y-1.5 w-1/3">
                    <div className="h-2.5 bg-neutral-100 rounded-sm w-1/2" />
                    <div className="h-4 bg-neutral-200 rounded-md w-full" />
                  </div>
                  <div className="h-8 bg-neutral-200 rounded-xl w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-neutral-200 rounded-2xl bg-neutral-50">
            <ShieldAlert className="h-10 w-10 text-neutral-400 mx-auto mb-3" />
            <p className="text-neutral-500 font-semibold text-sm">No items found matching "{searchQuery}"</p>
            <p className="text-xs text-neutral-400 mt-1">Try choosing another category or clearing search</p>
            <button
              onClick={() => { setSelectedCategory('All'); setSearchQuery(''); }}
              className="mt-4 text-xs font-bold text-orange-500 hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {filteredProducts.map((product) => {
              const inCartItem = cart.find(item => item.product.id === product.id);
              return (
                <div 
                  key={product.id}
                  className="bg-white border border-neutral-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between group"
                >
                  <div className="relative aspect-video bg-neutral-100 overflow-hidden">
                    <img 
                      src={product.image} 
                      alt={product.name}
                      referrerPolicy="no-referrer"
                      className="object-cover w-full h-full group-hover:scale-105 transition duration-300"
                      loading="lazy"
                    />
                    <span className="absolute top-2 left-2 bg-neutral-900/80 backdrop-blur-sm text-white text-[9px] font-mono tracking-widest px-2 py-0.5 rounded uppercase font-semibold">
                      {product.category}
                    </span>
                  </div>
                  
                  <div className="p-4 text-left flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-1">
                      <h4 className="font-display font-bold text-sm text-neutral-900 leading-snug line-clamp-2 min-h-[40px]">
                        {product.name}
                      </h4>
                      <p className="text-xs text-neutral-400 font-mono">
                        Unit: <span className="font-semibold text-neutral-600">{product.unit}</span>
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="text-left">
                        {product.price ? (
                          <>
                            <span className="text-xs text-neutral-400">Est:</span>
                            <span className="text-base font-display font-extrabold text-neutral-900 block leading-none">
                              ₹{product.price}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs font-semibold text-amber-600 font-mono">Market Price</span>
                        )}
                      </div>

                      {inCartItem ? (
                        <div className="flex items-center bg-orange-500 text-white rounded-lg px-2 py-1 gap-2 text-xs">
                          <button 
                            onClick={() => updateQuantity(product.id, -1)}
                            className="p-0.5 hover:bg-orange-600 rounded cursor-pointer"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="font-bold min-w-[12px] text-center">{inCartItem.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(product.id, 1)}
                            className="p-0.5 hover:bg-orange-600 rounded cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(product)}
                          className="bg-neutral-900 hover:bg-orange-500 text-white text-xs font-semibold py-1.5 px-3 rounded-lg transition active:scale-95 flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" /> Add
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 5. HOW IT WORKS SECTION */}
      <section id="how-it-works" className="py-16 px-4 bg-neutral-900 text-white border-t border-neutral-800">
        <div className="max-w-7xl mx-auto text-center space-y-3">
          <span className="text-xs font-bold text-orange-400 tracking-widest uppercase">Simple Process</span>
          <h2 className="font-display font-bold text-3xl">How Local Xpress Operates</h2>
          <p className="text-neutral-400 max-w-xl mx-auto text-sm">
            We operate on a pure hyperlocal courier agency model. No fancy app signups required.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pt-12 text-left">
            <div className="space-y-3">
              <div className="font-display font-black text-5xl text-orange-500/20">01</div>
              <h3 className="font-display font-bold text-base text-white">Add Items to Cart</h3>
              <p className="text-neutral-400 text-xs leading-relaxed">
                Browse our real-time town product catalogue and add standard groceries, food, or medicines to your Local Xpress cart.
              </p>
            </div>
            <div className="space-y-3">
              <div className="font-display font-black text-5xl text-orange-500/20">02</div>
              <h3 className="font-display font-bold text-base text-white">Enter Address</h3>
              <p className="text-neutral-400 text-xs leading-relaxed">
                Click checkout and provide your local address (Birdpur, Siddharthnagar, etc.), phone number, and special delivery instructions.
              </p>
            </div>
            <div className="space-y-3">
              <div className="font-display font-black text-5xl text-orange-500/20">03</div>
              <h3 className="font-display font-bold text-base text-white">WhatsApp Verification</h3>
              <p className="text-neutral-400 text-xs leading-relaxed">
                Submit and get redirected to WhatsApp. Simply click send to transmit your formatted order summary directly to our live dispatcher.
              </p>
            </div>
            <div className="space-y-3">
              <div className="font-display font-black text-5xl text-orange-500/20">04</div>
              <h3 className="font-display font-bold text-base text-white">On-Demand Purchase & Drop</h3>
              <p className="text-neutral-400 text-xs leading-relaxed">
                Our local delivery pilot physically visits the designated shop, purchases fresh items, and delivers to your house. Pay on arrival via Cash or UPI!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. DELIVERY CHARGES */}
      <section className="py-16 px-4 bg-white max-w-3xl mx-auto text-center space-y-6">
        <div className="space-y-2">
          <span className="text-xs font-bold text-orange-500 tracking-widest uppercase">Fair Pricing</span>
          <h2 className="font-display font-bold text-2xl text-neutral-900">Standard Delivery Slabs</h2>
          <p className="text-neutral-500 text-sm">We maintain absolute transparency. You pay shop rates + small runner service fees.</p>
        </div>

        <div className="border border-neutral-100 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-100 text-neutral-500 font-mono uppercase tracking-wider">
                <th className="p-4 font-semibold">Order Subtotal Amount</th>
                <th className="p-4 font-semibold">Delivery Service Fee</th>
                <th className="p-4 font-semibold">Service Speed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50 font-medium text-neutral-700">
              <tr>
                <td className="p-4">Under ₹200</td>
                <td className="p-4 text-orange-600 font-bold">₹40</td>
                <td className="p-4 text-neutral-500">Under 45 Mins</td>
              </tr>
              <tr>
                <td className="p-4">₹200 to ₹500</td>
                <td className="p-4 text-orange-600 font-bold">₹30</td>
                <td className="p-4 text-neutral-500">Under 45 Mins</td>
              </tr>
              <tr className="bg-orange-50/20">
                <td className="p-4">Over ₹500</td>
                <td className="p-4 text-emerald-600 font-bold">₹20 (Super Discounted!)</td>
                <td className="p-4 text-neutral-500">Express Priority</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-neutral-400 text-left italic">
          * Note: Delivery partners physically purchase from third-party shops. If multiple separate stores are requested in custom instructions, additional ₹10 run charge may apply.
        </p>
      </section>

      {/* 7. ABOUT US & TESTIMONIALS */}
      <section className="py-16 px-4 bg-neutral-50 border-y border-neutral-100 grid grid-cols-1 md:grid-cols-2 gap-12 max-w-7xl mx-auto">
        <div className="space-y-4 text-left">
          <span className="text-xs font-bold text-orange-500 tracking-widest uppercase">About Us</span>
          <h2 className="font-display font-bold text-3xl text-neutral-900 leading-tight">Local Xpress: Empowering Siddharthnagar Shops</h2>
          <p className="text-neutral-600 text-sm leading-relaxed">
            Founded with the vision to bridge the gap between busy town residents and amazing third-party local merchants, Local Xpress does not hold any inventory. 
          </p>
          <p className="text-neutral-600 text-sm leading-relaxed">
            By running a pure digital dispatcher courier agency, we allow mom-and-pop stores, local pharmacies, and family diners to reach hundreds of new households instantly without having to pay heavy commission software systems.
          </p>
          <div className="flex gap-4 pt-2">
            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 border border-neutral-100 rounded-lg shadow-xs text-xs font-semibold text-neutral-700">
              <Check className="h-4 w-4 text-emerald-500" /> 100% On-Demand
            </div>
            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 border border-neutral-100 rounded-lg shadow-xs text-xs font-semibold text-neutral-700">
              <Check className="h-4 w-4 text-emerald-500" /> Pay via UPI/Cash
            </div>
          </div>
        </div>

        <div className="space-y-6 text-left">
          <span className="text-xs font-bold text-orange-500 tracking-widest uppercase">Customer Reviews</span>
          <h2 className="font-display font-bold text-2xl text-neutral-900">What our regulars say</h2>
          
          <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm space-y-3 relative">
            <div className="flex text-amber-400 gap-0.5">
              {[1,2,3,4,5].map(i => <Star key={i} className="h-4 w-4 fill-current" />)}
            </div>
            <p className="text-neutral-600 text-xs italic leading-relaxed">
              "Local Xpress has been an absolute lifesaver. Getting daily fresh Amul milk packet and hot bakeries at 6:30 AM without running to the market is amazing. WhatsApp order is super convenient!"
            </p>
            <div className="flex items-center gap-3">
              <div className="bg-orange-100 h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs text-orange-600 font-display">
                SK
              </div>
              <div>
                <h4 className="text-xs font-bold text-neutral-800 leading-none">Satya Kasaudhan</h4>
                <p className="text-[10px] text-neutral-400">Regular Customer, Birdpur</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ORDER HISTORY & TRACKING */}
      <section id="order-history" className="py-16 px-4 max-w-4xl mx-auto space-y-8 scroll-mt-16 text-left">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold text-orange-500 tracking-widest uppercase font-mono">Live Tracking</span>
          <h2 className="font-display font-bold text-3xl text-neutral-900">Track Your Orders</h2>
          <p className="text-neutral-500 text-sm max-w-lg mx-auto">
            Retrieve status details and trace live updates of your past and active orders instantly using your <strong>Order ID</strong> or <strong>mobile number</strong>.
          </p>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-3xl border border-neutral-100 shadow-lg space-y-6">
          <form onSubmit={handleSearchMobile} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-neutral-400 group-focus-within:text-[#FF6321] transition-colors duration-200">
                <Search className="h-5 w-5 stroke-[2.5px] text-[#FF6321]" />
                <span className="h-4 w-px bg-neutral-200 group-focus-within:bg-orange-200"></span>
                <ClipboardList className="h-4 w-4" />
              </div>
              <input
                id="lx-tracking-mobile-input"
                type="text"
                placeholder="Enter Order ID (e.g., LX-2026...) or 10-digit mobile number"
                value={inputMobile}
                onChange={(e) => setInputMobile(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearchMobile(e);
                  }
                }}
                className={`w-full pl-16 ${recentSearches.length > 0 ? 'pr-20' : 'pr-10'} py-4 bg-neutral-50 hover:bg-neutral-100/50 border border-neutral-200 hover:border-neutral-300 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF6321] focus:bg-white transition duration-200 font-mono text-neutral-800 placeholder:font-sans placeholder:text-neutral-400`}
                required
              />
              
              {/* Recent Searches Trigger Button */}
              {recentSearches.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowRecentDropdown(!showRecentDropdown)}
                  className={`absolute ${inputMobile ? 'right-11' : 'right-4'} top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 p-1.5 rounded-full hover:bg-neutral-200/60 transition-all duration-150 flex items-center justify-center z-10 cursor-pointer`}
                  title="Recent Searches"
                >
                  <History className="h-4 w-4" />
                </button>
              )}

              {inputMobile && (
                <button
                  type="button"
                  onClick={() => {
                    setInputMobile('');
                    setShowRecentDropdown(false);
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 p-1 rounded-full hover:bg-neutral-200 transition-colors duration-150 z-10 cursor-pointer"
                  title="Clear input"
                >
                  <span className="text-xs font-sans font-bold">✕</span>
                </button>
              )}

              {/* Autocomplete / Recent Searches Dropdown */}
              <AnimatePresence>
                {showRecentDropdown && recentSearches.length > 0 && (
                  <>
                    {/* Overlay to handle clicking outside */}
                    <div 
                      className="fixed inset-0 z-40 cursor-default" 
                      onClick={() => setShowRecentDropdown(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 right-0 top-full mt-2 bg-white border border-neutral-200 rounded-2xl shadow-xl overflow-hidden z-50 text-xs divide-y divide-neutral-100"
                    >
                      <div className="px-4 py-2.5 bg-neutral-50 text-neutral-500 font-bold flex items-center justify-between">
                        <span className="flex items-center gap-1.5 uppercase tracking-wider text-[9px] font-sans">
                          <History className="h-3 w-3 text-orange-500 animate-spin" style={{ animationDuration: '6s' }} /> Recent tracked accounts
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRecentSearches([]);
                            localStorage.removeItem('lx_recent_tracked_mobiles');
                            setShowRecentDropdown(false);
                          }}
                          className="text-[10px] text-rose-500 hover:text-rose-700 font-bold hover:underline font-sans cursor-pointer"
                        >
                          Clear History
                        </button>
                      </div>
                      <div className="divide-y divide-neutral-100">
                        {recentSearches.map((mobile) => (
                          <button
                            key={mobile}
                            type="button"
                            onClick={() => handleSelectRecentSearch(mobile)}
                            className="w-full text-left px-4 py-3.5 hover:bg-orange-50/50 transition flex items-center justify-between text-neutral-700 hover:text-neutral-900 group/item cursor-pointer font-mono"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-neutral-400 font-sans text-[10px]">#</span>
                              <span className="font-bold text-sm tracking-wider text-neutral-800 group-hover/item:text-[#FF6321] transition-colors">{mobile}</span>
                            </div>
                            <span className="text-[10px] text-neutral-400 group-hover/item:text-[#FF6321] font-sans font-semibold flex items-center gap-1">
                              Track Account →
                            </span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            <button
              id="lx-tracking-search-btn"
              type="submit"
              className="bg-[#FF6321] hover:bg-[#e55319] text-white font-bold px-8 py-4 rounded-2xl text-sm transition-all duration-200 shadow-md shadow-orange-500/10 hover:shadow-orange-500/25 active:scale-98 cursor-pointer flex items-center justify-center gap-2 group"
            >
              <Search className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
              Search Orders
            </button>
          </form>

          {searchedMobile.trim() && (
            <div className="space-y-6 pt-4 border-t border-neutral-100">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-sm text-neutral-800">
                  Showing results for: <span className="font-mono text-[#FF6321] font-bold">{searchedMobile}</span>
                </h3>
                <span className="text-xs font-mono text-neutral-400 bg-neutral-50 px-2.5 py-1 rounded-lg">
                  {ordersLoading ? 'Syncing...' : `${trackedOrders.length} ${trackedOrders.length === 1 ? 'Order' : 'Orders'} Found`}
                </span>
              </div>

              {ordersLoading ? (
                <div className="space-y-6">
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <div 
                      key={`order-tracking-skeleton-${idx}`}
                      className="bg-white border border-neutral-100 rounded-3xl p-6 shadow-xs animate-pulse space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-50 pb-4">
                        <div className="space-y-2">
                          <div className="h-4 bg-neutral-200 rounded-md w-28" />
                          <div className="h-3 bg-neutral-100 rounded-md w-36" />
                        </div>
                        <div className="h-6 bg-neutral-200 rounded-full w-24" />
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 bg-neutral-100 rounded-md w-1/2" />
                        <div className="h-3 bg-neutral-100 rounded-md w-2/3" />
                      </div>
                      <div className="flex justify-between items-center pt-2">
                        <div className="h-5 bg-neutral-200 rounded-md w-16" />
                        <div className="h-8 bg-neutral-200 rounded-xl w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : trackedOrders.length === 0 ? (
                <div className="text-center py-12 px-4 bg-neutral-50 rounded-2xl border border-dashed border-neutral-200 space-y-3">
                  <ClipboardList className="h-10 w-10 text-neutral-300 mx-auto" />
                  <p className="text-sm font-semibold text-neutral-600">No Orders Found</p>
                  <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                    We couldn't find any orders placed under this mobile number. Make sure the number matches the mobile number entered during checkout.
                  </p>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Real-time Order Progress Card */}
                  {currentOrder && (
                    <div 
                      id={`live-tracking-card-${currentOrder.id}`}
                      className="bg-neutral-950 text-white rounded-3xl p-6 md:p-8 border border-neutral-800 shadow-2xl space-y-6 overflow-hidden relative"
                    >
                      {/* Subtle ambient light background decoration */}
                      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-orange-500/10 to-transparent rounded-full blur-3xl pointer-events-none"></div>
                      
                      {/* Card Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5 relative z-10">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="text-[10px] text-emerald-400 font-mono font-bold tracking-wider uppercase">
                              Live Dispatch Terminal (Real-Time Sync)
                            </span>
                          </div>
                          <h4 className="font-display font-black text-lg text-white">
                            {currentOrder.status === 'Delivered' ? 'Last Order Completed' : 'Current Order Active Tracking'}
                          </h4>
                          <p className="text-xs text-neutral-400">
                            Order ID: <span className="font-mono text-orange-400 font-bold">{currentOrder.id}</span> • Placed {currentOrder.date} at {currentOrder.time}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-neutral-400">Status:</span>
                          <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                            currentOrder.status === 'Delivered' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            currentOrder.status === 'Out For Delivery' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                            currentOrder.status === 'Purchased' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                            currentOrder.status === 'Confirmed' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                            'bg-neutral-500/10 text-neutral-400 border border-neutral-500/20'
                          }`}>
                            ● {currentOrder.status}
                          </span>
                        </div>
                      </div>

                      {/* High Fidelity Custom Progress Bar */}
                      <div className="space-y-4 relative z-10">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-neutral-400">Overall Progress</span>
                          <span className="font-mono font-bold text-orange-400">
                            {currentOrder.status === 'Pending' && '15%'}
                            {currentOrder.status === 'Confirmed' && '40%'}
                            {currentOrder.status === 'Purchased' && '65%'}
                            {currentOrder.status === 'Out For Delivery' && '85%'}
                            {currentOrder.status === 'Delivered' && '100%'}
                          </span>
                        </div>

                        {/* Progress Track */}
                        <div 
                          id={`live-progress-bar-container-${currentOrder.id}`}
                          className="h-3 w-full bg-neutral-900 rounded-full overflow-hidden p-0.5 border border-neutral-800"
                        >
                          <motion.div 
                            id={`live-progress-bar-fill-${currentOrder.id}`}
                            initial={{ width: 0 }}
                            animate={{ 
                              width: 
                                currentOrder.status === 'Pending' ? '15%' :
                                currentOrder.status === 'Confirmed' ? '40%' :
                                currentOrder.status === 'Purchased' ? '65%' :
                                currentOrder.status === 'Out For Delivery' ? '85%' :
                                '100%'
                            }}
                            transition={{ type: 'spring', stiffness: 50, damping: 15 }}
                            className="h-full rounded-full bg-gradient-to-r from-orange-500 to-[#FF6321] relative"
                          >
                            {/* Shimmer effect for ongoing active deliveries */}
                            {currentOrder.status !== 'Delivered' && (
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[pulse_2s_infinite]"></div>
                            )}
                          </motion.div>
                        </div>

                        {/* Milestone steps with descriptions */}
                        <div className="grid grid-cols-5 gap-1 pt-2 text-center">
                          {[
                            { label: 'Placed', desc: 'Order received', statusVal: 'Pending' },
                            { label: 'Confirmed', desc: 'Verified by shop', statusVal: 'Confirmed' },
                            { label: 'Purchased', desc: 'Sourced from town', statusVal: 'Purchased' },
                            { label: 'On Way', desc: 'Runner en route', statusVal: 'Out For Delivery' },
                            { label: 'Delivered', desc: 'Received safely', statusVal: 'Delivered' }
                          ].map((step, idx) => {
                            const stepStatuses = ['Pending', 'Confirmed', 'Purchased', 'Out For Delivery', 'Delivered'];
                            const currentIdx = stepStatuses.indexOf(currentOrder.status);
                            const isDone = idx <= currentIdx;
                            const isCurrent = idx === currentIdx;

                            return (
                              <div key={idx} className="space-y-1.5 flex flex-col items-center">
                                <div className={`h-8 w-8 rounded-full border flex items-center justify-center transition-all duration-300 ${
                                  isCurrent ? 'bg-[#FF6321] border-[#FF6321] text-white shadow-lg shadow-orange-500/20 scale-110' :
                                  isDone ? 'bg-neutral-900 border-[#FF6321]/50 text-orange-400' :
                                  'bg-neutral-950 border-neutral-850 text-neutral-600'
                                }`}>
                                  {isDone ? (
                                    <Check className="h-4 w-4 stroke-[2.5px]" strokeWidth={3} />
                                  ) : (
                                    <span className="font-mono text-xs font-bold">{idx + 1}</span>
                                  )}
                                </div>
                                <div className="hidden md:block">
                                  <p className={`text-[10px] font-bold ${isCurrent ? 'text-orange-400' : isDone ? 'text-neutral-300' : 'text-neutral-600'}`}>
                                    {step.label}
                                  </p>
                                  <p className="text-[8px] text-neutral-500 leading-tight line-clamp-1">
                                    {step.desc}
                                  </p>
                                </div>
                                <div className="block md:hidden">
                                  <p className={`text-[9px] font-bold ${isCurrent ? 'text-orange-400' : isDone ? 'text-neutral-300' : 'text-neutral-600'}`}>
                                    {step.label}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Customer Notes display in Live Tracking Card */}
                      {currentOrder.customerNotes && (
                        <div id={`live-customer-notes-${currentOrder.id}`} className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl space-y-1 relative z-10 text-left">
                          <p className="text-[10px] text-[#FF6321] font-mono uppercase tracking-wider font-bold">Your Custom Notes</p>
                          <p className="text-xs text-neutral-300 italic font-sans">
                            "{currentOrder.customerNotes}"
                          </p>
                        </div>
                      )}

                      {/* Stage-specific Status description card */}
                      <div className="bg-neutral-900 border border-neutral-800/80 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
                        <div className="flex gap-3 items-center">
                          <div className="p-2.5 bg-neutral-950 rounded-xl border border-neutral-850">
                            <Calendar className="h-5 w-5 text-orange-400 animate-pulse" />
                          </div>
                          <div className="space-y-0.5 text-left">
                            <p className="text-[10px] text-neutral-400 font-mono uppercase tracking-wider">Current Activity</p>
                            <p id={`live-status-desc-${currentOrder.id}`} className="text-xs font-bold text-neutral-100 font-sans">
                              {currentOrder.status === 'Pending' && "Awaiting confirmation from Local Xpress dispatch terminal."}
                              {currentOrder.status === 'Confirmed' && "Order confirmed! Sourcing runner being matched."}
                              {currentOrder.status === 'Purchased' && "Runner has purchased items and is completing bill details."}
                              {currentOrder.status === 'Out For Delivery' && "Runner has departed and is heading to your location!"}
                              {currentOrder.status === 'Delivered' && "Delivered! Order successfully resolved and paid."}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2 w-full sm:w-auto">
                          <button
                            onClick={() => handleContactAboutOrder(currentOrder.id)}
                            className="flex-1 sm:flex-initial text-[11px] bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                            id={`live-support-btn-${currentOrder.id}`}
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            Ask Support / Query Status
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-neutral-150 pb-2">
                      <h4 className="font-display font-bold text-sm text-neutral-800">
                        All Placed Orders History
                      </h4>
                      <span className="text-[10px] bg-neutral-100 text-neutral-500 font-mono px-2 py-0.5 rounded-md">
                        Full Records
                      </span>
                    </div>

                    <div className="space-y-6">
                  {trackedOrders.map((order) => {
                    const stepIndex = getStepIndex(order.status);
                    const steps = ['Pending', 'Confirmed', 'Purchased', 'Out For Delivery', 'Delivered'];
                    
                    return (
                      <div key={order.id} className="border border-neutral-100 rounded-2xl overflow-hidden shadow-xs hover:shadow-sm transition bg-white">
                        {/* Header banner */}
                        <div className="bg-neutral-50 px-5 py-4 border-b border-neutral-100 flex flex-wrap justify-between items-center gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-neutral-400">ORDER ID:</span>
                              <span className="font-mono text-xs font-black text-neutral-950 bg-white border border-neutral-200 px-2 py-0.5 rounded-md shadow-2xs">{order.id}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-neutral-500 font-mono">
                              <Calendar className="h-3 w-3" />
                              <span>{order.date}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                              order.status === 'Delivered' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                              order.status === 'Out For Delivery' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' :
                              order.status === 'Purchased' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                              order.status === 'Confirmed' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                              'bg-neutral-100 text-neutral-600 border border-neutral-200'
                            }`}>
                              ● {order.status}
                            </span>
                            <button
                              onClick={() => handleContactAboutOrder(order.id)}
                              className="text-[10px] bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                              id={`query-status-${order.id}`}
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                              Query Status
                            </button>
                            <button
                              onClick={() => handleDownloadReceipt(order)}
                              className="text-[10px] bg-orange-50 hover:bg-orange-100 text-[#FF6321] border border-orange-200/60 font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                              id={`download-receipt-${order.id}`}
                            >
                              <Download className="h-3.5 w-3.5" />
                              Download Receipt
                            </button>
                          </div>
                        </div>

                        {/* Order timeline tracker */}
                        <div className="p-5 bg-neutral-50/30 border-b border-neutral-50">
                          <div className="relative flex justify-between items-center max-w-xl mx-auto pt-2 pb-4">
                            {/* Line connecting the dots */}
                            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-neutral-200 z-0"></div>
                            <div 
                              className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-[#FF6321] transition-all duration-500 z-0"
                              style={{ width: `${(stepIndex / (steps.length - 1)) * 100}%` }}
                            ></div>

                            {/* Dots */}
                            {steps.map((st, idx) => {
                              const isActive = idx <= stepIndex;
                              const isCurrent = idx === stepIndex;
                              return (
                                <div key={st} className="relative z-10 flex flex-col items-center gap-1.5">
                                  <div className={`h-6 w-6 rounded-full flex items-center justify-center font-bold text-[10px] transition ${
                                    isCurrent ? 'bg-[#FF6321] text-white ring-4 ring-orange-100 scale-110' :
                                    isActive ? 'bg-[#FF6321] text-white' : 'bg-neutral-200 text-neutral-500'
                                  }`}>
                                    {isActive ? <Check className="h-3 w-3 stroke-[3px]" /> : idx + 1}
                                  </div>
                                  <span className={`text-[9px] font-bold tracking-tight whitespace-nowrap ${
                                    isCurrent ? 'text-orange-600 font-extrabold' : 
                                    isActive ? 'text-neutral-800' : 'text-neutral-400'
                                  }`}>
                                    {st}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Items list and summary */}
                        <div className="p-5 space-y-4 text-left">
                          <div className="space-y-2.5">
                            <h4 className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Ordered Items</h4>
                            <div className="divide-y divide-neutral-100 bg-neutral-50/50 rounded-xl p-3 border border-neutral-100">
                              {order.items.map((item, idx) => (
                                <div key={idx} className="py-2 flex justify-between items-center text-xs gap-3">
                                  <div className="flex-1">
                                    <p className="font-semibold text-neutral-800">{item.productName}</p>
                                    <p className="text-[10px] text-neutral-400">
                                      Vendor: <span className="font-medium text-neutral-600">{item.vendorShopName || 'Local Partner'}</span>
                                    </p>
                                  </div>
                                  <div className="text-right whitespace-nowrap">
                                    <span className="text-neutral-500 font-mono">Qty: {item.quantity}</span>
                                    <span className="mx-2 text-neutral-300">|</span>
                                    <span className="font-bold text-neutral-800 font-mono">₹{item.price * item.quantity}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-neutral-100 text-xs text-neutral-600">
                            <div className="space-y-1 bg-neutral-50/30 p-3 rounded-xl border border-neutral-100">
                              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Deliver To</span>
                              <p className="font-bold text-neutral-800">{order.customerDetails.name}</p>
                              <p className="leading-relaxed">{order.customerDetails.address}</p>
                            </div>
                            
                            <div className="space-y-2 bg-neutral-50/30 p-3 rounded-xl border border-neutral-100 flex flex-col justify-between">
                              <div>
                                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Financial Summary</span>
                                <div className="flex justify-between items-center mt-1">
                                  <span className="text-neutral-500">Bill Items Total:</span>
                                  <span className="font-mono text-neutral-800 font-bold">₹{order.totalAmount}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-neutral-500">Local Delivery Runner:</span>
                                  <span className="font-mono text-neutral-800 font-bold">₹{order.deliveryCharge}</span>
                                </div>
                              </div>
                              <div className="flex justify-between items-center border-t border-neutral-200/60 pt-2 font-black text-sm text-[#FF6321]">
                                <span>Grand Total:</span>
                                <span className="font-mono text-base font-black">₹{order.totalAmount + order.deliveryCharge}</span>
                              </div>
                            </div>

                            {order.customerNotes && (
                              <div id={`order-customer-notes-${order.id}`} className="col-span-1 sm:col-span-2 space-y-1 bg-orange-50/20 p-3 rounded-xl border border-orange-100/50">
                                <span className="text-[10px] font-bold text-[#FF6321] uppercase tracking-wider block">Customer Notes</span>
                                <p className="text-xs text-neutral-700 italic leading-relaxed">"{order.customerNotes}"</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 8. FAQ SECTION */}
      <section id="faq" className="py-16 px-4 max-w-3xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold text-orange-500 tracking-widest uppercase">FAQ</span>
          <h2 className="font-display font-bold text-2xl text-neutral-900">Frequently Asked Questions</h2>
          <p className="text-neutral-500 text-sm">Got questions? We've got clear answers.</p>
        </div>

        <div className="space-y-3">
          {[
            {
              q: "Does Local Xpress own any shops or inventories?",
              a: "No! We do not keep any inventory. All items ordered are physically purchased on-demand from registered premium town merchants by our delivery executives and brought straight to you."
            },
            {
              q: "Are the prices listed exact?",
              a: "Prices listed on our catalog are typical local store rates. Since third-party shop prices may vary slightly by season or brand revisions, our delivery pilot will show you the exact shop bill invoice on drop-off."
            },
            {
              q: "How fast is the hyperlocal delivery?",
              a: "For orders within our 5 KM delivery radius in Siddharthnagar and Birdpur, we typically deliver within 30 to 45 minutes of confirming your WhatsApp order."
            },
            {
              q: "How can I pay for my order?",
              a: "We support cash on delivery or digital payment on arrival via any UPI app (Google Pay, PhonePe, Paytm) directly to our delivery executive's scanner."
            }
          ].map((faq, i) => (
            <div key={i} className="border border-neutral-100 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleFaq(i)}
                className="w-full text-left p-4 bg-neutral-50/50 hover:bg-neutral-50 flex justify-between items-center transition cursor-pointer"
              >
                <span className="text-xs font-bold text-neutral-800">{faq.q}</span>
                {faqOpen[i] ? <ChevronUp className="h-4 w-4 text-neutral-500" /> : <ChevronDown className="h-4 w-4 text-neutral-500" />}
              </button>
              {faqOpen[i] && (
                <div className="p-4 text-xs text-neutral-600 bg-white border-t border-neutral-100 leading-relaxed">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 9. CONTACT US SECTION */}
      <section id="contact" className="py-16 px-4 bg-neutral-50 border-t border-neutral-100">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 text-left">
          <div className="md:col-span-5 space-y-4">
            <span className="text-xs font-bold text-orange-500 tracking-widest uppercase font-mono">Get in Touch</span>
            <h2 className="font-display font-bold text-3xl text-neutral-900">Contact Dispatch Office</h2>
            <p className="text-neutral-600 text-sm leading-relaxed">
              Have customized bulk orders or want to register your shop as an official town vendor? Reach our dispatcher directly.
            </p>
            <div className="space-y-3 pt-2 text-xs text-neutral-600">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-orange-500" />
                <span>Station Road Main Market, Siddharthnagar, UP</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-orange-500" />
                <span>+91 92609 33792</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-orange-500" />
                <a href="mailto:LocalXpress.Birdpur@gmail.com" className="hover:text-orange-500 transition">LocalXpress.Birdpur@gmail.com</a>
              </div>
            </div>
          </div>

          <div className="md:col-span-7 bg-white p-6 rounded-2xl border border-neutral-100 shadow-xs">
            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-neutral-600 uppercase tracking-wide">Your Name</label>
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                    placeholder="Enter name"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-neutral-600 uppercase tracking-wide">Mobile Number</label>
                  <input
                    type="tel"
                    className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                    placeholder="91-XXXXX-XXXXX"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-neutral-600 uppercase tracking-wide">Your Message</label>
                <textarea
                  rows={3}
                  required
                  value={contactMsg}
                  onChange={(e) => setContactMsg(e.target.value)}
                  className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                  placeholder="Tell us what you want us to fetch or propose..."
                />
              </div>
              <button
                type="submit"
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded-xl transition text-xs shadow-xs cursor-pointer flex items-center justify-center gap-1"
              >
                Send via WhatsApp <MessageSquare className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* 10. PERSISTENT FLOATING CART TRIGGER FOR MOBILE */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 right-6 z-40 md:hidden no-print">
          <button
            onClick={() => scrollToSection('categories')}
            className="bg-orange-500 text-white p-4 rounded-full shadow-2xl flex items-center justify-center relative cursor-pointer"
          >
            <ShoppingCart className="h-6 w-6" />
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-black text-white rounded-full text-xs font-bold flex items-center justify-center">
              {cart.length}
            </span>
          </button>
        </div>
      )}

      {/* 11. CART & CHECKOUT DRAWER */}
      <AnimatePresence>
        {checkoutOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-neutral-100 text-left"
            >
              <div className="bg-neutral-900 text-white p-5 flex justify-between items-center">
                <div>
                  <h3 className="font-display font-bold text-lg text-white">Local Xpress Checkout</h3>
                  <p className="text-[10px] text-neutral-400 font-mono tracking-wider">SECURE WHATSAPP DISPATCH</p>
                </div>
                <button
                  onClick={() => setCheckoutOpen(false)}
                  className="text-neutral-400 hover:text-white transition text-xs font-semibold cursor-pointer"
                >
                  Close [X]
                </button>
              </div>

              <form onSubmit={handleCheckoutSubmit} className="p-5 max-h-[80vh] overflow-y-auto space-y-4">
                <div className="bg-orange-50 border border-orange-200 p-3 rounded-xl flex items-start gap-2.5">
                  <Store className="h-4 w-4 text-orange-600 mt-0.5" />
                  <div className="flex-1">
                    <span className="text-xs font-bold text-orange-800">Order Value: ₹{cartSubtotal}</span>
                    <div className="text-[10px] text-orange-600 space-y-0.5 mt-0.5">
                      <p>Runner Fee: ₹{deliveryCharge}</p>
                      {calculatedDiscount > 0 && (
                        <p className="text-emerald-600 font-semibold flex items-center gap-1">
                          🎁 Promo Discount ({appliedOffer?.id}): -₹{calculatedDiscount}
                        </p>
                      )}
                      <p className="font-bold text-xs text-orange-950 pt-1 border-t border-orange-200/50">Total Payable: ₹{cartTotal}</p>
                    </div>
                  </div>
                </div>

                {/* Available Coupons & Offers Section */}
                {activeOffers.length > 0 && (
                  <div className="bg-neutral-50 border border-neutral-200 p-3 rounded-xl space-y-2">
                    <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-wide block">🏷️ Choose an Offer</span>
                    <div className="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                      {activeOffers.map((o) => {
                        const isApplicable = !o.minOrderValue || cartSubtotal >= o.minOrderValue;
                        const isApplied = appliedOffer?.id === o.id;
                        
                        return (
                          <div 
                            key={o.id} 
                            className={`flex items-center justify-between p-2 rounded-lg border text-xs transition ${
                              isApplied 
                                ? 'bg-orange-50 border-orange-300 text-orange-800' 
                                : 'bg-white border-neutral-200 hover:bg-neutral-100'
                            }`}
                          >
                            <div className="flex-1 min-w-0 pr-2 text-left">
                              <div className="font-bold flex items-center gap-1.5">
                                <span className="bg-neutral-800 text-white font-mono text-[9px] px-1.5 py-0.5 rounded uppercase select-all shrink-0">{o.id}</span>
                                <span className="truncate">{o.title}</span>
                              </div>
                              <p className="text-[9px] text-neutral-500 mt-0.5 leading-relaxed">{o.description}</p>
                              {o.minOrderValue && !isApplicable && (
                                <p className="text-[8px] text-red-500 font-semibold mt-0.5">Min. order ₹{o.minOrderValue} required</p>
                              )}
                            </div>
                            
                            {isApplicable && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (isApplied) {
                                    setAppliedOffer(null);
                                    showToast('Offer removed.', 'info');
                                  } else {
                                    setAppliedOffer(o);
                                    showToast(`Offer ${o.id} applied!`, 'success');
                                  }
                                }}
                                className={`px-2.5 py-1 rounded-md text-[9px] font-bold shrink-0 transition cursor-pointer ${
                                  isApplied 
                                    ? 'bg-neutral-800 text-white hover:bg-neutral-900' 
                                    : 'bg-orange-500 text-white hover:bg-orange-600'
                                }`}
                              >
                                {isApplied ? 'Remove' : 'Apply'}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-wide">Customer Name *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Satya Kasaudhan"
                      className="w-full border border-neutral-200 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-wide">Mobile Number (WhatsApp) *</label>
                    <input
                      type="tel"
                      required
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full border border-neutral-200 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-wide">Alternate Mobile</label>
                    <input
                      type="tel"
                      value={altMobile}
                      onChange={(e) => setAltMobile(e.target.value)}
                      placeholder="e.g. 81155XXXXX"
                      className="w-full border border-neutral-200 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-wide">Area/Village *</label>
                    <select
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      className="w-full border border-neutral-200 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-orange-500 bg-white"
                    >
                      <option value="Siddharthnagar">Siddharthnagar Town</option>
                      <option value="Birdpur">Birdpur Area</option>
                      <option value="Main Bazar">Main Bazar Area</option>
                      <option value="Station Road">Station Road Area</option>
                      <option value="Others">Others (Under 5 KM)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-wide">Full Address *</label>
                  <textarea
                    required
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Provide detailed house number, building, or specific coordinates"
                    className="w-full border border-neutral-200 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-wide">Landmark *</label>
                    <input
                      type="text"
                      required
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      placeholder="e.g. Near Shiv Mandir, Opp Post Office"
                      className="w-full border border-neutral-200 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-wide">Pincode</label>
                    <input
                      type="text"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      placeholder="e.g. 272207"
                      className="w-full border border-neutral-200 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-wide">Delivery Instructions</label>
                  <input
                    type="text"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="e.g. Ring bell, call when outside, leave at gate"
                    className="w-full border border-neutral-200 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-wide">Customer Notes</label>
                  <textarea
                    id="checkout-customer-notes"
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    placeholder="e.g. Please buy from specific shop, add non-listed items, extra custom requests"
                    rows={2}
                    className="w-full border border-neutral-200 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-wide">Preferred Payment Method</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('UPI')}
                      className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                        paymentMethod === 'UPI'
                          ? 'border-orange-500 bg-orange-50 text-orange-600'
                          : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                      }`}
                    >
                      <CreditCard className="h-4 w-4" /> UPI App (QR Pay)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('Cash')}
                      className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                        paymentMethod === 'Cash'
                          ? 'border-orange-500 bg-orange-50 text-orange-600'
                          : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                      }`}
                    >
                      💵 Cash On Delivery
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={checkoutSubmitting}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl text-xs transition shadow-lg cursor-pointer flex items-center justify-center gap-2 mt-4"
                >
                  {checkoutSubmitting ? (
                    <>Creating Order...</>
                  ) : (
                    <>
                      Place Order & Redirect to WhatsApp <MessageSquare className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cart Drawer */}
      <div className="no-print">
        {/* We can manage active cart items display directly below or in the navbar trigger */}
      </div>

      {/* FOOTER */}
      <footer className="bg-neutral-950 text-neutral-400 py-12 px-4 border-t border-neutral-900 text-left text-xs no-print">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="pb-1">
              <LocalXpressLogo className="h-8 max-w-[160px]" variant="white" />
            </div>
            <p className="text-neutral-500 text-xs">
              Siddharthnagar & Birdpur's premier hyperlocal delivery service. Sourcing genuine, third-party products directly from shops to your house door in under 45 minutes.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="text-white font-semibold uppercase tracking-wider text-[11px] font-mono">Serviceable Hubs</h4>
            <ul className="space-y-1.5">
              <li>• Siddharthnagar (Town Area)</li>
              <li>• Birdpur Hub (Blocks 1-4)</li>
              <li>• Civil Lines District</li>
              <li>• Station Road Market</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="text-white font-semibold uppercase tracking-wider text-[11px] font-mono">Category Shortcuts</h4>
            <ul className="space-y-1.5">
              <li><button onClick={() => setSelectedCategory('Grocery')} className="hover:text-white transition">Grocery Shop</button></li>
              <li><button onClick={() => setSelectedCategory('Dairy')} className="hover:text-white transition">Dairy & Eggs</button></li>
              <li><button onClick={() => setSelectedCategory('Medicines')} className="hover:text-white transition">Local Pharmacy</button></li>
              <li><button onClick={() => setSelectedCategory('Restaurant Food')} className="hover:text-white transition">Diners & Cafes</button></li>
            </ul>
          </div>
          <div className="space-y-3">
            <h4 className="text-white font-semibold uppercase tracking-wider text-[11px] font-mono">Access Controls</h4>
            <p className="text-neutral-500">Evaluating or managing dispatcher logs? Click below to load portals.</p>
            <button
              onClick={onNavigateToAdmin}
              className="bg-neutral-800 hover:bg-neutral-700 text-white font-semibold px-4 py-2 rounded-lg transition text-[11px]"
            >
              Admin/Staff Panel LogIn
            </button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto border-t border-neutral-900 mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-[11px] text-neutral-600 font-mono">
          <span>© 2026 Local Xpress Hyperlocal Logistics. All rights reserved.</span>
          <span>Designed with Orange & White Aesthetics</span>
        </div>
      </footer>

      {/* Cart Drawer Component */}
      <div className="hidden">
        {/* Formally handled inside App component side drawers */}
      </div>

      {/* Secondary trigger to checkout */}
      {cart.length > 0 && !checkoutOpen && (
        <div className="fixed bottom-0 left-0 right-0 bg-neutral-950 text-white p-4 flex justify-between items-center border-t border-neutral-800 z-40 md:flex no-print shadow-xl">
          <div className="flex gap-4 items-center">
            <div className="bg-orange-500 p-2.5 rounded-xl">
              <ShoppingCart className="h-5 w-5 text-white" />
            </div>
            <div className="text-left">
              <span className="font-bold text-sm block">My Delivery Cart ({cart.reduce((s,i) => s+i.quantity,0)} Items)</span>
              <span className="text-xs text-neutral-400">Estimated Total: ₹{cartTotal} (with runner fee)</span>
            </div>
          </div>
          <button
            onClick={() => setCheckoutOpen(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-5 rounded-xl transition shadow-md shadow-orange-500/20 active:scale-95 text-xs cursor-pointer flex items-center gap-1.5"
          >
            Checkout Order <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* INVOICE MODAL */}
      <AnimatePresence>
        {lastPlacedOrder && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 overflow-y-auto flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="bg-white border border-neutral-200 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl text-left"
            >
              {/* Status Header */}
              <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-6 text-white relative">
                <button
                  onClick={onClearLastPlacedOrder}
                  className="absolute top-4 right-4 text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition-colors cursor-pointer text-sm font-bold w-8 h-8 flex items-center justify-center"
                >
                  ✕
                </button>
                <div className="flex items-center gap-3">
                  <div className="bg-white/15 p-2 rounded-2xl">
                    <CheckCircle2 className="h-8 w-8 text-white animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest font-extrabold text-orange-100 bg-orange-600/30 px-2.5 py-0.5 rounded-full">
                      आर्डर सफल रहा / Order Confirmed
                    </span>
                    <h2 className="font-display font-black text-2xl tracking-tight mt-1">
                      Local Xpress Digital Invoice
                    </h2>
                  </div>
                </div>
              </div>

              <div className="p-6 md:p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                {/* Order Tracking Action Card */}
                <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1 text-center sm:text-left">
                    <p className="text-xs font-bold text-orange-800 flex items-center justify-center sm:justify-start gap-1">
                      <Sparkles className="h-4 w-4 text-orange-600 animate-spin" style={{ animationDuration: '3s' }} /> Fast Live Tracking Available
                    </p>
                    <p className="text-xs text-orange-600">
                      Use your Order ID to track active runner status live on our website anytime.
                    </p>
                    <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
                      <span className="font-mono bg-white border border-orange-200 px-3 py-1 rounded-xl text-xs font-black text-[#FF6321]">
                        {lastPlacedOrder.id}
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(lastPlacedOrder.id);
                          showToast('Order ID copied to clipboard!', 'success');
                        }}
                        className="text-[10px] font-bold text-orange-700 hover:underline cursor-pointer"
                      >
                        Copy ID
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => handleTrackPlacedOrder(lastPlacedOrder.id)}
                    className="bg-[#FF6321] hover:bg-[#e55319] text-white font-bold text-xs px-5 py-3 rounded-xl shadow-md shadow-orange-500/10 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap active:scale-95"
                  >
                    Track Live Status <ArrowRight className="h-3 w-3" />
                  </button>
                </div>

                {/* Grid details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                  <div className="space-y-4 bg-neutral-50 p-4 rounded-2xl border border-neutral-150">
                    <h3 className="font-bold uppercase tracking-wider text-[10px] text-neutral-400 font-mono border-b border-neutral-200/60 pb-1.5 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-neutral-400" /> Order Information
                    </h3>
                    <div className="space-y-2 font-medium text-neutral-700">
                      <p className="flex justify-between">
                        <span className="text-neutral-500">Order ID:</span>
                        <span className="font-mono font-bold text-[#FF6321]">{lastPlacedOrder.id}</span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-neutral-500">Date & Time:</span>
                        <span className="text-neutral-800 font-semibold">{lastPlacedOrder.date} • {lastPlacedOrder.time}</span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-neutral-500">Payment Option:</span>
                        <span className="text-neutral-800 font-bold bg-neutral-200/60 px-2 py-0.5 rounded text-[10px]">{lastPlacedOrder.customerDetails.paymentMethod}</span>
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 bg-neutral-50 p-4 rounded-2xl border border-neutral-150">
                    <h3 className="font-bold uppercase tracking-wider text-[10px] text-neutral-400 font-mono border-b border-neutral-200/60 pb-1.5 flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-neutral-400" /> Delivery Address
                    </h3>
                    <div className="space-y-1.5 text-neutral-800">
                      <p><strong>Name:</strong> {lastPlacedOrder.customerDetails.name}</p>
                      <p><strong>Mobile:</strong> {lastPlacedOrder.customerDetails.mobile} {lastPlacedOrder.customerDetails.alternateMobile ? ` / ${lastPlacedOrder.customerDetails.alternateMobile}` : ''}</p>
                      <p><strong>Area:</strong> {lastPlacedOrder.customerDetails.landmark}, {lastPlacedOrder.customerDetails.area}</p>
                      <p className="text-neutral-500 leading-relaxed"><strong>Full Address:</strong> {lastPlacedOrder.customerDetails.address}</p>
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <div className="border border-neutral-200 rounded-2xl overflow-hidden text-xs">
                  <div className="p-3 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
                    <span className="font-bold text-neutral-800 font-display">Ordered Items</span>
                    <span className="text-[10px] font-mono text-neutral-500 bg-neutral-200 px-2 py-0.5 rounded-full font-bold">
                      {lastPlacedOrder.items.reduce((acc, item) => acc + item.quantity, 0)} Units
                    </span>
                  </div>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-neutral-50/50 border-b border-neutral-200 text-neutral-500 font-mono uppercase tracking-wider text-[9px]">
                        <th className="p-3 pl-4">Item Description</th>
                        <th className="p-3 text-center">Qty</th>
                        <th className="p-3 text-right">Price</th>
                        <th className="p-3 text-right pr-4">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 font-medium text-neutral-700">
                      {lastPlacedOrder.items.map((item, idx) => {
                        const price = item.product.price || 0;
                        const name = item.product.name || 'Unknown Product';
                        return (
                          <tr key={idx} className="hover:bg-neutral-50/30 transition">
                            <td className="p-3 pl-4">
                              <p className="font-bold text-neutral-900">{name}</p>
                              <p className="text-[10px] text-neutral-400 font-mono">Category: {item.product.category || 'General'}</p>
                            </td>
                            <td className="p-3 text-center font-bold text-neutral-800">x{item.quantity}</td>
                            <td className="p-3 text-right text-neutral-600">₹{price}</td>
                            <td className="p-3 text-right font-bold text-neutral-900 pr-4">₹{price * item.quantity}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Financial Calculations */}
                <div className="bg-neutral-950 text-white p-5 rounded-2xl space-y-3 relative overflow-hidden">
                  <div className="absolute right-0 bottom-0 opacity-10">
                    <ShoppingCart className="h-32 w-32 translate-x-8 translate-y-8 text-white" />
                  </div>
                  <div className="flex justify-between text-xs text-neutral-400">
                    <span>Items Subtotal:</span>
                    <span className="font-mono font-bold text-white">₹{lastPlacedOrder.estimatedAmount}</span>
                  </div>
                  <div className="flex justify-between text-xs text-neutral-400">
                    <span>Runner Delivery Partner Charge:</span>
                    <span className="font-mono font-bold text-white">₹{lastPlacedOrder.deliveryCharge}</span>
                  </div>
                  <div className="border-t border-neutral-800 pt-2.5 flex justify-between items-center">
                    <span className="text-sm font-bold text-orange-400 font-display">Grand Total (Amount Payable):</span>
                    <span className="font-mono font-black text-xl text-orange-400">₹{lastPlacedOrder.totalAmount}</span>
                  </div>
                </div>

                {/* Extra Instructions or Notes */}
                {(lastPlacedOrder.customerDetails.instructions || lastPlacedOrder.customerNotes) && (
                  <div className="bg-neutral-50 border border-neutral-150 p-4 rounded-2xl text-xs space-y-2">
                    {lastPlacedOrder.customerDetails.instructions && (
                      <p className="text-neutral-600">
                        <strong>Delivery Instructions:</strong> <span className="italic font-medium">"{lastPlacedOrder.customerDetails.instructions}"</span>
                      </p>
                    )}
                    {lastPlacedOrder.customerNotes && (
                      <p className="text-[#FF6321]">
                        <strong>Custom Notes/Requests:</strong> <span className="italic font-bold">"{lastPlacedOrder.customerNotes}"</span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Footer controls */}
              <div className="p-6 bg-neutral-50 border-t border-neutral-200 flex flex-wrap gap-3 items-center justify-between">
                <button
                  onClick={() => {
                    handleDownloadReceipt(lastPlacedOrder);
                    showToast('Starting receipt download...', 'info');
                  }}
                  className="bg-white hover:bg-neutral-100 border border-neutral-200 text-neutral-700 font-bold text-xs py-3 px-4 rounded-xl transition cursor-pointer flex items-center gap-1.5 active:scale-97"
                >
                  <Download className="h-4 w-4" /> Download Receipt PDF
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const itemsDesc = lastPlacedOrder.items.map(item => `• ${item.product.name} (x${item.quantity}) - ₹${(item.product.price || 0) * item.quantity}`).join('\n');
                      const waMessage = `🛒 *LOCAL XPRESS NEW ORDER*\n\n` +
                        `*Order ID:* ${lastPlacedOrder.id}\n\n` +
                        `*👤 Customer:* ${lastPlacedOrder.customerDetails.name}\n` +
                        `*📞 Mobile:* ${lastPlacedOrder.customerDetails.mobile}\n` +
                        `*📍 Address:* ${lastPlacedOrder.customerDetails.address}, ${lastPlacedOrder.customerDetails.landmark}, ${lastPlacedOrder.customerDetails.area}\n\n` +
                        `*📦 Items Ordered:*\n${itemsDesc}\n\n` +
                        `*💵 Est. Items Subtotal:* ₹${lastPlacedOrder.estimatedAmount}\n` +
                        `*⚡ Runner Delivery Slabs:* ₹${lastPlacedOrder.deliveryCharge}\n` +
                        `*💰 Total Payable Amount:* *₹${lastPlacedOrder.totalAmount}*\n\n` +
                        `*💳 Payment Method:* ${lastPlacedOrder.customerDetails.paymentMethod}\n\n` +
                        `_Please click SEND to dispatch!_`;
                      const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(waMessage)}`;
                      window.open(url, '_blank');
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 px-5 rounded-xl shadow-md shadow-emerald-500/10 transition-all cursor-pointer flex items-center gap-1.5 active:scale-97"
                  >
                    <MessageSquare className="h-4 w-4 animate-bounce" style={{ animationDuration: '2s' }} /> Send on WhatsApp
                  </button>
                  <button
                    onClick={onClearLastPlacedOrder}
                    className="bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs py-3 px-5 rounded-xl transition cursor-pointer active:scale-97"
                  >
                    Close & Continue
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
