"use client";

import { useState, useEffect } from "react";
import { X, Save, Settings } from "lucide-react";

export default function ConfigModal({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    schoolName: "",
    startTime: "08:00",
    endTime: "16:00",
    periodDuration: 60, // นาที
  });

  // โหลดค่าเดิมเมื่อเปิด Modal
  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        if (data.schoolName) setConfig(data);
      });
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/config/school", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        alert("บันทึกข้อมูลเรียบร้อย! ระบบคำนวณคาบเรียนใหม่ให้แล้ว");
        onClose();
        window.location.reload(); // รีเฟรชหน้าจอเพื่ออัปเดตตาราง
      }
    } catch (error) {
      alert("บันทึกไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Settings className="w-6 h-6 text-indigo-600" />
            ตั้งค่าโรงเรียน
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full text-gray-500">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อโรงเรียน</label>
            <input
              type="text"
              className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
              value={config.schoolName}
              onChange={(e) => setConfig({ ...config, schoolName: e.target.value })}
              placeholder="เช่น โรงเรียนมัธยมวัดหนองจอก"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">เวลาเริ่มเรียน</label>
              <input
                type="time"
                className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                value={config.startTime}
                onChange={(e) => setConfig({ ...config, startTime: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">เวลาเลิกเรียน</label>
              <input
                type="time"
                className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                value={config.endTime}
                onChange={(e) => setConfig({ ...config, endTime: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ระยะเวลาต่อคาบ (นาที)</label>
            <div className="flex items-center gap-4">
                <input
                type="range"
                min="30"
                max="120"
                step="10"
                className="flex-1 accent-indigo-600"
                value={config.periodDuration}
                onChange={(e) => setConfig({ ...config, periodDuration: Number(e.target.value) })}
                />
                <span className="font-bold text-indigo-600 w-16 text-right">{config.periodDuration} นาที</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full mt-8 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-semibold shadow-lg shadow-indigo-200 transition-all flex justify-center items-center gap-2"
        >
          {loading ? "กำลังบันทึก..." : <><Save className="w-5 h-5" /> บันทึกการตั้งค่า</>}
        </button>
      </div>
    </div>
  );
}