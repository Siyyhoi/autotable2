"use client";

import { useMemo } from "react";
import { Calendar, User, MapPin, Clock } from "lucide-react";

// 1. กำหนด Type ให้ตรงกับ Prisma Model
interface SchoolConfig {
  schoolName: string;
  startTime: string;      // "08:00"
  endTime: string;        // "16:00"
  periodDuration: number; // 50
}

interface ScheduleTableProps {
  schedule: any[];        // ข้อมูลตารางเรียนจาก AI
  config: SchoolConfig | null; // รับ Config แทน Slots
  slots?: any[];          // รับ Slots จาก Database (Optional เพราะอาจจะยังใช้ Config เดิมอยู่)
  loading: boolean;
}

// Helper: แปลง "08:30" เป็นนาที (int)
const timeToMinutes = (timeStr: string) => {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
};

// Helper: แปลงนาที (int) กลับเป็น "08:30"
const minutesToTime = (totalMinutes: number) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}`;
};

export default function ScheduleTable({ schedule, config, slots = [], loading }: ScheduleTableProps) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];

  // 2. คำนวณ Slots อัตโนมัติตาม Config (ถ้าไม่มี slots จาก DB)
  const displaySlots = useMemo(() => {
    // ถ้ามี slots จาก DB ให้ใช้เลย
    if (slots && slots.length > 0) return slots;

    // ถ้าไม่มีให้ Generate จาก Config
    if (!config) return [];

    const generated = [];
    let current = timeToMinutes(config.startTime);
    const end = timeToMinutes(config.endTime);
    let slotNo = 1;

    while (current + config.periodDuration <= end) {
      const startTime = minutesToTime(current);
      const endTime = minutesToTime(current + config.periodDuration);

      generated.push({
        id: slotNo,
        slotNo: slotNo,
        startTime,
        endTime,
        label: `คาบที่ ${slotNo}`,
      });

      current += config.periodDuration;
      slotNo++;
    }

    return generated;
  }, [config, slots]);

  // ฟังก์ชันหาว่าคาบนี้เรียนวิชาอะไร
  const getClass = (day: string, slotId: number) => {
    // เทียบ id context
    // ถ้าเป็น DB slot -> id คือ period
    // ถ้าเป็น Generated -> id คือ slotNo
    // โครงสร้าง schedule ควรมี field ที่ตรงกัน
    return schedule.find((s) => s.day === day && (s.period === slotId || s.slotNo === slotId));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
      {/* Header ของ Card */}
      <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
        <div className="flex flex-col">
          <h2 className="font-semibold text-gray-700 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-500" />
            ตารางเรียนรวม (Master Schedule)
          </h2>
          {config && (
            <span className="text-xs text-gray-500 ml-7 mt-1">
              {config.schoolName} ({config.startTime} - {config.endTime} • คาบละ {config.periodDuration} นาที)
            </span>
          )}
        </div>

        {loading && (
          <span className="text-xs text-gray-400 animate-pulse flex items-center gap-1">
            <Clock className="w-3 h-3" /> กำลังประมวลผล...
          </span>
        )}
      </div>

      {/* ตัวตาราง */}
      <div className="overflow-x-auto pb-4 flex-1">
        <table className="w-full min-w-[1000px] border-collapse">
          <thead>
            <tr className="bg-gray-100 text-gray-600 text-sm uppercase tracking-wider">
              <th className="p-4 w-24 text-center border-r border-gray-200 bg-gray-200/50 sticky left-0 z-10">
                Day
              </th>

              {/* Loop สร้างหัวตารางจาก displaySlots */}
              {displaySlots.map((slot: any) => (
                <th
                  key={slot.id}
                  className="p-3 text-center border-r border-gray-200 last:border-0 min-w-[140px]"
                >
                  <div className="font-bold text-gray-800">{slot.label}</div>
                  <div className="text-[10px] text-gray-500 font-normal mt-0.5 bg-white/50 px-2 py-0.5 rounded-full inline-block">
                    {slot.startTime} - {slot.endTime}
                  </div>
                </th>
              ))}

              {/* กรณีไม่มี Config หรือ Generate ไม่ได้ */}
              {displaySlots.length === 0 && !loading && (
                <th className="p-4 text-center text-red-400 font-normal">
                  ไม่พบการตั้งค่าเวลาเรียน (School Config)
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {days.map((day) => (
              <tr key={day} className="hover:bg-gray-50/50 transition-colors">
                <td className="p-4 font-bold text-center text-gray-700 border-r border-gray-200 bg-gray-50 sticky left-0 z-10 shadow-sm">
                  {day}
                </td>

                {/* Loop สร้างช่องตาราง */}
                {displaySlots.map((slot: any) => {
                  const subject = getClass(day, slot.id); // ใช้ id หาข้อมูล
                  return (
                    <td
                      key={`${day}-${slot.id}`}
                      className="p-2 border-r border-gray-200 last:border-0 align-top h-32"
                    >
                      {subject ? (
                        <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-lg h-full flex flex-col justify-between hover:shadow-md transition-all cursor-default group relative animate-in fade-in zoom-in duration-300 hover:-translate-y-1">
                          <div>
                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded mb-1 inline-block">
                              {subject.subject}
                            </span>
                            <h3
                              className="text-xs font-semibold text-gray-900 leading-tight line-clamp-2"
                              title={subject.subjectName}
                            >
                              {subject.subjectName}
                            </h3>
                          </div>
                          <div className="space-y-1 mt-2">
                            <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
                              <User className="w-3 h-3 text-indigo-400" />
                              <span className="truncate max-w-[80px]">
                                {subject.teacher}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
                              <MapPin className="w-3 h-3 text-indigo-400" />
                              <span>{subject.room}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center border-2 border-dashed border-transparent hover:border-gray-100 rounded-lg transition-colors">
                          <span className="text-gray-200 text-xl font-light select-none">
                            -
                          </span>
                        </div>
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