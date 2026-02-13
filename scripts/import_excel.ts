import { MongoClient } from 'mongodb';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const xlsx = require('xlsx');

dotenv.config();

const uri = process.env.DATABASE_URL;
const dbName = "autotable";

if (!uri) {
  console.error("❌ ไม่พบ DATABASE_URL ในไฟล์ .env");
  process.exit(1);
}

const client = new MongoClient(uri);

// ==========================================
// 🛠️ Global Variables
// ==========================================
let availableGroupIds: string[] = []; 
let dynamicMapping: Record<string, string> = {};
let currentGroupIndex = 0; 

// ==========================================
// 🧹 Helper Functions (ฟังก์ชันช่วยทำความสะอาด)
// ==========================================

const readFirstSheet = (filePath: string): any[] => {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  // defval: "" ช่วยให้ฟิลด์ที่ว่างไม่เป็น undefined
  return xlsx.utils.sheet_to_json(sheet, { defval: "" });
};

const cleanStr = (val: any): string => {
  if (val === undefined || val === null) return "";
  return String(val).trim();
};

const formatTimeSimple = (timeStr: any) => { 
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

// 🔥 ฟังก์ชันกรองข้อมูลซ้ำและข้อมูลขยะ
const cleanData = (data: any[], keyGenerator: (row: any) => string) => {
    const seen = new Set();
    const cleaned = [];
    
    for (const row of data) {
        const key = keyGenerator(row);
        
        // 1. กรอง Key ที่เป็นค่าว่างทิ้ง (เช่น room_id หาย)
        if (!key) continue; 

        // 2. กรองข้อมูลซ้ำ
        if (seen.has(key)) continue;

        seen.add(key);
        cleaned.push(row);
    }
    return cleaned;
};

// ==========================================
// 1. StudentGroup (Master Data)
// ==========================================
async function importStudentGroups(db: any, filePath: string) {
  console.log(`📖 Processing StudentGroup: ${path.basename(filePath)}`);
  let data = readFirstSheet(filePath);
  if (!data.length) return;

  // กรองซ้ำด้วย group_id
  data = cleanData(data, (row) => cleanStr(row.group_id));

  availableGroupIds = [];
  data.forEach((row: any) => {
    const realId = cleanStr(row.group_id);
    if (realId) availableGroupIds.push(realId);
  });

  console.log(`   📦 Loaded ${availableGroupIds.length} groups into memory.`);

  const ops = data.map((row: any) => ({
    replaceOne: {
      filter: { group_id: cleanStr(row.group_id) },
      replacement: {
        group_id: cleanStr(row.group_id),
        group_name: cleanStr(row.group_name),
        group_count: parseInt(row.student_count || '0'),
        advisor: cleanStr(row.advisor)
      },
      upsert: true
    }
  }));
  if (ops.length > 0) await db.collection('StudentGroup').bulkWrite(ops);
  console.log(`   ✅ Saved ${ops.length} groups`);
}

// ==========================================
// 2. Register Relation (Dynamic Mapping Logic)
// ==========================================
async function importRegisters(db: any, filePath: string) {
  console.log(`📖 Processing Register: ${path.basename(filePath)}`);
  let data = readFirstSheet(filePath);
  if (!data.length) return;

  // กรองซ้ำด้วย group_id + subject_id ก่อนเข้าลูป Mapping
  data = cleanData(data, (row) => `${cleanStr(row.group_id)}|${cleanStr(row.subject_id)}`);

  dynamicMapping = {}; 
  currentGroupIndex = 0;

  const ops = [];

  for (const row of data) {
    let registerGroupId = cleanStr(row.group_id);
    if(!registerGroupId) continue;

    // Mapping Logic
    if (!dynamicMapping[registerGroupId]) {
      if (currentGroupIndex < availableGroupIds.length) {
        const assignedRealId = availableGroupIds[currentGroupIndex];
        dynamicMapping[registerGroupId] = assignedRealId;
        console.log(`   🔗 Mapped: '${registerGroupId}' -> ${assignedRealId}`);
        currentGroupIndex++;
      } else {
        console.warn(`   ⚠️  WARNING: Not enough real groups for '${registerGroupId}'`);
      }
    }

    const finalGroupId = dynamicMapping[registerGroupId] || registerGroupId;

    ops.push({
      replaceOne: {
        filter: {
            group_id: finalGroupId,
            subject_id: cleanStr(row.subject_id)
        },
        replacement: {
          group_id: finalGroupId,
          subject_id: cleanStr(row.subject_id)
        },
        upsert: true
      }
    });
  }

  if (ops.length > 0) await db.collection('Register').bulkWrite(ops);
  console.log(`   ✅ Saved ${ops.length} register relations`);
}

// ==========================================
// 3. Other Imports
// ==========================================
async function importSubjects(db: any, filePath: string) {
    console.log(`📖 Processing Subject: ${path.basename(filePath)}`);
    let data = readFirstSheet(filePath);
    
    // 🧹 Clean: กรอง subject_id ซ้ำ
    data = cleanData(data, (row) => cleanStr(row.subject_id));

    if (!data.length) return;
    const ops = data.map((row: any) => ({
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
    console.log(`   ✅ Saved ${ops.length} subjects`);
}

async function importTeachers(db: any, filePath: string) {
    console.log(`📖 Processing Teacher: ${path.basename(filePath)}`);
    let data = readFirstSheet(filePath);

    // 🧹 Clean: กรอง teacher_id ซ้ำ
    data = cleanData(data, (row) => cleanStr(row.teacher_id));

    if (!data.length) return;
    const ops = data.map((row: any) => ({
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
    console.log(`   ✅ Saved ${ops.length} teachers`);
}

async function importTimeslots(db: any, filePath: string) {
    console.log(`📖 Processing Timeslot: ${path.basename(filePath)}`);
    let data = readFirstSheet(filePath);

    // 🧹 Clean: กรอง timeslot_id ซ้ำ
    data = cleanData(data, (row) => cleanStr(row.timeslot_id));

    if (!data.length) return;
    const ops = data.map((row: any) => ({
        replaceOne: { 
            filter: { timeslot_id: cleanStr(row.timeslot_id) }, 
            replacement: { 
                timeslot_id: cleanStr(row.timeslot_id), 
                day: cleanStr(row.day), 
                period: parseInt(row.period||'0'), 
                start: formatTimeSimple(row.start), 
                end: formatTimeSimple(row.end) 
            }, 
            upsert: true 
        }
    }));
    if (ops.length) await db.collection('Timeslot').bulkWrite(ops);
    console.log(`   ✅ Saved ${ops.length} timeslots`);
}

async function importRooms(db: any, filePath: string) {
    console.log(`📖 Processing Room: ${path.basename(filePath)}`);
    let data = readFirstSheet(filePath);

    // 🧹 Clean: กรอง room_id ที่ซ้ำ หรือ เป็นค่าว่าง
    data = cleanData(data, (row) => cleanStr(row.room_id));

    if (!data.length) return;
    const ops = data.map((row: any) => ({
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
    console.log(`   ✅ Saved ${ops.length} rooms`);
}

async function importTeachRelations(db: any, filePath: string) {
    console.log(`📖 Processing Teach Relation: ${path.basename(filePath)}`);
    let data = readFirstSheet(filePath);

    // 🧹 Clean: กรองคู่ teacher_id + subject_id ที่ซ้ำกัน
    data = cleanData(data, (row) => `${cleanStr(row.teacher_id)}|${cleanStr(row.subject_id)}`);

    if (!data.length) return;
    const ops = data.map((row: any) => ({
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
    console.log(`   ✅ Saved ${ops.length} teach relations`);
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
    const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.xlsx') || f.endsWith('.csv'));

    // แยกไฟล์ StudentGroup ทำก่อน
    const studentGroupFiles = files.filter(f => f.toLowerCase().includes('student_group'));
    const otherFiles = files.filter(f => !f.toLowerCase().includes('student_group'));

    for (const file of studentGroupFiles) await importStudentGroups(db, path.join(dataDir, file));
    
    for (const file of otherFiles) {
      const filePath = path.join(dataDir, file);
      const lowerName = file.toLowerCase();
      if (lowerName.includes('subject')) await importSubjects(db, filePath);
      else if (lowerName.includes('teacher') && !lowerName.includes('teach.')) await importTeachers(db, filePath); // ระวังชื่อไฟล์ teach vs teacher
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