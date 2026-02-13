"use client";

import { useState, useEffect } from "react";
import ConfigRoom from "@/components/config/ConfigRoom";
import ConfigSubject from "@/components/config/ConfigSubject";
import ConfigTeacher from "@/components/config/ConfigTeacher";
import AIChatPanel from "@/components/aichatpanel";
import MasterScheduleTable from "@/components/MasterScheduleTable";

import {
  School, LayoutGrid,
  Users, BookOpen, MessageSquare
} from "lucide-react";

// Type สำหรับตารางแต่ละกลุ่ม
interface GroupScheduleData {
  group_id: string;
  group_name: string;
  advisor: string;
  schedule: any[];
  validation?: any;
  stats?: any;
}

export default function Home() {
  // เก็บตารางทั้งหมดในรูปแบบ array ของ group
  const [groupSchedules, setGroupSchedules] = useState<GroupScheduleData[]>([]);
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
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

        // 🔄 AUTO-LOAD GROUPS (แสดง Tab ทันที)
        if (data.groups && Array.isArray(data.groups)) {
          console.log("📥 Auto-loaded groups:", data.groups.length);
          const initialGroups = data.groups.map((g: any) => ({
            group_id: g.group_id,
            group_name: g.group_name,
            advisor: g.advisor,
            schedule: [], // เริ่มต้นว่างเปล่า
            validation: null,
            stats: null
          }));
          setGroupSchedules(initialGroups);
        }
      })
      .finally(() => setIsLoadingData(false));
  }, []);

  // Handler สำหรับ AIChatPanel
  const handleScheduleUpdate = (data: any) => {
    console.log("📦 handleScheduleUpdate received:", data);

    // ถ้า data เป็น array ของ group schedules (CASE 3: สร้างใหม่)
    if (Array.isArray(data) && data.length > 0 && data[0]?.group_id) {
      console.log("✅ Detected group schedules:", data.length, "groups");
      setGroupSchedules(data);
      setActiveGroupIndex(0);
    }
    // ถ้า data เป็น array ของ schedule items ธรรมดา (CASE 2: แก้ไข)
    else if (Array.isArray(data)) {
      console.log("✏️ Detected flat schedule update:", data.length, "items");
      // อัปเดตตารางของ group ที่ active อยู่
      setGroupSchedules(prev => {
        if (prev.length === 0) return prev;
        const updated = [...prev];
        updated[activeGroupIndex] = {
          ...updated[activeGroupIndex],
          schedule: data
        };
        return updated;
      });
    }
  };

  // ตารางของ group ที่เลือกอยู่
  const activeGroup = groupSchedules[activeGroupIndex];
  const activeSchedule = activeGroup?.schedule || [];

  // ฟังก์ชันตรวจสอบข้อมูลกลุ่ม (Debug)
  const handleDebugGroup = async () => {
    if (!activeGroup) return;
    const groupId = activeGroup.group_id;
    try {
      const res = await fetch("/api/debug-group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group_id: groupId }),
      });
      const data = await res.json();

      console.log("🔍 Debug Result:", data);

      if (data.error) {
        alert("❌ Error: " + data.error);
        return;
      }

      let report = `📊 ผลการตรวจสอบกลุ่ม: ${data.group_name}\n`;
      report += `----------------------------------------\n`;
      report += `📚 ลงทะเบียนทั้งหมด: ${data.total_registered} วิชา\n`;
      report += `⚠️ ข้อมูลไม่ครบ: ${data.missing_data_count} วิชา\n`;
      report += `----------------------------------------\n`;

      data.details.forEach((d: any) => {
        const icon = d.status.includes("✅") ? "✅" : "❌";
        report += `${icon} ${d.subject_id}: ${d.subject_name}\n`;
        if (!d.has_teacher) report += `   -> ⚠️ ไม่มีครูสอน (Teach Table)\n`;
        if (!d.has_subject_data) report += `   -> ⚠️ ไม่มีข้อมูลวิชา (Subject Table)\n`;
      });

      alert(report);

    } catch (error: any) {
      alert("❌ Error checking group: " + error.message);
    }
  };

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

          <div className="flex items-center gap-3">
            {/* 🗑️ REMOVED Generate Button */}

            {/* AI Chat Button */}
            <button
              onClick={() => setIsChatOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl transition-all border-2 border-white/20 hover:border-white/40"
            >
              <MessageSquare className="w-5 h-5" />
              <span className="font-semibold">เปิด AI Chat</span>
            </button>
          </div>
        </div>

        {/* ===== Group Tabs matches >= 1 ===== */}
        {groupSchedules.length >= 1 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                📋 เลือกกลุ่ม ({groupSchedules.length} กลุ่ม)
              </span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {groupSchedules.map((group, index) => (
                <button
                  key={group.group_id}
                  onClick={() => setActiveGroupIndex(index)}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${index === activeGroupIndex
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-200 scale-[1.02]"
                    : "bg-gray-50 text-gray-600 border-2 border-gray-200 hover:border-indigo-300 hover:text-indigo-600 hover:shadow-md"
                    }`}
                >
                  <Users className="w-4 h-4" />
                  <span>{group.group_name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${index === activeGroupIndex
                    ? "bg-white/20 text-white"
                    : "bg-gray-200 text-gray-500"
                    }`}>
                    {group.schedule.length} คาบ
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ===== Schedule Table ===== */}
        <MasterScheduleTable
          schedule={activeSchedule}
          slots={slots}
          isLoadingData={isLoadingData}
          groupName={activeGroup?.group_name} // 🛠️ Shows group name immediately
          advisor={activeGroup?.advisor}
        />

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

            <button
              onClick={handleDebugGroup}
              className="flex items-center gap-2 bg-white px-5 py-3 rounded-xl border-2 border-orange-200 hover:border-orange-500 hover:text-orange-600 hover:shadow-lg transition-all">
              <span className="text-xl">🔍</span>
              <div className="text-left">
                <div className="font-semibold text-sm">ตรวจสอบข้อมูลกลุ่ม</div>
                <div className="text-xs text-gray-500">เช็ควิชา/ครูที่หายไป</div>
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
        schedule={activeSchedule}
        onScheduleUpdate={handleScheduleUpdate}
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