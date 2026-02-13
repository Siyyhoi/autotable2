import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("autotable");

    // 1. ดึง Config ของโรงเรียน
    const config = await db.collection("SchoolConfig").findOne({});

    // 2. ดึง Timeslot ทั้งหมดจาก Database
    // โดยปกติ Timeslot จะเหมือนกันทุกวัน เราจึงดึงแค่ของวันจันทร์ (Mon) มาเป็นโครงสร้างหลัก
    const slots = await db.collection("Timeslot")
      .find({ day: "Mon" })
      .sort({ period: 1 }) // เรียงตาม period (คาบที่)
      .toArray();

    return NextResponse.json({
      schoolName: config?.schoolName || "My School",
      slots: slots.map(s => ({
        id: s.period,        // ใช้ period เป็น id
        startTime: s.start,
        endTime: s.end,
        label: `คาบที่ ${s.period}`
      }))
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}