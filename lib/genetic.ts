export interface Teacher {
  id: string;
  fullName: string;
  unavailable: string | null;
}

export interface Subject {
  id: string;
  nameTH: string;
  lectureHours: number;
  labHours: number;
  reqComputer: boolean;
  reqNetwork: boolean;
  reqBusiness: boolean;
}

export interface Room {
  id: string;
  name: string;
  type: string;
}

export interface Timeslot {
  key: string;
  day: string;
  slotNo: number;
  startTime: string;
  endTime: string;
}

export interface ScheduleItem {
  subject: string;
  subjectName: string;
  teacher: string;
  room: string;
  day: string;
  time: string;
  type: 'Lecture' | 'Lab';
}

export class AutoScheduler {
  teachers: Teacher[];
  subjects: Subject[];
  rooms: Room[];
  timeslots: Timeslot[];
  subjectTeacherMap: Record<string, string[]>;
  bookedSlots: Set<string>;

  constructor(teachers: any[], subjects: any[], rooms: any[], timeslots: any[], subTeacherLinks: any[]) {
    this.teachers = teachers;
    this.subjects = subjects;
    this.rooms = rooms;
    this.timeslots = timeslots;
    this.bookedSlots = new Set();
    this.subjectTeacherMap = {};
    
    subTeacherLinks.forEach((link: any) => {
      if (!this.subjectTeacherMap[link.subjectId]) this.subjectTeacherMap[link.subjectId] = [];
      this.subjectTeacherMap[link.subjectId].push(link.teacherId);
    });
  }

  // --- 🔥 ฟังก์ชันสมองกล: ตีความภาษาไทย ---
  public refineSchedule(currentSchedule: ScheduleItem[], prompt: string): ScheduleItem[] {
    console.log(`🧠 Processing Command: "${prompt}"`);
    let newSchedule = [...currentSchedule];
    const lowerPrompt = prompt.toLowerCase();

    // 1. ตีความวัน (Day Parser)
    let targetDay = "";
    if (lowerPrompt.includes("จันทร์") || lowerPrompt.includes("mon")) targetDay = "Mon";
    else if (lowerPrompt.includes("อังคาร") || lowerPrompt.includes("tue")) targetDay = "Tue";
    else if (lowerPrompt.includes("พุธ") || lowerPrompt.includes("wed")) targetDay = "Wed";
    else if (lowerPrompt.includes("พฤหัส") || lowerPrompt.includes("thu")) targetDay = "Thu";
    else if (lowerPrompt.includes("ศุกร์") || lowerPrompt.includes("fri")) targetDay = "Fri";

    // 2. คำสั่ง: สลับคาบ (Swap)
    // Pattern: "สลับคาบ 2 กับ 4", "ย้ายคาบ 1 ไป 3"
    const swapMatch = prompt.match(/คาบ(?:ที่)?\s*(\d+).*?(\d+)/); // หาเลข 2 ตัวในประโยค
    const isSwapCommand = lowerPrompt.includes("สลับ") || lowerPrompt.includes("ย้าย") || lowerPrompt.includes("เปลี่ยน");

    if (isSwapCommand && swapMatch && targetDay) {
        const slotA_No = parseInt(swapMatch[1]);
        const slotB_No = parseInt(swapMatch[2]);
        console.log(`🔄 Action: Swap Slot ${slotA_No} <-> ${slotB_No} on ${targetDay}`);
        newSchedule = this.executeSwap(newSchedule, targetDay, slotA_No, slotB_No);
    }

    // 3. คำสั่ง: พักเที่ยง (Clear Slot)
    else if (lowerPrompt.includes("พัก") || lowerPrompt.includes("ว่าง")) {
        // หาว่าเป็นคาบไหน (ถ้าไม่บอกเลข ถือว่าคาบ 3 คือพักเที่ยง)
        const slotMatch = prompt.match(/คาบ(?:ที่)?\s*(\d+)/);
        const slotToClear = slotMatch ? parseInt(slotMatch[1]) : 3; // Default คาบ 3 (13:00)
        
        // ถ้าบอกวัน ก็ลบแค่วันนั้น ถ้าไม่บอกวัน ลบทุกวัน
        if (targetDay) {
            console.log(`🧹 Action: Clear Slot ${slotToClear} on ${targetDay}`);
            newSchedule = this.clearSpecificSlot(newSchedule, targetDay, slotToClear);
        } else {
            console.log(`🧹 Action: Clear Slot ${slotToClear} (All Days)`);
            newSchedule = this.clearSlotAllDays(newSchedule, slotToClear);
        }
    }

    // 4. คำสั่ง: รีเซ็ต
    else if (lowerPrompt.includes("รีเซ็ต") || lowerPrompt.includes("จัดใหม่")) {
        return this.generate();
    }

    return newSchedule;
  }

  // --- Helper: สลับคาบเรียน ---
  private executeSwap(schedule: ScheduleItem[], day: string, slotA_Num: number, slotB_Num: number): ScheduleItem[] {
    // 1. หา Time String ของ Slot A และ Slot B (เช่น "08:00 - 10:00")
    const timeA = this.getTimeString(day, slotA_Num);
    const timeB = this.getTimeString(day, slotB_Num);

    if (!timeA || !timeB) {
        console.error("❌ Invalid Slots");
        return schedule;
    }

    return schedule.map(item => {
        // ถ้าเป็นวิชาในวันนั้น
        if (item.day === day) {
            // ถ้าเดิมอยู่ Slot A -> ย้ายไป B
            if (item.time === timeA) {
                return { ...item, time: timeB };
            }
            // ถ้าเดิมอยู่ Slot B -> ย้ายไป A
            else if (item.time === timeB) {
                return { ...item, time: timeA };
            }
        }
        return item;
    });
  }

  // --- Helper: ดึงเวลาจากเลขคาบ ---
  private getTimeString(day: string, slotNo: number): string | null {
    const slot = this.timeslots.find(t => t.day === day && t.slotNo === slotNo);
    return slot ? `${slot.startTime} - ${slot.endTime}` : null;
  }

  // --- Helper: ล้างคาบ ---
  private clearSpecificSlot(schedule: ScheduleItem[], day: string, slotNo: number): ScheduleItem[] {
    const timeTarget = this.getTimeString(day, slotNo);
    return schedule.filter(item => !(item.day === day && item.time === timeTarget));
  }

  private clearSlotAllDays(schedule: ScheduleItem[], slotNo: number): ScheduleItem[] {
    // ต้องหาเวลาของแต่ละวัน เพราะบางทีเวลาไม่ตรงกันเป๊ะ
    return schedule.filter(item => {
        const slot = this.timeslots.find(t => t.day === item.day && t.slotNo === slotNo);
        const timeString = slot ? `${slot.startTime} - ${slot.endTime}` : "";
        return item.time !== timeString;
    });
  }


  // --- ส่วน Logic เดิม (Generate) ---
  public generate(): ScheduleItem[] {
    const schedule: ScheduleItem[] = [];
    this.bookedSlots.clear();
    const shuffledSubjects = [...this.subjects].sort(() => 0.5 - Math.random());

    shuffledSubjects.forEach(subj => {
      const teacherIds = this.subjectTeacherMap[subj.id];
      if (!teacherIds || teacherIds.length === 0) return;
      const teacher = this.teachers.find(t => t.id === teacherIds[Math.floor(Math.random() * teacherIds.length)]);
      if (!teacher) return;

      if (subj.lectureHours > 0) this.attemptAllocation(schedule, subj, teacher, 'Lecture');
      if (subj.labHours > 0) this.attemptAllocation(schedule, subj, teacher, 'Lab');
    });
    return schedule;
  }

  private attemptAllocation(schedule: ScheduleItem[], subj: Subject, teacher: Teacher, type: 'Lecture' | 'Lab') {
    const validRooms = this.rooms.filter(r => this.isRoomSuitable(r, subj, type));
    const candidateRooms = validRooms.length > 0 ? validRooms : this.rooms;

    for (let attempt = 0; attempt < 50; attempt++) {
      const slot = this.timeslots[Math.floor(Math.random() * this.timeslots.length)];
      const room = candidateRooms[Math.floor(Math.random() * candidateRooms.length)];

      if (this.isSlotAvailable(slot, room, teacher)) {
        this.bookSlot(slot, room, teacher);
        schedule.push({
          subject: subj.id,
          subjectName: subj.nameTH,
          teacher: teacher.fullName,
          room: room.name,
          day: slot.day,
          time: `${slot.startTime} - ${slot.endTime}`,
          type: type
        });
        return;
      }
    }
  }

  private isRoomSuitable(room: Room, subj: Subject, type: 'Lecture' | 'Lab'): boolean {
    if (type === 'Lecture') return room.type === 'Lecture Room';
    if (subj.reqComputer && room.type === 'Computer Lab') return true;
    if (subj.reqNetwork && room.type === 'Network Lab') return true;
    if (subj.reqBusiness && room.type === 'Business Lab') return true;
    if (!subj.reqComputer && !subj.reqNetwork && !subj.reqBusiness) return room.type.includes('Lab');
    return false;
  }

  private isSlotAvailable(slot: Timeslot, room: Room, teacher: Teacher): boolean {
    if (this.bookedSlots.has(`${slot.day}_${slot.slotNo}_${teacher.id}`)) return false;
    if (this.bookedSlots.has(`${slot.day}_${slot.slotNo}_${room.id}`)) return false;
    if (teacher.unavailable) {
      const busyTimes = teacher.unavailable.split(';');
      if (busyTimes.includes(`${slot.day}-${slot.slotNo}`)) return false;
    }
    return true;
  }

  private bookSlot(slot: Timeslot, room: Room, teacher: Teacher) {
    this.bookedSlots.add(`${slot.day}_${slot.slotNo}_${teacher.id}`);
    this.bookedSlots.add(`${slot.day}_${slot.slotNo}_${room.id}`);
  }
}