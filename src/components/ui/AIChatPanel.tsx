"use client";

import { useState } from "react";
import {
  Brain,
  Send,
  X,
  MessageSquare,
  Sparkles,
  AlertCircle,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  aiInsights?: any;
  timestamp: Date;
}

interface AIChatPanelProps {
  schedule: any[];
  onScheduleUpdate: (newSchedule: any[]) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function AIChatPanel({
  schedule,
  onScheduleUpdate,
  isOpen,
  onClose,
}: AIChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "สวัสดีครับ! ผมพร้อมช่วยจัดการตารางเรียนของคุณ ลองถามอะไรก็ได้นะครับ 😊",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const quickCommands = [
    "ตารางนี้เป็นยังไง",
    "ย้ายคาบ 6 ไปคาบ 3 วันจันทร์",
    "ลบคาบ 7 วันศุกร์",
    "สลับคาบ 4 วันจันทร์ กับ วันอังคาร",
    "ช่วยจัดตารางหน่อย",
  ];

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: input,
          currentSchedule: schedule,
        }),
      });

      const data = (await res.json()) as any;

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch response");
      }

      // อัปเดตตาราง
      if (Array.isArray(data.result)) {
        console.log("Updated schedule:", data.result);
        onScheduleUpdate(data.result);
      }

      // สร้าง assistant message
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          data.explanation ||
          data.ai_analysis ||
          data.message ||
          "ดำเนินการเรียบร้อย",
        aiInsights: data.insights || data.ai_insight || null,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error("Error:", error);

      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `❌ เกิดข้อผิดพลาด: ${error.message || "ไม่สามารถเชื่อมต่อ Server ได้"}`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-[450px] bg-white shadow-2xl border-l-2 border-indigo-200 flex flex-col z-50 animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-3 md:p-4 flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <Brain className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-white text-base md:text-lg">
              AI Assistant
            </h2>
            <p className="text-indigo-100 text-xs">ผู้ช่วยจัดตารางอัจฉริยะ</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/20 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Quick Commands */}
      <div className="p-3 bg-indigo-50 border-b border-indigo-100">
        <p className="text-xs text-gray-600 mb-2 font-semibold">
          💡 คำสั่งด่วน:
        </p>
        <div className="flex flex-wrap gap-2">
          {quickCommands.map((cmd) => (
            <button
              key={cmd}
              onClick={() => setInput(cmd)}
              className="px-2 py-1 text-xs bg-white hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
            >
              {cmd}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {/* Message Content */}
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>

              {/* AI Insights (only for assistant) */}
              {msg.role === "assistant" && msg.aiInsights && (
                <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                  {/* Main Suggestion */}
                  {(msg.aiInsights.main_suggestion ||
                    msg.aiInsights.suggestion ||
                    msg.aiInsights.recommendation) && (
                    <div className="flex gap-2 items-start bg-green-50 p-2 rounded-lg">
                      <Lightbulb className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-green-800">
                        {msg.aiInsights.main_suggestion ||
                          msg.aiInsights.suggestion ||
                          msg.aiInsights.recommendation}
                      </p>
                    </div>
                  )}

                  {/* Warnings */}
                  {msg.aiInsights.warnings &&
                    msg.aiInsights.warnings.length > 0 && (
                      <div className="flex gap-2 items-start bg-orange-50 p-2 rounded-lg">
                        <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                        <div className="text-xs text-orange-800">
                          <p className="font-semibold mb-1">⚠️ ระวัง:</p>
                          {msg.aiInsights.warnings.map(
                            (w: string, i: number) => (
                              <p key={i}>• {w}</p>
                            ),
                          )}
                        </div>
                      </div>
                    )}

                  {/* What Happened */}
                  {msg.aiInsights.what_happened && (
                    <div className="flex gap-2 items-start bg-blue-50 p-2 rounded-lg">
                      <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-blue-800">
                        {msg.aiInsights.what_happened}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Timestamp */}
              <p
                className={`text-[10px] mt-2 ${msg.role === "user" ? "text-indigo-200" : "text-gray-500"}`}
              >
                {msg.timestamp.toLocaleTimeString("th-TH", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        ))}

        {/* Loading */}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl px-4 py-3">
              <div className="flex gap-2 items-center">
                <div className="flex gap-1">
                  <div
                    className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  ></div>
                </div>
                <span className="text-xs text-gray-600">กำลังดำเนินการ...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="พิมพ์คำสั่งหรือคำถาม..."
            className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-400 outline-none text-sm"
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className={`px-4 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
              loading || !input.trim()
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg"
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-gray-500 mt-2 text-center">
          กด Enter เพื่อส่ง • Shift + Enter เพื่อขึ้นบรรทัดใหม่
        </p>
      </div>
    </div>
  );
}
