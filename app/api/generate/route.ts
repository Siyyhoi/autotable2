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

export async function POST(req: Request) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: "Missing GROQ API Key" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const { prompt } = body;

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

    // 2. 🔥 คำนวณ Slot เวลาอัตโนมัติ
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
          label: `Slot ${slotNo} (${minutesToTime(current)} - ${minutesToTime(current + duration)})`
        });
      } 
      
      current += duration;
      slotNo++;
    }

    console.log(`✅ Generated ${generatedSlots.length} teachable slots (excluded lunch).`);

    // 3. 🚀 เรียกใช้ Groq AI (Llama 3.3 70B)
    const systemInstruction = `
      You are a University Scheduler Engine.
      Your goal is to assign subjects to timeslots without conflicts based on the SCHOOL CONFIGURATION provided.
      
      CRITICAL RULES:
      1. Teachers cannot be in 2 places at once.
      2. Rooms cannot be in 2 places at once.
      3. "slotNo" MUST Match one of the generated slots provided below.
      4. "day" MUST be one of: "Mon", "Tue", "Wed", "Thu", "Fri".
      5. Respect the duration: Each subject takes 1 slot per lecture hour (simplified).
      
      INPUT DATA:
      - Subjects: ${JSON.stringify(subjects)}
      - Teachers: ${JSON.stringify(teachers)}
      - Rooms: ${JSON.stringify(rooms)}
      - Available Timeslots (Based on School Config): ${JSON.stringify(generatedSlots)}

      RESPONSE FORMAT (JSON ONLY):
      Return a JSON object with a "schedule" array.
      Each item in the array MUST look EXACTLY like this:
      {
        "subject": "SubjectID",
        "subjectName": "Subject Name",
        "teacher": "Teacher Name",
        "room": "Room Name",
        "day": "Mon",
        "slotNo": 1,
        "time": "08:00-08:50"
      }
    `;

    const completion = await groq.chat.completions.create({
      messages: [{
        role: "user",
        content: systemInstruction + "\n\nUser Command: " + (prompt || "Generate Full Schedule")
      }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    let aiText = completion.choices[0]?.message?.content || "{}";
    aiText = aiText.replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();

    const parsedResult = JSON.parse(aiText);

    return NextResponse.json({ 
      message: "Success", 
      ai_analysis: parsedResult.analysis || "จัดตารางสำเร็จเรียบร้อย",
      result: parsedResult.schedule || [],
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