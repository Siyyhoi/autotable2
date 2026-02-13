import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";

// =====================================================
// Helper
// =====================================================
const getVal = (item: any, keys: string[]) => {
  for (const key of keys) {
    if (
      item?.[key] !== undefined &&
      item?.[key] !== null &&
      item?.[key] !== ""
    ) {
      return item[key];
    }
  }
  return "";
};

// =====================================================
// Load Thai Font (Server Side)
// =====================================================
async function loadThaiFont(doc: any) {
  const fontPath = path.join(
    process.cwd(),
    "public/fonts/THSarabunNew.ttf"
  );

  const fontBuffer = fs.readFileSync(fontPath);
  const fontBase64 = fontBuffer.toString("base64");

  doc.addFileToVFS("THSarabunNew.ttf", fontBase64);
  doc.addFont("THSarabunNew.ttf", "THSarabun", "normal");
  doc.setFont("THSarabun");
}

// =====================================================
// PDF Generator
// =====================================================
async function generatePDF(
  data: any,
  mode: "single" | "all"
): Promise<ArrayBuffer> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  await loadThaiFont(doc);

  if (mode === "single") {
    createSinglePDF(doc, data, autoTable);
  } else {
    createAllPDF(doc, data, autoTable);
  }

  return doc.output("arraybuffer");
}

// =====================================================
// Single PDF
// =====================================================
function createSinglePDF(doc: any, data: any, autoTable: any) {
  const { group_name, advisor, schedule } = data;

  doc.setFontSize(20);
  doc.text(`ตารางสอน: ${group_name}`, 14, 20);

  doc.setFontSize(14);
  doc.text(`ที่ปรึกษา: ${advisor}`, 14, 30);

  const tableData = (schedule || []).map((s: any) => [
    s.day || "",
    s.time || "",
    getVal(s, ["subject_id", "subjectId", "code"]),
    getVal(s, ["subject_name", "subjectName"]),
    getVal(s, ["teacher_name", "teacher"]),
    getVal(s, ["room_name", "room"]),
  ]);

  autoTable(doc, {
    startY: 40,
    head: [["วัน", "เวลา", "รหัสวิชา", "ชื่อวิชา", "อาจารย์", "ห้อง"]],
    body: tableData,
    styles: {
      font: "THSarabun",
      fontSize: 14,
    },
    headStyles: {
      font: "THSarabun",
      fontStyle: "normal",
    },
    margin: { left: 14, right: 14 },
  });
}

// =====================================================
// All Groups PDF
// =====================================================
function createAllPDF(doc: any, data: any, autoTable: any) {
  const { groups } = data;

  groups.forEach((group: any, index: number) => {
    if (index > 0) doc.addPage();

    doc.setFontSize(20);
    doc.text(`ตารางสอน: ${group.group_name}`, 14, 20);

    doc.setFontSize(14);
    doc.text(`ที่ปรึกษา: ${group.advisor}`, 14, 30);

    const tableData = (group.schedule || []).map((s: any) => [
      s.day || "",
      s.time || "",
      getVal(s, ["subject_id", "subjectId", "code"]),
      getVal(s, ["subject_name", "subjectName"]),
      getVal(s, ["teacher_name", "teacher"]),
      getVal(s, ["room_name", "room"]),
    ]);

    autoTable(doc, {
      startY: 40,
      head: [["วัน", "เวลา", "รหัสวิชา", "ชื่อวิชา", "อาจารย์", "ห้อง"]],
      body: tableData,
      styles: {
        font: "THSarabun",
        fontSize: 14,
      },
      headStyles: {
        font: "THSarabun",
        fontStyle: "normal",
      },
      margin: { left: 14, right: 14 },
    });
  });
}

// =====================================================
// MAIN POST
// =====================================================
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { mode, groups, schedule, group_name, advisor, format } = body;

    // ================= CSV =================
    if (format === "csv") {
      let csv = "\uFEFF";
      csv += "กลุ่ม,ที่ปรึกษา,วัน,เวลา,รหัสวิชา,ชื่อวิชา,อาจารย์,ห้อง\n";

      if (mode === "all") {
        groups?.forEach((g: any) => {
          g.schedule?.forEach((s: any) => {
            csv += `"${g.group_name}","${g.advisor}","${s.day}","${s.time}","${getVal(
              s,
              ["subject_id"]
            )}","${getVal(s, ["subject_name"])}","${getVal(
              s,
              ["teacher_name"]
            )}","${getVal(s, ["room_name"])}"\n`;
          });
        });
      } else {
        schedule?.forEach((s: any) => {
          csv += `"${group_name}","${advisor}","${s.day}","${s.time}","${getVal(
            s,
            ["subject_id"]
          )}","${getVal(s, ["subject_name"])}","${getVal(
            s,
            ["teacher_name"]
          )}","${getVal(s, ["room_name"])}"\n`;
        });
      }

      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="schedule.csv"`,
        },
      });
    }

    // ================= PDF =================
    if (format === "pdf") {
      const pdfArrayBuffer = await generatePDF(
        mode === "all"
          ? { groups }
          : { group_name, advisor, schedule },
        mode
      );

      return new Response(pdfArrayBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="schedule.pdf"`,
        },
      });
    }

    // ================= EXCEL =================
    const workbook = new ExcelJS.Workbook();

    const createSheet = (gName: string, gAdvisor: string, sched: any[]) => {
      const sheet = workbook.addWorksheet(
        (gName || "Sheet").substring(0, 30)
      );

      sheet.addRow([`ตารางสอน: ${gName}`]);
      sheet.addRow([`ที่ปรึกษา: ${gAdvisor}`]);
      sheet.addRow([]);

      sheet.addRow([
        "วัน",
        "เวลา",
        "รหัสวิชา",
        "ชื่อวิชา",
        "อาจารย์",
        "ห้อง",
      ]);

      sched?.forEach((s) => {
        sheet.addRow([
          s.day || "",
          s.time || "",
          getVal(s, ["subject_id", "subjectId", "code"]),
          getVal(s, ["subject_name", "subjectName"]),
          getVal(s, ["teacher_name", "teacher"]),
          getVal(s, ["room_name", "room"]),
        ]);
      });
    };

    if (mode === "all") {
      groups?.forEach((g: any) =>
        createSheet(g.group_name, g.advisor, g.schedule)
      );
    } else {
      createSheet(group_name, advisor, schedule);
    }

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="schedule.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
