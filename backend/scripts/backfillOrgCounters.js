require("dotenv").config();
const mongoose = require("mongoose");
const Organization = require("../models/Organization");
const User = require("../models/User");

async function backfillCounters() {
  try {
    // Usually MONGO_URI in this project is standard, or check server.js for how it connects
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB.");

    const orgs = await Organization.find();
    console.log(`Found ${orgs.length} organizations. Starting backfill...`);

    let updatedCount = 0;
    for (const org of orgs) {
      const instructorCount = await User.countDocuments({
        organization: org._id,
        role: "instructor",
      });
      const studentCount = await User.countDocuments({
        organization: org._id,
        role: "student",
      });

      await Organization.updateOne(
        { _id: org._id },
        {
          $set: {
            currentInstructorCount: instructorCount,
            currentStudentCount: studentCount,
          },
        }
      );
      
      console.log(`Org ${org._id} (${org.name}): Instructors=${instructorCount}, Students=${studentCount}`);
      updatedCount++;
    }

    console.log(`Successfully backfilled ${updatedCount} organizations.`);
    process.exit(0);
  } catch (err) {
    console.error("Backfill failed:", err);
    process.exit(1);
  }
}

backfillCounters();
