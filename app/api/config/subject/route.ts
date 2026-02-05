import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

// 🟢 GET: ดึงข้อมูล
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("autotable");
    const subjects = await db.collection("Subject").find({}).toArray();

    const formattedSubjects = subjects.map(sub => ({
      ...sub,
      id: sub._id // map _id เป็น id
    }));

    return NextResponse.json(formattedSubjects);
  } catch (error) {
    return NextResponse.json({ error: "ดึงข้อมูลไม่สำเร็จ" }, { status: 500 });
  }
}

// 🔵 POST: เพิ่มวิชาใหม่ (แก้ให้ตรง Schema)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    // 1. รับค่าให้ตรงกับ Model
    const { 
        id, nameTH, nameEN, 
        lectureHours, labHours, 
        recommendedYear, 
        reqComputer, reqNetwork, reqBusiness 
    } = body;

    // Validation (เช็คเฉพาะค่าที่จำเป็น)
    if (!id || !nameTH) {
      return NextResponse.json({ error: "กรุณากรอกรหัสวิชาและชื่อภาษาไทย" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("autotable");

    const existingSubject = await db.collection<any>("Subject").findOne({ _id: id });
    if (existingSubject) {
      return NextResponse.json({ error: "รหัสวิชานี้มีอยู่แล้ว" }, { status: 400 });
    }

    // 2. คำนวณ totalHours อัตโนมัติ
    const lect = Number(lectureHours) || 0;
    const lab = Number(labHours) || 0;
    const total = lect + lab;

    // 3. บันทึก
    await db.collection("Subject").insertOne({
      _id: id,
      nameTH,
      nameEN: nameEN || "",
      lectureHours: lect,
      labHours: lab,
      totalHours: total, // Auto calculate
      recommendedYear: Number(recommendedYear) || 1,
      reqComputer: Boolean(reqComputer),
      reqNetwork: Boolean(reqNetwork),
      reqBusiness: Boolean(reqBusiness),
      schedules: []
    });

    return NextResponse.json({ message: "เพิ่มวิชาสำเร็จ" });
  } catch (error) {
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการบันทึก" }, { status: 500 });
  }
}

// 🟡 PUT: แก้ไขวิชา
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { 
        id, nameTH, nameEN, 
        lectureHours, labHours, 
        recommendedYear, 
        reqComputer, reqNetwork, reqBusiness 
    } = body;

    if (!id) {
      return NextResponse.json({ error: "ไม่พบรหัสวิชา" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("autotable");

    // คำนวณใหม่
    const lect = Number(lectureHours) || 0;
    const lab = Number(labHours) || 0;
    const total = lect + lab;

    const result = await db.collection<any>("Subject").updateOne(
      { _id: id },
      {
        $set: {
          nameTH,
          nameEN,
          lectureHours: lect,
          labHours: lab,
          totalHours: total,
          recommendedYear: Number(recommendedYear),
          reqComputer: Boolean(reqComputer),
          reqNetwork: Boolean(reqNetwork),
          reqBusiness: Boolean(reqBusiness),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "ไม่พบวิชาที่ต้องการแก้ไข" }, { status: 404 });
    }

    return NextResponse.json({ message: "แก้ไขข้อมูลสำเร็จ" });
  } catch (error) {
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการแก้ไข" }, { status: 500 });
  }
}

// 🔴 DELETE: เหมือนเดิม (ใช้ id ลบ)
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "กรุณาระบุ ID" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("autotable");
    const result = await db.collection<any>("Subject").deleteOne({ _id: id });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "ไม่พบข้อมูล" }, { status: 404 });
    }

    return NextResponse.json({ message: `ลบวิชา ${id} เรียบร้อยแล้ว` });
  } catch (error) {
    return NextResponse.json({ error: "ลบไม่สำเร็จ" }, { status: 500 });
  }
}