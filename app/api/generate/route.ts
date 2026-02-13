import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ============================================
// 🟢 Helper Functions
// ============================================
const timeToMinutes = (timeStr: string) => {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
};

const minutesToTime = (totalMinutes: number) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
};

function isEditCommand(prompt: string) {
  return /ช่วย|ย้าย|สลับ|ลบ|เพิ่ม|แก้ไข|เปลี่ยน|move|swap|delete|add|edit|help|please/i.test(prompt);
}

function isAnalysisQuery(prompt: string) {
  return /ตารางนี้|เป็นยังไง|ดูอย่างไร|วิเคราะห์|แนะนำ|ปรับปรุง|ช่วยดู|คิดว่า|analyze|review|suggest|how.*look|what.*think/i.test(prompt);
}

// ============================================
// 🧠 AI REASONING ENGINE (ใหม่!)
// ============================================
async function getAIRecommendation(userPrompt: string, currentSchedule: any[]) {
  try {
    // สร้าง schedule summary
    const subjectCount = [...new Set(currentSchedule.map(s => s.subject))].length;
    const teacherCount = [...new Set(currentSchedule.map(s => s.teacher))].length;
    const roomCount = [...new Set(currentSchedule.map(s => s.room))].length;

    // นับคาบต่อวัน
    const dayDistribution = currentSchedule.reduce((acc: any, curr: any) => {
      acc[curr.day] = (acc[curr.day] || 0) + 1;
      return acc;
    }, {});

    // นับภาระครู
    const teacherWorkload = currentSchedule.reduce((acc: any, curr: any) => {
      acc[curr.teacher] = (acc[curr.teacher] || 0) + 1;
      return acc;
    }, {});

    const analysisPrompt = `
🧠 INTELLIGENT SCHEDULE ANALYZER & ADVISOR

CURRENT SCHEDULE OVERVIEW:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Total Entries: ${currentSchedule.length}
📚 Subjects: ${subjectCount}
👨‍🏫 Teachers: ${teacherCount}
🏫 Rooms: ${roomCount}

📅 Day Distribution:
${Object.entries(dayDistribution).map(([day, count]) => `   ${day}: ${count} คาบ`).join('\n')}

👨‍🏫 Teacher Workload (Top 5):
${Object.entries(teacherWorkload)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 5)
        .map(([teacher, count]) => `   ${teacher}: ${count} คาบ`)
        .join('\n')}

RECENT SCHEDULE ENTRIES (First 25):
${JSON.stringify(currentSchedule.slice(0, 25), null, 2)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 USER REQUEST: "${userPrompt}"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

YOUR MISSION:
Analyze the request and provide INTELLIGENT, CONTEXT-AWARE recommendations.

RESPONSE TYPES:

1️⃣ DELETE REQUEST (e.g., "ลบคาบ 7 วันศุกร์")
   → Check: What subject is being deleted?
   → Check: Does it exist elsewhere?
   → Suggest: Should we move it instead? Or is deletion safe?

2️⃣ SWAP/MOVE REQUEST (e.g., "สลับคาบ 4 กับ 6")
   → Check: Will this create teacher/room conflicts?
   → Check: Does it improve or worsen schedule balance?
   → Suggest: Better alternatives if current choice is problematic

3️⃣ ANALYSIS REQUEST (e.g., "ตารางนี้เป็นยังไง")
   → Analyze: Distribution fairness, gaps, consecutive slots
   → Identify: Problems (overloaded days, teacher burnout, etc.)
   → Suggest: Concrete improvements

RESPONSE FORMAT (JSON ONLY):
{
  "query_type": "DELETE" | "SWAP" | "MOVE" | "ANALYSIS" | "UNKNOWN",
  "understanding": "Brief explanation of what user wants",
  "current_state": "What's happening in current schedule related to request",
  "smart_suggestion": "Main recommendation with reasoning",
  "alternative_options": ["Option A with pros/cons", "Option B with pros/cons"],
  "potential_issues": ["Warning 1", "Warning 2"],
  "safety_check": "Is this action safe? Any conflicts?",
  "confidence": 0.95
}

EXAMPLES:

User: "ลบคาบ 7 วันศุกร์"
→ Detect: What subject is at Fri Slot 7?
→ Check: Does same subject exist on other days?
→ Respond: 
{
  "query_type": "DELETE",
  "understanding": "User wants to delete Friday Slot 7",
  "current_state": "Currently: 'การเขียนโปรแกรม' is scheduled at Fri Slot 7. This subject also appears at Mon Slot 3, Wed Slot 5.",
  "smart_suggestion": "ลบได้ปลอดภัย เพราะวิชานี้ยังมีคาบอื่นอยู่ 2 คาบ (Mon, Wed) ซึ่งเพียงพอต่อชั่วโมงเรียน",
  "alternative_options": [
    "ย้ายคาบนี้ไปวันอื่นแทนการลบ ถ้าต้องการเก็บชั่วโมงเรียนไว้",
    "ลบและเพิ่มวิชาอื่นที่ยังขาดชั่วโมงมาแทน"
  ],
  "potential_issues": ["วันศุกร์จะเหลือเพียง 2 คาบ อาจดูว่างเกินไป"],
  "safety_check": "✅ ปลอดภัย ไม่กระทบการเรียนการสอน",
  "confidence": 0.95
}

User: "ตารางนี้เป็นยังไง"
→ Analyze schedule balance, gaps, teacher workload
→ Respond:
{
  "query_type": "ANALYSIS",
  "understanding": "User wants overall schedule evaluation",
  "current_state": "Schedule has 40 entries across 5 days. Tue has 10 classes, Fri has only 4.",
  "smart_suggestion": "ตารางโดยรวมดี แต่วันอังคารแน่นเกินไป (10 คาบ) ควรย้ายบางวิชาไปวันศุกร์ (มีแค่ 4 คาบ)",
  "alternative_options": [
    "ย้าย 2-3 คาบจากวันอังคาร → วันศุกร์ เพื่อสมดุล",
    "ตรวจสอบว่าครูท่านใดสอนติดกันเกิน 4 คาบ อาจปรับเพื่อลดความเหนื่อยล้า"
  ],
  "potential_issues": [
    "อาจารย์สมชาย สอน 8 คาบ ในขณะที่อาจารย์อื่นสอน 3-4 คาบ",
    "ห้อง 101 ใช้งานหนาแน่นมาก (12 คาบ/สัปดาห์)"
  ],
  "safety_check": "⚠️ ควรปรับสมดุลเพื่อประสิทธิภาพที่ดีขึ้น",
  "confidence": 0.90
}

BE INTELLIGENT. THINK LIKE A HUMAN ADVISOR.
`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: analysisPrompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      response_format: { type: "json_object" },
      max_tokens: 3000
    });

    let aiText = completion.choices[0]?.message?.content || "{}";
    aiText = aiText.replace(/^```json/, '').replace(/```$/, '').trim();
    const result = JSON.parse(aiText);

    console.log("🧠 AI Recommendation:", result);
    return result;

  } catch (error: any) {
    console.error("❌ AI Recommendation Error:", error);
    return {
      query_type: "UNKNOWN",
      understanding: "ไม่สามารถวิเคราะห์ได้",
      smart_suggestion: "กรุณาลองใหม่อีกครั้ง",
      confidence: 0
    };
  }
}

// ============================================
// 🎯 MAIN API HANDLER
// ============================================
export async function POST(req: Request) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: "Missing GROQ API Key" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const { prompt, currentSchedule } = body;

    // ============================================
    // 🧠 CASE 1: วิเคราะห์ตาราง (ไม่แก้ไขอะไร)
    // ============================================
    if (isAnalysisQuery(prompt) && currentSchedule && currentSchedule.length > 0) {
      console.log("🔍 Analysis Mode Activated");

      const analysis = await getAIRecommendation(prompt, currentSchedule);

      return NextResponse.json({
        action: "ANALYZE",
        message: "📊 วิเคราะห์ตารางเรียนเรียบร้อย",
        ai_analysis: analysis.understanding,
        insights: {
          current_state: analysis.current_state,
          main_suggestion: analysis.smart_suggestion,
          alternatives: analysis.alternative_options || [],
          warnings: analysis.potential_issues || [],
          safety: analysis.safety_check
        },
        result: currentSchedule // ไม่เปลี่ยนตาราง
      });
    }

    // ============================================
    // 🧠 CASE 2: มีคำสั่งแก้ไขตาราง + มีตารางอยู่แล้ว
    // ============================================
    if (isEditCommand(prompt) && currentSchedule && currentSchedule.length > 0) {
      console.log("✏️ Edit Mode Activated");
      return handleNaturalLanguageCommand(prompt, currentSchedule);
    }

    // ============================================
    // 🤖 CASE 3: สร้างตารางใหม่ทั้งหมด
    // ============================================
    if (!currentSchedule || currentSchedule.length === 0) {
      console.log("🆕 Generate New Schedule Mode");
      return await generateNewSchedule(prompt);
    }

    // ============================================
    // 🔄 CASE 4: มีตารางอยู่แล้ว แต่ไม่มีคำสั่ง
    // ============================================
    return NextResponse.json({
      result: currentSchedule,
      ai_analysis: "ไม่มีคำสั่งใหม่ ตารางยังคงเดิม",
    });

  } catch (error: any) {
    console.error("❌ Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ============================================
// ✅ Constraint Validation Function
// ============================================
function validateScheduleConstraints(schedule: any[], teachers: any[], subjects: any[], rooms: any[], timeslots: any[]) {
  const violations: string[] = [];
  const warnings: string[] = [];

  // Constraint 1-4: จำนวนคาบต้องตรงกับ theory + practice
  subjects.forEach((subj: any) => {
    const sId = subj.subject_id || subj.id || subj._id;
    const actual = schedule.filter((s: any) => s.subject === sId || s.subject === String(sId)).length;
    const expected = (subj.theory || 0) + (subj.practice || 0);
    if (actual !== expected) {
      violations.push(`❌ Constraint 1-4: ${subj.subject_name} has ${actual} periods (expected ${expected})`);
    }
  });

  // Constraint 5: Max 10 periods per day
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  days.forEach(day => {
    const count = schedule.filter((s: any) => s.day === day).length;
    if (count > 10) {
      violations.push(`❌ Constraint 5: ${day} has ${count} periods (max 10)`);
    }
  });

  // Constraint 7: No overlapping teachers/rooms
  const teacherSlots = new Set<string>();
  const roomSlots = new Set<string>();
  schedule.forEach((entry: any) => {
    const teacherKey = `${entry.teacher}-${entry.day}-${entry.period}`;
    const roomKey = `${entry.room}-${entry.day}-${entry.period}`;

    if (teacherSlots.has(teacherKey)) {
      violations.push(`❌ Constraint 7: Teacher ${entry.teacher} double-booked at ${entry.day} period ${entry.period}`);
    }
    if (roomSlots.has(roomKey)) {
      violations.push(`❌ Constraint 7: Room ${entry.room} double-booked at ${entry.day} period ${entry.period}`);
    }

    teacherSlots.add(teacherKey);
    roomSlots.add(roomKey);
  });

  // Constraint 9: Theory → Theory room, Practice → Lab
  schedule.forEach((entry: any) => {
    const room = rooms.find((r: any) => r.room_name === entry.room || r.room_id === entry.room);
    if (room) {
      if (entry.type === "Practice" && room.room_type !== "Practice" && room.room_type !== "Lab") {
        warnings.push(`⚠️ Constraint 9: Practice class in non-lab room (${entry.room})`);
      }
      if (entry.type === "Lecture" && (room.room_type === "Practice" || room.room_type === "Lab")) {
        warnings.push(`⚠️ Constraint 9: Theory class in lab room (${entry.room})`);
      }
    }
  });

  // Constraint 12: Wed 15:00-17:00 should be free (periods 8-9)
  const wedActivity = schedule.filter((s: any) => s.day === "Wed" && (s.period === 8 || s.period === 9));
  if (wedActivity.length > 0) {
    violations.push(`❌ Constraint 12: Found ${wedActivity.length} classes during Wed activity time (should be 0)`);
  }

  // Constraint 15: No theory after 17:00 (period >= 9)
  const lateTheory = schedule.filter((s: any) => s.type === "Lecture" && s.period >= 9);
  if (lateTheory.length > 0) {
    warnings.push(`⚠️ Constraint 15: ${lateTheory.length} theory classes after 17:00`);
  }

  return {
    passed: violations.length === 0,
    violations,
    warnings,
    summary: violations.length === 0
      ? `✅ ผ่านการตรวจสอบทั้งหมด (${warnings.length} warnings)`
      : `❌ พบข้อผิดพลาด ${violations.length} รายการ`
  };
}

// ============================================
// 🆕 สร้างตารางใหม่
// ============================================
// ============================================
// 🆕 สร้างตารางใหม่ (Logic-Based)
// ============================================
async function generateNewSchedule(prompt: string) {
  const client = await clientPromise;
  const db = client.db("autotable");

  // 1. ดึงข้อมูลทั้งหมด
  const [teachers, subjects, rooms, config, timeslots] = await Promise.all([
    db.collection("Teacher").find({}).toArray(),
    db.collection("Subject").find({}).toArray(),
    db.collection("Room").find({}).toArray(),
    db.collection("SchoolConfig").findOne({}),
    db.collection("Timeslot").find({}).sort({ period: 1 }).toArray()
  ]);

  // 2. เตรียม Grid ตารางเรียน (5 วัน x 10 คาบ)
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];

  // ใช้ Timeslot ในการกำหนดจำนวนคาบ (ถ้าไม่มีให้ Default 10)
  const maxPeriods = timeslots.length > 0
    ? Math.max(...timeslots.map((t: any) => t.period))
    : 10;

  console.log(`✅ Using Max Periods: ${maxPeriods} (from ${timeslots.length} slots)`);

  // โครงสร้าง Schedule ที่จะ Return
  const schedule: any[] = [];

  // ตัวช่วยเช็ค Resource Usage (เพื่อป้องกันชนกัน)
  const busyTeachers = new Set<string>(); // key: "TeacherID-Day-Period"
  const busyRooms = new Set<string>();    // key: "RoomID-Day-Period"
  const busyGroups = new Set<string>();   // key: "Year-Day-Period" (สมมติแยกตามชั้นปี)

  // 🔧 FIX: Track room usage to ensure fair distribution
  const roomUsage = new Map<string, number>(); // room_id -> usage count
  rooms.forEach((r: any) => roomUsage.set(r.room_id, 0));

  const markBusy = (teacherId: string, roomId: string, year: number | string, day: string, period: number) => {
    busyTeachers.add(`${teacherId}-${day}-${period}`);
    busyRooms.add(`${roomId}-${day}-${period}`);
    busyGroups.add(`${year}-${day}-${period}`);
  };

  const isFree = (teacherId: string, roomId: string, year: number | string, day: string, period: number) => {
    if (busyTeachers.has(`${teacherId}-${day}-${period}`)) return false;
    if (busyRooms.has(`${roomId}-${day}-${period}`)) return false;
    if (busyGroups.has(`${year}-${day}-${period}`)) return false;
    return true;
  };

  // 3. ลงตาราง Block บังคับ (Fixed Constraints)

  // 3.1 พักเที่ยง (คาบ 5) - Block ทุกคน
  days.forEach(day => {
    // เราไม่ใส่ลงใน schedule output แต่เราจะไม่ลงเรียนในคาบนี้
    // แต่เพื่อให้ระบบเช็คว่าไม่ว่าง เราอาจจะ markBusy ไว้หลอกๆ หรือแค่ข้าม Loop
  });

  // 3.2 กิจกรรม (พุธ คาบ 8-9) - Block ทุกคน
  // Constraint 12: รายกิจกรรมต้องถูกจัดลงทุกวันพุธ เวลา 15:00-17:00 (คาบ 8 - 9)
  // สมมติคาบ 8=15:00, 9=16:00
  ["Mon", "Tue", "Wed", "Thu", "Fri"].forEach(year => { // Loop year instead if needed, but easy way is Check in Loop
  });

  // 3.3 ประชุม Leader (อังคาร คาบ 8) - Block Leader
  // Constraint 10: หัวหน้าแผนก (Leader) ประชุม อังคาร 15:00-16:00 (คาบ 8)
  const leaders = teachers.filter((t: any) => t.role === "Head" || t.role === "Leader" || t.unavailable?.includes("Leader"));
  leaders.forEach((leader: any) => {
    markBusy(leader.id, "MEETING_ROOM", "ALL", "Tue", 8);
  });

  // 4. แปลง Subject ให้เป็น Task (Lecture / Practice)
  // Constraint 1, 3, 4: จำนวนคาบเท่ากับลงทะเบียน
  // สมมติว่า Subject ทั้งหมดคือที่ต้องลง (ตามโจทย์ "จำนวนวิชาต้องเท่ากับจำนวนลงทะเบียน")

  let tasks: any[] = [];

  subjects.forEach((subj: any) => {
    // Correctly identify ID: Mongo uses _id, but our logic uses id/subject_id
    const sId = subj.subject_id || subj.id || subj._id;

    if (!sId) {
      console.warn("❌ Found subject without ID:", subj);
      return;
    }

    // Constraint 13: วิชาสามัญ (20000/30000) เรียนรวม 2 กลุ่ม -> ถือเป็น 1 Task ใหญ่ (ใช้ห้องใหญ่)
    const sIdStr = String(sId);
    const isGeneral = sIdStr.startsWith("20000") || sIdStr.startsWith("30000") || sIdStr.startsWith("S2") || sIdStr.startsWith("S3");

    // Constraint 9: Theory -> Lecture Room, Practice -> Practice Room
    // Create Theory Tasks
    for (let i = 0; i < (subj.theory || 0); i++) {
      tasks.push({
        ...subj,
        id: sIdStr, // Enforce ID
        type: "Lecture",
        taskId: `${sIdStr}-L-${i}`,
        reqLab: false,
        isGeneral
      });
    }
    // Create Practice Tasks
    for (let i = 0; i < (subj.practice || 0); i++) {
      tasks.push({
        ...subj,
        id: sIdStr, // Enforce ID
        type: "Practice",
        taskId: `${sIdStr}-P-${i}`,
        reqLab: true,
        isGeneral
      });
    }
  });

  // Sort Tasks: เอาวิชายากๆ ลงก่อน (IoT, Practice, General)
  tasks.sort((a, b) => {
    const aId = a.id?.toLowerCase() || "";
    const bId = b.id?.toLowerCase() || "";
    if (aId.includes("iot") && !bId.includes("iot")) return -1; // IoT First
    if (a.reqLab && !b.reqLab) return -1; // Lab First
    if (a.isGeneral && !b.isGeneral) return -1; // General First
    return 0;
  });

  // 5. Greedy Allocation
  for (const task of tasks) {
    let assigned = false;

    // หาครูที่สอนวิชานี้
    console.log(`🔍 Looking for teacher for subject: ${task.id} (${task.subject_name})`);

    // Check if task.id is valid
    if (!task.id) {
      console.error("❌ Task is missing ID!", task);
      continue;
    }
    const teachRelations = await db.collection("Teach").find({ subject_id: task.id }).toArray();
    let validTeachers = teachRelations.map((tr: any) => tr.teacher_id);

    if (validTeachers.length === 0) {
      // Fallback: ถ้าไม่มีระบุ ให้หาจาก Teacher ที่ชื่อตรงกับ field ใน Subject หรือ Assign Auto (ข้ามไปก่อน)
      console.warn(`No teacher for ${task.id}`);
      continue;
    }

    // Constraint 14: IoT Subject @ Room R6201 Only
    let validRooms = rooms;
    const taskIdLower = task.id?.toLowerCase() || "";
    const taskNameLower = task.subject_name?.toLowerCase() || "";

    if (taskIdLower.includes("iot") || taskNameLower.includes("iot")) {
      const iotRoom = rooms.find((r: any) => r.room_id === "R6201" || r.name === "IoT Lab");
      validRooms = iotRoom ? [iotRoom] : rooms;
    } else {
      // Filter by Type
      // Constraint 9: Theory -> Theory Room, Practice -> Practice Room
      validRooms = rooms.filter((r: any) => {
        if (task.reqLab) return r.room_type === "Practice" || r.room_type === "Lab";
        return r.room_type !== "Practice" && r.room_type !== "Lab"; // Theory
      });
    }

    const year = task.recommendedYear || 1; // สมมติปี 1 ถ้าไม่มี

    // Try to slot in
    for (const day of days) {
      if (assigned) break;

      for (let period = 1; period <= maxPeriods; period++) {
        if (assigned) break;

        // Skip Constraints Time
        // Constraint 2: คาบ 5 พัก
        if (period === 5) continue;

        // Constraint 12: พุธ คาบ 8-9 กิจกรรม
        if (day === "Wed" && (period === 8 || period === 9)) continue;

        // Constraint 15: หลีกเลี่ยง Theory หลัง 17:00 (คาบ 9+)
        if (task.type === "Lecture" && period >= 9) continue;

        // Constraint 11: Homeroom (สมมติ ศุกร์ คาบ 8)
        if (day === "Fri" && period === 8) continue;

        // Find valid Teacher & Room
        let pickedTeacher = null;
        let pickedRoom = null;

        for (const tid of validTeachers) {
          if (isFree(tid, "ANY", "ANY", day, period)) { // เช็คครูว่าง (Room/Group ไม่ต้องเช็คที่นี่)
            pickedTeacher = tid;
            break;
          }
        }

        if (!pickedTeacher) continue; // ครูไม่ว่างสักคนในคาบนี้

        // 🔧 FIX: Pick LEAST-USED room from validRooms to distribute fairly
        const availableRooms = validRooms.filter((room: any) =>
          isFree(pickedTeacher, room.room_id, year, day, period)
        );

        if (availableRooms.length > 0) {
          // Sort by usage count (ascending) and pick the least used
          availableRooms.sort((a: any, b: any) =>
            (roomUsage.get(a.room_id) || 0) - (roomUsage.get(b.room_id) || 0)
          );
          pickedRoom = availableRooms[0];

          // Increment usage count
          roomUsage.set(pickedRoom.room_id, (roomUsage.get(pickedRoom.room_id) || 0) + 1);
        }

        if (pickedTeacher && pickedRoom) {
          // Assign!
          markBusy(pickedTeacher, pickedRoom.room_id, year, day, period);

          // หา Teacher Name/Room Name
          const tObj = teachers.find((t: any) => t.id === pickedTeacher || t.teacher_id === pickedTeacher);

          // Map period to Time
          // สมมติ Period 1 = 08:00 (ตาม Timeslot DB หรือ Config)
          const ts = timeslots.find((t: any) => t.period === period);
          const timeStr = ts ? `${ts.start}-${ts.end}` : `Period ${period}`;

          schedule.push({
            subject: task.id,
            subjectName: task.subject_name,
            teacher: tObj ? tObj.teacher_name : pickedTeacher,
            room: pickedRoom.room_name || pickedRoom.room_id,
            day: day,
            period: period, // เก็บ period ไว้ sort
            slotNo: period, // use slotNo for frontend compatibility
            time: timeStr,
            type: task.type
          });
          assigned = true;
        }
      }
    }

    if (!assigned) {
      console.warn(`Could not assign task: ${task.subject_name}`);
    }
  }

  // 6. Validate Schedule Against Constraints
  const validation = validateScheduleConstraints(schedule, teachers, subjects, rooms, timeslots);

  // 7. Log room usage for debugging
  console.log("📊 Room Usage Distribution:");
  roomUsage.forEach((count, roomId) => {
    if (count > 0) console.log(`   ${roomId}: ${count} times`);
  });

  // 8. Return Schedule with Validation
  return NextResponse.json({
    message: "Success (Logic-Based)",
    ai_analysis: `สร้างตารางตามกฎ 15 ข้อ - ${validation.summary}`,
    result: schedule,
    stats: {
      totalEntries: schedule.length,
      subjects: [...new Set(schedule.map((s: { subject: string }) => s.subject))].length,
      roomsUsed: Array.from(roomUsage.entries())
        .filter(([_, count]) => count > 0)
        .map(([roomId, count]) => ({ roomId, usage: count }))
    },
    validation: {
      passed: validation.passed,
      violations: validation.violations,
      warnings: validation.warnings
    }
  });
}

// ============================================
// 🧠 Natural Language Command Parser
// ============================================
async function handleNaturalLanguageCommand(userPrompt: string, currentSchedule: any[]) {
  try {
    console.log(`🧠 Parsing command: "${userPrompt}"`);

    // 🧠 ขั้นตอนที่ 1: ให้ AI วิเคราะห์ก่อน
    const aiAdvice = await getAIRecommendation(userPrompt, currentSchedule);

    console.log("💡 AI Advice:", aiAdvice.smart_suggestion);

    const parserInstruction = `
You are an INTELLIGENT Schedule Command Parser.

CURRENT SCHEDULE (First 30 entries):
${JSON.stringify(currentSchedule.slice(0, 30), null, 2)}

TOTAL: ${currentSchedule.length} entries

🎯 UNDERSTAND NATURAL COMMANDS:

1️⃣ MOVE (ย้ายคาบ):
   Examples:
   - "ย้ายคาบ 8 วันจันทร์ไปคาบ 8 วันศุกร์"
   - "ช่วยย้ายคาบ 6 ไปคาบ 3 วันจันทร์"
   - "ย้ายคาบที่ 4 วันศุกร์ ไปคาบ 8"
   
   ⚠️ CRITICAL: If subject not mentioned in command:
   → MUST find subject from CURRENT SCHEDULE at source position
   → Example: "ย้ายคาบ 8 วันจันทร์" → Look at Mon Slot 8 → Find subject there
   
2️⃣ SWAP: "สลับคาบ 4 วันจันทร์ กับ คาบ 4 วันอังคาร"
3️⃣ DELETE: "ลบคาบ 4 วันศุกร์"
4️⃣ MOVE_MULTIPLE: "ย้ายคาบ 6 และ 7 วันพฤหัสบดี ไปคาบที่ 3 และ 4"

DAY MAPPING (STRICT):
"จันทร์"|"Monday"|"Mon"|"วันจันทร์" → "Mon"
"อังคาร"|"Tuesday"|"Tue"|"วันอังคาร" → "Tue"
"พุธ"|"Wednesday"|"Wed"|"วันพุธ" → "Wed"
"พฤหัสบดี"|"พฤหัส"|"Thursday"|"Thu"|"วันพฤหัสบดี" → "Thu"
"ศุกร์"|"Friday"|"Fri"|"วันศุกร์" → "Fri"

RESPONSE FORMAT (JSON):
For MOVE without subject mentioned:
{
  "action": "MOVE",
  "confidence": 0.95,
  "parameters": {
    "subject": "AUTO_DETECT",
    "fromDay": "Mon",
    "fromSlot": 8,
    "toDay": "Fri",
    "toSlot": 8
  },
  "explanation": "ย้ายคาบ 8 วันจันทร์ ไป วันศุกร์ คาบ 8"
}

PARSING STEPS for "ย้ายคาบ 8 วันจันทร์ไปคาบ 8 วันศุกร์":
1. Detect action: MOVE
2. Extract numbers: 8 (source slot), 8 (target slot)
3. Extract days: "วันจันทร์" → "Mon", "วันศุกร์" → "Fri"
4. Subject not mentioned → use "AUTO_DETECT"
5. Return: {action: "MOVE", parameters: {subject: "AUTO_DETECT", fromDay: "Mon", fromSlot: 8, toDay: "Fri", toSlot: 8}}
`;

    const completion = await groq.chat.completions.create({
      messages: [{
        role: "user",
        content: parserInstruction + `\n\n👤 USER: "${userPrompt}"`
      }],
      model: "llama-3.3-70b-versatile",
      temperature: 0,
      response_format: { type: "json_object" },
      max_tokens: 2000
    });

    let aiText = completion.choices[0]?.message?.content || "{}";
    aiText = aiText.replace(/^```json/, '').replace(/```$/, '').trim();
    const parsed = JSON.parse(aiText);

    if (parsed.action === "UNKNOWN" || !parsed.action || parsed.confidence < 0.6) {
      return NextResponse.json({
        error: "😕 ไม่ค่อยเข้าใจคำสั่ง",
        ai_suggestion: aiAdvice.smart_suggestion,
        suggestions: [
          "ช่วยย้ายคาบ 6 ไปคาบ 3 วันจันทร์",
          "สลับคาบ 4 วันจันทร์ กับ คาบ 4 วันอังคาร",
          "ลบคาบ 4 วันศุกร์ออก"
        ]
      }, { status: 400 });
    }

    // ============================================
    // 🧠 MOVE_MULTIPLE Handler
    // ============================================
    if (parsed.action === "MOVE_MULTIPLE" && parsed.moves) {
      let updatedSchedule = [...currentSchedule];
      const moveResults = [];

      for (const move of parsed.moves) {
        const result = await handleScheduleManagement({
          action: "MOVE",
          currentSchedule: updatedSchedule,
          ...move
        }, aiAdvice);

        const data = await result.json();

        if (result.status === 200) {
          updatedSchedule = data.result;
          moveResults.push(data.moved);
        } else {
          return NextResponse.json({
            error: data.error,
            partialMoves: moveResults,
            ai_insight: aiAdvice
          }, { status: result.status });
        }
      }

      return NextResponse.json({
        message: `✅ ย้ายคาบสำเร็จ ${moveResults.length} คาบ`,
        action: "MOVE_MULTIPLE",
        moved: moveResults,
        explanation: parsed.explanation,
        ai_insight: {
          suggestion: aiAdvice.smart_suggestion,
          warnings: aiAdvice.potential_issues
        },
        result: updatedSchedule
      });
    }

    // ============================================
    // 🔍 AUTO_DETECT: Find subject from schedule
    // ============================================
    let finalParams = { ...parsed.parameters };

    if (parsed.action === "MOVE" && finalParams.subject === "AUTO_DETECT") {
      console.log("🔍 AUTO_DETECT: Finding subject at", finalParams.fromDay, "Slot", finalParams.fromSlot);

      const sourceEntry = currentSchedule.find((entry: any) =>
        entry.day === finalParams.fromDay &&
        entry.slotNo === finalParams.fromSlot
      );

      if (!sourceEntry) {
        return NextResponse.json({
          error: `❌ ไม่พบคาบที่ ${finalParams.fromDay} คาบที่ ${finalParams.fromSlot}`,
          suggestion: "ตรวจสอบว่าวันและคาบที่ระบุมีการเรียนอยู่จริงหรือไม่"
        }, { status: 404 });
      }

      finalParams.subject = sourceEntry.subject;
      console.log(`✅ AUTO_DETECT: Found subject ${sourceEntry.subject} (${sourceEntry.subjectName})`);
    }

    const body = {
      action: parsed.action,
      currentSchedule: currentSchedule,
      ...finalParams
    };

    return handleScheduleManagement(body, aiAdvice);

  } catch (error: any) {
    console.error("❌ Error:", error);
    return NextResponse.json({
      error: "⚠️ เกิดข้อผิดพลาด: " + error.message
    }, { status: 500 });
  }
}

// ============================================
// 🎯 Schedule Management (CRUD) + AI Insights
// ============================================
async function handleScheduleManagement(body: any, aiAdvice?: any) {
  const { action, currentSchedule } = body;

  if (!currentSchedule) {
    return NextResponse.json({ error: "กรุณาระบุ currentSchedule" }, { status: 400 });
  }

  // ============================================
  // 🗑️ DELETE with AI Intelligence
  // ============================================
  if (action === 'DELETE') {
    const { day, slotNo } = body;

    if (!day || typeof slotNo !== "number") {
      return NextResponse.json(
        { error: "❌ ต้องระบุวัน และเลขคาบให้ชัดเจน" },
        { status: 400 }
      );
    }

    const targetEntry = currentSchedule.find(
      (e: any) => e.day === day && e.slotNo === slotNo
    );

    if (!targetEntry) {
      return NextResponse.json(
        { error: `ไม่พบคาบ ${day} คาบที่ ${slotNo}` },
        { status: 404 }
      );
    }

    // 🧠 ตรวจสอบว่ามีวิชาเดียวกันที่อื่นไหม
    const sameSubjectOtherSlots = currentSchedule.filter(
      (e: any) => e.subject === targetEntry.subject &&
        !(e.day === day && e.slotNo === slotNo)
    );

    // 💡 สร้างคำแนะนำอัจฉริยะ
    let smartInsight = "";
    if (sameSubjectOtherSlots.length > 0) {
      const locations = sameSubjectOtherSlots
        .map((s: any) => `${s.day} คาบ${s.slotNo}`)
        .join(', ');
      smartInsight = `💡 ${targetEntry.subjectName} ยังมีอยู่ที่: ${locations} (${sameSubjectOtherSlots.length} คาบ)`;
    } else {
      smartInsight = `⚠️ ${targetEntry.subjectName} จะถูกลบออกจากตารางทั้งหมด! ไม่มีคาบอื่นเหลือ`;
    }

    const updatedSchedule = currentSchedule.filter(
      (e: any) => !(e.day === day && e.slotNo === slotNo)
    );

    return NextResponse.json({
      message: "✅ ลบคาบสำเร็จ",
      action: "DELETE",
      deleted: targetEntry,
      ai_insight: {
        what_happened: smartInsight,
        recommendation: aiAdvice?.smart_suggestion || "พิจารณาเพิ่มวิชาอื่นมาแทนที่ได้",
        alternatives: aiAdvice?.alternative_options || [],
        warnings: aiAdvice?.potential_issues || []
      },
      result: updatedSchedule
    });
  }

  // ============================================
  // 🔄 SWAP with Conflict Detection
  // ============================================
  if (action === 'SWAP') {
    const { a, b } = body;

    if (!a || !b) {
      return NextResponse.json({ error: "ข้อมูลไม่ครบ (ต้องมี a และ b)" }, { status: 400 });
    }

    const slotA = Number(a.slot);
    const slotB = Number(b.slot);
    const dayA = a.day;
    const dayB = b.day;

    const indexA = currentSchedule.findIndex((e: any) => e.day === dayA && e.slotNo === slotA);
    const indexB = currentSchedule.findIndex((e: any) => e.day === dayB && e.slotNo === slotB);

    let updatedSchedule = [...currentSchedule];
    let message = "";

    // แก้ไข typing ให้ชัดเจน
    type ScheduleItem = {
      subject: string;
      subjectName: string;
      teacher: string;
      room: string;
      day: string;
      slotNo: number;
    };

    const swappedItems: { itemA: ScheduleItem | null; itemB: ScheduleItem | null } = {
      itemA: null,
      itemB: null
    };

    if (indexA !== -1 && indexB !== -1) {
      // สลับ 2 คาบที่มีวิชา
      swappedItems.itemA = { ...updatedSchedule[indexA] };
      swappedItems.itemB = { ...updatedSchedule[indexB] };

      updatedSchedule[indexA] = { ...updatedSchedule[indexA], day: dayB, slotNo: slotB };
      updatedSchedule[indexB] = { ...updatedSchedule[indexB], day: dayA, slotNo: slotA };
      message = `✅ สลับ ${swappedItems.itemA!.subjectName} กับ ${swappedItems.itemB!.subjectName}`;
    } else if (indexA !== -1 && indexB === -1) {
      swappedItems.itemA = { ...updatedSchedule[indexA] };
      updatedSchedule[indexA] = { ...updatedSchedule[indexA], day: dayB, slotNo: slotB };
      message = `✅ ย้าย ${swappedItems.itemA!.subjectName} ไปที่ว่าง`;
    } else if (indexA === -1 && indexB !== -1) {
      swappedItems.itemB = { ...updatedSchedule[indexB] };
      updatedSchedule[indexB] = { ...updatedSchedule[indexB], day: dayA, slotNo: slotA };
      message = `✅ ย้าย ${swappedItems.itemB!.subjectName} มาที่ว่าง`;
    } else {
      return NextResponse.json({ error: "ไม่พบข้อมูลในตำแหน่งที่ระบุ" }, { status: 404 });
    }

    // 🧠 ตรวจสอบผลกระทบ
    const teacherA = swappedItems.itemA?.teacher;
    const teacherB = swappedItems.itemB?.teacher;

    const impactWarnings: string[] = [];

    if (teacherA) {
      const teacherScheduleAfter = updatedSchedule.filter((e: any) => e.teacher === teacherA && e.day === dayB);
      if (teacherScheduleAfter.length > 4) {
        impactWarnings.push(`⚠️ ${teacherA} มีคาบสอนในวัน${dayB} เยอะขึ้น (${teacherScheduleAfter.length} คาบ)`);
      }
    }

    return NextResponse.json({
      message,
      action: "SWAP",
      swapped: swappedItems,
      ai_insight: {
        recommendation: aiAdvice?.smart_suggestion || "การสลับเสร็จสมบูรณ์",
        warnings: impactWarnings.length > 0 ? impactWarnings : aiAdvice?.potential_issues || [],
        safety: aiAdvice?.safety_check || "✅ ไม่พบความขัดแย้ง"
      },
      result: updatedSchedule
    });
  }

  // ============================================
  // ➡️ MOVE with Smart Validation
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
      return NextResponse.json({
        error: conflict.error,
        conflict: conflict.entry,
        ai_suggestion: aiAdvice?.smart_suggestion || "ลองเลือกคาบอื่นที่ว่าง"
      }, { status: 409 });
    }

    const updatedSchedule = currentSchedule.map((entry: any) => {
      if (entry.subject === subject && entry.day === fromDay && entry.slotNo === fromSlot) {
        return { ...entry, day: toDay, slotNo: toSlot };
      }
      return entry;
    });

    return NextResponse.json({
      message: "✅ ย้ายคาบสำเร็จ",
      action: "MOVE",
      moved: {
        subject: targetEntry.subject,
        subjectName: targetEntry.subjectName,
        from: `${fromDay} คาบที่ ${fromSlot}`,
        to: `${toDay} คาบที่ ${toSlot}`
      },
      ai_insight: {
        recommendation: aiAdvice?.smart_suggestion || "การย้ายเสร็จสมบูรณ์",
        warnings: aiAdvice?.potential_issues || [],
        safety: aiAdvice?.safety_check || "✅ ไม่พบความขัดแย้ง"
      },
      result: updatedSchedule
    });
  }

  return NextResponse.json({
    error: `Action ไม่ถูกต้อง: ${action}`
  }, { status: 400 });
}

// ============================================
// 🛡️ Conflict Checker
// ============================================
function checkConflicts(schedule: any[], day: string, slotNo: number, entry: any, excludeSubject: string | null) {
  const slotConflict = schedule.find((e: any) =>
    e.day === day && e.slotNo === slotNo && e.subject !== excludeSubject
  );

  if (slotConflict) {
    return {
      error: `❌ คาบ ${day} Slot ${slotNo} มีการเรียนอยู่แล้ว: ${slotConflict.subjectName}`,
      entry: slotConflict
    };
  }

  const teacherConflict = schedule.find((e: any) =>
    e.day === day && e.slotNo === slotNo && e.teacher === entry.teacher && e.subject !== excludeSubject
  );

  if (teacherConflict) {
    return {
      error: `❌ อาจารย์ ${entry.teacher} สอนอยู่แล้วในช่วงนี้`,
      entry: teacherConflict
    };
  }

  const roomConflict = schedule.find((e: any) =>
    e.day === day && e.slotNo === slotNo && e.room === entry.room && e.subject !== excludeSubject
  );

  if (roomConflict) {
    return {
      error: `❌ ห้อง ${entry.room} ถูกใช้งานอยู่แล้วในช่วงนี้`,
      entry: roomConflict
    };
  }

  return null;
}