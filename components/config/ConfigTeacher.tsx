"use client";

import { useState, useEffect } from "react";
// ✅ แก้ไข: เปลี่ยน BadgeID เป็น IdCard
import { Plus, Users, X, ChevronLeft, Trash2, Pencil, IdCard } from "lucide-react";

interface ConfigTeacherProps {
  onClose: () => void;
}

export default function ConfigTeacher({ onClose }: ConfigTeacherProps) {
  // ✅ 1. Interface ตรงกับ Prisma Model: Teacher
  interface Teacher {
    teacher_id: string;
    teacher_name: string;
    role: string;
  }

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // ✅ 2. Form Data
  const [formData, setFormData] = useState({
    teacher_id: "",
    teacher_name: "",
    role: "อาจารย์ที่ปรึกษา", // Default
  });

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      const res = await fetch("/api/config/teacher");
      if (res.ok) {
        const data = await res.json();
        setTeachers(data);
      }
    } catch (error) {
      console.error("Error fetching teachers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setIsEditing(false);
    setFormData({ teacher_id: "", teacher_name: "", role: "อาจารย์ที่ปรึกษา" });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (teacher: Teacher) => {
    setIsEditing(true);
    setFormData({
      teacher_id: teacher.teacher_id,
      teacher_name: teacher.teacher_name,
      role: teacher.role,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`คุณต้องการลบอาจารย์ ${id} ใช่หรือไม่?`)) return;
    try {
      const res = await fetch(`/api/config/teacher?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      alert("ลบข้อมูลเรียบร้อย!");
      fetchTeachers();
    } catch (error) {
      alert("เกิดข้อผิดพลาดในการลบ");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = isEditing ? "PUT" : "POST";
      const res = await fetch("/api/config/teacher", {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error);
        return;
      }

      alert(isEditing ? "แก้ไขข้อมูลเรียบร้อย!" : "เพิ่มอาจารย์เรียบร้อย!");
      setIsModalOpen(false);
      fetchTeachers();
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
              <Users className="w-8 h-8 text-indigo-600" />
              จัดการข้อมูลอาจารย์
            </h1>
          </div>
          <div className="flex gap-3">
             <button onClick={handleOpenAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-md">
                <Plus className="w-5 h-5" /> เพิ่มอาจารย์
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
            {teachers.map((t) => (
              <div key={t.teacher_id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-lg transition-all relative overflow-hidden group">
                
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xl">
                    {t.teacher_name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 line-clamp-1">{t.teacher_name}</h3>
                    <p className="text-sm text-indigo-500 font-medium">{t.teacher_id}</p>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                        {/* ✅ แก้ไข: ใช้ IdCard แทน BadgeID */}
                        <IdCard className="w-4 h-4 text-gray-400" />
                        <span>ตำแหน่ง: <span className="font-bold text-gray-800">{t.role}</span></span>
                    </div>
                </div>

                <div className="flex items-center justify-end border-t pt-3 border-gray-100 gap-1">
                    <button onClick={() => handleOpenEdit(t)} className="p-1.5 text-gray-400 hover:text-amber-500 bg-gray-50 rounded-md">
                        <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(t.teacher_id)} className="p-1.5 text-gray-400 hover:text-red-500 bg-gray-50 rounded-md">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal Form */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200 border border-gray-100">
              <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h2 className="text-xl font-bold text-gray-800">{isEditing ? "แก้ไขข้อมูลอาจารย์" : "เพิ่มอาจารย์ใหม่"}</h2>
                <button onClick={() => setIsModalOpen(false)}><X className="w-6 h-6 text-gray-400" /></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">รหัสอาจารย์</label>
                        <input required type="text" readOnly={isEditing} 
                            className={`w-full border rounded-lg p-2 ${isEditing ? 'bg-gray-100' : ''}`}
                            value={formData.teacher_id} onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })} 
                        />
                    </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ-นามสกุล</label>
                  <input required type="text" className="w-full border rounded-lg p-2"
                    value={formData.teacher_name} onChange={(e) => setFormData({ ...formData, teacher_name: e.target.value })} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ตำแหน่ง (Role)</label>
                  <input required type="text" className="w-full border rounded-lg p-2"
                    placeholder="เช่น อาจารย์ที่ปรึกษา, หัวหน้าสาขา"
                    value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} />
                </div>

                <button type="submit" className={`w-full mt-4 py-3 rounded-xl font-bold shadow-lg text-white ${isEditing ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                  {isEditing ? "บันทึกการแก้ไข" : "บันทึกอาจารย์"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}