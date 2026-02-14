import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

// ---------------------------------------------------------
// 🟢 GET: ดึงข้อมูลอาจารย์ทั้งหมด
// ---------------------------------------------------------
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("autotable");
    const teachers = await db.collection("Teacher").find({}).toArray();

    // Map _id กลับเป็น teacher_id ให้ตรงกับ Model
    const formattedTeachers = teachers.map((t: any) => ({
      teacher_id: t._id,
      teacher_name: t.teacher_name,
      role: t.role,
    }));

    return NextResponse.json(formattedTeachers);
  } catch (error) {
    return NextResponse.json({ error: "ดึงข้อมูลไม่สำเร็จ" }, { status: 500 });
  }
}

// ---------------------------------------------------------
// 🔵 POST: เพิ่มอาจารย์ใหม่
// ---------------------------------------------------------
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as any;
    const { teacher_id, teacher_name, role } = body;

    if (!teacher_id || !teacher_name || !role) {
      return NextResponse.json(
        { error: "กรุณากรอกข้อมูลให้ครบ" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db("autotable");

    // เช็ค ID ซ้ำ
    const existing = await db
      .collection("Teacher")
      .findOne({ _id: teacher_id });
    if (existing) {
      return NextResponse.json(
        { error: `รหัสอาจารย์นี้ (${teacher_id}) มีอยู่แล้ว` },
        { status: 400 },
      );
    }

    // บันทึก (map teacher_id -> _id)
    await db.collection("Teacher").insertOne({
      _id: teacher_id,
      teacher_name,
      role,
    });

    return NextResponse.json({ message: "เพิ่มอาจารย์สำเร็จ" });
  } catch (error) {
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการบันทึก" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------
// 🟡 PUT: แก้ไขข้อมูลอาจารย์
// ---------------------------------------------------------
export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as any;
    const { teacher_id, teacher_name, role } = body;

    if (!teacher_id) {
      return NextResponse.json(
        { error: "ไม่พบรหัสอาจารย์ (teacher_id)" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db("autotable");

    const result = await db.collection("Teacher").updateOne(
      { _id: teacher_id },
      {
        $set: {
          teacher_name,
          role,
        },
      },
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "ไม่พบข้อมูลที่ต้องการแก้ไข" },
        { status: 404 },
      );
    }

    return NextResponse.json({ message: "แก้ไขข้อมูลสำเร็จ" });
  } catch (error) {
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการแก้ไข" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------
// 🔴 DELETE: ลบอาจารย์
// ---------------------------------------------------------
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id"); // รับ teacher_id

    if (!id) {
      return NextResponse.json(
        { error: "กรุณาระบุ ID ที่ต้องการลบ" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db("autotable");

    const result = await db.collection<any>("Teacher").deleteOne({ _id: id });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "ไม่พบข้อมูล หรือลบไม่สำเร็จ" },
        { status: 404 },
      );
    }

    return NextResponse.json({ message: "ลบข้อมูลเรียบร้อยแล้ว" });
  } catch (error) {
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการลบ" },
      { status: 500 },
    );
  }
}
