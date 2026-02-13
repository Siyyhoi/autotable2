const { MongoClient } = require("mongodb");
require("dotenv").config({ path: "d:\\Projects\\autotable2\\.env" });

async function validate() {
    const uri = process.env.MONGODB_URI;
    if (!uri) return console.error("No Mongo URI");

    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db("school_schedule_db");

    console.log("=== StudentGroup Collection ===");
    const groups = await db.collection("StudentGroup").find({}).toArray();
    for (const g of groups) {
        console.log(`Group: "${g.group_id}" (Name: ${g.group_name})`);
        // Count registers
        const count = await db.collection("Register").countDocuments({ group_id: g.group_id });
        console.log(`   -> Registered: ${count} subjects`);
    }

    console.log("\n=== Checking Group 682190101 specifically ===");
    const gSpecific = await db.collection("StudentGroup").findOne({ group_id: "682190101" });
    if (gSpecific) console.log("✅ Found exact match for '682190101'");
    else console.log("❌ NOT found strict match for '682190101'");

    await client.close();
}

validate().catch(console.error);
