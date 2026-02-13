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

    // แปลงข้อมูลให้ตรงกับ Model Room ใน Schema
    const formattedRooms = rooms.map(room => ({
      room_id: room._id,     // Map _id ของ Mongo กลับเป็น room_id
      room_name: room.room_name,
      room_type: room.room_type,
      // ตัด capacity และ schedules ออก เพราะไม่มีใน Schema ใหม่
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
    // รับค่าตามชื่อ Field ใน Schema
    const { room_id, room_name, room_type } = body;

    // เช็ค Validation
    if (!room_id || !room_name || !room_type) {
      return NextResponse.json({ error: "กรุณากรอกข้อมูลให้ครบ (room_id, room_name, room_type)" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("autotable");

    // เช็คว่ามี ID ซ้ำไหม
    const existingRoom = await db.collection("Room").findOne({ _id: room_id });
    if (existingRoom) {
      return NextResponse.json({ error: `รหัสห้องนี้ (${room_id}) มีอยู่แล้ว` }, { status: 400 });
    }

    // บันทึกข้อมูล
    await db.collection("Room").insertOne({
      _id: room_id,      // ใช้ room_id เป็น Primary Key (_id) ตาม @map("_id")
      room_name,
      room_type
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
    const { room_id, room_name, room_type } = body;

    // ต้องมี room_id เพื่อระบุตัวตนห้องที่จะแก้
    if (!room_id) {
      return NextResponse.json({ error: "ไม่พบรหัสห้อง (room_id)" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("autotable");

    // อัปเดตข้อมูลโดยค้นหาจาก _id (ซึ่งเก็บค่า room_id ไว้)
    const result = await db.collection("Room").updateOne(
      { _id: room_id },
      {
        $set: {
          room_name,
          room_type,
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

// ---------------------------------------------------------
// 🔴 DELETE: ลบห้อง
// ---------------------------------------------------------
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id"); // รับค่า id มา (ซึ่งคือ room_id)

    if (!id) {
      return NextResponse.json({ error: "กรุณาระบุ ID ที่ต้องการลบ" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("autotable");

    const result = await db.collection<any>("Room").deleteOne({ _id: id });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "ไม่พบข้อมูลห้อง หรือลบไม่สำเร็จ" }, { status: 404 });
    }

    return NextResponse.json({ message: `ลบห้อง ${id} เรียบร้อยแล้ว` });
  } catch (error) {
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการลบ" }, { status: 500 });
  }
}