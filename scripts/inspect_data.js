
const { MongoClient } = require("mongodb");
const fs = require('fs');
require("dotenv").config({ path: "d:\\Projects\\autotable2\\.env" });

const logFile = "d:\\Projects\\autotable2\\debug_output.txt";

function log(message) {
    console.log(message);
    fs.appendFileSync(logFile, message + "\n");
}

async function inspectGroupData(groupNamePartial) {
    fs.writeFileSync(logFile, "🚀 Starting Inspection...\n");

    const uri = process.env.MONGODB_URI;
    if (!uri) {
        log("❌ MONGODB_URI not found");
        return;
    }

    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db("autotable");

        log(`🔍 Inspecting data for group matching: "${groupNamePartial}"`);

        // 1. Find the Group
        const groups = await db.collection("StudentGroup").find({
            group_name: { $regex: groupNamePartial, $options: "i" }
        }).toArray();

        if (groups.length === 0) {
            log("❌ No group found.");
            return;
        }

        const group = groups[0];
        log(`✅ Found Group: ${group.group_name} (ID: ${group.group_id})`);

        // 2. Find Registration
        const registers = await db.collection("Register").find({
            group_id: group.group_id
        }).toArray();

        log(`📚 Registered Subjects: ${registers.length}`);
        registers.forEach(r => log(`   - ${r.subject_id}`));

        // 3. Check Subjects Details
        const subjectIds = registers.map(r => r.subject_id);
        const subjects = await db.collection("Subject").find({
            subject_id: { $in: subjectIds }
        }).toArray();

        log(`📖 Found ${subjects.length} Subject details in DB`);

        // Check which subjects are missing details
        const foundSubjectIds = subjects.map(s => s.subject_id);
        const missingSubjects = subjectIds.filter(id => !foundSubjectIds.includes(id));

        if (missingSubjects.length > 0) {
            log(`❌ Missing Subject Details for: ${missingSubjects.join(", ")}`);
        }

        // 4. Check Teach Relations (Teachers)
        log("👨‍🏫 Checking Teacher assignments...");
        for (const subj of subjects) {
            const teach = await db.collection("Teach").findOne({ subject_id: subj.subject_id });
            if (!teach) {
                log(`⚠️  No teacher assigned for: ${subj.subject_id} (${subj.subject_name})`);
            } else {
                log(`✅  ${subj.subject_id}: Taught by ${teach.teacher_id}`);
            }
        }

    } catch (error) {
        log("❌ Error: " + error.message);
    } finally {
        await client.close();
    }
}

inspectGroupData("2 ทส 1");
