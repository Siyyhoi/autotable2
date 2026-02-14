// lib/excel-processor.ts
import { Db } from 'mongodb';

// ==========================================
// 🧹 Helper Functions
// ==========================================

export const cleanStr = (val: any): string => {
  if (val === undefined || val === null) return "";
  return String(val).trim();
};

export const formatTimeSimple = (timeStr: any) => { 
    if (!timeStr) return null;
    // กรณี Excel เก็บเป็นทศนิยม (Fraction of day)
    if (typeof timeStr === 'number') {
        const totalSeconds = Math.round(timeStr * 86400); 
        return `${String(Math.floor(totalSeconds / 3600)).padStart(2, '0')}:${String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0')}`;
    }
    // กรณีเป็น String "8:00" หรือ "08:00:00"
    const parts = String(timeStr).trim().split(':');
    return parts.length >= 2 ? `${String(parseInt(parts[0])).padStart(2, '0')}:${String(parseInt(parts[1])).padStart(2, '0')}` : String(timeStr);
};

// ฟังก์ชันกรองข้อมูลซ้ำ
export const cleanData = (data: any[], keyGenerator: (row: any) => string) => {
    const seen = new Set();
    const cleaned = [];
    
    for (const row of data) {
        const key = keyGenerator(row);
        if (!key) continue; 
        if (seen.has(key)) continue;

        seen.add(key);
        cleaned.push(row);
    }
    return cleaned;
};

// ==========================================
// 🏗️ Processor Functions (Logic หลัก)
// ==========================================

export async function processStudentGroups(db: Db, data: any[]) {
    // กรองซ้ำด้วย group_id
    const cleaned = cleanData(data, (row) => cleanStr(row.group_id));
    if (!cleaned.length) return 0;

    const ops = cleaned.map((row: any) => ({
        replaceOne: {
            filter: { group_id: cleanStr(row.group_id) },
            replacement: {
                group_id: cleanStr(row.group_id),
                group_name: cleanStr(row.group_name),
                group_count: parseInt(row.student_count || row.group_count || '0'),
                advisor: cleanStr(row.advisor)
            },
            upsert: true
        }
    }));
    
    if (ops.length > 0) await db.collection('StudentGroup').bulkWrite(ops);
    return ops.length;
}

export async function processSubjects(db: Db, data: any[]) {
    const cleaned = cleanData(data, (row) => cleanStr(row.subject_id));
    if (!cleaned.length) return 0;

    const ops = cleaned.map((row: any) => ({
        replaceOne: { 
            filter: { subject_id: cleanStr(row.subject_id) }, 
            replacement: { 
                subject_id: cleanStr(row.subject_id), 
                subject_name: cleanStr(row.subject_name), 
                theory: parseInt(row.theory||'0'), 
                practice: parseInt(row.practice||'0'), 
                credit: parseInt(row.credit||'0') 
            }, 
            upsert: true 
        }
    }));
    if (ops.length) await db.collection('Subject').bulkWrite(ops);
    return ops.length;
}

export async function processTeachers(db: Db, data: any[]) {
    const cleaned = cleanData(data, (row) => cleanStr(row.teacher_id));
    if (!cleaned.length) return 0;

    const ops = cleaned.map((row: any) => ({
        replaceOne: { 
            filter: { teacher_id: cleanStr(row.teacher_id) }, 
            replacement: { 
                teacher_id: cleanStr(row.teacher_id), 
                teacher_name: cleanStr(row.teacher_name), 
                role: cleanStr(row.role) 
            }, 
            upsert: true 
        }
    }));
    if (ops.length) await db.collection('Teacher').bulkWrite(ops);
    return ops.length;
}

export async function processRooms(db: Db, data: any[]) {
    const cleaned = cleanData(data, (row) => cleanStr(row.room_id));
    if (!cleaned.length) return 0;

    const ops = cleaned.map((row: any) => ({
        replaceOne: { 
            filter: { room_id: cleanStr(row.room_id) }, 
            replacement: { 
                room_id: cleanStr(row.room_id), 
                room_name: cleanStr(row.room_name), 
                room_type: cleanStr(row.room_type) 
            }, 
            upsert: true 
        }
    }));
    if (ops.length) await db.collection('Room').bulkWrite(ops);
    return ops.length;
}

export async function processTeachRelations(db: Db, data: any[]) {
    const cleaned = cleanData(data, (row) => `${cleanStr(row.teacher_id)}|${cleanStr(row.subject_id)}`);
    if (!cleaned.length) return 0;

    const ops = cleaned.map((row: any) => ({
        replaceOne: { 
            filter: { teacher_id: cleanStr(row.teacher_id), subject_id: cleanStr(row.subject_id) }, 
            replacement: { 
                teacher_id: cleanStr(row.teacher_id), 
                subject_id: cleanStr(row.subject_id) 
            }, 
            upsert: true 
        }
    }));
    if (ops.length) await db.collection('Teach').bulkWrite(ops);
    return ops.length;
}

export async function processSchedule(db: Db, data: any[], fallbackGroupId?: string) {
     // นี่คือส่วน Import ตารางเรียน (Schedule) ที่คุณขอเพิ่ม
     const cleaned = data.filter(row => row.subject_id || row['รหัสวิชา']); // กรองแถวว่าง
     if (!cleaned.length) return 0;

     // ล้างข้อมูลเก่าของ Group นี้ก่อน (ถ้ามี groupId ระบุ)
     if (fallbackGroupId) {
         await db.collection("Schedule").deleteMany({ group_id: fallbackGroupId });
     }

     const scheduleItems = cleaned.map((row: any) => ({
        group_id: cleanStr(row.group_id) || fallbackGroupId || "unknown",
        subject_id: cleanStr(row['รหัสวิชา'] || row.subject_id),
        subject_name: cleanStr(row['ชื่อวิชา'] || row.subject_name),
        day: cleanStr(row['วัน'] || row.day),
        start_time: formatTimeSimple(row['เวลาเริ่ม'] || row.start_time),
        end_time: formatTimeSimple(row['เวลาสิ้นสุด'] || row.end_time),
        room: cleanStr(row['ห้องเรียน'] || row.room),
        teacher: cleanStr(row['ผู้สอน'] || row.teacher),
        type: cleanStr(row['ประเภท'] || row.type || "Lecture")
     }));

     if (scheduleItems.length > 0) {
        await db.collection("Schedule").insertMany(scheduleItems);
     }
     return scheduleItems.length;
}