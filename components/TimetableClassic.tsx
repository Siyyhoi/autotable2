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

const TIME_SLOTS = [
  "08:00 - 10:00",
  "10:00 - 12:00",
  "13:00 - 15:00",
  "15:00 - 17:00"
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export default function TimetableClassic({ schedule }: { schedule: ScheduleItem[] }) {
  
  const getCellData = (day: string, time: string) => {
    return schedule.find(s => s.day === day && s.time === time);
  };

  return (
    <div className="w-full bg-white p-4 shadow-md rounded-lg border border-gray-300">
      <h2 className="text-xl font-bold text-center mb-4 text-gray-800">📅 ตารางเรียนรวม (Master Schedule)</h2>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-400 min-w-[800px]">
          <thead>
            <tr className="bg-gray-200 text-gray-800">
              <th className="border border-gray-400 p-3 w-32 font-bold">Day / Time</th>
              {TIME_SLOTS.map((slot, index) => (
                <th key={index} className="border border-gray-400 p-3 text-center w-1/4">
                  <div className="font-bold">คาบที่ {index + 1}</div>
                  <div className="text-sm font-normal text-gray-600">{slot}</div>
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
                {TIME_SLOTS.map((slot, index) => {
                  const item = getCellData(day, slot);
                  return (
                    <td key={index} className="border border-gray-400 p-2 text-center align-middle h-24">
                      {item ? (
                        <div className={`p-2 rounded h-full flex flex-col justify-center items-center ${
                          item.type === 'Lecture' ? 'bg-blue-100' : 'bg-orange-100'
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