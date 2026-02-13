"use client";

import { useState, useEffect } from "react";
import { 
  Plus, BookOpen, X, ChevronLeft, Trash2, Pencil, 
  Clock, Search, AlertCircle, Save
} from "lucide-react";

interface ConfigSubjectProps {
  onClose: () => void;
}

interface Subject {
  subject_id: string;
  subject_name: string;
  theory: number;
  practice: number;
  credit: number;
}

export default function ConfigSubject({ onClose }: ConfigSubjectProps) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    subject_id: "",
    subject_name: "",
    theory: 1,
    practice: 2,
    credit: 3,
  });

  // 🔄 Load Data
  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/config/subjects");
      if (res.ok) {
        const data = await res.json();
        setSubjects(data);
      }
    } catch (error) {
      console.error("Error fetching subjects:", error);
    } finally {
      setLoading(false);
    }
  };

  // 🔍 Filter Logic
  const filteredSubjects = subjects.filter(sub => 
    sub.subject_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.subject_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 🎮 Handlers
  const handleOpenAdd = () => {
    setIsEditing(false);
    setFormData({ subject_id: "", subject_name: "", theory: 1, practice: 2, credit: 3 });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sub: Subject) => {
    setIsEditing(true);
    setFormData({
      subject_id: sub.subject_id,
      subject_name: sub.subject_name,
      theory: sub.theory,
      practice: sub.practice,
      credit: sub.credit,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`ยืนยันการลบวิชา ${id} ?`)) return;
    try {
      const res = await fetch(`/api/config/subject?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setSubjects(prev => prev.filter(s => s.subject_id !== id));
      } else {
        alert("ลบไม่สำเร็จ");
      }
    } catch (error) {
      alert("เกิดข้อผิดพลาดในการลบ");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = isEditing ? "PUT" : "POST";
      const res = await fetch("/api/config/subject", {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error);
        return;
      }

      setIsModalOpen(false);
      fetchSubjects(); // Reload List
    } catch (error) {
      alert("เกิดข้อผิดพลาด");
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-100/80 backdrop-blur-sm z-50 overflow-y-auto animate-in fade-in duration-200">
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-7xl mx-auto bg-white min-h-[90vh] rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
          
          {/* 🟢 Header */}
          <div className="p-6 border-b border-slate-100 bg-white sticky top-0 z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <BookOpen className="w-7 h-7 text-blue-600" />
                  จัดการข้อมูลรายวิชา
                </h1>
                <p className="text-slate-500 text-sm">ทั้งหมด {subjects.length} วิชา</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Search Bar */}
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500" />
                <input 
                  type="text" 
                  placeholder="ค้นหารหัส หรือ ชื่อวิชา..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 w-64 transition-all"
                />
              </div>
              
              <button 
                onClick={handleOpenAdd} 
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg flex items-center gap-2 shadow-lg shadow-blue-200 transition-transform active:scale-95"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">เพิ่มวิชา</span>
              </button>
            </div>
          </div>

          {/* 🟡 Content Grid */}
          <div className="flex-1 p-6 bg-slate-50/50 overflow-y-auto">
            {loading ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-3">
                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <span>กำลังโหลดข้อมูล...</span>
              </div>
            ) : filteredSubjects.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
                <AlertCircle className="w-10 h-10 opacity-20" />
                <span>ไม่พบข้อมูลรายวิชา</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filteredSubjects.map((sub) => (
                  <div key={sub.subject_id} className="group bg-white rounded-xl border border-slate-200 p-5 hover:shadow-xl hover:border-blue-200 transition-all duration-300 relative overflow-hidden">
                    
                    {/* Decorative Background */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-bl-full -mr-12 -mt-12 group-hover:scale-110 transition-transform duration-500"></div>

                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-3">
                        <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-xs font-bold tracking-wide border border-blue-100">
                          {sub.subject_id}
                        </span>
                        <div className="text-right">
                          <span className="text-2xl font-bold text-slate-700">{sub.credit}</span>
                          <span className="text-xs text-slate-400 block -mt-1">หน่วยกิต</span>
                        </div>
                      </div>

                      <h3 className="text-lg font-bold text-slate-800 line-clamp-2 min-h-[3.5rem] mb-2 group-hover:text-blue-700 transition-colors">
                        {sub.subject_name}
                      </h3>

                      <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-2 rounded-lg mb-4 border border-slate-100">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>ทฤษฎี <strong className="text-slate-700">{sub.theory}</strong> ชม.</span>
                        <span className="text-slate-300">|</span>
                        <span>ปฏิบัติ <strong className="text-slate-700">{sub.practice}</strong> ชม.</span>
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-slate-100 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleOpenEdit(sub)}
                          className="flex-1 py-1.5 flex items-center justify-center gap-1.5 text-xs font-medium bg-amber-50 text-amber-600 rounded hover:bg-amber-100 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" /> แก้ไข
                        </button>
                        <button 
                          onClick={() => handleDelete(sub.subject_id)}
                          className="flex-1 py-1.5 flex items-center justify-center gap-1.5 text-xs font-medium bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> ลบ
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 🟣 Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-white/20 animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800">
                {isEditing ? "✏️ แก้ไขข้อมูลรายวิชา" : "✨ เพิ่มรายวิชาใหม่"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">รหัสวิชา</label>
                  <input 
                    required 
                    type="text" 
                    readOnly={isEditing}
                    placeholder="เช่น IT-101"
                    className={`w-full px-4 py-2.5 rounded-xl border ${isEditing ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' : 'bg-white border-slate-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-400'}`}
                    value={formData.subject_id} 
                    onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })} 
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">ชื่อวิชา</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="ชื่อวิชาภาษาไทย หรือ ภาษาอังกฤษ"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                    value={formData.subject_name} 
                    onChange={(e) => setFormData({ ...formData, subject_name: e.target.value })} 
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                 <label className="block text-xs font-semibold text-slate-400 mb-3 text-center uppercase tracking-wider">โครงสร้างหน่วยกิต</label>
                 <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <label className="block text-xs font-medium text-slate-600 mb-1">หน่วยกิต</label>
                      <input 
                        required type="number" min="0" 
                        className="w-full text-center px-2 py-2 rounded-lg border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 font-bold text-slate-700"
                        value={formData.credit} 
                        onChange={(e) => setFormData({ ...formData, credit: Number(e.target.value) })} 
                      />
                    </div>
                    <div className="text-center relative">
                      <div className="absolute -left-2 top-1/2 -translate-y-1/2 text-slate-300">=</div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">ทฤษฎี</label>
                      <input 
                        required type="number" min="0" 
                        className="w-full text-center px-2 py-2 rounded-lg border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 font-bold text-slate-700"
                        value={formData.theory} 
                        onChange={(e) => setFormData({ ...formData, theory: Number(e.target.value) })} 
                      />
                    </div>
                    <div className="text-center relative">
                      <div className="absolute -left-2 top-1/2 -translate-y-1/2 text-slate-300">+</div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">ปฏิบัติ</label>
                      <input 
                        required type="number" min="0" 
                        className="w-full text-center px-2 py-2 rounded-lg border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 font-bold text-slate-700"
                        value={formData.practice} 
                        onChange={(e) => setFormData({ ...formData, practice: Number(e.target.value) })} 
                      />
                    </div>
                 </div>
              </div>

              <button 
                type="submit" 
                className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${isEditing ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}`}
              >
                <Save className="w-5 h-5" />
                {isEditing ? "บันทึกการแก้ไข" : "ยืนยันการเพิ่มวิชา"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}