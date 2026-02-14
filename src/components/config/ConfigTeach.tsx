"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  BookOpen,
  User,
  X,
  ChevronLeft,
  Trash2,
  Search,
  Link as LinkIcon,
} from "lucide-react";

interface ConfigTeachProps {
  onClose: () => void;
}

interface Teach {
  id: string;
  teacher_id: string;
  subject_id: string;
}

export default function ConfigTeach({ onClose }: ConfigTeachProps) {
  const [teaches, setTeaches] = useState<Teach[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ teacher_id: "", subject_id: "" });

  useEffect(() => {
    fetchTeaches();
  }, []);

  const fetchTeaches = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/config/teach");
      if (res.ok) setTeaches((await res.json()) as Teach[]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = teaches.filter(
    (t) =>
      t.teacher_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.subject_id.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/config/teach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    if (!res.ok) return window.alert("ข้อมูลซ้ำหรือผิดพลาด");
    setIsModalOpen(false);
    setFormData({ teacher_id: "", subject_id: "" });
    fetchTeaches();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(`ยืนยันลบการมอบหมายงานสอนนี้?`)) return;
    await fetch(`/api/config/teach?id=${id}`, { method: "DELETE" });
    fetchTeaches();
  };

  return (
    <div className="fixed inset-0 bg-slate-100/80 backdrop-blur-sm z-50 overflow-y-auto animate-in fade-in duration-200">
      <div className="min-h-screen p-3 md:p-4 lg:p-8">
        <div className="max-w-7xl mx-auto bg-white min-h-[90vh] rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-4 md:p-6 border-b border-slate-100 bg-white sticky top-0 z-10 flex flex-col gap-4">
            <div className="flex items-center gap-3 md:gap-4">
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <LinkIcon className="w-6 md:w-7 h-6 md:h-7 text-blue-600" /> มอบหมายการสอน
                </h1>
                <p className="text-slate-500 text-sm">
                  จัดการความเชื่อมโยง อาจารย์ - รายวิชา
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative group flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหารหัสอาจารย์/วิชา..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSearchTerm(e.target.value)
                  }
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-blue-200 transition-all whitespace-nowrap"
              >
                <Plus className="w-5 h-5" /> เพิ่มการสอน
              </button>
            </div>
          </div>

          {/* List Content */}
          <div className="flex-1 p-4 md:p-6 bg-slate-50/50">
            {loading ? (
              <div className="text-center py-20 text-slate-400">
                กำลังโหลดข้อมูล...
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((t) => (
                  <div
                    key={t.id}
                    className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative group"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                              Teacher ID
                            </p>
                            <p className="font-bold text-slate-700">
                              {t.teacher_id}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                              Subject ID
                            </p>
                            <p className="font-bold text-slate-700">
                              {t.subject_id}
                            </p>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-slate-800">
                มอบหมายวิชาสอนใหม่
              </h2>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500">
                  รหัสอาจารย์
                </label>
                <input
                  required
                  placeholder="T001"
                  value={formData.teacher_id}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, teacher_id: e.target.value })
                  }
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">
                  รหัสวิชา
                </label>
                <input
                  required
                  placeholder="S001"
                  value={formData.subject_id}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, subject_id: e.target.value })
                  }
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none mt-1"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 mt-4 transition-all active:scale-[0.98]"
              >
                บันทึกการสอน
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
