import { NextResponse } from 'next/server';
import clientPromise from '../../../../lib/mongodb';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { schoolName, startTime, endTime, periodDuration } = body;

    const client = await clientPromise;
    const db = client.db("autotable");

    // 1. บันทึก Config ลง Database
    await db.collection("SchoolConfig").updateOne(
      { id: "main_config" }, // ใช้ id เดิมตลอดเพื่อทับค่าเก่า
      { $set: { schoolName, startTime, endTime, periodDuration, updatedAt: new Date() } },
      { upsert: true }
    );

    // 2. คำนวณสร้าง Timeslot ใหม่ทันที (Auto-generate)
    // แปลงเวลา "08:00" เป็นนาที (เช่น 8*60 = 480)
    const parseTime = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };
    
    // แปลงนาทีกลับเป็นเวลา "08:00"
    const formatTime = (minutes: number) => {
      const h = Math.floor(minutes / 60).toString().padStart(2, "0");
      const m = (minutes % 60).toString().padStart(2, "0");
      return `${h}:${m}`;
    };

    const startMin = parseTime(startTime);
    const endMin = parseTime(endTime);
    const duration = Number(periodDuration);

    let currentMin = startMin;
    let slotNo = 1;
    let newSlots = [];
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];

    // วนลูปสร้างคาบเรียนจนกว่าจะถึงเวลาเลิก
    while (currentMin + duration <= endMin) {
      const sTime = formatTime(currentMin);
      const eTime = formatTime(currentMin + duration);
      
      // สร้าง Slot ให้ครบ 5 วัน
      for (const d of days) {
        newSlots.push({
            day: d,
            slotNo: slotNo,
            startTime: sTime,
            endTime: eTime
        });
      }

      currentMin += duration; // ขยับเวลาไปคาบถัดไป
      slotNo++;
    }

    // ลบ Slot เก่าทิ้ง แล้วใส่ของใหม่เข้าไป
    if (newSlots.length > 0) {
        await db.collection("Timeslot").deleteMany({});
        await db.collection("Timeslot").insertMany(newSlots);
    }

    return NextResponse.json({ 
        message: "✅ บันทึกและสร้างตารางเวลาใหม่เรียบร้อย!", 
        totalSlots: newSlots.length 
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ฟังก์ชันดึงค่า Config เดิมมาโชว์
export async function GET() {
    try {
        const client = await clientPromise;
        const db = client.db("autotable");
        const config = await db.collection("SchoolConfig").findOne({ id: "main_config" });
        return NextResponse.json(config || {});
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}