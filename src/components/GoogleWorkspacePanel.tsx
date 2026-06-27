import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Cloud, Database, FileSpreadsheet, FolderPlus, LogOut, RefreshCw, 
  Trash2, ExternalLink, Check, Plus, Folder, ArrowRight, Lock, 
  FileText, ShieldAlert, AlertCircle, Play, Sparkles, X, HelpCircle, Info, ChevronRight, ChevronLeft
} from "lucide-react";
import { Order, CustomerSummary, Product } from "../types";
import { 
  googleSignInForWorkspace, 
  loadCachedWorkspaceToken, 
  logoutWorkspace, 
  createOrdersSpreadsheet, 
  bulkSyncOrdersToSheet, 
  createBackupFolderOnDrive, 
  uploadBackupFileToDrive, 
  listBackupFilesOnDrive, 
  deleteBackupFileOnDrive,
  getSpreadsheetValues,
  syncAllDataToSheet
} from "../lib/workspaceService";
import { useToast } from "./Toast";

const cleanGoogleId = (input: string): string => {
  let cleaned = input.trim();
  
  // Strip trailing/leading periods, slashes, or quotes that often come from copy-paste
  cleaned = cleaned.replace(/[.\s/]+$/, "").replace(/^[.\s/]+/, "");
  
  // Try to match Google Sheet ID in URL
  if (cleaned.includes("docs.google.com/spreadsheets")) {
    const match = cleaned.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match) return match[1];
  }
  
  // Try to match Google Drive Folder ID in URL
  if (cleaned.includes("drive.google.com")) {
    const matchFolder = cleaned.match(/\/folders\/([a-zA-Z0-9-_]+)/);
    if (matchFolder) return matchFolder[1];
    
    const matchId = cleaned.match(/[?&]id=([a-zA-Z0-9-_]+)/);
    if (matchId) return matchId[1];
  }
  
  return cleaned;
};

interface GoogleWorkspacePanelProps {
  orders: Order[];
  customers: CustomerSummary[];
  products: Product[];
  currentRole: string;
  shopTitle: string;
  onUpdateOrderStatus?: (orderId: string, status: any) => void;
}

export default function GoogleWorkspacePanel({ 
  orders, 
  customers = [],
  products = [],
  currentRole, 
  shopTitle,
  onUpdateOrderStatus
}: GoogleWorkspacePanelProps) {
  const { showToast } = useToast();

  // Connection State
  const [isConnected, setIsConnected] = useState(false);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [isConnecting, setIsConnecting] = useState(false);

  // Sheets Config State
  const [spreadsheetId, setSpreadsheetId] = useState<string>("");
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string>("");
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);
  const [isSyncingAllData, setIsSyncingAllData] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [sheetPreviewRows, setSheetPreviewRows] = useState<any[][] | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Guided Setup Modal State
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [setupStep, setSetupStep] = useState(1);
  const [showSecureToken, setShowSecureToken] = useState(false);

  // Drive Config State
  const [driveFolderId, setDriveFolderId] = useState<string>("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [isListingFiles, setIsListingFiles] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);

  // Load saved configuration & token on mount
  useEffect(() => {
    // 1. Try to load cached token
    const cache = loadCachedWorkspaceToken();
    if (cache) {
      setGoogleToken(cache.accessToken);
      setUserEmail(cache.email);
      setUserName(cache.name);
      setIsConnected(true);
    }

    // 2. Load Sheets ID & URL
    const savedSheetId = localStorage.getItem("lx_g_sheet_id");
    const savedSheetUrl = localStorage.getItem("lx_g_sheet_url");
    if (savedSheetId) {
      const cleaned = cleanGoogleId(savedSheetId);
      setSpreadsheetId(cleaned);
      if (cleaned !== savedSheetId) {
        localStorage.setItem("lx_g_sheet_id", cleaned);
      }
      const mockUrl = `https://docs.google.com/spreadsheets/d/${cleaned}/edit`;
      setSpreadsheetUrl(mockUrl);
    } else if (savedSheetUrl) {
      setSpreadsheetUrl(savedSheetUrl);
    }

    // 3. Load Drive Folder ID
    const savedFolderId = localStorage.getItem("lx_g_folder_id");
    if (savedFolderId) {
      const cleaned = cleanGoogleId(savedFolderId);
      setDriveFolderId(cleaned);
      if (cleaned !== savedFolderId) {
        localStorage.setItem("lx_g_folder_id", cleaned);
      }
    }

    // 4. Load Auto Sync Option
    const savedAutoSync = localStorage.getItem("lx_g_auto_sync");
    if (savedAutoSync !== null) {
      setAutoSyncEnabled(savedAutoSync === "true");
    }
  }, []);

  // Sync files from Drive whenever connected & folderId changes
  useEffect(() => {
    if (isConnected && googleToken && driveFolderId) {
      fetchDriveFiles();
    } else {
      setDriveFiles([]);
    }
  }, [isConnected, googleToken, driveFolderId]);

  // Sync spreadsheet values preview whenever spreadsheetId changes
  useEffect(() => {
    if (isConnected && googleToken && spreadsheetId) {
      fetchSheetPreview();
    } else {
      setSheetPreviewRows(null);
    }
  }, [isConnected, googleToken, spreadsheetId]);

  // 1. Authenticate with Google Workspace Scopes
  const handleConnectWorkspace = async () => {
    setIsConnecting(true);
    try {
      const result = await googleSignInForWorkspace();
      if (result) {
        setGoogleToken(result.accessToken);
        setUserEmail(result.email);
        setUserName(result.name);
        setIsConnected(true);
        showToast(`Connected successfully to ${result.email}!`, "success");
      }
    } catch (error: any) {
      console.error("Sign-in error details:", error);
      const errStr = error?.code || error?.message || "";
      
      if (errStr.includes("popup-closed-by-user")) {
        showToast(
          "Sign-In window was closed before completion. Please keep the popup open and select a Google account to connect.",
          "error"
        );
      } else if (errStr.includes("popup-blocked")) {
        showToast(
          "Sign-In popup was blocked by your browser. Please allow popups for this site and try again.",
          "error"
        );
      } else {
        showToast(error.message || "Failed to link Google account", "error");
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectWorkspace = () => {
    logoutWorkspace();
    setIsConnected(false);
    setGoogleToken(null);
    setUserEmail("");
    setUserName("");
    setSheetPreviewRows(null);
    setDriveFiles([]);
    showToast("Google Workspace disconnected.", "info");
  };

  // 2. Create Spreadsheet in user's Drive
  const handleCreateSpreadsheet = async () => {
    if (!googleToken) return;
    setIsCreatingSheet(true);
    try {
      const res = await createOrdersSpreadsheet(googleToken, shopTitle);
      setSpreadsheetId(res.spreadsheetId);
      setSpreadsheetUrl(res.spreadsheetUrl);
      localStorage.setItem("lx_g_sheet_id", res.spreadsheetId);
      localStorage.setItem("lx_g_sheet_url", res.spreadsheetUrl);
      showToast("Google Sheet database created and initialized!", "success");
      fetchSheetPreview();
    } catch (error: any) {
      showToast(error.message || "Spreadsheet creation failed", "error");
    } finally {
      setIsCreatingSheet(false);
    }
  };

  const handleManualSheetLink = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const linkOrId = (data.get("sheet_id_input") as string || "").trim();
    if (!linkOrId) return;

    const parsedId = cleanGoogleId(linkOrId);
    if (!parsedId || parsedId.length < 10) {
      showToast("Invalid Spreadsheet Link or ID. Please check the value and try again.", "error");
      return;
    }

    setSpreadsheetId(parsedId);
    const mockUrl = `https://docs.google.com/spreadsheets/d/${parsedId}/edit`;
    setSpreadsheetUrl(mockUrl);
    localStorage.setItem("lx_g_sheet_id", parsedId);
    localStorage.setItem("lx_g_sheet_url", mockUrl);
    showToast("Google Sheet manually linked successfully!", "success");
    e.currentTarget.reset();
  };

  // Fetch Sheets preview rows
  const fetchSheetPreview = async () => {
    if (!googleToken || !spreadsheetId) return;
    setIsLoadingPreview(true);
    try {
      const rows = await getSpreadsheetValues(googleToken, spreadsheetId, "Deliveries!A1:M6");
      setSheetPreviewRows(rows);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Bulk Synchronize all current orders to Google Sheets
  const handleBulkSyncOrders = async () => {
    if (!googleToken || !spreadsheetId) return;
    setIsSyncingSheet(true);
    try {
      await bulkSyncOrdersToSheet(googleToken, spreadsheetId, orders);
      showToast(`Successfully synchronized all ${orders.length} orders into Sheets!`, "success");
      fetchSheetPreview();
    } catch (error: any) {
      showToast(error.message || "Bulk orders sync failed", "error");
    } finally {
      setIsSyncingSheet(false);
    }
  };

  // Bulk Synchronize all data: Deliveries, Customers, and Products to separate tabs
  const handleSyncAllData = async () => {
    if (!googleToken || !spreadsheetId) return;

    const confirmed = window.confirm(
      `Are you sure you want to fully synchronize all data?\n\n` +
      `This will overwrite existing records in the "Deliveries", "Customers", and "Products" tabs inside your connected Google Sheet with the latest dashboard data:\n` +
      `- ${orders.length} Deliveries\n` +
      `- ${customers.length} Customers\n` +
      `- ${products.length} Products\n\n` +
      `Click OK to proceed.`
    );
    if (!confirmed) return;

    setIsSyncingAllData(true);
    try {
      await syncAllDataToSheet(googleToken, spreadsheetId, orders, customers, products);
      showToast(`Successfully synchronized all data: ${orders.length} orders, ${customers.length} customers, and ${products.length} products!`, "success");
      fetchSheetPreview();
    } catch (error: any) {
      showToast(error.message || "Full data synchronization failed", "error");
    } finally {
      setIsSyncingAllData(false);
    }
  };

  const handleToggleAutoSync = (enabled: boolean) => {
    setAutoSyncEnabled(enabled);
    localStorage.setItem("lx_g_auto_sync", String(enabled));
    showToast(`Google Sheets automated live sync ${enabled ? "enabled" : "disabled"}.`, "info");
  };

  // 3. Create Backup Folder
  const handleCreateBackupFolder = async () => {
    if (!googleToken) return;
    setIsCreatingFolder(true);
    try {
      const folderId = await createBackupFolderOnDrive(googleToken);
      setDriveFolderId(folderId);
      localStorage.setItem("lx_g_folder_id", folderId);
      showToast("Backup folder created in your Google Drive!", "success");
    } catch (error: any) {
      showToast(error.message || "Folder creation failed", "error");
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleManualFolderLink = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const linkOrId = (data.get("folder_id_input") as string || "").trim();
    if (!linkOrId) return;

    const parsedId = cleanGoogleId(linkOrId);
    if (!parsedId || parsedId.length < 10) {
      showToast("Invalid Folder Link or ID. Please check the value and try again.", "error");
      return;
    }

    setDriveFolderId(parsedId);
    localStorage.setItem("lx_g_folder_id", parsedId);
    showToast("Backup Folder manually linked successfully!", "success");
    e.currentTarget.reset();
  };

  // Create Store Backups
  const handleBackupStoreData = async () => {
    if (!googleToken || !driveFolderId) return;
    setIsCreatingBackup(true);
    try {
      // Create summary dataset
      const summaryStats = {
        shopName: shopTitle,
        backupTimestamp: new Date().toISOString(),
        totalOrdersCount: orders.length,
        revenueSummary: orders.reduce((sum, o) => o.status === "Delivered" ? sum + o.totalAmount : sum, 0),
        statusBreakdown: {
          pending: orders.filter(o => o.status === "Pending").length,
          confirmed: orders.filter(o => o.status === "Confirmed").length,
          purchased: orders.filter(o => o.status === "Purchased").length,
          outForDelivery: orders.filter(o => o.status === "Out For Delivery").length,
          delivered: orders.filter(o => o.status === "Delivered").length
        },
        ordersList: orders.map(o => ({
          id: o.id,
          customerName: o.customerDetails?.name || "N/A",
          totalAmount: o.totalAmount,
          status: o.status,
          date: o.date || "N/A"
        }))
      };

      const now = new Date();
      const filename = `local_xpress_store_backup_${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, "0")}_${String(now.getDate()).padStart(2, "0")}.json`;

      const result = await uploadBackupFileToDrive(googleToken, driveFolderId, summaryStats, filename);
      showToast(`Cloud backup created successfully: ${filename}`, "success");
      fetchDriveFiles();
    } catch (error: any) {
      showToast(error.message || "Failed to upload cloud backup", "error");
    } finally {
      setIsCreatingBackup(false);
    }
  };

  // Fetch Drive Files list
  const fetchDriveFiles = async () => {
    if (!googleToken || !driveFolderId) return;
    setIsListingFiles(true);
    try {
      const files = await listBackupFilesOnDrive(googleToken, driveFolderId);
      setDriveFiles(files);
    } catch (error) {
      console.error(error);
    } finally {
      setIsListingFiles(false);
    }
  };

  // Delete Backup File with confirmation
  const handleDeleteBackupFile = async (fileId: string, filename: string) => {
    if (!googleToken) return;

    // Strict safety mandate: explicit confirmation
    const confirmed = window.confirm(`Permanently delete the cloud backup file "${filename}" from Google Drive? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      await deleteBackupFileOnDrive(googleToken, fileId);
      showToast("Cloud backup file deleted.", "success");
      fetchDriveFiles();
    } catch (error: any) {
      showToast(error.message || "Failed to delete backup file", "error");
    }
  };

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-200">
      
      {/* Header */}
      <div>
        <h3 className="font-display font-black text-lg text-neutral-900 uppercase tracking-tight flex items-center gap-2">
          <Cloud className="h-5 w-5 text-orange-500" /> Google Workspace Integration
        </h3>
        <p className="text-xs text-neutral-400 font-mono mt-1">
          Secure, direct link to your Google Drive and Google Sheets for delivery tracking, ledger analytics, and database cloud backups.
        </p>
      </div>

      {/* Grid: Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: OAuth Auth & Sheets Connection (7/12) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Section 1: Google Connection Manager */}
          <div className="bg-white border border-neutral-200 p-5 rounded-3xl shadow-xs space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-display font-bold text-sm text-neutral-900">Google OAuth Account Connection</h4>
                <p className="text-[10px] text-neutral-400 mt-0.5">Link your Google account securely using Firebase credentials.</p>
              </div>
              <Database className={`h-5 w-5 ${isConnected ? "text-emerald-500" : "text-neutral-300"}`} />
            </div>

            {!isConnected ? (
              <div className="p-4 bg-orange-50/40 border border-orange-100 rounded-2xl space-y-3">
                <div className="flex items-start gap-2.5">
                  <ShieldAlert className="h-4.5 w-4.5 text-orange-500 shrink-0 mt-0.5" />
                  <div className="text-xs text-neutral-600 leading-normal font-medium">
                    <p className="font-bold text-neutral-800">Connection required</p>
                    Connect your account to enable spreadsheet exports and automatic backups. We request permissions to write only the spreadsheets and backup files you interact with.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleConnectWorkspace}
                  disabled={isConnecting}
                  className="gsi-material-button w-full sm:w-auto cursor-pointer"
                >
                  <div className="gsi-material-button-state"></div>
                  <div className="gsi-material-button-content-wrapper">
                    <div className="gsi-material-button-icon">
                      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: "block" }}>
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                        <path fill="none" d="M0 0h48v48H0z"></path>
                      </svg>
                    </div>
                    <span className="gsi-material-button-contents font-display text-xs font-bold">
                      {isConnecting ? "Connecting Google Account..." : "Connect Google Workspace"}
                    </span>
                  </div>
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600">
                    <Check className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-neutral-800">Workspace Connected</p>
                    <p className="text-[10px] text-neutral-500 font-mono">{userEmail || "Google Account Enabled"}</p>
                    {userName && <p className="text-[9px] text-neutral-400 mt-0.5 font-display">Authorized by {userName}</p>}
                  </div>
                </div>
                <button
                  onClick={handleDisconnectWorkspace}
                  className="bg-neutral-100 hover:bg-neutral-200 text-neutral-600 text-[10px] font-bold px-3 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="h-3 w-3" /> Disconnect
                </button>
              </div>
            )}
          </div>

          {/* Section 2: Google Sheets Control Card */}
          <div className="bg-white border border-neutral-200 p-5 rounded-3xl shadow-xs space-y-4">
            <div className="flex items-start justify-between pb-1 border-b border-neutral-100 gap-2">
              <div>
                <h4 className="font-display font-bold text-sm text-neutral-900 flex items-center gap-1.5">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Google Sheets Sync Hub
                </h4>
                <p className="text-[10px] text-neutral-400 mt-0.5">Maintain a real-time order database spreadsheet on Google Drive.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSetupStep(1);
                  setIsSetupModalOpen(true);
                }}
                className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold text-[10px] px-2.5 py-1.5 rounded-xl transition flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Sparkles className="h-3 w-3 text-emerald-600 animate-pulse" /> Setup Wizard
              </button>
            </div>

            {/* If Spreadsheet Linked */}
            {spreadsheetId ? (
              <div className="space-y-4 text-xs font-medium">
                {/* Active Sheet Card */}
                <div className="bg-neutral-50 border border-neutral-150 p-4 rounded-2xl space-y-2.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded font-mono uppercase">
                        ACTIVE SPREADSHEET LINKED
                      </span>
                      <h5 className="font-bold text-neutral-800 mt-1.5 truncate max-w-xs sm:max-w-md">
                        {shopTitle} - Orders & Deliveries
                      </h5>
                    </div>
                    <a
                      href={spreadsheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-bold text-[10px] hover:underline"
                    >
                      Open Sheet <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-neutral-500 font-mono bg-white p-2 border border-neutral-150 rounded-lg">
                    <span className="font-bold text-neutral-400">ID:</span>
                    <span className="select-all break-all">{spreadsheetId}</span>
                  </div>

                  {/* Actions row */}
                  <div className="flex flex-col sm:flex-row gap-2 pt-1.5 flex-wrap">
                    <button
                      onClick={handleSyncAllData}
                      disabled={!isConnected || isSyncingAllData}
                      className="bg-[#FF6321] hover:bg-orange-600 disabled:opacity-50 text-white font-extrabold text-[10px] px-3.5 py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm font-display uppercase tracking-wider"
                    >
                      {isSyncingAllData ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Syncing All Data...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5 text-orange-200" /> Sync All Data (All Tabs)
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleBulkSyncOrders}
                      disabled={!isConnected || isSyncingSheet}
                      className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-[10px] px-3.5 py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {isSyncingSheet ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Pushing {orders.length} orders...
                        </>
                      ) : (
                        <>
                          <Check className="h-3.5 w-3.5" /> Sync Orders Only ({orders.length})
                        </>
                      )}
                    </button>

                    <button
                      onClick={fetchSheetPreview}
                      disabled={!isConnected || isLoadingPreview}
                      className="border border-neutral-200 hover:bg-neutral-50 text-neutral-600 font-bold text-[10px] px-3 py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className={`h-3 w-3 ${isLoadingPreview ? "animate-spin" : ""}`} /> Refresh Preview
                    </button>
                  </div>
                </div>

                {/* Configurations */}
                <div className="flex items-center justify-between p-3.5 bg-neutral-50/50 border border-neutral-100 rounded-2xl">
                  <div>
                    <p className="font-bold text-neutral-800 text-xs">Automated Live Order Sync</p>
                    <p className="text-[10px] text-neutral-400">Append & update order rows in sheet on delivery status switches</p>
                  </div>
                  <button
                    onClick={() => handleToggleAutoSync(!autoSyncEnabled)}
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      autoSyncEnabled ? "bg-[#FF6321]" : "bg-neutral-200"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                        autoSyncEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Spreadsheet live content preview table */}
                <div className="space-y-2">
                  <h5 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Spreadsheet Live Preview (First 5 Rows)</h5>
                  {isLoadingPreview ? (
                    <div className="p-8 border border-neutral-150 rounded-2xl flex items-center justify-center text-neutral-400 text-xs gap-1.5">
                      <RefreshCw className="h-4 w-4 animate-spin text-[#FF6321]" /> Loading live sheet records...
                    </div>
                  ) : sheetPreviewRows && sheetPreviewRows.length > 0 ? (
                    <div className="border border-neutral-150 rounded-2xl overflow-hidden overflow-x-auto max-w-full">
                      <table className="w-full text-left border-collapse font-sans text-[10px]">
                        <thead>
                          <tr className="bg-neutral-50 border-b border-neutral-150 text-neutral-600 font-bold">
                            {sheetPreviewRows[0].slice(0, 5).map((h: string, idx: number) => (
                              <th key={idx} className="p-2.5 font-display text-[9px] uppercase tracking-wider shrink-0">{h}</th>
                            ))}
                            <th className="p-2.5 font-display text-[9px] uppercase tracking-wider">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 font-medium">
                          {sheetPreviewRows.slice(1).map((row: any[], rowIdx: number) => (
                            <tr key={rowIdx} className="hover:bg-neutral-50/50">
                              <td className="p-2.5 font-mono text-neutral-800 font-bold">{row[0]}</td>
                              <td className="p-2.5 text-neutral-700 font-display truncate max-w-[100px]">{row[1]}</td>
                              <td className="p-2.5 text-neutral-500 font-mono">{row[2]}</td>
                              <td className="p-2.5 text-neutral-500 truncate max-w-[120px]">{row[3]}</td>
                              <td className="p-2.5 text-neutral-500">{row[4]}</td>
                              <td className="p-2.5 font-bold">
                                <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-mono uppercase ${
                                  row[11] === "Delivered" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                                  row[11] === "Out for Delivery" ? "bg-indigo-50 text-indigo-600 border border-indigo-100" :
                                  row[11] === "Sourced" ? "bg-amber-50 text-amber-600 border border-amber-100" :
                                  "bg-neutral-50 text-neutral-600 border border-neutral-100"
                                }`}>
                                  {row[11]}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-6 border border-dashed border-neutral-200 rounded-2xl text-center text-neutral-400 text-xs">
                      No values retrieved from sheet yet. Tap "Refresh Preview" or run sync above.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center p-6 bg-neutral-50 border border-dashed border-neutral-200 rounded-3xl space-y-3">
                  <Database className="h-8 w-8 text-neutral-300 mx-auto" />
                  <div>
                    <h5 className="font-bold text-neutral-700 text-xs">No Sheets Database Configured</h5>
                    <p className="text-[10px] text-neutral-400 max-w-xs mx-auto mt-1">
                      Start your data sync with our step-by-step Guided Setup Wizard! (सिंक चालू करने के लिए सेटअप विज़ार्ड इस्तेमाल करें।)
                    </p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row justify-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSetupStep(1);
                        setIsSetupModalOpen(true);
                      }}
                      className="bg-[#FF6321] hover:bg-orange-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm mx-auto sm:mx-0"
                    >
                      <Sparkles className="h-4 w-4 text-orange-200" /> Launch Guided Setup Wizard
                    </button>
                    
                    <button
                      type="button"
                      onClick={handleCreateSpreadsheet}
                      disabled={!isConnected || isCreatingSheet}
                      className="border border-neutral-300 hover:bg-neutral-100 disabled:opacity-50 text-neutral-700 font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer mx-auto sm:mx-0"
                    >
                      {isCreatingSheet ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#FF6321]" /> Provisioning...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 text-emerald-600" /> Provision Direct
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="border-t border-neutral-100 pt-3">
                  <form onSubmit={handleManualSheetLink} className="space-y-2">
                    <label className="text-[9px] font-display uppercase tracking-wider font-extrabold text-neutral-400 block">
                      Or link an existing sheet ID / URL
                    </label>
                    <div className="flex gap-2">
                      <input
                        name="sheet_id_input"
                        type="text"
                        placeholder="Paste Spreadsheet URL or ID..."
                        className="flex-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-[#FF6321] focus:border-[#FF6321]"
                      />
                      <button
                        type="submit"
                        disabled={!isConnected}
                        className="bg-neutral-800 hover:bg-neutral-950 text-white disabled:opacity-50 font-bold text-xs px-3.5 py-2 rounded-xl transition shrink-0 cursor-pointer"
                      >
                        Link Sheet
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Google Drive Backup Manager (5/12) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-neutral-200 p-5 rounded-3xl shadow-xs space-y-4">
            <div className="flex items-start justify-between pb-1 border-b border-neutral-100">
              <div>
                <h4 className="font-display font-bold text-sm text-neutral-900 flex items-center gap-1.5">
                  <Folder className="h-4 w-4 text-amber-500" /> Drive Backups Hub
                </h4>
                <p className="text-[10px] text-neutral-400 mt-0.5">Automated store database & analytics backups saved as cloud JSON files.</p>
              </div>
            </div>

            {driveFolderId ? (
              <div className="space-y-4">
                {/* Active Folder Card */}
                <div className="bg-neutral-50 border border-neutral-150 p-4 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <div>
                      <span className="text-[8px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded font-mono uppercase">
                        BACKUP FOLDER ACTIVE
                      </span>
                      <h5 className="font-bold text-neutral-800 mt-1 flex items-center gap-1">
                        Local Xpress Backups
                      </h5>
                    </div>
                    <a
                      href={`https://drive.google.com/drive/folders/${driveFolderId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-bold text-[10px] hover:underline"
                    >
                      Drive Folder <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-neutral-500 font-mono bg-white p-2 border border-neutral-150 rounded-lg">
                    <span className="font-bold text-neutral-400">ID:</span>
                    <span className="select-all break-all">{driveFolderId}</span>
                  </div>

                  {/* Backup actions */}
                  <div className="flex gap-2 pt-1.5">
                    <button
                      onClick={handleBackupStoreData}
                      disabled={!isConnected || isCreatingBackup}
                      className="flex-1 bg-neutral-900 hover:bg-neutral-950 disabled:opacity-50 text-white font-bold text-[10px] py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      {isCreatingBackup ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Uploading JSON...
                        </>
                      ) : (
                        <>
                          <Cloud className="h-3.5 w-3.5 text-orange-400" /> Create Storefront Backup
                        </>
                      )}
                    </button>
                    <button
                      onClick={fetchDriveFiles}
                      disabled={!isConnected || isListingFiles}
                      className="border border-neutral-200 hover:bg-neutral-50 text-neutral-600 font-bold p-2.5 rounded-xl transition flex items-center justify-center cursor-pointer"
                      title="Sync File List"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isListingFiles ? "animate-spin" : ""}`} />
                    </button>
                  </div>
                </div>

                {/* Cloud File List browser */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h5 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Drive Backup Files</h5>
                    <span className="text-[8px] font-mono text-neutral-500 uppercase">Ordered by Date</span>
                  </div>

                  {isListingFiles ? (
                    <div className="p-8 border border-neutral-150 rounded-2xl flex items-center justify-center text-neutral-400 text-xs gap-1.5">
                      <RefreshCw className="h-4 w-4 animate-spin text-orange-500" /> Listing files on Drive...
                    </div>
                  ) : driveFiles.length > 0 ? (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {driveFiles.map((f) => (
                        <div key={f.id} className="p-3 bg-neutral-50 hover:bg-neutral-100/70 border border-neutral-150 rounded-2xl flex items-center justify-between gap-3 text-xs transition">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="h-8 w-8 bg-neutral-200 text-neutral-600 rounded-lg flex items-center justify-center shrink-0">
                              <FileText className="h-4.5 w-4.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-neutral-800 truncate text-[11px] font-sans" title={f.name}>
                                {f.name}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5 text-[9px] text-neutral-400 font-mono">
                                <span>{f.size ? `${(parseInt(f.size) / 1024).toFixed(1)} KB` : "0 KB"}</span>
                                <span>•</span>
                                <span>{new Date(f.createdTime).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <a
                              href={f.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 hover:bg-white text-neutral-500 hover:text-neutral-900 border border-transparent hover:border-neutral-200 rounded-lg transition"
                              title="View Cloud File"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                            <button
                              onClick={() => handleDeleteBackupFile(f.id, f.name)}
                              className="p-1.5 hover:bg-rose-50 text-neutral-400 hover:text-rose-600 border border-transparent hover:border-rose-100 rounded-lg transition cursor-pointer"
                              title="Delete Backup"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 border border-dashed border-neutral-200 rounded-2xl text-center text-neutral-400 text-xs space-y-2">
                      <AlertCircle className="h-6 w-6 text-neutral-300 mx-auto" />
                      <div>
                        <p className="font-bold text-neutral-600">No backup files found</p>
                        <p className="text-[10px] text-neutral-400 mt-0.5">Click "Create Storefront Backup" above to save your first snapshot to Google Drive.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center p-6 bg-neutral-50 border border-dashed border-neutral-200 rounded-3xl space-y-3">
                  <FolderPlus className="h-8 w-8 text-neutral-300 mx-auto" />
                  <div>
                    <h5 className="font-bold text-neutral-700 text-xs">No Cloud Backup Folder</h5>
                    <p className="text-[10px] text-neutral-400 max-w-xs mx-auto mt-1">
                      Establish a dedicated backups directory in Google Drive to store JSON spreadsheets & automated ledgers.
                    </p>
                  </div>
                  <button
                    onClick={handleCreateBackupFolder}
                    disabled={!isConnected || isCreatingFolder}
                    className="bg-neutral-800 hover:bg-neutral-950 disabled:opacity-50 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 mx-auto cursor-pointer shadow-xs"
                  >
                    {isCreatingFolder ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Creating backup directory...
                      </>
                    ) : (
                      <>
                        <FolderPlus className="h-4 w-4" /> Provision Cloud Backups Folder
                      </>
                    )}
                  </button>
                </div>

                <div className="border-t border-neutral-100 pt-3">
                  <form onSubmit={handleManualFolderLink} className="space-y-2">
                    <label className="text-[9px] font-display uppercase tracking-wider font-extrabold text-neutral-400 block">
                      Or link an existing Google Drive Folder ID
                    </label>
                    <div className="flex gap-2">
                      <input
                        name="folder_id_input"
                        type="text"
                        placeholder="Paste Drive Folder ID..."
                        className="flex-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-[#FF6321] focus:border-[#FF6321]"
                      />
                      <button
                        type="submit"
                        disabled={!isConnected}
                        className="bg-neutral-800 hover:bg-neutral-950 text-white disabled:opacity-50 font-bold text-xs px-3.5 py-2 rounded-xl transition shrink-0 cursor-pointer"
                      >
                        Link Folder
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* --- GUIDED OAUTH & SHEETS SETUP WIZARD MODAL --- */}
      <AnimatePresence>
        {isSetupModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.25 }}
              className="bg-white border border-neutral-200 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden text-left"
            >
              {/* Header */}
              <div className="bg-neutral-900 text-white p-5 flex justify-between items-center relative">
                <div>
                  <span className="text-[9px] font-extrabold uppercase bg-[#FF6321] text-white px-2 py-0.5 rounded-md font-mono tracking-wider">
                    STEP-BY-STEP SETUP GUIDE
                  </span>
                  <h4 className="font-display font-black text-base text-white mt-1 uppercase tracking-tight flex items-center gap-1.5">
                    <FileSpreadsheet className="h-4 w-4 text-[#FF6321]" /> Google Sheets Sync Setup
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSetupModalOpen(false)}
                  className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white p-2 rounded-full transition cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Steps Progress Bar */}
              <div className="bg-neutral-50 px-6 py-3.5 border-b border-neutral-150 flex items-center justify-between text-[11px] font-mono text-neutral-400 font-bold">
                <div className="flex items-center gap-2">
                  <span className={`h-5 w-5 rounded-full flex items-center justify-center ${setupStep >= 1 ? "bg-indigo-600 text-white" : "bg-neutral-200 text-neutral-500"}`}>1</span>
                  <span className={setupStep >= 1 ? "text-indigo-600 font-extrabold" : ""}>Google Auth</span>
                </div>
                <div className="h-px bg-neutral-200 flex-1 mx-3" />
                <div className="flex items-center gap-2">
                  <span className={`h-5 w-5 rounded-full flex items-center justify-center ${setupStep >= 2 ? "bg-indigo-600 text-white" : "bg-neutral-200 text-neutral-500"}`}>2</span>
                  <span className={setupStep >= 2 ? "text-indigo-600 font-extrabold" : ""}>Link Spreadsheet</span>
                </div>
                <div className="h-px bg-neutral-200 flex-1 mx-3" />
                <div className="flex items-center gap-2">
                  <span className={`h-5 w-5 rounded-full flex items-center justify-center ${setupStep >= 3 ? "bg-indigo-600 text-white" : "bg-neutral-200 text-neutral-500"}`}>3</span>
                  <span className={setupStep >= 3 ? "text-indigo-600 font-extrabold" : ""}>Initial Sync</span>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5">
                {/* STEP 1: Google Authentication */}
                {setupStep === 1 && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="space-y-2">
                      <h5 className="font-display font-bold text-sm text-neutral-900">Step 1: Secure Google Authentication (OAuth)</h5>
                      <p className="text-xs text-neutral-500 leading-relaxed">
                        To enable direct data transfers, we must obtain an authorized <strong>Google Access Token</strong>. This token remains cached locally in your browser session and is used only to interact with your Google Sheets.
                      </p>
                      <div className="p-2.5 bg-orange-50/40 border border-orange-100 rounded-xl flex items-start gap-2 mt-2">
                        <Info className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-neutral-600 font-display">
                          <strong>Hindi Guide:</strong> सबसे पहले "Connect Google Workspace" पर क्लिक करके अपना Google अकाउंट लिंक करें।
                        </p>
                      </div>
                    </div>

                    {/* OAuth Connection Card */}
                    <div className="p-4 border rounded-2xl bg-neutral-50/50">
                      {isConnected ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-600">
                                <Check className="h-4.5 w-4.5" />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-neutral-800">Connected to Google Account</p>
                                <p className="text-[10px] text-neutral-500 font-mono">{userEmail}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={handleDisconnectWorkspace}
                              className="text-[10px] font-bold text-rose-600 hover:bg-rose-50 border border-rose-100 px-2.5 py-1.5 rounded-lg transition"
                            >
                              Disconnect
                            </button>
                          </div>

                          {/* Masked Access Token Display */}
                          <div className="border-t border-neutral-200 pt-2.5 space-y-1.5">
                            <div className="flex justify-between items-center text-[10px] font-mono text-neutral-500">
                              <span className="font-bold">OAUTH ACCESS TOKEN:</span>
                              <button
                                type="button"
                                onClick={() => setShowSecureToken(!showSecureToken)}
                                className="text-indigo-600 font-bold hover:underline"
                              >
                                {showSecureToken ? "Hide Details" : "Show Captured Token"}
                              </button>
                            </div>
                            <div className="bg-white border p-2 rounded-lg font-mono text-[9px] text-neutral-500 break-all select-all">
                              {showSecureToken 
                                ? googleToken 
                                : `ya29.${googleToken ? googleToken.substring(5, 25) : "................"}-CAPTURED-SECURE-OAUTH-TOKEN`}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4 space-y-3">
                          <button
                            type="button"
                            onClick={handleConnectWorkspace}
                            disabled={isConnecting}
                            className="gsi-material-button w-full sm:w-auto cursor-pointer"
                          >
                            <div className="gsi-material-button-state"></div>
                            <div className="gsi-material-button-content-wrapper">
                              <div className="gsi-material-button-icon">
                                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: "block" }}>
                                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                                  <path fill="none" d="M0 0h48v48H0z"></path>
                                </svg>
                              </div>
                              <span className="gsi-material-button-contents font-display text-xs font-bold">
                                {isConnecting ? "Connecting Google Account..." : "Connect Google Workspace"}
                              </span>
                            </div>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Navigation */}
                    <div className="flex justify-end pt-2 border-t">
                      <button
                        type="button"
                        disabled={!isConnected}
                        onClick={() => setSetupStep(2)}
                        className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1 cursor-pointer"
                      >
                        Next Step: Link Sheet <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2: Link Spreadsheet */}
                {setupStep === 2 && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="space-y-2">
                      <h5 className="font-display font-bold text-sm text-neutral-900">Step 2: Connect Spreadsheet (Sheet ID)</h5>
                      <p className="text-xs text-neutral-500 leading-relaxed">
                        To store the database, you can either automatically spin up a brand new pre-formatted Google Sheet OR link an existing one by pasting its link below.
                      </p>
                      <div className="p-2.5 bg-orange-50/40 border border-orange-100 rounded-xl flex items-start gap-2 mt-2">
                        <Info className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-neutral-600 font-display">
                          <strong>Hindi Guide:</strong> यहाँ से एक नया Google Sheet बनाएं ("Provision New Sheet") या फिर पुरानी शीट का Link नीचे पेस्ट करके लिंक करें।
                        </p>
                      </div>
                    </div>

                    {/* Option A: Provision */}
                    <div className="p-4 border rounded-2xl bg-neutral-50/50 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-neutral-400 font-mono">OPTION A: QUICK AUTO-PROVISION</span>
                        {spreadsheetId && (
                          <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded font-mono uppercase">
                            SPREADSHEET ACTIVE
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={handleCreateSpreadsheet}
                        disabled={!isConnected || isCreatingSheet}
                        className="w-full bg-[#FF6321] hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        {isCreatingSheet ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" /> Provisioning new sheet...
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4" /> Provision New Sheet Database
                          </>
                        )}
                      </button>
                    </div>

                    {/* Option B: Manual input */}
                    <div className="p-4 border rounded-2xl bg-white space-y-3">
                      <span className="text-[10px] font-bold text-neutral-400 font-mono block">OPTION B: LINK AN EXISTING SHEET</span>
                      <form 
                        onSubmit={(e) => {
                          handleManualSheetLink(e);
                        }} 
                        className="space-y-2"
                      >
                        <div className="flex gap-2">
                          <input
                            name="sheet_id_input"
                            type="text"
                            placeholder="Paste Spreadsheet URL or Sheet ID..."
                            className="flex-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <button
                            type="submit"
                            disabled={!isConnected}
                            className="bg-neutral-800 hover:bg-neutral-950 text-white disabled:opacity-50 font-bold text-xs px-3.5 py-2 rounded-xl transition shrink-0 cursor-pointer"
                          >
                            Link ID
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Active Sheet Metadata */}
                    {spreadsheetId && (
                      <div className="p-3 bg-emerald-50/40 border border-emerald-100 rounded-xl space-y-1 text-xs">
                        <p className="font-bold text-emerald-800">✓ Spreadsheet Connected Successfully</p>
                        <p className="text-[10px] text-neutral-500 font-mono truncate">
                          <strong>Active ID:</strong> {spreadsheetId}
                        </p>
                        <a
                          href={spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:underline font-bold text-[10px] flex items-center gap-1 mt-1"
                        >
                          Open Google Sheet <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}

                    {/* Navigation */}
                    <div className="flex justify-between pt-2 border-t">
                      <button
                        type="button"
                        onClick={() => setSetupStep(1)}
                        className="border hover:bg-neutral-50 font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1 cursor-pointer"
                      >
                        <ChevronLeft className="h-4 w-4" /> Back to Auth
                      </button>
                      <button
                        type="button"
                        disabled={!spreadsheetId}
                        onClick={() => setSetupStep(3)}
                        className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1 cursor-pointer"
                      >
                        Next: Full Sync <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: Perform Full Synchronization */}
                {setupStep === 3 && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="space-y-2">
                      <h5 className="font-display font-bold text-sm text-neutral-900">Step 3: Initial Full Synchronization</h5>
                      <p className="text-xs text-neutral-500 leading-relaxed">
                        To solve the issue of data not showing in your Google Sheets, we must perform an initial batch push. This creates three distinct tabs inside your spreadsheet and populates them:
                      </p>
                    </div>

                    {/* Dataset list */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 border rounded-xl bg-neutral-50/50 text-center space-y-1">
                        <p className="text-[10px] font-bold text-neutral-400 font-mono uppercase">🚚 DELIVERIES</p>
                        <p className="font-display font-black text-lg text-neutral-800">{orders.length}</p>
                        <p className="text-[8px] text-neutral-400 font-mono">Records</p>
                      </div>
                      <div className="p-3 border rounded-xl bg-neutral-50/50 text-center space-y-1">
                        <p className="text-[10px] font-bold text-neutral-400 font-mono uppercase">👥 CUSTOMERS</p>
                        <p className="font-display font-black text-lg text-neutral-800">{customers.length}</p>
                        <p className="text-[8px] text-neutral-400 font-mono">Records</p>
                      </div>
                      <div className="p-3 border rounded-xl bg-neutral-50/50 text-center space-y-1">
                        <p className="text-[10px] font-bold text-neutral-400 font-mono uppercase">📦 PRODUCTS</p>
                        <p className="font-display font-black text-lg text-neutral-800">{products.length}</p>
                        <p className="text-[8px] text-neutral-400 font-mono">Records</p>
                      </div>
                    </div>

                    <div className="p-2.5 bg-orange-50/40 border border-orange-100 rounded-xl flex items-start gap-2">
                      <Info className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-neutral-600 font-display">
                        <strong>Hindi Guide:</strong> अब "Sync All Data to Sheet" पर क्लिक करें। यह शीट में 'Deliveries', 'Customers' और 'Products' तीन अलग-अलग टैब बनाकर सारा डेटा सुरक्षित रूप से सिंक कर देगा।
                      </p>
                    </div>

                    {/* Sync Action */}
                    <div className="p-4 border rounded-2xl bg-indigo-50/20 text-center space-y-3">
                      <button
                        type="button"
                        onClick={async () => {
                          setIsSyncingAllData(true);
                          try {
                            await syncAllDataToSheet(googleToken!, spreadsheetId, orders, customers, products);
                            showToast(`Successfully synchronized all data: ${orders.length} orders, ${customers.length} customers, and ${products.length} products!`, "success");
                            fetchSheetPreview();
                          } catch (error: any) {
                            showToast(error.message || "Full data synchronization failed", "error");
                          } finally {
                            setIsSyncingAllData(false);
                          }
                        }}
                        disabled={!isConnected || isSyncingAllData}
                        className="w-full bg-[#FF6321] hover:bg-orange-600 disabled:opacity-50 text-white font-extrabold text-sm py-3.5 rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md font-display uppercase tracking-wider"
                      >
                        {isSyncingAllData ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" /> Synchronizing Database...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 text-orange-200" /> Sync All Data to Sheet
                          </>
                        )}
                      </button>
                    </div>

                    {/* Navigation */}
                    <div className="flex justify-between pt-2 border-t">
                      <button
                        type="button"
                        onClick={() => setSetupStep(2)}
                        className="border hover:bg-neutral-50 font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1 cursor-pointer"
                      >
                        <ChevronLeft className="h-4 w-4" /> Back
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsSetupModalOpen(false);
                          fetchSheetPreview();
                        }}
                        className="bg-neutral-900 hover:bg-neutral-950 text-white font-bold text-xs px-5 py-2 rounded-xl transition cursor-pointer"
                      >
                        Complete & Close
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}