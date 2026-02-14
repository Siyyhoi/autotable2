// app/api/import-schedule/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import * as XLSX from "xlsx";
import {
  processStudentGroups,
  processSubjects,
  processTeachers,
  processRooms,
  processTeachRelations,
  processSchedule,
} from "@/utils/excel-processor";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const groupId = formData.get("group_id") as string; // รับมาเผื่อเป็นไฟล์ Schedule

    if (!file) {
      return NextResponse.json(
        { error: "ไม่พบไฟล์ที่อัปโหลด" },
        { status: 400 },
      );
    }

    // 1. อ่านไฟล์
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // แปลงข้อมูลเป็น JSON
    const rawData = XLSX.utils.sheet_to_json(sheet, { defval: "" }); // defval สำคัญเหมือนใน script คุณ

    if (rawData.length === 0) {
      return NextResponse.json({ error: "ไฟล์ว่างเปล่า" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("autotable");

    // 2. 🕵️‍♀️ Smart Detection: ตรวจสอบ Headers เพื่อดูว่าเป็นไฟล์อะไร
    const firstRow: any = rawData[0];
    const headers = Object.keys(firstRow);
    let importedCount = 0;
    let importType = "Unknown";

    // ตรวจสอบจาก Header ที่เป็นเอกลักษณ์ของแต่ละ Table
    if (headers.includes("group_name") && headers.includes("student_count")) {
      importType = "Student Groups";
      importedCount = await processStudentGroups(db, rawData);
    } else if (
      headers.includes("theory") &&
      headers.includes("practice") &&
      headers.includes("credit")
    ) {
      importType = "Subjects";
      importedCount = await processSubjects(db, rawData);
    } else if (headers.includes("role") && headers.includes("teacher_name")) {
      importType = "Teachers";
      importedCount = await processTeachers(db, rawData);
    } else if (headers.includes("room_type") && headers.includes("room_name")) {
      importType = "Rooms";
      importedCount = await processRooms(db, rawData);
    } else if (
      headers.includes("teacher_id") &&
      headers.includes("subject_id") &&
      !headers.includes("role")
    ) {
      // กรณี Teach Relation (มีแค่ teacher_id กับ subject_id)
      importType = "Teach Relations";
      importedCount = await processTeachRelations(db, rawData);
    } else {
      // Default: สมมติว่าเป็น Schedule (ตารางสอน)
      importType = "Schedule";
      importedCount = await processSchedule(db, rawData, groupId);
    }

    console.log(`✅ Imported ${importType}: ${importedCount} items`);

    return NextResponse.json({
      success: true,
      message: `นำเข้า ${importType} สำเร็จ`,
      type: importType,
      imported_count: importedCount,
    });
  } catch (error: any) {
    console.error("Import Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
