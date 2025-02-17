const express = require("express");
const cors = require("cors");
const OpenAIApi = require("openai"); // ✅ Fixed OpenAI import
require("dotenv").config();

// 🔹 Firebase Setup
const admin = require("firebase-admin");
const serviceAccount = require("./firebase-admin.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const chatCollection = db.collection("chats");

const app = express();
app.use(express.json());
app.use(cors());

// 🔹 Fixed OpenAI API Configuration
const openai = new OpenAIApi({
  apiKey: process.env.OPENAI_API_KEY, // Uses your API key from .env file
});

// 🔹 Chat Endpoint (Handles Messages & Stores in Firebase)
app.post("/chat", async (req, res) => {
  try {
    const { message, userId } = req.body;

    if (!message || !userId) {
      return res.status(400).json({ error: "Message and userId are required" });
    }

    // Retrieve existing chat history from Firebase
    const userChatRef = chatCollection.doc(userId);
    const chatHistory = (await userChatRef.get()).data()?.messages || [];

    // Store user message in chat history
    chatHistory.push({ role: "user", content: message });

    // 🔹 Send Message to OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: message }],
      max_tokens: 100,
      temperature: 0.7,
    });

    const botReply = response.choices[0].message.content.trim();

    // Store AI response in chat history
    chatHistory.push({ role: "bot", content: botReply });

    // 🔹 Save Updated Chat History to Firebase
    await userChatRef.set({ messages: chatHistory });

    res.json({ reply: botReply, chatHistory });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// 🔹 Retrieve Full Chat History
app.get("/chat/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const userChatRef = chatCollection.doc(userId);
    const chatData = await userChatRef.get();

    if (!chatData.exists) {
      return res.json({ messages: [] });
    }

    res.json({ messages: chatData.data().messages });
  } catch (error) {
    console.error("Error fetching chat history:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// 🔹 Start Server
app.listen(5000, () => console.log("🚀 Server running on port 5000"));
