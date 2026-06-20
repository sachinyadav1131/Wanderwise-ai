import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchChatHistory, sendChatMessage } from "../store/slices/chatSlice";
import SuggestionCard from "./SuggestionCard";

export default function ChatPanel({ tripId }) {
  const dispatch = useDispatch();
  const history = useSelector((state) => state.chat.history);
  const loading = useSelector((state) => state.chat.loading);
  const [text, setText] = useState("");

  useEffect(() => {
    dispatch(fetchChatHistory(tripId));
  }, [tripId, dispatch]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    dispatch(sendChatMessage({ tripId, message: text }));
    setText("");
  };

  return (
    <div className="w-80 border-l border-slate-800 bg-slate-900 flex flex-col h-full">
      <div className="p-4 border-b border-slate-800">
        <h3 className="font-bold text-white">Live Trip Companion</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {history.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.sender === "User" ? "items-end" : "items-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
              msg.sender === "User" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-200"
            }`}>
              {msg.message}
            </div>
            {msg.changeSuggestion && <SuggestionCard suggestion={msg.changeSuggestion} />}
          </div>
        ))}
        {loading && <div className="text-slate-500 text-xs italic">AI Agent is thinking...</div>}
      </div>

      <form onSubmit={handleSend} className="p-4 border-t border-slate-800 bg-slate-950 flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask for detours, backups..."
          className="flex-1 px-3 py-2 bg-slate-800 text-white text-sm rounded-lg outline-none border border-slate-700 focus:border-slate-500"
        />
        <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-sm transition-colors">
          Send
        </button>
      </form>
    </div>
  );
}
