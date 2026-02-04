import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb'; 

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("autotable");
    
    console.log("MongoDB Connected");

    const Teachers = await db.collection("Teacher").find({}).toArray();
    console.log(`Found ${Teachers.length} Teachers`);

    return NextResponse.json(Teachers);

  } catch (error: any) {

    console.error("Database Error:", error); 
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}