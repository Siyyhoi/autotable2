import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb'; 

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("autotable");
    
    console.log("MongoDB Connected");

    const subjects = await db.collection("Subject").find({}).toArray();
    console.log(`Found ${subjects.length} subjects`);

    return NextResponse.json(subjects);

  } catch (error: any) {

    console.error("❌ Database Error:", error); 
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}