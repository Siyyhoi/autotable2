"use client";

import { useState, useEffect } from "react";
import ConfigRoom from "@/components/config/ConfigRoom";
import ConfigSubject from "@/components/config/ConfigSubject";
import ConfigTeacher from "@/components/config/ConfigTeacher";
import AIChatPanel from "@/components/aichatpanel";

import {
  Calendar, User, MapPin, Settings, School, LayoutGrid,
  Users, BookOpen, MessageSquare
} from "lucide-react";

export default function Home() {
  const [schedule, setSchedule] = useState<any[]>([]);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

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

  const getClass = (day: string, slot: number) => {
    return schedule.find((s) => s.day === day && s.slotNo === slot);
  };

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-8 font-sans text-gray-800">
      <div className="max-w-[95%] mx-auto space-y-6">

        {/* Header Section */}
        <div className="bg-gradient-to-r from-indigo-900 to-purple-900 text-white p-6 rounded-2xl shadow-2xl flex items-center justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/10 rounded-full backdrop-blur-sm">
              <School className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{schoolName}</h1>
              <p className="text-indigo-200 mt-1 leading-relaxed">
                ระบบจัดตารางอัจฉริยะ พร้อม AI Assistant
              </p>
            </div>
          </div>

          {/* AI Chat Button */}
          <button
            onClick={() => setIsChatOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl transition-all border-2 border-white/20 hover:border-white/40"
          >
            <MessageSquare className="w-5 h-5" />
            <span className="font-semibold">เปิด AI Chat</span>
          </button>
        </div>

        {/* Schedule Table */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-blue-50/30 flex items-center justify-between">
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
                <tr className="bg-gradient-to-r from-gray-100 to-blue-50 text-gray-600 text-sm uppercase tracking-wider">
                  <th className="p-4 w-24 text-center border-r border-gray-200 bg-gray-200/70 sticky left-0 z-10">Day</th>
                  {slots.map((slot) => (
                    <th key={slot.id} className="p-3 text-center border-r border-gray-200 last:border-0 min-w-[140px]">
                      <div className="font-bold text-gray-800">{slot.label}</div>
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
                      // แก้ไขการดึงข้อมูลตารางเรียน ให้แมพกับคาบเรียน (period) หรือ เวลา
                      // ในที่นี้เราใช้ slot.id ซึ่งคือ period
                      const subject = schedule.find((s) => s.day === day && s.period === slot.id);
                      return (
                        <td key={slot.id} className="p-2 border-r border-gray-200 last:border-0 align-top h-32">
                          {subject ? (
                            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 p-3 rounded-xl h-full flex flex-col justify-between hover:shadow-lg hover:scale-[1.02] transition-all cursor-default">
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
        <div className="mt-12 p-8 bg-gradient-to-br from-slate-100 to-gray-100 border-2 border-dashed border-slate-300 rounded-2xl shadow-inner">
          <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
            🛠️ ส่วนตั้งค่า (Developer Zone)
          </h3>
          <div className="flex flex-wrap gap-4">
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
        {activeModal === "room" && <ConfigRoom onClose={() => setActiveModal(null)} />}
        {activeModal === "subject" && <ConfigSubject onClose={() => setActiveModal(null)} />}
        {activeModal === "teacher" && <ConfigTeacher onClose={() => setActiveModal(null)} />}

      </div>

      {/* AI Chat Panel */}
      <AIChatPanel
        schedule={schedule}
        onScheduleUpdate={setSchedule}
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />

      {/* Floating Chat Button (when chat is closed) */}
      {!isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-8 right-8 p-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full shadow-2xl hover:shadow-3xl hover:scale-110 transition-all z-40"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}