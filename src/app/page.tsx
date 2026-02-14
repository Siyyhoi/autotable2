"use client";

import { useState, useEffect, useRef } from "react";
import ConfigRoom from "@/components/config/ConfigRoom";
import ConfigSubject from "@/components/config/ConfigSubject";
import ConfigTeacher from "@/components/config/ConfigTeacher";
import ConfigStudentGroup from "@/components/config/ConfigStudentGroup";
import ConfigRes from "@/components/config/ConfigStudentRes";
import ConfigTeach from "@/components/config/ConfigTeach";
import AIChatPanel from "@/components/ui/AIChatPanel";
import MasterScheduleTable from "@/components/tables/MasterScheduleTable";

import {
  School,
  LayoutGrid,
  Users,
  BookOpen,
  MessageSquare,
  Upload,
  Download,
  ChevronDown,
  Settings,
  CheckCircle,
  FileSpreadsheet,
  FileText,
  Files,
  FileBadge,
} from "lucide-react";

interface GroupScheduleData {
  group_id: string;
  group_name: string;
  advisor: string;
  group_count: number;
  schedule: any[];
  validation?: any;
  stats?: any;
  failedTasks?: any[];
}

export default function Home() {
  const [groupSchedules, setGroupSchedules] = useState<GroupScheduleData[]>([]);
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  const [schoolName, setSchoolName] = useState("AI Scheduler Assistant");
  const [slots, setSlots] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/master-data")
      .then((res) => res.json())
      .then((data) => {
        if (data.slots) {
          setSlots(data.slots);
          setSchoolName(data.schoolName || "AI Scheduler");
        }
        if (data.groups && Array.isArray(data.groups)) {
          const initialGroups = data.groups.map((g: any) => ({
            group_id: g.group_id,
            group_name: g.group_name,
            advisor: g.advisor,
            schedule: [],
            validation: null,
            stats: null,
            failedTasks: [],
          }));
          setGroupSchedules(initialGroups);
        }
      })
      .finally(() => setIsLoadingData(false));
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        exportDropdownRef.current &&
        !exportDropdownRef.current.contains(event.target as Node)
      ) {
        setShowExportDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleScheduleUpdate = (data: any) => {
    if (Array.isArray(data) && data.length > 0 && data[0]?.group_id) {
      setGroupSchedules(data);
      setActiveGroupIndex(0);
    } else if (Array.isArray(data)) {
      setGroupSchedules((prev) => {
        if (prev.length === 0) return prev;
        const updated = [...prev];
        updated[activeGroupIndex] = {
          ...updated[activeGroupIndex],
          schedule: data,
        };
        return updated;
      });
    }
  };

  const activeGroup = groupSchedules[activeGroupIndex];
  const activeSchedule = activeGroup?.schedule || [];

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    if (activeGroup) {
      formData.append("group_id", activeGroup.group_id);
    }

    try {
      const res = await fetch("/api/import-schedule", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        alert(
          `✅ Import สำเร็จ!\nประเภท: ${data.type}\nจำนวน: ${data.imported_count} รายการ`,
        );
        if (data.type === "Schedule" || data.type === "Student Groups") {
          window.location.reload();
        }
      } else {
        alert(`❌ Import ล้มเหลว: ${data.error}`);
      }
    } catch (error: any) {
      alert(`❌ เกิดข้อผิดพลาด: ${error.message}`);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ✅ UPDATED: Export Handler รองรับ PDF + All Groups
  const handleExport = async (
    format: "csv" | "xlsx" | "pdf",
    scope: "current" | "all",
  ) => {
    // Validation
    if (scope === "current" && (!activeGroup || activeSchedule.length === 0)) {
      alert("⚠️ ไม่มีข้อมูลตารางสอนในกลุ่มปัจจุบัน");
      return;
    }
    if (
      scope === "all" &&
      groupSchedules.every((g) => !g.schedule || g.schedule.length === 0)
    ) {
      alert("⚠️ ไม่มีข้อมูลตารางสอนเลยสักกลุ่ม");
      return;
    }

    try {
      const payload =
        scope === "all"
          ? {
              mode: "all",
              groups: groupSchedules,
              format: format,
            }
          : {
              mode: "single",
              schedule: activeSchedule,
              group_id: activeGroup.group_id,
              group_name: activeGroup.group_name,
              advisor: activeGroup.advisor,
              format: format,
            };

      const res = await fetch("/api/export-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;

        // ตั้งชื่อไฟล์
        if (scope === "all") {
          const ext =
            format === "pdf" ? "pdf" : format === "csv" ? "csv" : "xlsx";
          a.download = `All_Schedules_${new Date().toISOString().slice(0, 10)}.${ext}`;
        } else {
          a.download = `Schedule_${activeGroup.group_name.replace(/\s+/g, "_")}.${format}`;
        }

        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const data = await res.json();
        alert(`❌ Export ล้มเหลว: ${data.error}`);
      }
    } catch (error: any) {
      alert(`❌ เกิดข้อผิดพลาด: ${error.message}`);
    }
    setShowExportDropdown(false);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans selection:bg-indigo-100 pb-20">
      {/* 1. Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2 md:gap-4">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <School className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg md:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-violet-700">
                {schoolName}
              </h1>
              <p className="text-xs text-slate-500 font-medium tracking-wide hidden md:block">
                INTELLIGENT SCHEDULER
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200 font-medium text-sm"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden md:inline">Import Data</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.csv"
              onChange={handleImport}
              className="hidden"
            />

            {/* ✅ UPDATED: Export Dropdown with PDF */}
            <div className="relative" ref={exportDropdownRef}>
              <button
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                className="flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200 font-medium text-sm"
              >
                <Download className="w-4 h-4" />
                <span className="hidden md:inline">Export</span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${showExportDropdown ? "rotate-180" : ""}`}
                />
              </button>

              {showExportDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                  {/* Current Group Section */}
                  <div className="px-4 py-2 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    Current Group Only
                  </div>
                  <button
                    onClick={() => handleExport("csv", "current")}
                    className="w-full px-4 py-3 text-left hover:bg-indigo-50 flex items-center gap-3 text-slate-700 group"
                  >
                    <FileText className="w-4 h-4 text-green-600" />
                    <span className="text-sm">Export CSV</span>
                  </button>
                  <button
                    onClick={() => handleExport("xlsx", "current")}
                    className="w-full px-4 py-3 text-left hover:bg-indigo-50 flex items-center gap-3 text-slate-700 group"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-green-600" />
                    <span className="text-sm">Export Excel</span>
                  </button>
                  <button
                    onClick={() => handleExport("pdf", "current")}
                    className="w-full px-4 py-3 text-left hover:bg-red-50 flex items-center gap-3 text-slate-700 group border-b border-slate-100"
                  >
                    <FileBadge className="w-4 h-4 text-red-600" />
                    <span className="text-sm font-medium">Export PDF</span>
                  </button>

                  {/* All Groups Section */}
                  <div className="px-4 py-2 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    All Groups
                  </div>
                  <button
                    onClick={() => handleExport("xlsx", "all")}
                    className="w-full px-4 py-3 text-left hover:bg-purple-50 flex items-center gap-3 text-slate-700 group bg-purple-50/30"
                  >
                    <Files className="w-4 h-4 text-purple-600" />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-purple-700">
                        Export All (Excel)
                      </span>
                      <span className="text-[10px] text-purple-500">
                        Multi-sheet workbook
                      </span>
                    </div>
                  </button>
                  <button
                    onClick={() => handleExport("pdf", "all")}
                    className="w-full px-4 py-3 text-left hover:bg-purple-50 flex items-center gap-3 text-slate-700 group bg-purple-50/30"
                  >
                    <FileBadge className="w-4 h-4 text-purple-600" />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-purple-700">
                        Export All (PDF)
                      </span>
                      <span className="text-[10px] text-purple-500">
                        Multi-page document
                      </span>
                    </div>
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsChatOpen(true)}
              className="ml-1 md:ml-2 flex items-center gap-2 px-3 md:px-5 py-2 md:py-2.5 bg-slate-900 text-white hover:bg-slate-800 rounded-lg shadow-lg shadow-slate-200 transition-all font-medium text-sm"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden md:inline">AI Assistant</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main Content */}
      <main className="max-w-[1600px] mx-auto px-4 md:px-6 py-4 md:py-8 space-y-4 md:space-y-6">
        {/* Group Selector */}
        {groupSchedules.length > 0 && (
          <div className="bg-white rounded-2xl p-1 shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 md:items-center">
            <div className="flex-1 overflow-x-auto no-scrollbar py-2 px-2 flex gap-2">
              {groupSchedules.map((group, index) => (
                <button
                  key={group.group_id}
                  onClick={() => setActiveGroupIndex(index)}
                  className={`relative flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    index === activeGroupIndex
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 ring-2 ring-indigo-600 ring-offset-2"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span>{group.group_name}</span>
                  {group.schedule.length > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full ${index === activeGroupIndex ? "bg-white/20" : "bg-slate-200 text-slate-500"}`}
                    >
                      {group.schedule.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {activeGroup && (
              <div className="px-4 md:px-6 py-2 md:border-l border-slate-100 flex items-center gap-3 md:gap-6 text-xs md:text-sm text-slate-600 bg-slate-50/50 rounded-b-xl md:rounded-r-xl md:rounded-bl-none">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-500" />
                  <span className="font-semibold text-slate-800">
                    {activeGroup.group_count || 0}
                  </span>
                  <span className="text-slate-400 hidden sm:inline">
                    Students
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span className="font-semibold text-slate-800">
                    {activeGroup.advisor || "N/A"}
                  </span>
                  <span className="text-slate-400 hidden sm:inline">
                    Advisor
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. Schedule Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[600px] relative">
          {isLoadingData ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <MasterScheduleTable
              schedule={activeSchedule}
              slots={slots}
              isLoadingData={isLoadingData}
              groupName={activeGroup?.group_name}
              advisor={activeGroup?.advisor}
              failedTasks={activeGroup?.failedTasks || []}
            />
          )}
        </div>

        {/* 4. Config Zone */}
        <section className="pt-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1 bg-slate-200"></div>
            <div className="flex items-center gap-2 text-slate-400 text-sm font-medium uppercase tracking-wider">
              <Settings className="w-4 h-4" />
              <span>Configuration Zone</span>
            </div>
            <div className="h-px flex-1 bg-slate-200"></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {[
              {
                id: "room",
                label: "จัดการห้องเรียน",
                sub: "Room Capacity",
                icon: LayoutGrid,
                color: "text-pink-600",
                bg: "bg-pink-50",
                border: "hover:border-pink-200",
              },
              {
                id: "teacher",
                label: "จัดการครูผู้สอน",
                sub: "Teacher & Roles",
                icon: Users,
                color: "text-emerald-600",
                bg: "bg-emerald-50",
                border: "hover:border-emerald-200",
              },
              {
                id: "subject",
                label: "ข้อมูลรายวิชา",
                sub: "Subjects & Credits",
                icon: BookOpen,
                color: "text-blue-600",
                bg: "bg-blue-50",
                border: "hover:border-blue-200",
              },
              {
                id: "studentgroup",
                label: "กลุ่มเรียน",
                sub: "Class Groups",
                icon: Users,
                color: "text-orange-600",
                bg: "bg-orange-50",
                border: "hover:border-orange-200",
              },
              {
                id: "teach",
                label: "จัดการสอนวิชา",
                sub: "Class Groups",
                icon: Users,
                color: "text-orange-600",
                bg: "bg-orange-50",
                border: "hover:border-orange-200",
              },
              {
                id: "res",
                label: "จัดการกลุ่มวิชาเรียน",
                sub: "Class Groups",
                icon: Users,
                color: "text-orange-600",
                bg: "bg-orange-50",
                border: "hover:border-orange-200",
              },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveModal(item.id)}
                className={`group bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all text-left flex items-start gap-4 ${item.border}`}
              >
                <div
                  className={`p-3 rounded-lg ${item.bg} ${item.color} group-hover:scale-110 transition-transform`}
                >
                  <item.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-700 group-hover:text-slate-900">
                    {item.label}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">{item.sub}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>

      {/* Modals */}
      {activeModal === "room" && (
        <ConfigRoom onClose={() => setActiveModal(null)} />
      )}
      {activeModal === "subject" && (
        <ConfigSubject onClose={() => setActiveModal(null)} />
      )}
      {activeModal === "teacher" && (
        <ConfigTeacher onClose={() => setActiveModal(null)} />
      )}
      {activeModal === "studentgroup" && (
        <ConfigStudentGroup onClose={() => setActiveModal(null)} />
      )}
      {activeModal === "teach" && (
        <ConfigTeach onClose={() => setActiveModal(null)} />
      )}
      {activeModal === "res" && (
        <ConfigRes onClose={() => setActiveModal(null)} />
      )}

      <AIChatPanel
        schedule={activeSchedule}
        onScheduleUpdate={handleScheduleUpdate}
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />

      {!isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-8 right-8 p-4 bg-slate-900 text-white rounded-full shadow-2xl hover:shadow-3xl hover:scale-110 hover:-translate-y-1 transition-all z-40 group"
        >
          <MessageSquare className="w-6 h-6 group-hover:rotate-12 transition-transform" />
        </button>
      )}
    </div>
  );
}
