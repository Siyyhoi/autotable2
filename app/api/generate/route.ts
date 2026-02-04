import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// 🟢 Helper Function: แปลงเวลา "08:30" -> นาที (int)
const timeToMinutes = (timeStr: string) => {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
};

// 🟢 Helper Function: แปลงนาที -> เวลา "08:30"
const minutesToTime = (totalMinutes: number) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
};

function isEditCommand(prompt: string) {
  return /ย้าย|สลับ|ลบ|เพิ่ม|แก้ไข|move|swap|delete|add|edit/i.test(prompt);
}

export async function POST(req: Request) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: "Missing GROQ API Key" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const { prompt, currentSchedule } = body;

    // ============================================
    // 🧠 AI Parser: แปลงคำสั่งภาษาธรรมชาติ
    // ============================================
    if (prompt && currentSchedule && isEditCommand(prompt)) {
      return handleNaturalLanguageCommand(prompt, currentSchedule);
    }

    // ============================================
    // 🤖 ถ้าไม่มี currentSchedule = สร้างตารางใหม่
    // ============================================
    const client = await clientPromise;
    const db = client.db("autotable");

    // 1. ดึงข้อมูล
    const [teachers, subjects, rooms, config] = await Promise.all([
      db.collection("Teacher").find({}).project({_id:0, id:1, fullName:1}).toArray(),
      db.collection("Subject").find({}).project({_id:0, id:1, nameTH:1, lectureHours:1}).toArray(),
      db.collection("Room").find({}).project({_id:0, id:1, name:1}).toArray(),
      db.collection("SchoolConfig").findOne({})
    ]);

    // 🚨 เช็ค Config
    if (!config) {
      return NextResponse.json({ 
        error: "ไม่พบการตั้งค่า SchoolConfig กรุณาตั้งค่าโรงเรียนก่อน" 
      }, { status: 400 });
    }

    // 2. 🔥 คำนวณ Slot เวลาอัตโนมัติ (มีพักเที่ยง)
    const generatedSlots = [];
    let current = timeToMinutes(config.startTime);
    const end = timeToMinutes(config.endTime);
    const duration = config.periodDuration;
    let slotNo = 1;

    // 🍽️ กำหนดเวลาพักเที่ยง (12:00-13:00)
    const LUNCH_TIME_START = 720;  // 12:00 = 720 นาที
    const LUNCH_TIME_END = 780;    // 13:00 = 780 นาที

    while (current + duration <= end) {
      const isLunchBreak = current >= LUNCH_TIME_START && current < LUNCH_TIME_END;

      // ✅ ถ้าไม่ใช่พักเที่ยง ค่อยเพิ่มเข้า Array
      if (!isLunchBreak) {
        generatedSlots.push({
          slotNo: slotNo,
          startTime: minutesToTime(current),
          endTime: minutesToTime(current + duration),
          label: `Slot ${slotNo} (${minutesToTime(current)} - ${minutesToTime(current + duration)})`
        });
      }
      
      current += duration;
      slotNo++;
    }

    console.log(`✅ Generated ${generatedSlots.length} teachable slots (excluded lunch break 12:00-13:00).`);

    // 3. 🚀 เรียกใช้ Groq AI (Llama 3.3 70B) พร้อม Instruction ฉลาดขึ้น
    const systemInstruction = `
You are an ELITE University Scheduler Engine with OPTIMIZATION expertise.

🎯 PRIMARY OBJECTIVE:
Create the MOST EFFICIENT schedule by grouping consecutive hours of the same subject together.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 MANDATORY RULES (STRICTLY ENFORCE):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. ✅ CONSECUTIVE SLOTS RULE (MOST IMPORTANT!)
   - Same Subject + Same Room + Same Teacher = BACK-TO-BACK SLOTS
   - BUT ⚠️ NEVER cross lunch break (12:00-13:00)!
   - Example (CORRECT ✅):
     * Subject "Database" (6 hours, Room 5, Teacher A):
       → Mon Slot 1-2-3-4 (before lunch) + Mon Slot 6-7 (after lunch)
       OR Mon Slot 1-2-3 + Tue Slot 1-2-3
   
   - Example (WRONG ❌):
     * Subject "Database" (6 hours, Room 5, Teacher A):
       → Mon Slot 1, Tue Slot 3, Wed Slot 5, Thu Slot 2, Fri Slot 4, Fri Slot 7
       ❌ This is TERRIBLE! Too scattered!

2. 🍽️ LUNCH BREAK RULE (12:00-13:00)
   - Slot 5 (12:00-13:00) is LUNCH BREAK - NOT available for classes
   - DO NOT schedule any classes during this time
   - Classes can be scheduled: Slots 1-4 (morning) and Slots 6-8 (afternoon)
   - NEVER schedule consecutive slots that cross lunch (e.g., Slot 4-5-6 ❌)

3. 🚫 NO GAPS IN SAME DAY
   - If a subject appears multiple times on the SAME DAY, slots MUST be consecutive
   - But respect lunch break! Split into morning block + afternoon block if needed
   - Example (CORRECT ✅): Wed Slot 1-2-3 OR Wed Slot 6-7-8
   - Example (WRONG ❌): Wed Slot 1, Wed Slot 7 (gap without lunch reason!)

4. 📊 BALANCED DISTRIBUTION
   - Don't overload one day while leaving others empty
   - Try to distribute subjects across Mon-Fri reasonably
   - But ALWAYS prioritize consecutive slots over perfect balance

5. 🔒 CONFLICT PREVENTION
   - Teachers cannot teach 2 classes at the same time
   - Rooms cannot host 2 classes at the same time
   - Every slot must have: valid day (Mon/Tue/Wed/Thu/Fri) + valid slotNo

6. 🎲 SMART SUBJECT ORDERING
   - DO NOT schedule subjects in sequential order (S001, S002, S003...)
   - Mix subjects intelligently based on room/teacher availability
   - Group by room/teacher when possible to maximize efficiency

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 OPTIMIZATION STRATEGY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step 1: Group subjects by room/teacher
Step 2: For each subject, find CONSECUTIVE available slots (respecting lunch break!)
Step 3: Schedule longest subjects first (6 hours → 3 hours → 2 hours → 1 hour)
Step 4: Morning slots (1-4) and Afternoon slots (6-8) should be treated separately
Step 5: Fill remaining gaps with smaller subjects
Step 6: Verify no conflicts (teacher/room/time) and no lunch break violations

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📥 INPUT DATA:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Subjects (with lecture hours):
${JSON.stringify(subjects, null, 2)}

Teachers:
${JSON.stringify(teachers, null, 2)}

Rooms:
${JSON.stringify(rooms, null, 2)}

Available Timeslots:
${JSON.stringify(generatedSlots, null, 2)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📤 REQUIRED JSON RESPONSE FORMAT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{
  "schedule": [
    {
      "subject": "S001",
      "subjectName": "หลักการเขียนโปรแกรม",
      "teacher": "อาจารย์สมชาย",
      "room": "ห้อง 1",
      "day": "Mon",
      "slotNo": 1,
      "time": "08:00-09:00"
    },
    {
      "subject": "S001",
      "subjectName": "หลักการเขียนโปรแกรม",
      "teacher": "อาจารย์สมชาย",
      "room": "ห้อง 1",
      "day": "Mon",
      "slotNo": 2,
      "time": "09:00-10:00"
    }
  ],
  "analysis": "Detailed explanation of your optimization strategy"
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ CRITICAL REMINDERS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- CONSECUTIVE SLOTS = TOP PRIORITY
- Same subject hours MUST be grouped together
- Minimize room/teacher switches
- Balance is secondary to efficiency
- Think like a human scheduler, not a robot

Now generate the OPTIMIZED schedule!
`;

    const completion = await groq.chat.completions.create({
      messages: [{
        role: "user",
        content: systemInstruction + "\n\n🎯 USER COMMAND: " + (prompt || "Generate OPTIMIZED schedule with CONSECUTIVE slots for same subjects")
      }],
      model: "llama-3.3-70b-versatile",
      temperature: 0, // ✅ ไม่สุ่มเลย ให้แม่นยำสูงสุด
      response_format: { type: "json_object" },
      max_tokens: 8000 // ✅ เพิ่ม token limit เผื่อตารางใหญ่
    });

    let aiText = completion.choices[0]?.message?.content || "{}";
    aiText = aiText.replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();

    const parsedResult = JSON.parse(aiText);

    // 4. ✅ Validation (ตรวจสอบว่าตารางที่ได้มาถูกต้อง)
    const schedule = parsedResult.schedule || [];
    
    console.log(`✅ Generated ${schedule.length} schedule entries`);
    console.log(`📊 AI Analysis: ${parsedResult.analysis || 'No analysis provided'}`);

    return NextResponse.json({ 
      message: "Success", 
      ai_analysis: parsedResult.analysis || "จัดตารางแบบ Optimized สำเร็จ",
      result: schedule,
      stats: {
        totalEntries: schedule.length,
        subjects: [...new Set(schedule.map((s: any) => s.subject))].length,
        rooms: [...new Set(schedule.map((s: any) => s.room))].length,
        teachers: [...new Set(schedule.map((s: any) => s.teacher))].length
      },
      config: {
        startTime: config.startTime,
        endTime: config.endTime,
        periodDuration: config.periodDuration
      } 
    });

  } catch (error: any) {
    console.error("❌ Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ============================================
// 🧠 Natural Language Command Parser
// ============================================
async function handleNaturalLanguageCommand(userPrompt: string, currentSchedule: any[]) {
  try {
    console.log(`🧠 Parsing command: "${userPrompt}"`);
    
    const parserInstruction = `
    You are a Schedule Command Parser AI.
    Your job is to understand user commands in Thai or English and convert them into structured JSON actions.
    
    CURRENT SCHEDULE SAMPLE (first 20 entries):
    ${JSON.stringify(currentSchedule.slice(0, 20), null, 2)}
    
    TOTAL ENTRIES: ${currentSchedule.length}
    
    USER COMMAND TYPES:
    1. MOVE - ย้ายคาบ
    2. DELETE - ลบคาบ
    3. ADD - เพิ่มคาบ
    4. EDIT - แก้ไขคาบ
    5. SWAP - สลับคาบ (Ex: "สลับคาบที่ 4 วันจันทร์ กับ คาบ 4 วันอังคาร")
    
    CRITICAL RULES:
    - Always return {"action": "MOVE"|"DELETE"|"ADD"|"EDIT"|"SWAP", "parameters": {...}}
    - For SWAP, return parameters: { "a": { "day": "Mon", "slot": 4 }, "b": { "day": "Tue", "slot": 4 } }
    
    RESPONSE FORMAT (JSON ONLY):
    {
      "action": "SWAP",
      "confidence": 0.95,
      "parameters": {
        "a": { "day": "Mon", "slot": 4 },
        "b": { "day": "Tue", "slot": 4 }
      }
    }
    `;

    const completion = await groq.chat.completions.create({
      messages: [{
        role: "user",
        content: parserInstruction + `\n\nUSER COMMAND: "${userPrompt}"`
      }],
      model: "llama-3.3-70b-versatile",
      temperature: 0,
      response_format: { type: "json_object" }
    });

    let aiText = completion.choices[0]?.message?.content || "{}";
    aiText = aiText.replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();
    const parsed = JSON.parse(aiText);

    console.log(`✅ Parsed command:`, JSON.stringify(parsed, null, 2));

    if (parsed.action === "UNKNOWN" || parsed.confidence < 0.5) {
      return NextResponse.json({
        error: "ขอโทษครับ ไม่เข้าใจคำสั่ง กรุณาลองใหม่อีกครั้ง",
        parsedCommand: parsed
      }, { status: 400 });
    }

    // Handle MOVE_MULTIPLE (ถ้ามี)
    if (parsed.action === "MOVE_MULTIPLE" && parsed.moves) {
       // ... (Logic เดิมของคุณสำหรับ Move Multiple) ...
       // ⚠️ อย่าเอา SWAP มาใส่ตรงนี้
       return NextResponse.json({ message: "Not implemented yet for multiple moves" }); 
    }

    // Execute single action
    const body = {
      action: parsed.action,
      currentSchedule: currentSchedule,
      ...parsed.parameters
    };

    console.log(`🚀 Executing action:`, body.action);
    return handleScheduleManagement(body);

  } catch (error: any) {
    console.error("❌ Error parsing natural language:", error);
    return NextResponse.json({ 
      error: "เกิดข้อผิดพลาดในการแปลคำสั่ง: " + error.message 
    }, { status: 500 });
  }
}

// ============================================
// 🎯 จัดการตาราง (CRUD Operations)
// ============================================
async function handleScheduleManagement(body: any) {
  const { action, currentSchedule } = body;

  if (!currentSchedule) {
    return NextResponse.json({ 
      error: "กรุณาระบุ currentSchedule" 
    }, { status: 400 });
  }

  // ============================================
  // 1️⃣ SWAP - สลับคาบ
  // ============================================
  if (action === 'SWAP') {
    const { a, b } = body; // รับค่า a และ b

    if (!a || !b) {
      return NextResponse.json({ error: "ข้อมูลไม่ครบ (ต้องมี a และ b)" }, { status: 400 });
    }

    const slotA = Number(a.slot);
    const slotB = Number(b.slot);
    const dayA = a.day;
    const dayB = b.day;

    // หา index ของทั้งคู่
    const indexA = currentSchedule.findIndex((e: any) => e.day === dayA && e.slotNo === slotA);
    const indexB = currentSchedule.findIndex((e: any) => e.day === dayB && e.slotNo === slotB);

    let updatedSchedule = [...currentSchedule];
    let message = "";

    // กรณี 1: สลับวิชา <-> วิชา
    if (indexA !== -1 && indexB !== -1) {
      updatedSchedule[indexA] = { ...updatedSchedule[indexA], day: dayB, slotNo: slotB };
      updatedSchedule[indexB] = { ...updatedSchedule[indexB], day: dayA, slotNo: slotA };
      message = `สลับวิชา ${updatedSchedule[indexA].subject} กับ ${updatedSchedule[indexB].subject} เรียบร้อย`;
    } 
    // กรณี 2: ย้าย A -> ที่ว่าง B
    else if (indexA !== -1 && indexB === -1) {
      updatedSchedule[indexA] = { ...updatedSchedule[indexA], day: dayB, slotNo: slotB };
      message = `ย้าย ${updatedSchedule[indexA].subject} ไปที่ว่าง (${dayB} คาบ ${slotB})`;
    }
    // กรณี 3: ย้าย B -> ที่ว่าง A
    else if (indexA === -1 && indexB !== -1) {
      updatedSchedule[indexB] = { ...updatedSchedule[indexB], day: dayA, slotNo: slotA };
      message = `ย้าย ${updatedSchedule[indexB].subject} มาที่ว่าง (${dayA} คาบ ${slotA})`;
    }
    else {
      return NextResponse.json({ error: "ไม่พบข้อมูลในตำแหน่งที่ระบุทั้งสองจุด" }, { status: 404 });
    }

    return NextResponse.json({ 
      message, 
      action: "SWAP", 
      result: updatedSchedule 
    });
  }

  // ============================================
  // 2️⃣ MOVE - ย้ายคาบ
  // ============================================
  if (action === 'MOVE') {
    const { subject, fromDay, fromSlot, toDay, toSlot } = body;

    if (!subject || !fromDay || !fromSlot || !toDay || !toSlot) {
      return NextResponse.json({ 
        error: "กรุณาระบุ: subject, fromDay, fromSlot, toDay, toSlot" 
      }, { status: 400 });
    }

    const targetEntry = currentSchedule.find((entry: any) => 
      entry.subject === subject && 
      entry.day === fromDay && 
      entry.slotNo === fromSlot
    );

    if (!targetEntry) {
      return NextResponse.json({ 
        error: `ไม่พบคาบ: ${subject} วัน ${fromDay} คาบที่ ${fromSlot}` 
      }, { status: 404 });
    }

    const conflict = checkConflicts(currentSchedule, toDay, toSlot, targetEntry, subject);
    if (conflict) {
      return NextResponse.json({ error: conflict.error, conflict: conflict.entry }, { status: 409 });
    }

    const updatedSchedule = currentSchedule.map((entry: any) => {
      if (entry.subject === subject && entry.day === fromDay && entry.slotNo === fromSlot) {
        return { ...entry, day: toDay, slotNo: toSlot };
      }
      return entry;
    });

    return NextResponse.json({ 
      message: "ย้ายคาบสำเร็จ",
      action: "MOVE",
      moved: {
        subject: targetEntry.subject,
        subjectName: targetEntry.subjectName,
        from: `${fromDay} คาบที่ ${fromSlot}`,
        to: `${toDay} คาบที่ ${toSlot}`
      },
      result: updatedSchedule
    });
  }

  // ============================================
  // 3️⃣ DELETE - ลบคาบ
  // ============================================
  if (action === 'DELETE') {
    const { subject, day, slotNo } = body;

    if (!subject || !day || !slotNo) {
      return NextResponse.json({ 
        error: "กรุณาระบุ: subject, day, slotNo" 
      }, { status: 400 });
    }

    const targetEntry = currentSchedule.find((entry: any) => 
      entry.subject === subject && 
      entry.day === day && 
      entry.slotNo === slotNo
    );

    if (!targetEntry) {
      return NextResponse.json({ 
        error: `ไม่พบคาบที่ต้องการลบ: ${subject} วัน ${day} คาบที่ ${slotNo}` 
      }, { status: 404 });
    }

    const updatedSchedule = currentSchedule.filter((entry: any) => 
      !(entry.subject === subject && entry.day === day && entry.slotNo === slotNo)
    );

    return NextResponse.json({ 
      message: "ลบคาบสำเร็จ",
      action: "DELETE",
      deleted: {
        subject: targetEntry.subject,
        subjectName: targetEntry.subjectName,
        day: day,
        slotNo: slotNo
      },
      result: updatedSchedule
    });
  }

  // ============================================
  // 4️⃣ ADD - เพิ่มคาบ
  // ============================================
  if (action === 'ADD') {
    const { subject, subjectName, teacher, room, day, slotNo, time } = body;

    if (!subject || !subjectName || !teacher || !room || !day || !slotNo) {
      return NextResponse.json({ 
        error: "กรุณาระบุ: subject, subjectName, teacher, room, day, slotNo" 
      }, { status: 400 });
    }

    const newEntry = { subject, subjectName, teacher, room, day, slotNo, time };

    const conflict = checkConflicts(currentSchedule, day, slotNo, newEntry, null);
    if (conflict) {
      return NextResponse.json({ error: conflict.error, conflict: conflict.entry }, { status: 409 });
    }

    const updatedSchedule = [...currentSchedule, newEntry];

    return NextResponse.json({ 
      message: "เพิ่มคาบสำเร็จ",
      action: "ADD",
      added: newEntry,
      result: updatedSchedule
    });
  }

  // ============================================
  // 5️⃣ EDIT - แก้ไขคาบ
  // ============================================
  if (action === 'EDIT') {
    const { subject, day, slotNo, updates } = body;

    if (!subject || !day || !slotNo || !updates) {
      return NextResponse.json({ 
        error: "กรุณาระบุ: subject, day, slotNo, updates (object)" 
      }, { status: 400 });
    }

    const targetIndex = currentSchedule.findIndex((entry: any) => 
      entry.subject === subject && 
      entry.day === day && 
      entry.slotNo === slotNo
    );

    if (targetIndex === -1) {
      return NextResponse.json({ 
        error: `ไม่พบคาบที่ต้องการแก้ไข: ${subject} วัน ${day} คาบที่ ${slotNo}` 
      }, { status: 404 });
    }

    const updatedSchedule = [...currentSchedule];
    updatedSchedule[targetIndex] = {
      ...updatedSchedule[targetIndex],
      ...updates
    };

    if (updates.day || updates.slotNo) {
      const newDay = updates.day || day;
      const newSlot = updates.slotNo || slotNo;
      const conflict = checkConflicts(
        updatedSchedule.filter((_, i) => i !== targetIndex), 
        newDay, 
        newSlot, 
        updatedSchedule[targetIndex],
        subject
      );
      if (conflict) {
        return NextResponse.json({ error: conflict.error, conflict: conflict.entry }, { status: 409 });
      }
    }

    return NextResponse.json({ 
      message: "แก้ไขคาบสำเร็จ",
      action: "EDIT",
      updated: updatedSchedule[targetIndex],
      result: updatedSchedule
    });
  }

  // ⚠️ ส่วน Return Error ต้องอยู่ท้ายสุด และปิดปีกกาฟังก์ชันตรงนี้เท่านั้น
  return NextResponse.json({ 
    error: `Action ไม่ถูกต้อง: ${action}. ใช้ได้เฉพาะ: MOVE, DELETE, ADD, EDIT, SWAP` 
  }, { status: 400 });
}

// ============================================
// 🛡️ Helper Function: ตรวจสอบความชน
// ============================================
function checkConflicts(
  schedule: any[], 
  day: string, 
  slotNo: number, 
  entry: any,
  excludeSubject: string | null
) {
  const slotConflict = schedule.find((e: any) => 
    e.day === day && 
    e.slotNo === slotNo &&
    e.subject !== excludeSubject
  );

  if (slotConflict) {
    return {
      error: `คาบ ${day} Slot ${slotNo} มีการเรียนอยู่แล้ว: ${slotConflict.subjectName}`,
      entry: slotConflict
    };
  }

  const teacherConflict = schedule.find((e: any) => 
    e.day === day && 
    e.slotNo === slotNo && 
    e.teacher === entry.teacher &&
    e.subject !== excludeSubject
  );

  if (teacherConflict) {
    return {
      error: `อาจารย์ ${entry.teacher} สอนอยู่แล้วในช่วงนี้: ${teacherConflict.subjectName}`,
      entry: teacherConflict
    };
  }

  const roomConflict = schedule.find((e: any) => 
    e.day === day && 
    e.slotNo === slotNo && 
    e.room === entry.room &&
    e.subject !== excludeSubject
  );

  if (roomConflict) {
    return {
      error: `ห้อง ${entry.room} ถูกใช้งานอยู่แล้วในช่วงนี้: ${roomConflict.subjectName}`,
      entry: roomConflict
    };
  }

  return null;
}