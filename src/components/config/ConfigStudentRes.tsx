"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  GraduationCap,
  BookOpen,
  X,
  ChevronLeft,
  Trash2,
  Search,
  AppWindow,
} from "lucide-react";

interface ConfigRegisterProps {
  onClose: () => void;
}

interface Register {
  id: string;
  group_id: string;
  subject_id: string;
}

export default function ConfigRegister({ onClose }: ConfigRegisterProps) {
  const [registers, setRegisters] = useState<Register[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ group_id: "", subject_id: "" });

  useEffect(() => {
    fetchRegisters();
  }, []);

  const fetchRegisters = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/config/register");
      if (res.ok) setRegisters((await res.json()) as Register[]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = registers.filter(
    (r) =>
      r.group_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.subject_id.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/config/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    if (!res.ok) return window.alert("ข้อมูลซ้ำหรือผิดพลาด");
    setIsModalOpen(false);
    setFormData({ group_id: "", subject_id: "" });
    fetchRegisters();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(`ยืนยันลบข้อมูลการลงทะเบียนนี้?`)) return;
    await fetch(`/api/config/register?id=${id}`, { method: "DELETE" });
    fetchRegisters();
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
                  <AppWindow className="w-6 md:w-7 h-6 md:h-7 text-rose-600" />{" "}
                  จัดการแผนการลงทะเบียน
                </h1>
                <p className="text-slate-500 text-sm">
                  กำหนดรายวิชาที่กลุ่มเรียนต้องลงทะเบียน
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative group flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหากลุ่มเรียน/วิชา..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSearchTerm(e.target.value)
                  }
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-100"
                />
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-rose-200 transition-all whitespace-nowrap"
              >
                <Plus className="w-5 h-5" /> เพิ่มการลงทะเบียน
              </button>
            </div>
          </div>

          {/* Grid View */}
          <div className="flex-1 p-4 md:p-6 bg-slate-50/50">
            {loading ? (
              <div className="text-center py-20 text-slate-400">Loading...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {filtered.map((r) => (
                  <div
                    key={r.id}
                    className="bg-white p-4 rounded-xl border-l-4 border-l-rose-500 border border-slate-200 shadow-sm flex justify-between items-center group"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                        <GraduationCap className="w-3 h-3" /> {r.group_id}
                      </div>
                      <div className="flex items-center gap-2 text-slate-800 font-bold">
                        <BookOpen className="w-4 h-4 text-rose-400" />{" "}
                        {r.subject_id}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="p-2 text-slate-200 hover:text-red-500 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
                เพิ่มแผนการเรียนกลุ่ม
              </h2>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">
                  รหัสกลุ่มเรียน (Group ID)
                </label>
                <input
                  required
                  placeholder="66-1-X"
                  value={formData.group_id}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, group_id: e.target.value })
                  }
                  className="w-full p-2 bg-slate-50 border rounded-lg focus:ring-2 focus:ring-rose-100 outline-none mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">
                  รหัสวิชา (Subject ID)
                </label>
                <input
                  required
                  placeholder="SUB-001"
                  value={formData.subject_id}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, subject_id: e.target.value })
                  }
                  className="w-full p-2 bg-slate-50 border rounded-lg focus:ring-2 focus:ring-rose-100 outline-none mt-1"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 mt-4 transition-all"
              >
                ยืนยันการลงทะเบียน
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
