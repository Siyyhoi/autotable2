import { NextResponse } from "next/server";
import clientPromise from "@/config/database";

export async function GET() {
  try {
    const client = await clientPromise;
    // เรียกใช้ DB ตัวเล็ก (autotable) ให้ตรงกับที่เก็บข้อมูลครู
    const db = client.db("autotable");

    // ลบ Timeslot เก่าทิ้งก่อน (ถ้ามี)
    await db.collection("Timeslot").deleteMany({});

    // สร้างเวลาเรียนมาตรฐาน: จันทร์-ศุกร์ (5 วัน) x วันละ 4 คาบ
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    const slots = [
      { slotNo: 1, startTime: "08:00", endTime: "10:00" },
      { slotNo: 2, startTime: "10:00", endTime: "12:00" },
      { slotNo: 3, startTime: "13:00", endTime: "15:00" },
      { slotNo: 4, startTime: "15:00", endTime: "17:00" },
    ];

    let newTimeslots = [];
    for (const d of days) {
      for (const s of slots) {
        newTimeslots.push({ day: d, ...s });
      }
    }

    // บันทึกลง Database
    await db.collection("Timeslot").insertMany(newTimeslots);

    return NextResponse.json({
      message: "✅ สร้าง Timeslot (ตารางเวลา) เสร็จเรียบร้อย!",
      count: newTimeslots.length,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
