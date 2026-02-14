import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

// ---------------------------------------------------------
// 🟢 GET: ดึงข้อมูลวิชาทั้งหมด
// ---------------------------------------------------------
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("autotable");

    // Sort ตามรหัสวิชา
    const subjects = await db
      .collection("Subject")
      .find({})
      .sort({ _id: 1 })
      .toArray();

    const formattedSubjects = subjects.map((s) => ({
      subject_id: s._id, // map _id กลับเป็น subject_id
      subject_name: s.subject_name,
      theory: s.theory,
      practice: s.practice,
      credit: s.credit,
    }));

    return NextResponse.json(formattedSubjects);
  } catch (error) {
    return NextResponse.json({ error: "ดึงข้อมูลไม่สำเร็จ" }, { status: 500 });
  }
}

// ---------------------------------------------------------
// 🔵 POST: เพิ่มวิชาใหม่
// ---------------------------------------------------------
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as any;
    const { subject_id, subject_name, theory, practice, credit } = body;

    if (
      !subject_id ||
      !subject_name ||
      theory === undefined ||
      practice === undefined ||
      credit === undefined
    ) {
      return NextResponse.json(
        { error: "กรุณากรอกข้อมูลให้ครบ" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db("autotable");

    // ใช้ _id เป็น subject_id เพื่อป้องกันรหัสซ้ำอัตโนมัติจาก MongoDB Index
    const existing = await db
      .collection("Subject")
      .findOne({ _id: subject_id });
    if (existing) {
      return NextResponse.json(
        { error: `รหัสวิชานี้ (${subject_id}) มีอยู่แล้ว` },
        { status: 400 },
      );
    }

    await db.collection("Subject").insertOne({
      _id: subject_id,
      subject_name,
      theory: Number(theory),
      practice: Number(practice),
      credit: Number(credit),
    });

    return NextResponse.json({ message: "เพิ่มวิชาสำเร็จ" });
  } catch (error) {
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการบันทึก" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------
// 🟡 PUT: แก้ไขวิชา
// ---------------------------------------------------------
export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as any;
    const { subject_id, subject_name, theory, practice, credit } = body;

    if (!subject_id) {
      return NextResponse.json(
        { error: "ไม่พบรหัสวิชา (subject_id)" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db("autotable");

    const result = await db.collection("Subject").updateOne(
      { _id: subject_id },
      {
        $set: {
          subject_name,
          theory: Number(theory),
          practice: Number(practice),
          credit: Number(credit),
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
// 🔴 DELETE: ลบวิชา
// ---------------------------------------------------------
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "กรุณาระบุ ID ที่ต้องการลบ" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db("autotable");

    const result = await db.collection<any>("Subject").deleteOne({ _id: id });

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
