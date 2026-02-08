"use client";

import { useState, useEffect } from "react";
import ConfigSchool from "@/components/config/Configschool"; 
import ConfigRoom from "@/components/config/ConfigRoom";
import ConfigSubject from "@/components/config/ConfigSubject";
import ConfigTeacher from "@/components/config/ConfigTeacher";

import { 
  Calendar, User, MapPin, Settings, School, LayoutGrid, 
  Users, BookOpen, Brain, AlertCircle, CheckCircle, 
  Lightbulb, AlertTriangle, Sparkles 
} from "lucide-react";

export default function Home() {
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [aiAnalysis, setAiAnalysis] = useState("");
  
  // 🧠 AI Insights State
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [lastAction, setLastAction] = useState<string>("");

  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Data State
  const [schoolName, setSchoolName] = useState("AI Scheduler Assistant");
  const [slots, setSlots] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // โหลดข้อมูล
  useEffect(() => {
    fetch("/api/master-data")
      .then((res) => res.json())
      .then((data) => {
        if (data.slots) {
            setSlots(data.slots);
            setSchoolName(data.schoolName);
        }
      })
      .finally(() => setIsLoadingData(false));
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    setAiAnalysis("");
    setAiInsights(null); // Reset insights
  
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          currentSchedule: schedule,
        }),
      });
    
      const data = await res.json();
    
      // ✅ อัปเดต Schedule
      setSchedule((prev) => {
        if (Array.isArray(data.result)) {
          return data.result;
        }
        return prev;
      });
    
      // 🧠 รับ AI Insights
      if (data.insights) {
        setAiInsights(data.insights);
      } else if (data.ai_insight) {
        setAiInsights(data.ai_insight);
      }

      // บันทึก Action
      setLastAction(data.action || "UNKNOWN");
    
      setAiAnalysis(
        data.explanation ||
        data.ai_analysis ||
        data.message ||
        "อัปเดตตารางสำเร็จ"
      );
    
    } catch (error) {
      console.error("Error:", error);
      alert("เชื่อมต่อ Server ไม่ได้");
    } finally {
      setLoading(false);
    }    
  };

  const getClass = (day: string, slot: number) => {
    return schedule.find((s) => s.day === day && s.slotNo === slot);
  };

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-blue-50 p-8 font-sans text-gray-800">
      <div className="max-w-[95%] mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="bg-linear-to-r from-indigo-900 to-purple-900 text-white p-6 rounded-2xl shadow-2xl">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/10 rounded-full backdrop-blur-sm">
              <School className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold flex items-center gap-2">
                {schoolName}
                <Sparkles className="w-5 h-5 text-yellow-300" />
              </h1>
              <p className="text-indigo-200 mt-1 leading-relaxed">
                {loading 
                  ? "🧠 AI กำลังคิด... วิเคราะห์และจัดตาราง" 
                  : aiAnalysis || "ระบบพร้อมทำงาน! ลองถามหรือสั่งอะไรก็ได้"}
              </p>
            </div>
          </div>
        </div>

        {/* 🧠 AI INSIGHTS PANEL (ใหม่!) */}
        {aiInsights && (
          <div className="bg-white rounded-2xl shadow-lg border-2 border-blue-200 overflow-hidden animate-in slide-in-from-top duration-500">
            <div className="bg-linear-to-r from-blue-500 to-purple-500 p-4 flex items-center gap-3">
              <Brain className="w-6 h-6 text-white" />
              <h3 className="font-bold text-white text-lg">🧠 AI Analysis & Insights</h3>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Current State */}
              {aiInsights.current_state && (
                <div className="flex gap-3 items-start">
                  <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-700 text-sm">สถานะปัจจุบัน:</p>
                    <p className="text-gray-600 text-sm mt-1">{aiInsights.current_state}</p>
                  </div>
                </div>
              )}

              {/* Main Suggestion */}
              {(aiInsights.main_suggestion || aiInsights.suggestion || aiInsights.recommendation) && (
                <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
                  <div className="flex gap-3 items-start">
                    <Lightbulb className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-green-900 text-sm">💡 คำแนะนำหลัก:</p>
                      <p className="text-green-800 text-sm mt-1">
                        {aiInsights.main_suggestion || aiInsights.suggestion || aiInsights.recommendation}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Alternatives */}
              {aiInsights.alternatives && aiInsights.alternatives.length > 0 && (
                <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded-r-lg">
                  <div className="flex gap-3 items-start">
                    <Sparkles className="w-5 h-5 text-purple-600 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold text-purple-900 text-sm mb-2">🎯 ทางเลือกอื่น:</p>
                      <ul className="space-y-1.5">
                        {aiInsights.alternatives.map((alt: string, i: number) => (
                          <li key={i} className="text-purple-800 text-sm flex gap-2">
                            <span className="text-purple-400">•</span>
                            <span>{alt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Warnings */}
              {aiInsights.warnings && aiInsights.warnings.length > 0 && (
                <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-lg">
                  <div className="flex gap-3 items-start">
                    <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold text-orange-900 text-sm mb-2">⚠️ ข้อควรระวัง:</p>
                      <ul className="space-y-1.5">
                        {aiInsights.warnings.map((warning: string, i: number) => (
                          <li key={i} className="text-orange-800 text-sm flex gap-2">
                            <span className="text-orange-400">•</span>
                            <span>{warning}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Safety Check */}
              {aiInsights.safety && (
                <div className="flex gap-3 items-start">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-700 text-sm">ตรวจสอบความปลอดภัย:</p>
                    <p className="text-gray-600 text-sm mt-1">{aiInsights.safety}</p>
                  </div>
                </div>
              )}

              {/* What Happened (for edits) */}
              {aiInsights.what_happened && (
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <p className="text-blue-800 text-sm">
                    <span className="font-semibold">ผลลัพธ์:</span> {aiInsights.what_happened}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Input Section */}
        <div className="bg-white p-2 rounded-xl shadow-lg border-2 border-gray-200 hover:border-indigo-300 transition-all flex gap-2">
          <input
            type="text"
            placeholder='ลองพิมพ์: "ตารางนี้เป็นยังไง", "ย้ายคาบ 6 ไปคาบ 3", "ลบคาบ 7 วันศุกร์"'
            className="flex-1 px-4 py-3 outline-none text-gray-700 placeholder-gray-400 bg-transparent"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
          />
          <button
            onClick={handleGenerate}
            disabled={loading}
            className={`px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              loading
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-linear-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-md hover:shadow-xl"
            }`}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                กำลังคิด...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4" />
                AI ช่วยเลย 🚀
              </>
            )}
          </button>
        </div>

        {/* Quick Actions */}
        <div className="bg-white/50 backdrop-blur-sm p-4 rounded-xl border border-gray-200">
          <p className="text-xs text-gray-500 mb-2">💡 ตัวอย่างคำสั่ง:</p>
          <div className="flex flex-wrap gap-2">
            {[
              "ตารางนี้เป็นยังไง",
              "ย้ายคาบ 6 ไปคาบ 3 วันจันทร์",
              "ลบคาบ 7 วันศุกร์",
              "สลับคาบ 4 วันจันทร์ กับคาบ 4 วันอังคาร"
            ].map((example) => (
              <button
                key={example}
                onClick={() => setPrompt(example)}
                className="px-3 py-1.5 text-xs bg-white hover:bg-indigo-50 border border-gray-200 hover:border-indigo-300 rounded-lg transition-all"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        {/* Schedule Table */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-linear-to-r from-gray-50 to-blue-50/30 flex items-center justify-between">
            <h2 className="font-semibold text-gray-700 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-500" />
              ตารางเรียนรวม (Master Schedule)
            </h2>
            {schedule.length > 0 && (
              <span className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-medium">
                {schedule.length} คาบเรียน
              </span>
            )}
          </div>
          
          <div className="overflow-x-auto pb-4">
            <table className="w-full min-w-[1000px] border-collapse">
              <thead>
                <tr className="bg-linear-to-r from-gray-100 to-blue-50 text-gray-600 text-sm uppercase tracking-wider">
                  <th className="p-4 w-24 text-center border-r border-gray-200 bg-gray-200/70 sticky left-0 z-10">Day</th>
                  {slots.map((slot) => (
                    <th key={slot.id} className="p-3 text-center border-r border-gray-200 last:border-0 min-w-[140px]">
                      <div className="font-bold text-gray-800">คาบที่ {slot.id}</div>
                      <div className="text-[10px] text-gray-500 font-normal mt-0.5 bg-white/50 px-2 py-0.5 rounded-full inline-block">
                        {slot.startTime} - {slot.endTime}
                      </div>
                    </th>
                  ))}
                  {slots.length === 0 && !isLoadingData && (
                    <th className="p-4 text-center text-red-400 font-normal">ยังไม่ได้ตั้งค่าเวลาเรียน</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {days.map((day) => (
                  <tr key={day} className="hover:bg-blue-50/30 transition-colors">
                    <td className="p-4 font-bold text-center text-gray-700 border-r border-gray-200 bg-gray-50 sticky left-0 z-10 shadow-sm">
                      {day}
                    </td>
                    {slots.map((slot) => {
                      const subject = getClass(day, slot.id);
                      return (
                        <td key={slot.id} className="p-2 border-r border-gray-200 last:border-0 align-top h-32">
                          {subject ? (
                            <div className="bg-linear-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 p-3 rounded-xl h-full flex flex-col justify-between hover:shadow-lg hover:scale-[1.02] transition-all cursor-default group relative animate-in fade-in zoom-in duration-300">
                              <div>
                                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded mb-1 inline-block">
                                  {subject.subject}
                                </span>
                                <h3 className="text-xs font-semibold text-gray-900 leading-tight line-clamp-2" title={subject.subjectName}>
                                  {subject.subjectName}
                                </h3>
                              </div>
                              <div className="space-y-1 mt-2">
                                <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
                                  <User className="w-3 h-3 text-indigo-400" />
                                  <span className="truncate max-w-[80px]">{subject.teacher}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
                                  <MapPin className="w-3 h-3 text-indigo-400" />
                                  <span>{subject.room}</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="h-full flex items-center justify-center border-2 border-dashed border-transparent hover:border-gray-200 rounded-lg transition-colors">
                              <span className="text-gray-200 text-xl font-light select-none">-</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Developer Zone */}
        <div className="mt-12 p-8 bg-linear-to-br from-slate-100 to-gray-100 border-2 border-dashed border-slate-300 rounded-2xl shadow-inner">
            <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                🛠️ ส่วนตั้งค่า (Developer Zone)
            </h3>
            <div className="flex flex-wrap gap-4">
                <button 
                    onClick={() => setActiveModal("school")}
                    className="flex items-center gap-2 bg-white px-5 py-3 rounded-xl border-2 hover:border-indigo-500 hover:text-indigo-600 hover:shadow-lg transition-all"
                >
                    <Settings className="w-5 h-5" />
                    <div className="text-left">
                        <div className="font-semibold text-sm">ตั้งค่าโรงเรียน</div>
                        <div className="text-xs text-gray-500">เวลาเรียน, คาบเรียน</div>
                    </div>
                </button>

                <button 
                    onClick={() => setActiveModal("room")} 
                    className="flex items-center gap-2 bg-white px-5 py-3 rounded-xl border-2 hover:border-pink-500 hover:text-pink-600 hover:shadow-lg transition-all">
                    <LayoutGrid className="w-5 h-5" />
                    <div className="text-left">
                        <div className="font-semibold text-sm">จัดการห้องเรียน</div>
                        <div className="text-xs text-gray-500">เพิ่มห้อง, ความจุ</div>
                    </div>
                </button>

                <button 
                    onClick={() => setActiveModal("teacher")} 
                    className="flex items-center gap-2 bg-white px-5 py-3 rounded-xl border-2 hover:border-emerald-500 hover:text-emerald-600 hover:shadow-lg transition-all">
                    <Users className="w-5 h-5" />
                    <div className="text-left">
                        <div className="font-semibold text-sm">จัดการครู</div>
                    </div>
                </button>

                <button 
                onClick={() => setActiveModal("subject")} 
                className="flex items-center gap-2 bg-white px-5 py-3 rounded-xl border-2 hover:border-blue-500 hover:text-blue-600 hover:shadow-lg transition-all">
                    <BookOpen className="w-5 h-5" />
                    <div className="text-left">
                        <div className="font-semibold text-sm">จัดการวิชา</div>
                    </div>
                </button>
            </div>
        </div>

        {/* Render Modals */}
        {activeModal === "school" && <ConfigSchool onClose={() => setActiveModal(null)} />}
        {activeModal === "room" && <ConfigRoom onClose={() => setActiveModal(null)} />}
        {activeModal === "subject" && <ConfigSubject onClose={() => setActiveModal(null)} />}
        {activeModal === "teacher" && <ConfigTeacher onClose={() => setActiveModal(null)} />}

      </div>
    </div>
  );
}