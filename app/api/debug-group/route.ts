
import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { group_id } = body;

        if (!group_id) {
            return NextResponse.json({ error: "Group ID is required" }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db("autotable");

        // 1. Get Group Info
        const group = await db.collection("StudentGroup").findOne({ group_id });
        if (!group) {
            return NextResponse.json({ error: "Group not found" }, { status: 404 });
        }

        // 2. Get Registers
        const registers = await db.collection("Register").find({ group_id }).toArray();
        const subjectIds = registers.map((r: any) => r.subject_id);

        // 3. Get Subjects
        const subjects = await db.collection("Subject").find({
            subject_id: { $in: subjectIds }
        }).toArray();

        // 4. Get Teachers (Teach relation)
        const teachRelations = await db.collection("Teach").find({
            subject_id: { $in: subjectIds }
        }).toArray();

        // Analysis
        const analysis = subjectIds.map((sid: string) => {
            const subject = subjects.find((s: any) => s.subject_id === sid);
            const teach = teachRelations.find((t: any) => t.subject_id === sid);

            return {
                subject_id: sid,
                subject_name: subject ? subject.subject_name : "❌ Unknown Subject",
                has_subject_data: !!subject,
                has_teacher: !!teach,
                teacher_id: teach ? teach.teacher_id : null,
                status: !!subject && !!teach ? "✅ Ready" : "❌ Missing Data"
            };
        });

        const missingDataCount = analysis.filter((a: any) => !a.has_subject_data || !a.has_teacher).length;

        return NextResponse.json({
            group_name: group.group_name,
            total_registered: registers.length,
            missing_data_count: missingDataCount,
            details: analysis
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
