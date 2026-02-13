"use client";

import { useState, useEffect } from "react";
import { Plus, GraduationCap, X, ChevronLeft, Trash2, Pencil, Search, Users, Save } from "lucide-react";

interface ConfigStudentGroupProps { onClose: () => void; }

interface StudentGroup {
  group_id: string;
  group_name: string;
  advisor: string;
  group_count: number;
}

export default function ConfigStudentGroup({ onClose }: ConfigStudentGroupProps) {
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ group_id: "", group_name: "", advisor: "", group_count: 30 });

  useEffect(() => { fetchGroups(); }, []);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/config/studentgroup");
      if (res.ok) setGroups(await res.json());
    } finally { setLoading(false); }
  };

  const filtered = groups.filter(g => 
    g.group_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    g.group_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenAdd = () => {
    setIsEditing(false);
    setFormData({ group_id: "", group_name: "", advisor: "", group_count: 30 });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (g: StudentGroup) => {
    setIsEditing(true);
    setFormData(g);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`ยืนยันลบกลุ่มเรียน ${id}?`)) return;
    await fetch(`/api/config/student-group?id=${id}`, { method: "DELETE" });
    fetchGroups();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/config/student-group", {
      method: isEditing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    if (!res.ok) return alert("เกิดข้อผิดพลาด");
    setIsModalOpen(false);
    fetchGroups();
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
                  <GraduationCap className="w-7 h-7 text-emerald-600" /> จัดการกลุ่มเรียน
                </h1>
                <p className="text-slate-500 text-sm">จำนวน {groups.length} กลุ่ม</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" placeholder="ค้นหากลุ่มเรียน..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-100 w-64" />
              </div>
              <button onClick={handleOpenAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg flex items-center gap-2 shadow-lg shadow-emerald-200">
                <Plus className="w-5 h-5" /> เพิ่มกลุ่มเรียน
              </button>
            </div>
          </div>

          {/* Grid */}
          <div className="flex-1 p-6 bg-slate-50/50 overflow-y-auto">
            {loading ? <div className="text-center py-20 text-slate-400">Loading...</div> : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filtered.map((g) => (
                  <div key={g.group_id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-xl hover:border-emerald-200 transition-all relative overflow-hidden group">
                     <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-50 rounded-bl-full -mr-10 -mt-10"></div>
                     <div className="relative z-10">
                       <h3 className="text-lg font-bold text-slate-800">{g.group_name}</h3>
                       <p className="text-xs text-emerald-600 font-bold mb-3">{g.group_id}</p>
                       
                       <div className="space-y-2 mb-4">
                         <div className="flex justify-between items-center text-sm text-slate-600 bg-slate-50 p-2 rounded">
                            <span className="flex items-center gap-1"><Users className="w-4 h-4 text-slate-400"/> จำนวน</span>
                            <span className="font-bold text-slate-800">{g.group_count} คน</span>
                         </div>
                         <div className="text-xs text-slate-500">
                            ที่ปรึกษา: <span className="font-medium text-slate-700">{g.advisor || "-"}</span>
                         </div>
                       </div>
                     </div>

                     <div className="flex gap-2 pt-3 border-t border-slate-100 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleOpenEdit(g)} className="flex-1 py-1.5 flex items-center justify-center gap-1.5 text-xs font-medium bg-amber-50 text-amber-600 rounded hover:bg-amber-100">
                          <Pencil className="w-3.5 h-3.5" /> แก้ไข
                        </button>
                        <button onClick={() => handleDelete(g.group_id)} className="flex-1 py-1.5 flex items-center justify-center gap-1.5 text-xs font-medium bg-red-50 text-red-600 rounded hover:bg-red-100">
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
              <h2 className="text-lg font-bold text-slate-800">{isEditing ? "แก้ไขข้อมูล" : "เพิ่มกลุ่มเรียนใหม่"}</h2>
              <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500">รหัสกลุ่มเรียน</label>
                <input required readOnly={isEditing} value={formData.group_id} onChange={e => setFormData({...formData, group_id: e.target.value})} 
                  className={`w-full p-2 border rounded-lg ${isEditing ? 'bg-slate-100' : ''}`} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">ชื่อกลุ่มเรียน</label>
                <input required value={formData.group_name} onChange={e => setFormData({...formData, group_name: e.target.value})} 
                  className="w-full p-2 border rounded-lg" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">อาจารย์ที่ปรึกษา</label>
                <input value={formData.advisor} onChange={e => setFormData({...formData, advisor: e.target.value})} 
                  className="w-full p-2 border rounded-lg" placeholder="ระบุชื่ออาจารย์" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">จำนวนนักศึกษา</label>
                <input type="number" required value={formData.group_count} onChange={e => setFormData({...formData, group_count: Number(e.target.value)})} 
                  className="w-full p-2 border rounded-lg" />
              </div>
              <button type="submit" className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 mt-2">บันทึกข้อมูล</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}