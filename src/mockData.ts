import { Product, Vendor, Order, CustomerSummary } from './types';

export const INITIAL_PRODUCTS: Product[] = [
  // Grocery
  {
    id: 'p-g1',
    name: 'Premium Basmati Rice (Aashirvaad)',
    category: 'Grocery',
    unit: '1 Kg',
    price: 110,
    image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=300&q=80',
    featured: true
  },
  {
    id: 'p-g2',
    name: 'Fortune Mustard Oil',
    category: 'Grocery',
    unit: '1 Litre',
    price: 175,
    image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=300&q=80',
    featured: true
  },
  {
    id: 'p-g3',
    name: 'Tata Salt Lite',
    category: 'Grocery',
    unit: '1 Kg',
    price: 28,
    image: 'https://images.unsplash.com/photo-1618142992634-118df2b947a1?auto=format&fit=crop&w=300&q=80'
  },
  // Fruits & Vegetables
  {
    id: 'p-fv1',
    name: 'Fresh Red Apples (Himachal)',
    category: 'Fruits & Vegetables',
    unit: '1 Kg',
    price: 160,
    image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=300&q=80',
    featured: true
  },
  {
    id: 'p-fv2',
    name: 'Organic Farm Onions',
    category: 'Fruits & Vegetables',
    unit: '1 Kg',
    price: 35,
    image: 'https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 'p-fv3',
    name: 'Fresh Green Spinach (Palak)',
    category: 'Fruits & Vegetables',
    unit: '250g Bunch',
    price: 15,
    image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=300&q=80'
  },
  // Bakery
  {
    id: 'p-b1',
    name: 'Multigrain Brown Bread (English Oven)',
    category: 'Bakery',
    unit: '400g Pack',
    price: 45,
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=300&q=80',
    featured: true
  },
  {
    id: 'p-b2',
    name: 'Chocolate Chip Cookies (Freshly Baked)',
    category: 'Bakery',
    unit: '6 Pcs',
    price: 120,
    image: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=300&q=80'
  },
  // Medicines
  {
    id: 'p-m1',
    name: 'Crocin Pain Relief Tablets',
    category: 'Medicines',
    unit: '15 Tablets Strip',
    price: 65,
    image: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 'p-m2',
    name: 'Dolo 650mg Paracetamol',
    category: 'Medicines',
    unit: '15 Tablets Strip',
    price: 32,
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=300&q=80',
    featured: true
  },
  // Dairy
  {
    id: 'p-d1',
    name: 'Amul Taaza Toned Milk',
    category: 'Dairy',
    unit: '1 Litre',
    price: 54,
    image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=300&q=80',
    featured: true
  },
  {
    id: 'p-d2',
    name: 'Amul Salted Butter',
    category: 'Dairy',
    unit: '100g Block',
    price: 56,
    image: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=300&q=80'
  },
  // Restaurant Food
  {
    id: 'p-r1',
    name: 'Kadhai Paneer (Half) with 2 Butter Rotis',
    category: 'Restaurant Food',
    unit: '1 Serving Box',
    price: 180,
    image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 'p-r2',
    name: 'Masala Dosa (Special South Indian)',
    category: 'Restaurant Food',
    unit: '1 Plate',
    price: 90,
    image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=300&q=80',
    featured: true
  },
  // Stationery
  {
    id: 'p-s1',
    name: 'Classmate Notebook (Ruled)',
    category: 'Stationery',
    unit: '172 Pages',
    price: 45,
    image: 'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=300&q=80'
  },
  // Electronics
  {
    id: 'p-e1',
    name: 'Syska LED Bulb 9W (Cool Day)',
    category: 'Electronics',
    unit: '1 Pc',
    price: 99,
    image: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=300&q=80'
  },
  // Fashion
  {
    id: 'p-f1',
    name: 'Puma Sports Socks',
    category: 'Fashion',
    unit: '3 Pairs Pack',
    price: 249,
    image: 'https://images.unsplash.com/photo-1582966772680-860e372bb558?auto=format&fit=crop&w=300&q=80'
  },
  // Gift Items
  {
    id: 'p-gi1',
    name: 'Ferrero Rocher Chocolate Box',
    category: 'Gift Items',
    unit: '16 Pcs Box',
    price: 449,
    image: 'https://images.unsplash.com/photo-1549007994-cb92ca8a3a77?auto=format&fit=crop&w=300&q=80'
  },
  // Household Items
  {
    id: 'p-h1',
    name: 'Vim Dishwash Gel (Lemon)',
    category: 'Household Items',
    unit: '250ml Bottle',
    price: 55,
    image: 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 'p-h2',
    name: 'Dettol Liquid Handwash Refill',
    category: 'Household Items',
    unit: '175ml Pack',
    price: 36,
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=300&q=80'
  }
];

export const INITIAL_VENDORS: Vendor[] = [
  {
    id: 'VND001',
    shopName: 'Krishna Grocery Store',
    ownerName: 'Krishna Murti',
    mobile: '9876543210',
    category: 'Grocery',
    address: 'Main Bazar Road, Siddharthnagar',
    openingTime: '07:00 AM',
    closingTime: '09:30 PM',
    status: 'Active'
  },
  {
    id: 'VND002',
    shopName: 'Drishti Medicos',
    ownerName: 'Sanjay Pandey',
    mobile: '9450123456',
    category: 'Medical',
    address: 'Near District Hospital, Siddharthnagar',
    openingTime: '08:00 AM',
    closingTime: '10:30 PM',
    status: 'Active'
  },
  {
    id: 'VND003',
    shopName: 'Sweets & Bakes Corner',
    ownerName: 'Rajesh Gupta',
    mobile: '8877112233',
    category: 'Bakery',
    address: 'Station Road, Birdpur',
    openingTime: '06:00 AM',
    closingTime: '10:00 PM',
    status: 'Active'
  },
  {
    id: 'VND004',
    shopName: 'Royal Spice Restaurant',
    ownerName: 'Imran Khan',
    mobile: '7766554433',
    category: 'Restaurant',
    address: 'Civil Lines, Siddharthnagar',
    openingTime: '11:00 AM',
    closingTime: '11:00 PM',
    status: 'Active'
  },
  {
    id: 'VND005',
    shopName: 'Saraswati Pustak Bhandar',
    ownerName: 'Nand Kishor',
    mobile: '9123456789',
    category: 'Stationery',
    address: 'College Road, Siddharthnagar',
    openingTime: '09:00 AM',
    closingTime: '08:00 PM',
    status: 'Active'
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'LX20260001',
    date: '24-06-2026',
    time: '08:45 AM',
    customerDetails: {
      name: 'Satya Kasaudhan',
      mobile: '9876543210',
      alternateMobile: '8115543210',
      address: 'Birdpur Near Shiv Mandir',
      landmark: 'Shiv Mandir',
      area: 'Birdpur',
      pincode: '272201',
      instructions: 'Call before delivery.',
      paymentMethod: 'Cash'
    },
    customerNotes: 'Please select fresh, green vegetables if possible. Avoid bruised ones.',
    items: [
      {
        product: INITIAL_PRODUCTS[10], // Amul Taaza Milk
        quantity: 2
      },
      {
        product: INITIAL_PRODUCTS[6], // Multigrain Brown Bread
        quantity: 3
      }
    ],
    estimatedAmount: 243,
    deliveryCharge: 30,
    totalAmount: 273,
    status: 'Delivered',
    purchase: {
      orderId: 'LX20260001',
      vendorId: 'VND003',
      vendorName: 'Sweets & Bakes Corner',
      purchaseAmount: 200,
      purchasedItems: 'Milk x2, Bread x3',
      billNumber: 'SBC-9831',
      purchaseDate: '24-06-2026'
    }
  },
  {
    id: 'LX20260002',
    date: '24-06-2026',
    time: '11:30 AM',
    customerDetails: {
      name: 'Amit Tripathi',
      mobile: '9988776655',
      address: 'Vikas Nagar Ward 3',
      landmark: 'Water Tank',
      area: 'Siddharthnagar',
      pincode: '272207',
      instructions: 'Leave at front gate.',
      paymentMethod: 'UPI'
    },
    customerNotes: 'Please check expiry dates on Dolo 650 tablets.',
    items: [
      {
        product: INITIAL_PRODUCTS[9], // Dolo 650mg
        quantity: 1
      },
      {
        product: INITIAL_PRODUCTS[1], // Fortune Mustard Oil
        quantity: 2
      }
    ],
    estimatedAmount: 382,
    deliveryCharge: 40,
    totalAmount: 422,
    status: 'Out For Delivery'
  },
  {
    id: 'LX20260003',
    date: '24-06-2026',
    time: '02:15 PM',
    customerDetails: {
      name: 'Sneha Jaiswal',
      mobile: '8877665544',
      address: 'Madanpur Colony',
      landmark: 'Post Office',
      area: 'Siddharthnagar',
      pincode: '272207',
      instructions: 'Hand over to brother.',
      paymentMethod: 'UPI'
    },
    items: [
      {
        product: INITIAL_PRODUCTS[3], // Red Apples
        quantity: 1
      },
      {
        product: INITIAL_PRODUCTS[13], // Masala Dosa
        quantity: 2
      }
    ],
    estimatedAmount: 340,
    deliveryCharge: 40,
    totalAmount: 380,
    status: 'Pending'
  },
  {
    id: 'LX20260004',
    date: '23-06-2026',
    time: '04:50 PM',
    customerDetails: {
      name: 'Ramesh Chaudhary',
      mobile: '7766559988',
      address: 'Pipra Crossing, Birdpur Road',
      landmark: 'Petrol Pump',
      area: 'Birdpur',
      pincode: '272201',
      paymentMethod: 'Cash'
    },
    items: [
      {
        product: INITIAL_PRODUCTS[0], // Rice
        quantity: 5
      }
    ],
    estimatedAmount: 550,
    deliveryCharge: 50,
    totalAmount: 600,
    status: 'Delivered',
    purchase: {
      orderId: 'LX20260004',
      vendorId: 'VND001',
      vendorName: 'Krishna Grocery Store',
      purchaseAmount: 480,
      purchasedItems: 'Basmati Rice 5kg',
      billNumber: 'KGS-221',
      purchaseDate: '23-06-2026'
    }
  },
  {
    id: 'LX20260005',
    date: '22-06-2026',
    time: '07:20 PM',
    customerDetails: {
      name: 'Priyanka Sen',
      mobile: '9112233445',
      address: 'Gandhi Nagar, Lane 2',
      landmark: 'Subhash Statue',
      area: 'Siddharthnagar',
      pincode: '272207',
      paymentMethod: 'UPI'
    },
    items: [
      {
        product: INITIAL_PRODUCTS[17], // Ferrero Rocher
        quantity: 1
      },
      {
        product: INITIAL_PRODUCTS[10], // Amul Taaza Milk
        quantity: 1
      }
    ],
    estimatedAmount: 503,
    deliveryCharge: 30,
    totalAmount: 533,
    status: 'Delivered',
    purchase: {
      orderId: 'LX20260005',
      vendorId: 'VND003',
      vendorName: 'Sweets & Bakes Corner',
      purchaseAmount: 450,
      purchasedItems: 'Ferrero Rocher, Amul Milk',
      billNumber: 'SBC-9812',
      purchaseDate: '22-06-2026'
    }
  }
];

export const INITIAL_CUSTOMERS: CustomerSummary[] = [
  {
    id: 'CUST001',
    name: 'Satya Kasaudhan',
    mobile: '9876543210',
    address: 'Birdpur Near Shiv Mandir',
    totalOrders: 3,
    lastOrderDate: '24-06-2026'
  },
  {
    id: 'CUST002',
    name: 'Amit Tripathi',
    mobile: '9988776655',
    address: 'Vikas Nagar Ward 3, Siddharthnagar',
    totalOrders: 1,
    lastOrderDate: '24-06-2026'
  },
  {
    id: 'CUST003',
    name: 'Sneha Jaiswal',
    mobile: '8877665544',
    address: 'Madanpur Colony, Siddharthnagar',
    totalOrders: 1,
    lastOrderDate: '24-06-2026'
  },
  {
    id: 'CUST004',
    name: 'Ramesh Chaudhary',
    mobile: '7766559988',
    address: 'Pipra Crossing, Birdpur Road',
    totalOrders: 4,
    lastOrderDate: '23-06-2026'
  },
  {
    id: 'CUST005',
    name: 'Priyanka Sen',
    mobile: '9112233445',
    address: 'Gandhi Nagar, Lane 2, Siddharthnagar',
    totalOrders: 2,
    lastOrderDate: '22-06-2026'
  }
];
