import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { Package } from "./models/Package.js";
import { Team } from "./models/Team.js";
import { User } from "./models/User.js";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "";

// ============================================================
// SQ_RATE = 100 TZS per 1 SQ
// 
// BEI SAHIHI:
//   10 SQ  = 1000 TZS
//   20 SQ  = 2000 TZS
//   30 SQ  = 3000 TZS
//   50 SQ  = 5000 TZS
//  100 SQ  = 10000 TZS
//  200 SQ  = 20000 TZS
// ============================================================

const PACKAGES = [
  { 
    name: "Starter",   
    tzsPrice: 1000,   // 10 SQ × 100 = 1000 TZS
    txAmount: 10,  
    bonusTx: 0,  
    isBestDeal: false, 
    active: true, 
    order: 1 
  },
  { 
    name: "Basic",     
    tzsPrice: 2000,   // 20 SQ × 100 = 2000 TZS
    txAmount: 20,  
    bonusTx: 0,  
    isBestDeal: false, 
    active: true, 
    order: 2 
  },
  { 
    name: "Standard",  
    tzsPrice: 3000,   // 30 SQ × 100 = 3000 TZS
    txAmount: 30,  
    bonusTx: 0,  
    isBestDeal: false, 
    active: true, 
    order: 3 
  },
  { 
    name: "Pro",       
    tzsPrice: 5000,   // 50 SQ × 100 = 5000 TZS
    txAmount: 50,  
    bonusTx: 5,       // +5 bonus = 55 SQ total
    isBestDeal: true, 
    active: true, 
    order: 4 
  },
  { 
    name: "Elite",     
    tzsPrice: 10000,  // 100 SQ × 100 = 10000 TZS
    txAmount: 100,  
    bonusTx: 0,  
    isBestDeal: false, 
    active: true, 
    order: 5 
  },
  { 
    name: "Ultimate",  
    tzsPrice: 20000,  // 200 SQ × 100 = 20000 TZS
    txAmount: 200,  
    bonusTx: 0,  
    isBestDeal: false, 
    active: true, 
    order: 6 
  }
];

async function seed() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // ============================================================
    // SEED PACKAGES
    // ============================================================
    const packageCount = await Package.countDocuments();
    if (packageCount === 0) {
      await Package.insertMany(PACKAGES);
      console.log("✅ Packages seeded successfully!");
    } else {
      console.log(`ℹ️ Packages already exist (${packageCount} found), skipping...`);
      
      // Update existing packages to correct prices
      console.log("🔄 Updating existing packages to correct prices...");
      for (const pkg of PACKAGES) {
        const result = await Package.updateOne(
          { name: pkg.name },
          { 
            $set: { 
              tzsPrice: pkg.tzsPrice,
              txAmount: pkg.txAmount,
              bonusTx: pkg.bonusTx,
              isBestDeal: pkg.isBestDeal,
              active: pkg.active,
              order: pkg.order
            } 
          }
        );
        if (result.modifiedCount > 0) {
          console.log(`  ✅ Updated ${pkg.name} → ${pkg.tzsPrice} TZS`);
        }
      }
    }

    // ============================================================
    // SEED TEAMS
    // ============================================================
    const teamCount = await Team.countDocuments();
    if (teamCount === 0) {
      await Team.insertMany([
        { name: "toxic-host1", active: true },
        { name: "toxic-host2", active: true }
      ]);
      console.log("✅ Teams seeded successfully!");
    } else {
      console.log(`ℹ️ Teams already exist (${teamCount} found), skipping...`);
    }

    // ============================================================
    // SEED ADMIN
    // ============================================================
    const adminEmail = "stanytzhosting@gmail.com";
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash("STANY#HOSTING", 12);
      await User.create({
        email: adminEmail,
        passwordHash,
        txCoins: 999999,
        usedFreeTrial: false,
        trialPhoneNumbers: [],
        bots: []
      });
      console.log("✅ Admin user created!");
    } else if (existingAdmin.txCoins < 999999) {
      await User.updateOne({ email: adminEmail }, { txCoins: 999999 });
      console.log("✅ Admin balance updated to 999,999 SQ!");
    } else {
      console.log(`ℹ️ Admin already exists with ${existingAdmin.txCoins} SQ`);
    }

    // ============================================================
    // SHOW SUMMARY
    // ============================================================
    console.log("\n📊 ===== SEEDING SUMMARY =====");
    console.log(`📦 Packages: ${await Package.countDocuments()}`);
    console.log(`👥 Teams: ${await Team.countDocuments()}`);
    console.log(`👤 Admin: ${adminEmail}`);
    console.log(`🪙 Admin Balance: ${(await User.findOne({ email: adminEmail }))?.txCoins || 0} SQ`);
    console.log("✅ ============================\n");

    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");
    console.log("🎉 Seeding completed successfully!");

  } catch (error) {
    console.error("❌ Seeding failed:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// ============================================================
// UPDATE SCRIPT - Fix existing packages to correct prices
// ============================================================
async function updatePackages() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    console.log("🔄 Updating all packages to correct prices...");
    
    for (const pkg of PACKAGES) {
      const result = await Package.updateOne(
        { name: pkg.name },
        { 
          $set: { 
            tzsPrice: pkg.tzsPrice,
            txAmount: pkg.txAmount,
            bonusTx: pkg.bonusTx,
            isBestDeal: pkg.isBestDeal,
            active: pkg.active,
            order: pkg.order
          } 
        }
      );
      if (result.modifiedCount > 0) {
        console.log(`  ✅ Updated ${pkg.name} → ${pkg.tzsPrice} TZS`);
      } else if (result.matchedCount > 0) {
        console.log(`  ℹ️ ${pkg.name} already correct (${pkg.tzsPrice} TZS)`);
      } else {
        console.log(`  ⚠️ ${pkg.name} not found, skipping...`);
      }
    }

    console.log("✅ All packages updated!");
    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");

  } catch (error) {
    console.error("❌ Update failed:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// ============================================================
// RUN
// ============================================================
const args = process.argv.slice(2);
if (args.includes("--update")) {
  console.log("🔄 Running update mode...");
  updatePackages();
} else {
  seed();
}