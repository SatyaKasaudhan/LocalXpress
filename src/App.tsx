import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Lock, Eye, EyeOff, User, Sparkles, ShieldAlert, AlertTriangle, 
  Trash2, Plus, Minus, ArrowRight, ShoppingCart, MessageSquare,
  Volume2, ShieldCheck, Clock, X
} from 'lucide-react';

import { Product, CartItem, CustomerDetails, Order, Vendor, CustomerSummary, UserRole, AppNotification, OrderStatus, PurchaseRecord, BroadcastMessage, Runner, Offer } from './types';
import { INITIAL_PRODUCTS, INITIAL_VENDORS, INITIAL_ORDERS, INITIAL_CUSTOMERS } from './mockData';
import { generateOrderId, getTodayDateStr, getFormattedTime, playNotificationSound } from './utils';

import Navbar from './components/Navbar';
import PublicWebsite from './components/PublicWebsite';
import AdminPanel from './components/AdminPanel';
import LocalXpressLogo from './components/LocalXpressLogo';
import { ToastProvider, useToast } from './components/Toast';

// Firebase Integrations
import { auth } from './lib/firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { 
  seedDatabaseIfEmpty, 
  subscribeToOrders, 
  subscribeToVendors, 
  subscribeToCustomers, 
  createOrderInFirestore, 
  updateOrderStatusInFirestore, 
  saveVendorInFirestore,
  deleteVendorFromFirestore,
  subscribeToProducts,
  saveProductInFirestore,
  deleteProductFromFirestore,
  subscribeToBroadcasts,
  sendBroadcastInFirestore,
  deleteBroadcastFromFirestore,
  subscribeToRunners,
  saveRunnerInFirestore,
  deleteRunnerFromFirestore,
  updateOrderRunnerInFirestore,
  subscribeToOffers
} from './lib/dbService';

import { syncSingleOrderToSheet } from './lib/workspaceService';

// Default system configurations
const DEFAULT_WHATSAPP_NUMBER = '919260933792';
const DEFAULT_GOOGLE_FORM_URL = 'https://docs.google.com/forms/u/0/d/e/1FAIpQLSfp_k7v43v1u1-t87v-yF9D-Vv_V-y_V6y_Vv-y_V6y_Vv_Vw/formResponse';

function MainApp() {
  const { showToast } = useToast();

  // Dark Mode Theme State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const stored = localStorage.getItem('lx_theme');
    if (stored) {
      return stored === 'dark';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Apply dark mode on mount or state change
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('lx_theme', 'dark');
      root.style.setProperty('--bg-app', '#0a0a0a');
      root.style.setProperty('--bg-card', '#141414');
      root.style.setProperty('--bg-input', '#1e1e1e');
      root.style.setProperty('--bg-popover', '#1c1c1c');
      root.style.setProperty('--text-primary', '#e5e5e5');
      root.style.setProperty('--text-secondary', '#a3a3a3');
      root.style.setProperty('--border-color', '#262626');
      root.style.setProperty('--border-muted', '#1c1c1c');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('lx_theme', 'light');
      root.style.setProperty('--bg-app', '#f5f5f5');
      root.style.setProperty('--bg-card', '#ffffff');
      root.style.setProperty('--bg-input', '#fafafa');
      root.style.setProperty('--bg-popover', '#ffffff');
      root.style.setProperty('--text-primary', '#171717');
      root.style.setProperty('--text-secondary', '#525252');
      root.style.setProperty('--border-color', '#e5e5e5');
      root.style.setProperty('--border-muted', '#f5f5f5');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
    showToast(
      !isDarkMode ? 'Dark Mode Active 🌙 (Midnight theme)' : 'Light Mode Active ☀️ (Daylight theme)',
      'success'
    );
  };

  // Roles & Authentication States
  const [currentRole, setRole] = useState<UserRole>('Customer');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Core database states (backed up in LocalStorage)
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [productsLoading, setProductsLoading] = useState(true);
  const [broadcasts, setBroadcasts] = useState<BroadcastMessage[]>([]);
  const [runners, setRunners] = useState<Runner[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [lastPlacedOrder, setLastPlacedOrder] = useState<Order | null>(null);
  const [whatsAppPrompt, setWhatsAppPrompt] = useState<{
    isOpen: boolean;
    orderId: string;
    customerName: string;
    mobile: string;
    body: string;
  } | null>(null);

  // Configurations
  const [googleFormUrl, setGoogleFormUrl] = useState(DEFAULT_GOOGLE_FORM_URL);
  const [whatsappNumber, setWhatsappNumber] = useState(DEFAULT_WHATSAPP_NUMBER);

  // Codeless Customization & Branding States
  const [shopTitle, setShopTitle] = useState<string>(() => localStorage.getItem('lx_shop_title') || 'Local Xpress');
  const [shopHeroHeadline, setShopHeroHeadline] = useState<string>(() => localStorage.getItem('lx_shop_hero_headline') || 'Anything you need from local shops, delivered in minutes.');
  const [shopHeroDescription, setShopHeroDescription] = useState<string>(() => localStorage.getItem('lx_shop_hero_description') || 'We shop for you! From groceries and medicines to fresh bakes and hot restaurant food. We buy directly from your favorite local shops in Siddharthnagar & Birdpur and deliver straight to your doorstep.');
  const [serviceRadius, setServiceRadius] = useState<string>(() => localStorage.getItem('lx_service_radius') || '5 KM');
  const [workingHours, setWorkingHours] = useState<string>(() => localStorage.getItem('lx_working_hours') || '5 AM - 11 PM');
  const [baseDeliveryCharge, setBaseDeliveryCharge] = useState<number>(() => parseInt(localStorage.getItem('lx_base_delivery_charge') || '40', 10));
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState<number>(() => parseInt(localStorage.getItem('lx_free_delivery_threshold') || '500', 10));

  // Layout states
  const [cartOpen, setCartOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');

  // Activity timer refs for auto logout (5 minutes)
  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- INITIALIZE DATABASE & REALTIME SYNCHRONIZATION ---
  useEffect(() => {
    let unsubscribeOrders = () => {};
    let unsubscribeVendors = () => {};
    let unsubscribeCustomers = () => {};
    let unsubscribeProducts = () => {};
    let unsubscribeBroadcasts = () => {};
    let unsubscribeRunners = () => {};
    let unsubscribeOffers = () => {};

    // 1. Seed & Subscribe
    seedDatabaseIfEmpty().then(() => {
      unsubscribeOrders = subscribeToOrders((updatedOrders) => {
        setOrders(updatedOrders);
        setOrdersLoading(false);
      });

      unsubscribeVendors = subscribeToVendors((updatedVendors) => {
        setVendors(updatedVendors);
      });

      unsubscribeCustomers = subscribeToCustomers((updatedCustomers) => {
        setCustomers(updatedCustomers);
      });

      unsubscribeProducts = subscribeToProducts((updatedProducts) => {
        if (updatedProducts && updatedProducts.length > 0) {
          setProducts(updatedProducts);
        } else {
          setProducts(INITIAL_PRODUCTS);
        }
        setProductsLoading(false);
      });

      unsubscribeBroadcasts = subscribeToBroadcasts((updatedBroadcasts) => {
        setBroadcasts(updatedBroadcasts);
      });

      unsubscribeRunners = subscribeToRunners((updatedRunners) => {
        setRunners(updatedRunners);
      });

      unsubscribeOffers = subscribeToOffers((updatedOffers) => {
        setOffers(updatedOffers);
      });
    }).catch(err => {
      console.error("Firebase Seeding failed:", err);
      setOrdersLoading(false);
      setProductsLoading(false);
    });

    // 2. Load Cart
    const storedCart = localStorage.getItem('lx_cart');
    if (storedCart) {
      setCart(JSON.parse(storedCart));
    }

    // 3. Load Configurations
    const storedGForm = localStorage.getItem('lx_gform_url');
    if (storedGForm) setGoogleFormUrl(storedGForm);
    const storedWA = localStorage.getItem('lx_wa_number');
    if (storedWA) setWhatsappNumber(storedWA);

    // 4. Set up Firebase Auth Observer
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsLoggedIn(true);
        const storedSession = localStorage.getItem('lx_session');
        if (storedSession) {
          const sess = JSON.parse(storedSession);
          setRole(sess.role);
        } else {
          setRole('Customer');
        }
      } else {
        setIsLoggedIn(false);
        setRole('Customer');
      }
    });

    return () => {
      unsubscribeOrders();
      unsubscribeVendors();
      unsubscribeCustomers();
      unsubscribeProducts();
      unsubscribeBroadcasts();
      unsubscribeRunners();
      unsubscribeOffers();
      unsubscribeAuth();
    };
  }, []);

  // --- DEEP LINKING URL PARAMETERS CHECK FOR WHATSAPP INVOICES ---
  useEffect(() => {
    if (ordersLoading || orders.length === 0) return;
    
    const params = new URLSearchParams(window.location.search);
    const trackId = params.get('track');
    const viewVal = params.get('view');
    
    if (trackId) {
      const matchedOrder = orders.find(o => o.id.toLowerCase() === trackId.toLowerCase());
      if (matchedOrder) {
        // Set mobile tracking in localStorage so PublicWebsite component can pick it up
        localStorage.setItem('lx_tracked_mobile', matchedOrder.id);
        
        // If view=invoice is requested, trigger the Digital Invoice Modal
        if (viewVal === 'invoice') {
          setLastPlacedOrder(matchedOrder);
        }
        
        // Scroll to the order history section after a tiny delay
        setTimeout(() => {
          const element = document.getElementById('order-history');
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
          }
        }, 500);

        // Remove tracking params from URL query without refreshing the page
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    }
  }, [orders, ordersLoading]);

  // Trigger notification when a new broadcast is received
  const prevBroadcastsRef = useRef<BroadcastMessage[]>([]);
  useEffect(() => {
    if (prevBroadcastsRef.current.length > 0 && broadcasts.length > prevBroadcastsRef.current.length) {
      const newItems = broadcasts.filter(
        b => !prevBroadcastsRef.current.some(pb => pb.id === b.id)
      );

      newItems.forEach(item => {
        playNotificationSound();
        const timeStr = new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const newAlert: AppNotification = {
          id: item.id,
          title: `📢 ${item.type === 'urgent' ? '🔴 URGENT: ' : item.type === 'warning' ? '⚠️ WARNING: ' : ''}${item.title}`,
          message: `${item.message} (From: ${item.senderName})`,
          time: timeStr,
          read: false
        };
        setNotifications(prev => [newAlert, ...prev]);

        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('📢 NEW STAFF BROADCAST', {
            body: `${item.title}: ${item.message} (by ${item.senderName})`,
            icon: '/favicon.ico'
          });
        }
      });
    }
    prevBroadcastsRef.current = broadcasts;
  }, [broadcasts]);

  // Sync state helpers to update local state + cache simultaneously
  const updateOrdersState = (newOrders: Order[]) => {
    setOrders(newOrders);
    localStorage.setItem('lx_orders', JSON.stringify(newOrders));
  };

  const updateVendorsState = (newVendors: Vendor[]) => {
    setVendors(newVendors);
    localStorage.setItem('lx_vendors', JSON.stringify(newVendors));
  };

  const updateCustomersState = (newCustomers: CustomerSummary[]) => {
    setCustomers(newCustomers);
    localStorage.setItem('lx_customers', JSON.stringify(newCustomers));
  };

  const updateCartState = (newCart: CartItem[]) => {
    setCart(newCart);
    localStorage.setItem('lx_cart', JSON.stringify(newCart));
  };

  // --- AUTO LOGOUT INACTIVITY ENGINE (5 Mins) ---
  const resetActivityTimer = () => {
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
    }

    // Only run inactivity logout if user is actually logged in as Admin or Staff
    if (isLoggedIn) {
      activityTimeoutRef.current = setTimeout(() => {
        handleLogout();
        showToast('Logged out automatically due to inactivity', 'warning');
      }, 5 * 60 * 1000); // 5 Minutes
    }
  };

  useEffect(() => {
    const handleUserInteraction = () => {
      resetActivityTimer();
    };

    // Listen to mouse, key press, scroll, touch
    window.addEventListener('mousemove', handleUserInteraction);
    window.addEventListener('keydown', handleUserInteraction);
    window.addEventListener('click', handleUserInteraction);
    window.addEventListener('scroll', handleUserInteraction);
    window.addEventListener('touchstart', handleUserInteraction);

    // Initial trigger
    resetActivityTimer();

    return () => {
      if (activityTimeoutRef.current) clearTimeout(activityTimeoutRef.current);
      window.removeEventListener('mousemove', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);
      window.removeEventListener('click', handleUserInteraction);
      window.removeEventListener('scroll', handleUserInteraction);
      window.removeEventListener('touchstart', handleUserInteraction);
    };
  }, [isLoggedIn]);

  // --- CART OPERATIONS ---
  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.product.id === product.id);
    let updated: CartItem[];
    if (existing) {
      updated = cart.map(item => 
        item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      );
    } else {
      updated = [...cart, { product, quantity: 1 }];
    }
    updateCartState(updated);
    showToast(`Added ${product.name} to cart.`, 'success');
  };

  const removeFromCart = (productId: string) => {
    const item = cart.find(i => i.product.id === productId);
    const updated = cart.filter(i => i.product.id !== productId);
    updateCartState(updated);
    if (item) {
      showToast(`Removed ${item.product.name} from cart.`, 'info');
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    const item = cart.find(i => i.product.id === productId);
    if (!item) return;

    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      removeFromCart(productId);
    } else {
      const updated = cart.map(i => 
        i.product.id === productId ? { ...i, quantity: newQty } : i
      );
      updateCartState(updated);
    }
  };

  const clearCart = () => {
    updateCartState([]);
    showToast('Your shopping cart has been cleared.', 'info');
  };

  // --- AUTHENTICATION FLOWS ---
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername || !loginPassword) {
      setLoginError('Please enter both username and password.');
      return;
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: loginUsername,
          password: loginPassword,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setRole(data.role);
        setIsLoggedIn(true);
        setLoginError('');
        setLoginUsername('');
        setLoginPassword('');
        localStorage.setItem('lx_session', JSON.stringify({ role: data.role, username: data.username }));
        showToast(`${data.role} access granted. Welcome to the portal!`, 'success');
      } else {
        const errorMsg = data.error || 'Invalid credentials. Please try again.';
        setLoginError(errorMsg);
        showToast(`Login Failed: ${errorMsg}`, 'error');
      }
    } catch (err: any) {
      console.error('Authentication request failed:', err);
      setLoginError('Server authentication is currently unreachable. Try again later.');
      showToast('Login Error: Server unreachable', 'error');
    }
  };


  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsLoggedIn(false);
      setRole('Customer');
      localStorage.removeItem('lx_session');
      showToast('Logged out securely.', 'info');
    } catch (error: any) {
      console.error(error);
    }
  };

  // --- ORDER SUBMISSION INTEGRATION (WHATSAPP + GOOGLE SHEETS) ---
  const handlePlaceOrderSubmit = (details: CustomerDetails, appliedDiscount = 0, appliedOfferCode = '') => {
    const orderId = generateOrderId(orders);
    const todayDate = getTodayDateStr();
    const timeStr = getFormattedTime();

    // 1. Calculate Amounts
    const itemsSubtotal = cart.reduce((acc, item) => acc + (item.product.price || 0) * item.quantity, 0);
    const deliveryCharge = itemsSubtotal > freeDeliveryThreshold ? 20 : baseDeliveryCharge;
    const totalAmount = Math.max(0, itemsSubtotal + deliveryCharge - appliedDiscount);

    const newOrder: Order = {
      id: orderId,
      date: todayDate,
      time: timeStr,
      customerDetails: details,
      items: [...cart],
      estimatedAmount: itemsSubtotal,
      deliveryCharge,
      totalAmount,
      status: 'Pending',
      customerNotes: details.customerNotes || '',
      appliedDiscount,
      appliedOfferCode
    };

    // 2. Format WhatsApp Message
    const itemsDescription = cart.map(item => `• ${item.product.name} (x${item.quantity}) - ₹${(item.product.price || 0) * item.quantity}`).join('\n');
    
    let promoDetails = '';
    if (appliedOfferCode) {
      promoDetails = `*🎁 Offer Applied:* ${appliedOfferCode} (-₹${appliedDiscount})\n`;
    }

    const waMessage = `🛒 *LOCAL XPRESS NEW ORDER*\n\n` +
      `*Order ID:* ${orderId}\n\n` +
      `*👤 Customer:* ${details.name}\n` +
      `*📞 Mobile:* ${details.mobile}\n` +
      `*📍 Address:* ${details.address}, ${details.landmark}, ${details.area} (Pincode: ${details.pincode || 'N/A'})\n\n` +
      `*📦 Items Ordered:*\n${itemsDescription}\n\n` +
      `*💵 Est. Items Subtotal:* ₹${itemsSubtotal}\n` +
      `*⚡ Runner Delivery Slabs:* ₹${deliveryCharge}\n` +
      promoDetails +
      `*💰 Total Payable Amount:* *₹${totalAmount}*\n\n` +
      `*💳 Payment Method:* ${details.paymentMethod}\n` +
      `*💡 Instructions:* ${details.instructions || 'None'}\n` +
      `*📝 Customer Notes:* ${details.customerNotes || 'None'}\n\n` +
      `*🕒 Date:* ${todayDate} • ${timeStr}\n\n` +
      `_Please leave this message formatted as is and click SEND to submit to our terminal dispatcher!_`;

    // 3. Post to Google Form / Sheet securely via server-side API proxy
    const fields = {
      'entry.12026001': orderId,
      'entry.12026002': todayDate,
      'entry.12026003': timeStr,
      'entry.12026004': details.name,
      'entry.12026005': details.mobile,
      'entry.12026006': details.address,
      'entry.12026007': details.landmark,
      'entry.12026008': details.area,
      'entry.12026009': itemsDescription,
      'entry.12026010': String(totalAmount),
      'entry.12026011': details.paymentMethod,
      'entry.12026012': details.instructions || 'None',
      'entry.12026013': 'Pending',
      'entry.12026014': details.customerNotes || 'None',
    };

    fetch('/api/google-form/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        googleFormUrl,
        fields
      })
    })
    .then(res => res.json())
    .then((resData) => {
      if (resData.success) {
        console.log('Successfully synchronized order data to Google Sheet via server-side proxy.');
      } else {
        console.warn('Google Sheets sync backend reported warning:', resData);
      }
    })
    .catch((err) => {
      console.warn('Google Sheets sync backend request failed:', err);
    });

    // 4. Update core Firestore database logs
    createOrderInFirestore(newOrder)
      .then(() => {
        showToast(`Order ${orderId} synchronized to live database.`, 'success');

        // Google Sheets Auto Sync for newly placed order
        const token = sessionStorage.getItem("lx_g_token");
        const sheetId = localStorage.getItem("lx_g_sheet_id");
        const autoSync = localStorage.getItem("lx_g_auto_sync") !== "false";

        if (token && sheetId && autoSync) {
          syncSingleOrderToSheet(token, sheetId, newOrder)
            .then(() => {
              console.log(`Auto-synced new order #${orderId} to Google Sheet.`);
            })
            .catch((err) => {
              console.error("Auto-sync new order to Sheet failed:", err);
            });
        }
      })
      .catch((err) => {
        console.error("Firestore Order placement failed:", err);
      });

    // 5. Fire Dispatch Alerts & Sound
    playNotificationSound();
    
    const newAlert: AppNotification = {
      id: Math.random().toString(36).substring(2, 9),
      title: `⚡ New Order ${orderId}`,
      message: `Placed by ${details.name} at ${details.area} for ₹${totalAmount}`,
      time: timeStr,
      read: false
    };
    setNotifications([newAlert, ...notifications]);

    // Trigger standard browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🛒 LOCAL XPRESS NEW ORDER', {
        body: `Order ${orderId} received. Sourcing items from nearby shops!`,
        icon: '/favicon.ico'
      });
    }

    // 6. Clear shopping cart & trigger WhatsApp launch
    updateCartState([]);
    setCartOpen(false);
    setLastPlacedOrder(newOrder);

    showToast(`Order ${orderId} created! Opening Invoice & WhatsApp...`, 'success');

    // Launch WhatsApp
    const waUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(waMessage)}`;
    window.open(waUrl, '_blank');
  };

  // --- ACTIONS FOR BACKOFFICE ---
  const triggerWhatsAppNotification = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) {
      console.warn(`[WhatsApp] Order ${orderId} not found in state, skipping WhatsApp trigger.`);
      return;
    }
    const mobile = order.customerDetails.mobile;
    const name = order.customerDetails.name;
    const totalAmount = order.totalAmount;

    fetch('/api/send-whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: mobile,
        orderId,
        customerName: name,
        totalAmount,
        originUrl: window.location.origin
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        showToast(`WhatsApp invoice dispatch prepared!`, 'success');
        
        // Show our high-impact, popup-blocker safe WhatsApp dispatch modal in the UI
        setWhatsAppPrompt({
          isOpen: true,
          orderId,
          customerName: name,
          mobile,
          body: data.body
        });
      } else {
        showToast(`WhatsApp dispatch failed: ${data.error || 'Unknown error'}`, 'error');
      }
    })
    .catch(err => {
      console.error("WhatsApp notification network error:", err);
      showToast('Could not reach WhatsApp gateway backend.', 'error');
    });
  };

  const handleUpdateOrderStatus = (orderId: string, status: OrderStatus) => {
    if (status === 'Delivered') {
      triggerWhatsAppNotification(orderId);
    }

    updateOrderStatusInFirestore(orderId, status)
      .then(() => {
        showToast(`Order ${orderId} status set to ${status}.`, 'success');

        // Google Sheets Auto Sync
        const targetOrder = orders.find(o => o.id === orderId);
        if (targetOrder) {
          const updatedOrder = { ...targetOrder, status };
          const token = sessionStorage.getItem("lx_g_token");
          const sheetId = localStorage.getItem("lx_g_sheet_id");
          const autoSync = localStorage.getItem("lx_g_auto_sync") !== "false";

          if (token && sheetId && autoSync) {
            syncSingleOrderToSheet(token, sheetId, updatedOrder)
              .then(() => {
                console.log(`Auto-synced order #${orderId} to Google Sheet.`);
              })
              .catch((err) => {
                console.error("Auto-sync to Sheet failed:", err);
              });
          }
        }
      })
      .catch((err) => {
        console.error("Firestore update status failed:", err);
      });

    // Synthesize beep on status updates
    playNotificationSound();
  };

  const handleAddVendor = (v: Omit<Vendor, 'id'>) => {
    const nextId = `VND${String(vendors.length + 1).padStart(3, '0')}`;
    const newVendor: Vendor = { ...v, id: nextId };
    saveVendorInFirestore(newVendor)
      .then(() => {
        showToast(`Vendor ${v.shopName} successfully registered under ${nextId}!`, 'success');
      })
      .catch((err) => {
        console.error("Firestore vendor save failed:", err);
      });
  };

  const handleUpdateVendor = (v: Vendor) => {
    saveVendorInFirestore(v)
      .then(() => {
        showToast(`Shop ${v.shopName} details updated.`, 'success');
      })
      .catch((err) => {
        console.error("Firestore vendor update failed:", err);
      });
  };

  const handleDeleteVendor = (id: string) => {
    if (confirm('Are you absolutely sure you want to remove this shop vendor?')) {
      deleteVendorFromFirestore(id)
        .then(() => {
          showToast('Vendor shop removed.', 'info');
        })
        .catch((err) => {
          console.error("Firestore vendor delete failed:", err);
        });
    }
  };

  const handleAddProduct = async (product: Omit<Product, 'id'>) => {
    try {
      const id = `p-${Date.now()}`;
      const newProduct: Product = { ...product, id };
      await saveProductInFirestore(newProduct);
      showToast(`Product "${product.name}" added successfully!`, 'success');
    } catch (err: any) {
      console.error("Failed to add product:", err);
      showToast(`Failed to add product: ${err.message}`, 'error');
    }
  };

  const handleUpdateProduct = async (product: Product) => {
    try {
      await saveProductInFirestore(product);
      showToast(`Product "${product.name}" updated successfully!`, 'success');
    } catch (err: any) {
      console.error("Failed to update product:", err);
      showToast(`Failed to update product: ${err.message}`, 'error');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      await deleteProductFromFirestore(productId);
      showToast('Product deleted successfully!', 'success');
    } catch (err: any) {
      console.error("Failed to delete product:", err);
      showToast(`Failed to delete product: ${err.message}`, 'error');
    }
  };

  const handleSaveShopTitle = (title: string) => {
    setShopTitle(title);
    localStorage.setItem('lx_shop_title', title);
  };
  const handleSaveHeroHeadline = (headline: string) => {
    setShopHeroHeadline(headline);
    localStorage.setItem('lx_shop_hero_headline', headline);
  };
  const handleSaveHeroDescription = (desc: string) => {
    setShopHeroDescription(desc);
    localStorage.setItem('lx_shop_hero_description', desc);
  };
  const handleSaveServiceRadius = (rad: string) => {
    setServiceRadius(rad);
    localStorage.setItem('lx_service_radius', rad);
  };
  const handleSaveWorkingHours = (hours: string) => {
    setWorkingHours(hours);
    localStorage.setItem('lx_working_hours', hours);
  };
  const handleSaveBaseDeliveryCharge = (charge: number) => {
    setBaseDeliveryCharge(charge);
    localStorage.setItem('lx_base_delivery_charge', String(charge));
  };
  const handleSaveFreeDeliveryThreshold = (thresh: number) => {
    setFreeDeliveryThreshold(thresh);
    localStorage.setItem('lx_free_delivery_threshold', String(thresh));
  };

  const handleAddPurchaseRecord = (p: PurchaseRecord) => {
    triggerWhatsAppNotification(p.orderId);

    updateOrderStatusInFirestore(p.orderId, 'Delivered', p)
      .then(() => {
        showToast(`Bill receipt logged for order ${p.orderId}!`, 'success');
      })
      .catch((err) => {
        console.error("Firestore purchase ledger save failed:", err);
      });
  };

  // Save changes to settings
  const handleSaveGFormUrl = (url: string) => {
    setGoogleFormUrl(url);
    localStorage.setItem('lx_gform_url', url);
    showToast('Google Form Action URL updated successfully.', 'success');
  };

  const handleSaveWaNumber = (num: string) => {
    setWhatsappNumber(num);
    localStorage.setItem('lx_wa_number', num);
    showToast('WhatsApp Dispatch terminal updated.', 'success');
  };

  const handleMarkNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleNavigateToSection = (sectionId: string) => {
    setRole('Customer');
    setActiveSection(sectionId);
    
    // Delay scroll to let layout change
    setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  // Pre-grant notification permissions
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-between selection:bg-orange-500 selection:text-white">
      {/* Dynamic Header / Navbar */}
      <Navbar
        currentRole={currentRole}
        setRole={(role) => {
          if (role === 'Customer') {
            setIsLoggedIn(false);
            setRole('Customer');
            localStorage.removeItem('lx_session');
          } else if (role !== currentRole) {
            // Force re-authentication when switching roles
            setIsLoggedIn(false);
            setRole(role);
            localStorage.removeItem('lx_session');
            showToast(`Please authenticate with ${role} credentials to access this portal.`, 'info');
          }
        }}
        cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
        onOpenCart={() => setCartOpen(true)}
        notifications={notifications}
        onMarkNotificationsAsRead={handleMarkNotificationsAsRead}
        onNavigateToSection={handleNavigateToSection}
        activeSection={activeSection}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
        shopTitle={shopTitle}
        serviceRadius={serviceRadius}
      />

      {/* Main Container Router */}
      <div className="flex-1 flex flex-col">
        {currentRole === 'Customer' ? (
          <PublicWebsite
            cart={cart}
            addToCart={addToCart}
            removeFromCart={removeFromCart}
            updateQuantity={updateQuantity}
            clearCart={clearCart}
            onSubmitOrder={handlePlaceOrderSubmit}
            googleFormUrl={googleFormUrl}
            setGoogleFormUrl={handleSaveGFormUrl}
            onNavigateToAdmin={() => {
              setIsLoggedIn(false);
              setRole('Admin');
            }}
            orders={orders}
            whatsappNumber={whatsappNumber}
            lastPlacedOrder={lastPlacedOrder}
            onClearLastPlacedOrder={() => setLastPlacedOrder(null)}
            products={products}
            productsLoading={productsLoading}
            ordersLoading={ordersLoading}
            offers={offers}
            shopTitle={shopTitle}
            shopHeroHeadline={shopHeroHeadline}
            shopHeroDescription={shopHeroDescription}
            serviceRadius={serviceRadius}
            workingHours={workingHours}
            baseDeliveryCharge={baseDeliveryCharge}
            freeDeliveryThreshold={freeDeliveryThreshold}
          />
        ) : !isLoggedIn ? (
          /* Portal Login Form */
          <div className="flex-1 flex items-center justify-center p-4 py-16 bg-neutral-900">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-neutral-950 border border-neutral-800 rounded-3xl w-full max-w-sm p-6 text-left space-y-6 shadow-2xl relative"
            >
              <div className="space-y-1">
                <div className="pb-2">
                  <LocalXpressLogo className="h-8 max-w-[180px]" variant="white" />
                </div>
                <span className="bg-orange-500/10 text-orange-400 text-[10px] font-mono px-2 py-0.5 rounded font-bold border border-orange-500/20 uppercase">
                  DISPATCH CONSOLE SECURE
                </span>
                <h3 className="font-display font-bold text-xl text-white mt-3">
                  Local Xpress dispatcher portal login
                </h3>
                <p className="text-neutral-500 text-xs">
                  Enter credentials to gain access to role-based operational panels.
                </p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-wider">Username</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                    <input
                      type="text"
                      required
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      placeholder="admin or staff"
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-orange-500 placeholder-neutral-600"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-wider">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-10 py-2 text-xs text-white focus:outline-none focus:border-orange-500 placeholder-neutral-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {loginError && (
                  <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl flex items-start gap-2 text-xs">
                    <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{loginError}</span>
                  </div>
                )}



                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setRole('Customer');
                      setIsLoggedIn(false);
                    }}
                    className="flex-1 bg-neutral-900 hover:bg-neutral-850 text-neutral-400 font-semibold py-2.5 rounded-xl text-xs transition border border-neutral-800 cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer text-center"
                  >
                    Log In
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        ) : (
          /* Authenticated Dashboard Panel */
          <AdminPanel
            currentRole={currentRole}
            onLogout={handleLogout}
            orders={orders}
            ordersLoading={ordersLoading}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            vendors={vendors}
            onAddVendor={handleAddVendor}
            onUpdateVendor={handleUpdateVendor}
            onDeleteVendor={handleDeleteVendor}
            customers={customers}
            onAddPurchaseRecord={handleAddPurchaseRecord}
            googleFormUrl={googleFormUrl}
            setGoogleFormUrl={handleSaveGFormUrl}
            whatsappNumber={whatsappNumber}
            setWhatsappNumber={handleSaveWaNumber}
            products={products}
            productsLoading={productsLoading}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            shopTitle={shopTitle}
            setShopTitle={handleSaveShopTitle}
            shopHeroHeadline={shopHeroHeadline}
            setShopHeroHeadline={handleSaveHeroHeadline}
            shopHeroDescription={shopHeroDescription}
            setShopHeroDescription={handleSaveHeroDescription}
            serviceRadius={serviceRadius}
            setServiceRadius={handleSaveServiceRadius}
            workingHours={workingHours}
            setWorkingHours={handleSaveWorkingHours}
            baseDeliveryCharge={baseDeliveryCharge}
            setBaseDeliveryCharge={handleSaveBaseDeliveryCharge}
            freeDeliveryThreshold={freeDeliveryThreshold}
            setFreeDeliveryThreshold={handleSaveFreeDeliveryThreshold}
            broadcasts={broadcasts}
            onAddBroadcast={sendBroadcastInFirestore}
            onDeleteBroadcast={deleteBroadcastFromFirestore}
            runners={runners}
            onSaveRunner={saveRunnerInFirestore}
            onDeleteRunner={deleteRunnerFromFirestore}
            onUpdateOrderRunner={updateOrderRunnerInFirestore}
            offers={offers}
          />
        )}
      </div>

      {/* Persistent Shopping Cart Side Panel */}
      <AnimatePresence>
        {cartOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex justify-end no-print">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl"
            >
              {/* Header */}
              <div className="p-4 border-b border-neutral-100 flex justify-between items-center bg-neutral-900 text-white">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-orange-500 animate-float" />
                  <div>
                    <h3 className="font-display font-bold text-sm text-white">Your Delivery Cart</h3>
                    <p className="text-[10px] text-neutral-400 font-mono">SUPPORTING TOWN SHOPS</p>
                  </div>
                </div>
                <button
                  onClick={() => setCartOpen(false)}
                  className="text-neutral-400 hover:text-white text-xs font-semibold px-2 py-1 cursor-pointer"
                >
                  Close [X]
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-neutral-400 space-y-3">
                    <ShoppingCart className="h-10 w-10 text-neutral-300" />
                    <div>
                      <p className="text-xs font-semibold text-neutral-500">Your cart is empty.</p>
                      <p className="text-[11px] text-neutral-400 mt-0.5">Explore our town shop catalog to add items!</p>
                    </div>
                    <button
                      onClick={() => {
                        setCartOpen(false);
                        handleNavigateToSection('categories');
                      }}
                      className="text-xs font-bold text-orange-500 hover:underline cursor-pointer"
                    >
                      Browse Catalogue Now
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-100">
                    {cart.map((item) => (
                      <div key={item.product.id} className="py-3 flex gap-3 items-start justify-between">
                        <img 
                          src={item.product.image} 
                          alt={item.product.name} 
                          className="h-12 w-16 object-cover rounded-lg border border-neutral-100"
                        />
                        <div className="flex-1 text-left space-y-1">
                          <h4 className="text-xs font-bold text-neutral-800 leading-tight line-clamp-2">
                            {item.product.name}
                          </h4>
                          <p className="text-[10px] text-neutral-400 font-mono">Unit: {item.product.unit}</p>
                          <div className="text-[10px] text-orange-600 font-mono">
                            {item.product.price ? `₹${item.product.price} / unit` : 'Sourced on Arrival'}
                          </div>
                        </div>

                        <div className="flex flex-col items-end justify-between h-12 gap-1">
                          <button 
                            onClick={() => removeFromCart(item.product.id)}
                            className="text-neutral-400 hover:text-rose-500"
                            title="Delete Item"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>

                          <div className="flex items-center bg-neutral-100 rounded-lg p-0.5 border border-neutral-200">
                            <button
                              onClick={() => updateQuantity(item.product.id, -1)}
                              className="p-1 hover:bg-white rounded transition cursor-pointer"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="text-xs font-bold px-2.5 min-w-[20px] text-center">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.product.id, 1)}
                              className="p-1 hover:bg-white rounded transition cursor-pointer"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {cart.length > 0 && (
                <div className="p-4 border-t border-neutral-100 bg-neutral-50 space-y-4">
                  <div className="space-y-1.5 text-xs text-neutral-600 text-left font-mono">
                    <div className="flex justify-between">
                      <span>Items Subtotal:</span>
                      <span className="font-bold text-neutral-800">₹{cart.reduce((s,i) => s + (i.product.price || 0)*i.quantity, 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Delivery Service Slabs:</span>
                      <span className="font-bold text-neutral-800 font-mono">₹{cart.reduce((s,i) => s + (i.product.price || 0)*i.quantity, 0) > freeDeliveryThreshold ? 20 : baseDeliveryCharge}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-neutral-900 border-t border-dashed border-neutral-200 pt-2 font-display">
                      <span>Estimated Bill Due:</span>
                      <span className="text-orange-600 text-base font-bold">₹{
                        cart.reduce((s,i) => s + (i.product.price || 0)*i.quantity, 0) + 
                        (cart.reduce((s,i) => s + (i.product.price || 0)*i.quantity, 0) > freeDeliveryThreshold ? 20 : baseDeliveryCharge)
                      }</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={clearCart}
                      className="px-3 py-2.5 bg-white border border-neutral-200 hover:bg-neutral-100 text-neutral-500 rounded-xl transition text-xs font-semibold cursor-pointer"
                    >
                      Clear All
                    </button>
                    <button
                      onClick={() => {
                        setCartOpen(false);
                        // Open checkout form
                        // Delay click to let transition complete
                        setTimeout(() => {
                          const checkoutBtn = document.querySelector('[data-testid="checkout-btn"]');
                          if (checkoutBtn) (checkoutBtn as HTMLElement).click();
                        }, 100);
                      }}
                      className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-xl transition shadow-md shadow-orange-500/10 cursor-pointer flex items-center justify-center gap-1.5 text-xs"
                    >
                      Process Checkout <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SUCCESS POPUP FOR WHATSAPP DIRECT LINKING DISPATCH */}
      <AnimatePresence>
        {whatsAppPrompt && whatsAppPrompt.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-neutral-100 flex flex-col relative text-left"
            >
              <button
                onClick={() => setWhatsAppPrompt(null)}
                className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                    Invoice Ready
                  </span>
                  <h3 className="font-display font-black text-lg text-neutral-900 mt-1">
                    WhatsApp par Invoice bhejein
                  </h3>
                </div>
              </div>

              <p className="text-xs text-neutral-500 mb-4 leading-relaxed">
                Order status has been updated to <strong>Delivered</strong>. 
                Below is the digital invoice link and message generated. Click the button below to directly open WhatsApp with pre-filled content.
              </p>

              {/* Box showing message preview */}
              <div className="bg-neutral-50 border border-neutral-200/60 rounded-2xl p-4 mb-5 text-left">
                <p className="text-[10px] text-neutral-400 font-mono uppercase tracking-widest font-bold mb-2">Message Content Preview</p>
                <div className="text-xs text-neutral-700 whitespace-pre-line font-sans max-h-40 overflow-y-auto leading-relaxed bg-white border border-neutral-100 p-3 rounded-xl shadow-inner select-all">
                  {whatsAppPrompt.body}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setWhatsAppPrompt(null)}
                  className="flex-1 px-4 py-3 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border border-neutral-200 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    const cleanMobile = whatsAppPrompt.mobile.replace(/\D/g, "");
                    const manualWaUrl = `https://wa.me/${cleanMobile}?text=${encodeURIComponent(whatsAppPrompt.body)}`;
                    window.open(manualWaUrl, '_blank');
                    setWhatsAppPrompt(null);
                  }}
                  className="flex-[2] bg-emerald-500 hover:bg-emerald-600 text-white font-black py-3 rounded-xl transition shadow-md shadow-emerald-500/20 cursor-pointer flex items-center justify-center gap-2 text-xs"
                >
                  <MessageSquare className="h-4.5 w-4.5" /> Send Invoice Now
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <MainApp />
    </ToastProvider>
  );
}
