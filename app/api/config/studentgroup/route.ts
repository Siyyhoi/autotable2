import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';



// ---------------------------------------------------------
// 🟢 GET: ดึงข้อมูลกลุ่มเรียนทั้งหมด
// ---------------------------------------------------------
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("autotable");
    const groups = await db.collection("StudentGroup").find({}).toArray();

    const formattedGroups = groups.map(g => ({
      group_id: g._id, 
      group_name: g.group_name,
      group_count: g.group_count,
      advisor: g.advisor
    }));

    // แก้ไขจุดนี้: ต้องส่ง formattedGroups กลับไป (ในโค้ดเก่าคุณเขียนเป็น formattedSubjects)
    return NextResponse.json(formattedGroups);
  } catch (error) {
    return NextResponse.json({ error: "ดึงข้อมูลกลุ่มเรียนไม่สำเร็จ" }, { status: 500 });
  }
}

// ---------------------------------------------------------
// 🔵 POST: เพิ่มกลุ่มเรียนใหม่
// ---------------------------------------------------------
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { group_id, group_name, group_count, advisor } = body;

    // ตรวจสอบข้อมูลตาม Model
    if (!group_id || !group_name || group_count === undefined || !advisor) {
      return NextResponse.json({ error: "กรุณากรอกข้อมูลให้ครบ (รหัส, ชื่อกลุ่ม, จำนวนนักเรียน, อาจารย์ที่ปรึกษา)" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("autotable");

    const existing = await db.collection("StudentGroup").findOne({ _id: group_id });
    if (existing) {
      return NextResponse.json({ error: `รหัสกลุ่มนี้ (${group_id}) มีอยู่แล้ว` }, { status: 400 });
    }

    await db.collection("StudentGroup").insertOne({
      _id: group_id,
      group_name,
      group_count: Number(group_count),
      advisor
    });

    return NextResponse.json({ message: "เพิ่มกลุ่มเรียนสำเร็จ" });
  } catch (error) {
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการบันทึก" }, { status: 500 });
  }
}

// ---------------------------------------------------------
// 🟡 PUT: แก้ไขข้อมูลกลุ่มเรียน
// ---------------------------------------------------------
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { group_id, group_name, group_count, advisor } = body;

    if (!group_id) {
      return NextResponse.json({ error: "ไม่พบรหัสกลุ่มเรียน (group_id)" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("autotable");

    const result = await db.collection("StudentGroup").updateOne(
      { _id: group_id },
      {
        $set: {
          group_name,
          group_count: Number(group_count),
          advisor
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "ไม่พบข้อมูลกลุ่มเรียนที่ต้องการแก้ไข" }, { status: 404 });
    }

    return NextResponse.json({ message: "แก้ไขข้อมูลสำเร็จ" });
  } catch (error) {
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการแก้ไข" }, { status: 500 });
  }
}

// ---------------------------------------------------------
// 🔴 DELETE: ลบกลุ่มเรียน
// ---------------------------------------------------------
export async function DELETE(req: Request) {
    
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "กรุณาระบุ ID ที่ต้องการลบ" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("autotable");

    const result = await db.collection<any>("StudentGroup").deleteOne({ _id: id });
    
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "ไม่พบข้อมูลที่ต้องการลบ" }, { status: 404 });
    }

    return NextResponse.json({ message: "ลบกลุ่มเรียนเรียบร้อยแล้ว" });
  } catch (error) {
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการลบ" }, { status: 500 });
  }
}