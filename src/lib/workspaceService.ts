import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "./firebase";
import { Order, CustomerSummary, Product } from "../types";

// In-memory cache for the Google OAuth access token
let cachedAccessToken: string | null = null;
let cachedUserEmail: string | null = null;
let cachedUserName: string | null = null;

/**
 * Initiates the Google Sign-In popup with Google Drive and Sheets scopes
 */
export const googleSignInForWorkspace = async (): Promise<{ accessToken: string; email: string; name: string } | null> => {
  try {
    const provider = new GoogleAuthProvider();
    
    // Add scopes that the user has authorized
    provider.addScope("https://www.googleapis.com/auth/drive");
    provider.addScope("https://www.googleapis.com/auth/drive.file");
    provider.addScope("https://www.googleapis.com/auth/spreadsheets");

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    if (!credential?.accessToken) {
      throw new Error("Failed to retrieve Google OAuth access token from sign-in.");
    }

    cachedAccessToken = credential.accessToken;
    cachedUserEmail = result.user.email || "";
    cachedUserName = result.user.displayName || "";

    // Also persist temporarily in sessionStorage for page refreshes
    sessionStorage.setItem("lx_g_token", cachedAccessToken);
    sessionStorage.setItem("lx_g_email", cachedUserEmail);
    sessionStorage.setItem("lx_g_name", cachedUserName);

    return {
      accessToken: cachedAccessToken,
      email: cachedUserEmail,
      name: cachedUserName
    };
  } catch (error) {
    console.error("Google sign-in for workspace failed:", error);
    throw error;
  }
};

/**
 * Load cached token from session storage (safe for refresh within same session)
 */
export const loadCachedWorkspaceToken = () => {
  const token = sessionStorage.getItem("lx_g_token");
  const email = sessionStorage.getItem("lx_g_email");
  const name = sessionStorage.getItem("lx_g_name");
  if (token && email) {
    cachedAccessToken = token;
    cachedUserEmail = email;
    cachedUserName = name || "";
    return { accessToken: token, email, name: cachedUserName };
  }
  return null;
};

/**
 * Disconnect and clear workspace token from cache
 */
export const logoutWorkspace = () => {
  cachedAccessToken = null;
  cachedUserEmail = null;
  cachedUserName = null;
  sessionStorage.removeItem("lx_g_token");
  sessionStorage.removeItem("lx_g_email");
  sessionStorage.removeItem("lx_g_name");
};

/**
 * 1. GOOGLE SHEETS API: Create a new Spreadsheet for Orders & Deliveries
 */
export const createOrdersSpreadsheet = async (token: string, shopTitle: string = "Local Xpress"): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> => {
  try {
    const title = `${shopTitle} - Orders & Deliveries Database`;
    const res = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        properties: {
          title: title
        },
        sheets: [
          {
            properties: {
              title: "Deliveries"
            }
          }
        ]
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Sheets API error: ${res.statusText} - ${errText}`);
    }

    const data = await res.json();
    const spreadsheetId = data.spreadsheetId;
    const spreadsheetUrl = data.spreadsheetUrl;

    // Initialize with standard headers
    const headers = [
      "Order ID",
      "Customer Name",
      "Mobile",
      "Address",
      "Area / Landmark",
      "Sourced Items List",
      "Subtotal (₹)",
      "Delivery Fee (₹)",
      "Total Paid (₹)",
      "Payment Method",
      "Runner Name",
      "Order Status",
      "Last Updated (IST)"
    ];

    await appendSheetRow(token, spreadsheetId, "Deliveries!A1", [headers]);

    return { spreadsheetId, spreadsheetUrl };
  } catch (error) {
    console.error("Failed to create spreadsheet:", error);
    throw error;
  }
};

/**
 * Helper to append rows to a sheet
 */
export const appendSheetRow = async (token: string, spreadsheetId: string, range: string, values: any[][]) => {
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      values: values
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Sheets Append failed: ${errText}`);
  }

  return await res.json();
};

/**
 * Read spreadsheet rows (to preview)
 */
export const getSpreadsheetValues = async (token: string, spreadsheetId: string, range: string): Promise<any[][] | null> => {
  try {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.values || null;
  } catch (error) {
    console.error("Error reading spreadsheet values:", error);
    return null;
  }
};

/**
 * Sync single order to Google Sheets (inserts if not exists, updates if exists)
 */
export const syncSingleOrderToSheet = async (token: string, spreadsheetId: string, order: Order) => {
  try {
    // 1. Fetch first column (Order IDs) to check if this order already exists
    const orderIdRange = "Deliveries!A:A";
    const resColumn = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${orderIdRange}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    let rowIndex = -1;
    if (resColumn.ok) {
      const colData = await resColumn.json();
      const rows = colData.values || [];
      // Search for our orderId
      rowIndex = rows.findIndex((row: any[]) => row[0] === order.id);
    }

    const itemsStr = order.items && order.items.length > 0
      ? order.items.map(it => `${it.product.name} (x${it.quantity})`).join(", ")
      : "Custom Items";

    const orderRow = [
      order.id,
      order.customerDetails?.name || "N/A",
      order.customerDetails?.mobile || "N/A",
      order.customerDetails?.address || "N/A",
      order.customerDetails?.area || "N/A",
      itemsStr,
      order.estimatedAmount || 0,
      order.deliveryCharge || 0,
      order.totalAmount || 0,
      order.customerDetails?.paymentMethod || "Cash",
      order.runnerName || "Unassigned",
      order.status,
      new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
    ];

    if (rowIndex !== -1) {
      // 2. Row exists, update that specific row (row indices in sheet are 1-based)
      const targetRowNumber = rowIndex + 1;
      const updateRange = `Deliveries!A${targetRowNumber}:M${targetRowNumber}`;
      
      const resUpdate = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${updateRange}?valueInputOption=USER_ENTERED`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          values: [orderRow]
        })
      });

      if (!resUpdate.ok) {
        throw new Error(`Failed to update row: ${await resUpdate.text()}`);
      }
    } else {
      // 3. Row doesn't exist, append it
      await appendSheetRow(token, spreadsheetId, "Deliveries!A2", [orderRow]);
    }
  } catch (error) {
    console.error(`Failed to sync order #${order.id} to sheet:`, error);
  }
};

/**
 * Bulk sync all orders to sheet
 */
export const bulkSyncOrdersToSheet = async (token: string, spreadsheetId: string, orders: Order[]) => {
  try {
    // 1. Fetch spreadsheet metadata to check/clear values
    // To keep it simple and preserve headers, let's update everything starting from A2
    // Let's first clear existing data in Deliveries!A2:M1000
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Deliveries!A2:M1000:clear`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (orders.length === 0) return;

    // Convert orders to rows
    const rows = orders.map(order => {
      const itemsStr = order.items && order.items.length > 0
        ? order.items.map(it => `${it.product.name} (x${it.quantity})`).join(", ")
        : "Custom Items";

      const orderTimeStr = order.date && order.time 
        ? `${order.date} ${order.time}` 
        : new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

      return [
        order.id,
        order.customerDetails?.name || "N/A",
        order.customerDetails?.mobile || "N/A",
        order.customerDetails?.address || "N/A",
        order.customerDetails?.area || "N/A",
        itemsStr,
        order.estimatedAmount || 0,
        order.deliveryCharge || 0,
        order.totalAmount || 0,
        order.customerDetails?.paymentMethod || "Cash",
        order.runnerName || "Unassigned",
        order.status,
        orderTimeStr
      ];
    });

    // Append all rows at once starting at A2
    await appendSheetRow(token, spreadsheetId, "Deliveries!A2", rows);
  } catch (error) {
    console.error("Bulk orders sheet sync failed:", error);
    throw error;
  }
};

/**
 * 2. GOOGLE DRIVE API: Create a dedicated Backup folder in Google Drive
 */
export const createBackupFolderOnDrive = async (token: string): Promise<string> => {
  try {
    const res = await fetch("https://www.googleapis.com/drive/v3/files", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: "Local Xpress Backups",
        mimeType: "application/vnd.google-apps.folder"
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Drive folder creation error: ${errText}`);
    }

    const data = await res.json();
    return data.id;
  } catch (error) {
    console.error("Failed to create Drive folder:", error);
    throw error;
  }
};

/**
 * Upload backup file to Google Drive folder using multipart upload
 */
export const uploadBackupFileToDrive = async (
  token: string, 
  folderId: string, 
  content: any, 
  filename: string
): Promise<{ fileId: string; webViewLink: string }> => {
  try {
    const metadata = {
      name: filename,
      mimeType: "application/json",
      parents: [folderId]
    };

    const fileContent = JSON.stringify(content, null, 2);
    const boundary = "lx_backup_boundary_secure_2026";
    const delimiter = `\r\n--${boundary}\r\n`;
    const close_delim = `\r\n--${boundary}--`;

    const multipartRequestBody =
      delimiter +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      JSON.stringify(metadata) +
      delimiter +
      "Content-Type: application/json\r\n\r\n" +
      fileContent +
      close_delim;

    const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`
      },
      body: multipartRequestBody
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Drive file upload error: ${errText}`);
    }

    const data = await res.json();
    return {
      fileId: data.id,
      webViewLink: data.webViewLink || `https://drive.google.com/file/d/${data.id}/view`
    };
  } catch (error) {
    console.error("Failed to upload backup file:", error);
    throw error;
  }
};

/**
 * List files inside the Backup folder in Google Drive
 */
export const listBackupFilesOnDrive = async (token: string, folderId: string): Promise<any[]> => {
  try {
    const q = `'${folderId}' in parents and trashed = false`;
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,size,createdTime,webViewLink)&orderBy=createdTime%20desc`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Drive list error: ${errText}`);
    }

    const data = await res.json();
    return data.files || [];
  } catch (error) {
    console.error("Failed to list files from Google Drive:", error);
    return [];
  }
};

/**
 * Delete a file on Google Drive
 */
export const deleteBackupFileOnDrive = async (token: string, fileId: string): Promise<boolean> => {
  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Drive delete error: ${errText}`);
    }

    return true;
  } catch (error) {
    console.error("Failed to delete backup file:", error);
    throw error;
  }
};

/**
 * Ensures that 'Deliveries', 'Customers', and 'Products' tabs exist in the spreadsheet.
 * If not, it creates them and appends headers.
 */
export const ensureSheetTabsExist = async (token: string, spreadsheetId: string) => {
  try {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch spreadsheet metadata: ${res.statusText}`);
    }

    const data = await res.json();
    const existingTitles = (data.sheets || []).map((s: any) => s.properties.title);

    const requiredSheets = [
      {
        title: "Deliveries",
        headers: [
          "Order ID",
          "Customer Name",
          "Mobile",
          "Address",
          "Area / Landmark",
          "Sourced Items List",
          "Subtotal (₹)",
          "Delivery Fee (₹)",
          "Total Paid (₹)",
          "Payment Method",
          "Runner Name",
          "Order Status",
          "Last Updated (IST)"
        ]
      },
      {
        title: "Customers",
        headers: [
          "Customer ID",
          "Name",
          "Mobile",
          "Address",
          "Total Orders",
          "Last Order Date"
        ]
      },
      {
        title: "Products",
        headers: [
          "Product ID",
          "Name",
          "Category",
          "Unit",
          "Price (₹)",
          "Featured"
        ]
      }
    ];

    const requests: any[] = [];
    const headersToAppend: { range: string; headers: any[][] }[] = [];

    for (const reqSheet of requiredSheets) {
      if (!existingTitles.includes(reqSheet.title)) {
        requests.push({
          addSheet: {
            properties: {
              title: reqSheet.title
            }
          }
        });
        headersToAppend.push({
          range: `${reqSheet.title}!A1`,
          headers: [reqSheet.headers]
        });
      }
    }

    if (requests.length > 0) {
      const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ requests })
      });

      if (!updateRes.ok) {
        throw new Error(`Failed to create missing sheets: ${await updateRes.text()}`);
      }

      // After sheets are created, append the headers
      for (const h of headersToAppend) {
        await appendSheetRow(token, spreadsheetId, h.range, h.headers);
      }
    }

    // Verify and make sure headers are placed if the sheet exists but is empty
    for (const reqSheet of requiredSheets) {
      const val = await getSpreadsheetValues(token, spreadsheetId, `${reqSheet.title}!A1:A1`);
      if (!val || val.length === 0 || !val[0][0]) {
        await appendSheetRow(token, spreadsheetId, `${reqSheet.title}!A1`, [reqSheet.headers]);
      }
    }

  } catch (error) {
    console.error("Error ensuring sheet tabs exist:", error);
    throw error;
  }
};

/**
 * Bulk sync all customers to sheet
 */
export const bulkSyncCustomersToSheet = async (token: string, spreadsheetId: string, customers: CustomerSummary[]) => {
  try {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Customers!A2:F1000:clear`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (customers.length === 0) return;

    const rows = customers.map(cust => [
      cust.id,
      cust.name,
      cust.mobile,
      cust.address,
      cust.totalOrders,
      cust.lastOrderDate
    ]);

    await appendSheetRow(token, spreadsheetId, "Customers!A2", rows);
  } catch (error) {
    console.error("Bulk customers sheet sync failed:", error);
    throw error;
  }
};

/**
 * Bulk sync all products to sheet
 */
export const bulkSyncProductsToSheet = async (token: string, spreadsheetId: string, products: Product[]) => {
  try {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Products!A2:F1000:clear`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (products.length === 0) return;

    const rows = products.map(prod => [
      prod.id,
      prod.name,
      prod.category,
      prod.unit,
      prod.price || 0,
      prod.featured ? "Yes" : "No"
    ]);

    await appendSheetRow(token, spreadsheetId, "Products!A2", rows);
  } catch (error) {
    console.error("Bulk products sheet sync failed:", error);
    throw error;
  }
};

/**
 * Fully synchronizes all sheets: Deliveries, Customers, and Products
 */
export const syncAllDataToSheet = async (
  token: string,
  spreadsheetId: string,
  orders: Order[],
  customers: CustomerSummary[],
  products: Product[]
) => {
  // First ensure tabs exist with correct headers
  await ensureSheetTabsExist(token, spreadsheetId);

  // Sync each tab
  await Promise.all([
    bulkSyncOrdersToSheet(token, spreadsheetId, orders),
    bulkSyncCustomersToSheet(token, spreadsheetId, customers),
    bulkSyncProductsToSheet(token, spreadsheetId, products)
  ]);
};
