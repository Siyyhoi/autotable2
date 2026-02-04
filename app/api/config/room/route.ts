import { NextResponse } from 'next/server';
// แนะนำ: ใช้ @ แทน ../ จะได้ไม่ต้องนับจุดครับ (ถ้า Next.js setup ปกติ)
import clientPromise from '@/lib/mongodb'; 

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("autotable");
    
    // ลองเช็คก่อนว่าต่อติดไหม
    console.log("✅ MongoDB Connected");

    const rooms = await db.collection("Room").find({}).toArray();
    console.log(`✅ Found ${rooms.length} rooms`);

    return NextResponse.json(rooms);

  } catch (error: any) {
    // 🔥 บรรทัดนี้สำคัญมาก! มันจะปริ้น Error จริงออกมาดูใน Terminal VS Code
    console.error("❌ Database Error:", error); 
    
    // ส่ง Error จริงกลับไปที่หน้าเว็บด้วย จะได้รู้เรื่อง
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}