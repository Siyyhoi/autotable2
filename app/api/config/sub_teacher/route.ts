import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb'; 

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("autotable");
    
    console.log("MongoDB Connected");

    const sub_teachers = await db.collection("SubjectTeacher").find({}).toArray();
    console.log(`Found ${sub_teachers.length} sub_teachers`);

    return NextResponse.json(sub_teachers);

  } catch (error: any) {

    console.error("❌ Database Error:", error); 
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}