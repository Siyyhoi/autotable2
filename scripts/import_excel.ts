import { MongoClient } from 'mongodb';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

// สร้างตัวแปร require, __filename, __dirname ขึ้นมาเอง
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// โหลด xlsx ด้วย require
const xlsx = require('xlsx');

dotenv.config();

const uri = process.env.DATABASE_URL;
const dbName = "autotable";

if (!uri) {
  console.error("❌ ไม่พบ DATABASE_URL ในไฟล์ .env");
  process.exit(1);
}

const client = new MongoClient(uri);

// ฟังก์ชันช่วยอ่าน Sheet แรกของไฟล์ (รองรับทั้ง Excel และ CSV)
const readFirstSheet = (filePath: string): any[] => {
  // xlsx.readFile อ่านได้ทั้ง .xlsx และ .csv โดยอัตโนมัติ
  const workbook = xlsx.readFile(filePath);

  // ถ้าเป็น CSV มันจะมี Sheet เดียวชื่อ "Sheet1"
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // แปลงเป็น JSON
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
// 4. Timeslot (Helper Function)
// ==========================================
const formatTimeSimple = (timeStr: any): string | null => {
  if (timeStr === undefined || timeStr === null) return null;

  // กรณี Excel ส่งมาเป็นตัวเลข (Serial Number) e.g. 0.333333
  if (typeof timeStr === 'number') {
    const totalSeconds = Math.round(timeStr * 86400); // 24 * 60 * 60
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    // Format HH:mm
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  // กรณีเป็น String "08:00:00" หรือ "8:00"
  const str = String(timeStr).trim();
  const parts = str.split(':');
  if (parts.length >= 2) {
    let h = parseInt(parts[0]);
    let m = parseInt(parts[1]);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  return str; // Return as is if format unknown
};

// ==========================================
// 4. Timeslot (Import)
// ==========================================
async function importTimeslots(db: any, filePath: string) {
  console.log(`📖 Processing Timeslot: ${path.basename(filePath)}`);
  const data = readFirstSheet(filePath);
  if (!data.length) return;

  const ops = data.map((row: any) => {
    // ใช้ string "08:00" ตรงๆ ไม่ต้องแปลงเป็น Timezone
    const startTime = formatTimeSimple(row.start);
    const endTime = formatTimeSimple(row.end);

    return {
      replaceOne: {
        filter: { timeslot_id: String(row.timeslot_id) },
        replacement: {
          timeslot_id: String(row.timeslot_id),
          day: row.day,
          period: parseInt(row.period || '0'),
          start: startTime, // Save as String "HH:mm"
          end: endTime      // Save as String "HH:mm"
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

    const dataDir = path.join(__dirname, '../data');

    if (!fs.existsSync(dataDir)) throw new Error(`ไม่พบโฟลเดอร์: ${dataDir}`);

    // ⚡️ แก้ไขตรงนี้: หาไฟล์ทั้ง .xlsx และ .csv
    const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.xlsx') || f.endsWith('.csv'));

    console.log(`📂 Found ${files.length} files (Excel/CSV) in ${dataDir}`);

    for (const file of files) {
      const filePath = path.join(dataDir, file);
      const lowerName = file.toLowerCase();

      // Logic เดิม ยังใช้ได้เพราะเช็คชื่อไฟล์
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