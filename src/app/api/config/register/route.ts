import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// ---------------------------------------------------------
// 🟢 GET: ดึงข้อมูลการลงทะเบียนทั้งหมด
// ---------------------------------------------------------
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("autotable");

    const registers = await db.collection("Register").find({}).toArray();

    const formatted = registers.map((r) => ({
      id: r._id.toString(),
      group_id: r.group_id,
      subject_id: r.subject_id,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    return NextResponse.json({ error: "ดึงข้อมูลไม่สำเร็จ" }, { status: 500 });
  }
}

// ---------------------------------------------------------
// 🔵 POST: เพิ่มการลงทะเบียนใหม่
// ---------------------------------------------------------
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as any;
    const { group_id, subject_id } = body;

    if (!group_id || !subject_id) {
      return NextResponse.json(
        { error: "กรุณาระบุรหัสกลุ่มเรียนและรหัสวิชา" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db("autotable");

    // เช็ค Unique Constraint (กลุ่มนี้ลงวิชานี้ไปหรือยัง)
    const existing = await db.collection("Register").findOne({
      group_id: group_id,
      subject_id: subject_id,
    });

    if (existing) {
      return NextResponse.json(
        { error: "กลุ่มเรียนนี้ลงทะเบียนวิชานี้ไปแล้ว" },
        { status: 400 },
      );
    }

    await db.collection("Register").insertOne({
      group_id,
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
// 🟡 PUT: แก้ไขการลงทะเบียน
// ---------------------------------------------------------
export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as any;
    const { id, group_id, subject_id } = body;

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "ID ไม่ถูกต้อง" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("autotable");

    // เช็คซ้ำ
    const duplicate = await db.collection("Register").findOne({
      group_id,
      subject_id,
      _id: { $ne: new ObjectId(id) },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: "ข้อมูลการลงทะเบียนนี้มีซ้ำอยู่ในระบบ" },
        { status: 400 },
      );
    }

    const result = await db.collection("Register").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          group_id,
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
// 🔴 DELETE: ลบการลงทะเบียน
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
      .collection("Register")
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
