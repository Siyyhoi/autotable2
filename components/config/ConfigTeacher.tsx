"use client";

import { useState, useEffect } from "react";
import { Plus, Users, X, ChevronLeft, Trash2, Pencil, Search, AlertCircle, Save, UserCircle } from "lucide-react";

interface ConfigTeacherProps { onClose: () => void; }

interface Teacher {
  teacher_id: string;
  teacher_name: string;
  role: string;
}

export default function ConfigTeacher({ onClose }: ConfigTeacherProps) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ teacher_id: "", teacher_name: "", role: "อาจารย์ประจำ" });

  useEffect(() => { fetchTeachers(); }, []);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/config/teacher");
      if (res.ok) setTeachers(await res.json());
    } finally { setLoading(false); }
  };

  const filtered = teachers.filter(t => 
    t.teacher_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.teacher_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenAdd = () => {
    setIsEditing(false);
    setFormData({ teacher_id: "", teacher_name: "", role: "อาจารย์ประจำ" });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t: Teacher) => {
    setIsEditing(true);
    setFormData(t);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`ยืนยันลบ ${id}?`)) return;
    await fetch(`/api/config/teacher?id=${id}`, { method: "DELETE" });
    fetchTeachers();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/config/teacher", {
      method: isEditing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    if (!res.ok) return alert("เกิดข้อผิดพลาด");
    setIsModalOpen(false);
    fetchTeachers();
  };

  return (
    <div className="fixed inset-0 bg-slate-100/80 backdrop-blur-sm z-50 overflow-y-auto animate-in fade-in duration-200">
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-7xl mx-auto bg-white min-h-[90vh] rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-slate-100 bg-white sticky top-0 z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <Users className="w-7 h-7 text-indigo-600" /> จัดการข้อมูลอาจารย์
                </h1>
                <p className="text-slate-500 text-sm">จำนวน {teachers.length} ท่าน</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" placeholder="ค้นหาชื่อ..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 w-64" />
              </div>
              <button onClick={handleOpenAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg flex items-center gap-2 shadow-lg shadow-indigo-200">
                <Plus className="w-5 h-5" /> เพิ่มอาจารย์
              </button>
            </div>
          </div>

          {/* Grid */}
          <div className="flex-1 p-6 bg-slate-50/50 overflow-y-auto">
            {loading ? <div className="text-center py-20 text-slate-400">Loading...</div> : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filtered.map((t) => (
                  <div key={t.teacher_id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-xl hover:border-indigo-200 transition-all relative overflow-hidden group">
                     <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg">
                          {t.teacher_name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800">{t.teacher_name}</h3>
                          <span className="text-xs text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded">{t.teacher_id}</span>
                        </div>
                     </div>
                     <div className="mb-4">
                        <span className="text-sm text-slate-500 flex items-center gap-1">
                          <UserCircle className="w-4 h-4" /> {t.role}
                        </span>
                     </div>
                     <div className="flex gap-2 pt-3 border-t border-slate-100 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleOpenEdit(t)} className="flex-1 py-1.5 flex items-center justify-center gap-1.5 text-xs font-medium bg-amber-50 text-amber-600 rounded hover:bg-amber-100">
                          <Pencil className="w-3.5 h-3.5" /> แก้ไข
                        </button>
                        <button onClick={() => handleDelete(t.teacher_id)} className="flex-1 py-1.5 flex items-center justify-center gap-1.5 text-xs font-medium bg-red-50 text-red-600 rounded hover:bg-red-100">
                          <Trash2 className="w-3.5 h-3.5" /> ลบ
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-slate-800">{isEditing ? "แก้ไขข้อมูล" : "เพิ่มอาจารย์ใหม่"}</h2>
              <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500">รหัสอาจารย์</label>
                <input required readOnly={isEditing} value={formData.teacher_id} onChange={e => setFormData({...formData, teacher_id: e.target.value})} 
                  className={`w-full p-2 border rounded-lg ${isEditing ? 'bg-slate-100' : ''}`} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">ชื่อ-นามสกุล</label>
                <input required value={formData.teacher_name} onChange={e => setFormData({...formData, teacher_name: e.target.value})} 
                  className="w-full p-2 border rounded-lg" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">ตำแหน่ง</label>
                <input required value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} 
                  className="w-full p-2 border rounded-lg" />
              </div>
              <button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 mt-2">บันทึกข้อมูล</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}