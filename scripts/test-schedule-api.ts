import fetch from "node-fetch";

const API_URL = "http://localhost:3000/api/generate";

// Mock schedule data for testing
const mockSchedule = [
  {
    day: "Mon",
    slotNo: 1,
    subject: "S001",
    subjectName: "Mathematics",
    teacher: "T001",
    room: "R001",
  },
  {
    day: "Mon",
    slotNo: 2,
    subject: "S002",
    subjectName: "Physics",
    teacher: "T002",
    room: "R002",
  },
  {
    day: "Tue",
    slotNo: 1,
    subject: "S001",
    subjectName: "Mathematics",
    teacher: "T001",
    room: "R001",
  },
  {
    day: "Fri",
    slotNo: 4,
    subject: "S003",
    subjectName: "Chemistry",
    teacher: "T003",
    room: "R003",
  },
];

async function testCommand(command: string) {
  console.log(`\n🧪 Testing command: "${command}"`);
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: command,
        currentSchedule: mockSchedule,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`✅ Success: ${data.message || "No message"}`);
      console.log(`   Action: ${data.action}`);
      if (data.action === "DELETE_ALL") {
        console.log(`   Result count: ${data.result.length}`);
      } else if (data.action === "DELETE_SUBJECT") {
        console.log(`   Deleted count: ${data.deletedCount}`);
        console.log(`   Remaining: ${data.result.length}`);
      } else if (data.action === "MOVE") {
        console.log(`   Moved: ${JSON.stringify(data.moved)}`);
      }
    } else {
      console.error(`❌ Failed: ${data.error}`);
    }
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
  }
}

async function main() {
  // Test 1: Move
  await testCommand("ย้ายคาบ 1 วันจันทร์ ไปวันพุธ คาบ 1");

  // Test 2: Swap
  await testCommand("สลับคาบ 1 วันจันทร์ กับ คาบ 2 วันจันทร์");

  // Test 3: Delete Subject
  await testCommand("ลบวิชา Mathematics ทั้งหมด");

  // Test 4: Delete All
  await testCommand("ลบคาบทั้งหมด");
}

main();
