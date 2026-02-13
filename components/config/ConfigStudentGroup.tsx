"use client";

import { useState, useEffect } from "react";
import { Plus, Users, X, UserCheck, GraduationCap, ChevronLeft, Trash2, Pencil } from "lucide-react";

interface ConfigStudentGroupProps {
  onClose: () => void;
}

export default function ConfigStudentGroup({ onClose }: ConfigStudentGroupProps) {
  // ✅ 1. Interface ตรงกับ Prisma Model: StudentGroup
  interface StudentGroup {
    group_id: string;
    group_name: string;
    group_count: number;
    advisor: string;
  }

  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // ✅ 2. Form Data ตรงกับ API 
  const [formData, setFormData] = useState({
    group_id: "",
    group_name: "",
    group_count: 0,
    advisor: "",
  });

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const res = await fetch("/api/config/studentgroup"); // ตรวจสอบ Path ให้ตรงกับที่สร้างไว้
      if (res.ok) {
        const data = await res.json();
        setGroups(data);
      }
    } catch (error) {
      console.error("Error fetching student groups:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setIsEditing(false);
    setFormData({ group_id: "", group_name: "", group_count: 0, advisor: "" });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (group: StudentGroup) => {
    setIsEditing(true);
    setFormData({
      group_id: group.group_id,
      group_name: group.group_name,
      group_count: group.group_count,
      advisor: group.advisor,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`คุณต้องการลบกลุ่มเรียน ${id} ใช่หรือไม่?`)) return;

    try {
      const res = await fetch(`/api/config/studentgroup?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "ลบไม่สำเร็จ");
        return;
      }

      alert("ลบกลุ่มเรียนเรียบร้อย!");
      fetchGroups();
    } catch (error) {
      alert("เกิดข้อผิดพลาดในการลบ");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = isEditing ? "PUT" : "POST";
      
      const res = await fetch("/api/config/studentgroup", {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error);
        return;
      }

      alert(isEditing ? "แก้ไขข้อมูลเรียบร้อย!" : "เพิ่มกลุ่มเรียนเรียบร้อย!");
      setIsModalOpen(false);
      fetchGroups();
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
            <button 
                onClick={onClose} 
                className="flex items-center gap-1 text-gray-500 hover:text-indigo-600 mb-1 transition-colors"
            >
                <ChevronLeft className="w-5 h-5" /> ย้อนกลับ
            </button>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Users className="w-8 h-8 text-indigo-600" />
              จัดการกลุ่มเรียน (Student Groups)
            </h1>
          </div>
          
          <div className="flex gap-3">
             <button
                onClick={handleOpenAdd}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-md transition-all active:scale-95"
             >
            <Plus className="w-5 h-5" />
            เพิ่มกลุ่มเรียน
            </button>
            <button 
                onClick={onClose}
                className="p-2 bg-white hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full border shadow-sm transition-all"
            >
                <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Grid Layout */}
        {loading ? (
          <div className="flex items-center justify-center h-64 text-gray-400">
             <div className="animate-spin mr-2">⏳</div> กำลังโหลดข้อมูล...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
            {groups.map((group) => (
              <div
                key={group.group_id}
                className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-lg transition-all relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-50 rounded-bl-full -mr-8 -mt-8 transition-all group-hover:bg-indigo-100"></div>
                
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-1 rounded tracking-wider">
                    {group.group_id}
                  </div>
                  <GraduationCap className="w-5 h-5 text-indigo-500" />
                </div>

                <h3 className="text-lg font-bold text-gray-800 mb-1 leading-tight">{group.group_name}</h3>
                
                <div className="space-y-2 mt-4">
                    <div className="flex items-center text-sm text-gray-600 gap-2">
                        <UserCheck className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">ที่ปรึกษา:</span> {group.advisor}
                    </div>
                    <div className="flex items-center text-sm text-gray-600 gap-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">จำนวนนักเรียน:</span> {group.group_count} คน
                    </div>
                </div>

                <div className="flex items-center justify-end mt-6 gap-2 border-t pt-4">
                    <button 
                        onClick={() => handleOpenEdit(group)}
                        className="p-2 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                    >
                        <Pencil className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => handleDelete(group.group_id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal Form */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200 border border-gray-100">
              <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h2 className="text-xl font-bold text-gray-800">
                    {isEditing ? "แก้ไขข้อมูลกลุ่มเรียน" : "เพิ่มกลุ่มเรียนใหม่"}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">รหัสกลุ่มเรียน (ID)</label>
                  <input
                    required
                    type="text"
                    readOnly={isEditing}
                    placeholder="เช่น 663090101"
                    className={`w-full border rounded-lg p-2.5 outline-none transition-shadow ${
                        isEditing ? "bg-gray-100 text-gray-500 cursor-not-allowed" : "focus:ring-2 focus:ring-indigo-500"
                    }`}
                    value={formData.group_id}
                    onChange={(e) => setFormData({ ...formData, group_id: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อกลุ่มเรียน</label>
                  <input
                    required
                    type="text"
                    placeholder="เช่น ปวส.1 เทคโนโลยีสารสนเทศ 1"
                    className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                    value={formData.group_name}
                    onChange={(e) => setFormData({ ...formData, group_name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">จำนวนนักเรียน</label>
                        <input
                            required
                            type="number"
                            min="0"
                            className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                            value={formData.group_count}
                            onChange={(e) => setFormData({ ...formData, group_count: parseInt(e.target.value) })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ปีการศึกษา (ตัวเลือกเสริม)</label>
                        <div className="text-xs text-gray-400 mt-2 italic">อ้างอิงตามกลุ่ม</div>
                    </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">อาจารย์ที่ปรึกษา</label>
                  <input
                    required
                    type="text"
                    placeholder="ระบุชื่อ-นามสกุล อาจารย์"
                    className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                    value={formData.advisor}
                    onChange={(e) => setFormData({ ...formData, advisor: e.target.value })}
                  />
                </div>

                <button
                  type="submit"
                  className={`w-full mt-6 text-white py-3 rounded-xl font-bold shadow-lg transition-all active:scale-95 ${
                      isEditing 
                      ? "bg-amber-500 hover:bg-amber-600 shadow-amber-200" 
                      : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200"
                  }`}
                >
                  {isEditing ? "บันทึกการแก้ไข" : "บันทึกกลุ่มเรียน"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}