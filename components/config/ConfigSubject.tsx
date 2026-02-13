"use client";

import { useState, useEffect } from "react";
import { Plus, BookOpen, X, ChevronLeft, Trash2, Pencil, Clock } from "lucide-react";

interface ConfigSubjectProps {
  onClose: () => void;
}

export default function ConfigSubject({ onClose }: ConfigSubjectProps) {
  // ✅ 1. Interface ตรงกับ Prisma Model: Subject
  interface Subject {
    subject_id: string;
    subject_name: string;
    theory: number;
    practice: number;
    credit: number;
  }

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // ✅ 2. Form Data
  const [formData, setFormData] = useState({
    subject_id: "",
    subject_name: "",
    theory: 1,
    practice: 2,
    credit: 3,
  });

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const res = await fetch("/api/config/subject");
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
    if (!confirm(`คุณต้องการลบวิชา ${id} ใช่หรือไม่?`)) return;
    try {
      const res = await fetch(`/api/config/subject?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      alert("ลบวิชาเรียบร้อย!");
      fetchSubjects();
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

      alert(isEditing ? "แก้ไขข้อมูลเรียบร้อย!" : "เพิ่มวิชาเรียบร้อย!");
      setIsModalOpen(false);
      fetchSubjects();
    } catch (error) {
      alert("เกิดข้อผิดพลาด");
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-50 z-40 overflow-y-auto animate-in slide-in-from-bottom-10 fade-in duration-300">
      <div className="p-6 max-w-7xl mx-auto min-h-screen">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8 sticky top-0 bg-gray-50/95 backdrop-blur py-4 z-10 border-b border-gray-200">
          <div>
            <button onClick={onClose} className="flex items-center gap-1 text-gray-500 hover:text-indigo-600 mb-1 transition-colors">
                <ChevronLeft className="w-5 h-5" /> ย้อนกลับ
            </button>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <BookOpen className="w-8 h-8 text-indigo-600" />
              จัดการรายวิชา
            </h1>
          </div>
          <div className="flex gap-3">
             <button onClick={handleOpenAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-md">
                <Plus className="w-5 h-5" /> เพิ่มรายวิชา
            </button>
            <button onClick={onClose} className="p-2 bg-white hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full border shadow-sm">
                <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Grid Layout */}
        {loading ? (
          <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
            {subjects.map((sub) => (
              <div key={sub.subject_id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-lg transition-all relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-50 rounded-bl-full -mr-10 -mt-10 group-hover:bg-indigo-100 transition-colors"></div>
                
                <div className="flex justify-between items-start mb-3 relative z-10">
                  <div className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs font-bold uppercase">
                    {sub.credit} หน่วยกิต
                  </div>            
                </div>
                <div className="mb-4">
                    <h3 className="text-lg font-bold text-gray-800 line-clamp-1">{sub.subject_name}</h3>
                    <p className="text-sm text-indigo-500 font-medium mt-1">{sub.subject_id}</p>
                </div>

                <div className="flex items-center justify-between mt-auto border-t pt-3 border-gray-100">
                    <div className="flex items-center gap-1.5 text-gray-600 text-xs">
                        <Clock className="w-3.5 h-3.5" />
                        <span>ทฤษฎี {sub.theory} / ปฏิบัติ {sub.practice}</span>
                    </div>

                    <div className="flex gap-1">
                        <button onClick={() => handleOpenEdit(sub)} className="p-1.5 text-gray-400 hover:text-amber-500 bg-gray-50 rounded-md">
                            <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(sub.subject_id)} className="p-1.5 text-gray-400 hover:text-red-500 bg-gray-50 rounded-md">
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal Form */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200 border border-gray-100">
              <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h2 className="text-xl font-bold text-gray-800">{isEditing ? "แก้ไขรายวิชา" : "เพิ่มรายวิชาใหม่"}</h2>
                <button onClick={() => setIsModalOpen(false)}><X className="w-6 h-6 text-gray-400" /></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">รหัสวิชา</label>
                    <input required type="text" readOnly={isEditing} 
                        className={`w-full border rounded-lg p-2 ${isEditing ? 'bg-gray-100' : ''}`}
                        value={formData.subject_id} onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })} 
                    />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อวิชา</label>
                  <input required type="text" className="w-full border rounded-lg p-2"
                    value={formData.subject_name} onChange={(e) => setFormData({ ...formData, subject_name: e.target.value })} />
                </div>

                <div className="grid grid-cols-3 gap-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">หน่วยกิต</label>
                    <input required type="number" min="0" className="w-full border rounded-lg p-2 text-center"
                      value={formData.credit} onChange={(e) => setFormData({ ...formData, credit: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">ทฤษฎี (ชม.)</label>
                    <input required type="number" min="0" className="w-full border rounded-lg p-2 text-center"
                      value={formData.theory} onChange={(e) => setFormData({ ...formData, theory: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">ปฏิบัติ (ชม.)</label>
                    <input required type="number" min="0" className="w-full border rounded-lg p-2 text-center"
                      value={formData.practice} onChange={(e) => setFormData({ ...formData, practice: Number(e.target.value) })} />
                  </div>
                </div>

                <button type="submit" className={`w-full mt-4 py-3 rounded-xl font-bold shadow-lg text-white ${isEditing ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                  {isEditing ? "บันทึกการแก้ไข" : "บันทึกรายวิชา"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}