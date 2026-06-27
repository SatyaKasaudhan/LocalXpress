import { db, handleFirestoreError, OperationType } from "./firebase";
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  orderBy,
  deleteDoc
} from "firebase/firestore";
import { Order, Vendor, CustomerSummary, Product, BroadcastMessage, Runner, Offer } from "../types";
import { INITIAL_PRODUCTS, INITIAL_VENDORS, INITIAL_ORDERS, INITIAL_CUSTOMERS } from "../mockData";

const INITIAL_RUNNERS: Runner[] = [
  { id: "R001", name: "Rohan Yadav", mobile: "+91 91234 56789", status: "Active", assignedOrdersCount: 0 },
  { id: "R002", name: "Vivek Jaiswal", mobile: "+91 81234 56789", status: "Active", assignedOrdersCount: 0 },
  { id: "R003", name: "Sandeep Mishra", mobile: "+91 71234 56789", status: "Offline", assignedOrdersCount: 0 }
];

// --- SEED DATABASE IF EMPTY ---
export async function seedDatabaseIfEmpty() {
  try {
    // 1. Seed Products
    const productsCol = collection(db, "products");
    const productsSnapshot = await getDocs(productsCol);
    if (productsSnapshot.empty) {
      console.log("Seeding products...");
      for (const p of INITIAL_PRODUCTS) {
        await setDoc(doc(productsCol, p.id), p);
      }
    }

    // 2. Seed Vendors
    const vendorsCol = collection(db, "vendors");
    const vendorsSnapshot = await getDocs(vendorsCol);
    if (vendorsSnapshot.empty) {
      console.log("Seeding vendors...");
      for (const v of INITIAL_VENDORS) {
        await setDoc(doc(vendorsCol, v.id), v);
      }
    }

    // 3. Seed Customers
    const customersCol = collection(db, "customers");
    const customersSnapshot = await getDocs(customersCol);
    if (customersSnapshot.empty) {
      console.log("Seeding customers...");
      for (const c of INITIAL_CUSTOMERS) {
        await setDoc(doc(customersCol, c.id), c);
      }
    }

    // 4. Seed Orders
    const ordersCol = collection(db, "orders");
    const ordersSnapshot = await getDocs(ordersCol);
    if (ordersSnapshot.empty) {
      console.log("Seeding orders...");
      for (const o of INITIAL_ORDERS) {
        await setDoc(doc(ordersCol, o.id), o);
      }
    }

    // 5. Seed Runners
    const runnersCol = collection(db, "runners");
    const runnersSnapshot = await getDocs(runnersCol);
    if (runnersSnapshot.empty) {
      console.log("Seeding runners...");
      for (const r of INITIAL_RUNNERS) {
        await setDoc(doc(runnersCol, r.id), r);
      }
    }

    // 6. Seed Offers
    const offersCol = collection(db, "offers");
    const offersSnapshot = await getDocs(offersCol);
    if (offersSnapshot.empty) {
      console.log("Seeding offers...");
      const initialOffers: Offer[] = [
        {
          id: "WELCOME50",
          title: "Welcome Offer 🎉",
          description: "Get Flat ₹50 off on order above ₹299!",
          discountType: "flat",
          discountValue: 50,
          minOrderValue: 299,
          bannerColor: "bg-emerald-600",
          status: "Active",
          createdAt: new Date().toISOString()
        },
        {
          id: "FREEDEL",
          title: "Free Delivery Promotion 🚚",
          description: "Enjoy absolutely Free Delivery on orders above ₹199!",
          discountType: "free-delivery",
          minOrderValue: 199,
          bannerColor: "bg-[#FF6321]",
          status: "Inactive",
          createdAt: new Date().toISOString()
        }
      ];
      for (const o of initialOffers) {
        await setDoc(doc(offersCol, o.id), o);
      }
    }
  } catch (error) {
    console.error("Database seeding failed:", error);
    handleFirestoreError(error, OperationType.WRITE, "seed");
  }
}

// --- ORDERS API ---
export function subscribeToOrders(callback: (orders: Order[]) => void) {
  const colRef = collection(db, "orders");
  const q = query(colRef, orderBy("id", "desc"));
  return onSnapshot(q, (snapshot) => {
    const orders: Order[] = [];
    snapshot.forEach((doc) => {
      orders.push(doc.data() as Order);
    });
    callback(orders);
  }, (err) => {
    console.error("Orders subscription error:", err);
    handleFirestoreError(err, OperationType.LIST, "orders");
  });
}

export async function createOrderInFirestore(order: Order) {
  try {
    const docRef = doc(db, "orders", order.id);
    await setDoc(docRef, order);
    await updateCustomerSummary(order);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `orders/${order.id}`);
  }
}

export async function updateOrderStatusInFirestore(orderId: string, status: string, purchase?: any) {
  try {
    const docRef = doc(db, "orders", orderId);
    const updateData: any = { status };
    if (purchase) {
      updateData.purchase = purchase;
    }
    await updateDoc(docRef, updateData);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}`);
  }
}

// --- VENDORS API ---
export function subscribeToVendors(callback: (vendors: Vendor[]) => void) {
  const colRef = collection(db, "vendors");
  return onSnapshot(colRef, (snapshot) => {
    const vendors: Vendor[] = [];
    snapshot.forEach((doc) => {
      vendors.push(doc.data() as Vendor);
    });
    callback(vendors);
  }, (err) => {
    console.error("Vendors subscription error:", err);
    handleFirestoreError(err, OperationType.LIST, "vendors");
  });
}

export async function saveVendorInFirestore(vendor: Vendor) {
  try {
    const docRef = doc(db, "vendors", vendor.id);
    await setDoc(docRef, vendor);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `vendors/${vendor.id}`);
  }
}

export async function deleteVendorFromFirestore(vendorId: string) {
  try {
    const docRef = doc(db, "vendors", vendorId);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `vendors/${vendorId}`);
  }
}

// --- PRODUCTS API ---
export function subscribeToProducts(callback: (products: Product[]) => void) {
  const colRef = collection(db, "products");
  return onSnapshot(colRef, (snapshot) => {
    const products: Product[] = [];
    snapshot.forEach((doc) => {
      products.push(doc.data() as Product);
    });
    callback(products);
  }, (err) => {
    console.error("Products subscription error:", err);
    handleFirestoreError(err, OperationType.LIST, "products");
  });
}

export async function saveProductInFirestore(product: Product) {
  try {
    const docRef = doc(db, "products", product.id);
    await setDoc(docRef, product);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `products/${product.id}`);
  }
}

export async function deleteProductFromFirestore(productId: string) {
  try {
    const docRef = doc(db, "products", productId);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `products/${productId}`);
  }
}

// --- CUSTOMERS API ---
export function subscribeToCustomers(callback: (customers: CustomerSummary[]) => void) {
  const colRef = collection(db, "customers");
  return onSnapshot(colRef, (snapshot) => {
    const customers: CustomerSummary[] = [];
    snapshot.forEach((doc) => {
      customers.push(doc.data() as CustomerSummary);
    });
    callback(customers);
  }, (err) => {
    console.error("Customers subscription error:", err);
    handleFirestoreError(err, OperationType.LIST, "customers");
  });
}

// Automatically create or increment customer stats when an order is placed
async function updateCustomerSummary(order: Order) {
  try {
    const mobile = order.customerDetails.mobile;
    const name = order.customerDetails.name;
    const address = `${order.customerDetails.address}, ${order.customerDetails.area}`;
    
    const customersCol = collection(db, "customers");
    const q = query(customersCol);
    const querySnapshot = await getDocs(q);
    
    let foundCust: CustomerSummary | null = null;
    querySnapshot.forEach((doc) => {
      const data = doc.data() as CustomerSummary;
      if (data.mobile === mobile) {
        foundCust = data;
      }
    });

    if (foundCust) {
      const custDocRef = doc(db, "customers", (foundCust as CustomerSummary).id);
      await updateDoc(custDocRef, {
        totalOrders: (foundCust as CustomerSummary).totalOrders + 1,
        lastOrderDate: order.date,
        address
      });
    } else {
      const nextId = `CUST${String(querySnapshot.size + 1).padStart(3, "0")}`;
      await setDoc(doc(db, "customers", nextId), {
        id: nextId,
        name,
        mobile,
        address,
        totalOrders: 1,
        lastOrderDate: order.date
      });
    }
  } catch (error) {
    console.error("Error updating customer summary:", error);
    handleFirestoreError(error, OperationType.WRITE, "customers_summary");
  }
}

// --- BROADCASTS API ---
export function subscribeToBroadcasts(callback: (broadcasts: BroadcastMessage[]) => void) {
  const colRef = collection(db, "broadcasts");
  const q = query(colRef, orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const broadcasts: BroadcastMessage[] = [];
    snapshot.forEach((doc) => {
      broadcasts.push(doc.data() as BroadcastMessage);
    });
    callback(broadcasts);
  }, (err) => {
    console.error("Broadcasts subscription error:", err);
    handleFirestoreError(err, OperationType.LIST, "broadcasts");
  });
}

export async function sendBroadcastInFirestore(broadcast: BroadcastMessage) {
  try {
    const docRef = doc(db, "broadcasts", broadcast.id);
    await setDoc(docRef, broadcast);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `broadcasts/${broadcast.id}`);
  }
}

export async function deleteBroadcastFromFirestore(broadcastId: string) {
  try {
    const docRef = doc(db, "broadcasts", broadcastId);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `broadcasts/${broadcastId}`);
  }
}

// --- RUNNERS API ---
export function subscribeToRunners(callback: (runners: Runner[]) => void) {
  const colRef = collection(db, "runners");
  return onSnapshot(colRef, (snapshot) => {
    const runners: Runner[] = [];
    snapshot.forEach((doc) => {
      runners.push(doc.data() as Runner);
    });
    callback(runners);
  }, (err) => {
    console.error("Runners subscription error:", err);
    handleFirestoreError(err, OperationType.LIST, "runners");
  });
}

export async function saveRunnerInFirestore(runner: Runner) {
  try {
    const docRef = doc(db, "runners", runner.id);
    await setDoc(docRef, runner);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `runners/${runner.id}`);
  }
}

export async function deleteRunnerFromFirestore(runnerId: string) {
  try {
    const docRef = doc(db, "runners", runnerId);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `runners/${runnerId}`);
  }
}

export async function updateOrderRunnerInFirestore(orderId: string, runnerId: string | undefined, runnerName: string | undefined) {
  try {
    const docRef = doc(db, "orders", orderId);
    const updateData: any = {};
    if (runnerId !== undefined) {
      updateData.runnerId = runnerId;
    } else {
      updateData.runnerId = "";
    }
    if (runnerName !== undefined) {
      updateData.runnerName = runnerName;
    } else {
      updateData.runnerName = "";
    }
    await updateDoc(docRef, updateData);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}`);
  }
}

// --- OFFERS API ---
export function subscribeToOffers(callback: (offers: Offer[]) => void) {
  const colRef = collection(db, "offers");
  return onSnapshot(colRef, (snapshot) => {
    const offers: Offer[] = [];
    snapshot.forEach((doc) => {
      offers.push(doc.data() as Offer);
    });
    // Sort manually by createdAt desc
    offers.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    callback(offers);
  }, (err) => {
    console.error("Offers subscription error:", err);
    handleFirestoreError(err, OperationType.LIST, "offers");
  });
}

export async function saveOfferInFirestore(offer: Offer) {
  try {
    const docRef = doc(db, "offers", offer.id);
    await setDoc(docRef, offer);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `offers/${offer.id}`);
  }
}

export async function deleteOfferFromFirestore(offerId: string) {
  try {
    const docRef = doc(db, "offers", offerId);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `offers/${offerId}`);
  }
}
