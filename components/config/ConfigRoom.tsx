"use client";

import { useState, useEffect } from "react";
import { Plus, School, X, Monitor, BookOpen, ChevronLeft, Trash2, Pencil } from "lucide-react";

interface ConfigRoomProps {
  onClose: () => void;
}

export default function ConfigRoom({ onClose }: ConfigRoomProps) {
  // ✅ 1. Interface ตรงกับ Prisma Model: Room
  interface Room {
    room_id: string;
    room_name: string;
    room_type: string;
  }

  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // ✅ 2. Form Data ตรงกับ API
  const [formData, setFormData] = useState({
    room_id: "",
    room_name: "",
    room_type: "Lecture",
  });

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const res = await fetch("/api/teachers/room"); // ตรวจสอบ path api ให้ถูกนะครับ (น่าจะเป็น /api/rooms หรือที่ตั้งไว้)
      // สมมติว่า path คือ /api/rooms ตามบริบทก่อนหน้า
      // ถ้าคุณรวมไว้ใน config/room ให้แก้ path ตรงนี้
      const resReal = await fetch("/api/config/room"); 
      
      if (resReal.ok) {
        const data = await resReal.json();
        setRooms(data);
      }
    } catch (error) {
      console.error("Error fetching rooms:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setIsEditing(false);
    setFormData({ room_id: "", room_name: "", room_type: "Lecture" });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (room: Room) => {
    setIsEditing(true);
    setFormData({
      room_id: room.room_id,
      room_name: room.room_name,
      room_type: room.room_type,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`คุณต้องการลบห้อง ${id} ใช่หรือไม่?`)) return;

    try {
      const res = await fetch(`/api/config/room?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "ลบไม่สำเร็จ");
        return;
      }

      alert("ลบห้องเรียบร้อย!");
      fetchRooms();
    } catch (error) {
      alert("เกิดข้อผิดพลาดในการลบ");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
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
                onClick={handleOpenAdd}
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
                key={room.room_id}
                className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-lg transition-all relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-50 rounded-bl-full -mr-8 -mt-8 transition-all group-hover:bg-indigo-100"></div>
                
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">
                    {room.room_id}
                  </div>
                  {getIcon(room.room_type)}
                </div>

                <h3 className="text-lg font-bold text-gray-800 mb-1">{room.room_name}</h3>
                <p className="text-sm text-gray-500 mb-4">{room.room_type} Room</p>

                <div className="flex items-center justify-end mt-auto gap-2">
                    <button 
                        onClick={() => handleOpenEdit(room)}
                        className="p-2 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                    >
                        <Pencil className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => handleDelete(room.room_id)}
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
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200 border border-gray-100">
              <div className="flex justify-between items-center mb-6 border-b pb-4">
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
                    readOnly={isEditing}
                    placeholder="เช่น R001, 101"
                    className={`w-full border rounded-lg p-2.5 outline-none transition-shadow ${
                        isEditing ? "bg-gray-100 text-gray-500 cursor-not-allowed" : "focus:ring-2 focus:ring-indigo-500"
                    }`}
                    value={formData.room_id}
                    onChange={(e) => setFormData({ ...formData, room_id: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อห้อง</label>
                  <input
                    required
                    type="text"
                    placeholder="เช่น ห้องบรรยาย 1"
                    className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                    value={formData.room_name}
                    onChange={(e) => setFormData({ ...formData, room_name: e.target.value })}
                  />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ประเภท</label>
                    <select
                      className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none bg-white transition-shadow"
                      value={formData.room_type}
                      onChange={(e) => setFormData({ ...formData, room_type: e.target.value })}
                    >
                      <option value="Lecture">Lecture</option>
                      <option value="Lab">Lab</option>
                      <option value="Computer">Computer</option>
                      <option value="Auditorium">Auditorium</option>
                    </select>
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