function parseCommandWithRegex(text) {
  text = text.trim();

  // Helper to map Day String to Key
  const mapDay = (d) => {
    if (!d) return null;
    d = d.toLowerCase();
    if (d.includes("จันทร์") || d.includes("mon")) return "Mon";
    if (d.includes("อังคาร") || d.includes("tue")) return "Tue";
    if (d.includes("พุธ") || d.includes("wed") || d.includes("พุธ"))
      return "Wed";
    if (d.includes("พฤหัส") || d.includes("thu")) return "Thu";
    if (d.includes("ศุกร์") || d.includes("fri")) return "Fri";
    return null;
  };

  console.log(`Parsing: "${text}"`);

  // 1️⃣ DELETE_ALL
  if (/(?:ลบ|delete)\s*(?:คาบ|ตาราง)?\s*(?:ทั้งหมด|all|schedule)/i.test(text)) {
    console.log("Matched DELETE_ALL");
    return { action: "DELETE_ALL" };
  }

  // 2️⃣ DELETE_SUBJECT
  // The logic in route.ts had a check: (text.includes("วิชา") || text.includes("subject") || text.includes("all"))
  if (
    text.match(
      /(?:ลบ|delete)\s*(?:วิชา|subject|all)?\s*(.+?)\s*(?:ทั้งหมด|all|classes|out)?$/i,
    ) &&
    (text.includes("วิชา") || text.includes("subject") || text.includes("all"))
  ) {
    const match = text.match(
      /(?:ลบ|delete)\s*(?:วิชา|subject|all)?\s*(.+?)\s*(?:ทั้งหมด|all|classes|out)?$/i,
    );
    if (match) {
      const subject = match[1].trim();
      if (subject && !["คาบ", "ตาราง", "schedule"].includes(subject)) {
        console.log(`Matched DELETE_SUBJECT: ${subject}`);
        return { action: "DELETE_SUBJECT" };
      }
    }
  }

  // 3️⃣ SWAP
  const swapMatch = text.match(
    /(?:สลับ|swap).*?(\d+).*?([^\s]+).*?(?:กับ|and|with).*?(\d+).*?([^\s]+)/i,
  );
  if (swapMatch) {
    const day1 = mapDay(swapMatch[2]);
    const day2 = mapDay(swapMatch[4]);
    if (day1 && day2) {
      return {
        action: "SWAP",
        confidence: 0.9,
        parameters: {
          a: { day: day1, slot: parseInt(swapMatch[1]) },
          b: { day: day2, slot: parseInt(swapMatch[3]) },
        },
        explanation: `สลับคาบ ${swapMatch[1]} ${day1} กับ ${swapMatch[3]} ${day2} (Offline Parsed)`,
      };
    }
  }

  // 4️⃣ MOVE
  const moveMatch1 = text.match(
    /(?:ย้าย|move).*?(\d+).*?(?:วัน)?([^\s]+).*?(?:ไป|to).*?(?:วัน)?([^\s]+).*?(\d+)/i,
  );
  if (moveMatch1) {
    const fromDay = mapDay(moveMatch1[2]);
    const toDay = mapDay(moveMatch1[3]);
    if (fromDay && toDay) {
      return {
        action: "MOVE",
        confidence: 0.9,
        parameters: {
          subject: "AUTO_DETECT",
          fromDay: fromDay,
          fromSlot: parseInt(moveMatch1[1]),
          toDay: toDay,
          toSlot: parseInt(moveMatch1[4]),
        },
        explanation: "ย้ายคาบ (Offline Parsed)",
      };
    }
  }

  // Pattern 2: Move... to slot...
  const moveMatch2 = text.match(
    /(?:ย้าย|move).*?(\d+).*?(?:วัน)?([^\s]+).*?(?:ไป|to).*?(?:คาบ|slot).*?(\d+).*?(?:วัน)?([^\s]+)/i,
  );
  if (moveMatch2) {
    const fromDay = mapDay(moveMatch2[2]);
    const toDay = mapDay(moveMatch2[4]);
    if (fromDay && toDay) {
      return {
        action: "MOVE",
        confidence: 0.9,
        parameters: {
          subject: "AUTO_DETECT",
          fromDay: fromDay,
          fromSlot: parseInt(moveMatch2[1]),
          toDay: toDay,
          toSlot: parseInt(moveMatch2[3]),
        },
        explanation: "ย้ายคาบ (Offline Parsed)",
      };
    }
  }

  // Pattern 2: Day before Slot ("Move Mon Slot 1 to Fri Slot 4")
  // "ย้ายคาบวันจันทร์คาบที่1ไปวันศุกร์คาบที่4"
  const moveMatch3 = text.match(
    /(?:ย้าย|move).*?(?:วัน)?([^\s\d]+).*?(\d+).*?(?:ไป|to).*?(?:วัน)?([^\s\d]+).*?(\d+)/i,
  );
  if (moveMatch3) {
    const fromDay = mapDay(moveMatch3[1]);
    const toDay = mapDay(moveMatch3[3]);
    if (fromDay && toDay) {
      return {
        action: "MOVE",
        confidence: 0.9,
        parameters: {
          subject: "AUTO_DETECT",
          fromDay: fromDay,
          fromSlot: parseInt(moveMatch3[2]),
          toDay: toDay,
          toSlot: parseInt(moveMatch3[4]),
        },
        explanation: "ย้ายคาบ (Offline Parsed - Pattern 3)",
      };
    }
  }

  // 5️⃣ DELETE (Single Slot)
  const delMatch = text.match(
    /(?:ลบ|delete).*?(?:คาบ|slot).*?(\d+).*?(?:วัน)?([^\s]+)/i,
  );
  if (delMatch) {
    const day = mapDay(delMatch[2]);
    if (day) {
      return {
        action: "DELETE",
        confidence: 0.9,
        parameters: {
          day: day,
          slotNo: parseInt(delMatch[1]),
        },
        explanation: `ลบคาบ ${delMatch[1]} ${day} (Offline Parsed)`,
      };
    }
  }

  return null;
}

// Test Cases
console.log("1:", parseCommandWithRegex("ลบคาบ 7 วันศุกร์"));
console.log("2:", parseCommandWithRegex("ย้ายคาบ 1 วันจันทร์ ไปวันพุธ คาบ 1"));
console.log(
  "3:",
  parseCommandWithRegex("สลับคาบ 1 วันจันทร์ กับ คาบ 2 วันจันทร์"),
);
console.log(
  "4:",
  parseCommandWithRegex("ย้ายคาบวันจันทร์คาบที่1ไปวันศุกร์คาบที่4"),
); // No spaces
