import { useState, useEffect } from "react";
import axios from "axios";

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const userId = "testUser123"; // Replace with real authentication later

  // 🔹 Fetch chat history when the page loads
  useEffect(() => {
    const fetchChatHistory = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/chat/${userId}`);
        setMessages(response.data.messages || []);
      } catch (error) {
        console.error("Error fetching chat history:", error);
      }
    };

    fetchChatHistory();
  }, []);

  // 🔹 Send message to backend and update chat history
  const sendMessage = async () => {
    if (!input.trim()) return;

    const newMessage = { role: "user", content: input };
    setMessages([...messages, newMessage]);

    try {
      const response = await axios.post("http://localhost:5000/chat", {
        message: input,
        userId,
      });

      setMessages(response.data.chatHistory); // Update with full chat history
    } catch (error) {
      console.error("Error fetching response:", error);
      setMessages([...messages, newMessage, { role: "bot", content: "Error connecting to AI." }]);
    }

    setInput("");
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="bg-blue-500 text-white text-center p-4 text-xl font-bold">
        AI Chatbot
      </header>
      <div className="flex-grow p-4 overflow-y-auto">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`p-2 my-2 rounded-md max-w-xs ${
              msg.role === "user" ? "bg-blue-500 text-white ml-auto" : "bg-gray-300"
            }`}
          >
            {msg.content}
          </div>
        ))}
      </div>
      <div className="p-4 flex border-t bg-white">
        <input
          className="flex-grow p-2 border rounded-md"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
        />
        <button
          className="ml-2 p-2 bg-blue-500 text-white rounded-md"
          onClick={sendMessage}
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default App;
