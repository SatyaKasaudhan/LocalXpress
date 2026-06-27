import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Store, ShoppingBag, DollarSign, TrendingUp, Search, 
  Plus, Edit, Trash2, Printer, Phone, Download, CheckCircle, 
  Clock, LogOut, ShieldAlert, BarChart2, FileText, Settings, X, Menu,
  Lock, Eye, EyeOff, User, Sparkles, Filter, ChevronRight, Upload,
  Calendar, Check, AlertCircle, RefreshCw, Wrench, Megaphone, Send, Bell,
  MapPin, Truck, MessageSquare, Minus, Cloud
} from 'lucide-react';
import { Order, Vendor, CustomerSummary, PurchaseRecord, UserRole, OrderStatus, Product, BroadcastMessage, Runner, Offer, CartItem } from '../types';
import { exportToCSV, isStoreOpen, generateOrderId, getTodayDateStr, getFormattedTime } from '../utils';
import { createOrderInFirestore, saveOfferInFirestore, deleteOfferFromFirestore } from '../lib/dbService';
import { syncSingleOrderToSheet } from '../lib/workspaceService';
import { useToast } from './Toast';
import AICopilot from './AICopilot';
import LocalXpressLogo from './LocalXpressLogo';
import GoogleWorkspacePanel from './GoogleWorkspacePanel';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface AdminPanelProps {
  currentRole: UserRole;
  onLogout: () => void;
  orders: Order[];
  ordersLoading?: boolean;
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => void;
  vendors: Vendor[];
  onAddVendor: (v: Omit<Vendor, 'id'>) => void;
  onUpdateVendor: (v: Vendor) => void;
  onDeleteVendor: (id: string) => void;
  customers: CustomerSummary[];
  onAddPurchaseRecord: (p: PurchaseRecord) => void;
  googleFormUrl: string;
  setGoogleFormUrl: (url: string) => void;
  whatsappNumber: string;
  setWhatsappNumber: (num: string) => void;
  products: Product[];
  productsLoading?: boolean;
  onAddProduct: (p: Omit<Product, 'id'>) => void;
  onUpdateProduct: (p: Product) => void;
  onDeleteProduct: (productId: string) => void;
  shopTitle: string;
  setShopTitle: (title: string) => void;
  shopHeroHeadline: string;
  setShopHeroHeadline: (headline: string) => void;
  shopHeroDescription: string;
  setShopHeroDescription: (desc: string) => void;
  serviceRadius: string;
  setServiceRadius: (rad: string) => void;
  workingHours: string;
  setWorkingHours: (hours: string) => void;
  baseDeliveryCharge: number;
  setBaseDeliveryCharge: (charge: number) => void;
  freeDeliveryThreshold: number;
  setFreeDeliveryThreshold: (thresh: number) => void;
  broadcasts?: BroadcastMessage[];
  onAddBroadcast?: (b: BroadcastMessage) => Promise<void>;
  onDeleteBroadcast?: (id: string) => Promise<void>;
  runners?: Runner[];
  onSaveRunner?: (r: Runner) => Promise<void>;
  onDeleteRunner?: (id: string) => Promise<void>;
  onUpdateOrderRunner?: (orderId: string, runnerId: string | undefined, runnerName: string | undefined) => Promise<void>;
  offers?: Offer[];
}

export default function AdminPanel({
  currentRole,
  onLogout,
  orders,
  ordersLoading = false,
  onUpdateOrderStatus,
  vendors,
  onAddVendor,
  onUpdateVendor,
  onDeleteVendor,
  customers,
  onAddPurchaseRecord,
  googleFormUrl,
  setGoogleFormUrl,
  whatsappNumber,
  setWhatsappNumber,
  products,
  productsLoading = false,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  shopTitle,
  setShopTitle,
  shopHeroHeadline,
  setShopHeroHeadline,
  shopHeroDescription,
  setShopHeroDescription,
  serviceRadius,
  setServiceRadius,
  workingHours,
  setWorkingHours,
  baseDeliveryCharge,
  setBaseDeliveryCharge,
  freeDeliveryThreshold,
  setFreeDeliveryThreshold,
  broadcasts = [],
  onAddBroadcast,
  onDeleteBroadcast,
  runners = [],
  onSaveRunner,
  onDeleteRunner,
  onUpdateOrderRunner,
  offers = [],
}: AdminPanelProps) {
  // Tabs: 'dashboard' | 'orders' | 'vendors' | 'customers' | 'purchases' | 'analytics' | 'reports' | 'settings' | 'ai-copilot' | 'builder' | 'runners' | 'offers' | 'google-workspace'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'vendors' | 'customers' | 'purchases' | 'analytics' | 'reports' | 'settings' | 'ai-copilot' | 'builder' | 'runners' | 'offers' | 'google-workspace'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { showToast } = useToast();
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  const getWhatsAppInvoiceUrl = (order: Order) => {
    const origin = window.location.origin;
    const invoiceLink = `${origin}?track=${order.id}&view=invoice`;
    const text = `🛒 *LOCAL XPRESS DELIVERY SUCCESS* 🚚\n\n` +
      `Hello *${order.customerDetails.name}*, your order *#${order.id}* has been successfully delivered!\n\n` +
      `*💰 Total Amount Paid:* ₹${order.totalAmount + order.deliveryCharge}\n` +
      `*📍 Status:* DELIVERED 🎉\n\n` +
      `View and download your digital PDF invoice here:\n${invoiceLink}\n\n` +
      `Thank you for choosing Local Xpress!`;
    const cleanMobile = order.customerDetails.mobile.replace(/\D/g, "");
    return `https://wa.me/${cleanMobile}?text=${encodeURIComponent(text)}`;
  };

  // Global Search & Filters
  const [globalSearch, setGlobalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Product Builder States
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [pName, setPName] = useState('');
  const [pCategory, setPCategory] = useState('Grocery');
  const [pUnit, setPUnit] = useState('1 Kg');
  const [pPrice, setPPrice] = useState('');
  const [pImage, setPImage] = useState('');
  const [pFeatured, setPFeatured] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [productCatFilter, setProductCatFilter] = useState('All');

  // Broadcast Notification States
  const [bTitle, setBTitle] = useState('');
  const [bMessage, setBMessage] = useState('');
  const [bType, setBType] = useState<'info' | 'warning' | 'urgent'>('info');
  const [isSendingB, setIsSendingB] = useState(false);

  // Offer Builder States
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [offId, setOffId] = useState('');
  const [offTitle, setOffTitle] = useState('');
  const [offDescription, setOffDescription] = useState('');
  const [offDiscountType, setOffDiscountType] = useState<'percentage' | 'flat' | 'free-delivery' | 'banner-only'>('flat');
  const [offDiscountValue, setOffDiscountValue] = useState<string>('0');
  const [offMinOrderValue, setOffMinOrderValue] = useState<string>('0');
  const [offStatus, setOffStatus] = useState<'Active' | 'Inactive'>('Active');

  // Advanced Search & Autocomplete
  const [advSearchQuery, setAdvSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Clear selection on tab or filter change
  useEffect(() => {
    setSelectedOrderIds([]);
  }, [activeTab, statusFilter]);

  // Vendor Modals & Forms
  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [vShopName, setVShopName] = useState('');
  const [vOwnerName, setVOwnerName] = useState('');
  const [vMobile, setVMobile] = useState('');
  const [vCategory, setVCategory] = useState('Grocery');
  const [vAddress, setVAddress] = useState('');
  const [vOpen, setVOpen] = useState('08:00 AM');
  const [vClose, setVClose] = useState('09:00 PM');
  const [vStatus, setVStatus] = useState<'Active' | 'Inactive'>('Active');

  // Purchase Form Modal
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [purchaseOrderId, setPurchaseOrderId] = useState('');
  const [purchaseVendorId, setPurchaseVendorId] = useState('');
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [purchasedItemsDesc, setPurchasedItemsDesc] = useState('');
  const [purchaseBillNo, setPurchaseBillNo] = useState('');
  const [billImageFile, setBillImageFile] = useState<string>('');

  // Report Dates
  const [reportType, setReportType] = useState<'Daily' | 'Weekly' | 'Monthly'>('Daily');

  // Quick New Order Form States & Ref
  const [quickOrderModalOpen, setQuickOrderModalOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [qoName, setQoName] = useState('');
  const [qoMobile, setQoMobile] = useState('');
  const [qoAddress, setQoAddress] = useState('');
  const [qoLandmark, setQoLandmark] = useState('');
  const [qoArea, setQoArea] = useState('Siddharthnagar');
  const [qoPincode, setQoPincode] = useState('');
  const [qoItemsDesc, setQoItemsDesc] = useState('');
  const [qoSubtotal, setQoSubtotal] = useState('');
  const [qoDelivery, setQoDelivery] = useState('40');
  const [qoPaymentMethod, setQoPaymentMethod] = useState<'Cash on Delivery' | 'UPI on Delivery'>('Cash on Delivery');
  const [qoNotes, setQoNotes] = useState('');

  // Sourced items states for manual order
  const [qoItems, setQoItems] = useState<CartItem[]>([]);
  const [qoSearchQuery, setQoSearchQuery] = useState('');
  const [showQoSearchDropdown, setShowQoSearchDropdown] = useState(false);
  const [qoCustomItemName, setQoCustomItemName] = useState('');
  const [qoCustomItemPrice, setQoCustomItemPrice] = useState('');
  const [qoCustomItemQty, setQoCustomItemQty] = useState('1');
  const [qoCustomItemCategory, setQoCustomItemCategory] = useState('Grocery');

  // Sync qoItems with qoItemsDesc and qoSubtotal
  useEffect(() => {
    if (qoItems.length > 0) {
      const desc = qoItems.map(item => `${item.product.name} x${item.quantity}`).join('\n');
      setQoItemsDesc(desc);

      const subtotal = qoItems.reduce((acc, item) => acc + ((item.product.price || 0) * item.quantity), 0);
      setQoSubtotal(subtotal.toString());
    }
  }, [qoItems]);

  const filteredProductsForQo = useMemo(() => {
    if (!qoSearchQuery.trim()) return [];
    const query = qoSearchQuery.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(query) || 
      p.category.toLowerCase().includes(query)
    ).slice(0, 5);
  }, [products, qoSearchQuery]);

  const handleAddProductToQo = (prod: Product) => {
    const existing = qoItems.find(item => item.product.id === prod.id);
    if (existing) {
      setQoItems(qoItems.map(item => 
        item.product.id === prod.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setQoItems([...qoItems, {
        product: { ...prod, price: prod.price || 0 },
        quantity: 1
      }]);
    }
    setQoSearchQuery('');
    setShowQoSearchDropdown(false);
    showToast(`${prod.name} added to order list.`, 'success');
  };

  const handleAddCustomItemToQo = () => {
    if (!qoCustomItemName.trim()) {
      showToast('Please enter custom item name.', 'warning');
      return;
    }
    const price = parseFloat(qoCustomItemPrice) || 0;
    const qty = parseInt(qoCustomItemQty, 10) || 1;

    const customProduct: Product = {
      id: `custom-${Date.now()}`,
      name: qoCustomItemName.trim(),
      price: price,
      category: qoCustomItemCategory,
      image: '',
      unit: 'pc'
    };

    setQoItems([...qoItems, {
      product: customProduct,
      quantity: qty
    }]);

    setQoCustomItemName('');
    setQoCustomItemPrice('');
    setQoCustomItemQty('1');
    showToast(`Custom item "${customProduct.name}" added.`, 'success');
  };

  const handleUpdateQoItemQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      handleDeleteQoItem(index);
      return;
    }
    setQoItems(qoItems.map((item, idx) => 
      idx === index ? { ...item, quantity: newQty } : item
    ));
  };

  const handleUpdateQoItemPrice = (index: number, newPrice: number) => {
    setQoItems(qoItems.map((item, idx) => 
      idx === index ? { ...item, product: { ...item.product, price: newPrice } } : item
    ));
  };

  const handleUpdateQoItemName = (index: number, newName: string) => {
    setQoItems(qoItems.map((item, idx) => 
      idx === index ? { ...item, product: { ...item.product, name: newName } } : item
    ));
  };

  const handleDeleteQoItem = (index: number) => {
    const itemToDelete = qoItems[index];
    setQoItems(qoItems.filter((_, idx) => idx !== index));
    showToast(`Removed "${itemToDelete.product.name}" from order list.`, 'info');
  };

  // NEW States for Improvements
  const [viewingOrderDetail, setViewingOrderDetail] = useState<Order | null>(null);
  
  // Runner Management States
  const [runnerModalOpen, setRunnerModalOpen] = useState(false);
  const [editingRunner, setEditingRunner] = useState<Runner | null>(null);
  const [rName, setRName] = useState('');
  const [rMobile, setRMobile] = useState('');
  const [rStatus, setRStatus] = useState<'Active' | 'On Delivery' | 'Offline'>('Active');

  // Route Optimization State
  const [optimizedSequence, setOptimizedSequence] = useState<Order[] | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Store force status override
  const [storeForceState, setStoreForceState] = useState<'auto' | 'open' | 'closed'>(() => {
    return (localStorage.getItem('lx_store_force_state') as any) || 'auto';
  });

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow Ctrl+K or Cmd+K to focus search input
      const isMeta = e.ctrlKey || e.metaKey;
      
      if (isMeta && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.select();
        }
      }
      
      // Allow Ctrl+N or Cmd+N to trigger "Quick New Order" modal
      if (isMeta && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setQuickOrderModalOpen(true);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleQuickOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qoName || !qoMobile || !qoAddress) {
      showToast('Please fill in all required customer details.', 'warning');
      return;
    }

    if (qoItems.length === 0 && !qoItemsDesc.trim()) {
      showToast('Please add at least one item to the order.', 'warning');
      return;
    }

    const orderId = generateOrderId(orders);
    const todayDate = getTodayDateStr();
    const timeStr = getFormattedTime();

    const itemsSubtotal = parseFloat(qoSubtotal) || 0;
    const deliveryCharge = parseFloat(qoDelivery) || 0;
    const totalAmount = itemsSubtotal + deliveryCharge;

    // Build the items list
    let finalItems: CartItem[] = [];
    if (qoItems.length > 0) {
      finalItems = qoItems.map((item, index) => ({
        product: {
          ...item.product,
          id: item.product.id || `qo-prod-${index}`,
          price: item.product.price || 0
        },
        quantity: item.quantity
      }));
    } else {
      const lines = qoItemsDesc.split(/[\n,]+/).map(item => item.trim()).filter(Boolean);
      finalItems = lines.map((itemStr, index) => {
        let name = itemStr;
        let qty = 1;
        
        const qtyMatch = itemStr.match(/(.*?)\(?x?\s*(\d+)\)?$/i);
        if (qtyMatch && qtyMatch[1] && qtyMatch[2]) {
          name = qtyMatch[1].trim().replace(/[-\s]+$/, '');
          qty = parseInt(qtyMatch[2], 10);
        }

        return {
          id: `qo-item-${index}`,
          product: {
            id: `qo-prod-${index}`,
            name,
            price: Math.round(itemsSubtotal / (lines.length || 1)),
            category: 'Grocery',
            image: '',
            unit: 'pc',
            popular: false
          },
          quantity: qty
        };
      });
    }

    const newOrder: Order = {
      id: orderId,
      date: todayDate,
      time: timeStr,
      customerDetails: {
        name: qoName,
        mobile: qoMobile,
        address: qoAddress,
        landmark: qoLandmark,
        area: qoArea,
        pincode: qoPincode,
        paymentMethod: qoPaymentMethod,
        instructions: qoNotes
      },
      items: finalItems,
      estimatedAmount: itemsSubtotal,
      deliveryCharge,
      totalAmount,
      status: 'Pending',
      customerNotes: qoNotes,
    };

    try {
      await createOrderInFirestore(newOrder);
      showToast(`Order ${orderId} successfully created directly from dispatcher!`, 'success');
      
      // Google Sheets Auto Sync for manual orders
      const token = sessionStorage.getItem("lx_g_token");
      const sheetId = localStorage.getItem("lx_g_sheet_id");
      const autoSync = localStorage.getItem("lx_g_auto_sync") !== "false";

      if (token && sheetId && autoSync) {
        syncSingleOrderToSheet(token, sheetId, newOrder)
          .then(() => {
            console.log(`Auto-synced manual order #${orderId} to Google Sheet.`);
          })
          .catch((err) => {
            console.error("Auto-sync manual order to Sheet failed:", err);
          });
      }

      // Reset form
      setQoName('');
      setQoMobile('');
      setQoAddress('');
      setQoLandmark('');
      setQoArea('Siddharthnagar');
      setQoPincode('');
      setQoItemsDesc('');
      setQoSubtotal('');
      setQoDelivery('40');
      setQoPaymentMethod('Cash on Delivery');
      setQoNotes('');
      setQoItems([]);
      setQoSearchQuery('');
      setQoCustomItemName('');
      setQoCustomItemPrice('');
      setQoCustomItemQty('1');
      setQuickOrderModalOpen(false);
    } catch (err: any) {
      console.error("Failed to create quick order:", err);
      showToast(`Failed to create order: ${err.message}`, 'error');
    }
  };

  // --- STATS CALCULATIONS ---
  const stats = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('en-GB').replace(/\//g, '-'); // DD-MM-YYYY format basically
    const todayOrders = orders.filter(o => o.date === '24-06-2026' || o.date === todayStr);
    const pendingOrders = orders.filter(o => o.status === 'Pending');
    const deliveredOrders = orders.filter(o => o.status === 'Delivered');
    
    const totalRev = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    
    // Profits = Customer Amount - Purchase Cost + Delivery Charge
    // Wait, let's look at the instruction example:
    // Profit = Customer Amount (500) - Purchase Cost (420) + Delivery Charge (40) = Profit (120)
    // Wait! Actually, let's look at standard profit calculations.
    // If we have purchase records, profit is: (Estimated Items Amount - Purchase Amount) + Delivery Charge.
    // Or if there is no purchase record recorded yet, estimated profit is calculated at 15% item margin + delivery charge.
    // Let's implement this calculation precisely.
    let totalProfit = 0;
    orders.forEach(o => {
      if (o.status === 'Delivered') {
        const dCharge = o.deliveryCharge || 30;
        if (o.purchase) {
          // If we have an exact purchase bill logged:
          // Profit = Customer Items Price - Vendor Cost + Delivery Fee
          const itemsPrice = o.estimatedAmount;
          const cost = o.purchase.purchaseAmount;
          totalProfit += (itemsPrice - cost) + dCharge;
        } else {
          // Fallback to estimated profit (e.g. 20% mark-up savings + delivery)
          totalProfit += (o.estimatedAmount * 0.15) + dCharge;
        }
      }
    });

    return {
      todayCount: todayOrders.length,
      pendingCount: pendingOrders.length,
      deliveredCount: deliveredOrders.length,
      totalCustomers: customers.length,
      totalVendors: vendors.length,
      revenue: totalRev,
      profit: Math.round(totalProfit)
    };
  }, [orders, vendors, customers]);

  const pendingOrdersList = useMemo(() => orders.filter(o => o.status === 'Pending'), [orders]);

  // --- SEARCH & FILTER ---
  const advSearchSuggestions = useMemo(() => {
    if (!advSearchQuery.trim()) return [];
    const query = advSearchQuery.toLowerCase().trim();
    const list: Array<{
      id: string;
      type: 'customer' | 'mobile' | 'item';
      value: string;
      label: string;
      orderId: string;
      subtext?: string;
    }> = [];

    const addedKeys = new Set<string>();

    orders.forEach((o) => {
      // 1. Customer Name Match
      if (o.customerDetails.name.toLowerCase().includes(query)) {
        const key = `cust-${o.customerDetails.name.toLowerCase()}`;
        if (!addedKeys.has(key)) {
          addedKeys.add(key);
          list.push({
            id: `cust-${o.id}`,
            type: 'customer',
            value: o.customerDetails.name,
            label: o.customerDetails.name,
            orderId: o.id,
            subtext: `Customer (Order ${o.id})`
          });
        }
      }

      // 2. Mobile Match
      if (o.customerDetails.mobile.includes(query)) {
        const key = `mob-${o.customerDetails.mobile}`;
        if (!addedKeys.has(key)) {
          addedKeys.add(key);
          list.push({
            id: `mob-${o.id}`,
            type: 'mobile',
            value: o.customerDetails.mobile,
            label: o.customerDetails.mobile,
            orderId: o.id,
            subtext: `Mobile (${o.customerDetails.name})`
          });
        }
      }

      // 3. Item Name Match
      o.items.forEach((item, idx) => {
        if (item.product.name.toLowerCase().includes(query)) {
          const key = `item-${item.product.name.toLowerCase()}`;
          if (!addedKeys.has(key)) {
            addedKeys.add(key);
            list.push({
              id: `item-${o.id}-${idx}`,
              type: 'item',
              value: item.product.name,
              label: item.product.name,
              orderId: o.id,
              subtext: `Product (in Order ${o.id})`
            });
          }
        }
      });
    });

    return list.slice(0, 8);
  }, [orders, advSearchQuery]);

  const orderCountsByStatus = useMemo(() => {
    return {
      All: orders.length,
      Pending: orders.filter(o => o.status === 'Pending').length,
      Confirmed: orders.filter(o => o.status === 'Confirmed').length,
      Purchased: orders.filter(o => o.status === 'Purchased').length,
      'Out For Delivery': orders.filter(o => o.status === 'Out For Delivery').length,
      Delivered: orders.filter(o => o.status === 'Delivered').length,
      'In Progress': orders.filter(o => ['Confirmed', 'Purchased', 'Out For Delivery'].includes(o.status)).length,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      let matchesSearch = true;
      if (globalSearch) {
        matchesSearch = 
          o.id.toLowerCase().includes(globalSearch.toLowerCase()) ||
          o.customerDetails.name.toLowerCase().includes(globalSearch.toLowerCase()) ||
          o.customerDetails.mobile.includes(globalSearch);
      }

      let matchesAdvSearch = true;
      if (advSearchQuery) {
        const query = advSearchQuery.toLowerCase().trim();
        const matchesId = o.id.toLowerCase().includes(query);
        const matchesName = o.customerDetails.name.toLowerCase().includes(query);
        const matchesMobile = o.customerDetails.mobile.includes(query);
        const matchesItem = o.items.some(item => item.product.name.toLowerCase().includes(query));
        matchesAdvSearch = matchesId || matchesName || matchesMobile || matchesItem;
      }
      
      let matchesStatus = true;
      if (statusFilter === 'Pending') {
        matchesStatus = o.status === 'Pending';
      } else if (statusFilter === 'In Progress') {
        matchesStatus = o.status === 'Confirmed' || o.status === 'Purchased' || o.status === 'Out For Delivery';
      } else if (statusFilter === 'Delivered') {
        matchesStatus = o.status === 'Delivered';
      } else if (statusFilter !== 'All') {
        matchesStatus = o.status === statusFilter;
      }
      return matchesSearch && matchesAdvSearch && matchesStatus;
    });
  }, [orders, globalSearch, advSearchQuery, statusFilter]);

  // --- RECHARTS CHART DATA PREPARATION ---
  const COLORS = ['#FF6321', '#FF8F3D', '#FFAE6B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B'];

  const dailyVolumeData = useMemo(() => {
    const groups: Record<string, { date: string; ordersCount: number; totalSales: number }> = {};
    
    orders.forEach((o) => {
      const dateStr = o.date;
      if (!groups[dateStr]) {
        groups[dateStr] = {
          date: dateStr,
          ordersCount: 0,
          totalSales: 0
        };
      }
      groups[dateStr].ordersCount += 1;
      groups[dateStr].totalSales += o.totalAmount;
    });

    return Object.values(groups).sort((a, b) => {
      const partsA = a.date.split('-');
      const partsB = b.date.split('-');
      if (partsA.length === 3 && partsB.length === 3) {
        const dateA = new Date(Number(partsA[2]), Number(partsA[1]) - 1, Number(partsA[0])).getTime();
        const dateB = new Date(Number(partsB[2]), Number(partsB[1]) - 1, Number(partsB[0])).getTime();
        return dateA - dateB;
      }
      return a.date.localeCompare(b.date);
    });
  }, [orders]);

  const categoryData = useMemo(() => {
    const groups: Record<string, { name: string; value: number; revenue: number }> = {};
    
    orders.forEach((o) => {
      o.items.forEach((item) => {
        const category = item.product.category || 'Other';
        if (!groups[category]) {
          groups[category] = {
            name: category,
            value: 0,
            revenue: 0
          };
        }
        groups[category].value += item.quantity;
        const price = item.product.price || 0;
        groups[category].revenue += price * item.quantity;
      });
    });

    return Object.values(groups).sort((a, b) => b.value - a.value);
  }, [orders]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      c.name.toLowerCase().includes(globalSearch.toLowerCase()) ||
      c.mobile.includes(globalSearch) ||
      c.address.toLowerCase().includes(globalSearch.toLowerCase())
    );
  }, [customers, globalSearch]);

  const filteredVendors = useMemo(() => {
    return vendors.filter(v => 
      v.shopName.toLowerCase().includes(globalSearch.toLowerCase()) ||
      v.ownerName.toLowerCase().includes(globalSearch.toLowerCase()) ||
      v.category.toLowerCase().includes(globalSearch.toLowerCase())
    );
  }, [vendors, globalSearch]);

  // Handle Edit/Save Vendor
  const openAddVendor = () => {
    setEditingVendor(null);
    setVShopName('');
    setVOwnerName('');
    setVMobile('');
    setVCategory('Grocery');
    setVAddress('');
    setVOpen('08:00 AM');
    setVClose('09:00 PM');
    setVStatus('Active');
    setVendorModalOpen(true);
  };

  const openEditVendor = (v: Vendor) => {
    setEditingVendor(v);
    setVShopName(v.shopName);
    setVOwnerName(v.ownerName);
    setVMobile(v.mobile);
    setVCategory(v.category);
    setVAddress(v.address);
    setVOpen(v.openingTime);
    setVClose(v.closingTime);
    setVStatus(v.status);
    setVendorModalOpen(true);
  };

  const handleVendorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vShopName || !vOwnerName || !vMobile || !vAddress) {
      showToast('Please fill out all fields.', 'warning');
      return;
    }

    if (editingVendor) {
      onUpdateVendor({
        id: editingVendor.id,
        shopName: vShopName,
        ownerName: vOwnerName,
        mobile: vMobile,
        category: vCategory,
        address: vAddress,
        openingTime: vOpen,
        closingTime: vClose,
        status: vStatus,
      });
    } else {
      onAddVendor({
        shopName: vShopName,
        ownerName: vOwnerName,
        mobile: vMobile,
        category: vCategory,
        address: vAddress,
        openingTime: vOpen,
        closingTime: vClose,
        status: vStatus,
      });
    }
    setVendorModalOpen(false);
  };

  const handleRunnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rName || !rMobile) {
      showToast('Please enter Name and Mobile number.', 'warning');
      return;
    }

    let runnerId = editingRunner ? editingRunner.id : `R${(runners.length + 1).toString().padStart(3, '0')}`;
    // prevent collision
    if (!editingRunner) {
      while (runners.some(r => r.id === runnerId)) {
        runnerId = `R${Math.floor(Math.random() * 900) + 100}`;
      }
    }

    const runnerData: Runner = {
      id: runnerId,
      name: rName,
      mobile: rMobile,
      status: rStatus,
      assignedOrdersCount: editingRunner ? editingRunner.assignedOrdersCount : 0,
    };

    if (onSaveRunner) {
      await onSaveRunner(runnerData);
      showToast(`Runner ${rName} saved successfully`, 'success');
    }
    setRunnerModalOpen(false);
  };

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName || !pPrice) {
      showToast('Please enter Name and Price.', 'warning');
      return;
    }

    if (editingProduct) {
      onUpdateProduct({
        id: editingProduct.id,
        name: pName,
        category: pCategory,
        unit: pUnit,
        price: Number(pPrice),
        image: pImage,
        featured: pFeatured,
      });
    } else {
      onAddProduct({
        name: pName,
        category: pCategory,
        unit: pUnit,
        price: Number(pPrice),
        image: pImage,
        featured: pFeatured,
      });
    }
    setProductModalOpen(false);
  };

  const handleBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bTitle || !bMessage) {
      showToast('Please enter both Title and Message.', 'error');
      return;
    }
    if (!onAddBroadcast) {
      showToast('Broadcast service is not available.', 'error');
      return;
    }

    try {
      setIsSendingB(true);
      const newBroadcast: BroadcastMessage = {
        id: `BC-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        senderName: currentRole === 'Admin' ? 'Admin' : 'Staff',
        title: bTitle,
        message: bMessage,
        createdAt: new Date().toISOString(),
        type: bType,
      };

      await onAddBroadcast(newBroadcast);
      showToast('Broadcast message sent successfully!', 'success');
      setBTitle('');
      setBMessage('');
      setBType('info');
    } catch (err) {
      console.error('Failed to send broadcast:', err);
      showToast('Failed to send broadcast. Check your database connection.', 'error');
    } finally {
      setIsSendingB(false);
    }
  };

  const handleDeleteBroadcast = async (id: string) => {
    if (!onDeleteBroadcast) return;
    try {
      await onDeleteBroadcast(id);
      showToast('Broadcast notification deleted.', 'success');
    } catch (err) {
      console.error('Failed to delete broadcast:', err);
      showToast('Failed to delete broadcast.', 'error');
    }
  };

  const handleOfferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offId.trim() || !offTitle.trim() || !offDescription.trim()) {
      showToast('Please fill out Code, Title, and Description.', 'error');
      return;
    }

    const uppercaseCode = offId.trim().toUpperCase();

    const offerData: Offer = {
      id: uppercaseCode,
      title: offTitle.trim(),
      description: offDescription.trim(),
      discountType: offDiscountType,
      discountValue: Number(offDiscountValue) || 0,
      minOrderValue: Number(offMinOrderValue) || 0,
      status: offStatus,
      createdAt: editingOffer?.createdAt || new Date().toISOString(),
    };

    try {
      await saveOfferInFirestore(offerData);
      showToast(`Offer ${uppercaseCode} saved successfully!`, 'success');
      
      // Reset form states
      setOffId('');
      setOffTitle('');
      setOffDescription('');
      setOffDiscountType('flat');
      setOffDiscountValue('0');
      setOffMinOrderValue('0');
      setOffStatus('Active');
      setEditingOffer(null);
      setOfferModalOpen(false);
    } catch (err) {
      console.error('Failed to save offer:', err);
      showToast('Failed to save offer to Firestore.', 'error');
    }
  };

  const handleEditOfferClick = (o: Offer) => {
    setEditingOffer(o);
    setOffId(o.id);
    setOffTitle(o.title);
    setOffDescription(o.description);
    setOffDiscountType(o.discountType);
    setOffDiscountValue(String(o.discountValue || 0));
    setOffMinOrderValue(String(o.minOrderValue || 0));
    setOffStatus(o.status);
    setOfferModalOpen(true);
  };

  const handleDeleteOfferClick = async (id: string) => {
    if (!window.confirm(`Are you sure you want to delete offer "${id}"?`)) return;
    try {
      await deleteOfferFromFirestore(id);
      showToast(`Offer "${id}" deleted.`, 'info');
    } catch (err) {
      console.error('Failed to delete offer:', err);
      showToast('Failed to delete offer from Firestore.', 'error');
    }
  };

  // Record Purchase Submit
  const handleOpenPurchaseForm = (order: Order) => {
    setPurchaseOrderId(order.id);
    // Auto populate matching vendor if possible based on items
    setPurchaseVendorId(vendors[0]?.id || '');
    setPurchaseAmount(String(Math.round(order.estimatedAmount * 0.85))); // estimated 15% margin cost
    const itemsText = order.items.map(i => `${i.product.name} x${i.quantity}`).join(', ');
    setPurchasedItemsDesc(itemsText);
    setPurchaseBillNo(`BILL-${Math.floor(1000 + Math.random() * 9000)}`);
    setBillImageFile('');
    setPurchaseModalOpen(true);
  };

  const handlePurchaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseAmount || !purchaseBillNo) {
      showToast('Please enter the purchase cost and bill reference.', 'warning');
      return;
    }

    const selectedVendor = vendors.find(v => v.id === purchaseVendorId);

    const record: PurchaseRecord = {
      orderId: purchaseOrderId,
      vendorId: purchaseVendorId,
      vendorName: selectedVendor ? selectedVendor.shopName : 'Unknown Vendor',
      purchaseAmount: parseFloat(purchaseAmount),
      purchasedItems: purchasedItemsDesc,
      billNumber: purchaseBillNo,
      purchaseDate: new Date().toLocaleDateString('en-GB').replace(/\//g, '-'),
      billImage: billImageFile || undefined
    };

    onAddPurchaseRecord(record);
    onUpdateOrderStatus(purchaseOrderId, 'Purchased');
    setPurchaseModalOpen(false);
  };

  // Image Upload handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBillImageFile(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // --- REPORT GENERATION ---
  const handleExportCSVReport = () => {
    const todayStr = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
    let reportOrders = orders;
    
    if (reportType === 'Daily') {
      reportOrders = orders.filter(o => o.date === '24-06-2026' || o.date === todayStr);
    } else if (reportType === 'Weekly') {
      // Simulate weekly filter - last 7 days of dates
      reportOrders = orders.slice(0, 10);
    }

    const headers = ['Order ID', 'Date', 'Time', 'Customer Name', 'Mobile', 'Address', 'Subtotal (₹)', 'Runner Fee (₹)', 'Total Bill (₹)', 'Status', 'Vendor Shop', 'Purchase Cost (₹)', 'Net Profit (₹)'];
    
    const rows = reportOrders.map(o => {
      const runnerFee = o.deliveryCharge;
      const subtotal = o.estimatedAmount;
      const total = o.totalAmount;
      const pCost = o.purchase ? o.purchase.purchaseAmount : 0;
      
      // Profit = Subtotal - PurchaseCost + RunnerFee (only if delivered and purchased)
      let profit = 0;
      if (o.status === 'Delivered') {
        profit = o.purchase ? (subtotal - pCost + runnerFee) : (subtotal * 0.15 + runnerFee);
      }

      return [
        o.id,
        o.date,
        o.time,
        o.customerDetails.name,
        o.customerDetails.mobile,
        o.customerDetails.address,
        subtotal,
        runnerFee,
        total,
        o.status,
        o.purchase ? o.purchase.vendorName : 'Pending Log',
        pCost || 'N/A',
        Math.round(profit)
      ];
    });

    exportToCSV(rows, headers, `LocalXpress_${reportType}_Report_${todayStr}`);
  };

  const handleExportFilteredCSV = () => {
    const todayStr = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
    const headers = [
      'Order ID', 'Date', 'Time', 'Customer Name', 'Mobile', 'Address', 'Area', 'Pincode',
      'Subtotal (₹)', 'Runner Fee (₹)', 'Total Bill (₹)', 'Status', 'Customer Notes',
      'Vendor Shop', 'Purchase Cost (₹)', 'Net Profit (₹)'
    ];
    
    const rows = filteredOrders.map(o => {
      const runnerFee = o.deliveryCharge;
      const subtotal = o.estimatedAmount;
      const total = o.totalAmount;
      const pCost = o.purchase ? o.purchase.purchaseAmount : 0;
      
      // Profit = Subtotal - PurchaseCost + RunnerFee (only if delivered and purchased)
      let profit = 0;
      if (o.status === 'Delivered') {
        profit = o.purchase ? (subtotal - pCost + runnerFee) : (subtotal * 0.15 + runnerFee);
      }

      return [
        o.id,
        o.date,
        o.time,
        o.customerDetails.name,
        o.customerDetails.mobile,
        o.customerDetails.address,
        o.customerDetails.area,
        o.customerDetails.pincode || '',
        subtotal,
        runnerFee,
        total,
        o.status,
        o.customerNotes || o.customerDetails.customerNotes || '',
        o.purchase ? o.purchase.vendorName : 'Pending Log',
        pCost || '0',
        Math.round(profit)
      ];
    });

    exportToCSV(rows, headers, `LocalXpress_Filtered_Orders_${statusFilter}_${todayStr}`);
  };

  const handlePrintOrder = (order: Order) => {
    setSelectedOrder(order);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <div className="flex-1 bg-neutral-100 text-neutral-900 min-h-[calc(100vh-64px)] flex flex-col md:flex-row text-left">
      {/* MOBILE COMPACT SUB-HEADER & DRAWER TRIGGER */}
      <div className="md:hidden sticky top-16 z-30 bg-white border-b border-neutral-200 px-4 py-3 flex items-center justify-between no-print shadow-xs">
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex items-center gap-2 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-800 font-bold px-3.5 py-2 rounded-xl text-xs transition cursor-pointer"
        >
          <Menu className="h-4.5 w-4.5 text-[#FF6321]" />
          <span>Menu</span>
        </button>

        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${currentRole === 'Admin' ? 'bg-[#FF6321]' : 'bg-indigo-600 animate-pulse'}`} />
          <span className="text-xs font-black text-neutral-800 uppercase tracking-wider font-display">
            {currentRole}: {activeTab === 'ai-copilot' ? 'AI Copilot' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
          </span>
        </div>
      </div>

      {/* MOBILE MENU DRAWER */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black z-40 md:hidden cursor-default no-print"
            />

            {/* Slide-out Sidebar Drawer */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white z-50 md:hidden flex flex-col justify-between p-5 shadow-2xl border-r border-neutral-200 no-print"
            >
              <div className="space-y-5">
                {/* Drawer Header */}
                <div className="flex items-center justify-between border-b border-neutral-100 pb-3 gap-2">
                  <LocalXpressLogo className="h-6.5 max-w-[140px]" />
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-1.5 hover:bg-neutral-100 rounded-xl text-neutral-500 hover:text-neutral-800 transition cursor-pointer shrink-0"
                  >
                    <X className="h-4.5 w-4.5" />
                  </button>
                </div>

                {/* Logged Profile card */}
                <div className="space-y-2">
                  <span className="text-[8px] text-neutral-400 font-display tracking-widest uppercase font-extrabold block">Logged Session</span>
                  <div className={`flex items-center gap-3 border p-3 rounded-2xl ${
                    currentRole === 'Admin' 
                      ? 'bg-orange-50/40 border-orange-200/60' 
                      : 'bg-indigo-50/40 border-indigo-200/60'
                  }`}>
                    <div className={`rounded-xl h-9 w-9 flex items-center justify-center font-black text-sm shadow-sm font-display text-white ${
                      currentRole === 'Admin' ? 'bg-[#FF6321]' : 'bg-indigo-600'
                    }`}>
                      {currentRole[0]}
                    </div>
                    <div>
                      <p className="text-xs font-black text-neutral-800 tracking-tight font-display">{currentRole} Mode</p>
                      <span className={`text-[8px] font-extrabold uppercase tracking-widest font-display block ${
                        currentRole === 'Admin' ? 'text-orange-600' : 'text-indigo-600'
                      }`}>
                        {currentRole === 'Admin' ? '● Administrator' : '● Dispatch Staff'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Navigation links */}
                <nav className="flex flex-col gap-1.5 overflow-y-auto max-h-[calc(100vh-220px)] pr-1">
                  {[
                    { id: 'dashboard', label: 'Dashboard', icon: <TrendingUp className="h-4 w-4" /> },
                    { id: 'ai-copilot', label: 'AI Command Copilot', icon: <Sparkles className="h-4 w-4 text-orange-500 animate-pulse" /> },
                    { id: 'orders', label: 'Live Orders', icon: <ShoppingBag className="h-4 w-4" /> },
                    { id: 'runners', label: 'Delivery Runners', icon: <Truck className="h-4 w-4" /> },
                    { id: 'vendors', label: 'Town Vendors', icon: <Store className="h-4 w-4" /> },
                    { id: 'customers', label: 'Customers Log', icon: <Users className="h-4 w-4" /> },
                    { id: 'purchases', label: 'Purchase Ledger', icon: <FileText className="h-4 w-4" /> },
                    { id: 'analytics', label: 'Analytics Insights', icon: <BarChart2 className="h-4 w-4" /> },
                    { id: 'reports', label: 'Reports Hub', icon: <Download className="h-4 w-4" /> },
                    { id: 'builder', label: 'Codeless Builder', icon: <Wrench className="h-4 w-4 text-orange-500 animate-pulse" /> },
                    { id: 'offers', label: 'Promo Offers', icon: <Megaphone className="h-4 w-4 text-emerald-500 animate-pulse" /> },
                    { id: 'google-workspace', label: 'Google Workspace', icon: <Cloud className="h-4 w-4 text-orange-500 animate-pulse" /> },
                    { id: 'settings', label: 'Service Settings', icon: <Settings className="h-4 w-4" /> },
                  ].map((tab) => {
                    // Hide advanced, administrative and financial views for staff
                    if (currentRole === 'Staff' && (
                      tab.id === 'ai-copilot' || 
                      tab.id === 'purchases' || 
                      tab.id === 'analytics' || 
                      tab.id === 'reports' || 
                      tab.id === 'settings' ||
                      tab.id === 'builder' ||
                      tab.id === 'offers' ||
                      tab.id === 'google-workspace'
                    )) {
                      return null;
                    }
                    const isSelected = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id as any);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 rounded-2xl text-xs font-bold tracking-wide transition flex items-center gap-2.5 cursor-pointer shrink-0 ${
                          isSelected
                            ? currentRole === 'Admin'
                              ? 'bg-[#FF6321] text-white shadow-md shadow-orange-500/15'
                              : 'bg-indigo-600 text-white shadow-md shadow-indigo-500/15'
                            : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900'
                        }`}
                      >
                        {tab.icon}
                        <span className="font-display">{tab.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Drawer Logout */}
              <div className="pt-4 border-t border-neutral-100">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full text-left px-4 py-2.5 rounded-2xl text-xs font-bold tracking-wide text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition flex items-center gap-2.5 cursor-pointer font-display uppercase"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Secure LogOut</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* DESKTOP SIDEBAR NAVIGATION */}
      <aside className="hidden md:flex md:w-64 bg-white border-r border-neutral-200 p-5 space-y-6 no-print flex-col justify-between shrink-0 h-[calc(100vh-64px)] sticky top-16 overflow-y-auto">
        <div className="space-y-6">
          <div className="pb-3 border-b border-neutral-100 flex items-center">
            <LocalXpressLogo className="h-8 max-w-[160px]" />
          </div>

          <div className="space-y-2">
            <span className="text-[9px] text-neutral-400 font-display tracking-widest uppercase font-extrabold block">Logged Session</span>
            <div className={`flex items-center gap-3 border p-3 rounded-2xl ${
              currentRole === 'Admin' 
                ? 'bg-orange-50/40 border-orange-200/60' 
                : 'bg-indigo-50/40 border-indigo-200/60'
            }`}>
              <div className={`rounded-xl h-9 w-9 flex items-center justify-center font-black text-sm shadow-sm font-display text-white ${
                currentRole === 'Admin' ? 'bg-[#FF6321]' : 'bg-indigo-600'
              }`}>
                {currentRole[0]}
              </div>
              <div>
                <p className="text-xs font-black text-neutral-800 tracking-tight font-display">{currentRole} Mode</p>
                <span className={`text-[8px] font-extrabold uppercase tracking-widest font-display block ${
                  currentRole === 'Admin' ? 'text-orange-600' : 'text-indigo-600'
                }`}>
                  {currentRole === 'Admin' ? '● Administrator' : '● Dispatch Staff'}
                </span>
              </div>
            </div>
          </div>

          <nav className="flex flex-col gap-1.5 pb-3 md:pb-0">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: <TrendingUp className="h-4 w-4" /> },
              { id: 'ai-copilot', label: 'AI Command Copilot', icon: <Sparkles className="h-4 w-4 text-orange-500 animate-pulse" /> },
              { id: 'orders', label: 'Live Orders', icon: <ShoppingBag className="h-4 w-4" /> },
              { id: 'runners', label: 'Delivery Runners', icon: <Truck className="h-4 w-4" /> },
              { id: 'vendors', label: 'Town Vendors', icon: <Store className="h-4 w-4" /> },
              { id: 'customers', label: 'Customers Log', icon: <Users className="h-4 w-4" /> },
              { id: 'purchases', label: 'Purchase Ledger', icon: <FileText className="h-4 w-4" /> },
              { id: 'analytics', label: 'Analytics Insights', icon: <BarChart2 className="h-4 w-4" /> },
              { id: 'reports', label: 'Reports Hub', icon: <Download className="h-4 w-4" /> },
              { id: 'builder', label: 'Codeless Builder', icon: <Wrench className="h-4 w-4 text-orange-500 animate-pulse" /> },
              { id: 'offers', label: 'Promo Offers', icon: <Megaphone className="h-4 w-4 text-emerald-500 animate-pulse" /> },
              { id: 'google-workspace', label: 'Google Workspace', icon: <Cloud className="h-4 w-4 text-orange-500 animate-pulse" /> },
              { id: 'settings', label: 'Service Settings', icon: <Settings className="h-4 w-4" /> },
            ].map((tab) => {
              // Hide advanced, administrative and financial views for staff
              if (currentRole === 'Staff' && (
                tab.id === 'ai-copilot' || 
                tab.id === 'purchases' || 
                tab.id === 'analytics' || 
                tab.id === 'reports' || 
                tab.id === 'settings' ||
                tab.id === 'builder' ||
                tab.id === 'offers' ||
                tab.id === 'google-workspace'
              )) {
                return null;
              }
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full text-left px-4 py-3 rounded-2xl text-xs font-bold tracking-wide transition flex items-center gap-2.5 cursor-pointer shrink-0 ${
                    isSelected
                      ? currentRole === 'Admin'
                        ? 'bg-[#FF6321] text-white shadow-md shadow-orange-500/15'
                        : 'bg-indigo-600 text-white shadow-md shadow-indigo-500/15'
                      : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900'
                  }`}
                >
                  {tab.icon}
                  <span className="font-display">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="pt-6 border-t border-neutral-100">
          <button
            onClick={onLogout}
            className="w-full text-left px-4 py-3 rounded-2xl text-xs font-bold tracking-wide text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition flex items-center gap-2.5 cursor-pointer font-display uppercase"
          >
            <LogOut className="h-4 w-4" />
            <span>Secure LogOut</span>
          </button>
        </div>
      </aside>

      {/* MAIN WORKSPACE CONTENT */}
      <main className="flex-1 p-5 md:p-8 space-y-6 overflow-x-hidden">
        {/* TOP STATUS BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-5 no-print">
          <div>
            <h2 className="font-display font-black text-2xl text-neutral-900 tracking-tight uppercase leading-none">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Workspace
            </h2>
            <p className="text-[10px] text-neutral-400 mt-1.5 uppercase font-display font-extrabold tracking-widest leading-none">
              Local Xpress Dispatch Control Unit
            </p>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="w-full pl-10 pr-12 py-2.5 bg-white border border-neutral-200 rounded-2xl text-xs text-neutral-900 placeholder-neutral-400 shadow-xs focus:outline-none focus:ring-2 focus:ring-[#FF6321] focus:border-transparent transition"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:block bg-neutral-100 text-neutral-450 border border-neutral-200/80 font-mono text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
              Ctrl+K
            </div>
          </div>
        </div>

        {/* --- PENDING ORDERS PERSISTENT DISPATCH BANNER --- */}
        {pendingOrdersList.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden bg-rose-50 border-2 border-rose-300 rounded-3xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-left shadow-lg shadow-rose-500/5 animate-pulse"
            style={{ animationDuration: '2.5s' }}
          >
            <div className="flex items-start gap-3.5">
              <div className="mt-1 md:mt-0 w-8 h-8 rounded-2xl bg-rose-600 flex items-center justify-center text-white shrink-0 animate-bounce" style={{ animationDuration: '2s' }}>
                <ShieldAlert className="h-4.5 w-4.5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-display font-black text-xs text-neutral-950 uppercase tracking-wider">
                    DISPATCH UNIT URGENT ALERT: {pendingOrdersList.length} PENDING {pendingOrdersList.length === 1 ? 'ORDER' : 'ORDERS'}
                  </h4>
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                </div>
                <p className="text-[11px] text-neutral-700 mt-1 max-w-2xl font-medium">
                  Logistics run is bottlenecked. There {pendingOrdersList.length === 1 ? 'is 1 incoming order' : `are ${pendingOrdersList.length} incoming orders`} awaiting manual dispatching. Change the status to <strong>Confirmed</strong> to initiate sourcing and delivery.
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
              <button
                onClick={() => {
                  setActiveTab('orders');
                  setStatusFilter('Pending');
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold px-3.5 py-2 rounded-xl text-[11px] flex items-center gap-1.5 transition duration-200 shadow-md shadow-rose-500/10 active:scale-98 cursor-pointer uppercase tracking-wider font-display"
              >
                <Clock className="h-3.5 w-3.5 animate-spin" style={{ animationDuration: '4s' }} /> Manage Pending
              </button>
            </div>
          </motion.div>
        )}

        {/* --- 1. DASHBOARD OVERVIEW --- */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Today's Orders */}
              <div className="bg-white border border-neutral-200 p-6 rounded-3xl shadow-xs flex flex-col justify-between transition-all hover:border-neutral-300">
                <div className="flex justify-between items-start text-neutral-400">
                  <span className="text-[10px] font-display font-extrabold tracking-wider uppercase">Today's Orders</span>
                  <div className="w-7 h-7 bg-orange-50 rounded-lg flex items-center justify-center text-[#FF6321]">
                    <ShoppingBag className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex items-end justify-between mt-4">
                  <h2 className="text-2xl md:text-3xl font-display font-black text-neutral-900">
                    {stats.todayCount}
                  </h2>
                  <span className="text-[10px] font-mono font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-md">
                    +100% Sync
                  </span>
                </div>
                <p className="text-[10px] text-neutral-400 font-mono tracking-tight mt-2">Active checkout pipeline</p>
              </div>

              {/* Card 2: Pending Runs / Orders */}
              <div className="bg-white border border-neutral-200 p-6 rounded-3xl shadow-xs flex flex-col justify-between transition-all hover:border-neutral-300">
                <div className="flex justify-between items-start text-neutral-400">
                  <span className="text-[10px] font-display font-extrabold tracking-wider uppercase">Pending Runs</span>
                  <div className="w-7 h-7 bg-amber-50 rounded-lg flex items-center justify-center text-amber-500">
                    <Clock className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex items-end justify-between mt-4">
                  <h2 className="text-2xl md:text-3xl font-display font-black text-amber-600">
                    {stats.pendingCount}
                  </h2>
                  <div className="flex -space-x-1.5">
                    <div className="w-5 h-5 rounded-full bg-[#FF6321] border-2 border-white text-[8px] font-bold text-white flex items-center justify-center">L</div>
                    <div className="w-5 h-5 rounded-full bg-neutral-900 border-2 border-white text-[8px] font-bold text-white flex items-center justify-center">X</div>
                  </div>
                </div>
                <p className="text-[10px] text-neutral-400 font-mono tracking-tight mt-2">Awaiting merchant collection</p>
              </div>

              {currentRole === 'Admin' ? (
                <>
                  {/* Card 3: Total Revenue - styled in beautiful LX Brand Orange */}
                  <div className="bg-[#FF6321] text-white p-6 rounded-3xl shadow-md flex flex-col justify-between transition-all hover:opacity-95">
                    <div className="flex justify-between items-start text-orange-200">
                      <span className="text-[10px] font-display font-extrabold tracking-wider uppercase">Total Revenue</span>
                      <DollarSign className="h-4.5 w-4.5 text-white" />
                    </div>
                    <div className="flex items-end justify-between mt-4">
                      <h2 className="text-2xl md:text-3xl font-display font-black text-white">
                        ₹{stats.revenue}
                      </h2>
                      <span className="text-[9px] font-display font-extrabold bg-white/20 px-2 py-0.5 rounded-md text-white">
                        Net Flow
                      </span>
                    </div>
                    <p className="text-[10px] text-orange-100 font-mono tracking-tight mt-2">100% Customer settlements</p>
                  </div>

                  {/* Card 4: Estimated Profit - styled in Charcoal Gray-900 */}
                  <div className="bg-neutral-900 text-white p-6 rounded-3xl shadow-sm flex flex-col justify-between transition-all hover:bg-neutral-850">
                    <div className="flex justify-between items-start text-neutral-400">
                      <span className="text-[10px] font-display font-extrabold tracking-wider uppercase">Estimated Profit</span>
                      <TrendingUp className="h-4.5 w-4.5 text-emerald-400" />
                    </div>
                    <div className="flex items-end justify-between mt-4">
                      <h2 className="text-2xl md:text-3xl font-display font-black text-emerald-400">
                        ₹{stats.profit}
                      </h2>
                      <span className="text-[9px] font-mono text-neutral-400">
                        15% margin+del
                      </span>
                    </div>
                    <p className="text-[10px] text-neutral-500 font-mono tracking-tight mt-2">Net dispatcher margins</p>
                  </div>
                </>
              ) : (
                <>
                  {/* Staff Card 3: Delivered Runs - styled in beautiful LX Brand Orange */}
                  <div className="bg-[#FF6321] text-white p-6 rounded-3xl shadow-md flex flex-col justify-between transition-all hover:opacity-95">
                    <div className="flex justify-between items-start text-orange-200">
                      <span className="text-[10px] font-display font-extrabold tracking-wider uppercase">Delivered Runs</span>
                      <CheckCircle className="h-4.5 w-4.5 text-white" />
                    </div>
                    <div className="flex items-end justify-between mt-4">
                      <h2 className="text-2xl md:text-3xl font-display font-black text-white">
                        {stats.deliveredCount}
                      </h2>
                      <span className="text-[9px] font-display font-extrabold bg-white/20 px-2 py-0.5 rounded-md text-white">
                        Success
                      </span>
                    </div>
                    <p className="text-[10px] text-orange-100 font-mono tracking-tight mt-2">Total drops completed</p>
                  </div>

                  {/* Staff Card 4: Shops Registered - styled in Charcoal Gray-900 */}
                  <div className="bg-neutral-900 text-white p-6 rounded-3xl shadow-sm flex flex-col justify-between transition-all hover:bg-neutral-850">
                    <div className="flex justify-between items-start text-neutral-400">
                      <span className="text-[10px] font-display font-extrabold tracking-wider uppercase">Shops Registered</span>
                      <Store className="h-4.5 w-4.5 text-orange-400" />
                    </div>
                    <div className="flex items-end justify-between mt-4">
                      <h2 className="text-2xl md:text-3xl font-display font-black text-white">
                        {stats.totalVendors}
                      </h2>
                      <span className="text-[9px] font-mono text-neutral-400">
                        Active Maps
                      </span>
                    </div>
                    <p className="text-[10px] text-neutral-500 font-mono tracking-tight mt-2">Configured local merchants</p>
                  </div>
                </>
              )}
            </div>

            {/* Quick Actions & Recent Activity layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Live Dispatch Feed */}
              <div className="lg:col-span-8 bg-white border border-neutral-200 rounded-3xl p-6 space-y-5 text-left shadow-xs">
                <div className="flex justify-between items-center">
                  <h3 className="font-display font-black text-sm text-neutral-900 uppercase tracking-tight">Live Pending Dispatch Board</h3>
                  <span className="bg-orange-50 border border-orange-200 text-[#FF6321] text-[9px] px-3 py-0.5 rounded-full font-display font-extrabold tracking-wider uppercase animate-pulse">
                    REAL-TIME SYNC
                  </span>
                </div>

                <div className="divide-y divide-neutral-100">
                  {ordersLoading ? (
                    Array.from({ length: 4 }).map((_, idx) => (
                      <div 
                        key={`dashboard-order-skeleton-${idx}`}
                        className="py-3.5 flex flex-col sm:flex-row justify-between sm:items-center gap-3 animate-pulse"
                      >
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <div className="h-4 bg-neutral-200 rounded-md w-16" />
                            <div className="h-3 bg-neutral-100 rounded-md w-12" />
                            <div className="h-4 bg-neutral-100 rounded-md w-24" />
                          </div>
                          <div className="h-3 bg-neutral-200 rounded-md w-2/3" />
                          <div className="h-2.5 bg-neutral-100 rounded-sm w-3/4" />
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="h-8 bg-neutral-100 rounded-xl w-24" />
                          <div className="h-8 bg-neutral-100 rounded-xl w-8" />
                        </div>
                      </div>
                    ))
                  ) : (
                    <>
                      <AnimatePresence initial={false}>
                        {orders.filter(o => o.status !== 'Delivered').slice(0, 4).map((o) => (
                          <motion.div
                            key={o.id}
                            layout
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="py-3.5 flex flex-col sm:flex-row justify-between sm:items-center gap-3"
                          >
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-mono font-black text-[#FF6321]">{o.id}</span>
                              <span className="text-[10px] text-neutral-400 font-mono">{o.time}</span>
                              <span className="bg-neutral-100 text-neutral-600 border border-neutral-200 text-[9px] font-display font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                                {o.customerDetails.area}
                              </span>
                            </div>
                            <p className="text-xs font-bold text-neutral-800 mt-1">
                              {o.customerDetails.name} • <span className="text-neutral-500 font-mono font-semibold">{o.customerDetails.mobile}</span>
                            </p>
                            <p className="text-[11px] text-neutral-400 line-clamp-1 mt-0.5">
                              {o.items.map(i => `${i.product.name} x${i.quantity}`).join(', ')}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <select
                              value={o.status}
                              onChange={(e) => onUpdateOrderStatus(o.id, e.target.value as OrderStatus)}
                              className="bg-white border border-neutral-200 text-neutral-700 text-xs px-2.5 py-1.5 rounded-xl font-medium focus:outline-none focus:ring-1 focus:ring-[#FF6321] focus:border-[#FF6321] shadow-xs cursor-pointer"
                            >
                              <option value="Pending">Pending</option>
                              <option value="Confirmed">Confirmed</option>
                              <option value="Purchased">Purchased</option>
                              <option value="Out For Delivery">Out For Delivery</option>
                              <option value="Delivered">Delivered</option>
                            </select>
                            <button
                              onClick={() => handlePrintOrder(o)}
                              className="p-2 bg-neutral-50 border border-neutral-200 hover:bg-neutral-100 rounded-xl text-neutral-500 hover:text-neutral-800 transition cursor-pointer shadow-xs"
                              title="Print Receipt"
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      {!ordersLoading && orders.filter(o => o.status !== 'Delivered').length === 0 && (
                        <div className="py-8 text-center text-xs text-neutral-400 italic font-mono">
                          🎉 All deliveries completed. Nice work pilot!
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Sidebar Cards Stack */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Staff Bulletin & Internal Messaging */}
                <div className="bg-white border border-neutral-200 rounded-3xl p-6 space-y-5 text-left shadow-xs flex flex-col">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-orange-50 rounded-xl text-[#FF6321]">
                        <Megaphone className="h-4 w-4 animate-bounce" />
                      </div>
                      <h3 className="font-display font-black text-sm text-neutral-900 uppercase tracking-tight">Staff Bulletin</h3>
                    </div>
                    <span className="bg-neutral-100 border border-neutral-200 text-neutral-600 text-[8px] px-2.5 py-0.5 rounded-full font-mono font-bold">
                      {broadcasts.length} Messages
                    </span>
                  </div>

                  {/* Broadcast List */}
                  <div className="space-y-3.5 max-h-64 overflow-y-auto pr-1">
                    {broadcasts.length === 0 ? (
                      <div className="py-8 text-center text-xs text-neutral-400 italic font-mono">
                        No active announcements.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {broadcasts.map((b) => (
                          <div 
                            key={b.id} 
                            className={`p-3.5 rounded-2xl border transition-all ${
                              b.type === 'urgent' 
                                ? 'bg-rose-50/50 border-rose-100 dark:bg-rose-950/5' 
                                : b.type === 'warning' 
                                ? 'bg-amber-50/40 border-amber-100 dark:bg-amber-950/5' 
                                : 'bg-neutral-50/70 border-neutral-150'
                            }`}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <span className={`text-[8px] font-display font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                                b.type === 'urgent'
                                  ? 'bg-rose-100 text-rose-700'
                                  : b.type === 'warning'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}>
                                {b.type}
                              </span>
                              
                              {currentRole === 'Admin' && (
                                <button
                                  onClick={() => handleDeleteBroadcast(b.id)}
                                  className="text-neutral-400 hover:text-rose-600 transition p-0.5 rounded-md hover:bg-rose-50 cursor-pointer"
                                  title="Remove Bulletin"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>

                            <h4 className="text-xs font-black text-neutral-800 mt-2">{b.title}</h4>
                            <p className="text-[11px] text-neutral-600 mt-1 leading-relaxed whitespace-pre-line">{b.message}</p>
                            
                            <div className="flex items-center gap-1.5 mt-2.5 text-[9px] text-neutral-400 font-mono">
                              <Clock className="h-2.5 w-2.5" />
                              <span>{new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • by {b.senderName}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Broadcast Compose Form (For Admins Only) */}
                  {currentRole === 'Admin' && (
                    <div className="pt-4 border-t border-neutral-100 space-y-3">
                      <div className="bg-neutral-50 p-3 rounded-2xl border border-neutral-100">
                        <span className="text-[9px] font-display font-extrabold tracking-wider text-neutral-400 uppercase">
                          New Broadcast Creator
                        </span>
                        
                        <form onSubmit={handleBroadcastSubmit} className="space-y-2.5 mt-2">
                          <div>
                            <input
                              type="text"
                              value={bTitle}
                              onChange={(e) => setBTitle(e.target.value)}
                              placeholder="Announcement Title"
                              className="w-full bg-white border border-neutral-200 text-xs px-3 py-2 rounded-xl text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-[#FF6321]"
                            />
                          </div>

                          <div>
                            <textarea
                              value={bMessage}
                              onChange={(e) => setBMessage(e.target.value)}
                              placeholder="Type instructions/updates for staff..."
                              rows={2}
                              className="w-full bg-white border border-neutral-200 text-xs px-3 py-2 rounded-xl text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-[#FF6321] resize-none"
                            />
                          </div>

                          <div className="flex items-center justify-between gap-2.5">
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-[9px] text-neutral-400 font-mono">Severity:</span>
                              <select
                                value={bType}
                                onChange={(e) => setBType(e.target.value as 'info' | 'warning' | 'urgent')}
                                className="bg-white border border-neutral-200 text-[10px] px-2 py-1 rounded-lg text-neutral-700 font-medium focus:outline-none focus:ring-1 focus:ring-[#FF6321] cursor-pointer"
                              >
                                <option value="info">Info</option>
                                <option value="warning">Warning</option>
                                <option value="urgent">Urgent</option>
                              </select>
                            </div>

                            <button
                              type="submit"
                              disabled={isSendingB}
                              className="bg-neutral-900 text-white hover:bg-[#FF6321] disabled:opacity-50 transition-all text-[10px] font-display font-extrabold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
                            >
                              {isSendingB ? (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                              ) : (
                                <Send className="h-3 w-3" />
                              )}
                              <span>Publish</span>
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
                </div>

                {/* Hyperlocal Guidelines */}
                <div className="bg-white border border-neutral-200 rounded-3xl p-6 space-y-5 text-left shadow-xs">
                  <h3 className="font-display font-black text-sm text-neutral-900 uppercase tracking-tight">Hyperlocal Guidelines</h3>
                  <div className="space-y-4 text-xs text-neutral-600 leading-relaxed">
                    <div className="flex items-start gap-2.5">
                      <CheckCircle className="h-4.5 w-4.5 text-emerald-500 shrink-0 mt-0.5" />
                      <p>Verify third-party merchant cash payments immediately before leaving shop site.</p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <CheckCircle className="h-4.5 w-4.5 text-emerald-500 shrink-0 mt-0.5" />
                      <p>Log official purchase receipts and bill numbers in the Purchase module to keep net profits exact.</p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <CheckCircle className="h-4.5 w-4.5 text-emerald-500 shrink-0 mt-0.5" />
                      <p>Call the customer directly using the quick phone links below on delivery arrival.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- 2. LIVE ORDERS WORKSPACE --- */}
        {activeTab === 'orders' && (
          <div className="space-y-4 text-left">
            {/* --- SEARCH & STATUS FILTERS PANEL --- */}
            <div className="bg-white border border-neutral-200 rounded-3xl p-5 shadow-xs space-y-4">
              
              {/* Row 1: Search Input & Action Buttons */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                
                {/* Search bar */}
                <div className="relative flex-1 max-w-xl z-50">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-neutral-400">
                    <Search className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search by Customer Name, Mobile Number, or Order ID..."
                    value={advSearchQuery}
                    onChange={(e) => {
                      setAdvSearchQuery(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 250)}
                    className="w-full pl-10 pr-10 py-2.5 bg-neutral-50 hover:bg-neutral-100/50 focus:bg-white border border-neutral-200 focus:border-[#FF6321] rounded-2xl text-xs text-neutral-900 placeholder-neutral-450 focus:outline-none transition shadow-2xs"
                  />
                  {advSearchQuery && (
                    <button
                      onClick={() => {
                        setAdvSearchQuery('');
                        setShowSuggestions(false);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-1 rounded-full hover:bg-neutral-200/50 transition cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {/* Autocomplete Dropdown */}
                  <AnimatePresence>
                    {showSuggestions && advSearchSuggestions.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="absolute left-0 right-0 top-full mt-2 bg-white border border-neutral-200 rounded-2xl shadow-xl overflow-hidden z-50 text-xs divide-y divide-neutral-100 max-h-60 overflow-y-auto"
                      >
                        {advSearchSuggestions.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onMouseDown={() => {
                              setAdvSearchQuery(s.value);
                              setShowSuggestions(false);
                            }}
                            className="w-full text-left px-4 py-2.5 hover:bg-orange-50/50 transition flex items-center justify-between gap-2 cursor-pointer"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-neutral-50 border border-neutral-150">
                                {s.type === 'customer' && <User className="h-3.5 w-3.5 text-orange-500" />}
                                {s.type === 'mobile' && <Phone className="h-3.5 w-3.5 text-blue-500" />}
                                {s.type === 'item' && <ShoppingBag className="h-3.5 w-3.5 text-emerald-500" />}
                              </div>
                              <div>
                                <div className="font-semibold text-neutral-800">{s.label}</div>
                                {s.subtext && <div className="text-[9px] text-neutral-400 font-mono mt-0.5">{s.subtext}</div>}
                              </div>
                            </div>
                            <ChevronRight className="h-3.5 w-3.5 text-neutral-300" />
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 flex-wrap sm:self-end lg:self-auto shrink-0">
                  {/* Download CSV Button */}
                  <button
                    id="admin-download-csv-btn"
                    onClick={handleExportFilteredCSV}
                    className="bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition duration-200 border border-neutral-200/80 cursor-pointer font-display uppercase tracking-wider"
                    title="Export currently filtered list of orders to CSV"
                  >
                    <Download className="h-4 w-4" /> Download CSV ({filteredOrders.length})
                  </button>

                  {/* New Order Button */}
                  <button
                    id="admin-create-order-btn"
                    onClick={() => setQuickOrderModalOpen(true)}
                    className="bg-[#FF6321] hover:bg-orange-600 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition duration-200 shadow-md shadow-orange-500/10 hover:shadow-orange-500/20 active:scale-98 cursor-pointer font-display uppercase tracking-wider"
                    title="Create new order manually (Ctrl+N)"
                  >
                    <Plus className="h-4 w-4" /> New Order <span className="hidden lg:inline opacity-75 font-mono text-[9px] ml-1 bg-white/20 px-1 py-0.5 rounded">Ctrl+N</span>
                  </button>
                </div>
              </div>

              {/* Divider line */}
              <div className="h-px bg-neutral-150 w-full" />

              {/* Row 2: Dropdown Status filter & Pills */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-wrap">
                  
                  {/* Status Dropdown */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Filter className="h-4 w-4 text-neutral-500" />
                    <span className="text-xs font-bold text-neutral-700">Filter Status:</span>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="bg-neutral-50 hover:bg-neutral-100 border border-neutral-250 text-neutral-700 text-xs px-3 py-2 rounded-xl font-bold focus:outline-none focus:ring-1 focus:ring-[#FF6321] focus:border-transparent shadow-2xs cursor-pointer transition min-w-[160px]"
                    >
                      <option value="All">All Orders ({orderCountsByStatus.All})</option>
                      <option value="Pending">Pending ({orderCountsByStatus.Pending})</option>
                      <option value="In Progress">In Progress ({orderCountsByStatus['In Progress']})</option>
                      <option value="Confirmed">Confirmed ({orderCountsByStatus.Confirmed})</option>
                      <option value="Purchased">Purchased ({orderCountsByStatus.Purchased})</option>
                      <option value="Out For Delivery">Out For Delivery ({orderCountsByStatus['Out For Delivery']})</option>
                      <option value="Delivered">Delivered ({orderCountsByStatus.Delivered})</option>
                    </select>
                  </div>

                  {/* Status Pills */}
                  <div className="flex gap-1.5 flex-wrap items-center">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mr-1">Quick Filters:</span>
                    {['All', 'Pending', 'In Progress', 'Delivered'].map((st) => {
                      const count = st === 'All' 
                        ? orderCountsByStatus.All 
                        : st === 'Pending' 
                        ? orderCountsByStatus.Pending 
                        : st === 'In Progress' 
                        ? orderCountsByStatus['In Progress'] 
                        : orderCountsByStatus.Delivered;
                      return (
                        <button
                          key={st}
                          onClick={() => setStatusFilter(st)}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-black tracking-wider uppercase transition cursor-pointer shadow-3xs flex items-center gap-1.5 ${
                            statusFilter === st
                              ? 'bg-[#FF6321] text-white'
                              : 'bg-neutral-50 text-neutral-500 border border-neutral-200 hover:text-neutral-700 hover:bg-neutral-100/70'
                          }`}
                        >
                          <span>{st}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                            statusFilter === st
                              ? 'bg-white/20 text-white'
                              : 'bg-neutral-200/60 text-neutral-500'
                          }`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                </div>

                {/* Quick suggestion tags or search indicator */}
                <div className="hidden lg:flex items-center gap-1.5 text-[10px] text-neutral-400">
                  <span className="font-bold uppercase tracking-wider">Try:</span>
                  {['Amul', 'Bread', 'Amit'].map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        setAdvSearchQuery(t);
                        setShowSuggestions(true);
                      }}
                      className="bg-neutral-50 hover:bg-neutral-100 text-neutral-600 border border-neutral-200/80 px-2 py-0.5 rounded-lg cursor-pointer transition font-medium"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* --- BULK ACTIONS ACTION BAR --- */}
            <AnimatePresence>
              {selectedOrderIds.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  className="overflow-hidden"
                >
                  <div className="bg-orange-50 border border-orange-200 p-4 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 text-left shadow-xs">
                    <div className="flex items-center gap-3">
                      <span className="h-2 w-2 rounded-full bg-[#FF6321] animate-pulse" />
                      <span className="text-xs font-bold text-neutral-800">
                        {selectedOrderIds.length} {selectedOrderIds.length === 1 ? 'Order' : 'Orders'} Selected
                      </span>
                      <button
                        onClick={() => setSelectedOrderIds([])}
                        className="text-[10px] font-bold text-[#FF6321] hover:text-orange-600 underline cursor-pointer"
                      >
                        Deselect All
                      </button>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs font-semibold text-neutral-600">Bulk Update Status:</span>
                      <div className="flex items-center gap-2">
                        <select
                          id="bulk-status-select"
                          className="bg-white border border-neutral-300 text-neutral-700 text-xs px-2.5 py-1.5 rounded-xl font-medium focus:outline-none focus:ring-1 focus:ring-[#FF6321] focus:border-[#FF6321] shadow-xs cursor-pointer"
                          defaultValue=""
                          onChange={(e) => {
                            const val = e.target.value;
                            if (!val) return;
                            
                            const targetStatus = val as OrderStatus;
                            selectedOrderIds.forEach(id => {
                              onUpdateOrderStatus(id, targetStatus);
                            });
                            
                            showToast(`Dispatched bulk status update for ${selectedOrderIds.length} orders to '${targetStatus}'!`, 'success');
                            setSelectedOrderIds([]);
                            e.target.value = ""; // Reset select
                          }}
                        >
                          <option value="" disabled>Select Status...</option>
                          <option value="Pending">Pending</option>
                          <option value="Confirmed">Confirmed</option>
                          <option value="Purchased">Purchased</option>
                          <option value="Out For Delivery">Out For Delivery</option>
                          <option value="Delivered">Delivered</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-display font-extrabold uppercase tracking-widest text-[10px]">
                      <th className="p-4 w-10 text-center">
                        <input
                          type="checkbox"
                          id="bulk-select-all"
                          checked={filteredOrders.length > 0 && filteredOrders.every(o => selectedOrderIds.includes(o.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              const allFilteredIds = filteredOrders.map(o => o.id);
                              setSelectedOrderIds(prev => {
                                const newIds = [...prev];
                                allFilteredIds.forEach(id => {
                                  if (!newIds.includes(id)) newIds.push(id);
                                });
                                return newIds;
                              });
                            } else {
                              const allFilteredIds = filteredOrders.map(o => o.id);
                              setSelectedOrderIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
                            }
                          }}
                          className="rounded border-neutral-300 text-[#FF6321] focus:ring-[#FF6321] h-4 w-4 cursor-pointer"
                        />
                      </th>
                      <th className="p-4">Order Details</th>
                      <th className="p-4">Customer info</th>
                      <th className="p-4">Sourced Items</th>
                      <th className="p-4">Amount Billing</th>
                      <th className="p-4">Dispatch status</th>
                      <th className="p-4 text-center">Quick Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 text-neutral-700">
                    {ordersLoading ? (
                      Array.from({ length: 6 }).map((_, idx) => (
                        <tr key={`orders-table-skeleton-${idx}`} className="animate-pulse">
                          <td className="p-4 w-10 text-center">
                            <div className="h-4 w-4 bg-neutral-200 rounded mx-auto" />
                          </td>
                          <td className="p-4">
                            <div className="h-4 bg-neutral-200 rounded w-20 mb-2" />
                            <div className="h-3 bg-neutral-100 rounded w-28" />
                          </td>
                          <td className="p-4">
                            <div className="h-4 bg-neutral-200 rounded w-32 mb-2" />
                            <div className="h-3 bg-neutral-100 rounded w-24" />
                          </td>
                          <td className="p-4">
                            <div className="h-3 bg-neutral-150 rounded w-40 mb-1.5" />
                            <div className="h-3 bg-neutral-100 rounded w-32" />
                          </td>
                          <td className="p-4">
                            <div className="h-4 bg-neutral-200 rounded w-16 mb-2" />
                            <div className="h-3 bg-neutral-100 rounded w-20" />
                          </td>
                          <td className="p-4">
                            <div className="h-7 bg-neutral-150 rounded-xl w-28" />
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex justify-center gap-1.5">
                              <div className="h-8 w-8 bg-neutral-150 rounded-xl animate-pulse" />
                              <div className="h-8 w-8 bg-neutral-150 rounded-xl animate-pulse" />
                              <div className="h-8 w-8 bg-neutral-150 rounded-xl animate-pulse" />
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <AnimatePresence initial={false}>
                        {filteredOrders.map((o) => (
                        <motion.tr
                          key={o.id}
                          layout
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className={`hover:bg-neutral-50/40 transition ${selectedOrderIds.includes(o.id) ? 'bg-orange-50/20' : ''}`}
                        >
                        <td className="p-4 w-10 text-center">
                          <input
                            type="checkbox"
                            id={`select-order-${o.id}`}
                            checked={selectedOrderIds.includes(o.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedOrderIds(prev => [...prev, o.id]);
                              } else {
                                setSelectedOrderIds(prev => prev.filter(id => id !== o.id));
                              }
                            }}
                            className="rounded border-neutral-300 text-[#FF6321] focus:ring-[#FF6321] h-4 w-4 cursor-pointer"
                          />
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => setViewingOrderDetail(o)}
                            className="font-mono font-black text-[#FF6321] hover:underline cursor-pointer block text-left"
                            title="Click to view interactive progress timeline & assign runner"
                          >
                            {o.id}
                          </button>
                          <div className="text-[10px] text-neutral-400 font-mono mt-0.5">{o.date} • {o.time}</div>
                          {o.runnerName && (
                            <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-100/60 rounded-md px-1.5 py-0.5 mt-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              👤 {o.runnerName}
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-neutral-800">{o.customerDetails.name}</div>
                          <div className="text-[11px] text-neutral-500 font-mono">{o.customerDetails.mobile}</div>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                              `${o.customerDetails.address}, ${o.customerDetails.landmark || ''}, ${o.customerDetails.area || ''}`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-[#FF6321] hover:underline flex items-center gap-1 mt-1 font-semibold group"
                            title="Click to search address on Google Maps"
                          >
                            <MapPin className="h-3.5 w-3.5 text-neutral-400 group-hover:text-[#FF6321] shrink-0" />
                            <span className="truncate max-w-[180px]">{o.customerDetails.address}</span>
                          </a>
                        </td>
                        <td className="p-4 max-w-xs">
                          <div className="leading-relaxed font-medium">
                            {o.items.map(item => `${item.product.name} (x${item.quantity})`).join(', ')}
                          </div>
                          {o.customerDetails.instructions && (
                            <div className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/50 mt-1 font-medium inline-block">
                              💡 {o.customerDetails.instructions}
                            </div>
                          )}
                          {(o.customerNotes || o.customerDetails.customerNotes) && (
                            <div className="text-[10px] text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-200/50 mt-1 font-medium inline-block ml-1">
                              📝 {o.customerNotes || o.customerDetails.customerNotes}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="font-black text-neutral-900 text-sm">₹{o.totalAmount}</div>
                          <div className="text-[10px] text-neutral-400">Items: ₹{o.estimatedAmount} • Del: ₹{o.deliveryCharge}</div>
                          <div className="text-[9px] bg-neutral-100 border border-neutral-200 rounded-md text-center w-fit px-1.5 py-0.5 font-display font-bold text-neutral-500 mt-1 uppercase tracking-wider">
                            {o.customerDetails.paymentMethod}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span 
                              className={`h-2.5 w-2.5 rounded-full shrink-0 animate-pulse transition-all duration-300 ${
                                o.status === 'Pending' 
                                  ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]' 
                                  : o.status === 'Delivered'
                                  ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]'
                                  : 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]'
                              }`}
                              title={
                                o.status === 'Pending' 
                                  ? 'Pending' 
                                  : o.status === 'Delivered' 
                                  ? 'Delivered' 
                                  : 'Processing'
                              }
                            />
                            <select
                              value={o.status}
                              onChange={(e) => onUpdateOrderStatus(o.id, e.target.value as OrderStatus)}
                              className="bg-white border border-neutral-200 text-neutral-700 text-xs px-2.5 py-1.5 rounded-xl font-semibold focus:outline-none focus:ring-1 focus:ring-[#FF6321] focus:border-[#FF6321] shadow-xs cursor-pointer"
                            >
                              <option value="Pending">Pending</option>
                              <option value="Confirmed">Confirmed</option>
                              <option value="Purchased">Purchased</option>
                              <option value="Out For Delivery">Out For Delivery</option>
                              <option value="Delivered">Delivered</option>
                            </select>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-1.5">
                            {o.status === 'Confirmed' && (
                              <button
                                onClick={() => handleOpenPurchaseForm(o)}
                                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
                                title="Log Merchant Bill"
                              >
                                Log Bill
                              </button>
                            )}
                            <a
                              href={`tel:${o.customerDetails.mobile}`}
                              className="p-2 bg-neutral-50 border border-neutral-200 hover:bg-neutral-100 rounded-xl text-neutral-500 hover:text-neutral-800 transition shadow-xs"
                              title="Call Customer"
                            >
                              <Phone className="h-3.5 w-3.5" />
                            </a>
                            <a
                              href={getWhatsAppInvoiceUrl(o)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 bg-neutral-50 border border-neutral-200 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 rounded-xl text-neutral-500 transition shadow-xs"
                              title="Send WhatsApp Invoice Link"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                            </a>
                            <button
                              onClick={() => setViewingOrderDetail(o)}
                              className="p-2 bg-neutral-50 border border-neutral-200 hover:bg-neutral-100 rounded-xl text-neutral-500 hover:text-neutral-800 transition cursor-pointer shadow-xs"
                              title="View Order Progress Timeline"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handlePrintOrder(o)}
                              className="p-2 bg-neutral-50 border border-neutral-200 hover:bg-neutral-100 rounded-xl text-neutral-500 hover:text-neutral-800 transition cursor-pointer shadow-xs"
                              title="Print Invoice"
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </button>
                        </div>
                      </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                    )}
                  </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

        {/* --- DELIVERY RUNNERS TAB --- */}
        {activeTab === 'runners' && (
          <div className="space-y-6 text-left">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="font-display font-black text-lg text-neutral-800 uppercase tracking-tight">Delivery Runner Workspace</h3>
                <p className="text-xs text-neutral-400 font-mono">Manage field delivery staff, track real-time assignment, and dispatch workloads</p>
              </div>
              <button
                onClick={() => {
                  setEditingRunner(null);
                  setRName('');
                  setRMobile('');
                  setRStatus('Active');
                  setRunnerModalOpen(true);
                }}
                className="bg-[#FF6321] hover:bg-orange-600 text-white text-xs font-bold py-2 px-4 rounded-xl shadow-md shadow-orange-500/10 transition flex items-center gap-1.5 cursor-pointer font-display uppercase tracking-wider"
              >
                <Plus className="h-4 w-4" /> Add Delivery Runner
              </button>
            </div>

            {/* Metrics Dashboard for Runners */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border border-neutral-200 p-4 rounded-2xl shadow-xs flex items-center gap-3">
                <div className="p-3 rounded-xl bg-orange-50 text-[#FF6321]">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Total Fleet</p>
                  <p className="text-base font-black text-neutral-800 font-sans">{runners.length}</p>
                </div>
              </div>

              <div className="bg-white border border-neutral-200 p-4 rounded-2xl shadow-xs flex items-center gap-3">
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <div>
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Active Now</p>
                  <p className="text-base font-black text-neutral-800 font-sans">
                    {runners.filter(r => r.status === 'Active').length}
                  </p>
                </div>
              </div>

              <div className="bg-white border border-neutral-200 p-4 rounded-2xl shadow-xs flex items-center gap-3">
                <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
                  <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                </div>
                <div>
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">On Deliveries</p>
                  <p className="text-base font-black text-neutral-800 font-sans">
                    {runners.filter(r => r.status === 'On Delivery').length}
                  </p>
                </div>
              </div>

              <div className="bg-white border border-neutral-200 p-4 rounded-2xl shadow-xs flex items-center gap-3">
                <div className="p-3 rounded-xl bg-neutral-100 text-neutral-500">
                  <div className="h-2 w-2 rounded-full bg-neutral-400" />
                </div>
                <div>
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Offline</p>
                  <p className="text-base font-black text-neutral-800 font-sans">
                    {runners.filter(r => r.status === 'Offline').length}
                  </p>
                </div>
              </div>
            </div>

            {/* Runners Table */}
            <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-xs">
              <div className="p-5 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/40">
                <span className="text-[10px] font-display uppercase tracking-wider font-extrabold text-neutral-500">Runner Directory Listing</span>
                <span className="text-[10px] text-neutral-400 font-mono">Sync state: Connected Real-time</span>
              </div>

              {runners.length === 0 ? (
                <div className="p-10 text-center text-neutral-500 space-y-2">
                  <Truck className="h-8 w-8 text-neutral-300 mx-auto animate-bounce" />
                  <p className="text-xs font-semibold">No active delivery runners registered.</p>
                  <p className="text-[10px] text-neutral-400">Add a runner to enable local dispatch assignment.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-neutral-50 border-b border-neutral-100 text-neutral-400 font-mono text-[10px] uppercase font-bold">
                        <th className="py-3.5 px-5">Runner ID</th>
                        <th className="py-3.5 px-5">Runner Name</th>
                        <th className="py-3.5 px-5">Mobile Contact</th>
                        <th className="py-3.5 px-5">Real-time Status</th>
                        <th className="py-3.5 px-5 text-center">Active Workload</th>
                        <th className="py-3.5 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {runners.map((runner) => {
                        // Count actual active orders for this runner
                        const runnerActiveOrders = orders.filter(o => 
                          o.runnerId === runner.id && 
                          (o.status === 'Confirmed' || o.status === 'Purchased' || o.status === 'Out For Delivery')
                        ).length;

                        return (
                          <tr key={runner.id} className="hover:bg-neutral-50/50 transition">
                            <td className="py-4 px-5 font-mono text-[10px] font-bold text-neutral-400">
                              #{runner.id}
                            </td>
                            <td className="py-4 px-5">
                              <div className="flex items-center gap-2.5">
                                <div className="h-8 w-8 rounded-xl bg-[#FF6321]/10 text-[#FF6321] font-display font-black flex items-center justify-center text-xs">
                                  {runner.name.charAt(0)}
                                </div>
                                <div>
                                  <span className="font-bold text-neutral-800 block">{runner.name}</span>
                                  <span className="text-[9px] text-neutral-400 block font-mono">Local Agent</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-5 font-mono text-neutral-600">
                              <a href={`tel:${runner.mobile}`} className="flex items-center gap-1.5 hover:text-[#FF6321] transition">
                                <Phone className="h-3 w-3" />
                                {runner.mobile}
                              </a>
                            </td>
                            <td className="py-4 px-5">
                              <select
                                value={runner.status}
                                onChange={async (e) => {
                                  const newStatus = e.target.value as any;
                                  if (onSaveRunner) {
                                    await onSaveRunner({ ...runner, status: newStatus });
                                    showToast(`Runner ${runner.name} status set to ${newStatus}`, 'success');
                                  }
                                }}
                                className={`text-[11px] font-bold rounded-xl px-2.5 py-1 border focus:outline-none cursor-pointer ${
                                  runner.status === 'Active'
                                    ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                                    : runner.status === 'On Delivery'
                                      ? 'bg-amber-50 border-amber-100 text-amber-700'
                                      : 'bg-neutral-100 border-neutral-200 text-neutral-500'
                                }`}
                              >
                                <option value="Active">🟢 Active (Available)</option>
                                <option value="On Delivery">🟡 On Delivery (Dispatched)</option>
                                <option value="Offline">⚫ Offline (Away)</option>
                              </select>
                            </td>
                            <td className="py-4 px-5 text-center">
                              <span className={`inline-flex items-center justify-center font-mono font-bold text-[11px] h-6 px-2 rounded-lg ${
                                runnerActiveOrders > 0
                                  ? 'bg-orange-50 text-[#FF6321] font-black'
                                  : 'bg-neutral-50 text-neutral-400'
                              }`}>
                                {runnerActiveOrders} active
                              </span>
                            </td>
                            <td className="py-4 px-5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setEditingRunner(runner);
                                    setRName(runner.name);
                                    setRMobile(runner.mobile);
                                    setRStatus(runner.status);
                                    setRunnerModalOpen(true);
                                  }}
                                  className="p-1.5 text-neutral-400 hover:text-neutral-800 transition hover:bg-neutral-100 rounded-lg cursor-pointer"
                                  title="Edit Runner"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </button>
                                {currentRole === 'Admin' && (
                                  <button
                                    onClick={async () => {
                                      if (confirm(`Are you sure you want to remove delivery runner ${runner.name}?`)) {
                                        if (onDeleteRunner) {
                                          await onDeleteRunner(runner.id);
                                          showToast(`Runner ${runner.name} removed successfully`, 'success');
                                        }
                                      }
                                    }}
                                    className="p-1.5 text-neutral-400 hover:text-red-600 transition hover:bg-red-50 rounded-lg cursor-pointer"
                                    title="Delete Runner"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- 3. VENDOR / SHOP DIRECTORY --- */}
        {activeTab === 'vendors' && (
          <div className="space-y-4 text-left">
            <div className="flex justify-between items-center">
              <p className="text-xs text-neutral-400 font-mono">Third-party shop mapping ledger</p>
              {currentRole === 'Admin' && (
                <button
                  onClick={openAddVendor}
                  className="bg-[#FF6321] hover:bg-orange-600 text-white text-xs font-bold py-2 px-4 rounded-xl shadow-md shadow-orange-500/10 transition flex items-center gap-1.5 cursor-pointer font-display uppercase tracking-wider"
                >
                  <Plus className="h-4 w-4" /> Add Town Shop
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {filteredVendors.map((v) => (
                <div key={v.id} className="bg-white border border-neutral-200 rounded-3xl p-6 space-y-4 shadow-xs transition hover:border-neutral-300">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="bg-orange-50 text-[#FF6321] text-[9px] font-display font-extrabold px-2.5 py-1 rounded-md uppercase border border-orange-200 tracking-wider">
                        {v.category}
                      </span>
                      <h4 className="font-display font-black text-base text-neutral-900 mt-2.5 leading-tight">{v.shopName}</h4>
                      <p className="text-[10px] text-neutral-400 font-mono mt-0.5">ID: {v.id}</p>
                    </div>
                    <span className={`h-2.5 w-2.5 rounded-full ${v.status === 'Active' ? 'bg-emerald-500' : 'bg-neutral-300'}`} />
                  </div>

                  <div className="space-y-2 text-xs text-neutral-600 pt-3 border-t border-neutral-100 leading-relaxed font-medium">
                    <p>👤 Owner: <span className="text-neutral-800 font-bold">{v.ownerName}</span></p>
                    <p>📞 Phone: <span className="text-neutral-800 font-mono font-bold">{v.mobile}</span></p>
                    <p>📍 Address: <span className="text-neutral-500 font-medium">{v.address}</span></p>
                    <p>🕒 Timings: <span className="text-neutral-800 font-mono font-bold">{v.openingTime} - {v.closingTime}</span></p>
                  </div>

                  {currentRole === 'Admin' && (
                    <div className="flex gap-2 pt-3 border-t border-neutral-100 justify-end">
                      <button
                        onClick={() => openEditVendor(v)}
                        className="p-2 bg-neutral-50 border border-neutral-200 hover:bg-neutral-100 text-neutral-600 rounded-xl transition cursor-pointer shadow-xs"
                        title="Edit Shop Details"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteVendor(v.id)}
                        className="p-2 bg-neutral-50 border border-neutral-200 hover:bg-rose-50 hover:text-rose-600 text-neutral-400 rounded-xl transition cursor-pointer shadow-xs"
                        title="Remove Shop"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- 4. CUSTOMER LOGS MODULE --- */}
        {activeTab === 'customers' && (
          <div className="space-y-4 text-left">
            <p className="text-xs text-neutral-400 font-mono">Index of all town households utilizing Local Xpress</p>
            
            <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-display font-extrabold uppercase tracking-widest text-[10px]">
                      <th className="p-4">Customer Details</th>
                      <th className="p-4">Mapped Address</th>
                      <th className="p-4 text-center">Loyalty Frequency</th>
                      <th className="p-4">Last Order Date</th>
                      <th className="p-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 text-neutral-700">
                    {filteredCustomers.map((c) => (
                      <tr key={c.id} className="hover:bg-neutral-50/40 transition">
                        <td className="p-4">
                          <div className="font-bold text-neutral-800">{c.name}</div>
                          <div className="text-[11px] text-neutral-500 font-mono">{c.mobile}</div>
                          <div className="text-[10px] text-neutral-400 font-mono mt-0.5">ID: {c.id}</div>
                        </td>
                        <td className="p-4 font-medium text-neutral-600">{c.address}</td>
                        <td className="p-4 text-center">
                          <span className="bg-orange-50 border border-orange-200 text-[#FF6321] font-bold px-2.5 py-1 rounded-full font-display text-[10px] tracking-wider uppercase">
                            {c.totalOrders} Orders
                          </span>
                        </td>
                        <td className="p-4 font-mono text-neutral-500 font-semibold">{c.lastOrderDate}</td>
                        <td className="p-4 text-center">
                          <a
                            href={`tel:${c.mobile}`}
                            className="inline-flex items-center gap-1.5 bg-neutral-50 border border-neutral-200 hover:bg-neutral-100 text-neutral-700 hover:text-neutral-950 px-3 py-1.5 rounded-xl text-[10px] font-bold shadow-xs transition font-display uppercase tracking-wider"
                          >
                            <Phone className="h-3.5 w-3.5" /> Call Customer
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- 5. PURCHASE LEDGER --- */}
        {activeTab === 'purchases' && (
          <div className="space-y-4 text-left">
            <p className="text-xs text-neutral-400 font-mono">Audit of all physical cash layout purchases at third-party shops</p>

            <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-display font-extrabold uppercase tracking-widest text-[10px]">
                      <th className="p-4">Mapped Order ID</th>
                      <th className="p-4">Vendor Shop</th>
                      <th className="p-4">Purchased Items</th>
                      <th className="p-4">Bill Reference No</th>
                      <th className="p-4">Cost Amount</th>
                      <th className="p-4">Receipt Image</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 text-neutral-700">
                    <AnimatePresence initial={false}>
                      {orders.filter(o => o.purchase).map((o) => {
                        const p = o.purchase!;
                        return (
                          <motion.tr
                            key={p.orderId}
                            layout
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="hover:bg-neutral-50/40 transition"
                          >
                          <td className="p-4">
                            <div className="font-mono font-black text-[#FF6321]">{p.orderId}</div>
                            <div className="text-[10px] text-neutral-400 font-mono mt-0.5">{p.purchaseDate}</div>
                          </td>
                          <td className="p-4 font-bold text-neutral-800">{p.vendorName}</td>
                          <td className="p-4 max-w-xs text-neutral-500 line-clamp-2 leading-relaxed font-medium">{p.purchasedItems}</td>
                        <td className="p-4 font-mono text-neutral-400">{p.billNumber}</td>
                        <td className="p-4 font-bold text-emerald-400">₹{p.purchaseAmount}</td>
                        <td className="p-4">
                          {p.billImage ? (
                            <button
                              onClick={() => {
                                const win = window.open();
                                win?.document.write(`<img src="${p.billImage}" style="max-width:100%; height:auto;" />`);
                              }}
                              className="text-xs font-bold text-orange-500 hover:underline cursor-pointer"
                            >
                              View Bill
                            </button>
                          ) : (
                            <span className="text-[10px] text-neutral-500 italic">No receipt file</span>
                          )}
                        </td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                    {orders.filter(o => o.purchase).length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-neutral-500 italic">
                        No purchase records logged yet. Go to Live Orders and update Confirmed runs to generate purchase ledgers.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
        {/* --- 6. BUSINESS ANALYTICS (ADMIN ONLY) --- */}
        {activeTab === 'analytics' && currentRole === 'Admin' && (
          <div className="space-y-6 text-left">
            <p className="text-xs text-neutral-400 font-mono">Visual analytical mapping of dispatcher cash flows and shop volume</p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart 1: Daily Order Volumes Line Chart */}
              <div className="bg-white border border-neutral-200 rounded-3xl p-6 space-y-4 shadow-xs transition hover:border-neutral-300">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-display font-extrabold tracking-wider text-orange-500 uppercase">Trend Analysis</span>
                    <h4 className="font-display font-black text-base text-neutral-900 uppercase tracking-tight mt-1">Daily Order Volume & Revenue</h4>
                  </div>
                  <div className="bg-orange-50 text-[#FF6321] text-[9px] font-bold font-mono px-2 py-1 rounded-lg">
                    {dailyVolumeData.length} Days Sourced
                  </div>
                </div>

                <div className="h-72 w-full pt-4">
                  {dailyVolumeData.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-neutral-50 rounded-2xl border border-dashed border-neutral-200 space-y-2">
                      <BarChart2 className="h-8 w-8 text-neutral-300" />
                      <p className="text-xs font-semibold text-neutral-500">No Historical Data</p>
                      <p className="text-[10px] text-neutral-400">Order volumes will appear here as customers place requests.</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dailyVolumeData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 9, fill: '#6b7280', fontWeight: 'bold' }} 
                        />
                        <YAxis 
                          yAxisId="left"
                          tick={{ fontSize: 9, fill: '#6b7280' }}
                          label={{ value: 'Orders Count', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 9, fill: '#ff6321', fontWeight: 'bold' } }}
                        />
                        <YAxis 
                          yAxisId="right"
                          orientation="right"
                          tick={{ fontSize: 9, fill: '#6b7280' }}
                          label={{ value: 'Revenue (₹)', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fontSize: 9, fill: '#10b981', fontWeight: 'bold' } }}
                        />
                        <Tooltip 
                          contentStyle={{ fontSize: '11px', borderRadius: '16px', border: '1px solid #e5e7eb', backgroundColor: '#ffffff', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.05)' }} 
                        />
                        <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }} />
                        <Line 
                          yAxisId="left"
                          type="monotone" 
                          dataKey="ordersCount" 
                          name="Orders Placed" 
                          stroke="#FF6321" 
                          strokeWidth={3} 
                          activeDot={{ r: 6 }} 
                        />
                        <Line 
                          yAxisId="right"
                          type="monotone" 
                          dataKey="totalSales" 
                          name="Total Sales (₹)" 
                          stroke="#10B981" 
                          strokeWidth={2} 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Chart 2: Top Selling Product Categories Pie Chart */}
              <div className="bg-white border border-neutral-200 rounded-3xl p-6 space-y-4 shadow-xs transition hover:border-neutral-300">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-display font-extrabold tracking-wider text-green-500 uppercase">Product Metrics</span>
                    <h4 className="font-display font-black text-base text-neutral-900 uppercase tracking-tight mt-1">Top Selling Categories</h4>
                  </div>
                  <div className="bg-green-50 text-emerald-600 text-[9px] font-bold font-mono px-2 py-1 rounded-lg">
                    {categoryData.length} Categories Sold
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 items-center pt-2">
                  <div className="h-64 sm:col-span-7 w-full">
                    {categoryData.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-neutral-50 rounded-2xl border border-dashed border-neutral-200 space-y-2">
                        <BarChart2 className="h-8 w-8 text-neutral-300" />
                        <p className="text-xs font-semibold text-neutral-500">No Product Sales</p>
                        <p className="text-[10px] text-neutral-400">Categories sold will display here once checkout transactions are processed.</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={80}
                            paddingAngle={4}
                            dataKey="value"
                            nameKey="name"
                          >
                            {categoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ fontSize: '11px', borderRadius: '16px', border: '1px solid #e5e7eb' }} 
                            formatter={(value, name, props: any) => [`${value} items sold (₹${props.payload.revenue || 0})`, name]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  <div className="sm:col-span-5 space-y-2 max-h-60 overflow-y-auto pr-1">
                    <span className="text-[9px] font-display font-extrabold tracking-wider text-neutral-400 uppercase block mb-1">Sales Share (Qty)</span>
                    {categoryData.map((cat, idx) => (
                      <div key={cat.name} className="flex items-center justify-between text-xs font-medium">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                          <span className="text-neutral-700 truncate max-w-[100px]">{cat.name}</span>
                        </div>
                        <span className="font-mono text-neutral-900 font-bold">{cat.value} <span className="text-[10px] text-neutral-400 font-normal">pcs</span></span>
                      </div>
                    ))}
                    {categoryData.length === 0 && (
                      <div className="text-[10px] text-neutral-400 italic">No sales recorded.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Custom Leaderboard and Metrics below charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Leaderboard Section: Top Vendors & Customers */}
              <div className="bg-white border border-neutral-200 rounded-3xl p-6 space-y-4 shadow-xs transition hover:border-neutral-300">
                <h4 className="font-display font-black text-sm text-neutral-900 uppercase tracking-tight">Top Sourced Town Shop Leaderboard</h4>
                <div className="space-y-4 pt-2">
                  {[
                    { shop: 'Sweets & Bakes Corner', ordersCount: 12, value: '₹1,450', fill: 'w-[90%]' },
                    { shop: 'Krishna Grocery Store', ordersCount: 9, value: '₹1,180', fill: 'w-[75%]' },
                    { shop: 'Drishti Medicos', ordersCount: 5, value: '₹620', fill: 'w-[45%]' },
                    { shop: 'Royal Spice Restaurant', ordersCount: 4, value: '₹480', fill: 'w-[35%]' }
                  ].map((lead, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-neutral-800">{lead.shop}</span>
                        <span className="text-[#FF6321] font-mono">{lead.value} <span className="text-neutral-400 font-normal">({lead.ordersCount} runs)</span></span>
                      </div>
                      <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                        <div className={`h-full bg-[#FF6321] rounded-full ${lead.fill}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Highlights & Performance Card */}
              <div className="bg-neutral-900 text-white rounded-3xl p-6 space-y-4 shadow-xs flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-display font-extrabold tracking-wider text-orange-400 uppercase">Operational Insights</span>
                  <h4 className="font-display font-black text-base text-white uppercase tracking-tight mt-1">Platform Performance</h4>
                  <p className="text-neutral-400 text-xs mt-2 leading-relaxed">
                    Local Xpress is running at optimum dispatch speed. Sourced categories highlight high local consumer affinity for dairy, bakery, and freshly processed items.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 border-t border-neutral-800 pt-4 mt-2">
                  <div>
                    <span className="text-[9px] font-display font-extrabold text-neutral-500 uppercase block">Total Items Sold</span>
                    <span className="text-lg font-black font-mono text-emerald-400 mt-0.5 block">
                      {categoryData.reduce((sum, c) => sum + c.value, 0)} units
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] font-display font-extrabold text-neutral-500 uppercase block">Avg Order Value</span>
                    <span className="text-lg font-black font-mono text-orange-400 mt-0.5 block">
                      ₹{orders.length > 0 ? Math.round(orders.reduce((sum, o) => sum + o.totalAmount, 0) / orders.length) : 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- 7. REPORTS MODULE --- */}
        {activeTab === 'reports' && (
          <div className="space-y-6 text-left">
            <p className="text-xs text-neutral-400 font-mono">Secure dispatcher statement compilation and local data exports</p>

            <div className="bg-white border border-neutral-200 p-6 rounded-3xl space-y-5 max-w-xl shadow-xs">
              <h4 className="font-display font-black text-sm text-neutral-900 uppercase tracking-tight">Compile System Statement</h4>
              
              <div className="space-y-3 text-xs">
                <label className="block text-neutral-400 uppercase tracking-widest text-[9px] font-bold font-display">Select Report Period</label>
                <div className="grid grid-cols-3 gap-3">
                  {['Daily', 'Weekly', 'Monthly'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setReportType(type as any)}
                      className={`py-2.5 px-3 border text-xs font-bold font-display rounded-xl cursor-pointer transition uppercase tracking-wider ${
                        reportType === type
                          ? 'border-[#FF6321] bg-orange-50 text-[#FF6321] font-black shadow-xs'
                          : 'border-neutral-200 text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleExportCSVReport}
                  className="bg-[#FF6321] hover:bg-orange-600 text-white font-black py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-md shadow-orange-500/15 cursor-pointer font-display uppercase tracking-wider"
                >
                  <Download className="h-4 w-4" /> Export as Excel CSV
                </button>
                <button
                  onClick={() => window.print()}
                  className="bg-neutral-50 hover:bg-neutral-100 text-neutral-700 font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition border border-neutral-200 cursor-pointer font-display uppercase tracking-wider shadow-xs"
                >
                  <Printer className="h-4 w-4" /> Print PDF Statement
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- 8. DISPATCH PORTAL CONFIGURATION (ADMIN ONLY) --- */}
        {activeTab === 'settings' && currentRole === 'Admin' && (
          <div className="space-y-6 text-left">
            <p className="text-xs text-neutral-400 font-mono">Configure custom webhooks to link spreadsheets & physical devices</p>

            <div className="bg-white border border-neutral-200 p-6 rounded-3xl max-w-2xl space-y-5 shadow-xs">
              <h4 className="font-display font-black text-sm text-neutral-900 uppercase tracking-tight flex items-center gap-2">
                <Settings className="h-4 w-4 text-[#FF6321]" /> Webhook Configurations
              </h4>

              <div className="space-y-4 text-xs">
                <div className="space-y-2">
                  <label className="text-[9px] font-display uppercase tracking-wider font-extrabold text-neutral-400 block">Google Sheets Form POST URL</label>
                  <input
                    type="url"
                    value={googleFormUrl}
                    onChange={(e) => setGoogleFormUrl(e.target.value)}
                    placeholder="https://docs.google.com/forms/u/0/d/e/1FAIpQLSf.../formResponse"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2.5 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-[#FF6321] focus:border-[#FF6321] font-mono shadow-xs transition"
                  />
                  <span className="text-[10px] text-neutral-500 block leading-normal font-medium">
                    Enter the Google Form Action Response URL. System will post Order ID, Client details, Items list, Payout option, and Dispatch status directly onto your spreadsheet in real-time.
                  </span>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="text-[9px] font-display uppercase tracking-wider font-extrabold text-neutral-400 block">Primary WhatsApp Dispatch Mobile</label>
                  <input
                    type="text"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="e.g. 919876543210"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2.5 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-[#FF6321] focus:border-[#FF6321] font-mono shadow-xs transition"
                  />
                  <span className="text-[10px] text-neutral-500 block leading-normal font-medium">
                    The customer's Order Checkout page will construct the message and launch a chat directly with this physical dispatch terminal number.
                  </span>
                </div>
              </div>
            </div>

            {/* --- INTERACTIVE STORE SCHEDULE MANAGER --- */}
            <div className="bg-white border border-neutral-200 p-6 rounded-3xl max-w-2xl space-y-5 shadow-xs">
              <h4 className="font-display font-black text-sm text-neutral-900 uppercase tracking-tight flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#FF6321]" /> Interactive Store Schedule Manager
              </h4>

              <p className="text-xs text-neutral-500 leading-relaxed font-medium">
                Manage your shop's digital storefront status. Setting a manual override allows you to open early or close for emergency maintenance/holidays, bypassing standard operational hours.
              </p>

              <div className="bg-neutral-50 border border-neutral-100 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-neutral-400 block">Current Storefront Status</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`h-2.5 w-2.5 rounded-full ${
                      (storeForceState === 'open' || (storeForceState === 'auto' && isStoreOpen()))
                        ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                        : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                    }`} />
                    <span className="text-xs font-black text-neutral-800 uppercase tracking-wider font-display">
                      {(storeForceState === 'open' || (storeForceState === 'auto' && isStoreOpen())) ? 'OPEN FOR ORDERS' : 'CLOSED TO CUSTOMERS'}
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-400 font-mono mt-0.5 block leading-normal font-medium">
                    {storeForceState === 'auto' 
                      ? 'Automatic rule: Operational daily 06:00 AM - 10:00 PM (IST)' 
                      : `Forced override rule: Always ${storeForceState.toUpperCase()}`
                    }
                  </span>
                </div>

                <div className="space-y-1.5 w-full sm:w-auto">
                  <label className="text-[9px] font-display uppercase tracking-wider font-extrabold text-neutral-400 block">Status Override Action</label>
                  <select
                    value={storeForceState}
                    onChange={(e) => {
                      const val = e.target.value as 'auto' | 'open' | 'closed';
                      setStoreForceState(val);
                      localStorage.setItem('lx_store_force_state', val);
                      showToast(`Storefront schedule rule set to ${val.toUpperCase()}`, 'success');
                    }}
                    className="w-full sm:w-64 bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-800 font-bold focus:outline-none focus:ring-1 focus:ring-[#FF6321] focus:border-[#FF6321] cursor-pointer shadow-xs"
                  >
                    <option value="auto">⏱️ Time-Based Automatic (Daily 6am-10pm)</option>
                    <option value="open">🟢 Force Open (24/7 Override)</option>
                    <option value="closed">🔴 Force Closed (Holiday/SLA Override)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- GOOGLE WORKSPACE HUB (ADMIN ONLY) --- */}
        {activeTab === 'google-workspace' && currentRole === 'Admin' && (
          <GoogleWorkspacePanel
            orders={orders}
            customers={customers}
            products={products}
            currentRole={currentRole}
            shopTitle={shopTitle}
            onUpdateOrderStatus={onUpdateOrderStatus}
          />
        )}

        {/* --- PROMOTIONAL OFFERS MANAGEMENT (ADMIN ONLY) --- */}
        {activeTab === 'offers' && currentRole === 'Admin' && (
          <div className="space-y-6 text-left animate-in fade-in duration-200">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="font-display font-black text-lg text-neutral-900 uppercase tracking-tight flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-emerald-500" /> Live Campaign & Offer Manager
                </h3>
                <p className="text-xs text-neutral-400 font-mono mt-1">
                  Manage dynamic discounts, promo codes, and seasonal delivery campaigns reflecting instantly on the storefront.
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingOffer(null);
                  setOffId('');
                  setOffTitle('');
                  setOffDescription('');
                  setOffDiscountType('flat');
                  setOffDiscountValue('0');
                  setOffMinOrderValue('0');
                  setOffStatus('Active');
                  setOfferModalOpen(true);
                }}
                className="bg-[#FF6321] hover:bg-[#E5531B] text-white font-bold text-xs px-4 py-2.5 rounded-xl transition duration-150 flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <Plus className="h-4 w-4" /> Create New Offer
              </button>
            </div>

            {offers.length === 0 ? (
              <div className="bg-neutral-50 border border-neutral-200 rounded-3xl p-12 text-center max-w-xl mx-auto space-y-4">
                <Megaphone className="h-12 w-12 text-neutral-300 mx-auto" />
                <div className="space-y-1">
                  <h4 className="font-display font-bold text-sm text-neutral-800">No active promotions</h4>
                  <p className="text-xs text-neutral-400 max-w-xs mx-auto">Create discount coupons or delivery offers to incentivize customers during festive or weekend rushes.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {offers.map((o) => (
                  <div key={o.id} className="bg-white border border-neutral-200 rounded-2xl p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="bg-neutral-900 text-white font-mono text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider select-all">
                          {o.id}
                        </span>
                        <span className={`inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          o.status === 'Active' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                            : 'bg-neutral-100 text-neutral-500 border border-neutral-200'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${o.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-400'}`} />
                          {o.status}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <h4 className="font-display font-bold text-neutral-900 text-sm leading-snug">{o.title}</h4>
                        <p className="text-neutral-500 text-[11px] leading-relaxed">{o.description}</p>
                      </div>

                      <div className="bg-neutral-50 border border-neutral-100 p-3 rounded-xl space-y-1 text-xs">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-neutral-400 font-mono uppercase tracking-wider text-[9px]">Discount Type</span>
                          <span className="font-bold text-neutral-800 uppercase text-[10px]">
                            {o.discountType === 'percentage' && 'Percentage %'}
                            {o.discountType === 'flat' && 'Flat Amount ₹'}
                            {o.discountType === 'free-delivery' && 'Free Delivery 🚚'}
                            {o.discountType === 'banner-only' && 'Banner Display Only 📢'}
                          </span>
                        </div>
                        {o.discountType !== 'free-delivery' && o.discountType !== 'banner-only' && (
                          <div className="flex justify-between text-[11px]">
                            <span className="text-neutral-400 font-mono uppercase tracking-wider text-[9px]">Value</span>
                            <span className="font-bold text-neutral-900">
                              {o.discountType === 'percentage' ? `${o.discountValue}%` : `₹${o.discountValue}`}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between text-[11px]">
                          <span className="text-neutral-400 font-mono uppercase tracking-wider text-[9px]">Min. Order Limit</span>
                          <span className="font-semibold text-neutral-800">
                            {o.minOrderValue && o.minOrderValue > 0 ? `₹${o.minOrderValue}` : 'No Limit'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2.5 pt-4 border-t border-neutral-100 mt-4">
                      <button
                        onClick={() => handleEditOfferClick(o)}
                        className="flex-1 border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 text-[10px] font-bold py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Edit className="h-3 w-3" /> Edit
                      </button>
                      <button
                        onClick={() => handleDeleteOfferClick(o.id)}
                        className="flex-1 border border-red-200 text-red-600 hover:text-white hover:bg-red-500 text-[10px] font-bold py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- AI COMMAND COPILOT WORKSPACE --- */}
        {activeTab === 'ai-copilot' && (
          <AICopilot
            currentRole={currentRole}
            vendors={vendors}
            orders={orders}
            onAddPurchaseRecord={onAddPurchaseRecord}
          />
        )}

        {/* --- CODELESS PRODUCT & BRAND BUILDER --- */}
        {activeTab === 'builder' && currentRole === 'Admin' && (
          <div className="space-y-6 text-left animate-in fade-in duration-200">
            {/* Header Description */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="font-display font-black text-lg text-neutral-900 dark:text-white uppercase tracking-tight">
                  Codeless Store Customizer & Catalog Builder
                </h3>
                <p className="text-xs text-neutral-400 font-mono mt-1">
                  Manage product stock, edit branding layout strings, and configure active delivery slabs dynamically.
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingProduct(null);
                  setPName('');
                  setPCategory('Grocery');
                  setPUnit('1 Kg');
                  setPPrice('');
                  setPImage('');
                  setPFeatured(false);
                  setProductModalOpen(true);
                }}
                className="bg-[#FF6321] hover:bg-[#e04f14] text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 transition shadow-md shadow-orange-500/10 cursor-pointer uppercase tracking-wider font-display"
              >
                <Plus className="h-4 w-4" /> Add Custom Item
              </button>
            </div>

            {/* Layout Customizer Section */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-xs space-y-6 transition-colors">
              <h4 className="font-display font-black text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-widest flex items-center gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-3">
                <Wrench className="h-4 w-4 text-[#FF6321]" /> Global Landing Slogan & Delivery Slabs (No Code Setup)
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                {/* Shop Name */}
                <div className="space-y-2">
                  <label className="text-[9px] font-display uppercase tracking-wider font-extrabold text-neutral-400 block">
                    Shop Title / Brand Name
                  </label>
                  <input
                    type="text"
                    value={shopTitle}
                    onChange={(e) => setShopTitle(e.target.value)}
                    placeholder="e.g. Local Xpress"
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2.5 text-xs text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-[#FF6321] font-medium shadow-xs transition"
                  />
                </div>

                {/* Service Radius */}
                <div className="space-y-2">
                  <label className="text-[9px] font-display uppercase tracking-wider font-extrabold text-neutral-400 block">
                    Active Delivery Radius Slabs
                  </label>
                  <input
                    type="text"
                    value={serviceRadius}
                    onChange={(e) => setServiceRadius(e.target.value)}
                    placeholder="e.g. 5 KM"
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2.5 text-xs text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-[#FF6321] font-mono shadow-xs transition"
                  />
                </div>

                {/* Hero Slogan */}
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[9px] font-display uppercase tracking-wider font-extrabold text-neutral-400 block">
                    Hero Highlight Headline (Landing Page Title)
                  </label>
                  <input
                    type="text"
                    value={shopHeroHeadline}
                    onChange={(e) => setShopHeroHeadline(e.target.value)}
                    placeholder="e.g. Anything you need from local shops, delivered in minutes."
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2.5 text-xs text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-[#FF6321] font-medium shadow-xs transition"
                  />
                </div>

                {/* Hero Description */}
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[9px] font-display uppercase tracking-wider font-extrabold text-neutral-400 block">
                    Landing Page Hero Subtext / Slogan Details
                  </label>
                  <textarea
                    rows={2}
                    value={shopHeroDescription}
                    onChange={(e) => setShopHeroDescription(e.target.value)}
                    placeholder="Describe your service radius and direct local store values..."
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2.5 text-xs text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-[#FF6321] font-medium shadow-xs transition"
                  />
                </div>

                {/* Working Hours */}
                <div className="space-y-2">
                  <label className="text-[9px] font-display uppercase tracking-wider font-extrabold text-neutral-400 block">
                    Standard Working Hours
                  </label>
                  <input
                    type="text"
                    value={workingHours}
                    onChange={(e) => setWorkingHours(e.target.value)}
                    placeholder="e.g. 5 AM - 11 PM"
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2.5 text-xs text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-[#FF6321] font-mono shadow-xs transition"
                  />
                </div>

                {/* Base Delivery Fee */}
                <div className="space-y-2">
                  <label className="text-[9px] font-display uppercase tracking-wider font-extrabold text-neutral-400 block">
                    Standard Base Delivery Fee (₹)
                  </label>
                  <input
                    type="number"
                    value={baseDeliveryCharge}
                    onChange={(e) => setBaseDeliveryCharge(Number(e.target.value))}
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2.5 text-xs text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-[#FF6321] font-mono shadow-xs transition"
                  />
                </div>

                {/* Free Delivery Threshold */}
                <div className="space-y-2">
                  <label className="text-[9px] font-display uppercase tracking-wider font-extrabold text-neutral-400 block">
                    High-Order Discount Delivery Threshold (₹)
                  </label>
                  <input
                    type="number"
                    value={freeDeliveryThreshold}
                    onChange={(e) => setFreeDeliveryThreshold(Number(e.target.value))}
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2.5 text-xs text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-[#FF6321] font-mono shadow-xs transition"
                  />
                </div>

                {/* Customer WA Number */}
                <div className="space-y-2">
                  <label className="text-[9px] font-display uppercase tracking-wider font-extrabold text-neutral-400 block">
                    Customer WhatsApp Support Phone Number
                  </label>
                  <input
                    type="text"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2.5 text-xs text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-[#FF6321] font-mono shadow-xs transition"
                  />
                </div>
              </div>
            </div>

            {/* Catalog Management Section */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-xs space-y-4 transition-colors">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-3">
                <h4 className="font-display font-black text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                  <Store className="h-4 w-4 text-[#FF6321]" /> Live Dynamic Product Catalog
                </h4>

                {/* Product Search & Filter */}
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="Search catalog items..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-[#FF6321] min-w-[180px] flex-1 sm:flex-initial shadow-xs transition-colors"
                  />
                  <select
                    value={productCatFilter}
                    onChange={(e) => setProductCatFilter(e.target.value)}
                    className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-2 py-2 text-xs text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-[#FF6321] shadow-xs cursor-pointer transition-colors"
                  >
                    <option value="All">All Categories</option>
                    {[
                      'Grocery', 'Fruits & Vegetables', 'Bakery', 'Medicines', 'Dairy', 
                      'Restaurant Food', 'Stationery', 'Electronics', 'Fashion', 'Gift Items', 
                      'Household Items', 'Others'
                    ].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Product Table Grid */}
              <div className="overflow-x-auto rounded-xl border border-neutral-100 dark:border-neutral-800">
                <table className="w-full text-left text-xs text-neutral-700 dark:text-neutral-300">
                  <thead className="bg-neutral-50 dark:bg-neutral-800/40 text-[10px] font-display uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                    <tr>
                      <th className="px-4 py-3.5">Item Detail</th>
                      <th className="px-4 py-3.5">Category</th>
                      <th className="px-4 py-3.5">Price</th>
                      <th className="px-4 py-3.5">Unit size</th>
                      <th className="px-4 py-3.5">Featured</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                    {productsLoading ? (
                      Array.from({ length: 6 }).map((_, idx) => (
                        <tr key={`products-table-skeleton-${idx}`} className="animate-pulse">
                          <td className="px-4 py-3 flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-neutral-200 dark:bg-neutral-800 animate-pulse shrink-0" />
                            <div className="space-y-2 flex-1">
                              <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-2/3" />
                              <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded w-1/3" />
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="h-5 bg-neutral-150 dark:bg-neutral-800 rounded-md w-20" />
                          </td>
                          <td className="px-4 py-3">
                            <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-12" />
                          </td>
                          <td className="px-4 py-3">
                            <div className="h-4 bg-neutral-150 dark:bg-neutral-800 rounded w-16" />
                          </td>
                          <td className="px-4 py-3">
                            <div className="h-4 bg-neutral-150 dark:bg-neutral-800 rounded w-8" />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <div className="h-8 bg-neutral-200 dark:bg-neutral-800 rounded-lg w-10 animate-pulse" />
                              <div className="h-8 bg-neutral-200 dark:bg-neutral-800 rounded-lg w-12 animate-pulse" />
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <>
                        {products
                          .filter(p => {
                            const matchesSearch = p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.category.toLowerCase().includes(productSearch.toLowerCase());
                            const matchesCat = productCatFilter === 'All' || p.category === productCatFilter;
                            return matchesSearch && matchesCat;
                          })
                          .map((p) => (
                            <tr key={p.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/10 transition-colors">
                              <td className="px-4 py-3 flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-700 overflow-hidden flex items-center justify-center shrink-0">
                                  {p.image ? (
                                    <img src={p.image} alt={p.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                                  ) : (
                                    <Store className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-semibold text-neutral-900 dark:text-neutral-100">{p.name}</p>
                                  <p className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500">ID: {p.id}</p>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className="bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 px-2 py-0.5 rounded-md text-[10px] font-semibold">
                                  {p.category}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-mono font-bold text-neutral-900 dark:text-white">
                                ₹{p.price}
                              </td>
                              <td className="px-4 py-3 font-mono text-neutral-500 dark:text-neutral-400">
                                {p.unit || '1 Unit'}
                              </td>
                              <td className="px-4 py-3">
                                {p.featured ? (
                                  <span className="bg-orange-50 dark:bg-orange-950/20 text-[#FF6321] dark:text-orange-400 border border-orange-100 dark:border-orange-900/30 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">
                                    Star ⭐
                                  </span>
                                ) : (
                                  <span className="text-neutral-300 dark:text-neutral-600">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right space-x-1.5">
                                <button
                                  onClick={() => {
                                    setEditingProduct(p);
                                    setPName(p.name);
                                    setPCategory(p.category);
                                    setPUnit(p.unit || '1 Unit');
                                    setPPrice(String(p.price));
                                    setPImage(p.image || '');
                                    setPFeatured(!!p.featured);
                                    setProductModalOpen(true);
                                  }}
                                  className="text-neutral-500 hover:text-[#FF6321] p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition cursor-pointer inline-flex items-center justify-center font-bold"
                                  title="Edit Item"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm(`Are you sure you want to delete "${p.name}"?`)) {
                                      onDeleteProduct(p.id);
                                      showToast('Product removed successfully', 'success');
                                    }
                                  }}
                                  className="text-neutral-400 hover:text-rose-500 p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition cursor-pointer inline-flex items-center justify-center"
                                  title="Delete Item"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        {!productsLoading && products.filter(p => {
                          const matchesSearch = p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.category.toLowerCase().includes(productSearch.toLowerCase());
                          const matchesCat = productCatFilter === 'All' || p.category === productCatFilter;
                          return matchesSearch && matchesCat;
                        }).length === 0 && (
                          <tr>
                            <td colSpan={6} className="text-center py-12 text-neutral-400">
                              No products found matching your filter criteria.
                            </td>
                          </tr>
                        )}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* --- ADD / EDIT VENDOR MODAL --- */}
      <AnimatePresence>
        {vendorModalOpen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-md overflow-hidden text-left"
            >
              <div className="bg-neutral-900 p-5 border-b border-neutral-800 flex justify-between items-center">
                <h4 className="font-display font-bold text-sm text-white">
                  {editingVendor ? 'Edit Town Merchant' : 'Register New Vendor Shop'}
                </h4>
                <button
                  onClick={() => setVendorModalOpen(false)}
                  className="text-neutral-500 hover:text-white transition text-xs font-semibold cursor-pointer"
                >
                  Close [X]
                </button>
              </div>

              <form onSubmit={handleVendorSubmit} className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Shop Name *</label>
                    <input
                      type="text"
                      required
                      value={vShopName}
                      onChange={(e) => setVShopName(e.target.value)}
                      placeholder="e.g. Sweets & Bakes"
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Owner Name *</label>
                    <input
                      type="text"
                      required
                      value={vOwnerName}
                      onChange={(e) => setVOwnerName(e.target.value)}
                      placeholder="e.g. Rajesh Gupta"
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Mobile Number *</label>
                    <input
                      type="tel"
                      required
                      value={vMobile}
                      onChange={(e) => setVMobile(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Category *</label>
                    <select
                      value={vCategory}
                      onChange={(e) => setVCategory(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                    >
                      <option value="Grocery">Grocery</option>
                      <option value="Medical">Medical</option>
                      <option value="Bakery">Bakery</option>
                      <option value="Restaurant">Restaurant</option>
                      <option value="Stationery">Stationery</option>
                      <option value="Electronics">Electronics</option>
                      <option value="Fashion">Fashion</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Address *</label>
                  <input
                    type="text"
                    required
                    value={vAddress}
                    onChange={(e) => setVAddress(e.target.value)}
                    placeholder="e.g. Station Road, Birdpur"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Opening Time</label>
                    <input
                      type="text"
                      value={vOpen}
                      onChange={(e) => setVOpen(e.target.value)}
                      placeholder="e.g. 07:00 AM"
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Closing Time</label>
                    <input
                      type="text"
                      value={vClose}
                      onChange={(e) => setVClose(e.target.value)}
                      placeholder="e.g. 10:00 PM"
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Shop Operational Status</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 text-xs">
                      <input
                        type="radio"
                        checked={vStatus === 'Active'}
                        onChange={() => setVStatus('Active')}
                        className="text-orange-500 bg-neutral-900 border-neutral-800"
                      /> Active Delivery Sourcing
                    </label>
                    <label className="flex items-center gap-1.5 text-xs">
                      <input
                        type="radio"
                        checked={vStatus === 'Inactive'}
                        onChange={() => setVStatus('Inactive')}
                        className="text-orange-500 bg-neutral-900 border-neutral-800"
                      /> Inactive (Closed)
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
                >
                  {editingVendor ? 'Save Changes' : 'Register Merchant'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- LOG MERCHANT BILL MODAL --- */}
      <AnimatePresence>
        {purchaseModalOpen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-md overflow-hidden text-left"
            >
              <div className="bg-neutral-900 p-5 border-b border-neutral-800 flex justify-between items-center">
                <div>
                  <h4 className="font-display font-bold text-sm text-white">Record Third-Party Shop Bill</h4>
                  <p className="text-[9px] text-neutral-400 font-mono mt-0.5">ORDER ID: {purchaseOrderId}</p>
                </div>
                <button
                  onClick={() => setPurchaseModalOpen(false)}
                  className="text-neutral-500 hover:text-white transition text-xs font-semibold cursor-pointer"
                >
                  Close [X]
                </button>
              </div>

              <form onSubmit={handlePurchaseSubmit} className="p-5 space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Select Source Vendor Shop *</label>
                  <select
                    value={purchaseVendorId}
                    onChange={(e) => setPurchaseVendorId(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.shopName} ({v.category})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Physical Shop Cost (₹) *</label>
                    <input
                      type="number"
                      required
                      value={purchaseAmount}
                      onChange={(e) => setPurchaseAmount(e.target.value)}
                      placeholder="e.g. 180"
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Bill/Invoice Number *</label>
                    <input
                      type="text"
                      required
                      value={purchaseBillNo}
                      onChange={(e) => setPurchaseBillNo(e.target.value)}
                      placeholder="e.g. SBC-9941"
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Purchased Items Description</label>
                  <textarea
                    rows={2}
                    value={purchasedItemsDesc}
                    onChange={(e) => setPurchasedItemsDesc(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Upload Physical Bill Image</label>
                  <div className="border border-dashed border-neutral-800 bg-neutral-900/30 rounded-xl p-4 text-center cursor-pointer hover:bg-neutral-900/50 transition relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <Upload className="h-5 w-5 text-neutral-500 mx-auto mb-1" />
                    <span className="text-[10px] text-neutral-400 block font-medium">Click to upload shop receipt photo</span>
                    {billImageFile && <span className="text-[9px] text-emerald-400 block mt-1 font-bold">✓ Bill Receipt image uploaded</span>}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
                >
                  Save Bill & Confirm Sourced Status
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- QUICK MANUAL ORDER INTAKE MODAL (Ctrl+N) --- */}
      <AnimatePresence>
        {quickOrderModalOpen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-950 border border-neutral-800 rounded-3xl w-full max-w-lg overflow-hidden text-left shadow-2xl my-8"
            >
              <div className="bg-neutral-900 p-5 border-b border-neutral-800 flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-display font-black text-sm text-white uppercase tracking-tight">Manual Order Intake Terminal</h4>
                    <span className="bg-[#FF6321] text-white text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Ctrl+N</span>
                  </div>
                  <p className="text-[10px] text-neutral-400 font-mono mt-0.5">Quick-log telephonic or walk-in orders into dispatch</p>
                </div>
                <button
                  onClick={() => setQuickOrderModalOpen(false)}
                  className="text-neutral-500 hover:text-white transition text-xs font-semibold cursor-pointer border border-neutral-800 bg-neutral-950/50 hover:bg-neutral-850 px-2.5 py-1 rounded-xl"
                >
                  Close [X]
                </button>
              </div>

              <form onSubmit={handleQuickOrderSubmit} className="p-5 space-y-4 text-xs">
                {/* Section 1: Customer Info */}
                <div>
                  <h5 className="text-[10px] font-bold text-[#FF6321] uppercase tracking-widest font-display mb-3 border-b border-neutral-900 pb-1">1. Customer Information</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Customer Name *</label>
                      <input
                        type="text"
                        required
                        value={qoName}
                        onChange={(e) => setQoName(e.target.value)}
                        placeholder="e.g. Amit Kumar"
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500 placeholder-neutral-650"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Mobile Number *</label>
                      <input
                        type="tel"
                        required
                        value={qoMobile}
                        onChange={(e) => setQoMobile(e.target.value)}
                        placeholder="e.g. 9876543210"
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500 placeholder-neutral-650"
                      />
                    </div>
                  </div>
                </div>

                {/* Address details */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Full Delivery Address *</label>
                    <input
                      type="text"
                      required
                      value={qoAddress}
                      onChange={(e) => setQoAddress(e.target.value)}
                      placeholder="e.g. House No. 45, Near Hanuman Mandir"
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500 placeholder-neutral-650"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Landmark</label>
                      <input
                        type="text"
                        value={qoLandmark}
                        onChange={(e) => setQoLandmark(e.target.value)}
                        placeholder="e.g. Opposite Post Office"
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500 placeholder-neutral-650"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Area / Region *</label>
                      <select
                        value={qoArea}
                        onChange={(e) => setQoArea(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500 cursor-pointer"
                      >
                        <option value="Siddharthnagar">Siddharthnagar Town</option>
                        <option value="Birdpur">Birdpur Area</option>
                        <option value="Main Bazar">Main Bazar Area</option>
                        <option value="Station Road">Station Road Area</option>
                        <option value="Others">Others (Under 5 KM)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Pincode</label>
                      <input
                        type="text"
                        value={qoPincode}
                        onChange={(e) => setQoPincode(e.target.value)}
                        placeholder="e.g. 272201"
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500 placeholder-neutral-650"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Order Items */}
                <div className="space-y-4">
                  <h5 className="text-[10px] font-bold text-[#FF6321] uppercase tracking-widest font-display mb-1 border-b border-neutral-900 pb-1">
                    2. Sourced Items & Costs
                  </h5>

                  {/* 2.1 Search items in product list */}
                  <div className="space-y-1.5 relative">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                      Search Catalog Products
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={qoSearchQuery}
                        onChange={(e) => {
                          setQoSearchQuery(e.target.value);
                          setShowQoSearchDropdown(true);
                        }}
                        onFocus={() => setShowQoSearchDropdown(true)}
                        placeholder="Search by name or category (e.g., Milk, Bread...)"
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:border-[#FF6321] placeholder-neutral-650 text-xs"
                      />
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
                      {qoSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setQoSearchQuery('')}
                          className="absolute right-3 top-2 text-neutral-500 hover:text-white text-xs font-bold"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    {/* Matching results dropdown */}
                    {showQoSearchDropdown && filteredProductsForQo.length > 0 && (
                      <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl max-h-52 overflow-y-auto divide-y divide-neutral-850">
                        {filteredProductsForQo.map((prod) => (
                          <div
                            key={prod.id}
                            onClick={() => handleAddProductToQo(prod)}
                            className="flex items-center justify-between p-3 hover:bg-neutral-850 cursor-pointer transition text-xs"
                          >
                            <div className="flex items-center gap-2">
                              {prod.image ? (
                                <img
                                  src={prod.image}
                                  alt={prod.name}
                                  className="h-8 w-8 object-cover rounded-lg bg-neutral-950"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="h-8 w-8 bg-neutral-800 rounded-lg flex items-center justify-center text-neutral-400 font-bold uppercase text-[9px]">
                                  {prod.name.substring(0, 2)}
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-white">{prod.name}</p>
                                <p className="text-[9px] text-neutral-500 font-mono uppercase">{prod.category}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-[#FF6321]">₹{prod.price || 0}</p>
                              <span className="text-[9px] text-neutral-400 px-1.5 py-0.5 bg-neutral-800 rounded-md font-mono">
                                + Add to Order
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 2.2 Add custom item quickly */}
                  <div className="bg-neutral-950 border border-neutral-900 rounded-2xl p-3 space-y-2">
                    <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">
                      Or Add Custom Item (Not in Catalog)
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                      <div className="sm:col-span-6">
                        <input
                          type="text"
                          value={qoCustomItemName}
                          onChange={(e) => setQoCustomItemName(e.target.value)}
                          placeholder="Custom item name"
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:border-orange-500 text-xs placeholder-neutral-600"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <input
                          type="number"
                          value={qoCustomItemPrice}
                          onChange={(e) => setQoCustomItemPrice(e.target.value)}
                          placeholder="Price (₹)"
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:border-orange-500 text-xs placeholder-neutral-600"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <button
                          type="button"
                          onClick={handleAddCustomItemToQo}
                          className="w-full h-full bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 hover:border-[#FF6321] text-white hover:text-[#FF6321] rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer py-1.5"
                        >
                          <Plus className="h-3.5 w-3.5" /> Add
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 2.3 Selected items interactive editor */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                      Current Sourced Items
                    </label>

                    {qoItems.length === 0 ? (
                      <div className="bg-neutral-900/40 border border-dashed border-neutral-850 rounded-2xl p-4 text-center">
                        <p className="text-neutral-500 text-xs">No items added yet.</p>
                        <p className="text-[10px] text-neutral-600 mt-0.5">Use search or custom item inputs above to add items to this manual order.</p>
                      </div>
                    ) : (
                      <div className="bg-neutral-900 border border-neutral-850 rounded-2xl overflow-hidden divide-y divide-neutral-850 max-h-60 overflow-y-auto">
                        {qoItems.map((item, index) => (
                          <div key={item.product.id || index} className="p-3 flex items-center justify-between gap-3 text-xs">
                            {/* Product Info & Name edit */}
                            <div className="flex-1 min-w-0">
                              <input
                                type="text"
                                value={item.product.name}
                                onChange={(e) => handleUpdateQoItemName(index, e.target.value)}
                                className="bg-transparent border-b border-transparent hover:border-neutral-700 focus:border-[#FF6321] focus:outline-none text-white font-bold w-full truncate py-0.5 text-xs font-sans"
                              />
                              <p className="text-[9px] text-neutral-500 font-mono uppercase mt-0.5">
                                Category: {item.product.category || 'Custom'}
                              </p>
                            </div>

                            {/* Inline Price edit */}
                            <div className="w-20">
                              <span className="text-[8px] text-neutral-500 font-mono block mb-0.5">Price (₹)</span>
                              <input
                                type="number"
                                value={item.product.price || ''}
                                onChange={(e) => handleUpdateQoItemPrice(index, parseFloat(e.target.value) || 0)}
                                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1 text-white focus:outline-none focus:border-orange-500 text-right font-mono text-xs"
                              />
                            </div>

                            {/* Quantity Controls */}
                            <div className="flex items-center gap-1.5 bg-neutral-950 border border-neutral-850 px-2 py-1 rounded-xl">
                              <button
                                type="button"
                                onClick={() => handleUpdateQoItemQty(index, item.quantity - 1)}
                                className="text-neutral-400 hover:text-white p-0.5 transition cursor-pointer"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-6 text-center font-bold font-mono text-white text-xs">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateQoItemQty(index, item.quantity + 1)}
                                className="text-neutral-400 hover:text-white p-0.5 transition cursor-pointer"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>

                            {/* Item Total Price */}
                            <div className="w-16 text-right font-bold font-mono text-white">
                              ₹{((item.product.price || 0) * item.quantity)}
                            </div>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => handleDeleteQoItem(index)}
                              className="text-neutral-500 hover:text-red-400 p-1 rounded-lg hover:bg-neutral-800 transition cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Fallback description list (collapsed/optional preview) */}
                  {qoItems.length === 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                          Manual Items Text Fallback
                        </label>
                        <span className="text-[8px] text-neutral-500 font-mono">Format: Item Name xQty (e.g. Amul Milk x2)</span>
                      </div>
                      <textarea
                        rows={2}
                        value={qoItemsDesc}
                        onChange={(e) => setQoItemsDesc(e.target.value)}
                        placeholder="e.g. Britannia Bread x1&#10;Amul Gold Milk x2&#10;Tata Salt 1Kg x1"
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500 font-mono text-[11px] placeholder-neutral-650"
                      />
                    </div>
                  )}

                  {/* Pricing Overview */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Est. Subtotal (₹) *</label>
                      <input
                        type="number"
                        required
                        value={qoSubtotal}
                        onChange={(e) => setQoSubtotal(e.target.value)}
                        placeholder="e.g. 250"
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500 placeholder-neutral-650"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Delivery Charge (₹) *</label>
                      <input
                        type="number"
                        required
                        value={qoDelivery}
                        onChange={(e) => setQoDelivery(e.target.value)}
                        placeholder="e.g. 40"
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500 placeholder-neutral-650"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Payment Method *</label>
                      <select
                        value={qoPaymentMethod}
                        onChange={(e) => setQoPaymentMethod(e.target.value as any)}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500 cursor-pointer"
                      >
                        <option value="Cash on Delivery">Cash on Delivery</option>
                        <option value="UPI on Delivery">UPI on Delivery</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Instructions / Notes */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Dispatcher / Special Notes</label>
                  <input
                    type="text"
                    value={qoNotes}
                    onChange={(e) => setQoNotes(e.target.value)}
                    placeholder="e.g. Call customer before sourcing medical items"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500 placeholder-neutral-650"
                  />
                </div>

                <div className="pt-3 border-t border-neutral-900 flex justify-between items-center text-[11px] font-mono font-bold text-neutral-300">
                  <div>
                    Total Amount Due: <span className="text-[#FF6321] text-sm font-black font-sans">₹{(parseFloat(qoSubtotal) || 0) + (parseFloat(qoDelivery) || 0)}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setQuickOrderModalOpen(false)}
                      className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 font-extrabold px-4 py-3 rounded-xl text-xs transition cursor-pointer font-display uppercase tracking-wider"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-[#FF6321] hover:bg-orange-600 text-white font-extrabold px-6 py-3 rounded-xl text-xs transition duration-200 shadow-md shadow-orange-500/10 hover:shadow-orange-500/20 active:scale-98 cursor-pointer font-display uppercase tracking-wider"
                    >
                      Place manual order
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- ADD / EDIT PROMOTIONAL OFFER MODAL --- */}
      <AnimatePresence>
        {offerModalOpen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-md overflow-hidden text-left shadow-2xl"
            >
              <div className="bg-neutral-900 p-5 border-b border-neutral-800 flex justify-between items-center">
                <h4 className="font-display font-bold text-sm text-white">
                  {editingOffer ? '⚙️ Edit Promotional Campaign' : '📢 Create New Promotional Campaign'}
                </h4>
                <button
                  onClick={() => setOfferModalOpen(false)}
                  className="text-neutral-500 hover:text-white transition text-xs font-semibold cursor-pointer"
                >
                  Close [X]
                </button>
              </div>

              <form onSubmit={handleOfferSubmit} className="p-5 space-y-4">
                {/* Code / ID */}
                <div className="space-y-1">
                  <label className="text-[9px] font-mono uppercase tracking-wider font-extrabold text-neutral-400 block">Offer Code / Coupon Code *</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingOffer}
                    value={offId}
                    onChange={(e) => setOffId(e.target.value.toUpperCase())}
                    placeholder="e.g. FESTIVE50, FREE300"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-[#FF6321] focus:border-[#FF6321] disabled:opacity-50 font-mono"
                  />
                  {!editingOffer && <p className="text-[9px] text-neutral-500 font-mono">Unique uppercase identifier used by customers (e.g., WELCOME100).</p>}
                </div>

                {/* Title */}
                <div className="space-y-1">
                  <label className="text-[9px] font-mono uppercase tracking-wider font-extrabold text-neutral-400 block">Offer Title *</label>
                  <input
                    type="text"
                    required
                    value={offTitle}
                    onChange={(e) => setOffTitle(e.target.value)}
                    placeholder="e.g. Flat ₹50 Cash-back"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-[#FF6321] focus:border-[#FF6321]"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-[9px] font-mono uppercase tracking-wider font-extrabold text-neutral-400 block">Public Description *</label>
                  <textarea
                    required
                    rows={2}
                    value={offDescription}
                    onChange={(e) => setOffDescription(e.target.value)}
                    placeholder="e.g. Save ₹50 on groceries when you order above ₹499."
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-[#FF6321] focus:border-[#FF6321]"
                  />
                </div>

                {/* Discount Type */}
                <div className="space-y-1">
                  <label className="text-[9px] font-mono uppercase tracking-wider font-extrabold text-neutral-400 block">Offer Discount Category *</label>
                  <select
                    value={offDiscountType}
                    onChange={(e) => setOffDiscountType(e.target.value as any)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#FF6321]"
                  >
                    <option value="flat">💵 Flat Discount (Amount in ₹)</option>
                    <option value="percentage">📈 Percentage Discount (% off)</option>
                    <option value="free-delivery">🚚 Free Delivery Campaign</option>
                    <option value="banner-only">📢 Announcement Banner Only (No Math)</option>
                  </select>
                </div>

                {/* Discount Value and Min Order Value in Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {offDiscountType !== 'free-delivery' && offDiscountType !== 'banner-only' && (
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono uppercase tracking-wider font-extrabold text-neutral-400 block">
                        Discount Value ({offDiscountType === 'percentage' ? '%' : '₹'}) *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={offDiscountValue}
                        onChange={(e) => setOffDiscountValue(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#FF6321]"
                      />
                    </div>
                  )}

                  <div className="space-y-1 col-span-2 sm:col-span-1">
                    <label className="text-[9px] font-mono uppercase tracking-wider font-extrabold text-neutral-400 block">Min. Order Value (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={offMinOrderValue}
                      onChange={(e) => setOffMinOrderValue(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#FF6321]"
                    />
                  </div>
                </div>

                {/* Status */}
                <div className="space-y-1">
                  <label className="text-[9px] font-mono uppercase tracking-wider font-extrabold text-neutral-400 block">Campaign Status</label>
                  <select
                    value={offStatus}
                    onChange={(e) => setOffStatus(e.target.value as any)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#FF6321]"
                  >
                    <option value="Active">🟢 Live / Active (Customers Can Use)</option>
                    <option value="Inactive">🔴 Draft / Paused (Hidden From Site)</option>
                  </select>
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  className="w-full bg-[#FF6321] hover:bg-[#E5531B] text-white font-bold text-xs py-2.5 rounded-xl transition shadow-md shadow-[#FF6321]/15 pt-2 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Check className="h-4 w-4" /> {editingOffer ? 'Save Changes' : 'Launch Campaign'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- ADD / EDIT PRODUCT CATALOG MODAL --- */}
      <AnimatePresence>
        {productModalOpen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-md overflow-hidden text-left shadow-2xl"
            >
              <div className="bg-neutral-900 p-5 border-b border-neutral-800 flex justify-between items-center">
                <h4 className="font-display font-bold text-sm text-white">
                  {editingProduct ? 'Edit Catalog Product' : 'Add New Custom Catalog Product'}
                </h4>
                <button
                  onClick={() => setProductModalOpen(false)}
                  className="text-neutral-500 hover:text-white transition text-xs font-semibold cursor-pointer"
                >
                  Close [X]
                </button>
              </div>

              <form onSubmit={handleProductSubmit} className="p-5 space-y-4">
                {/* Product Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Product Title *</label>
                  <input
                    type="text"
                    required
                    value={pName}
                    onChange={(e) => setPName(e.target.value)}
                    placeholder="e.g. Fresh Amul Milk Premium"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 placeholder-neutral-600"
                  />
                </div>

                {/* Category & Unit */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Category *</label>
                    <select
                      value={pCategory}
                      onChange={(e) => setPCategory(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-orange-500 cursor-pointer"
                    >
                      {[
                        'Grocery', 'Fruits & Vegetables', 'Bakery', 'Medicines', 'Dairy', 
                        'Restaurant Food', 'Stationery', 'Electronics', 'Fashion', 'Gift Items', 
                        'Household Items', 'Others'
                      ].map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Unit / Sizing *</label>
                    <input
                      type="text"
                      required
                      value={pUnit}
                      onChange={(e) => setPUnit(e.target.value)}
                      placeholder="e.g. 500 Ml or 1 Packet"
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 placeholder-neutral-650"
                    />
                  </div>
                </div>

                {/* Price & Image Link */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Price (₹) *</label>
                    <input
                      type="number"
                      required
                      value={pPrice}
                      onChange={(e) => setPPrice(e.target.value)}
                      placeholder="e.g. 35"
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 font-mono placeholder-neutral-650"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Featured Star ⭐</label>
                    <div className="flex items-center h-10">
                      <input
                        type="checkbox"
                        checked={pFeatured}
                        onChange={(e) => setPFeatured(e.target.checked)}
                        className="h-4 w-4 text-orange-500 border-neutral-800 rounded focus:ring-orange-500 focus:ring-offset-neutral-950 cursor-pointer"
                        id="pFeaturedCheck"
                      />
                      <label htmlFor="pFeaturedCheck" className="text-xs text-neutral-300 ml-2 cursor-pointer font-semibold">Show on Hero Highlight</label>
                    </div>
                  </div>
                </div>

                {/* Image URL with auto generation instruction */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Image Link / Asset URL</label>
                  <input
                    type="url"
                    value={pImage}
                    onChange={(e) => setPImage(e.target.value)}
                    placeholder="e.g. https://images.unsplash.com/... or keep empty"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 placeholder-neutral-600 font-mono"
                  />
                  <span className="text-[9px] text-neutral-500 block leading-normal mt-1 font-medium">
                    Keep empty or use any valid image link. High-quality placeholders will be auto-rendered for empty links.
                  </span>
                </div>

                <button
                  type="submit"
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-extrabold py-3 rounded-xl text-xs transition duration-200 uppercase tracking-wider font-display shadow-md shadow-orange-500/10 hover:shadow-orange-500/20 active:scale-98 cursor-pointer"
                >
                  {editingProduct ? 'Update Store Item' : 'Add Custom Item to Catalog'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* --- RENDER DETAILED ORDER WORKFLOW / TIMELINE MODAL --- */}
      <AnimatePresence>
        {viewingOrderDetail && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto no-print">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white border border-neutral-200 rounded-3xl w-full max-w-2xl overflow-hidden text-left shadow-2xl my-8"
            >
              {/* Header */}
              <div className="bg-neutral-50 p-6 border-b border-neutral-200 flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="bg-[#FF6321]/10 text-[#FF6321] text-xs font-mono px-2.5 py-1 rounded-xl font-bold uppercase tracking-wider">
                      {viewingOrderDetail.id}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      viewingOrderDetail.status === 'Delivered'
                        ? 'bg-emerald-100 text-emerald-800'
                        : viewingOrderDetail.status === 'Out For Delivery'
                          ? 'bg-blue-100 text-blue-800'
                          : viewingOrderDetail.status === 'Purchased'
                            ? 'bg-purple-100 text-purple-800'
                            : viewingOrderDetail.status === 'Confirmed'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-neutral-100 text-neutral-800'
                    }`}>
                      {viewingOrderDetail.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-400 font-mono mt-1">
                    Logged: {viewingOrderDetail.date} • {viewingOrderDetail.time}
                  </p>
                </div>
                <button
                  onClick={() => setViewingOrderDetail(null)}
                  className="text-neutral-400 hover:text-neutral-800 transition text-xs font-semibold cursor-pointer border border-neutral-200 bg-white px-3 py-1.5 rounded-xl hover:bg-neutral-50 shadow-xs"
                >
                  Close [X]
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6 text-xs text-neutral-800 overflow-y-auto max-h-[70vh]">
                
                {/* 1. VISUAL PROGRESS TIMELINE */}
                <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <h5 className="text-[10px] font-display font-extrabold uppercase tracking-widest text-[#FF6321]">
                      Interactive Dispatch Timeline
                    </h5>
                    <span className="text-[9px] text-neutral-400 font-mono">Click a node to force transition status</span>
                  </div>

                  <div className="relative flex justify-between items-center w-full pt-2">
                    {/* Progress Bar background line */}
                    <div className="absolute top-6 left-5 right-5 h-0.5 bg-neutral-200 -z-0" />
                    
                    {/* Active Progress Bar fill line */}
                    <div 
                      className="absolute top-6 left-5 h-0.5 bg-[#FF6321] transition-all duration-300 -z-0"
                      style={{
                        width: 
                          viewingOrderDetail.status === 'Pending' ? '0%' :
                          viewingOrderDetail.status === 'Confirmed' ? '25%' :
                          viewingOrderDetail.status === 'Purchased' ? '50%' :
                          viewingOrderDetail.status === 'Out For Delivery' ? '75%' :
                          '100%'
                      }}
                    />

                    {/* Timeline Nodes */}
                    {[
                      { state: 'Pending', label: 'Pending', icon: <Clock className="h-3.5 w-3.5" /> },
                      { state: 'Confirmed', label: 'Confirmed', icon: <CheckCircle className="h-3.5 w-3.5" /> },
                      { state: 'Purchased', label: 'Purchased', icon: <ShoppingBag className="h-3.5 w-3.5" /> },
                      { state: 'Out For Delivery', label: 'Dispatched', icon: <Truck className="h-3.5 w-3.5" /> },
                      { state: 'Delivered', label: 'Delivered', icon: <Check className="h-3.5 w-3.5" /> }
                    ].map((node, i) => {
                      const statesInOrder = ['Pending', 'Confirmed', 'Purchased', 'Out For Delivery', 'Delivered'];
                      const activeIndex = statesInOrder.indexOf(viewingOrderDetail.status);
                      const isCompleted = i <= activeIndex;
                      const isCurrent = i === activeIndex;

                      return (
                        <button
                          key={node.state}
                          onClick={() => {
                            onUpdateOrderStatus(viewingOrderDetail.id, node.state as any);
                            setViewingOrderDetail({ ...viewingOrderDetail, status: node.state as any });
                            showToast(`Order status updated to ${node.state}`, 'success');
                          }}
                          className="flex flex-col items-center gap-1.5 focus:outline-none cursor-pointer relative z-10 group"
                        >
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center border transition-all ${
                            isCompleted
                              ? 'bg-[#FF6321] border-[#FF6321] text-white shadow-md shadow-orange-500/15'
                              : 'bg-white border-neutral-300 text-neutral-400 hover:border-neutral-400'
                          } ${isCurrent ? 'ring-4 ring-orange-500/10 scale-105' : ''}`}>
                            {node.icon}
                          </div>
                          <span className={`text-[9px] font-bold uppercase tracking-wider transition ${
                            isCompleted ? 'text-neutral-900' : 'text-neutral-400 group-hover:text-neutral-600'
                          }`}>
                            {node.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. CUSTOMER & DELIVERY META */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-neutral-200 rounded-2xl p-4 space-y-2 bg-white">
                    <h5 className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest block border-b pb-1">
                      Customer Information
                    </h5>
                    <p className="text-sm font-black text-neutral-800">{viewingOrderDetail.customerDetails.name}</p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <a
                        href={`tel:${viewingOrderDetail.customerDetails.mobile}`}
                        className="inline-flex items-center gap-1 bg-[#FF6321]/5 border border-[#FF6321]/10 hover:bg-[#FF6321]/10 px-2.5 py-1.5 rounded-xl text-xs text-[#FF6321] font-bold font-mono transition"
                      >
                        <Phone className="h-3 w-3" /> Call Customer
                      </a>
                      <a
                        href={getWhatsAppInvoiceUrl(viewingOrderDetail)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 px-2.5 py-1.5 rounded-xl text-xs text-emerald-700 font-bold font-mono transition"
                      >
                        <MessageSquare className="h-3 w-3" /> WhatsApp Invoice
                      </a>
                    </div>
                    <div className="text-[10px] text-neutral-500 space-y-0.5 mt-2">
                      <p className="font-semibold text-neutral-700">Delivery Location:</p>
                      <p>{viewingOrderDetail.customerDetails.address}</p>
                      <p className="italic">Landmark: {viewingOrderDetail.customerDetails.landmark}</p>
                      <p>{viewingOrderDetail.customerDetails.area} - {viewingOrderDetail.customerDetails.pincode}</p>
                    </div>
                    
                    {/* Google Maps quick locator */}
                    <div className="pt-2">
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${viewingOrderDetail.customerDetails.address}, ${viewingOrderDetail.customerDetails.landmark}, ${viewingOrderDetail.customerDetails.area}, Siddharthnagar`)}`}
                        target="_blank"
                        referrerPolicy="no-referrer"
                        className="inline-flex items-center gap-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 hover:text-neutral-900 font-mono text-[9px] font-extrabold px-2.5 py-1.5 rounded-xl transition"
                      >
                        <MapPin className="h-3 w-3 text-[#FF6321]" /> Navigate on Google Maps
                      </a>
                    </div>
                  </div>

                  {/* Dispatcher Actions & Runner Assignment */}
                  <div className="border border-neutral-200 rounded-2xl p-4 space-y-3 bg-white flex flex-col justify-between">
                    <div>
                      <h5 className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest block border-b pb-1">
                        Advanced Dispatcher Assignment
                      </h5>
                      
                      <div className="space-y-2 mt-3">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 block">
                          Assigned Delivery Runner
                        </label>
                        <select
                          value={viewingOrderDetail.runnerId || ''}
                          onChange={async (e) => {
                            const val = e.target.value;
                            if (val === '') {
                              if (onUpdateOrderRunner) {
                                await onUpdateOrderRunner(viewingOrderDetail.id, '', '');
                                setViewingOrderDetail({ ...viewingOrderDetail, runnerId: '', runnerName: '' });
                                showToast('Runner unassigned successfully.', 'success');
                              }
                            } else {
                              const found = runners.find(r => r.id === val);
                              if (found && onUpdateOrderRunner) {
                                await onUpdateOrderRunner(viewingOrderDetail.id, found.id, found.name);
                                setViewingOrderDetail({ ...viewingOrderDetail, runnerId: found.id, runnerName: found.name });
                                showToast(`Runner ${found.name} assigned to order.`, 'success');
                              }
                            }
                          }}
                          className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-2.5 py-2 text-xs text-neutral-800 font-semibold focus:outline-none focus:ring-1 focus:ring-[#FF6321] cursor-pointer"
                        >
                          <option value="">⚠️ Unassigned (In-House Staff)</option>
                          {runners.filter(r => r.status !== 'Offline').map(r => (
                            <option key={r.id} value={r.id}>
                              👤 {r.name} ({r.status})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="bg-neutral-50 p-2.5 rounded-xl border border-neutral-100 mt-3 text-[10px] text-neutral-500 font-mono leading-relaxed space-y-1">
                        <div className="flex justify-between">
                          <span>SLA Target Limit:</span>
                          <span className="font-bold text-neutral-700">30 Mins (Express SLA)</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Estimated Radius:</span>
                          <span className="font-bold text-neutral-700">
                            {viewingOrderDetail.customerDetails.area === 'Station Road' ? '~1.2 km' :
                             viewingOrderDetail.customerDetails.area === 'Birdpur' ? '~6.5 km' :
                             viewingOrderDetail.customerDetails.area === 'Siddharthnagar' ? '~1.8 km' : '~2.5 km'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={() => {
                          handlePrintOrder(viewingOrderDetail);
                        }}
                        className="w-full flex items-center justify-center gap-2 bg-neutral-100 hover:bg-[#FF6321] hover:text-white text-neutral-700 text-[10px] font-extrabold py-2 px-3 rounded-xl transition cursor-pointer uppercase tracking-wider font-display"
                      >
                        <Printer className="h-3.5 w-3.5" /> Print Thermal Bill Invoice
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. ORDERED CATALOG ITEMS LIST */}
                <div className="border border-neutral-200 rounded-2xl overflow-hidden bg-white">
                  <div className="bg-neutral-50/60 p-3 border-b border-neutral-100 flex justify-between items-center">
                    <span className="font-bold text-neutral-700">Ordered Catalog Items</span>
                    <span className="font-mono text-[10px] text-neutral-400 font-semibold">
                      {viewingOrderDetail.items.reduce((acc, it) => acc + it.quantity, 0)} Items Sourced
                    </span>
                  </div>
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-neutral-50/30 border-b border-neutral-100 text-neutral-400 font-mono text-[9px] uppercase font-bold">
                        <th className="py-2.5 px-4">Item details</th>
                        <th className="py-2.5 px-4 text-center">Unit Price</th>
                        <th className="py-2.5 px-4 text-center">Quantity</th>
                        <th className="py-2.5 px-4 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {viewingOrderDetail.items.map((item, index) => (
                        <tr key={index} className="hover:bg-neutral-50/20 transition">
                          <td className="py-3 px-4">
                            <span className="font-bold text-neutral-800 block">{item.product.name}</span>
                            <span className="text-[9px] text-neutral-400 block font-mono">
                              {item.product.category} • {item.product.unit}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-neutral-600">
                            ₹{item.product.price}
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-neutral-700">
                            {item.quantity}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-extrabold text-neutral-800">
                            ₹{item.product.price * item.quantity}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  <div className="p-4 bg-neutral-50 border-t border-neutral-100 flex flex-col items-end gap-1 font-mono text-[11px] font-bold text-neutral-500">
                    <div className="flex justify-between w-full max-w-xs">
                      <span>Items Subtotal:</span>
                      <span className="text-neutral-700">₹{viewingOrderDetail.estimatedAmount}</span>
                    </div>
                    <div className="flex justify-between w-full max-w-xs">
                      <span>Delivery Runner SLA Fee:</span>
                      <span className="text-neutral-700">₹{viewingOrderDetail.deliveryCharge}</span>
                    </div>
                    <div className="flex justify-between w-full max-w-xs border-t pt-1 text-sm font-black text-neutral-900">
                      <span>Total Invoice Due:</span>
                      <span className="text-[#FF6321]">₹{viewingOrderDetail.totalAmount}</span>
                    </div>
                  </div>
                </div>

                {/* SPECIAL NOTES */}
                {(viewingOrderDetail.customerNotes || viewingOrderDetail.customerDetails.customerNotes || viewingOrderDetail.customerDetails.instructions) && (
                  <div className="bg-amber-50/40 border border-amber-200/60 p-4 rounded-2xl space-y-1 leading-normal text-[10px]">
                    <span className="text-[9px] font-bold text-amber-800 uppercase tracking-wider block font-display">Special Delivery Directives</span>
                    {viewingOrderDetail.customerDetails.instructions && (
                      <p className="text-amber-800"><span className="font-bold">Checkout Instructions:</span> "{viewingOrderDetail.customerDetails.instructions}"</p>
                    )}
                    {(viewingOrderDetail.customerNotes || viewingOrderDetail.customerDetails.customerNotes) && (
                      <p className="text-amber-800"><span className="font-bold">Order Custom Notes:</span> "{viewingOrderDetail.customerNotes || viewingOrderDetail.customerDetails.customerNotes}"</p>
                    )}
                  </div>
                )}

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- DELIVERY RUNNER REGISTER / EDIT FORM MODAL --- */}
      <AnimatePresence>
        {runnerModalOpen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto no-print">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-950 border border-neutral-800 rounded-3xl w-full max-w-md overflow-hidden text-left shadow-2xl"
            >
              <div className="bg-neutral-900 p-5 border-b border-neutral-800 flex justify-between items-center">
                <h4 className="font-display font-black text-xs text-white uppercase tracking-tight flex items-center gap-2">
                  <Truck className="h-4 w-4 text-[#FF6321]" /> {editingRunner ? 'Modify Delivery Runner' : 'Enroll Delivery Runner'}
                </h4>
                <button
                  onClick={() => setRunnerModalOpen(false)}
                  className="text-neutral-500 hover:text-white transition text-xs font-semibold cursor-pointer border border-neutral-800 bg-neutral-950/50 px-2 py-1 rounded-xl"
                >
                  [X]
                </button>
              </div>

              <form onSubmit={handleRunnerSubmit} className="p-5 space-y-4 text-xs text-neutral-300">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={rName}
                    onChange={(e) => setRName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 placeholder-neutral-600 font-sans animate-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Mobile / Contact Number *</label>
                  <input
                    type="text"
                    required
                    value={rMobile}
                    onChange={(e) => setRMobile(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 placeholder-neutral-600 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Default Availability Status</label>
                  <select
                    value={rStatus}
                    onChange={(e) => setRStatus(e.target.value as any)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-orange-500 cursor-pointer font-sans"
                  >
                    <option value="Active">🟢 Active & Available</option>
                    <option value="On Delivery">🟡 On Active Delivery</option>
                    <option value="Offline">⚫ Offline / Away</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#FF6321] hover:bg-orange-600 text-white font-extrabold py-3 rounded-xl text-xs transition duration-200 uppercase tracking-wider font-display shadow-md shadow-orange-500/10 hover:shadow-orange-500/20 active:scale-98 cursor-pointer"
                >
                  {editingRunner ? 'Update Runner Records' : 'Save and Register Runner'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {selectedOrder && (
        <div className="hidden print:block print-invoice">
          {/* Header section */}
          <div className="print-header print-invoice-section">
            <div className="print-logo-box">LX</div>
            <div className="print-title">Local Xpress Delivery</div>
            <div className="text-[10px] font-mono mt-1 text-black">Station Road, Siddharthnagar, UP • +91 98765 43210</div>
          </div>

          {/* Meta details section */}
          <div className="print-meta-grid print-invoice-section">
            <div className="print-meta-col text-left">
              <div className="print-meta-label">Invoice Ref</div>
              <div className="print-meta-val font-mono font-bold text-black">{selectedOrder.id}</div>
            </div>
            <div className="print-meta-col text-right">
              <div className="print-meta-label">Date & Time</div>
              <div className="print-meta-val font-mono text-black">{selectedOrder.date} • {selectedOrder.time}</div>
            </div>
          </div>

          {/* Delivery & Payment details section */}
          <div className="print-meta-grid print-invoice-section">
            <div className="print-meta-col text-left">
              <div className="print-meta-label">Deliver To</div>
              <div className="print-meta-val font-bold text-black">{selectedOrder.customerDetails.name}</div>
              <div className="print-meta-val font-mono mt-0.5 text-black">{selectedOrder.customerDetails.mobile}</div>
              <div className="print-meta-val mt-1 text-black text-[9px] leading-tight">
                {selectedOrder.customerDetails.address}, {selectedOrder.customerDetails.landmark}, {selectedOrder.customerDetails.area} - {selectedOrder.customerDetails.pincode}
              </div>
            </div>
            <div className="print-meta-col text-right">
              <div className="print-meta-label">Payment Option</div>
              <div className="print-meta-val font-bold text-black">{selectedOrder.customerDetails.paymentMethod} Payment</div>
              {selectedOrder.customerDetails.instructions && (
                <div className="mt-2 text-left border border-dashed border-black p-1.5 rounded-xs">
                  <div className="print-meta-label text-[7px] block mb-0.5">Special Instructions</div>
                  <div className="print-meta-val italic text-[9px] leading-tight">"{selectedOrder.customerDetails.instructions}"</div>
                </div>
              )}
              {(selectedOrder.customerNotes || selectedOrder.customerDetails.customerNotes) && (
                <div className="mt-2 text-left border border-dashed border-black p-1.5 rounded-xs">
                  <div className="print-meta-label text-[7px] block mb-0.5">Customer Notes</div>
                  <div className="print-meta-val italic text-[9px] leading-tight">"{selectedOrder.customerNotes || selectedOrder.customerDetails.customerNotes}"</div>
                </div>
              )}
            </div>
          </div>

          {/* Order line items section */}
          <div className="print-invoice-section">
            <div className="print-section-title">Order Line Items</div>
            <table className="print-items-table">
              <thead>
                <tr>
                  <th className="text-left py-1">Item Details</th>
                  <th className="text-center w-12 py-1">Qty</th>
                  <th className="text-right w-24 py-1">Price</th>
                </tr>
              </thead>
              <tbody>
                {selectedOrder.items.map((item, index) => (
                  <tr key={index} className="border-b border-dashed border-neutral-200 last:border-0">
                    <td className="py-2">
                      <span className="font-bold text-black block text-[10px]">{item.product.name}</span>
                      <span className="text-[8px] text-neutral-600 uppercase font-mono block mt-0.5">
                        {item.product.category} • {item.product.unit}
                      </span>
                    </td>
                    <td className="py-2 text-center font-mono font-bold text-black">{item.quantity}</td>
                    <td className="py-2 text-right font-mono font-bold text-black">
                      ₹{item.product.price ? item.product.price * item.quantity : 'Market Price'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div className="print-totals print-invoice-section">
            <div className="print-totals-row">
              <span>Items Subtotal:</span>
              <span className="font-mono">₹{selectedOrder.estimatedAmount}</span>
            </div>
            <div className="print-totals-row">
              <span>Delivery Runner Fee:</span>
              <span className="font-mono">₹{selectedOrder.deliveryCharge}</span>
            </div>
            <div className="print-totals-grand">
              <span>Total Amount Due:</span>
              <span className="font-mono">₹{selectedOrder.totalAmount}</span>
            </div>
          </div>

          {/* Footer block */}
          <div className="print-footer print-invoice-section">
            Thank you for supporting third-party local merchants via Local Xpress!
            <div className="text-[7px] font-mono mt-1.5 font-normal tracking-normal text-neutral-500">
              Powered by Local Xpress Dispatch Terminal
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
