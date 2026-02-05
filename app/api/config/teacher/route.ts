import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

// 🟢 GET: ดึงข้อมูลอาจารย์ทั้งหมด
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("autotable");
    const teachers = await db.collection("Teacher").find({}).toArray();

    // แปลง _id เป็น id
    const formattedTeachers = teachers.map(t => ({
      ...t,
      id: t._id
    }));

    return NextResponse.json(formattedTeachers);
  } catch (error) {
    return NextResponse.json({ error: "ดึงข้อมูลไม่สำเร็จ" }, { status: 500 });
  }
}

// 🔵 POST: เพิ่มอาจารย์ใหม่
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, fullName, maxHours, unavailable } = body;

    if (!id || !fullName || !maxHours) {
      return NextResponse.json({ error: "กรุณากรอกข้อมูลให้ครบ (รหัส, ชื่อ, ภาระงานสูงสุด)" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("autotable");

    // เช็ค ID ซ้ำ
    const existingTeacher = await db.collection<any>("Teacher").findOne({ _id: id });
    if (existingTeacher) {
      return NextResponse.json({ error: "รหัสอาจารย์นี้มีอยู่แล้ว" }, { status: 400 });
    }

    // บันทึก
    await db.collection("Teacher").insertOne({
      _id: id,            // Map id -> _id
      fullName,
      maxHours: Number(maxHours),
      unavailable: unavailable || "", // ถ้าไม่มีให้เป็น string ว่าง
      schedules: []
    });

    return NextResponse.json({ message: "เพิ่มอาจารย์สำเร็จ" });
  } catch (error) {
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการบันทึก" }, { status: 500 });
  }
}

// 🟡 PUT: แก้ไขข้อมูล
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, fullName, maxHours, unavailable } = body;

    if (!id) {
      return NextResponse.json({ error: "ไม่พบรหัสอาจารย์" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("autotable");

    const result = await db.collection<any>("Teacher").updateOne(
      { _id: id },
      {
        $set: {
          fullName,
          maxHours: Number(maxHours),
          unavailable: unavailable || "",
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "ไม่พบข้อมูลที่ต้องการแก้ไข" }, { status: 404 });
    }

    return NextResponse.json({ message: "แก้ไขข้อมูลสำเร็จ" });
  } catch (error) {
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการแก้ไข" }, { status: 500 });
  }
}

// 🔴 DELETE: ลบอาจารย์
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "กรุณาระบุ ID" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("autotable");

    const result = await db.collection<any>("Teacher").deleteOne({ _id: id });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "ไม่พบข้อมูล หรือลบไม่สำเร็จ" }, { status: 404 });
    }

    return NextResponse.json({ message: `ลบอาจารย์ ${id} เรียบร้อยแล้ว` });
  } catch (error) {
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการลบ" }, { status: 500 });
  }
}