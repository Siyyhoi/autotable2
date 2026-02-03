"use client";

import { useState, useEffect } from "react";
import ConfigModal from "@/components/ConfigModal";
import { RefreshCw, Calendar, User, MapPin, Settings, School } from "lucide-react";

export default function Home() {
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [showConfig, setShowConfig] = useState(false);

  // ✅ State สำหรับข้อมูลโรงเรียนและ Slot ที่ดึงมาจาก DB
  const [schoolName, setSchoolName] = useState("AI Scheduler Assistant");
  const [slots, setSlots] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // 1. โหลดข้อมูล Slot และ Config เมื่อเข้าเว็บ
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
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();

      if (data.result) {
        setSchedule(data.result);
        setAiAnalysis(data.ai_analysis || "จัดตารางสำเร็จเรียบร้อย!");
      } else {
        alert("เกิดข้อผิดพลาด: " + (data.error || "ไม่ได้รับข้อมูล"));
      }
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
    <div className="min-h-screen bg-gray-50 p-8 font-sans text-gray-800">
      <div className="max-w-[95%] mx-auto space-y-6"> {/* ขยายความกว้างให้รองรับหลายคาบ */}
        
        {/* Header Section */}
        <div className="bg-indigo-900 text-white p-6 rounded-2xl shadow-lg flex justify-between items-start">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/10 rounded-full">
              <School className="w-8 h-8" />
            </div>
            <div>
              {/* ✅ โชว์ชื่อโรงเรียนที่ตั้งค่าไว้ */}
              <h1 className="text-2xl font-bold">{schoolName}</h1>
              <p className="text-indigo-200 mt-1 leading-relaxed">
                {loading 
                  ? "กำลังจัดตารางเรียน... AI กำลังคำนวณ..." 
                  : aiAnalysis || "ระบบพร้อมทำงาน! ตารางจะปรับตามการตั้งค่าของคุณ"}
              </p>
            </div>
          </div>

          <button 
            onClick={() => setShowConfig(true)}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-all border border-white/20 shadow-sm"
          >
            <Settings className="w-5 h-5" />
            <span className="text-sm font-medium hidden sm:inline">ตั้งค่าโรงเรียน</span>
          </button>
        </div>

        {/* Input Section */}
        <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-200 flex gap-2">
          <input
            type="text"
            placeholder="คำสั่งพิเศษ เช่น 'ขอพักเที่ยงคาบ 4', 'ครูสมชายว่างแค่วันจันทร์'"
            className="flex-1 px-4 py-3 outline-none text-gray-700 placeholder-gray-400 bg-transparent"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
          />
          <button
            onClick={handleGenerate}
            disabled={loading}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              loading
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg"
            }`}
          >
            {loading ? "กำลังคิด..." : "เริ่มจัดตาราง 🚀"}
          </button>
        </div>

        {/* Schedule Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <h2 className="font-semibold text-gray-700 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-500" />
              ตารางเรียนรวม (Master Schedule)
            </h2>
            {isLoadingData && <span className="text-xs text-gray-400 animate-pulse">กำลังโหลดโครงสร้างตาราง...</span>}
          </div>
          
          <div className="overflow-x-auto pb-4">
            <table className="w-full min-w-[1000px] border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-600 text-sm uppercase tracking-wider">
                  <th className="p-4 w-24 text-center border-r border-gray-200 bg-gray-200/50 sticky left-0 z-10">Day</th>
                  
                  {/* ✅ Loop สร้างหัวตารางตามจำนวนคาบจริงจาก DB */}
                  {slots.map((slot) => (
                    <th key={slot.id} className="p-3 text-center border-r border-gray-200 last:border-0 min-w-[140px]">
                      <div className="font-bold text-gray-800">คาบที่ {slot.id}</div>
                      <div className="text-[10px] text-gray-500 font-normal mt-0.5 bg-white/50 px-2 py-0.5 rounded-full inline-block">
                        {slot.startTime} - {slot.endTime}
                      </div>
                    </th>
                  ))}
                  
                  {slots.length === 0 && !isLoadingData && (
                    <th className="p-4 text-center text-red-400 font-normal">
                      ยังไม่ได้ตั้งค่าเวลาเรียน (กรุณากดปุ่มตั้งค่า)
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {days.map((day) => (
                  <tr key={day} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 font-bold text-center text-gray-700 border-r border-gray-200 bg-gray-50 sticky left-0 z-10 shadow-sm">
                      {day}
                    </td>
                    
                    {/* ✅ Loop สร้างช่องตารางตามจำนวนคาบจริง */}
                    {slots.map((slot) => {
                      const subject = getClass(day, slot.id);
                      return (
                        <td key={slot.id} className="p-2 border-r border-gray-200 last:border-0 align-top h-32">
                          {subject ? (
                            <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-lg h-full flex flex-col justify-between hover:shadow-md transition-all cursor-default group relative animate-in fade-in zoom-in duration-300 hover:-translate-y-1">
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
                            <div className="h-full flex items-center justify-center border-2 border-dashed border-transparent hover:border-gray-100 rounded-lg transition-colors">
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

        {showConfig && <ConfigModal onClose={() => setShowConfig(false)} />}
      </div>
    </div>
  );
}