import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("autotable");

    // 1. ดึง Config ของโรงเรียน
    const config = await db.collection("SchoolConfig").findOne({});

    // 2. ดึง Timeslot แค่วันเดียว (เช่น วันจันทร์) มาทำหัวตาราง
    // เรียงตาม slotNo จากน้อยไปมาก
    const slots = await db.collection("Timeslot")
      .find({ day: "Mon" }) 
      .sort({ slotNo: 1 })
      .toArray();

    return NextResponse.json({ 
        schoolName: config?.schoolName || "My School",
        slots: slots.map(s => ({
            id: s.slotNo,
            startTime: s.startTime,
            endTime: s.endTime,
            label: `${s.startTime} - ${s.endTime}`
        }))
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}