import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, MessageSquare, Search, MapPin, Image as ImageIcon, 
  Upload, FileText, Check, AlertCircle, RefreshCw, Send, 
  User, Bot, Download, Sliders, Play, Edit, HelpCircle
} from "lucide-react";
import { useToast } from "./Toast";
import { Vendor, Order } from "../types";

interface Message {
  role: "user" | "assistant";
  text: string;
}

interface AICopilotProps {
  currentRole: string;
  vendors: Vendor[];
  orders: Order[];
  onAddPurchaseRecord?: (purchase: any) => void;
  onAddProductImage?: (productId: string, imageUrl: string) => void;
}

export default function AICopilot({ currentRole, vendors, orders, onAddPurchaseRecord, onAddProductImage }: AICopilotProps) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<"chat" | "search" | "maps" | "billing" | "images">("chat");

  // 1. CHAT TAB STATES
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatModel, setChatModel] = useState<"gemini-3.5-flash" | "gemini-3.1-pro-preview" | "gemini-3.1-flash-lite">("gemini-3.5-flash");
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // 2. SEARCH GROUNDING STATES
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState("");
  const [searchSources, setSearchSources] = useState<{ title: string; uri: string }[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // 3. MAPS GROUNDING STATES
  const [mapsQuery, setMapsQuery] = useState("");
  const [mapsResult, setMapsResult] = useState("");
  const [mapsLoading, setMapsLoading] = useState(false);

  // 4. RECEIPT ANALYSIS / BILLING STATES
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [extractedBill, setExtractedBill] = useState<{
    vendorName?: string;
    billNumber?: string;
    purchaseAmount?: number;
    purchaseDate?: string;
    purchasedItems?: string;
  } | null>(null);
  const [selectedOrderIdForBill, setSelectedOrderIdForBill] = useState("");

  // 5. IMAGE GENERATION / EDITING STATES
  const [imagePrompt, setImagePrompt] = useState("");
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<"1K" | "2K" | "4K">("1K");
  const [imageModel, setImageModel] = useState<"gemini-3-pro-image" | "gemini-3.1-flash-image">("gemini-3-pro-image");
  const [imageLoading, setImageLoading] = useState(false);
  const [imageToEdit, setImageToEdit] = useState<string | null>(null);
  const [editPromptMode, setEditPromptMode] = useState(false);

  // System instructions depending on user roles
  const getSystemInstruction = () => {
    switch (currentRole) {
      case "Admin":
        return "You are LX Strategic Consultant, an AI business intelligence officer for Local Xpress hyperlocal delivery. Give data-driven advice on delivery optimization, vendor performance, margins, customer loyalty programs, and pricing models. Keep responses professional, analytical, and highly actionable.";
      case "Staff":
        return "You are LX Dispatch Assistant, an expert logistical AI coordinator. Help coordinate runner assignments, troubleshoot delayed orders, interpret delivery maps, advise on weather or traffic detours, and assist in logging billing receipts.";
      default:
        return "You are LX Customer Concierge, a helpful local assistant. Answer customer queries about order statuses, food/grocery recommendations in Birdpur & Siddharthnagar, pricing, and general delivery support. Keep answers friendly, reassuring, and clear.";
    }
  };

  // Scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  // Seed initial welcome message
  useEffect(() => {
    if (chatMessages.length === 0) {
      let welcome = "";
      if (currentRole === "Admin") {
        welcome = "Hello Admin, I am your Strategic Analytics Consultant. Let's analyze vendor revenues, plan expansions, or write customer promos!";
      } else if (currentRole === "Staff") {
        welcome = "LX Dispatcher Console AI active. Upload purchase bills for instant receipt scanning, search road blockages, or map runner routes!";
      } else {
        welcome = "Welcome to Local Xpress support! Ask me about open shops, order tracking, or menu suggestions in your area.";
      }
      setChatMessages([{ role: "assistant", text: welcome }]);
    }
  }, [currentRole]);

  // 1. CHAT SUBMIT
  const handleChatSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMsgText = chatInput;
    const updatedMessages = [...chatMessages, { role: "user" as const, text: userMsgText }];
    setChatMessages(updatedMessages);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          systemInstruction: getSystemInstruction(),
          model: chatModel
        })
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      
      setChatMessages(prev => [...prev, { role: "assistant", text: data.reply }]);
    } catch (err: any) {
      console.error(err);
      showToast(`AI Chat Error: ${err.message || "Failed to reach model"}`, "error");
    } finally {
      setChatLoading(false);
    }
  };

  // 2. GROUNDED SEARCH SUBMIT
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || searchLoading) return;

    setSearchLoading(true);
    setSearchResult("");
    setSearchSources([]);

    try {
      const res = await fetch("/api/gemini/grounded", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchQuery,
          type: "search"
        })
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      
      setSearchResult(data.text);
      setSearchSources(data.sources || []);
      showToast("Search search grounding synchronized successfully!", "success");
    } catch (err: any) {
      console.error(err);
      showToast(`Search Grounding Error: ${err.message}`, "error");
    } finally {
      setSearchLoading(false);
    }
  };

  // 3. MAPS GROUNDING SUBMIT
  const handleMapsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mapsQuery.trim() || mapsLoading) return;

    setMapsLoading(true);
    setMapsResult("");

    try {
      const res = await fetch("/api/gemini/grounded", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: mapsQuery,
          type: "maps"
        })
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      
      setMapsResult(data.text);
      showToast("Route grounded with Google Maps data successfully!", "success");
    } catch (err: any) {
      console.error(err);
      showToast(`Maps Grounding Error: ${err.message}`, "error");
    } finally {
      setMapsLoading(false);
    }
  };

  // 4. IMAGE ANALYSIS (RECEIPT LOGGING)
  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setReceiptImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyzeReceipt = async () => {
    if (!receiptImage) return;
    setReceiptLoading(true);
    setExtractedBill(null);

    try {
      const res = await fetch("/api/gemini/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64Image: receiptImage
        })
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      
      setExtractedBill(data);
      showToast("Bill receipt details extracted successfully!", "success");
    } catch (err: any) {
      console.error(err);
      showToast(`Receipt Scanner Error: ${err.message}`, "error");
    } finally {
      setReceiptLoading(false);
    }
  };

  const handleAutoFillAndSave = () => {
    if (!extractedBill || !selectedOrderIdForBill || !onAddPurchaseRecord) {
      showToast("Please select an Order ID and scan a receipt first.", "warning");
      return;
    }

    const matchedVendor = vendors.find(v => 
      v.shopName.toLowerCase().includes((extractedBill.vendorName || "").toLowerCase())
    ) || vendors[0];

    const record = {
      orderId: selectedOrderIdForBill,
      vendorId: matchedVendor?.id || "VND999",
      vendorName: extractedBill.vendorName || "Scanned Vendor",
      purchaseAmount: extractedBill.purchaseAmount || 0,
      purchasedItems: extractedBill.purchasedItems || "Items listed on scanned receipt",
      billNumber: extractedBill.billNumber || `SCAN-${Math.floor(Math.random() * 9000 + 1000)}`,
      purchaseDate: extractedBill.purchaseDate || "24-06-2026",
      billImage: receiptImage
    };

    onAddPurchaseRecord(record);
    showToast(`Successfully logged and linked scanned receipt to ${selectedOrderIdForBill}!`, "success");
    
    // Reset states
    setReceiptImage(null);
    setExtractedBill(null);
    setSelectedOrderIdForBill("");
  };

  // 5. IMAGE GENERATION / EDITING
  const handleImageToEditUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImageToEdit(reader.result as string);
      setEditPromptMode(true);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imagePrompt.trim() || imageLoading) return;

    setImageLoading(true);
    setGeneratedImageUrl(null);

    try {
      const res = await fetch("/api/gemini/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: imagePrompt,
          model: editPromptMode ? "gemini-3.1-flash-image" : (imageModel === "gemini-3-pro-image" ? "gemini-3-pro-image" : "gemini-3.1-flash-image"),
          imageSize: editPromptMode ? undefined : imageSize,
          base64ImageToEdit: editPromptMode ? imageToEdit : undefined
        })
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      
      setGeneratedImageUrl(data.imageUrl);
      showToast(editPromptMode ? "Image edit completed successfully!" : "High-quality image generated successfully!", "success");
    } catch (err: any) {
      console.error(err);
      showToast(`Image Generation Error: ${err.message}`, "error");
    } finally {
      setImageLoading(false);
    }
  };

  return (
    <div id="ai-intelligence-panel" className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm flex flex-col h-[650px] md:h-[700px]">
      {/* Top Banner Header */}
      <div className="bg-neutral-900 text-white p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-orange-500 to-amber-500 rounded-xl shadow-md animate-pulse">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-orange-400 font-semibold tracking-wider uppercase">LX Intelligence Console</span>
              <span className="text-[9px] bg-white/10 text-white/80 px-1.5 py-0.5 rounded font-mono">v3.5 Live</span>
            </div>
            <h2 className="text-lg font-display font-bold">LX AI Command Copilot</h2>
          </div>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-xs text-neutral-400">Current View context:</p>
          <p className="text-xs text-orange-400 font-bold font-mono uppercase">{currentRole} Mode</p>
        </div>
      </div>

      {/* Tabs Row Navigation */}
      <div className="flex border-b border-neutral-100 bg-neutral-50 p-2 overflow-x-auto gap-1">
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition shrink-0 cursor-pointer ${
            activeTab === "chat" 
              ? "bg-white text-neutral-900 shadow-sm border border-neutral-200" 
              : "text-neutral-500 hover:text-neutral-900"
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          AI Multi-turn Chat
        </button>
        <button
          onClick={() => setActiveTab("search")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition shrink-0 cursor-pointer ${
            activeTab === "search" 
              ? "bg-white text-neutral-900 shadow-sm border border-neutral-200" 
              : "text-neutral-500 hover:text-neutral-900"
          }`}
        >
          <Search className="h-4 w-4" />
          Search Grounding
        </button>
        <button
          onClick={() => setActiveTab("maps")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition shrink-0 cursor-pointer ${
            activeTab === "maps" 
              ? "bg-white text-neutral-900 shadow-sm border border-neutral-200" 
              : "text-neutral-500 hover:text-neutral-900"
          }`}
        >
          <MapPin className="h-4 w-4" />
          Maps Route Helper
        </button>
        {currentRole !== "Customer" && (
          <button
            onClick={() => setActiveTab("billing")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition shrink-0 cursor-pointer ${
              activeTab === "billing" 
                ? "bg-white text-neutral-900 shadow-sm border border-neutral-200" 
                : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            <FileText className="h-4 w-4" />
            Receipt Log Scanner
          </button>
        )}
        <button
          onClick={() => setActiveTab("images")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition shrink-0 cursor-pointer ${
            activeTab === "images" 
              ? "bg-white text-neutral-900 shadow-sm border border-neutral-200" 
              : "text-neutral-500 hover:text-neutral-900"
          }`}
        >
          <ImageIcon className="h-4 w-4" />
          Product Catalog Designer
        </button>
      </div>

      {/* Primary Tab Body Area */}
      <div className="flex-1 overflow-y-auto p-5 bg-neutral-50/30">
        
        {/* TAB 1: MULTI-TURN CHAT */}
        {activeTab === "chat" && (
          <div className="flex flex-col h-full justify-between gap-4">
            {/* Top Toolbar controls */}
            <div className="flex justify-between items-center bg-white p-3 rounded-2xl border border-neutral-100 shadow-sm gap-2">
              <div className="flex items-center gap-2 text-xs font-medium text-neutral-700">
                <Sliders className="h-4 w-4 text-orange-500" />
                <span>Active Model:</span>
                <select
                  value={chatModel}
                  onChange={(e) => setChatModel(e.target.value as any)}
                  className="bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1 text-xs text-neutral-800 focus:outline-none"
                >
                  <option value="gemini-3.5-flash">gemini-3.5-flash (General)</option>
                  <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview (Complex)</option>
                  <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Ultra-fast)</option>
                </select>
              </div>
              <span className="text-[10px] text-neutral-400 hidden sm:inline">Role-Play Persona: <b className="text-orange-500 font-mono uppercase">{currentRole}</b></span>
            </div>

            {/* Scrollable messages thread */}
            <div className="flex-1 overflow-y-auto bg-white border border-neutral-100 rounded-3xl p-4 space-y-4 shadow-inner max-h-[360px] md:max-h-[400px]">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex items-start gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`p-2 rounded-xl text-white ${msg.role === "user" ? "bg-orange-500" : "bg-neutral-800"}`}>
                    {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div className={`max-w-[80%] rounded-2xl p-3 text-sm leading-relaxed ${
                    msg.role === "user" 
                      ? "bg-orange-50 text-neutral-900 border border-orange-100" 
                      : "bg-neutral-100 text-neutral-850"
                  }`}>
                    {msg.text.split("\n").map((line, lIdx) => (
                      <p key={lIdx} className={lIdx > 0 ? "mt-1" : ""}>{line}</p>
                    ))}
                  </div>
                </div>
              ))}

              {chatLoading && (
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl text-white bg-neutral-800">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="bg-neutral-100 rounded-2xl p-4 flex items-center gap-2 text-xs text-neutral-500">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-orange-500" />
                    <span>Gemini is thinking...</span>
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Text Input area */}
            <form onSubmit={handleChatSend} className="flex gap-2 items-center">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={`Ask anything about your ${currentRole.toLowerCase()} role context...`}
                className="flex-1 bg-white border border-neutral-200 rounded-2xl px-4 py-3 text-sm text-neutral-800 focus:outline-none focus:border-orange-500 shadow-sm"
              />
              <button
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                className="bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white p-3.5 rounded-2xl shadow-md transition cursor-pointer"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: SEARCH GROUNDING */}
        {activeTab === "search" && (
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl space-y-1">
              <h4 className="font-display font-bold text-xs text-orange-800 flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5" />
                Live Market & Event Google Search Grounding
              </h4>
              <p className="text-neutral-600 text-[11px] leading-relaxed">
                Connect your AI prompt directly to the Google Search engine. Perfect for dispatchers seeking instant market prices of grocery item updates, local road disruptions, current weather delays, or nearby local emergency conditions.
              </p>
            </div>

            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <input
                type="text"
                required
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g. Current retail price of gold standard basmati rice in India today"
                className="flex-1 bg-white border border-neutral-200 rounded-2xl px-4 py-3 text-xs text-neutral-800 focus:outline-none focus:border-orange-500 shadow-sm"
              />
              <button
                type="submit"
                disabled={searchLoading}
                className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-semibold px-4 rounded-2xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                {searchLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Search
              </button>
            </form>

            {/* Results display block */}
            <div className="bg-white border border-neutral-200 rounded-3xl p-5 min-h-[180px] flex flex-col justify-between shadow-sm">
              <div className="space-y-3">
                <span className="text-[10px] font-mono text-neutral-400 font-bold uppercase tracking-wider block">Grounded Response Output</span>
                {searchLoading ? (
                  <div className="flex items-center gap-2 py-8 text-xs text-neutral-400 justify-center">
                    <RefreshCw className="h-4 w-4 animate-spin text-orange-500" />
                    <span>Crawling Google Search index...</span>
                  </div>
                ) : searchResult ? (
                  <div className="text-neutral-800 text-sm leading-relaxed whitespace-pre-line">
                    {searchResult}
                  </div>
                ) : (
                  <div className="text-neutral-400 text-xs py-8 text-center italic">
                    Enter a live market query above to fetch grounded Google Search information.
                  </div>
                )}
              </div>

              {/* Citations block */}
              {searchSources.length > 0 && (
                <div className="mt-4 pt-4 border-t border-neutral-100">
                  <span className="text-[10px] font-mono text-neutral-400 font-bold uppercase tracking-wider block mb-2">Sources & Citations:</span>
                  <div className="flex flex-wrap gap-2">
                    {searchSources.map((src, sIdx) => (
                      <a
                        key={sIdx}
                        href={src.uri}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-neutral-50 hover:bg-orange-50 border border-neutral-200 hover:border-orange-200 text-neutral-700 hover:text-orange-600 text-[10px] px-2.5 py-1 rounded-lg transition font-medium flex items-center gap-1"
                      >
                        <Search className="h-3 w-3 shrink-0 text-orange-500" />
                        <span className="truncate max-w-[150px]">{src.title}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: MAPS GROUNDING */}
        {activeTab === "maps" && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl space-y-1">
              <h4 className="font-display font-bold text-xs text-amber-800 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                Google Maps Route & Hyperlocal Place Grounding
              </h4>
              <p className="text-neutral-600 text-[11px] leading-relaxed">
                Check navigation details directly grounded on Google Maps! Perfect for planning routes, verifying if two towns (e.g. Birdpur to Siddharthnagar UP) are adjacent, or assessing exact distances and route layouts.
              </p>
            </div>

            <form onSubmit={handleMapsSubmit} className="flex gap-2">
              <input
                type="text"
                required
                value={mapsQuery}
                onChange={(e) => setMapsQuery(e.target.value)}
                placeholder="e.g. Best runner route from Sweet Corner Birdpur to Madanpur Colony, what is distance?"
                className="flex-1 bg-white border border-neutral-200 rounded-2xl px-4 py-3 text-xs text-neutral-800 focus:outline-none focus:border-orange-500 shadow-sm"
              />
              <button
                type="submit"
                disabled={mapsLoading}
                className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-semibold px-4 rounded-2xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                {mapsLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Map Route
              </button>
            </form>

            <div className="bg-white border border-neutral-200 rounded-3xl p-5 min-h-[180px] shadow-sm">
              <span className="text-[10px] font-mono text-neutral-400 font-bold uppercase tracking-wider block mb-2">Google Maps Grounded Navigation advice</span>
              {mapsLoading ? (
                <div className="flex items-center gap-2 py-8 text-xs text-neutral-400 justify-center">
                  <RefreshCw className="h-4 w-4 animate-spin text-orange-500" />
                  <span>Computing route topology from Google Maps...</span>
                </div>
              ) : mapsResult ? (
                <div className="text-neutral-800 text-sm leading-relaxed whitespace-pre-line">
                  {mapsResult}
                </div>
              ) : (
                <div className="text-neutral-400 text-xs py-8 text-center italic">
                  Enter delivery addresses above to check grounded route maps instantly.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: RECEIPT LOG SCANNER */}
        {activeTab === "billing" && (
          <div className="space-y-4">
            <div className="bg-neutral-900 text-white p-4 rounded-2xl space-y-1">
              <h4 className="font-display font-bold text-xs text-orange-400 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Receipt Scan & Log (Image Understanding - Gemini 3.1 Pro)
              </h4>
              <p className="text-neutral-400 text-[11px] leading-relaxed">
                Take or upload a picture of a physical receipt/bill purchased from a local merchant (e.g. Sweets Corner, Medicos). Gemini will scan, parse, and log it instantly.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left upload side */}
              <div className="bg-white border border-neutral-200 rounded-3xl p-4 flex flex-col items-center justify-center min-h-[220px] text-center gap-3">
                {receiptImage ? (
                  <div className="relative w-full h-[180px] rounded-xl overflow-hidden border border-neutral-200">
                    <img src={receiptImage} alt="Receipt Preview" className="w-full h-full object-contain" />
                    <button
                      onClick={() => setReceiptImage(null)}
                      className="absolute top-2 right-2 bg-neutral-900/80 hover:bg-neutral-900 text-white px-2 py-1 rounded text-[10px] font-bold"
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 text-neutral-400 mx-auto" />
                    <div>
                      <p className="text-xs font-semibold text-neutral-700">Drag/Select Shop Receipt Image</p>
                      <p className="text-[10px] text-neutral-400 mt-1">Accepts JPG, PNG receipt captures</p>
                    </div>
                    <label className="inline-block bg-neutral-900 hover:bg-neutral-800 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl cursor-pointer">
                      Select Photo
                      <input type="file" accept="image/*" onChange={handleReceiptUpload} className="hidden" />
                    </label>
                  </div>
                )}

                {receiptImage && (
                  <button
                    onClick={handleAnalyzeReceipt}
                    disabled={receiptLoading}
                    className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-bold py-2 rounded-xl shadow-sm transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    {receiptLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {receiptLoading ? "Analyzing receipt..." : "Scan & Extract Bill details"}
                  </button>
                )}
              </div>

              {/* Right Output details Side */}
              <div className="bg-white border border-neutral-200 rounded-3xl p-4 space-y-4">
                <span className="text-[10px] font-mono text-neutral-400 font-bold uppercase tracking-wider block">Parsed Receipt Parameters</span>

                {receiptLoading ? (
                  <div className="flex flex-col items-center justify-center h-[150px] text-xs text-neutral-400 gap-2">
                    <RefreshCw className="h-6 w-6 animate-spin text-orange-500" />
                    <span>OCR parsing with gemini-3.1-pro-preview...</span>
                  </div>
                ) : extractedBill ? (
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-neutral-50 p-2 rounded-lg border border-neutral-100">
                        <label className="text-[9px] text-neutral-400 block font-mono">Vendor Shop</label>
                        <span className="font-semibold text-neutral-800">{extractedBill.vendorName || "Not found"}</span>
                      </div>
                      <div className="bg-neutral-50 p-2 rounded-lg border border-neutral-100">
                        <label className="text-[9px] text-neutral-400 block font-mono">Bill No.</label>
                        <span className="font-semibold text-neutral-800">{extractedBill.billNumber || "Not found"}</span>
                      </div>
                      <div className="bg-neutral-50 p-2 rounded-lg border border-neutral-100">
                        <label className="text-[9px] text-neutral-400 block font-mono">Purchased Date</label>
                        <span className="font-semibold text-neutral-800">{extractedBill.purchaseDate || "Not found"}</span>
                      </div>
                      <div className="bg-neutral-50 p-2 rounded-lg border border-neutral-100">
                        <label className="text-[9px] text-neutral-400 block font-mono">Total Paid Amount</label>
                        <span className="font-semibold text-orange-600 font-mono">₹{extractedBill.purchaseAmount || "0"}</span>
                      </div>
                    </div>
                    <div className="bg-neutral-50 p-2 rounded-lg border border-neutral-100 text-xs">
                      <label className="text-[9px] text-neutral-400 block font-mono">Scanned Bill Items</label>
                      <span className="font-semibold text-neutral-800">{extractedBill.purchasedItems || "Not found"}</span>
                    </div>

                    <div className="pt-2 border-t border-neutral-100 space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] text-neutral-500 font-mono">Link to Order:</label>
                        <select
                          value={selectedOrderIdForBill}
                          onChange={(e) => setSelectedOrderIdForBill(e.target.value)}
                          className="flex-1 bg-neutral-50 border border-neutral-200 rounded px-2 py-1 text-xs"
                        >
                          <option value="">-- Choose Order ID --</option>
                          {orders.filter(o => o.status !== "Delivered").map(o => (
                            <option key={o.id} value={o.id}>{o.id} ({o.customerDetails.name})</option>
                          ))}
                        </select>
                      </div>

                      <button
                        onClick={handleAutoFillAndSave}
                        disabled={!selectedOrderIdForBill}
                        className="w-full bg-neutral-900 hover:bg-neutral-850 disabled:opacity-50 text-white text-[11px] font-bold py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Check className="h-3.5 w-3.5 text-green-400" />
                        Save Scanned Bill to Dispatch Log
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-neutral-400 text-xs py-10 text-center italic">
                    Scanned invoice parameters will render here automatically upon receipt capture.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: IMAGE GENERATION & EDITING */}
        {activeTab === "images" && (
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl space-y-1">
              <h4 className="font-display font-bold text-xs text-orange-800 flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5" />
                Interactive Merchant Product catalog Designer & Poster Maker
              </h4>
              <p className="text-neutral-600 text-[11px] leading-relaxed">
                Need premium product listings or banners? Generate high-resolution catalogue images with custom dimensions (1K, 2K, 4K) using <b>gemini-3-pro-image-preview</b>, or modify base64 images with text-prompts using <b>gemini-3.1-flash-image-preview</b>!
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Controls Column */}
              <form onSubmit={handleGenerateImage} className="space-y-3 bg-white p-4 rounded-3xl border border-neutral-200">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setEditPromptMode(false); setImageToEdit(null); }}
                    className={`flex-1 text-[11px] py-1.5 rounded-lg border font-bold transition cursor-pointer ${
                      !editPromptMode 
                        ? "bg-orange-50 text-orange-600 border-orange-200" 
                        : "bg-neutral-50 text-neutral-500 border-neutral-200 hover:bg-neutral-100"
                    }`}
                  >
                    Text-to-Image (1K/2K/4K)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditPromptMode(true)}
                    className={`flex-1 text-[11px] py-1.5 rounded-lg border font-bold transition cursor-pointer ${
                      editPromptMode 
                        ? "bg-orange-50 text-orange-600 border-orange-200" 
                        : "bg-neutral-50 text-neutral-500 border-neutral-200 hover:bg-neutral-100"
                    }`}
                  >
                    Edit Reference Image
                  </button>
                </div>

                {/* Edit Mode reference image selector */}
                {editPromptMode && (
                  <div className="bg-neutral-50 p-2.5 rounded-xl border border-dashed border-neutral-300 text-center text-xs space-y-2">
                    {imageToEdit ? (
                      <div className="relative h-[80px] w-full max-w-[120px] mx-auto border rounded overflow-hidden">
                        <img src={imageToEdit} alt="Edit Source" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setImageToEdit(null)}
                          className="absolute inset-0 bg-neutral-900/60 text-white font-bold flex items-center justify-center text-[10px]"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <div>
                        <p className="text-[10px] text-neutral-500">Upload catalog reference picture to start editing</p>
                        <label className="inline-block mt-1 bg-neutral-900 hover:bg-neutral-850 text-white text-[10px] px-2 py-1 rounded cursor-pointer">
                          Select Image
                          <input type="file" accept="image/*" onChange={handleImageToEditUpload} className="hidden" />
                        </label>
                      </div>
                    )}
                  </div>
                )}

                {/* Size options ONLY for Text-to-Image */}
                {!editPromptMode && (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] text-neutral-500 block mb-1">Image Size (Imagen):</label>
                      <div className="flex border border-neutral-200 rounded-lg overflow-hidden">
                        {["1K", "2K", "4K"].map((size) => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => setImageSize(size as any)}
                            className={`flex-1 text-[10px] py-1 font-bold ${
                              imageSize === size 
                                ? "bg-orange-500 text-white" 
                                : "bg-neutral-50 text-neutral-600 hover:bg-neutral-100"
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-neutral-500 block mb-1">Model Suite:</label>
                      <select
                        value={imageModel}
                        onChange={(e) => setImageModel(e.target.value as any)}
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-1.5 py-1 text-[10px]"
                      >
                        <option value="gemini-3-pro-image">gemini-3-pro-image (High Quality)</option>
                        <option value="gemini-3.1-flash-image">gemini-3.1-flash-image (Fast)</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] text-neutral-500 block font-bold uppercase tracking-wider">Promotional Prompt Text:</label>
                  <textarea
                    required
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    placeholder={editPromptMode ? "e.g. Change the background into an elegant dark wood kitchen counter" : "e.g. A gorgeous studio photo of an Indian gulab jamun sweet plate decorated with almonds on a dark marble counter, commercial food photography"}
                    rows={3}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-800 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={imageLoading || !imagePrompt.trim() || (editPromptMode && !imageToEdit)}
                  className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-xs font-bold py-2.5 rounded-xl transition shadow-md flex items-center justify-center gap-1 cursor-pointer"
                >
                  {imageLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {imageLoading ? "Generating design..." : (editPromptMode ? "Apply AI Edits" : `Generate Catalog Banner (${imageSize})`)}
                </button>
              </form>

              {/* Rendering Image Column */}
              <div className="bg-white border border-neutral-200 rounded-3xl p-4 flex flex-col items-center justify-center relative min-h-[220px]">
                {imageLoading ? (
                  <div className="flex flex-col items-center justify-center text-xs text-neutral-400 gap-2">
                    <RefreshCw className="h-6 w-6 animate-spin text-orange-500" />
                    <span>Rendering Imagen pipeline...</span>
                  </div>
                ) : generatedImageUrl ? (
                  <div className="space-y-2.5 w-full">
                    <div className="relative w-full h-[200px] border border-neutral-100 rounded-2xl overflow-hidden shadow-inner group">
                      <img src={generatedImageUrl} alt="Generated Catalog Asset" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-neutral-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                        <a
                          href={generatedImageUrl}
                          download="local-xpress-product.png"
                          className="p-2 bg-white hover:bg-neutral-50 text-neutral-900 rounded-full shadow transition"
                          title="Download Image"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                    
                    <span className="text-[10px] text-neutral-400 italic block text-center">Prompt: "{imagePrompt}"</span>
                  </div>
                ) : (
                  <div className="text-neutral-400 text-xs py-10 text-center italic">
                    Your beautiful AI-crafted product banner will render here.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
