import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

// ---------------------------------------------------------
// 🟢 GET: ดึงข้อมูลห้องทั้งหมด
// ---------------------------------------------------------
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("autotable");
    const rooms = await db.collection("Room").find({}).toArray();

    // แปลง _id กลับเป็น id เพื่อให้หน้าบ้านใช้ง่าย
    const formattedRooms = rooms.map(room => ({
      ...room,
      id: room._id // map _id ของ mongo กลับมาเป็น id
    }));

    return NextResponse.json(formattedRooms);
  } catch (error) {
    return NextResponse.json({ error: "ดึงข้อมูลไม่สำเร็จ" }, { status: 500 });
  }
}

// ---------------------------------------------------------
// 🔵 POST: เพิ่มห้องใหม่
// ---------------------------------------------------------
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, name, type, capacity } = body;

    if (!id || !name || !type || !capacity) {
      return NextResponse.json({ error: "กรุณากรอกข้อมูลให้ครบ" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("autotable");

    // เช็คว่ามี ID ซ้ำไหม
    const existingRoom = await db.collection("Room").findOne({ _id: id });
    if (existingRoom) {
      return NextResponse.json({ error: "รหัสห้องนี้ (ID) มีอยู่แล้ว" }, { status: 400 });
    }

    // บันทึกข้อมูล
    await db.collection("Room").insertOne({
      _id: id, // ใช้ค่าที่กรอกเป็น Primary Key
      name,
      type,
      capacity: Number(capacity),
      schedules: []
    });

    return NextResponse.json({ message: "เพิ่มห้องสำเร็จ" });
  } catch (error) {
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการบันทึก" }, { status: 500 });
  }
}

// ---------------------------------------------------------
// 🟡 PUT: แก้ไขข้อมูลห้อง
// ---------------------------------------------------------
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, name, type, capacity } = body;

    // ต้องมี id เพื่อระบุตัวตนห้องที่จะแก้
    if (!id) {
      return NextResponse.json({ error: "ไม่พบรหัสห้อง (ID)" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("autotable");

    // อัปเดตข้อมูลโดยค้นหาจาก _id (ซึ่งคือ id ของเรา)
    const result = await db.collection("Room").updateOne(
      { _id: id },
      {
        $set: {
          name,
          type,
          capacity: Number(capacity),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "ไม่พบห้องที่ต้องการแก้ไข" }, { status: 404 });
    }

    return NextResponse.json({ message: "แก้ไขข้อมูลสำเร็จ" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการแก้ไข" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "กรุณาระบุ ID ที่ต้องการลบ" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("autotable");

    // 🔥 แก้จุดที่ 3: ใส่ <any> เพื่อแก้ error Type 'string' is not assignable...
    const result = await db.collection<any>("Room").deleteOne({ _id: id });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "ไม่พบข้อมูลห้อง หรือลบไม่สำเร็จ" }, { status: 404 });
    }

    return NextResponse.json({ message: `ลบห้อง ${id} เรียบร้อยแล้ว` });
  } catch (error) {
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการลบ" }, { status: 500 });
  }
}