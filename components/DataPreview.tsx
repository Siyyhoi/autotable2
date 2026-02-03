import React, { useState } from 'react';

export default function DataPreview({ subjects, teachers, rooms }: any) {
  const [isOpen, setIsOpen] = useState(true); // เปิดค้างไว้เลย

  return (
    <div className="bg-white border border-gray-300 rounded-lg shadow-sm mb-6 overflow-hidden">
      <div 
        className="bg-gray-100 px-4 py-3 border-b border-gray-300 flex justify-between items-center cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="font-bold text-gray-700">⚙️ ข้อมูลตั้งต้น (Config Data)</h3>
        <span className="text-sm text-gray-500">{isOpen ? '▼ ซ่อน' : '▲ แสดง'}</span>
      </div>

      {isOpen && (
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* 1. รายวิชา */}
          <div>
            <h4 className="font-bold text-blue-700 border-b-2 border-blue-200 mb-2 pb-1">
              📚 วิชา ({subjects?.length || 0})
            </h4>
            <div className="max-h-40 overflow-y-auto text-sm text-gray-600 space-y-1 pr-2 bg-gray-50 p-2 rounded border">
              {subjects?.map((s:any) => (
                <div key={s.id} className="truncate">
                  <span className="font-mono text-gray-400">{s.id}</span> {s.nameTH}
                </div>
              ))}
            </div>
          </div>

          {/* 2. อาจารย์ */}
          <div>
            <h4 className="font-bold text-green-700 border-b-2 border-green-200 mb-2 pb-1">
              👨‍🏫 อาจารย์ ({teachers?.length || 0})
            </h4>
            <div className="max-h-40 overflow-y-auto text-sm text-gray-600 space-y-1 pr-2 bg-gray-50 p-2 rounded border">
              {teachers?.map((t:any) => (
                <div key={t.id} className="truncate">
                  {t.fullName}
                </div>
              ))}
            </div>
          </div>

          {/* 3. ห้องเรียน */}
          <div>
            <h4 className="font-bold text-purple-700 border-b-2 border-purple-200 mb-2 pb-1">
              🏫 ห้อง ({rooms?.length || 0})
            </h4>
            <div className="max-h-40 overflow-y-auto text-sm text-gray-600 space-y-1 pr-2 bg-gray-50 p-2 rounded border">
              {rooms?.map((r:any) => (
                <div key={r.id} className="truncate">
                  {r.name} <span className="text-xs text-gray-400">({r.type})</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}