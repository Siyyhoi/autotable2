"use client";

import { Calendar, User, MapPin } from "lucide-react";

interface Slot {
  id: number;
  label: string;
  startTime: string;
  endTime: string;
}

interface ScheduleItem {
  day: string;
  period: number;
  subject: string;
  subjectName: string;
  teacher: string;
  room: string;
  type?: string;
}

interface Props {
  schedule: ScheduleItem[];
  slots: Slot[];
  isLoadingData: boolean;
  groupName?: string;
  advisor?: string;
  failedTasks?: { subject_name: string; reason: string }[];
}

export default function MasterScheduleTable({
  schedule,
  slots,
  isLoadingData,
  groupName,
  advisor,
  failedTasks,
}: Props) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];

  const formatTime = (timeStr: string) => {
    if (!timeStr) return "";
    if (/^\d{1,2}:\d{2}$/.test(timeStr)) return timeStr;
    try {
      const date = new Date(timeStr);
      if (isNaN(date.getTime())) return timeStr;
      return date.toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } catch (e) {
      return timeStr;
    }
  };

  const getSubject = (day: string, period: number) => {
    return schedule.find((s) => s.day === day && s.period === period);
  };

  const isSameSubject = (s1: ScheduleItem, s2: ScheduleItem | undefined) => {
    if (!s2) return false;
    return (
      s1.subject === s2.subject &&
      s1.teacher === s2.teacher &&
      s1.room === s2.room
    );
  };

  const renderRowCells = (day: string) => {
    const cells = [];
    let i = 0;

    while (i < slots.length) {
      const currentSlot = slots[i];
      const subject = getSubject(day, currentSlot.id);

      if (!subject) {
        cells.push(
          <td
            key={`${day}-${currentSlot.id}`}
            className="border border-gray-300 p-2 h-24 align-middle text-center bg-white hover:bg-gray-50 transition-colors"
          >
          </td>
        );
        i++;
      } else {
        let duration = 1;
        for (let j = i + 1; j < slots.length; j++) {
          const nextSlot = slots[j];
          const nextSubject = getSubject(day, nextSlot.id);
          if (isSameSubject(subject, nextSubject)) {
            duration++;
          } else {
            break;
          }
        }

        // เช็คประเภทเพื่อเลือกสีและข้อความของป้าย Tag
        const isActivity = subject.type === "Activity";
        const isMeeting = subject.type === "Meeting";
        const showTag = isActivity || isMeeting; // แสดงเฉพาะถ้าเป็น กิจกรรม หรือ ประชุม

        cells.push(
          <td
            key={`${day}-${currentSlot.id}`}
            colSpan={duration}
            className="border border-gray-300 p-0 h-24 align-middle relative group bg-white hover:bg-gray-50 transition-colors"
          >
            <div className="w-full h-full flex flex-col justify-between p-2 text-center relative">
              
              {/* ป้าย Tag (แสดงเฉพาะ Activity หรือ Meeting) */}
              {showTag && (
                <div
                  className={`absolute top-0 right-0 px-2 py-0.5 text-[10px] font-bold text-white rounded-bl-md shadow-sm z-10
                  ${isActivity ? "bg-green-500" : "bg-orange-500"}`}
                >
                  {isActivity ? "กิจกรรม" : "ประชุม"}
                </div>
              )}

              {/* รหัสวิชา */}
              <div className="text-xs font-bold text-black mb-1 mt-1">
                {subject.subject}
              </div>

              {/* ชื่อวิชา */}
              <div className="text-sm text-gray-800 font-medium leading-tight line-clamp-2 px-1">
                {subject.subjectName}
              </div>

              {/* ครูและห้อง */}
              <div className="mt-auto flex items-center justify-between w-full text-[10px] text-gray-600 border-t border-gray-100 pt-1.5">
                <div className="flex items-center gap-1 overflow-hidden">
                  <User className="w-3 h-3 text-gray-400 shrink-0" />
                  <span className="truncate text-left">{subject.teacher}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-1">
                   <span className="font-semibold bg-gray-100 px-1 rounded">
                     {subject.room}
                   </span>
                </div>
              </div>
            </div>
          </td>
        );

        i += duration;
      }
    }
    return cells;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-300 overflow-hidden text-gray-900 font-sans">
      <div className="p-4 border-b border-gray-300 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-indigo-600" />
          <div>
            <h2 className="font-bold text-lg text-gray-800">
              {groupName || "ตารางเรียนรวม (Master Schedule)"}
            </h2>
            {advisor && (
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                <User className="w-3 h-3" />
                ครูที่ปรึกษา: {advisor}
              </p>
            )}
          </div>
        </div>
        {schedule.length > 0 && (
          <span className="text-xs font-medium bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-100">
            {schedule.length} คาบเรียน
          </span>
        )}
      </div>

      {failedTasks && failedTasks.length > 0 && (
        <div className="m-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md flex flex-col gap-1">
          <strong className="flex items-center gap-2">
             ⚠️ พบปัญหาการจัดตาราง {failedTasks.length} รายการ
          </strong>
          <ul className="list-disc pl-8 mt-1 text-xs">
            {failedTasks.map((fail, idx) => (
              <li key={idx}>
                <span className="font-semibold">{fail.subject_name}:</span> {fail.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-x-auto p-4 pt-0">
        <table className="w-full min-w-[1000px] border-collapse border border-gray-300 mt-4 shadow-sm">
          <thead>
            <tr className="bg-gray-100 text-gray-600 text-xs uppercase tracking-wider">
              <th className="p-3 w-24 border border-gray-300 sticky left-0 z-20 bg-gray-100 shadow-[1px_0_3px_rgba(0,0,0,0.05)]">
                วัน / เวลา
              </th>
              {slots.map((slot) => (
                <th
                  key={slot.id}
                  className="p-2 border border-gray-300 min-w-[100px] text-center h-16"
                >
                  <div className="font-bold text-gray-800">{slot.label}</div>
                  <div className="text-[10px] text-gray-500 mt-1">
                    {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {days.map((day) => (
              <tr key={day}>
                <td className="p-2 font-bold text-center border border-gray-300 bg-gray-50 text-gray-700 sticky left-0 z-10 shadow-[1px_0_3px_rgba(0,0,0,0.05)]">
                  {day}
                </td>
                {renderRowCells(day)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}