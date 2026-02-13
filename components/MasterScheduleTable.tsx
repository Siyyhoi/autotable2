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
    type?: string; // "Lecture", "Practice", "Activity", "Meeting"
}

interface Props {
    schedule: ScheduleItem[];
    slots: Slot[];
    isLoadingData: boolean;
    groupName?: string;
    advisor?: string;
}

export default function MasterScheduleTable({
    schedule,
    slots,
    isLoadingData,
    groupName,
    advisor,
}: Props) {

    const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];

    // Helper to format time (ISO string or HH:mm) -> HH:mm
    const formatTime = (timeStr: string) => {
        if (!timeStr) return "";
        // If it's already HH:mm or H:mm
        if (/^\d{1,2}:\d{2}$/.test(timeStr)) return timeStr;

        try {
            const date = new Date(timeStr);
            if (isNaN(date.getTime())) return timeStr; // Fallback

            // Format to HH:mm (Thai locale usually works, or force 24h)
            return date.toLocaleTimeString('th-TH', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
        } catch (e) {
            return timeStr;
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-blue-50/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-indigo-500" />
                    <div>
                        <h2 className="font-semibold text-gray-700">
                            {groupName || "ตารางเรียนรวม (Master Schedule)"}
                        </h2>
                        {advisor && (
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                <User className="w-3 h-3" />
                                ครูที่ปรึกษา: {advisor}
                            </p>
                        )}
                    </div>
                </div>

                {schedule.length > 0 && (
                    <span className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-medium">
                        {schedule.length} คาบเรียน
                    </span>
                )}
            </div>

            <div className="overflow-x-auto pb-4">
                <table className="w-full min-w-[1000px] border-collapse">
                    <thead>
                        <tr className="bg-gradient-to-r from-gray-100 to-blue-50 text-gray-600 text-sm uppercase tracking-wider">
                            <th className="p-4 w-24 text-center border-r border-gray-200 bg-gray-200/70 sticky left-0 z-10">
                                Day
                            </th>

                            {slots.map((slot) => (
                                <th
                                    key={slot.id}
                                    className="p-3 text-center border-r border-gray-200 last:border-0 min-w-[140px]"
                                >
                                    <div className="font-bold text-gray-800">{slot.label}</div>
                                    <div className="text-[10px] text-gray-500 font-normal mt-0.5 bg-white/50 px-2 py-0.5 rounded-full inline-block">
                                        {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                                    </div>
                                </th>
                            ))}

                            {slots.length === 0 && !isLoadingData && (
                                <th className="p-4 text-center text-red-400 font-normal">
                                    ยังไม่ได้ตั้งค่าเวลาเรียน
                                </th>
                            )}
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                        {days.map((day) => (
                            <tr key={day} className="hover:bg-blue-50/30 transition-colors">
                                <td className="p-4 font-bold text-center text-gray-700 border-r border-gray-200 bg-gray-50 sticky left-0 z-10 shadow-sm">
                                    {day}
                                </td>

                                {slots.map((slot) => {
                                    const subject = schedule.find(
                                        (s) => s.day === day && s.period === slot.id
                                    );

                                    return (
                                        <td
                                            key={slot.id}
                                            className="p-2 border-r border-gray-200 last:border-0 align-top h-32"
                                        >
                                            {subject ? (
                                                <div className={`border-2 p-3 rounded-xl h-full flex flex-col justify-between hover:shadow-lg hover:scale-[1.02] transition-all ${subject.type === "Activity"
                                                    ? "bg-gradient-to-br from-green-50 to-emerald-50 border-green-300"
                                                    : subject.type === "Meeting"
                                                        ? "bg-gradient-to-br from-orange-50 to-amber-50 border-orange-300"
                                                        : "bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200"
                                                    }`}>
                                                    <div>
                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded mb-1 inline-block ${subject.type === "Activity"
                                                            ? "text-green-700 bg-green-100"
                                                            : subject.type === "Meeting"
                                                                ? "text-orange-700 bg-orange-100"
                                                                : "text-indigo-600 bg-indigo-100"
                                                            }`}>
                                                            {subject.subject}
                                                        </span>

                                                        <h3 className="text-xs font-semibold text-gray-900 leading-tight line-clamp-2">
                                                            {subject.subjectName}
                                                        </h3>
                                                    </div>

                                                    <div className="space-y-1 mt-2">
                                                        <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
                                                            <User className={`w-3 h-3 ${subject.type === "Activity" ? "text-green-400" :
                                                                subject.type === "Meeting" ? "text-orange-400" :
                                                                    "text-indigo-400"
                                                                }`} />
                                                            <span className="truncate max-w-[80px]">
                                                                {subject.teacher}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
                                                            <MapPin className={`w-3 h-3 ${subject.type === "Activity" ? "text-green-400" :
                                                                subject.type === "Meeting" ? "text-orange-400" :
                                                                    "text-indigo-400"
                                                                }`} />
                                                            <span>{subject.room}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="h-full flex items-center justify-center border-2 border-dashed border-transparent hover:border-gray-200 rounded-lg transition-colors">
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
