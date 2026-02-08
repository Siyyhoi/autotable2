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
// 🆕 สร้างตารางใหม่
// ============================================
async function generateNewSchedule(prompt: string) {
  const client = await clientPromise;
  const db = client.db("autotable");

  const [teachers, subjects, rooms, config] = await Promise.all([
    db.collection("Teacher").find({}).project({_id:0, id:1, fullName:1}).toArray(),
    db.collection("Subject").find({}).project({_id:0, id:1, nameTH:1, lectureHours:1}).toArray(),
    db.collection("Room").find({}).project({_id:0, id:1, name:1}).toArray(),
    db.collection("SchoolConfig").findOne({})
  ]);

  if (!config) {
    return NextResponse.json({ 
      error: "ไม่พบการตั้งค่า SchoolConfig กรุณาตั้งค่าโรงเรียนก่อน" 
    }, { status: 400 });
  }

  // สร้าง Slots
  const generatedSlots = [];
  let current = timeToMinutes(config.startTime);
  const end = timeToMinutes(config.endTime);
  const duration = config.periodDuration;
  let slotNo = 1;

  const LUNCH_TIME_START = 720;
  const LUNCH_TIME_END = 780;

  while (current + duration <= end) {
    const isLunchBreak = current >= LUNCH_TIME_START && current < LUNCH_TIME_END;
    if (!isLunchBreak) {
      generatedSlots.push({
        slotNo: slotNo,
        startTime: minutesToTime(current),
        endTime: minutesToTime(current + duration),
        label: `Slot ${slotNo}`
      });
    }
    current += duration;
    slotNo++;
  }

  const systemInstruction = `
You are an ELITE University Scheduler Engine with OPTIMIZATION expertise.

🎯 PRIMARY OBJECTIVE:
Create the MOST EFFICIENT schedule by grouping consecutive hours of the same subject together.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 MANDATORY RULES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. ✅ CONSECUTIVE SLOTS RULE
   - Same Subject + Same Room + Same Teacher = BACK-TO-BACK SLOTS
   - BUT ⚠️ NEVER cross lunch break (12:00-13:00)!

2. 🍽️ LUNCH BREAK RULE (12:00-13:00)
   - Slot 5 is LUNCH BREAK - NOT available

3. 🚫 NO GAPS IN SAME DAY
   - If subject appears multiple times on SAME DAY, slots MUST be consecutive

4. 📊 BALANCED DISTRIBUTION
   - Distribute subjects across Mon-Fri reasonably

5. 🔒 CONFLICT PREVENTION
   - Teachers cannot teach 2 classes simultaneously
   - Rooms cannot host 2 classes simultaneously

INPUT DATA:
Subjects: ${JSON.stringify(subjects, null, 2)}
Teachers: ${JSON.stringify(teachers, null, 2)}
Rooms: ${JSON.stringify(rooms, null, 2)}
Available Timeslots: ${JSON.stringify(generatedSlots, null, 2)}

RESPONSE FORMAT (JSON ONLY):
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
    }
  ],
  "analysis": "Explanation"
}`;

  const completion = await groq.chat.completions.create({
    messages: [{
      role: "user",
      content: systemInstruction + "\n\n🎯 USER COMMAND: " + (prompt || "Generate OPTIMIZED schedule")
    }],
    model: "llama-3.3-70b-versatile",
    temperature: 0,
    response_format: { type: "json_object" },
    max_tokens: 8000
  });

  let aiText = completion.choices[0]?.message?.content || "{}";
  aiText = aiText.replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();

  const parsedResult = JSON.parse(aiText);
  const schedule = parsedResult.schedule || [];
  
  return NextResponse.json({ 
    message: "Success", 
    ai_analysis: parsedResult.analysis || "จัดตารางแบบ Optimized สำเร็จ",
    result: schedule,
    stats: {
      totalEntries: schedule.length,
      subjects: [...new Set(schedule.map((s: {subject: string}) => s.subject))].length,
      rooms: [...new Set(schedule.map((s: {room: string}) => s.room))].length,
      teachers: [...new Set(schedule.map((s: {teacher: string}) => s.teacher))].length
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