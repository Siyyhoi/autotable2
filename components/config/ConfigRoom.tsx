"use client";

import { useState, useEffect } from "react";
import { Plus, School, Users, X, Monitor, BookOpen, ChevronLeft, Trash2, Pencil } from "lucide-react";

interface ConfigRoomProps {
  onClose: () => void;
}

export default function ConfigRoom({ onClose }: ConfigRoomProps) {
  interface Room {
    id: string;
    name: string;
    type: string;
    capacity: number;
  }

  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // ✅ State สำหรับเช็คว่ากำลังแก้ไขอยู่หรือไม่
  const [isEditing, setIsEditing] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    type: "Lecture",
    capacity: 40,
  });

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const res = await fetch("/api/config/room");
      if (res.ok) {
        const data = await res.json();
        setRooms(data);
      }
    } catch (error) {
      console.error("Error fetching rooms:", error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ ฟังก์ชันเปิด Modal สำหรับการ "เพิ่ม" (Reset Form)
  const handleOpenAdd = () => {
    setIsEditing(false);
    setFormData({ id: "", name: "", type: "Lecture", capacity: 40 });
    setIsModalOpen(true);
  };

  // ✅ ฟังก์ชันเปิด Modal สำหรับการ "แก้ไข" (Load Data)
  const handleOpenEdit = (room: Room) => {
    setIsEditing(true);
    setFormData({
      id: room.id,
      name: room.name,
      type: room.type,
      capacity: room.capacity,
    });
    setIsModalOpen(true);
  };

  // ✅ ฟังก์ชันลบห้อง
  const handleDelete = async (id: string) => {
    if (!confirm(`คุณต้องการลบห้อง ${id} ใช่หรือไม่?`)) return;

    try {
      // ส่ง id ไปทาง Query Params (หรือจะเปลี่ยนเป็น Body ก็ได้ตาม API ของคุณ)
      const res = await fetch(`/api/config/room?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "ลบไม่สำเร็จ");
        return;
      }

      alert("ลบห้องเรียบร้อย!");
      fetchRooms(); // โหลดข้อมูลใหม่
    } catch (error) {
      alert("เกิดข้อผิดพลาดในการลบ");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // ✅ เช็ค method ว่าจะเป็น POST (เพิ่ม) หรือ PUT (แก้ไข)
      const method = isEditing ? "PUT" : "POST";
      
      const res = await fetch("/api/config/room", {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error);
        return;
      }

      alert(isEditing ? "แก้ไขข้อมูลเรียบร้อย!" : "เพิ่มห้องเรียบร้อย!");
      setIsModalOpen(false);
      fetchRooms();
    } catch (error) {
      alert("เกิดข้อผิดพลาด");
    }
  };

  const getIcon = (type: string) => {
    if (type === "Lab" || type === "Computer") return <Monitor className="w-5 h-5 text-blue-500" />;
    return <BookOpen className="w-5 h-5 text-indigo-500" />;
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
              <School className="w-8 h-8 text-indigo-600" />
              จัดการห้องเรียน
            </h1>
          </div>
          
          <div className="flex gap-3">
             <button
                onClick={handleOpenAdd} // ✅ ใช้ handleOpenAdd แทน
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-md transition-all active:scale-95"
             >
            <Plus className="w-5 h-5" />
            เพิ่มห้องเรียน
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pb-20">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-lg transition-all relative overflow-hidden group"
              >
                {/* Decoration */}
                <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-50 rounded-bl-full -mr-8 -mt-8 transition-all group-hover:bg-indigo-100"></div>
                
                {/* Header Card */}
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">
                    {room.id}
                  </div>
                  {getIcon(room.type)}
                </div>

                {/* Content */}
                <h3 className="text-lg font-bold text-gray-800 mb-1">{room.name}</h3>
                <p className="text-sm text-gray-500 mb-4">{room.type} Room</p>

                <div className="flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-2 text-gray-600 text-sm bg-gray-50 p-2 rounded-lg border border-gray-100">
                        <Users className="w-4 h-4 text-indigo-400" />
                        <span className="font-semibold text-gray-900">{room.capacity}</span>
                    </div>

                    {/* ✅ Action Buttons (Edit & Delete) */}
                    <div className="flex gap-2">
                        <button 
                            onClick={() => handleOpenEdit(room)}
                            className="p-2 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                            title="แก้ไข"
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => handleDelete(room.id)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="ลบ"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
              </div>
            ))}
            
            {!loading && rooms.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                    <School className="w-12 h-12 mb-3 opacity-20" />
                    <p>ยังไม่มีข้อมูลห้องเรียน</p>
                    <button onClick={handleOpenAdd} className="text-indigo-500 hover:underline mt-2 text-sm">
                        + เพิ่มห้องแรกเลย
                    </button>
                </div>
            )}
          </div>
        )}

        {/* Modal Form */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200 border border-gray-100">
              <div className="flex justify-between items-center mb-6 border-b pb-4">
                {/* ✅ เปลี่ยน Title ตามสถานะ */}
                <h2 className="text-xl font-bold text-gray-800">
                    {isEditing ? "แก้ไขข้อมูลห้องเรียน" : "เพิ่มห้องเรียนใหม่"}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">รหัสห้อง (ID)</label>
                  <input
                    required
                    type="text"
                    // ✅ ถ้าแก้ไข ห้ามแก้ ID (ReadOnly)
                    readOnly={isEditing}
                    placeholder="เช่น R001, 101"
                    className={`w-full border rounded-lg p-2.5 outline-none transition-shadow ${
                        isEditing ? "bg-gray-100 text-gray-500 cursor-not-allowed" : "focus:ring-2 focus:ring-indigo-500"
                    }`}
                    value={formData.id}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อห้อง</label>
                  <input
                    required
                    type="text"
                    placeholder="เช่น ห้องบรรยาย 1, Lab Com 2"
                    className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ประเภท</label>
                    <select
                      className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none bg-white transition-shadow"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    >
                      <option value="Lecture">Lecture</option>
                      <option value="Lab">Lab</option>
                      <option value="Computer">Computer</option>
                      <option value="Auditorium">Auditorium</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ความจุ (คน)</label>
                    <input
                      required
                      type="number"
                      min="1"
                      className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className={`w-full mt-6 text-white py-3 rounded-xl font-bold shadow-lg transition-all active:scale-95 ${
                      isEditing 
                      ? "bg-amber-500 hover:bg-amber-600 shadow-amber-200" 
                      : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200"
                  }`}
                >
                  {isEditing ? "บันทึกการแก้ไข" : "บันทึกห้องเรียน"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}