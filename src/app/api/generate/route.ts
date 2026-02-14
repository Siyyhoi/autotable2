import { NextResponse } from "next/server";
import clientPromise from "@/config/database";
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
  return /ช่วย|ย้าย|สลับ|ลบ|เพิ่ม|แก้ไข|เปลี่ยน|move|swap|delete|add|edit|help|please/i.test(
    prompt,
  );
}

// ============================================
// 📊 Offline Analysis Helper
// ============================================
function analyzeScheduleOffline(currentSchedule: any[]) {
  if (!currentSchedule || currentSchedule.length === 0) {
    return {
      query_type: "ANALYSIS",
      understanding: "วิเคราะห์โครงสร้างตารางเรียนเบื้องต้น (Offline)",
      current_state: "ไม่พบข้อมูลตารางเรียน",
      smart_suggestion: "กรุณาสร้างตารางเรียนก่อนทำการวิเคราะห์",
      safety_check: "⚠️ ไม่มีข้อมูล",
      confidence: 1.0,
    };
  }

  // Basic stats
  const totalEntries = currentSchedule.length;

  let dayCounts: Record<string, number> = {
    Mon: 0,
    Tue: 0,
    Wed: 0,
    Thu: 0,
    Fri: 0,
  };
  currentSchedule.forEach((e: any) => {
    if (dayCounts[e.day] !== undefined) dayCounts[e.day]++;
  });

  // Find max/min days
  let maxDay = "Mon";
  let minDay = "Mon";
  let maxCount = -1;
  let minCount = 999;

  for (const [day, count] of Object.entries(dayCounts)) {
    if (count > maxCount) {
      maxCount = count;
      maxDay = day;
    }
    if (count < minCount) {
      minCount = count;
      minDay = day;
    }
  }

  const suggestion =
    `(Offline Analysis) ตารางเรียนมีทั้งหมด ${totalEntries} คาบ\n` +
    `วันที่มีเรียนเยอะที่สุดคือ ${maxDay} (${maxCount} คาบ)\n` +
    `วันที่มีเรียนน้อยที่สุดคือ ${minDay} (${minCount} คาบ)`;

  return {
    query_type: "ANALYSIS",
    understanding: "วิเคราะห์โครงสร้างตารางเรียนเบื้องต้น (Offline)",
    current_state: `มีเรียนทั้งหมด ${totalEntries} คาบ กระจายใน 5 วันทำการ`,
    smart_suggestion: suggestion,
    alternative_options: [
      "ลองเกลี่ยคาบเรียนให้สมดุลมากขึ้น",
      "ตรวจสอบความหนาแน่นของการใช้ห้องเรียน",
    ],
    potential_issues: [
      "การวิเคราะห์เชิงลึก (AI Mode) ไม่สามารถใช้งานได้ชั่วคราว (Rate Limit / Offline)",
    ],
    safety_check: "✅ ข้อมูลพื้นฐานถูกต้อง",
    confidence: 1.0,
  };
}

function isAnalysisQuery(prompt: string) {
  return /ตารางนี้|เป็นยังไง|ดูอย่างไร|วิเคราะห์|แนะนำ|ปรับปรุง|ช่วยดู|คิดว่า|analyze|review|suggest|how.*look|what.*think|balance|status|check|ตรวจสอบ/i.test(
    prompt,
  );
}

// ============================================
// 🧠 AI REASONING ENGINE (ใหม่!)
// ============================================
async function getAIRecommendation(userPrompt: string, currentSchedule: any[]) {
  try {
    // สร้าง schedule summary
    const subjectCount = [...new Set(currentSchedule.map((s) => s.subject))]
      .length;
    const teacherCount = [...new Set(currentSchedule.map((s) => s.teacher))]
      .length;
    const roomCount = [...new Set(currentSchedule.map((s) => s.room))].length;

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
${Object.entries(dayDistribution)
  .map(([day, count]) => `   ${day}: ${count} คาบ`)
  .join("\n")}

👨‍🏫 Teacher Workload (Top 5):
${Object.entries(teacherWorkload)
  .sort((a: any, b: any) => b[1] - a[1])
  .slice(0, 5)
  .map(([teacher, count]) => `   ${teacher}: ${count} คาบ`)
  .join("\n")}

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
      max_tokens: 3000,
    });

    let aiText = completion.choices[0]?.message?.content || "{}";
    aiText = aiText
      .replace(/^```json/, "")
      .replace(/```$/, "")
      .trim();
    const result = JSON.parse(aiText);

    console.log("🧠 AI Recommendation:", result);
    return result;
  } catch (error: any) {
    console.error("❌ AI Recommendation Error:", error);
    return {
      query_type: "UNKNOWN",
      understanding: "ไม่สามารถวิเคราะห์ได้",
      smart_suggestion: "กรุณาลองใหม่อีกครั้ง",
      confidence: 0,
    };
  }
}

// ============================================
// 🎯 MAIN API HANDLER
// ============================================
export async function POST(req: Request) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: "Missing GROQ API Key" },
        { status: 500 },
      );
    }

    const body = (await req.json().catch(() => ({}))) as any;
    const { prompt, currentSchedule } = body;

    // ============================================
    // 🧠 CASE 1: วิเคราะห์ตาราง (ไม่แก้ไขอะไร)
    // ============================================
    if (
      isAnalysisQuery(prompt) &&
      currentSchedule &&
      currentSchedule.length > 0
    ) {
      console.log("🔍 Analysis Mode Activated");

      try {
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
            safety: analysis.safety_check,
          },
          result: currentSchedule, // ไม่เปลี่ยนตาราง
        });
      } catch (groqError: any) {
        console.error("❌ Groq API Error (Analysis):", groqError.message);
        console.log("⚠️ Switching to Offline Analysis Mode");

        // Offline Fallback for Analysis
        const analysis = analyzeScheduleOffline(currentSchedule);

        return NextResponse.json({
          action: "ANALYZE",
          message: "📊 วิเคราะห์ตารางเรียน (Offline Mode)",
          ai_analysis: analysis.understanding,
          insights: {
            current_state: analysis.current_state,
            main_suggestion: analysis.smart_suggestion,
            alternatives: analysis.alternative_options || [],
            warnings: analysis.potential_issues || [],
            safety: analysis.safety_check,
          },
          result: currentSchedule,
        });
      }
    }

    // ============================================
    // 🧠 CASE 2: มีคำสั่งแก้ไขตาราง + มีตารางอยู่แล้ว
    // ============================================
    if (
      isEditCommand(prompt) &&
      currentSchedule &&
      currentSchedule.length > 0
    ) {
      console.log("✏️ Edit Mode Activated");
      return handleNaturalLanguageCommand(prompt, currentSchedule);
    }

    // ============================================
    // 🤖 CASE 3: สร้างตารางใหม่ทั้งหมด (แยกตาม Group)
    // ============================================
    if (!currentSchedule || currentSchedule.length === 0) {
      console.log("🆕 Generate Group-Based Schedules Mode");
      return await generateSchedulesForAllGroups(prompt);
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
function validateScheduleConstraints(
  schedule: any[],
  teachers: any[],
  subjects: any[],
  rooms: any[],
  timeslots: any[],
) {
  const violations: string[] = [];
  const warnings: string[] = [];

  // Filter out non-subject entries (activities, meetings, homeroom)
  const subjectSchedule = schedule.filter(
    (s: any) =>
      s.subject !== "HOME ROOM" &&
      s.subject !== "MEETING" &&
      s.subject !== "ACTIVITY" &&
      s.type !== "Activity" &&
      s.type !== "Meeting",
  );

  // Constraint 1: จำนวนคาบต้องมีค่าเท่ากับจำนวน theory+practice ใน subject
  subjects.forEach((subj: any) => {
    const sId = subj.subject_id || subj.id || subj._id;
    const actual = subjectSchedule.filter(
      (s: any) => s.subject === sId || s.subject === String(sId),
    ).length;
    const expected = (subj.theory || 0) + (subj.practice || 0);
    if (actual !== expected) {
      violations.push(
        `❌ Constraint 1: ${subj.subject_name} (${sId}) has ${actual} periods (expected ${expected})`,
      );
    }
  });

  // Constraint 2: คาบ 5 ของทุกวันเป็นเวลาพัก (12:00-13:00)
  const period5Classes = schedule.filter((s: any) => s.period === 5);
  if (period5Classes.length > 0) {
    violations.push(
      `❌ Constraint 2: Found ${period5Classes.length} classes during break time (period 5)`,
    );
  }

  // ⚠️ NEW CONSTRAINT: ห้ามจัดคาบหลัง 18:00 (period > 10)
  const lateClasses = schedule.filter((s: any) => s.period > 10);
  if (lateClasses.length > 0) {
    violations.push(
      `❌ NO CLASSES AFTER 18:00: Found ${lateClasses.length} classes after 18:00 (period 11-12): ${lateClasses.map((s: any) => `${s.subjectName} (${s.day} P${s.period})`).join(", ")}`,
    );
  }

  // Constraint 3: จำนวนวิชาต้องเท่ากับจำนวนลงทะเบียน
  // (This is checked at generation time - subjects array should match registered subjects)
  const uniqueSubjects = new Set(subjectSchedule.map((s: any) => s.subject));
  if (uniqueSubjects.size !== subjects.length) {
    warnings.push(
      `⚠️ Constraint 3: Schedule has ${uniqueSubjects.size} unique subjects, expected ${subjects.length}`,
    );
  }

  // Constraint 4: จำนวนคาบรวมต้องเท่ากันจำนวนคาบของแต่ละวิชาที่ลงทะเบียนเรียนรวมกันทั้งหมด
  const totalExpectedPeriods = subjects.reduce(
    (sum: number, subj: any) => sum + (subj.theory || 0) + (subj.practice || 0),
    0,
  );
  const totalActualPeriods = subjectSchedule.length;
  if (totalActualPeriods !== totalExpectedPeriods) {
    violations.push(
      `❌ Constraint 4: Total periods mismatch: ${totalActualPeriods} actual vs ${totalExpectedPeriods} expected`,
    );
  }

  // Constraint 5: จำนวนคาบเรียนแต่ละวันต้องไม่เกิน 10 คาบ
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  days.forEach((day) => {
    const count = subjectSchedule.filter((s: any) => s.day === day).length;
    if (count > 10) {
      violations.push(`❌ Constraint 5: ${day} has ${count} periods (max 10)`);
    }
  });

  // Constraint 6: ครูสอนต้องไม่ชนกัน
  const teacherSlots = new Map<string, Set<string>>(); // teacher -> Set of "day-period"
  subjectSchedule.forEach((entry: any) => {
    const key = `${entry.day}-${entry.period}`;
    if (!teacherSlots.has(entry.teacher)) {
      teacherSlots.set(entry.teacher, new Set());
    }
    const slots = teacherSlots.get(entry.teacher)!;
    if (slots.has(key)) {
      violations.push(
        `❌ Constraint 6: Teacher ${entry.teacher} double-booked at ${entry.day} period ${entry.period}`,
      );
    }
    slots.add(key);
  });

  // Constraint 7: ห้องห้ามทับกัน
  const roomSlots = new Map<string, Set<string>>(); // room -> Set of "day-period"
  subjectSchedule.forEach((entry: any) => {
    const key = `${entry.day}-${entry.period}`;
    const roomId = entry.room;
    if (!roomSlots.has(roomId)) {
      roomSlots.set(roomId, new Set());
    }
    const slots = roomSlots.get(roomId)!;
    if (slots.has(key)) {
      violations.push(
        `❌ Constraint 7: Room ${roomId} double-booked at ${entry.day} period ${entry.period}`,
      );
    }
    slots.add(key);
  });

  // Constraint 8: ครูสอนเฉพาะในไฟล์ teach เท่านั้น (checked at generation time)

  // Helper: classify lab / theory room from room_type
  const isLabRoomType = (roomTypeRaw: any) => {
    const roomType = String(roomTypeRaw || "").toLowerCase();
    if (!roomType) return false;
    // นับเป็นห้องปฏิบัติ/แล็บ ถ้ามีคำว่า lab, แล็บ หรือ ปฏิบัติ
    return (
      roomType.includes("lab") ||
      roomType.includes("แล็บ") ||
      roomType.includes("ปฏิบัติ")
    );
  };

  // Constraint 9: รายวิชาทฤษฎี (theory) จะต้องใช้ห้องเรียนทฤษฎีเท่านั้น วิชาปฎิบัติ ต้องใช้ห้องปฎิบัติ (Practice/Lab) เท่านั้น
  subjectSchedule.forEach((entry: any) => {
    const room = rooms.find(
      (r: any) =>
        r.room_name === entry.room ||
        r.room_id === entry.room ||
        r._id === entry.room,
    );
    if (room) {
      const labRoom = isLabRoomType(room.room_type);
      if (entry.type === "Practice" && !labRoom) {
        violations.push(
          `❌ Constraint 9: Practice class "${entry.subjectName}" in NON-lab room "${entry.room}" (type: ${room.room_type})`,
        );
      }
      if (entry.type === "Lecture" && labRoom) {
        violations.push(
          `❌ Constraint 9: Theory class "${entry.subjectName}" scheduled in LAB room "${entry.room}" (type: ${room.room_type})`,
        );
      }
    }
  });

  // Constraint 10: หัวหน้าแผนก (Leader) ต้องมีประชุมประจำสัปดาห์ทุกวันอังคาร ในเวลา 15:00-16:00 (คาบ 8)
  const tue8Meeting = schedule.find(
    (s: any) =>
      s.day === "Tue" &&
      s.period === 8 &&
      (s.subject === "MEETING" || s.type === "Meeting"),
  );
  if (!tue8Meeting) {
    warnings.push(
      `⚠️ Constraint 10: No leader meeting scheduled on Tuesday period 8`,
    );
  }

  // Constraint 11: ในแต่ละสัปดาห์ต้องมีคาบโฮมรูม อย่างน้อย 1 ชม
  const homeroomCount = schedule.filter(
    (s: any) => s.subject === "HOME ROOM" || s.type === "Activity",
  ).length;
  if (homeroomCount === 0) {
    warnings.push(`⚠️ Constraint 11: No homeroom scheduled`);
  }

  // Constraint 12: รายกิจกรรมต้องถูกจัดลงทุกวันพุธ เวลา 15:00-17:00 (คาบ 8 - 9)
  const wedActivity = schedule.filter(
    (s: any) =>
      s.day === "Wed" &&
      (s.period === 8 || s.period === 9) &&
      (s.type === "Activity" || s.subject === "ACTIVITY"),
  );
  const wedRegular = subjectSchedule.filter(
    (s: any) => s.day === "Wed" && (s.period === 8 || s.period === 9),
  );
  if (wedRegular.length > 0) {
    violations.push(
      `❌ Constraint 12: Found ${wedRegular.length} regular classes during Wed activity time (periods 8-9)`,
    );
  }
  if (wedActivity.length < 2) {
    warnings.push(
      `⚠️ Constraint 12: Only ${wedActivity.length} activity periods scheduled on Wednesday (expected 2)`,
    );
  }

  // Constraint 13: วิชาสามัญ (20000/30000) ต้องถูกจัดเรียนร่วมกัน 2 กลุ่ม
  // Note: This requires coordination between groups during generation
  // For now, we check if general subjects are scheduled (validation per group)
  const generalSubjects = subjects.filter((s: any) => {
    const sId = String(s.subject_id || s.id || s._id);
    return (
      sId.startsWith("20000") ||
      sId.startsWith("30000") ||
      sId.match(/^2\d{4}/) ||
      sId.match(/^3\d{4}/)
    );
  });
  if (generalSubjects.length > 0) {
    const scheduledGeneral = subjectSchedule.filter((s: any) => {
      const sId = String(s.subject);
      return (
        sId.startsWith("20000") ||
        sId.startsWith("30000") ||
        sId.match(/^2\d{4}/) ||
        sId.match(/^3\d{4}/)
      );
    });
    if (scheduledGeneral.length > 0) {
      warnings.push(
        `⚠️ Constraint 13: ${scheduledGeneral.length} general subjects scheduled - ensure they are coordinated with other groups for joint classes`,
      );
    }
  }

  // Constraint 14: ห้องเรียน iot รายวิชา iot ต้องเรียนที่ห้อง iot lab(R6201) เท่านั้น
  const iotSubjects = subjectSchedule.filter((s: any) => {
    const sId = s.subject?.toLowerCase() || "";
    const sName = s.subjectName?.toLowerCase() || "";
    return sId.includes("iot") || sName.includes("iot");
  });
  iotSubjects.forEach((entry: any) => {
    if (
      entry.room !== "R6201" &&
      !entry.room?.includes("R6201") &&
      !entry.room?.toLowerCase().includes("iot")
    ) {
      violations.push(
        `❌ Constraint 14: IoT subject "${entry.subjectName}" not in IoT Lab (R6201), found in "${entry.room}"`,
      );
    }
  });

  // Constraint 15: หลีกเลี่ยงการจัดวิชาทฤษฎีหลังคาบที่ 9 (หลัง 17:00)
  const lateTheory = subjectSchedule.filter(
    (s: any) => s.type === "Lecture" && s.period >= 9,
  );
  if (lateTheory.length > 0) {
    warnings.push(
      `⚠️ Constraint 15: ${lateTheory.length} theory classes scheduled after 17:00 (period 9+): ${lateTheory.map((s: any) => `${s.subjectName} (${s.day} P${s.period})`).join(", ")}`,
    );
  }

  return {
    passed: violations.length === 0,
    violations,
    warnings,
    summary:
      violations.length === 0
        ? `✅ ผ่านการตรวจสอบทั้งหมด (${warnings.length} warnings)`
        : `❌ พบข้อผิดพลาด ${violations.length} รายการ`,
  };
}

// ============================================
// 🆕 สร้างตารางแยกตาม StudentGroup
// ============================================
async function generateSchedulesForAllGroups(prompt: string) {
  const client = await clientPromise;
  const db = client.db("autotable");

  // 1. ดึงข้อมูล StudentGroups ทั้งหมด
  const groups = await db.collection("StudentGroup").find({}).toArray();

  if (groups.length === 0) {
    return NextResponse.json(
      {
        error: "❌ ไม่พบกลุ่มนักเรียนในฐานข้อมูล กรุณาเพิ่ม StudentGroup ก่อน",
        suggestion: "ใช้ import_excel.ts เพื่อนำเข้าข้อมูลจากไฟล์ Excel",
      },
      { status: 400 },
    );
  }

  console.log(`📚 Found ${groups.length} student groups`);

  // 2. สร้างตารางสำหรับแต่ละ Group
  const groupSchedules = [];

  for (const group of groups) {
    console.log(
      `\n🎓 Generating schedule for ${group.group_name} (${group.group_id})`,
    );

    const groupSchedule = await generateScheduleForGroup(db, group);
    groupSchedules.push(groupSchedule);
  }

  // 3. Return ตารางทั้งหมด
  const totalFailed = groupSchedules.reduce(
    (sum, gs) => sum + (gs.failedTasks?.length || 0),
    0,
  );

  return NextResponse.json({
    message: `✅ สร้างตารางสำเร็จ ${groupSchedules.length} กลุ่ม${totalFailed > 0 ? ` (มี ${totalFailed} คาบที่จัดไม่ได้)` : ""}`,
    groups: groupSchedules.map((gs) => ({
      group_id: gs.group_id,
      group_name: gs.group_name,
      totalClasses: gs.schedule.length,
      failedTasks: gs.failedTasks?.length || 0,
    })),
    result: groupSchedules,
    summary: {
      totalGroups: groupSchedules.length,
      totalFailedTasks: totalFailed,
      groupsWithFailures: groupSchedules.filter(
        (gs) => (gs.failedTasks?.length || 0) > 0,
      ).length,
    },
  });
}

// ============================================
// 🎯 สร้างตารางสำหรับ 1 Group
// ============================================
async function generateScheduleForGroup(db: any, group: any) {
  const { group_id, group_name, advisor } = group;

  // 1. ดึงข้อมูลทั่วไป
  const [teachers, rooms, timeslots] = await Promise.all([
    db.collection("Teacher").find({}).toArray(),
    db.collection("Room").find({}).toArray(),
    db.collection("Timeslot").find({}).sort({ period: 1 }).toArray(),
  ]);

  // 2. ดึงวิชาที่ Group นี้ลงทะเบียน
  const registers = await db
    .collection("Register")
    .find({ group_id })
    .toArray();
  const subjectIds = registers.map((r: any) => r.subject_id);

  const subjectsRaw = await db
    .collection("Subject")
    .find({
      subject_id: { $in: subjectIds },
    })
    .toArray();

  // ⚠️ CRITICAL FIX: Remove duplicate subjects by subject_id
  // CSV data may have duplicates, so we need to deduplicate before creating tasks
  const subjectsMap = new Map();
  subjectsRaw.forEach((subj: any) => {
    const key = subj.subject_id || subj.id || subj._id;
    if (!subjectsMap.has(key)) {
      subjectsMap.set(key, subj);
    }
  });
  const subjects = Array.from(subjectsMap.values());

  console.log(
    `   📖 ${group_name} registered ${subjectsRaw.length} subjects (${subjects.length} unique after dedup)`,
  );

  // 3. เรียกใช้ logic เดิมในการสร้างตารางด:\Projects\autotable2\app\api\generate\route.ts (แต่ส่ง subjects ที่กรองแล้ว)
  const scheduleData = await generateScheduleLogic({
    db,
    teachers,
    subjects,
    rooms,
    timeslots,
    groupInfo: { group_id, group_name, advisor },
  });

  return {
    group_id,
    group_name,
    advisor,
    schedule: scheduleData.schedule,
    validation: scheduleData.validation,
    stats: scheduleData.stats,
    failedTasks: scheduleData.failedTasks || [], // Include failed tasks
  };
}

// ============================================
// ============================================
// 🎯 Core Schedule Generation Logic (Reusable)
// ============================================
async function generateScheduleLogic(params: {
  db: any;
  teachers: any[];
  subjects: any[];
  rooms: any[];
  timeslots: any[];
  groupInfo?: { group_id: string; group_name: string; advisor: string };
}) {
  const { db, teachers, subjects, rooms, timeslots, groupInfo } = params;

  // 2. เตรียม Grid ตารางเรียน (5 วัน x 10 คาบ)
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];

  // ⚠️ CRITICAL: Maximum period is 10 (until 18:00) - ห้ามจัดหลัง 6 โมงเย็น
  // แม้ว่า timeslots จะมี 12 คาบ แต่เราจัดได้แค่ถึงคาบ 10
  const MAX_ALLOWED_PERIOD = 10;

  const maxPeriods =
    timeslots.length > 0
      ? Math.min(
          Math.max(...timeslots.map((t: any) => t.period)),
          MAX_ALLOWED_PERIOD,
        )
      : MAX_ALLOWED_PERIOD;

  console.log(
    `✅ Using Max Periods: ${maxPeriods} (limit to period ${MAX_ALLOWED_PERIOD} - until 18:00)`,
  );

  // โครงสร้าง Schedule ที่จะ Return
  const schedule: any[] = [];

  // ตัวช่วยเช็ค Resource Usage (เพื่อป้องกันชนกัน)
  const busyTeachers = new Set<string>(); // key: "TeacherID-Day-Period"
  const busyRooms = new Set<string>(); // key: "RoomID-Day-Period"
  const busyGroups = new Set<string>(); // key: "Year-Day-Period" (สมมติแยกตามชั้นปี)

  // Track failed tasks
  const failedTasks: any[] = [];

  // 🔧 FIX: Track room usage to ensure fair distribution
  const roomUsage = new Map<string, number>(); // room_id -> usage count
  rooms.forEach((r: any) => {
    const roomId = r.room_id || r._id;
    roomUsage.set(roomId, 0);
  });

  const markBusy = (
    teacherId: string,
    roomId: string,
    year: number | string,
    day: string,
    period: number,
  ) => {
    busyTeachers.add(`${teacherId}-${day}-${period}`);
    busyRooms.add(`${roomId}-${day}-${period}`);
    busyGroups.add(`${year}-${day}-${period}`);
  };

  const isFree = (
    teacherId: string,
    roomId: string,
    year: number | string,
    day: string,
    period: number,
  ) => {
    if (busyTeachers.has(`${teacherId}-${day}-${period}`)) return false;
    if (busyRooms.has(`${roomId}-${day}-${period}`)) return false;
    if (busyGroups.has(`${year}-${day}-${period}`)) return false;
    return true;
  };

  // 3. ลงตาราง Block บังคับ (Fixed Constraints) + แสดงใน Schedule

  // 3.1 พักเที่ยง (คาบ 5) - Block ทุกคน (ไม่แสดงในตาราง)
  days.forEach((day) => {
    // ไม่ใส่ในตาราง เพียงแต่ skip ในการจัดวิชา
  });

  // 3.2 🏫 Homeroom (วันจันทร์ คาบ 1)
  // ปกติโรงเรียนจะมี Homeroom คาบแรกวันจันทร์
  const homeroomSlot = timeslots.find((t: any) => t.period === 1);
  const homeroomTime = homeroomSlot
    ? `${homeroomSlot.start}-${homeroomSlot.end}`
    : "Period 1";

  // ใช้ advisor ของ group (ถ้ามี) หรือใช้ชื่อทั่วไป
  const advisorName = groupInfo?.advisor || "ครูที่ปรึกษา";

  schedule.push({
    subject: "HOME ROOM",
    subjectName: "ชั้นเรียน (Homeroom)",
    teacher: advisorName,
    room: "ห้องเรียน",
    day: "Mon",
    period: 1,
    slotNo: 1,
    time: homeroomTime,
    type: "Activity",
  });

  // Mark busy to prevent scheduling conflicts
  markBusy("HOMEROOM", "HOMEROOM_ROOM", "ALL", "Mon", 1);

  // 3.3 🎨 กิจกรรม (พุธ คาบ 8-9)
  // Constraint 12: รายกิจกรรมต้องถูกจัดลงทุกวันพุธ เวลา 15:00-17:00 (คาบ 8 - 9)
  // ค้นหาวิชากิจกรรมจาก Database แทนการ Hardcode
  const activitySubjects = subjects.filter((s: any) => {
    const name = s.subject_name?.toLowerCase() || "";
    return (
      name.includes("กิจกรรม") ||
      name.includes("ลูกเสือ") ||
      name.includes("เนตรนารี") ||
      name.includes("ชุมนุม")
    );
  });

  console.log(
    `📋 Found ${activitySubjects.length} activity subjects for Wednesday slots`,
  );

  if (activitySubjects.length > 0) {
    // ⚠️ CRITICAL FIX: Always use periods 8-9 for activities (2 consecutive hours)
    // Each activity subject gets 2 consecutive periods
    const activityPeriods = [8, 9];

    // Take only the first activity subject and give it both periods 8 and 9
    const activitySubj = activitySubjects[0];

    for (let period of activityPeriods) {
      const activitySlot = timeslots.find((t: any) => t.period === period);
      const activityTime = activitySlot
        ? `${activitySlot.start}-${activitySlot.end}`
        : `Period ${period}`;

      // หาครูที่สอนวิชากิจกรรมนี้
      const activityTeachRelation = await db
        .collection("Teach")
        .findOne({ subject_id: activitySubj.subject_id });
      const activityTeacher = activityTeachRelation
        ? teachers.find(
            (t: any) =>
              t.teacher_id === activityTeachRelation.teacher_id ||
              t.id === activityTeachRelation.teacher_id,
          )
        : null;

      schedule.push({
        subject: activitySubj.subject_id,
        subjectName: activitySubj.subject_name,
        teacher: activityTeacher
          ? activityTeacher.teacher_name
          : "ครูประจำกิจกรรม",
        room: "สนามกีฬา/ห้องกิจกรรม",
        day: "Wed",
        period: period,
        slotNo: period,
        time: activityTime,
        type: "Activity",
      });

      // Block all resources for this activity
      markBusy("ACTIVITY", "ACTIVITY_AREA", "ALL", "Wed", period);
    }

    console.log(
      `   ✅ Scheduled activity "${activitySubj.subject_name}" on Wed periods 8-9 (2 consecutive hours)`,
    );
  } else {
    // Fallback: ถ้าไม่มีวิชากิจกรรมในฐานข้อมูล ใช้ Hardcode เดิม
    [8, 9].forEach((period) => {
      const activitySlot = timeslots.find((t: any) => t.period === period);
      const activityTime = activitySlot
        ? `${activitySlot.start}-${activitySlot.end}`
        : `Period ${period}`;

      schedule.push({
        subject: "ACTIVITY",
        subjectName: period === 8 ? "กิจกรรมลูกเสือ/เนตรนารี" : "กิจกรรมชุมนุม",
        teacher: "ครูประจำกิจกรรม",
        room: "สนามกีฬา/ห้องกิจกรรม",
        day: "Wed",
        period: period,
        slotNo: period,
        time: activityTime,
        type: "Activity",
      });

      // Block all resources for this activity
      markBusy("ACTIVITY", "ACTIVITY_AREA", "ALL", "Wed", period);
    });
  }

  // 3.4 📋 ประชุมหัวหน้าแผนก (อังคาร คาบ 8)
  // Constraint 10: หัวหน้าแผนก (Leader) ประชุม อังคาร 15:00-16:00 (คาบ 8)
  const meetingSlot = timeslots.find((t: any) => t.period === 8);
  const meetingTime = meetingSlot
    ? `${meetingSlot.start}-${meetingSlot.end}`
    : "Period 8";

  schedule.push({
    subject: "MEETING",
    subjectName: "ประชุมหัวหน้าแผนก",
    teacher: "หัวหน้าแผนกทุกท่าน",
    room: "ห้องประชุม",
    day: "Tue",
    period: 8,
    slotNo: 8,
    time: meetingTime,
    type: "Meeting",
  });

  // Block leaders for this meeting
  const leaders = teachers.filter(
    (t: any) =>
      t.role === "Head" ||
      t.role === "Manager" ||
      t.unavailable?.includes("Manager"),
  );
  leaders.forEach((leader: any) => {
    markBusy(leader.id || leader.teacher_id, "MEETING_ROOM", "ALL", "Tue", 8);
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

    // ⚠️ CRITICAL FIX: Skip activity subjects - they're already scheduled on Wednesday
    const subjName = subj.subject_name?.toLowerCase() || "";
    const isActivity =
      subjName.includes("กิจกรรม") ||
      subjName.includes("ลูกเสือ") ||
      subjName.includes("เนตรนารี") ||
      subjName.includes("ชุมนุม");

    if (isActivity) {
      console.log(
        `   ⏭️  SKIP: ${subj.subject_name} (Activity - already scheduled on Wed)`,
      );
      return; // Skip this subject entirely
    }

    // Constraint 13: วิชาสามัญ (20000/30000) เรียนรวม 2 กลุ่ม -> ถือเป็น 1 Task ใหญ่ (ใช้ห้องใหญ่)
    // Note: Full coordination between groups requires multi-group scheduling,
    // but we'll prefer larger rooms for general subjects
    const sIdStr = String(sId);
    const isGeneral =
      sIdStr.startsWith("20000") ||
      sIdStr.startsWith("30000") ||
      sIdStr.startsWith("S2") ||
      sIdStr.startsWith("S3") ||
      sIdStr.match(/^2\d{4}/) ||
      sIdStr.match(/^3\d{4}/);

    // Constraint 9: Theory -> Lecture Room, Practice -> Practice Room
    // Create Theory Tasks
    for (let i = 0; i < (subj.theory || 0); i++) {
      tasks.push({
        ...subj,
        id: sIdStr, // Enforce ID
        type: "Lecture",
        taskId: `${sIdStr}-L-${i}`,
        reqLab: false,
        isGeneral,
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
        isGeneral,
      });
    }
  });

  // Group tasks by subject and type for consecutive scheduling
  const taskGroups = new Map<string, any[]>();
  tasks.forEach((task) => {
    const key = `${task.id}-${task.type}`;
    if (!taskGroups.has(key)) {
      taskGroups.set(key, []);
    }
    taskGroups.get(key)!.push(task);
  });

  // Sort task groups by priority
  const sortedGroups = Array.from(taskGroups.entries()).sort(
    ([keyA, tasksA], [keyB, tasksB]) => {
      const a = tasksA[0];
      const b = tasksB[0];
      const aId = a.id?.toLowerCase() || "";
      const bId = b.id?.toLowerCase() || "";

      // Theory classes should be scheduled first (they have period 9+ restriction)
      if (a.type === "Lecture" && b.type === "Practice") return -1;
      if (a.type === "Practice" && b.type === "Lecture") return 1;

      // IoT subjects need specific room
      if (aId.includes("iot") && !bId.includes("iot")) return -1;
      if (!aId.includes("iot") && bId.includes("iot")) return 1;

      // General subjects prefer larger rooms
      if (a.isGeneral && !b.isGeneral) return -1;
      if (!a.isGeneral && b.isGeneral) return 1;

      // Prefer groups with more tasks (easier to schedule consecutively)
      return tasksB.length - tasksA.length;
    },
  );

  // Flatten back to tasks array, keeping groups together
  const sortedTasks: any[] = [];
  sortedGroups.forEach(([_, groupTasks]) => {
    sortedTasks.push(...groupTasks);
  });
  tasks = sortedTasks;

  // Helper: Count periods per day (excluding activities/meetings)
  const getDayPeriodCount = (day: string) => {
    return schedule.filter(
      (s: any) =>
        s.day === day &&
        s.type !== "Activity" &&
        s.type !== "Meeting" &&
        s.subject !== "HOME ROOM",
    ).length;
  };

  // Helper: Check if slot is available considering all constraints
  const isSlotAvailable = (
    day: string,
    period: number,
    task: any,
    allowLateTheory: boolean = false,
  ) => {
    // ⚠️ NEW CONSTRAINT: ห้ามจัดหลัง 18:00 (คาบ 10+) - STRICT
    if (period > 10) {
      return false;
    }

    // Constraint 2: คาบ 5 พัก (12:00-13:00) - STRICT
    if (period === 5) return false;

    // Constraint 5: Max 10 periods per day - STRICT
    if (getDayPeriodCount(day) >= 10) return false;

    // Constraint 12: พุธ คาบ 8-9 กิจกรรม - STRICT
    if (day === "Wed" && (period === 8 || period === 9)) return false;

    // Constraint 10: อังคาร คาบ 8 ประชุมหัวหน้าแผนก - STRICT
    if (day === "Tue" && period === 8) return false;

    // Constraint 15: หลีกเลี่ยง Theory หลัง 17:00 (คาบ 9+)
    // Allow if allowLateTheory is true (for retry after initial attempt)
    if (task.type === "Lecture" && period >= 9 && !allowLateTheory)
      return false;

    return true;
  };

  console.log(`\n📊 Starting schedule generation:`);
  console.log(`   Total tasks to schedule: ${tasks.length}`);
  console.log(
    `   Theory tasks: ${tasks.filter((t) => t.type === "Lecture").length}`,
  );
  console.log(
    `   Practice tasks: ${tasks.filter((t) => t.type === "Practice").length}`,
  );
  console.log(`   Available rooms: ${rooms.length}`);
  console.log(`   Available teachers: ${teachers.length}`);
  console.log(`   Max periods per day: ${maxPeriods}\n`);

  // Track how many periods have been scheduled for each subject+type
  const scheduledPeriods = new Map<string, number>(); // key: "subjectId-type" -> count

  // Helper: Check if we've already scheduled enough periods for this subject+type
  const getScheduledCount = (subjectId: string, type: string) => {
    const key = `${subjectId}-${type}`;
    return scheduledPeriods.get(key) || 0;
  };

  const incrementScheduledCount = (subjectId: string, type: string) => {
    const key = `${subjectId}-${type}`;
    scheduledPeriods.set(key, (scheduledPeriods.get(key) || 0) + 1);
  };

  const getExpectedCount = (subjectId: string, type: string) => {
    const subject = subjects.find(
      (s) => (s.subject_id || s.id || s._id) === subjectId,
    );
    if (!subject) return 0;
    return type === "Lecture" ? subject.theory || 0 : subject.practice || 0;
  };

  // 5. Improved Greedy Allocation with Consecutive Period Support
  let currentTaskIndex = 0;
  while (currentTaskIndex < tasks.length) {
    const task = tasks[currentTaskIndex];
    let assigned = false;

    // CRITICAL FIX: Skip if we've already scheduled enough periods for this subject+type
    const subjectId = task.id;
    const taskType = task.type;
    const expectedForThisType = getExpectedCount(subjectId, taskType);
    const alreadyScheduled = getScheduledCount(subjectId, taskType);

    if (alreadyScheduled >= expectedForThisType) {
      console.log(
        `   ✅ SKIP: ${task.subject_name} (${taskType}) already has ${alreadyScheduled}/${expectedForThisType} periods scheduled`,
      );
      currentTaskIndex++;
      continue;
    }

    // Helper: Check if consecutive periods are available (defined inside loop to access task.year)
    const findConsecutiveSlots = (
      day: string,
      startPeriod: number,
      count: number,
      task: any,
      teacherId: string,
      roomId: string,
      allowLateTheory: boolean,
      year: number | string,
    ): boolean => {
      for (let i = 0; i < count; i++) {
        const period = startPeriod + i;
        if (!isSlotAvailable(day, period, task, allowLateTheory)) return false;
        if (!isFree(teacherId, roomId, year, day, period)) return false;
      }
      return true;
    };

    // หาครูที่สอนวิชานี้
    console.log(
      `\n🔍 Task ${currentTaskIndex + 1}/${tasks.length}: ${task.id} (${task.subject_name}) - ${task.type}`,
    );

    // Check if task.id is valid
    if (!task.id) {
      console.error("   ❌ Task is missing ID!", task);
      currentTaskIndex++;
      continue;
    }
    const teachRelations = await db
      .collection("Teach")
      .find({ subject_id: task.id })
      .toArray();
    let validTeachers = teachRelations.map((tr: any) => tr.teacher_id);

    if (validTeachers.length === 0) {
      console.warn(`   ⚠️ No teacher assigned - skipping`);
      failedTasks.push({
        taskId: task.taskId,
        subject_id: task.id,
        subject_name: task.subject_name,
        type: task.type,
        reason: "ไม่มีครูสอนวิชานี้ในระบบ (No Teacher Assigned in DB)",
      });
      currentTaskIndex++;
      continue;
    }
    console.log(`   👨‍🏫 Teachers: ${validTeachers.join(", ")}`);

    // Find how many consecutive tasks of the same subject+type THAT STILL NEED TO BE SCHEDULED
    let consecutiveCount = 0;
    const remainingToSchedule = expectedForThisType - alreadyScheduled;

    for (
      let i = currentTaskIndex;
      i < tasks.length && consecutiveCount < remainingToSchedule;
      i++
    ) {
      if (tasks[i].id === task.id && tasks[i].type === task.type) {
        consecutiveCount++;
      } else {
        break;
      }
    }

    console.log(
      `   📚 Need to schedule: ${consecutiveCount} more periods (${alreadyScheduled}/${expectedForThisType} already done)`,
    );

    if (consecutiveCount === 0) {
      console.log(
        `   ✅ All periods for ${task.subject_name} (${taskType}) already scheduled`,
      );
      currentTaskIndex++;
      continue;
    }

    // Constraint 14: IoT Subject @ Room R6201 Only
    let validRooms = rooms;
    const taskIdLower = task.id?.toLowerCase() || "";
    const taskNameLower = task.subject_name?.toLowerCase() || "";

    if (taskIdLower.includes("iot") || taskNameLower.includes("iot")) {
      const iotRoom = rooms.find((r: any) => {
        const roomId = r.room_id || r._id;
        return (
          roomId === "R6201" ||
          r.room_name?.toLowerCase().includes("iot") ||
          r.room_name === "IoT Lab"
        );
      });
      if (!iotRoom) {
        console.warn(`   ⚠️ IoT room (R6201) not found`);
        failedTasks.push({
          taskId: task.taskId,
          subject_id: task.id,
          subject_name: task.subject_name,
          reason: "IoT Lab (R6201) not available",
        });
        continue;
      }
      validRooms = [iotRoom];
    } else {
      // Filter by Type
      // Constraint 9: Theory -> Theory Room, Practice -> Practice/Lab Room
      validRooms = rooms.filter((r: any) => {
        const roomTypeRaw = r.room_type || "";
        const roomType = String(roomTypeRaw).toLowerCase();

        // ห้องปฏิบัติ/แล็บ: มีคำว่า lab, แล็บ หรือ ปฏิบัติ
        const isLabRoom =
          roomType.includes("lab") ||
          roomType.includes("แล็บ") ||
          roomType.includes("ปฏิบัติ");

        if (task.reqLab) {
          // ต้องเป็นห้องปฏิบัติ/แล็บ เท่านั้น
          return isLabRoom;
        }
        // ทฤษฎี: หลีกเลี่ยงห้องแล็บ
        return !isLabRoom;
      });

      // Constraint 13: General subjects prefer larger rooms (for multi-group classes)
      if (task.isGeneral && validRooms.length > 1) {
        // Prefer rooms with larger capacity (if available in room data)
        // For now, just ensure we have theory rooms available
        validRooms = validRooms.filter((r: any) => {
          const roomType = r.room_type || "";
          return roomType !== "Practice" && roomType !== "Lab";
        });
      }
    }

    if (validRooms.length === 0) {
      console.warn(`   ⚠️ No valid rooms for ${task.type} type`);
      console.warn(
        `   Required: ${task.reqLab ? "Practice/Lab" : "Theory"} rooms`,
      );
      console.warn(
        `   Available rooms: ${rooms.map((r) => `${r.room_id}(${r.room_type})`).join(", ")}`,
      );
      failedTasks.push({
        taskId: task.taskId,
        subject_id: task.id,
        subject_name: task.subject_name,
        reason: `No ${task.reqLab ? "Practice/Lab" : "Theory"} rooms available (found ${rooms.length} total rooms)`,
      });
      continue;
    }
    console.log(
      `   🏫 Valid rooms: ${validRooms.length} (${validRooms.map((r) => r.room_id || r._id).join(", ")})`,
    );

    const year = task.recommendedYear || 1;

    // Try twice: first without late theory, then allow late theory if needed
    const attempts = [
      { allowLateTheory: false, description: "normal" },
      { allowLateTheory: true, description: "with late theory allowed" },
    ];

    for (const attempt of attempts) {
      if (assigned) break;

      // Strategy 1: Try to schedule ALL periods consecutively first (PREFERRED)
      if (consecutiveCount > 1) {
        console.log(
          `   🎯 Strategy 1: Try consecutive scheduling (${consecutiveCount} periods)`,
        );

        // ⚠️ LOAD BALANCING: Sort days by current load (fewer periods = higher priority)
        const daysByLoad = [...days].sort((a, b) => {
          const countA = getDayPeriodCount(a);
          const countB = getDayPeriodCount(b);
          return countA - countB; // Days with fewer periods first
        });

        for (const day of daysByLoad) {
          if (assigned) break;

          for (
            let startPeriod = 1;
            startPeriod <= maxPeriods - consecutiveCount + 1;
            startPeriod++
          ) {
            if (assigned) break;
            if (
              !isSlotAvailable(day, startPeriod, task, attempt.allowLateTheory)
            )
              continue;

            // Try each teacher
            for (const tid of validTeachers) {
              if (assigned) break;

              // Find rooms available for all consecutive periods
              const availableRooms = validRooms.filter((room: any) => {
                const roomId = room.room_id || room._id;
                return findConsecutiveSlots(
                  day,
                  startPeriod,
                  consecutiveCount,
                  task,
                  tid,
                  roomId,
                  attempt.allowLateTheory,
                  year,
                );
              });

              if (availableRooms.length > 0) {
                // Sort by usage and pick least used
                availableRooms.sort((a: any, b: any) => {
                  const aId = a.room_id || a._id;
                  const bId = b.room_id || b._id;
                  return (roomUsage.get(aId) || 0) - (roomUsage.get(bId) || 0);
                });
                const pickedRoom = availableRooms[0];
                const pickedRoomId = pickedRoom.room_id || pickedRoom._id;
                const tObj = teachers.find(
                  (t: any) =>
                    t.teacher_id === tid || t.id === tid || t._id === tid,
                );

                // Assign all consecutive periods
                for (let i = 0; i < consecutiveCount; i++) {
                  const period = startPeriod + i;
                  markBusy(tid, pickedRoomId, year, day, period);

                  const ts = timeslots.find((t: any) => t.period === period);
                  const timeStr = ts
                    ? `${ts.start}-${ts.end}`
                    : `Period ${period}`;

                  schedule.push({
                    subject: task.id,
                    subjectName: task.subject_name,
                    teacher: tObj ? tObj.teacher_name : tid,
                    room: pickedRoom.room_name || pickedRoomId,
                    day: day,
                    period: period,
                    slotNo: period,
                    time: timeStr,
                    type: task.type,
                  });

                  roomUsage.set(
                    pickedRoomId,
                    (roomUsage.get(pickedRoomId) || 0) + 1,
                  );
                  incrementScheduledCount(task.id, task.type); // Track scheduled periods
                }

                assigned = true;
                console.log(
                  `   ✅ Assigned CONSECUTIVE: ${day} P${startPeriod}-${startPeriod + consecutiveCount - 1} (${consecutiveCount} periods) - ${tObj?.teacher_name || tid} @ ${pickedRoom.room_name || pickedRoomId}`,
                );
                currentTaskIndex += consecutiveCount; // Skip all assigned tasks
                break;
              }
            }
          }
        }

        // Strategy 2: If consecutive failed, try PARTIAL consecutive (e.g., 2+2 for 4 periods)
        if (!assigned && consecutiveCount >= 3) {
          console.log(
            `   🎯 Strategy 2: Try partial consecutive scheduling (split into smaller blocks)`,
          );

          // Try to split into blocks of 2-3 periods
          const blockSizes =
            consecutiveCount === 4
              ? [2, 2]
              : consecutiveCount === 5
                ? [3, 2]
                : consecutiveCount === 6
                  ? [3, 3]
                  : [2, 2]; // default

          let blockIndex = 0;
          let remainingToSchedule = consecutiveCount;
          let tempScheduled = 0;

          for (const blockSize of blockSizes) {
            if (remainingToSchedule === 0) break;
            const currentBlockSize = Math.min(blockSize, remainingToSchedule);

            // ⚠️ LOAD BALANCING: Sort days by current load for each block
            const daysByLoad = [...days].sort((a, b) => {
              const countA = getDayPeriodCount(a);
              const countB = getDayPeriodCount(b);
              return countA - countB; // Days with fewer periods first
            });

            // Try to find consecutive slots for this block
            let blockAssigned = false;
            for (const day of daysByLoad) {
              if (blockAssigned) break;

              for (
                let startPeriod = 1;
                startPeriod <= maxPeriods - currentBlockSize + 1;
                startPeriod++
              ) {
                if (blockAssigned) break;
                if (
                  !isSlotAvailable(
                    day,
                    startPeriod,
                    task,
                    attempt.allowLateTheory,
                  )
                )
                  continue;

                for (const tid of validTeachers) {
                  if (blockAssigned) break;

                  const availableRooms = validRooms.filter((room: any) => {
                    const roomId = room.room_id || room._id;
                    return findConsecutiveSlots(
                      day,
                      startPeriod,
                      currentBlockSize,
                      task,
                      tid,
                      roomId,
                      attempt.allowLateTheory,
                      year,
                    );
                  });

                  if (availableRooms.length > 0) {
                    availableRooms.sort((a: any, b: any) => {
                      const aId = a.room_id || a._id;
                      const bId = b.room_id || b._id;
                      return (
                        (roomUsage.get(aId) || 0) - (roomUsage.get(bId) || 0)
                      );
                    });
                    const pickedRoom = availableRooms[0];
                    const pickedRoomId = pickedRoom.room_id || pickedRoom._id;
                    const tObj = teachers.find(
                      (t: any) =>
                        t.teacher_id === tid || t.id === tid || t._id === tid,
                    );

                    for (let i = 0; i < currentBlockSize; i++) {
                      const period = startPeriod + i;
                      markBusy(tid, pickedRoomId, year, day, period);

                      const ts = timeslots.find(
                        (t: any) => t.period === period,
                      );
                      const timeStr = ts
                        ? `${ts.start}-${ts.end}`
                        : `Period ${period}`;

                      schedule.push({
                        subject: task.id,
                        subjectName: task.subject_name,
                        teacher: tObj ? tObj.teacher_name : tid,
                        room: pickedRoom.room_name || pickedRoomId,
                        day: day,
                        period: period,
                        slotNo: period,
                        time: timeStr,
                        type: task.type,
                      });

                      roomUsage.set(
                        pickedRoomId,
                        (roomUsage.get(pickedRoomId) || 0) + 1,
                      );
                      incrementScheduledCount(task.id, task.type);
                    }

                    blockAssigned = true;
                    tempScheduled += currentBlockSize;
                    remainingToSchedule -= currentBlockSize;
                    console.log(
                      `   ✅ Assigned BLOCK ${blockIndex + 1}: ${day} P${startPeriod}-${startPeriod + currentBlockSize - 1} (${currentBlockSize}/${consecutiveCount} periods)`,
                    );
                    break;
                  }
                }
              }
            }

            if (!blockAssigned) {
              console.log(
                `   ⚠️ Could not find slot for block ${blockIndex + 1} (size ${currentBlockSize})`,
              );
              break;
            }
            blockIndex++;
          }

          if (tempScheduled === consecutiveCount) {
            assigned = true;
            currentTaskIndex += consecutiveCount;
            console.log(
              `   ✅ Successfully scheduled all ${consecutiveCount} periods in ${blockIndex} blocks`,
            );
          } else if (tempScheduled > 0) {
            // Partial success - mark remaining as failed
            const remaining = consecutiveCount - tempScheduled;
            console.warn(
              `   ⚠️ Only scheduled ${tempScheduled}/${consecutiveCount} periods. ${remaining} periods failed.`,
            );
            for (let i = tempScheduled; i < consecutiveCount; i++) {
              const remainingTask = tasks[currentTaskIndex + i];
              if (remainingTask) {
                failedTasks.push({
                  taskId: remainingTask.taskId,
                  subject_id: remainingTask.id,
                  subject_name: remainingTask.subject_name,
                  type: remainingTask.type,
                  reason: `จัดได้เพียง ${tempScheduled}/${consecutiveCount} คาบ (แบ่งเป็น ${blockIndex} กลุ่ม)`,
                });
              }
            }
            assigned = true;
            currentTaskIndex += consecutiveCount;
          }
        }
      }

      // Strategy 3: If still not assigned, try individual slots (FALLBACK)
      // IMPORTANT: Must schedule ALL consecutive tasks, not just one!
      if (!assigned) {
        console.log(
          `   🎯 Strategy 3: Try individual slot scheduling (need ${consecutiveCount} periods)`,
        );

        // Try to schedule all consecutive tasks individually
        let scheduledCount = 0;
        let tempTaskIndex = currentTaskIndex;

        // Try to schedule each task in the consecutive group
        for (let taskOffset = 0; taskOffset < consecutiveCount; taskOffset++) {
          const currentTaskToSchedule = tasks[tempTaskIndex + taskOffset];
          if (!currentTaskToSchedule) break;

          // Create list of all possible slots sorted by preference WITH LOAD BALANCING
          const slotCandidates: Array<{
            day: string;
            period: number;
            priority: number;
          }> = [];

          for (const day of days) {
            const currentDayLoad = getDayPeriodCount(day);

            for (let period = 1; period <= maxPeriods; period++) {
              if (
                isSlotAvailable(
                  day,
                  period,
                  currentTaskToSchedule,
                  attempt.allowLateTheory,
                )
              ) {
                // ⚠️ LOAD BALANCING: Priority based on day load + period preference
                let priority = currentDayLoad * 100; // Lower day load = higher priority

                if (currentTaskToSchedule.type === "Lecture") {
                  priority += period; // Prefer earlier periods for theory
                } else {
                  priority += 100 - period; // Practice can be later
                }
                slotCandidates.push({ day, period, priority });
              }
            }
          }

          // Sort by priority (lower = better, because we add day load which should be minimized)
          slotCandidates.sort((a, b) => a.priority - b.priority);

          // Try each slot candidate for this task
          let taskAssigned = false;
          for (const slot of slotCandidates) {
            if (taskAssigned) break;

            // Try each teacher
            for (const tid of validTeachers) {
              if (taskAssigned) break;

              // Check if teacher is free
              if (!isFree(tid, "ANY", year, slot.day, slot.period)) {
                continue;
              }

              // Find available rooms for this teacher
              const availableRooms = validRooms.filter((room: any) => {
                const roomId = room.room_id || room._id;
                return isFree(tid, roomId, year, slot.day, slot.period);
              });

              if (availableRooms.length > 0) {
                // Sort by usage count (ascending) and pick the least used
                availableRooms.sort((a: any, b: any) => {
                  const aId = a.room_id || a._id;
                  const bId = b.room_id || b._id;
                  return (roomUsage.get(aId) || 0) - (roomUsage.get(bId) || 0);
                });
                const pickedRoom = availableRooms[0];
                const pickedRoomId = pickedRoom.room_id || pickedRoom._id;

                // Assign!
                markBusy(tid, pickedRoomId, year, slot.day, slot.period);

                // หา Teacher Name/Room Name
                const tObj = teachers.find(
                  (t: any) =>
                    t.teacher_id === tid || t.id === tid || t._id === tid,
                );

                // Map period to Time
                const ts = timeslots.find((t: any) => t.period === slot.period);
                const timeStr = ts
                  ? `${ts.start}-${ts.end}`
                  : `Period ${slot.period}`;

                schedule.push({
                  subject: currentTaskToSchedule.id,
                  subjectName: currentTaskToSchedule.subject_name,
                  teacher: tObj ? tObj.teacher_name : tid,
                  room: pickedRoom.room_name || pickedRoomId,
                  day: slot.day,
                  period: slot.period,
                  slotNo: slot.period,
                  time: timeStr,
                  type: currentTaskToSchedule.type,
                });

                // Increment usage count
                roomUsage.set(
                  pickedRoomId,
                  (roomUsage.get(pickedRoomId) || 0) + 1,
                );
                incrementScheduledCount(
                  currentTaskToSchedule.id,
                  currentTaskToSchedule.type,
                ); // Track scheduled periods
                taskAssigned = true;
                scheduledCount++;
                console.log(
                  `   ✅ Assigned [${taskOffset + 1}/${consecutiveCount}]: ${slot.day} P${slot.period} (${timeStr}) - ${tObj?.teacher_name || tid} @ ${pickedRoom.room_name || pickedRoomId}`,
                );
                if (
                  attempt.allowLateTheory &&
                  currentTaskToSchedule.type === "Lecture"
                ) {
                  console.log(
                    `      ⚠️ Theory class scheduled after 17:00 due to constraints`,
                  );
                }
                break;
              }
            }
          }

          // If this task couldn't be scheduled, break and mark as failed
          if (!taskAssigned) {
            console.log(
              `   ⚠️ Could not schedule task ${taskOffset + 1}/${consecutiveCount} individually`,
            );
            break;
          }
        }

        // If we scheduled at least one task, mark remaining as failed and skip all consecutive tasks
        if (scheduledCount > 0) {
          assigned = true;

          // Mark remaining unscheduled tasks as failed
          if (scheduledCount < consecutiveCount) {
            const remaining = consecutiveCount - scheduledCount;
            console.warn(
              `   ⚠️ Only scheduled ${scheduledCount}/${consecutiveCount} tasks. Marking ${remaining} remaining as failed.`,
            );

            for (let i = scheduledCount; i < consecutiveCount; i++) {
              const remainingTask = tasks[currentTaskIndex + i];
              if (remainingTask) {
                failedTasks.push({
                  taskId: remainingTask.taskId,
                  subject_id: remainingTask.id,
                  subject_name: remainingTask.subject_name,
                  type: remainingTask.type,
                  reason: `จัดได้เพียง ${scheduledCount}/${consecutiveCount} คาบ (${remaining} คาบที่เหลือจัดไม่ได้)`,
                });
              }
            }
          }

          currentTaskIndex += consecutiveCount; // Skip all tasks in the group
          console.log(
            `   📊 Scheduled ${scheduledCount}/${consecutiveCount} tasks individually`,
          );
        }
      }
    }

    if (!assigned) {
      // CRITICAL: If we have consecutive tasks, mark ALL of them as failed, not just one
      // Otherwise they will be processed again and scheduled multiple times!
      for (let i = 0; i < consecutiveCount; i++) {
        const failedTask = tasks[currentTaskIndex + i];
        if (!failedTask) break;

        // Generate detailed failure reason
        let failureReason = "";
        const reasons: string[] = [];

        // Check room availability
        if (validRooms.length === 0) {
          reasons.push(
            `ไม่มีห้อง${failedTask.reqLab ? "ปฏิบัติ/แล็บ" : "ทฤษฎี"}ที่เหมาะสม`,
          );
        }

        // Check teacher availability
        let teacherBusyCount = 0;
        for (const tid of validTeachers) {
          let teacherFreeSlots = 0;
          for (const day of days) {
            for (let period = 1; period <= maxPeriods; period++) {
              if (
                isSlotAvailable(day, period, failedTask, false) &&
                isFree(tid, "ANY", year, day, period)
              ) {
                teacherFreeSlots++;
              }
            }
          }
          if (teacherFreeSlots === 0) teacherBusyCount++;
        }

        if (teacherBusyCount === validTeachers.length) {
          reasons.push(`ครูทั้งหมดไม่ว่าง (${validTeachers.join(", ")})`);
        } else if (teacherBusyCount > 0) {
          reasons.push(
            `ครูบางคนไม่ว่าง (${teacherBusyCount}/${validTeachers.length})`,
          );
        }

        // Check day capacity
        const fullDays = days.filter((day) => getDayPeriodCount(day) >= 10);
        if (fullDays.length === days.length) {
          reasons.push(`ทุกวันเต็มแล้ว (10 คาบ/วัน)`);
        } else if (fullDays.length > 0) {
          reasons.push(`บางวันเต็มแล้ว: ${fullDays.join(", ")}`);
        }

        // Check slot availability
        let availableSlots = 0;
        for (const day of days) {
          for (let period = 1; period <= maxPeriods; period++) {
            if (isSlotAvailable(day, period, failedTask, false)) {
              availableSlots++;
            }
          }
        }

        if (availableSlots === 0) {
          reasons.push(`ไม่มีช่องว่างที่เหมาะสม (ถูกบล็อกโดยข้อจำกัด)`);
        } else {
          reasons.push(`มีช่องว่าง ${availableSlots} ช่อง แต่ครู/ห้องไม่ว่าง`);
        }

        failureReason =
          reasons.length > 0
            ? reasons.join("; ")
            : `ไม่สามารถจัดได้ (สาเหตุไม่ชัดเจน)`;

        // Only log once for the group, not for each task
        if (i === 0) {
          console.warn(
            `   ❌ FAILED: Could not assign ${failedTask.subject_name} (${failedTask.type}) - ${consecutiveCount} periods`,
          );
          console.warn(`      Reason: ${failureReason}`);

          // Debug info
          const dayCounts = days.map((day) => ({
            day,
            count: getDayPeriodCount(day),
            max: 10,
          }));
          console.warn(`      Current day distribution:`, dayCounts);
        }

        failedTasks.push({
          taskId: failedTask.taskId,
          subject_id: failedTask.id,
          subject_name: failedTask.subject_name,
          type: failedTask.type,
          reason:
            i === 0
              ? failureReason
              : `ส่วนหนึ่งของกลุ่มที่จัดไม่ได้ (${consecutiveCount} คาบ)`,
        });
      }

      // CRITICAL: Skip ALL consecutive tasks, not just one!
      currentTaskIndex += consecutiveCount;
    }
  }

  // Final validation: Check if any subject has more periods than expected
  console.log(`\n📊 Schedule Generation Complete:`);
  const subjectSchedule = schedule.filter(
    (s) =>
      s.type !== "Activity" &&
      s.type !== "Meeting" &&
      s.subject !== "HOME ROOM",
  );
  console.log(`   ✅ Scheduled: ${subjectSchedule.length} periods`);
  console.log(`   ❌ Failed: ${failedTasks.length} tasks`);
  console.log(
    `   📈 Success rate: ${(((tasks.length - failedTasks.length) / tasks.length) * 100).toFixed(1)}%`,
  );

  // ⚠️ LOAD BALANCING SUMMARY
  console.log(`\n📅 Load Balancing Summary:`);
  const dayDistribution = days.map((day) => {
    const count = schedule.filter(
      (s) =>
        s.day === day &&
        s.type !== "Activity" &&
        s.type !== "Meeting" &&
        s.subject !== "HOME ROOM",
    ).length;
    return { day, count };
  });

  dayDistribution.forEach(({ day, count }) => {
    const bar = "█".repeat(count);
    const status = count >= 6 && count <= 7 ? "✅" : count < 6 ? "⚠️ " : "⚠️ ";
    console.log(`   ${status} ${day}: ${count} periods ${bar}`);
  });

  const avgPerDay = (subjectSchedule.length / days.length).toFixed(1);
  const minDay = Math.min(...dayDistribution.map((d) => d.count));
  const maxDay = Math.max(...dayDistribution.map((d) => d.count));
  console.log(`   📊 Average: ${avgPerDay} periods/day`);
  console.log(`   📉 Min: ${minDay} periods, Max: ${maxDay} periods`);
  console.log(`   📏 Balance range: ${maxDay - minDay} periods difference\n`);

  // Validate: Check for duplicate/over-scheduled subjects
  const subjectPeriodCounts = new Map<string, number>();
  subjectSchedule.forEach((entry: any) => {
    const key = entry.subject;
    subjectPeriodCounts.set(key, (subjectPeriodCounts.get(key) || 0) + 1);
  });

  const overScheduledSubjects: string[] = [];
  subjects.forEach((subj: any) => {
    const sId = subj.subject_id || subj.id || subj._id;
    const expected = (subj.theory || 0) + (subj.practice || 0);
    const actual = subjectPeriodCounts.get(String(sId)) || 0;
    if (actual > expected) {
      overScheduledSubjects.push(
        `${subj.subject_name} (${sId}): ${actual} periods (expected ${expected})`,
      );
      console.warn(
        `   ⚠️ OVER-SCHEDULED: ${subj.subject_name} has ${actual} periods but should have ${expected}`,
      );
    }
  });

  if (overScheduledSubjects.length > 0) {
    console.error(
      `\n❌ CRITICAL: Found ${overScheduledSubjects.length} subjects with MORE periods than expected:`,
    );
    overScheduledSubjects.forEach((msg) => console.error(`   ${msg}`));
  }

  // 6. Validate Schedule
  const validation = validateScheduleConstraints(
    schedule,
    teachers,
    subjects,
    rooms,
    timeslots,
  );

  // 7. Log room usage
  console.log("📊 Room Usage Distribution:");
  roomUsage.forEach((count, roomId) => {
    if (count > 0) console.log(`   ${roomId}: ${count} times`);
  });

  return {
    schedule,
    validation,
    failedTasks, // Return failures
    stats: {
      totalEntries: schedule.length,
      subjects: [
        ...new Set(schedule.map((s: { subject: string }) => s.subject)),
      ].length,
      roomsUsed: Array.from(roomUsage.entries())
        .filter(([_, count]) => count > 0)
        .map(([roomId, count]) => ({ roomId, usage: count })),
    },
  };
}

// ============================================
// 🧠 Natural Language Command Parser
// ============================================

// 🛠️ Fallback Regex Parser (Offline/Rate Limit)
function parseCommandWithRegex(text: string): any {
  text = text.trim();

  // Helper to map Day String to Key
  const mapDay = (d: string) => {
    if (!d) return null;
    d = d.toLowerCase();
    if (d.includes("จันทร์") || d.includes("mon")) return "Mon";
    if (d.includes("อังคาร") || d.includes("tue")) return "Tue";
    if (d.includes("พุธ") || d.includes("wed") || d.includes("พุธ"))
      return "Wed"; // Fixed typo in logic
    if (d.includes("พฤหัส") || d.includes("thu")) return "Thu";
    if (d.includes("ศุกร์") || d.includes("fri")) return "Fri";
    return null;
  };

  // 1️⃣ DELETE_ALL
  // "ลบคาบทั้งหมด", "Delete all", "Clear schedule"
  if (/(?:ลบ|delete)\s*(?:คาบ|ตาราง)?\s*(?:ทั้งหมด|all|schedule)/i.test(text)) {
    return {
      action: "DELETE_ALL",
      confidence: 1.0,
      explanation: "ลบตารางเรียนทั้งหมด (Offline Parsed)",
    };
  }

  // 2️⃣ DELETE_SUBJECT
  // "ลบวิชาคณิตศาสตร์ทั้งหมด", "Delete all Math"
  if (
    text.match(
      /(?:ลบ|delete)\s*(?:วิชา|subject|all)?\s*(.+?)\s*(?:ทั้งหมด|all|classes|out)?$/i,
    ) &&
    (text.includes("วิชา") || text.includes("subject") || text.includes("all"))
  ) {
    const match = text.match(
      /(?:ลบ|delete)\s*(?:วิชา|subject|all)?\s*(.+?)\s*(?:ทั้งหมด|all|classes|out)?$/i,
    );
    if (match) {
      const subject = match[1].trim();
      if (subject && !["คาบ", "ตาราง", "schedule"].includes(subject)) {
        return {
          action: "DELETE_SUBJECT",
          confidence: 0.9,
          parameters: { subjectName: subject },
          explanation: `ลบวิชา ${subject} ทั้งหมด (Offline Parsed)`,
        };
      }
    }
  }

  // 3️⃣ SWAP
  // Pattern 1: Slot... Day... with Slot... Day...
  const swapMatch1 = text.match(
    /(?:สลับ|swap).*?(\d+).*?([^\s]+).*?(?:กับ|and|with).*?(\d+).*?([^\s]+)/i,
  );
  if (swapMatch1) {
    const day1 = mapDay(swapMatch1[2]);
    const day2 = mapDay(swapMatch1[4]);
    if (day1 && day2) {
      return {
        action: "SWAP",
        confidence: 0.9,
        parameters: {
          a: { day: day1, slot: parseInt(swapMatch1[1]) },
          b: { day: day2, slot: parseInt(swapMatch1[3]) },
        },
        explanation: `สลับคาบ ${swapMatch1[1]} ${day1} กับ ${swapMatch1[3]} ${day2} (Offline Parsed)`,
      };
    }
  }

  // Pattern 2: Day... Slot... with Day... Slot... ("สลับวันจันทร์คาบ 1 กับ...")
  const swapMatch2 = text.match(
    /(?:สลับ|swap).*?([^\s\d]+).*?(\d+).*?(?:กับ|and|with).*?([^\s\d]+).*?(\d+)/i,
  );
  if (swapMatch2) {
    const day1 = mapDay(swapMatch2[1]);
    const day2 = mapDay(swapMatch2[3]);
    if (day1 && day2) {
      return {
        action: "SWAP",
        confidence: 0.9,
        parameters: {
          a: { day: day1, slot: parseInt(swapMatch2[2]) },
          b: { day: day2, slot: parseInt(swapMatch2[4]) },
        },
        explanation: `สลับคาบ ${swapMatch2[2]} ${day1} กับ ${swapMatch2[4]} ${day2} (Offline Parsed)`,
      };
    }
  }

  // 4️⃣ MOVE
  // Pattern 1: Slot... Day... to Day... Slot... (Standard)
  const moveMatch1 = text.match(
    /(?:ย้าย|move).*?(\d+).*?(?:วัน)?([^\s]+).*?(?:ไป|to).*?(?:วัน)?([^\s]+).*?(?:คาบ|slot)?.*?(\d+)/i,
  );
  if (moveMatch1) {
    const fromDay = mapDay(moveMatch1[2]);
    const toDay = mapDay(moveMatch1[3]);
    if (fromDay && toDay) {
      return {
        action: "MOVE",
        confidence: 0.9,
        parameters: {
          subject: "AUTO_DETECT",
          fromDay: fromDay,
          fromSlot: parseInt(moveMatch1[1]),
          toDay: toDay,
          toSlot: parseInt(moveMatch1[4]),
        },
        explanation: "ย้ายคาบ (Offline Parsed - P1)",
      };
    }
  }

  // Pattern 2: Day... Slot... to Day... Slot... ("ย้ายวันจันทร์คาบ 1 ไป...")
  const moveMatch2 = text.match(
    /(?:ย้าย|move).*?(?:วัน)?([^\s\d]+).*?(\d+).*?(?:ไป|to).*?(?:วัน)?([^\s\d]+).*?(\d+)/i,
  );
  if (moveMatch2) {
    const fromDay = mapDay(moveMatch2[1]);
    const toDay = mapDay(moveMatch2[3]);
    if (fromDay && toDay) {
      return {
        action: "MOVE",
        confidence: 0.9,
        parameters: {
          subject: "AUTO_DETECT",
          fromDay: fromDay,
          fromSlot: parseInt(moveMatch2[2]),
          toDay: toDay,
          toSlot: parseInt(moveMatch2[4]),
        },
        explanation: "ย้ายคาบ (Offline Parsed - P2)",
      };
    }
  }

  // Pattern 3: Slot... Day... to Slot... Day... (Alternative)
  const moveMatch3 = text.match(
    /(?:ย้าย|move).*?(\d+).*?(?:วัน)?([^\s]+).*?(?:ไป|to).*?(?:คาบ|slot).*?(\d+).*?(?:วัน)?([^\s]+)/i,
  );
  if (moveMatch3) {
    const fromDay = mapDay(moveMatch3[2]);
    const toDay = mapDay(moveMatch3[4]);
    if (fromDay && toDay) {
      return {
        action: "MOVE",
        confidence: 0.9,
        parameters: {
          subject: "AUTO_DETECT",
          fromDay: fromDay,
          fromSlot: parseInt(moveMatch3[1]),
          toDay: toDay,
          toSlot: parseInt(moveMatch3[3]),
        },
        explanation: "ย้ายคาบ (Offline Parsed - P3)",
      };
    }
  }

  // 5️⃣ DELETE (Single Slot)
  // Pattern 1: Slot... Day... ("ลบคาบ 7 วันศุกร์")
  const delMatch1 = text.match(
    /(?:ลบ|delete).*?(?:คาบ|slot).*?(\d+).*?(?:วัน)?([^\s]+)/i,
  );
  if (delMatch1) {
    const day = mapDay(delMatch1[2]);
    if (day) {
      return {
        action: "DELETE",
        confidence: 0.9,
        parameters: {
          day: day,
          slotNo: parseInt(delMatch1[1]),
        },
        explanation: `ลบคาบ ${delMatch1[1]} ${day} (Offline Parsed)`,
      };
    }
  }

  // Pattern 2: Day... Slot... ("ลบวันศุกร์คาบ 7")
  const delMatch2 = text.match(
    /(?:ลบ|delete).*?(?:วัน)?([^\s\d]+).*?(?:คาบ|slot).*?(\d+)/i,
  );
  if (delMatch2) {
    const day = mapDay(delMatch2[1]);
    if (day) {
      return {
        action: "DELETE",
        confidence: 0.9,
        parameters: {
          day: day,
          slotNo: parseInt(delMatch2[2]),
        },
        explanation: `ลบคาบ ${delMatch2[2]} ${day} (Offline Parsed)`,
      };
    }
  }

  return null;
}

async function handleNaturalLanguageCommand(
  userPrompt: string,
  currentSchedule: any[],
) {
  // 1️⃣ Try AI Advice (Optional - Fail Safe)
  let aiAdvice: any = {
    smart_suggestion: "ดำเนินการตามคำสั่ง",
    potential_issues: [],
  };
  try {
    aiAdvice = await getAIRecommendation(userPrompt, currentSchedule);
    console.log("💡 AI Advice:", aiAdvice.smart_suggestion);
  } catch (e: any) {
    console.warn("⚠️ AI Advice unavailable:", e.message);
  }

  let parsed: any = null;

  // 2️⃣ Try AI Parser (Groq)
  try {
    console.log(`🧠 Parsing command: "${userPrompt}"`);

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

6️⃣ DELETE_ALL (ลบทั้งหมด):
   - "ลบคาบทั้งหมด"
   - "ลบตารางเรียนทั้งหมด"
   - "Clear schedule"
   - "Reset schedule"

7️⃣ DELETE_SUBJECT (ลบรายวิชา):
   - "ลบวิชาคณิตศาสตร์ทั้งหมด"
   - "ลบคาบภาษาไทยออกให้หมด"
   - "Delete all Math classes"
   - "Delete all Math classes"


RESPONSE FORMAT (JSON):
For SWAP:
{
  "action": "SWAP",
  "confidence": 0.95,
  "parameters": {
    "a": { "day": "Mon", "slot": 4 },
    "b": { "day": "Tue", "slot": 4 }
  },
  "explanation": "สลับคาบ 4 วันจันทร์ กับ คาบ 4 วันอังคาร"
}

For DELETE:
{
  "action": "DELETE",
  "confidence": 0.95,
  "parameters": {
    "day": "Fri",
    "slotNo": 7
  },
  "explanation": "ลบคาบ 7 วันศุกร์"
}

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

For DELETE_ALL:
{
  "action": "DELETE_ALL",
  "confidence": 0.99,
  "explanation": "ลบตารางเรียนทั้งหมด"
}

For DELETE_SUBJECT:
{
  "action": "DELETE_SUBJECT",
  "confidence": 0.95,
  "parameters": {
    "subjectName": "คณิตศาสตร์"
  },
  "explanation": "ลบวิชาคณิตศาสตร์ทั้งหมด"
}
`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: parserInstruction + `\n\n👤 USER: "${userPrompt}"`,
        },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0,
      response_format: { type: "json_object" },
      max_tokens: 2000,
    });

    let aiText = completion.choices[0]?.message?.content || "{}";
    aiText = aiText
      .replace(/^```json/, "")
      .replace(/```$/, "")
      .trim();
    parsed = JSON.parse(aiText);
  } catch (error: any) {
    console.warn("⚠️ AI Parser failed (using Regex fallback):", error.message);
    // 3️⃣ Attempt Regex Fallback
    parsed = parseCommandWithRegex(userPrompt);

    if (!parsed) {
      // If regex also fails, return friendly error as message to prevent frontend crash
      return NextResponse.json(
        {
          message: "⚠️ ระบบไม่สามารถประมวลผลคำสั่งได้ (API Rate Limit)",
          ai_insight: {
            suggestion: "กรุณาลองใหม่ในอีกสักครู่ หรือใช้คำสั่งที่ชัดเจนขึ้น",
            warnings: [
              "การเชื่อมต่อ AI มีปัญหาชั่วคราว แต่คุณยังสามารถใช้คำสั่งพื้นฐาน (ย้าย/ลบ/สลับ) ได้",
            ],
          },
        },
        { status: 200 },
      );
    }
  }

  // Handle Unknown from AI
  if (
    !parsed ||
    parsed.action === "UNKNOWN" ||
    !parsed.action ||
    parsed.confidence < 0.6
  ) {
    // Try regex one last time if AI returned UNKNOWN
    const regexFallback = parseCommandWithRegex(userPrompt);
    if (regexFallback) {
      parsed = regexFallback;
    } else {
      return NextResponse.json(
        {
          error: "😕 ไม่ค่อยเข้าใจคำสั่ง",
          ai_suggestion: aiAdvice.smart_suggestion,
          suggestions: [
            "ช่วยย้ายคาบ 6 ไปคาบ 3 วันจันทร์",
            "สลับคาบ 4 วันจันทร์ กับ คาบ 4 วันอังคาร",
            "ลบคาบ 4 วันศุกร์ออก",
            "ลบคาบทั้งหมด",
          ],
        },
        { status: 400 },
      );
    }
  }

  // ============================================
  // 🧠 MOVE_MULTIPLE Handler
  // ============================================
  if (parsed.action === "MOVE_MULTIPLE" && parsed.moves) {
    let updatedSchedule = [...currentSchedule];
    const moveResults = [];

    for (const move of parsed.moves) {
      const result = await handleScheduleManagement(
        {
          action: "MOVE",
          currentSchedule: updatedSchedule,
          ...move,
        },
        aiAdvice,
      );

      const data = (await result.json()) as any;

      if (result.status === 200) {
        updatedSchedule = data.result;
        moveResults.push(data.moved);
      } else {
        return NextResponse.json(
          {
            error: data.error,
            partialMoves: moveResults,
            ai_insight: aiAdvice,
          },
          { status: result.status },
        );
      }
    }

    return NextResponse.json({
      message: `✅ ย้ายคาบสำเร็จ ${moveResults.length} คาบ`,
      action: "MOVE_MULTIPLE",
      moved: moveResults,
      explanation: parsed.explanation,
      ai_insight: {
        suggestion: aiAdvice.smart_suggestion,
        warnings: aiAdvice.potential_issues,
      },
      result: updatedSchedule,
    });
  }

  // ============================================
  // 🔍 AUTO_DETECT: Find subject from schedule
  // ============================================
  let finalParams = { ...parsed.parameters };

  if (parsed.action === "MOVE" && finalParams.subject === "AUTO_DETECT") {
    console.log(
      "🔍 AUTO_DETECT: Finding subject at",
      finalParams.fromDay,
      "Slot",
      finalParams.fromSlot,
    );

    const sourceEntry = currentSchedule.find(
      (entry: any) =>
        entry.day === finalParams.fromDay &&
        entry.slotNo === finalParams.fromSlot,
    );

    if (!sourceEntry) {
      return NextResponse.json(
        {
          error: `❌ ไม่พบคาบที่ ${finalParams.fromDay} คาบที่ ${finalParams.fromSlot}`,
          suggestion: "ตรวจสอบว่าวันและคาบที่ระบุมีการเรียนอยู่จริงหรือไม่",
        },
        { status: 404 },
      );
    }

    finalParams.subject = sourceEntry.subject;
    console.log(
      `✅ AUTO_DETECT: Found subject ${sourceEntry.subject} (${sourceEntry.subjectName})`,
    );
  }

  const body = {
    action: parsed.action,
    currentSchedule: currentSchedule,
    ...finalParams,
  };

  return handleScheduleManagement(body, aiAdvice);
}

// ============================================
// 🎯 Schedule Management (CRUD) + AI Insights
// ============================================
async function handleScheduleManagement(body: any, aiAdvice?: any) {
  const { action, currentSchedule } = body;

  if (!currentSchedule) {
    return NextResponse.json(
      { error: "กรุณาระบุ currentSchedule" },
      { status: 400 },
    );
  }

  // ============================================
  // 🗑️ DELETE_ALL
  // ============================================
  if (action === "DELETE_ALL") {
    return NextResponse.json({
      message: "✅ ลบตารางเรียนทั้งหมดเรียบร้อยแล้ว",
      action: "DELETE_ALL",
      ai_insight: {
        what_happened: "ตารางเรียนทั้งหมดถูกลบ",
        recommendation: "คุณสามารถเริ่มสร้างตารางใหม่ได้โดยการพิมพ์คำสั่งสร้าง",
        alternatives: [],
        warnings: ["การกระทำนี้ไม่สามารถย้อนกลับได้"],
      },
      result: [], // Return empty array
    });
  }

  // ============================================
  // 🗑️ DELETE_SUBJECT
  // ============================================
  if (action === "DELETE_SUBJECT") {
    const { subjectName } = body;

    if (!subjectName) {
      return NextResponse.json(
        { error: "กรุณาระบุชื่อวิชาที่ต้องการลบ" },
        { status: 400 },
      );
    }

    // Filter logic: match partial name case-insensitive
    const initialCount = currentSchedule.length;
    const updatedSchedule = currentSchedule.filter((e: any) => {
      const sName = e.subjectName?.toLowerCase() || "";
      const query = subjectName.toLowerCase();
      return !sName.includes(query);
    });

    const deletedCount = initialCount - updatedSchedule.length;

    if (deletedCount === 0) {
      return NextResponse.json(
        {
          error: `❌ ไม่พบวิชาที่ชื่อคล้าย "${subjectName}"`,
          suggestion: "ลองตรวจสอบชื่อวิชาอีกครั้ง",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      message: `✅ ลบวิชา "${subjectName}" ออกทั้งหมด (${deletedCount} คาบ)`,
      action: "DELETE_SUBJECT",
      deletedCount,
      ai_insight: {
        what_happened: `ลบ ${subjectName} ออกจากตารางเรียนทั้งหมด`,
        recommendation:
          aiAdvice?.smart_suggestion || "ตรวจสอบความถูกต้องของตาราง",
        warnings: aiAdvice?.potential_issues || [],
      },
      result: updatedSchedule,
    });
  }

  // ============================================
  // 🗑️ DELETE with AI Intelligence
  // ============================================
  if (action === "DELETE") {
    const { day, slotNo } = body;

    if (!day || typeof slotNo !== "number") {
      return NextResponse.json(
        { error: "❌ ต้องระบุวัน และเลขคาบให้ชัดเจน" },
        { status: 400 },
      );
    }

    const targetEntry = currentSchedule.find(
      (e: any) => e.day === day && e.slotNo === slotNo,
    );

    if (!targetEntry) {
      return NextResponse.json(
        { error: `ไม่พบคาบ ${day} คาบที่ ${slotNo}` },
        { status: 404 },
      );
    }

    // 🧠 ตรวจสอบว่ามีวิชาเดียวกันที่อื่นไหม
    const sameSubjectOtherSlots = currentSchedule.filter(
      (e: any) =>
        e.subject === targetEntry.subject &&
        !(e.day === day && e.slotNo === slotNo),
    );

    // 💡 สร้างคำแนะนำอัจฉริยะ
    let smartInsight = "";
    if (sameSubjectOtherSlots.length > 0) {
      const locations = sameSubjectOtherSlots
        .map((s: any) => `${s.day} คาบ${s.slotNo}`)
        .join(", ");
      smartInsight = `💡 ${targetEntry.subjectName} ยังมีอยู่ที่: ${locations} (${sameSubjectOtherSlots.length} คาบ)`;
    } else {
      smartInsight = `⚠️ ${targetEntry.subjectName} จะถูกลบออกจากตารางทั้งหมด! ไม่มีคาบอื่นเหลือ`;
    }

    const updatedSchedule = currentSchedule.filter(
      (e: any) => !(e.day === day && e.slotNo === slotNo),
    );

    return NextResponse.json({
      message: "✅ ลบคาบสำเร็จ",
      action: "DELETE",
      deleted: targetEntry,
      ai_insight: {
        what_happened: smartInsight,
        recommendation:
          aiAdvice?.smart_suggestion || "พิจารณาเพิ่มวิชาอื่นมาแทนที่ได้",
        alternatives: aiAdvice?.alternative_options || [],
        warnings: aiAdvice?.potential_issues || [],
      },
      result: updatedSchedule,
    });
  }

  // ============================================
  // 🔄 SWAP with Conflict Detection
  // ============================================
  if (action === "SWAP") {
    const { a, b } = body;

    if (!a || !b) {
      return NextResponse.json(
        { error: "ข้อมูลไม่ครบ (ต้องมี a และ b)" },
        { status: 400 },
      );
    }

    const slotA = Number(a.slot);
    const slotB = Number(b.slot);
    const dayA = a.day;
    const dayB = b.day;

    const indexA = currentSchedule.findIndex(
      (e: any) => e.day === dayA && e.slotNo === slotA,
    );
    const indexB = currentSchedule.findIndex(
      (e: any) => e.day === dayB && e.slotNo === slotB,
    );

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

    const swappedItems: {
      itemA: ScheduleItem | null;
      itemB: ScheduleItem | null;
    } = {
      itemA: null,
      itemB: null,
    };

    if (indexA !== -1 && indexB !== -1) {
      // สลับ 2 คาบที่มีวิชา
      swappedItems.itemA = { ...updatedSchedule[indexA] };
      swappedItems.itemB = { ...updatedSchedule[indexB] };

      updatedSchedule[indexA] = {
        ...updatedSchedule[indexA],
        day: dayB,
        slotNo: slotB,
      };
      updatedSchedule[indexB] = {
        ...updatedSchedule[indexB],
        day: dayA,
        slotNo: slotA,
      };
      message = `✅ สลับ ${swappedItems.itemA!.subjectName} กับ ${swappedItems.itemB!.subjectName}`;
    } else if (indexA !== -1 && indexB === -1) {
      swappedItems.itemA = { ...updatedSchedule[indexA] };
      updatedSchedule[indexA] = {
        ...updatedSchedule[indexA],
        day: dayB,
        slotNo: slotB,
      };
      message = `✅ ย้าย ${swappedItems.itemA!.subjectName} ไปที่ว่าง`;
    } else if (indexA === -1 && indexB !== -1) {
      swappedItems.itemB = { ...updatedSchedule[indexB] };
      updatedSchedule[indexB] = {
        ...updatedSchedule[indexB],
        day: dayA,
        slotNo: slotA,
      };
      message = `✅ ย้าย ${swappedItems.itemB!.subjectName} มาที่ว่าง`;
    } else {
      return NextResponse.json(
        { error: "ไม่พบข้อมูลในตำแหน่งที่ระบุ" },
        { status: 404 },
      );
    }

    // 🧠 ตรวจสอบผลกระทบ
    const teacherA = swappedItems.itemA?.teacher;
    const teacherB = swappedItems.itemB?.teacher;

    const impactWarnings: string[] = [];

    if (teacherA) {
      const teacherScheduleAfter = updatedSchedule.filter(
        (e: any) => e.teacher === teacherA && e.day === dayB,
      );
      if (teacherScheduleAfter.length > 4) {
        impactWarnings.push(
          `⚠️ ${teacherA} มีคาบสอนในวัน${dayB} เยอะขึ้น (${teacherScheduleAfter.length} คาบ)`,
        );
      }
    }

    return NextResponse.json({
      message,
      action: "SWAP",
      swapped: swappedItems,
      ai_insight: {
        recommendation: aiAdvice?.smart_suggestion || "การสลับเสร็จสมบูรณ์",
        warnings:
          impactWarnings.length > 0
            ? impactWarnings
            : aiAdvice?.potential_issues || [],
        safety: aiAdvice?.safety_check || "✅ ไม่พบความขัดแย้ง",
      },
      result: updatedSchedule,
    });
  }

  // ============================================
  // ➡️ MOVE with Smart Validation
  // ============================================
  if (action === "MOVE") {
    const { subject, fromDay, fromSlot, toDay, toSlot } = body;

    if (!subject || !fromDay || !fromSlot || !toDay || !toSlot) {
      return NextResponse.json(
        {
          error: "กรุณาระบุ: subject, fromDay, fromSlot, toDay, toSlot",
        },
        { status: 400 },
      );
    }

    const targetEntry = currentSchedule.find(
      (entry: any) =>
        entry.subject === subject &&
        entry.day === fromDay &&
        entry.slotNo === fromSlot,
    );

    if (!targetEntry) {
      return NextResponse.json(
        {
          error: `ไม่พบคาบ: ${subject} วัน ${fromDay} คาบที่ ${fromSlot}`,
        },
        { status: 404 },
      );
    }

    const conflict = checkConflicts(
      currentSchedule,
      toDay,
      toSlot,
      targetEntry,
      subject,
    );
    if (conflict) {
      return NextResponse.json(
        {
          error: conflict.error,
          conflict: conflict.entry,
          ai_suggestion: aiAdvice?.smart_suggestion || "ลองเลือกคาบอื่นที่ว่าง",
        },
        { status: 409 },
      );
    }

    const updatedSchedule = currentSchedule.map((entry: any) => {
      if (
        entry.subject === subject &&
        entry.day === fromDay &&
        entry.slotNo === fromSlot
      ) {
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
        to: `${toDay} คาบที่ ${toSlot}`,
      },
      ai_insight: {
        recommendation: aiAdvice?.smart_suggestion || "การย้ายเสร็จสมบูรณ์",
        warnings: aiAdvice?.potential_issues || [],
        safety: aiAdvice?.safety_check || "✅ ไม่พบความขัดแย้ง",
      },
      result: updatedSchedule,
    });
  }

  // ============================================
  // 📋 INFO / ANALYZE — AI ต้องการแจ้งข้อมูล (ไม่แก้ไขตาราง)
  // ============================================
  if (action === "INFO" || action === "ANALYZE" || action === "NONE") {
    return NextResponse.json({
      message: body.explanation || "📋 ข้อมูลจากระบบ",
      action: "INFO",
      ai_insight: {
        recommendation:
          aiAdvice?.smart_suggestion || "ไม่มีการเปลี่ยนแปลงตาราง",
        warnings: aiAdvice?.potential_issues || [],
      },
      result: currentSchedule, // คืนตารางเดิม ไม่เปลี่ยนแปลง
    });
  }

  return NextResponse.json(
    {
      error: `Action ไม่ถูกต้อง: ${action}`,
    },
    { status: 400 },
  );
}

// ============================================
// 🛡️ Conflict Checker
// ============================================
function checkConflicts(
  schedule: any[],
  day: string,
  slotNo: number,
  entry: any,
  excludeSubject: string | null,
) {
  const slotConflict = schedule.find(
    (e: any) =>
      e.day === day && e.slotNo === slotNo && e.subject !== excludeSubject,
  );

  if (slotConflict) {
    return {
      error: `❌ คาบ ${day} Slot ${slotNo} มีการเรียนอยู่แล้ว: ${slotConflict.subjectName}`,
      entry: slotConflict,
    };
  }

  const teacherConflict = schedule.find(
    (e: any) =>
      e.day === day &&
      e.slotNo === slotNo &&
      e.teacher === entry.teacher &&
      e.subject !== excludeSubject,
  );

  if (teacherConflict) {
    return {
      error: `❌ อาจารย์ ${entry.teacher} สอนอยู่แล้วในช่วงนี้`,
      entry: teacherConflict,
    };
  }

  const roomConflict = schedule.find(
    (e: any) =>
      e.day === day &&
      e.slotNo === slotNo &&
      e.room === entry.room &&
      e.subject !== excludeSubject,
  );

  if (roomConflict) {
    return {
      error: `❌ ห้อง ${entry.room} ถูกใช้งานอยู่แล้วในช่วงนี้`,
      entry: roomConflict,
    };
  }

  return null;
}
