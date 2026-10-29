import React, { useState, useEffect, useRef } from "react";
import Layout from "../components/Layout";
import { api } from "../api";

export default function Chat() {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const fetchHistory = async (autoSelect = false) => {
    try {
      const data = await api.get("/chat/history");
      setSessions(data);
      if (autoSelect && data.length > 0 && !activeSessionId) {
        handleSelectSession(data[0].id, data);
      }
    } catch (err) {
      console.error("Error fetching chat history:", err);
    }
  };

  useEffect(() => {
    fetchHistory(true);
  }, []);

  useEffect(() => {
    // Auto-scroll to the bottom of the conversation feed on new message
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSelectSession = (sessionId, currentSessions = sessions) => {
    setActiveSessionId(sessionId);
    const sessionObj = currentSessions.find((s) => s.id === sessionId);
    if (sessionObj) {
      setMessages(sessionObj.messages || []);
    }
  };

  const handleNewChat = () => {
    setActiveSessionId(null);
    setMessages([]);
    setInput("");
  };

  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this conversation?")) return;

    try {
      await api.delete(`/chat/sessions/${sessionId}`);
      const updatedSessions = sessions.filter((s) => s.id !== sessionId);
      setSessions(updatedSessions);

      if (activeSessionId === sessionId) {
        if (updatedSessions.length > 0) {
          handleSelectSession(updatedSessions[0].id, updatedSessions);
        } else {
          handleNewChat();
        }
      }
    } catch (err) {
      console.error("Failed to delete chat session:", err);
      alert(err.message || "Failed to delete conversation");
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessageText = input.trim();
    setInput("");
    setLoading(true);

    // Optimistically add user message to interface
    const tempUserMsg = {
      id: "temp-user-" + Date.now(),
      sender: "user",
      content: userMessageText,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const response = await api.post("/chat", {
        content: userMessageText,
        session_id: activeSessionId,
      });

      // Update session ID if we created a new one
      if (!activeSessionId) {
        setActiveSessionId(response.session_id);
      }
      
      // Update history list and select current messages
      await fetchHistory();
      
      // Update message list
      setMessages((prev) => {
        // Remove temporary message and append the correct ones
        const filtered = prev.filter((m) => !m.id.toString().startsWith("temp-"));
        
        // Find if user message is already in db (it will be saved by backend)
        // For simplicity, we just rebuild current messages or append user/ai responses
        const serverUserMsg = {
          id: response.id + "-user",
          sender: "user",
          content: userMessageText,
          created_at: new Date().toISOString(),
        };
        
        return [...filtered, serverUserMsg, response];
      });

    } catch (err) {
      // Show error bubble
      const errMessage = {
        id: "temp-err-" + Date.now(),
        sender: "ai",
        content: `Error: ${err.message || "Failed to contact chat processor."}`,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout pageTitle="AI Chat Console">
      <div className="flex h-[calc(100vh-140px)] border border-outline-variant rounded-2xl overflow-hidden bg-surface-container-lowest shadow-sm">
        
        {/* Chat History Sidebar */}
        <div className="w-[300px] border-r border-outline-variant flex flex-col bg-surface-container-low">
          <div className="p-md border-b border-outline-variant">
            <button
              onClick={handleNewChat}
              className="w-full h-11 bg-primary text-on-primary rounded-xl font-label-md text-label-md flex items-center justify-center gap-sm active:scale-95 duration-200 shadow-sm hover:shadow-md cursor-pointer"
            >
              <span className="material-symbols-outlined">add</span>
              <span>New Conversation</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-sm space-y-xs">
            {sessions.map((s) => {
              const isActive = activeSessionId === s.id;
              return (
                <div
                  key={s.id}
                  onClick={() => handleSelectSession(s.id)}
                  className={`group relative p-md rounded-xl cursor-pointer active:scale-98 duration-150 transition-all ${
                    isActive
                      ? "bg-primary-container/10 border-l-4 border-primary text-primary font-bold"
                      : "text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  <div className="flex items-center gap-sm pr-7">
                    <span className="material-symbols-outlined text-[20px] shrink-0">forum</span>
                    <span className="font-label-md text-label-md truncate flex-1">{s.title}</span>
                  </div>
                  <span className="font-label-sm text-label-sm opacity-60 block mt-xs pl-6">
                    {new Date(s.created_at).toLocaleDateString()}
                  </span>

                  {/* Delete conversation button */}
                  <button
                    type="button"
                    onClick={(e) => handleDeleteSession(e, s.id)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant/70 hover:text-error hover:bg-error/10 opacity-0 group-hover:opacity-100 transition-all duration-150 cursor-pointer"
                    title="Delete conversation"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              );
            })}
            {sessions.length === 0 && (
              <p className="text-on-surface-variant font-label-sm text-center py-xl">
                No historic sessions.
              </p>
            )}
          </div>
        </div>

        {/* Messaging Board */}
        <div className="flex-1 flex flex-col bg-surface-container-lowest">
          
          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-xl space-y-xl">
            {messages.map((m) => {
              const isAI = m.sender === "ai";
              return (
                <div
                  key={m.id}
                  className={`flex gap-md max-w-[80%] ${isAI ? "mr-auto" : "ml-auto flex-row-reverse"}`}
                >
                  {/* Avatar icon */}
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                      isAI ? "bg-primary text-on-primary" : "bg-secondary text-on-secondary"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {isAI ? "smart_toy" : "person"}
                    </span>
                  </div>

                  {/* Message card */}
                  <div className="space-y-sm">
                    <div
                      className={`p-md rounded-2xl border font-body-md text-body-md ${
                        isAI
                          ? "bg-surface-container-low border-outline-variant/60 text-on-surface"
                          : "bg-primary text-on-primary border-primary"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    </div>

                    {/* Auto-ticket tag indicator */}
                    {m.ticket_created_id && (
                      <div className="flex items-center gap-xs text-error font-label-sm text-label-sm font-semibold bg-error-container/10 p-sm rounded-lg border border-error/20 max-w-fit">
                        <span className="material-symbols-outlined text-[16px]">confirmation_number</span>
                        <span>Ticket Automatically Created (ID: {m.ticket_created_id.slice(0, 8)}...)</span>
                      </div>
                    )}

                    {/* Citations / Sources list */}
                    {isAI && !m.ticket_created_id && m.citations && m.citations.length > 0 && (
                      <div className="space-y-xs pl-sm border-l-2 border-primary/20">
                        <span className="font-label-sm text-label-sm text-on-surface-variant font-bold">
                          Document References:
                        </span>
                        <div className="flex flex-wrap gap-xs">
                          {m.citations.map((cite, idx) => (
                            <span
                              key={idx}
                              className="px-sm py-[2px] bg-primary/5 text-primary border border-primary/10 rounded-full font-label-sm text-label-sm flex items-center gap-xs"
                              title={`Chunk index: ${cite.chunk_index}, Similarity score: ${cite.score}`}
                            >
                              <span className="material-symbols-outlined text-[14px]">description</span>
                              <span>{cite.filename}</span>
                              <span className="opacity-60 text-[10px]">({Math.round(cite.score * 100)}%)</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex gap-md mr-auto max-w-[80%]">
                <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px] animate-pulse">smart_toy</span>
                </div>
                <div className="p-md rounded-2xl bg-surface-container-low border border-outline-variant/60 flex items-center gap-md">
                  <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                  <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                  <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                </div>
              </div>
            )}

            {messages.length === 0 && !loading && (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-[420px] mx-auto py-3xl">
                <span className="material-symbols-outlined text-[64px] text-primary bg-primary/10 p-xl rounded-2xl mb-lg">
                  smart_toy
                </span>
                <h3 className="font-headline-md text-headline-md font-bold text-on-surface">
                  SupportMind RAG Console
                </h3>
                <p className="font-body-md text-body-md text-on-surface-variant mt-sm">
                  Ask questions regarding standard corporate policies, operational files, or technical logs. The AI will retrieve context from uploaded files. If confidence drops, a support ticket will automatically issue.
                </p>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Form Prompter */}
          <form onSubmit={handleSend} className="p-xl border-t border-outline-variant flex gap-md bg-surface-container-low">
            <input
              type="text"
              placeholder="Ask a support question..."
              className="flex-1 h-12 px-lg bg-surface-container-lowest border border-outline-variant rounded-xl font-body-md text-body-md text-on-surface focus:border-primary input-halo transition-all outline-none"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              required
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="w-12 h-12 bg-primary text-on-primary rounded-xl flex items-center justify-center hover:shadow-lg active:scale-95 duration-200 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              <span className="material-symbols-outlined">send</span>
            </button>
          </form>
        </div>

      </div>
    </Layout>
  );
}
