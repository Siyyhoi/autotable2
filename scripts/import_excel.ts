import { MongoClient } from 'mongodb';
import * as xlsx from 'xlsx';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const uri = process.env.DATABASE_URL;
if (!uri) {
  console.error("❌ ไม่พบ DATABASE_URL ในไฟล์ .env");
  process.exit(1);
}

const client = new MongoClient(uri);

// ฟังก์ชันช่วยอ่าน Sheet จาก Excel แปลงเป็น JSON
const readSheet = (workbook: xlsx.WorkBook, sheetName: string): any[] => {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    console.warn(`⚠️ ไม่พบ Sheet ชื่อ "${sheetName}" ในไฟล์ Excel (ข้าม)`);
    return [];
  }
  return xlsx.utils.sheet_to_json(sheet);
};

async function run() {
  try {
    // 1. เชื่อมต่อ MongoDB
    await client.connect();
    console.log("🔌 เชื่อมต่อ MongoDB สำเร็จ!");
    const db = client.db("autotable");

    // 2. อ่านไฟล์ Excel
    const filePath = path.join(__dirname, '../data/data.xlsx'); // 👈 ชื่อไฟล์ Excel ที่คุณวางไว้
    if (!fs.existsSync(filePath)) {
      throw new Error(`หาไฟล์ Excel ไม่เจอที่: ${filePath}`);
    }
    
    console.log(`📂 กำลังอ่านไฟล์ Excel: ${filePath}`);
    const workbook = xlsx.readFile(filePath);

    // --- Import 1: Timeslots ---
    const timeslots = readSheet(workbook, 'timeslots'); // 👈 แก้ชื่อ Sheet ให้ตรงกับใน Excel
    if (timeslots.length > 0) {
      const docs = timeslots.map((t: any) => ({
        day: t.day,
        slotNo: parseInt(t.slot),
        startTime: t.start_time,
        endTime: t.end_time,
        key: `${t.day}_${t.slot}`
      }));
      await db.collection('Timeslot').deleteMany({});
      await db.collection('Timeslot').insertMany(docs);
      console.log(`✅ Timeslots: ${docs.length} รายการ`);
    }

    // --- Import 2: Rooms ---
    const rooms = readSheet(workbook, 'rooms');
    if (rooms.length > 0) {
      const ops = rooms.map((r: any) => ({
        replaceOne: {
          filter: { _id: r.room_id },
          replacement: {
            _id: r.room_id,
            id: r.room_id,
            name: r.room_name,
            type: r.room_type,
            capacity: parseInt(r.capacity)
          },
          upsert: true
        }
      }));
      await db.collection('Room').bulkWrite(ops);
      console.log(`✅ Rooms: ${rooms.length} ห้อง`);
    }

    // --- Import 3: Subjects ---
    const subjects = readSheet(workbook, 'subjects');
    if (subjects.length > 0) {
      const ops = subjects.map((s: any) => {
        const sId = s.subject_id;
        const year = parseInt(String(sId).replace('S', '')) <= 10 ? 1 : 
                     parseInt(String(sId).replace('S', '')) <= 20 ? 2 : 3;
        return {
          replaceOne: {
            filter: { _id: s.subject_id },
            replacement: {
              _id: s.subject_id,
              id: s.subject_id,
              nameTH: s.subject_name_th,
              nameEN: s.subject_name_en,
              lectureHours: parseInt(s.lecture_hours),
              labHours: parseInt(s.lab_hours),
              totalHours: parseInt(s.total_hours),
              recommendedYear: year,
              // เช็คค่า Excel: บางทีมาเป็นเลข 1, บางทีเป็น String '1'
              reqComputer: s['Computer Lab'] == 1, 
              reqNetwork: s['Network Lab'] == 1,
              reqBusiness: s['Business Lab'] == 1
            },
            upsert: true
          }
        };
      });
      await db.collection('Subject').bulkWrite(ops);
      console.log(`✅ Subjects: ${subjects.length} วิชา`);
    }

    // --- Import 4: Teachers ---
    const teachers = readSheet(workbook, 'teachers');
    if (teachers.length > 0) {
      const ops = teachers.map((t: any) => ({
        replaceOne: {
          filter: { _id: t.teacher_id },
          replacement: {
            _id: t.teacher_id,
            id: t.teacher_id,
            fullName: t.full_name,
            maxHours: parseInt(t.max_hours_per_week),
            unavailable: t.unavailable_times === 'None' ? null : t.unavailable_times
          },
          upsert: true
        }
      }));
      await db.collection('Teacher').bulkWrite(ops);
      console.log(`✅ Teachers: ${teachers.length} คน`);
    }

    // --- Import 5: SubjectTeacher ---
    const subTeachers = readSheet(workbook, 'sub_teachers');
    if (subTeachers.length > 0) {
      await db.collection('SubjectTeacher').deleteMany({});
      const docs = subTeachers.map((st: any) => ({
        teacherId: st.teacher_id,
        subjectId: st.subject_id
      }));
      await db.collection('SubjectTeacher').insertMany(docs);
      console.log(`✅ Subject-Teacher Links: ${docs.length} รายการ`);
    }

    console.log("🏁 เสร็จสิ้น! นำเข้าข้อมูลจาก Excel เรียบร้อยครับ");

  } catch (err) {
    console.error("❌ เกิดข้อผิดพลาด:", err);
  } finally {
    await client.close();
  }
}

run();