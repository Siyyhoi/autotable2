const { MongoClient } = require('mongodb');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

async function checkScheduleCompleteness(groupId = "682190101") {
    const uri = process.env.DATABASE_URL;
    if (!uri) {
        console.error("❌ DATABASE_URL not found");
        return;
    }

    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db("autotable");

        console.log(`\n🔍 Checking Schedule Completeness for Group: ${groupId}\n`);

        // 1. Get group info
        const group = await db.collection("StudentGroup").findOne({ group_id: groupId });
        if (!group) {
            console.error(`❌ Group ${groupId} not found`);
            return;
        }
        console.log(`📚 Group: ${group.group_name} (${group.group_id})`);
        console.log(`👨‍🏫 Advisor: ${group.advisor}\n`);

        // 2. Get registered subjects
        const registers = await db.collection("Register").find({ group_id: groupId }).toArray();
        const subjectIds = registers.map(r => r.subject_id);
        
        console.log(`📖 Registered Subjects: ${subjectIds.length}`);
        console.log(`   ${subjectIds.join(', ')}\n`);

        // 3. Get subject details
        const subjects = await db.collection("Subject").find({
            subject_id: { $in: subjectIds }
        }).toArray();

        console.log(`📋 Subject Details:\n`);
        const subjectMap = new Map();
        let totalExpectedPeriods = 0;

        subjects.forEach(subj => {
            const theory = subj.theory || 0;
            const practice = subj.practice || 0;
            const total = theory + practice;
            totalExpectedPeriods += total;
            
            subjectMap.set(subj.subject_id, {
                name: subj.subject_name,
                theory,
                practice,
                total
            });

            console.log(`   ${subj.subject_id}: ${subj.subject_name}`);
            console.log(`      Theory: ${theory} | Practice: ${practice} | Total: ${total} คาบ`);
        });

        console.log(`\n📊 Total Expected Periods: ${totalExpectedPeriods} คาบ\n`);

        // 4. Check if schedule exists (from Schedule collection or generate result)
        // For now, we'll check what should be scheduled
        console.log(`\n✅ Expected Schedule Summary:\n`);
        console.log(`   Total Subjects: ${subjects.length}`);
        console.log(`   Total Periods: ${totalExpectedPeriods}`);
        console.log(`   Theory Periods: ${subjects.reduce((sum, s) => sum + (s.theory || 0), 0)}`);
        console.log(`   Practice Periods: ${subjects.reduce((sum, s) => sum + (s.practice || 0), 0)}`);

        // 5. Check for missing subjects in database
        const foundSubjectIds = subjects.map(s => s.subject_id);
        const missingSubjects = subjectIds.filter(id => !foundSubjectIds.includes(id));
        
        if (missingSubjects.length > 0) {
            console.log(`\n⚠️  Missing Subject Details in Database:`);
            missingSubjects.forEach(id => console.log(`   - ${id}`));
        }

        // 6. Check Teach relations
        console.log(`\n👨‍🏫 Checking Teacher Assignments:\n`);
        for (const subj of subjects) {
            const teachRelations = await db.collection("Teach").find({ 
                subject_id: subj.subject_id 
            }).toArray();
            
            if (teachRelations.length === 0) {
                console.log(`   ❌ ${subj.subject_id}: No teacher assigned`);
            } else {
                const teacherIds = teachRelations.map(t => t.teacher_id);
                console.log(`   ✅ ${subj.subject_id}: ${teacherIds.length} teacher(s) - ${teacherIds.join(', ')}`);
            }
        }

        // 7. Summary
        console.log(`\n${'='.repeat(60)}\n`);
        console.log(`📊 SUMMARY FOR GROUP ${groupId}:`);
        console.log(`   Registered Subjects: ${subjectIds.length}`);
        console.log(`   Subjects with Details: ${subjects.length}`);
        console.log(`   Missing Subject Details: ${missingSubjects.length}`);
        console.log(`   Total Expected Periods: ${totalExpectedPeriods}`);
        console.log(`\n💡 To schedule properly, ensure:`);
        console.log(`   1. All ${subjectIds.length} subjects have details in Subject collection`);
        console.log(`   2. All subjects have teachers assigned in Teach collection`);
        console.log(`   3. Total ${totalExpectedPeriods} periods are scheduled`);
        console.log(`   4. Theory periods use Theory rooms, Practice periods use Lab/Practice rooms`);
        console.log(`\n${'='.repeat(60)}\n`);

    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        await client.close();
    }
}

// Run for group 682190101 (1 ทส 1)
checkScheduleCompleteness("682190101").catch(console.error);
