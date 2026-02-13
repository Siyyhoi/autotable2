import { MongoClient } from 'mongodb';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module'; // 1. นำเข้า createRequire

// 2. สร้างตัวแปร require, __filename, __dirname ขึ้นมาเอง
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 3. โหลด xlsx ด้วย require (แก้ปัญหา .readFile is not a function)
const xlsx = require('xlsx');

dotenv.config();

const uri = process.env.DATABASE_URL;
const dbName = "autotable"; 

if (!uri) {
  console.error("❌ ไม่พบ DATABASE_URL ในไฟล์ .env");
  process.exit(1);
}

const client = new MongoClient(uri);

// ฟังก์ชันช่วยอ่าน Sheet แรกของไฟล์
const readFirstSheet = (filePath: string): any[] => {
  // ตอนนี้ xlsx เป็น object ที่ถูกต้องแล้ว เรียก readFile ได้แน่นอน
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0]; 
  const sheet = workbook.Sheets[sheetName];
  return xlsx.utils.sheet_to_json(sheet);
};

// ==========================================
// 1. StudentGroup
// ==========================================
async function importStudentGroups(db: any, filePath: string) {
  console.log(`📖 Processing StudentGroup: ${path.basename(filePath)}`);
  const data = readFirstSheet(filePath);
  if (!data.length) return;
  const ops = data.map((row: any) => ({
    replaceOne: {
      filter: { group_id: String(row.group_id) },
      replacement: {
        group_id: String(row.group_id),
        group_name: row.group_name,
        group_count: parseInt(row.student_count || '0'),
        advisor: row.advisor
      },
      upsert: true
    }
  }));
  if (ops.length > 0) await db.collection('StudentGroup').bulkWrite(ops);
  console.log(`   ✅ Saved ${ops.length} groups`);
}

// ==========================================
// 2. Subject
// ==========================================
async function importSubjects(db: any, filePath: string) {
  console.log(`📖 Processing Subject: ${path.basename(filePath)}`);
  const data = readFirstSheet(filePath);
  if (!data.length) return;
  const ops = data.map((row: any) => ({
    replaceOne: {
      filter: { subject_id: String(row.subject_id) },
      replacement: {
        subject_id: String(row.subject_id),
        subject_name: row.subject_name,
        theory: parseInt(row.theory || '0'),
        practice: parseInt(row.practice || '0'),
        credit: parseInt(row.credit || '0')
      },
      upsert: true
    }
  }));
  if (ops.length > 0) await db.collection('Subject').bulkWrite(ops);
  console.log(`   ✅ Saved ${ops.length} subjects`);
}

// ==========================================
// 3. Teacher
// ==========================================
async function importTeachers(db: any, filePath: string) {
  console.log(`📖 Processing Teacher: ${path.basename(filePath)}`);
  const data = readFirstSheet(filePath);
  if (!data.length) return;
  const ops = data.map((row: any) => ({
    replaceOne: {
      filter: { teacher_id: String(row.teacher_id) },
      replacement: {
        teacher_id: String(row.teacher_id),
        teacher_name: row.teacher_name,
        role: row.role
      },
      upsert: true
    }
  }));
  if (ops.length > 0) await db.collection('Teacher').bulkWrite(ops);
  console.log(`   ✅ Saved ${ops.length} teachers`);
}

// ==========================================
// 4. Timeslot
// ==========================================
// ฟังก์ชันช่วยแปลง String เวลา (08:00:00) ให้เป็น Date Object
const parseTime = (timeStr: any): Date | null => {
  if (!timeStr) return null;
  
  // กรณี Excel ส่งมาเป็นตัวเลขทศนิยม (เช่น 0.333 สำหรับ 8 โมง)
  if (typeof timeStr === 'number') {
    const totalSeconds = Math.floor(timeStr * 86400);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const date = new Date();
    date.setUTCHours(hours, minutes, 0, 0); // ใช้ UTC เพื่อความเป็นกลาง
    date.setUTCFullYear(1970, 0, 1);       // ล็อควันที่ไว้ที่ 1 ม.ค. 1970
    return date;
  }

  // กรณีเป็น String "08:00:00"
  const parts = String(timeStr).split(':');
  if (parts.length >= 2) {
    const date = new Date();
    date.setUTCHours(parseInt(parts[0]), parseInt(parts[1]), 0, 0);
    date.setUTCFullYear(1970, 0, 1); // ล็อควันที่ไว้
    return date;
  }
  
  return null;
};

// ==========================================
// 4. จัดการ Timeslot (Updated for DateTime)
// ==========================================
async function importTimeslots(db: any, filePath: string) {
  console.log(`📖 Processing Timeslot: ${path.basename(filePath)}`);
  const data = readFirstSheet(filePath);
  if (!data.length) return;

  const ops = data.map((row: any) => {
    // แปลงเวลาตรงนี้
    const startTime = parseTime(row.start);
    const endTime = parseTime(row.end);

    return {
      replaceOne: {
        filter: { timeslot_id: String(row.timeslot_id) },
        replacement: {
          timeslot_id: String(row.timeslot_id),
          day: row.day,
          period: parseInt(row.period || '0'),
          start: startTime, // ส่งค่าเป็น Date Object
          end: endTime      // ส่งค่าเป็น Date Object
        },
        upsert: true
      }
    };
  });

  if (ops.length > 0) await db.collection('Timeslot').bulkWrite(ops);
  console.log(`   ✅ Saved ${ops.length} timeslots`);
}

// ==========================================
// 5. Room
// ==========================================
async function importRooms(db: any, filePath: string) {
  console.log(`📖 Processing Room: ${path.basename(filePath)}`);
  const data = readFirstSheet(filePath);
  if (!data.length) return;
  
  // กรอง room_id ที่ว่างทิ้ง
  const validData = data.filter((row: any) => row.room_id && String(row.room_id).trim() !== '');
  
  const ops = validData.map((row: any) => ({
    replaceOne: {
      filter: { room_id: String(row.room_id) },
      replacement: {
        room_id: String(row.room_id),
        room_name: row.room_name || "",
        room_type: row.room_type || ""
      },
      upsert: true
    }
  }));
  if (ops.length > 0) await db.collection('Room').bulkWrite(ops);
  console.log(`   ✅ Saved ${ops.length} rooms`);
}

// ==========================================
// 6. Teach Relation
// ==========================================
async function importTeachRelations(db: any, filePath: string) {
  console.log(`📖 Processing Teach Relation: ${path.basename(filePath)}`);
  const data = readFirstSheet(filePath);
  if (!data.length) return;
  const ops = data.map((row: any) => ({
    replaceOne: {
      filter: { 
        teacher_id: String(row.teacher_id), 
        subject_id: String(row.subject_id) 
      },
      replacement: {
        teacher_id: String(row.teacher_id),
        subject_id: String(row.subject_id)
      },
      upsert: true
    }
  }));
  if (ops.length > 0) await db.collection('Teach').bulkWrite(ops);
  console.log(`   ✅ Saved ${ops.length} teach relations`);
}

// ==========================================
// 7. Register Relation
// ==========================================
async function importRegisters(db: any, filePath: string) {
  console.log(`📖 Processing Register Relation: ${path.basename(filePath)}`);
  const data = readFirstSheet(filePath);
  if (!data.length) return;
  const ops = data.map((row: any) => ({
    replaceOne: {
      filter: { 
        group_id: String(row.group_id), 
        subject_id: String(row.subject_id) 
      },
      replacement: {
        group_id: String(row.group_id),
        subject_id: String(row.subject_id)
      },
      upsert: true
    }
  }));
  if (ops.length > 0) await db.collection('Register').bulkWrite(ops);
  console.log(`   ✅ Saved ${ops.length} register relations`);
}

// ==========================================
// Main Runner
// ==========================================
async function run() {
  try {
    await client.connect();
    console.log("🔌 Connected to MongoDB");
    const db = client.db(dbName);

    // ใช้ __dirname ที่เราสร้างเองด้านบน
    const dataDir = path.join(__dirname, '../data'); 
    
    if (!fs.existsSync(dataDir)) throw new Error(`ไม่พบโฟลเดอร์: ${dataDir}`);

    const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.xlsx'));
    console.log(`📂 Found ${files.length} Excel files in ${dataDir}`);

    for (const file of files) {
      const filePath = path.join(dataDir, file);
      const lowerName = file.toLowerCase();

      if (lowerName.includes('student_group')) await importStudentGroups(db, filePath);
      else if (lowerName.includes('subject')) await importSubjects(db, filePath);
      else if (lowerName.includes('teacher')) await importTeachers(db, filePath);
      else if (lowerName.includes('timeslot')) await importTimeslots(db, filePath);
      else if (lowerName.includes('room')) await importRooms(db, filePath);
      else if (lowerName.includes('teach') && !lowerName.includes('teacher')) await importTeachRelations(db, filePath);
      else if (lowerName.includes('register')) await importRegisters(db, filePath);
    }

    console.log("🏁 All imports finished successfully!");

  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    await client.close();
  }
}

run();