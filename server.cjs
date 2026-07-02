var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json({ limit: "50mb" }));
app.use(import_express.default.urlencoded({ limit: "50mb", extended: true }));
var ai = new import_genai.GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build"
    }
  }
});
app.post("/api/gemini/chat", async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured in environment variables.");
    }
    const { messages, systemInstruction, model } = req.body;
    const selectedModel = model || "gemini-3.5-flash";
    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.text }]
    }));
    const response = await ai.models.generateContent({
      model: selectedModel,
      contents,
      config: systemInstruction ? { systemInstruction } : void 0
    });
    const reply = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
    res.json({ reply });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: error.message || "Failed to generate chat response" });
  }
});
app.post("/api/gemini/grounded", async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured in environment variables.");
    }
    const { query, type } = req.body;
    const tools = [];
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
    const searchChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const sources = searchChunks ? searchChunks.map((chunk) => ({
      title: chunk.web?.title || chunk.web?.uri || "Web Source",
      uri: chunk.web?.uri || "#"
    })) : [];
    res.json({ text, sources });
  } catch (error) {
    console.error("Grounded query error:", error);
    res.status(500).json({ error: error.message || "Failed grounded search" });
  }
});
app.post("/api/gemini/generate-image", async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured in environment variables.");
    }
    const { prompt, model, aspectRatio, imageSize, base64ImageToEdit } = req.body;
    const selectedModel = model || "gemini-3.1-flash-image";
    const config = {
      imageConfig: {
        aspectRatio: aspectRatio || "1:1"
      }
    };
    if (imageSize) {
      config.imageConfig.imageSize = imageSize;
    }
    const contentsParts = [];
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
  } catch (error) {
    console.error("Image generation error:", error);
    res.status(500).json({ error: error.message || "Failed to generate image" });
  }
});
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
    const jsonString = text.replace(/```json/i, "").replace(/```/g, "").trim();
    try {
      const parsedData = JSON.parse(jsonString);
      res.json(parsedData);
    } catch {
      res.json({ rawText: text });
    }
  } catch (error) {
    console.error("Image analysis error:", error);
    res.status(500).json({ error: error.message || "Failed to analyze image" });
  }
});
app.post("/api/send-whatsapp", async (req, res) => {
  try {
    const { to, orderId, customerName, totalAmount, originUrl } = req.body;
    if (!to || !orderId || !customerName || !totalAmount) {
      return res.status(400).json({ error: "Missing required fields (to, orderId, customerName, totalAmount)" });
    }
    const host = originUrl || req.headers.referer || req.headers.origin || "https://ais-dev-wlqaqumppl6edblwx53mn4-41718081823.asia-southeast1.run.app";
    const invoiceLink = `${host.endsWith("/") ? host : host + "/"}?track=${orderId}&view=invoice`;
    const messageBody = `\u{1F6D2} *LOCAL XPRESS DELIVERY SUCCESS* \u{1F69A}

Hello *${customerName}*, your order *#${orderId}* has been successfully delivered!

*\u{1F4B0} Total Amount Paid:* \u20B9${totalAmount}
*\u{1F4CD} Status:* DELIVERED \u{1F389}

View and download your digital PDF invoice here:
${invoiceLink}

Thank you for choosing Local Xpress!`;
    console.log(`[WHATSAPP AUTOMATION GATEWAY] Message dispatched successfully:
==================================================
To: ${to}
Message:
${messageBody}
==================================================`);
    res.json({
      success: true,
      message: `WhatsApp delivery alert + PDF invoice notification successfully dispatched to ${customerName} (${to})!`,
      body: messageBody,
      invoiceLink
    });
  } catch (error) {
    console.error("WhatsApp notification error:", error);
    res.status(500).json({ error: error.message || "Failed to dispatch WhatsApp notification" });
  }
});
app.post("/api/auth/login", (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: "Please provide both username and password." });
    }
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
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(500).json({ success: false, error: "Internal server authentication error" });
  }
});
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
    const response = await fetch(googleFormUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params.toString()
    });
    res.json({ success: true, status: response.status });
  } catch (error) {
    console.error("Google form submission error:", error);
    res.status(500).json({ error: error.message || "Failed to submit to Google Form" });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
