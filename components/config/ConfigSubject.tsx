"use client";

import { useState, useEffect } from "react";
import { Plus, BookOpen, Layers, X, ChevronLeft, Trash2, Pencil, Clock, Monitor } from "lucide-react";

interface ConfigSubjectProps {
  onClose: () => void;
}

export default function ConfigSubject({ onClose }: ConfigSubjectProps) {
  // ✅ 1. อัปเดต Interface ให้ตรงกับ Schema
  interface Subject {
    id: string;
    nameTH: string;
    nameEN: string;
    lectureHours: number;
    labHours: number;
    totalHours: number;
    recommendedYear: number;
    reqComputer: boolean;
  }

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // ✅ 2. อัปเดต Form State
  const [formData, setFormData] = useState({
    id: "",
    nameTH: "",
    nameEN: "",
    lectureHours: 1,
    labHours: 2,
    recommendedYear: 1,
    reqComputer: false,
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
    setFormData({ id: "", nameTH: "", nameEN: "", lectureHours: 1, labHours: 2, recommendedYear: 1, reqComputer: false });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sub: Subject) => {
    setIsEditing(true);
    setFormData({
      id: sub.id,
      nameTH: sub.nameTH,
      nameEN: sub.nameEN || "",
      lectureHours: sub.lectureHours,
      labHours: sub.labHours,
      recommendedYear: sub.recommendedYear,
      reqComputer: sub.reqComputer,
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
              <div key={sub.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-lg transition-all relative overflow-hidden group">
                {/* Decoration */}
                <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-50 rounded-bl-full -mr-10 -mt-10 group-hover:bg-indigo-100 transition-colors"></div>
                
                <div className="flex justify-between items-start mb-3 relative z-10">
                  <div className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs font-bold uppercase">
                    ชั้นปี {sub.recommendedYear}
                  </div>
                  {sub.reqComputer && (
                    <span title="ต้องการคอมพิวเตอร์">
                      <Monitor className="w-4 h-4 text-blue-500" />
                    </span>
                  )}                
                  </div>
                <div className="mb-4">
                    <h3 className="text-lg font-bold text-gray-800 line-clamp-1">{sub.nameTH}</h3>
                    <p className="text-xs text-gray-400 line-clamp-1">{sub.nameEN}</p>
                    <p className="text-sm text-indigo-500 font-medium mt-1">{sub.id}</p>
                </div>

                <div className="flex items-center justify-between mt-auto border-t pt-3 border-gray-100">
                    <div className="flex items-center gap-1.5 text-gray-600 text-xs">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{sub.lectureHours}ท. / {sub.labHours}ป.</span>
                        <span className="bg-gray-100 px-1 rounded text-[10px] font-bold">รวม {sub.totalHours}</span>
                    </div>

                    <div className="flex gap-1">
                        <button onClick={() => handleOpenEdit(sub)} className="p-1.5 text-gray-400 hover:text-amber-500 bg-gray-50 rounded-md">
                            <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(sub.id)} className="p-1.5 text-gray-400 hover:text-red-500 bg-gray-50 rounded-md">
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
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">รหัสวิชา</label>
                        <input required type="text" readOnly={isEditing} 
                            className={`w-full border rounded-lg p-2 ${isEditing ? 'bg-gray-100' : ''}`}
                            value={formData.id} onChange={(e) => setFormData({ ...formData, id: e.target.value })} 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ชั้นปีที่แนะนำ</label>
                        <input type="number" min="1" max="6"
                            className="w-full border rounded-lg p-2"
                            value={formData.recommendedYear} onChange={(e) => setFormData({ ...formData, recommendedYear: Number(e.target.value) })}
                        />
                    </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อวิชา (ไทย)</label>
                  <input required type="text" className="w-full border rounded-lg p-2"
                    value={formData.nameTH} onChange={(e) => setFormData({ ...formData, nameTH: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อวิชา (อังกฤษ)</label>
                  <input type="text" className="w-full border rounded-lg p-2"
                    value={formData.nameEN} onChange={(e) => setFormData({ ...formData, nameEN: e.target.value })} />
                </div>

                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">ชั่วโมงบรรยาย (ทฤษฎี)</label>
                    <input required type="number" min="0" className="w-full border rounded-lg p-2 text-center"
                      value={formData.lectureHours} onChange={(e) => setFormData({ ...formData, lectureHours: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">ชั่วโมงปฏิบัติ (แล็บ)</label>
                    <input required type="number" min="0" className="w-full border rounded-lg p-2 text-center"
                      value={formData.labHours} onChange={(e) => setFormData({ ...formData, labHours: Number(e.target.value) })} />
                  </div>
                  <div className="col-span-2 text-center text-sm text-indigo-600 font-semibold">
                    รวมเวลาเรียน: {Number(formData.lectureHours) + Number(formData.labHours)} คาบ
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                    <input type="checkbox" id="reqComp" className="w-4 h-4"
                        checked={formData.reqComputer} 
                        onChange={(e) => setFormData({ ...formData, reqComputer: e.target.checked })} 
                    />
                    <label htmlFor="reqComp" className="text-sm text-gray-700 cursor-pointer">วิชานี้ต้องใช้ห้องคอมพิวเตอร์</label>
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