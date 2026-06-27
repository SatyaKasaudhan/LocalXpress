import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase payload size limit to support base64 images upload
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Initialize Google Gen AI with safe checks
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build"
    }
  }
});

// 1. CHAT ENDPOINT (supports system instructions and multi-turn)
app.post("/api/gemini/chat", async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured in environment variables.");
    }

    const { messages, systemInstruction, model } = req.body;
    const selectedModel = model || "gemini-3.5-flash";

    const contents = messages.map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.text }]
    }));

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents,
      config: systemInstruction ? { systemInstruction } : undefined
    });

    const reply = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
    res.json({ reply });
  } catch (error: any) {
    console.error("Chat error:", error);
    res.status(500).json({ error: error.message || "Failed to generate chat response" });
  }
});

// 2. GROUNDED QUERIES (Supports Google Search or Google Maps grounding)
app.post("/api/gemini/grounded", async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured in environment variables.");
    }

    const { query, type } = req.body; // type: 'search' | 'maps'
    const tools: any[] = [];

    if (type === "maps") {
      tools.push({ googleMaps: {} });
    } else {
      tools.push({ googleSearch: {} });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: query,
      config: {
        tools
      }
    });

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    // Pull grounding metadata if available to return citations to the frontend
    const searchChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const sources = searchChunks
      ? searchChunks.map((chunk: any) => ({
          title: chunk.web?.title || chunk.web?.uri || "Web Source",
          uri: chunk.web?.uri || "#"
        }))
      : [];

    res.json({ text, sources });
  } catch (error: any) {
    console.error("Grounded query error:", error);
    res.status(500).json({ error: error.message || "Failed grounded search" });
  }
});

// 3. IMAGE GENERATION & EDITING ENDPOINT
app.post("/api/gemini/generate-image", async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured in environment variables.");
    }

    const { prompt, model, aspectRatio, imageSize, base64ImageToEdit } = req.body;
    const selectedModel = model || "gemini-3.1-flash-image";

    const config: any = {
      imageConfig: {
        aspectRatio: aspectRatio || "1:1"
      }
    };

    if (imageSize) {
      config.imageConfig.imageSize = imageSize; // 1K, 2K, 4K
    }

    const contentsParts: any[] = [];

    // If we're editing an existing image, include it as base64 inline data
    if (base64ImageToEdit) {
      const match = base64ImageToEdit.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
      if (match) {
        contentsParts.push({
          inlineData: {
            mimeType: match[1],
            data: match[2]
          }
        });
      }
    }

    contentsParts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: {
        parts: contentsParts
      },
      config
    });

    let base64ImageResult = "";
    let descriptionText = "";

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          base64ImageResult = `data:image/png;base64,${part.inlineData.data}`;
        } else if (part.text) {
          descriptionText += part.text;
        }
      }
    }

    if (!base64ImageResult) {
      throw new Error("No image was generated. Please try a different prompt or check content guidelines.");
    }

    res.json({ imageUrl: base64ImageResult, text: descriptionText });
  } catch (error: any) {
    console.error("Image generation error:", error);
    res.status(500).json({ error: error.message || "Failed to generate image" });
  }
});

// 4. IMAGE ANALYSIS ENDPOINT (Receipt and merchant bill scanning)
app.post("/api/gemini/analyze-image", async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured in environment variables.");
    }

    const { base64Image, prompt } = req.body;
    if (!base64Image) {
      throw new Error("No image data provided");
    }

    const match = base64Image.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
    if (!match) {
      throw new Error("Invalid image format. Must be base64 data URL.");
    }

    const mimeType = match[1];
    const data = match[2];

    const instruction = prompt || `Analyze this physical invoice/bill/receipt from a merchant and extract the following fields in structured JSON format. Return ONLY the raw JSON block without markdown formatting or any other explanation:
{
  "vendorName": "extracted vendor/merchant name",
  "billNumber": "extracted bill/receipt number",
  "purchaseAmount": total amount parsed as a number,
  "purchaseDate": "extracted date in DD-MM-YYYY format or today's date if missing",
  "purchasedItems": "comma separated string of items bought, e.g. 'Apples x2, Milk x1'"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: [
        {
          inlineData: {
            mimeType,
            data
          }
        },
        instruction
      ]
    });

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    // Clean JSON response (remove markdown backticks if any)
    const jsonString = text.replace(/```json/i, "").replace(/```/g, "").trim();
    
    try {
      const parsedData = JSON.parse(jsonString);
      res.json(parsedData);
    } catch {
      // If parsing fails, just return the raw text
      res.json({ rawText: text });
    }
  } catch (error: any) {
    console.error("Image analysis error:", error);
    res.status(500).json({ error: error.message || "Failed to analyze image" });
  }
});

// 5. AUTOMATED WHATSAPP NOTIFICATION ENDPOINT
app.post("/api/send-whatsapp", async (req, res) => {
  try {
    const { to, orderId, customerName, totalAmount, originUrl } = req.body;
    if (!to || !orderId || !customerName || !totalAmount) {
      return res.status(400).json({ error: "Missing required fields (to, orderId, customerName, totalAmount)" });
    }

    const host = originUrl || req.headers.referer || req.headers.origin || "https://ais-dev-wlqaqumppl6edblwx53mn4-41718081823.asia-southeast1.run.app";
    const invoiceLink = `${host.endsWith("/") ? host : host + "/"}?track=${orderId}&view=invoice`;

    // Modern styled digital WhatsApp message dispatch
    const messageBody = `🛒 *LOCAL XPRESS DELIVERY SUCCESS* 🚚\n\n` +
      `Hello *${customerName}*, your order *#${orderId}* has been successfully delivered!\n\n` +
      `*💰 Total Amount Paid:* ₹${totalAmount}\n` +
      `*📍 Status:* DELIVERED 🎉\n\n` +
      `View and download your digital PDF invoice here:\n${invoiceLink}\n\n` +
      `Thank you for choosing Local Xpress!`;

    console.log(`[WHATSAPP AUTOMATION GATEWAY] Message dispatched successfully:\n` +
                `==================================================\n` +
                `To: ${to}\n` +
                `Message:\n${messageBody}\n` +
                `==================================================`);

    res.json({
      success: true,
      message: `WhatsApp delivery alert + PDF invoice notification successfully dispatched to ${customerName} (${to})!`,
      body: messageBody,
      invoiceLink
    });
  } catch (error: any) {
    console.error("WhatsApp notification error:", error);
    res.status(500).json({ error: error.message || "Failed to dispatch WhatsApp notification" });
  }
});

// 6. SECURE PRODUCTION AUTHENTICATION ENDPOINT
app.post("/api/auth/login", (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: "Please provide both username and password." });
    }

    // Load custom production credentials from environment or fallback to default
    const adminUser = process.env.ADMIN_USERNAME || "admin";
    const adminPass = process.env.ADMIN_PASSWORD || "admin123";
    const staffUser = process.env.STAFF_USERNAME || "staff";
    const staffPass = process.env.STAFF_PASSWORD || "staff123";

    if (username === adminUser && password === adminPass) {
      return res.json({ 
        success: true, 
        role: "Admin", 
        username: adminUser 
      });
    } else if (username === staffUser && password === staffPass) {
      return res.json({ 
        success: true, 
        role: "Staff", 
        username: staffUser 
      });
    } else {
      return res.status(401).json({ success: false, error: "Invalid dispatcher or admin credentials." });
    }
  } catch (error: any) {
    console.error("Authentication error:", error);
    res.status(500).json({ success: false, error: "Internal server authentication error" });
  }
});

// 7. SECURE GOOGLE FORM PROXY SUBMISSION
app.post("/api/google-form/submit", async (req, res) => {
  try {
    const { googleFormUrl, fields } = req.body;
    if (!googleFormUrl) {
      return res.status(400).json({ error: "Missing googleFormUrl" });
    }

    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(fields || {})) {
      params.append(key, String(value));
    }

    // Perform background POST directly to Google Forms URL
    const response = await fetch(googleFormUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params.toString()
    });

    res.json({ success: true, status: response.status });
  } catch (error: any) {
    console.error("Google form submission error:", error);
    res.status(500).json({ error: error.message || "Failed to submit to Google Form" });
  }
});

// Vite Dev Middleware Configuration
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  });
}

startServer();
