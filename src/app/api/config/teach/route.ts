import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb"; // ต้องใช้ ObjectId เพราะ id เป็น auto generate

// ---------------------------------------------------------
// 🟢 GET: ดึงข้อมูลการสอนทั้งหมด
// ---------------------------------------------------------
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("autotable");

    // ดึงข้อมูล Teach ทั้งหมด
    const teaches = await db.collection("Teach").find({}).toArray();

    // จัดรูปแบบข้อมูลส่งกลับ (แปลง _id เป็น string)
    const formatted = teaches.map((t: any) => ({
      id: t._id.toString(),
      teacher_id: t.teacher_id,
      subject_id: t.subject_id,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    return NextResponse.json({ error: "ดึงข้อมูลไม่สำเร็จ" }, { status: 500 });
  }
}

// ---------------------------------------------------------
// 🔵 POST: เพิ่มการสอนใหม่
// ---------------------------------------------------------
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as any;
    const { teacher_id, subject_id } = body;

    if (!teacher_id || !subject_id) {
      return NextResponse.json(
        { error: "กรุณาระบุรหัสอาจารย์และรหัสวิชา" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db("autotable");

    // เช็คว่าคู่นี้มีอยู่แล้วหรือไม่ (Unique Constraint)
    const existing = await db.collection("Teach").findOne({
      teacher_id: teacher_id,
      subject_id: subject_id,
    });

    if (existing) {
      return NextResponse.json(
        { error: "ข้อมูลการสอนนี้มีอยู่แล้ว" },
        { status: 400 },
      );
    }

    // Insert (MongoDB จะสร้าง _id ให้เอง)
    await db.collection("Teach").insertOne({
      teacher_id,
      subject_id,
    });

    return NextResponse.json({ message: "เพิ่มข้อมูลสำเร็จ" });
  } catch (error) {
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการบันทึก" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------
// 🟡 PUT: แก้ไขข้อมูลการสอน
// ---------------------------------------------------------
export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as any;
    const { id, teacher_id, subject_id } = body;

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "ID ไม่ถูกต้อง" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("autotable");

    // เช็คซ้ำก่อนแก้ (ถ้าแก้แล้วไปซ้ำกับคนอื่น)
    const duplicate = await db.collection("Teach").findOne({
      teacher_id,
      subject_id,
      _id: { $ne: new ObjectId(id) }, // ไม่นับตัวเอง
    });

    if (duplicate) {
      return NextResponse.json(
        { error: "ข้อมูลการสอนนี้มีอยู่แล้ว" },
        { status: 400 },
      );
    }

    const result = await db.collection("Teach").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          teacher_id,
          subject_id,
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
// 🔴 DELETE: ลบข้อมูลการสอน
// ---------------------------------------------------------
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "ID ไม่ถูกต้อง" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("autotable");

    const result = await db
      .collection("Teach")
      .deleteOne({ _id: new ObjectId(id) });

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
