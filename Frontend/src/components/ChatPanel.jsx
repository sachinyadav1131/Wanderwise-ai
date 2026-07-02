import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchChatHistory, sendChatMessage } from "../store/slices/chatSlice";
import SuggestionCard from "./SuggestionCard";

export default function ChatPanel({ tripId, onClose }) {
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
    <div className="w-full border-l border-slate-800 bg-slate-900 flex flex-col h-full">
      <div className="p-4.5 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
        <h3 className="font-bold text-white text-sm tracking-wide">Live Trip Companion</h3>
        {onClose && (
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white text-2xl font-light focus:outline-none transition-colors cursor-pointer leading-none px-2 py-1 hover:bg-slate-800 rounded-lg"
            title="Close Chat"
          >
            &times;
          </button>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {history.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.sender === "User" ? "items-end" : "items-start"}`}>
            <div 
              style={{ padding: "14px 20px" }}
              className={`max-w-[78%] rounded-2xl text-sm leading-relaxed ${
              msg.sender === "User" 
                ? "bg-blue-600 text-white shadow-md shadow-blue-900/10" 
                : "bg-slate-800/90 border border-slate-700/50 text-slate-100 shadow-sm"
            }`}>
              {msg.message}
            </div>
            {msg.changeSuggestion && <SuggestionCard suggestion={msg.changeSuggestion} />}
          </div>
        ))}
        {loading && <div className="text-slate-500 text-xs italic px-1">AI Agent is thinking...</div>}
      </div>

      <form onSubmit={handleSend} className="p-4 pr-20 border-t border-slate-800 bg-slate-950 flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask for detours, backups..."
          className="flex-1 px-4 py-2.5 bg-slate-800 text-white text-sm rounded-xl outline-none border border-slate-700 focus:border-slate-500 placeholder-slate-500"
        />
        <button type="submit" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition-colors cursor-pointer shadow-md hover:scale-[1.02] active:scale-[0.98]">
          Send
        </button>
      </form>
    </div>
  );
}
