"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  MapPin,
  X,
  ChevronLeft,
  Trash2,
  Pencil,
  Search,
  Monitor,
  Box,
  Save,
} from "lucide-react";

interface ConfigRoomProps {
  onClose: () => void;
}

interface Room {
  room_id: string;
  room_name: string;
  capacity: number;
  type: string;
}

export default function ConfigRoom({ onClose }: ConfigRoomProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    room_id: "",
    room_name: "",
    capacity: 40,
    type: "Lecture",
  });

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/config/room");
      if (res.ok) setRooms((await res.json()) as Room[]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = rooms.filter(
    (r) =>
      r.room_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.room_id.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleOpenAdd = () => {
    setIsEditing(false);
    setFormData({ room_id: "", room_name: "", capacity: 40, type: "Lecture" });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (r: Room) => {
    setIsEditing(true);
    setFormData(r);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(`ยืนยันลบห้อง ${id}?`)) return;
    await fetch(`/api/config/room?id=${id}`, { method: "DELETE" });
    fetchRooms();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/config/room", {
      method: isEditing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    if (!res.ok) return window.alert("เกิดข้อผิดพลาด");
    setIsModalOpen(false);
    fetchRooms();
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
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <MapPin className="w-6 md:w-7 h-6 md:h-7 text-rose-600" />{" "}
                  จัดการห้องเรียน
                </h1>
                <p className="text-slate-500 text-sm">
                  จำนวน {rooms.length} ห้อง
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative group flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาห้อง..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSearchTerm(e.target.value)
                  }
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-100"
                />
              </div>
              <button
                onClick={handleOpenAdd}
                className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-rose-200 whitespace-nowrap"
              >
                <Plus className="w-5 h-5" /> เพิ่มห้องเรียน
              </button>
            </div>
          </div>

          {/* Grid */}
          <div className="flex-1 p-4 md:p-6 bg-slate-50/50 overflow-y-auto">
            {loading ? (
              <div className="text-center py-20 text-slate-400">Loading...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filtered.map((r) => (
                  <div
                    key={r.room_id}
                    className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-xl hover:border-rose-200 transition-all relative overflow-hidden group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span
                        className={`px-2 py-1 text-xs font-bold rounded uppercase ${r.type === "Lab" ? "bg-purple-100 text-purple-600" : "bg-orange-100 text-orange-600"}`}
                      >
                        {r.type}
                      </span>
                      <div className="text-right">
                        <span className="text-xl font-bold text-slate-700">
                          {r.capacity}
                        </span>
                        <span className="text-[10px] text-slate-400 block uppercase">
                          Seats
                        </span>
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-4">
                      {r.room_name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
                      {r.type === "Lab" ? (
                        <Monitor className="w-4 h-4" />
                      ) : (
                        <Box className="w-4 h-4" />
                      )}
                      ID: {r.room_id}
                    </div>

                    <div className="flex gap-2 pt-3 border-t border-slate-100 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenEdit(r)}
                        className="flex-1 py-1.5 flex items-center justify-center gap-1.5 text-xs font-medium bg-amber-50 text-amber-600 rounded hover:bg-amber-100"
                      >
                        <Pencil className="w-3.5 h-3.5" /> แก้ไข
                      </button>
                      <button
                        onClick={() => handleDelete(r.room_id)}
                        className="flex-1 py-1.5 flex items-center justify-center gap-1.5 text-xs font-medium bg-red-50 text-red-600 rounded hover:bg-red-100"
                      >
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
              <h2 className="text-lg font-bold text-slate-800">
                {isEditing ? "แก้ไขข้อมูล" : "เพิ่มห้องเรียนใหม่"}
              </h2>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500">
                  รหัสห้อง
                </label>
                <input
                  required
                  readOnly={isEditing}
                  value={formData.room_id}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, room_id: e.target.value })
                  }
                  className={`w-full p-2 border rounded-lg ${isEditing ? "bg-slate-100" : ""}`}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">
                  ชื่อห้อง
                </label>
                <input
                  required
                  value={formData.room_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, room_name: e.target.value })
                  }
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">
                  ประเภทห้อง
                </label>
                <select
                  value={formData.type}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setFormData({ ...formData, type: e.target.value })
                  }
                  className="w-full p-2 border rounded-lg bg-white"
                >
                  <option value="Lecture">Lecture (ทฤษฎี)</option>
                  <option value="Lab">Lab (ปฏิบัติ)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">
                  ความจุ (ที่นั่ง)
                </label>
                <input
                  type="number"
                  required
                  value={formData.capacity}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({
                      ...formData,
                      capacity: Number(e.target.value),
                    })
                  }
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 mt-2"
              >
                บันทึกข้อมูล
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
