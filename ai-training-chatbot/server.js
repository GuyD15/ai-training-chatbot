const express = require("express");
const cors = require("cors");
const OpenAIApi = require("openai");
require("dotenv").config();

// 🔹 Firebase Setup
const admin = require("firebase-admin");
const serviceAccount = require("./firebase-admin.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const chatCollection = db.collection("chats");
const companyInfoCollection = db.collection("companyInfo"); // 🔹 Stores company-specific data

const app = express();
app.use(express.json());
app.use(cors());

// 🔹 Fixed OpenAI API Configuration
const openai = new OpenAIApi({
  apiKey: process.env.OPENAI_API_KEY, // Uses your API key from .env file
});

// 🔹 Get company information from Firebase
const getCompanyInfo = async () => {
  const doc = await companyInfoCollection.doc("default").get();
  return doc.exists ? doc.data() : {};
};

// 🔹 Chat Endpoint (AI Now Asks Questions)
app.post("/chat", async (req, res) => {
  try {
    const { userId, agentLevel = "Beginner", tone = "Friendly", language = "en" } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Retrieve existing chat history from Firebase
    const userChatRef = chatCollection.doc(userId);
    const chatHistory = (await userChatRef.get()).data()?.messages || [];

    // Get company data
    const companyInfo = await getCompanyInfo();
    const companyDetails = companyInfo.details || "No specific details provided.";

    // 🔹 Adjust AI difficulty based on agent level
    let complexityInstruction = "";
    switch (agentLevel) {
      case "Beginner":
        complexityInstruction = "Keep the questions simple and straightforward.";
        break;
      case "Intermediate":
        complexityInstruction = "Ask moderate difficulty questions, testing common problem-solving scenarios.";
        break;
      case "Advanced":
        complexityInstruction = "Ask complex, tricky customer situations that require deep policy knowledge.";
        break;
      default:
        complexityInstruction = "Keep it realistic and engaging.";
    }

    // 🔹 Adjust chatbot tone
    let toneInstruction = "";
    switch (tone) {
      case "Friendly":
        toneInstruction = "Be a warm and polite customer.";
        break;
      case "Professional":
        toneInstruction = "Be a formal, business-like customer.";
        break;
      case "Casual":
        toneInstruction = "Be a relaxed, everyday customer.";
        break;
      case "Not So Friendly":
        toneInstruction = "Be a direct, difficult, and slightly impatient customer.";
        break;
      default:
        toneInstruction = "Be a neutral customer.";
    }

    // 🔹 Generate AI question
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: `${toneInstruction} ${complexityInstruction} You are a customer asking about ${companyDetails}. Your goal is to ask a question that a customer service agent would need to answer. Speak as if you're the customer.` }
      ],
      max_tokens: 100,
      temperature: 0.7,
    });

    const aiQuestion = response.choices[0].message.content.trim();

    // Store AI question in chat history
    chatHistory.push({ role: "bot", content: aiQuestion });

    // 🔹 Save Updated Chat History to Firebase
    await userChatRef.set({ messages: chatHistory });

    res.json({ question: aiQuestion, chatHistory });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// 🔹 Store Company Info (Admin can update this manually)
app.post("/company-info", async (req, res) => {
  try {
    const { details } = req.body;
    if (!details) {
      return res.status(400).json({ error: "Company details are required" });
    }
    
    await companyInfoCollection.doc("default").set({ details });
    res.json({ message: "Company information updated successfully" });
  } catch (error) {
    console.error("Error updating company info:", error);
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
