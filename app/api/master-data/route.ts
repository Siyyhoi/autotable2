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

    // 3. ดึง Student Groups ทั้งหมด (เพิ่มใหม่)
    const groups = await db.collection("StudentGroup").find({}).toArray();

    return NextResponse.json({
      schoolName: config?.schoolName || "My School",
      slots: slots.map(s => ({
        id: s.period,        // ใช้ period เป็น id
        startTime: s.start,
        endTime: s.end,
        label: `คาบที่ ${s.period}`
      })),
      groups: groups.map(g => ({
        group_id: g.group_id,
        group_name: g.group_name,
        advisor: g.advisor,
        student_count: g.group_count || 0
      }))
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}