import React from 'react';

interface ScheduleItem {
  subject: string;
  subjectName: string;
  teacher: string;
  room: string;
  day: string;
  time: string;
  type: string;
}

export default function TimetableClassic({ schedule, slots = [] }: { schedule: any[], slots?: any[] }) {
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

  // ถ้าไม่มี slots ส่งมา ให้ใช้ค่า Default (เพื่อป้องกัน Error)
  const displaySlots = slots.length > 0 ? slots : [
    { id: 1, label: "คาบที่ 1", startTime: "08:00", endTime: "10:00" },
    { id: 2, label: "คาบที่ 2", startTime: "10:00", endTime: "12:00" },
    { id: 3, label: "คาบที่ 3", startTime: "13:00", endTime: "15:00" },
    { id: 4, label: "คาบที่ 4", startTime: "15:00", endTime: "17:00" }
  ];

  const getCellData = (day: string, slotId: number) => {
    return schedule.find(s => s.day === day && (s.period === slotId || s.slotNo === slotId));
  };

  return (
    <div className="w-full bg-white p-4 shadow-md rounded-lg border border-gray-300">
      <h2 className="text-xl font-bold text-center mb-4 text-gray-800">📅 ตารางเรียนรวม (Master Schedule)</h2>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-400 min-w-[800px]">
          <thead>
            <tr className="bg-gray-200 text-gray-800">
              <th className="border border-gray-400 p-3 w-32 font-bold">Day / Time</th>
              {displaySlots.map((slot, index) => (
                <th key={index} className="border border-gray-400 p-3 text-center w-1/4">
                  <div className="font-bold">{slot.label}</div>
                  <div className="text-sm font-normal text-gray-600">{slot.startTime} - {slot.endTime}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map(day => (
              <tr key={day} className="hover:bg-gray-50">
                {/* ช่องวัน */}
                <td className="border border-gray-400 p-3 bg-gray-100 font-bold text-center text-lg">
                  {day}
                </td>

                {/* ช่องตารางเรียน */}
                {displaySlots.map((slot, index) => {
                  const item = getCellData(day, slot.id);
                  return (
                    <td key={index} className="border border-gray-400 p-2 text-center align-middle h-24">
                      {item ? (
                        <div className={`p-2 rounded h-full flex flex-col justify-center items-center ${item.type === 'Lecture' ? 'bg-blue-100' : 'bg-orange-100'
                          }`}>
                          <div className="font-bold text-gray-900 text-sm">{item.subjectName}</div>
                          <div className="text-xs text-gray-600 mt-1">{item.teacher}</div>
                          <div className="text-xs font-bold text-gray-800 mt-1 bg-white/60 px-2 rounded-full border border-gray-300">
                            {item.room}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}