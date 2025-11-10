import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import {
  farms,
  users,
  flocks,
  dailyRecords,
  sales,
  expenses,
  feedInventory,
  healthRecords,
  products,
} from "../shared/schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

console.log("🌱 Starting demo data seed...");

// Helper to generate dates
function getDateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

// Helper to add random variance
function addVariance(value: number, variancePercent: number): number {
  const variance = value * (variancePercent / 100);
  return value + (Math.random() * variance * 2 - variance);
}

async function seed() {
  try {
    console.log("📊 Creating Demo Farm...");
    
    // 1. Create Demo Farm
    const [demoFarm] = await db.insert(farms).values({
      name: "🎯 Demo Farm - Sample Data",
      description: "This is sample demonstration data. You can safely delete this farm and all its data when ready.",
      location: "Nairobi, Kenya",
      address: "Sample Address, Nairobi",
      contactEmail: "demo@kukuhub.app",
      contactPhone: "+254700000000",
      totalBirds: 5000,
      avgEggsPerDay: 4200,
      specialization: "layers",
      status: "active",
      isApproved: true,
    }).returning();

    console.log(`✅ Demo Farm created: ${demoFarm.id}`);

    // 2. Create Demo Farm Owner User
    const [demoUser] = await db.insert(users).values({
      email: "demo-owner@kukuhub.app",
      firstName: "Demo",
      lastName: "Farm Owner",
      role: "farm_owner",
      farmId: demoFarm.id,
    }).returning();

    console.log(`✅ Demo User created: ${demoUser.id}`);

    // 3. Create Active Flock (started 15 months ago, now in full production)
    const flockStartDate = getDateDaysAgo(450); // ~15 months ago
    const initialBirds = 5000;
    const totalMortality = 250; // 5% cumulative mortality over 15 months

    const [demoFlock] = await db.insert(flocks).values({
      farmId: demoFarm.id,
      name: "Batch A-2024 (Demo)",
      breed: "Hy-Line Brown",
      initialCount: initialBirds,
      currentCount: initialBirds - totalMortality,
      hatchDate: flockStartDate,
      status: "laying",
    }).returning();

    console.log(`✅ Demo Flock created: ${demoFlock.id}`);

    // 4. Generate 365 days of Daily Records
    console.log("📝 Generating 365 days of production records...");
    
    const dailyRecordsData: any[] = [];
    const startDay = 364; // Start from 364 days ago (0-364 = 365 days total)
    
    for (let daysAgo = startDay; daysAgo >= 0; daysAgo--) {
      const recordDate = getDateDaysAgo(daysAgo);
      const flockAgeInDays = 450 - daysAgo; // Age of flock on this day
      
      // Calculate realistic egg production based on flock age
      let productionRate = 0;
      const currentBirds = initialBirds - Math.floor((totalMortality / 450) * (450 - daysAgo));
      
      if (flockAgeInDays < 120) {
        // Brooding/Growing phase (0-17 weeks) - no eggs
        productionRate = 0;
      } else if (flockAgeInDays < 140) {
        // Ramp up phase (17-20 weeks) - 0% to 50%
        productionRate = ((flockAgeInDays - 120) / 20) * 0.50;
      } else if (flockAgeInDays < 180) {
        // Early production (20-26 weeks) - 50% to 85%
        productionRate = 0.50 + ((flockAgeInDays - 140) / 40) * 0.35;
      } else if (flockAgeInDays < 300) {
        // Peak production (26-43 weeks) - 85% to 92%
        productionRate = 0.85 + ((flockAgeInDays - 180) / 120) * 0.07;
      } else if (flockAgeInDays < 400) {
        // Declining production (43-57 weeks) - 92% to 82%
        productionRate = 0.92 - ((flockAgeInDays - 300) / 100) * 0.10;
      } else {
        // Late production (57+ weeks) - 82% to 75%
        productionRate = 0.82 - ((flockAgeInDays - 400) / 100) * 0.07;
      }
      
      // Add daily variance
      productionRate = Math.max(0, Math.min(1, addVariance(productionRate, 5)));
      
      const eggsCollected = Math.floor(currentBirds * productionRate);
      const brokenEggs = Math.floor(eggsCollected * (Math.random() * 0.03)); // 0-3% broken
      const cratesProduced = Math.floor((eggsCollected - brokenEggs) / 30); // 30 eggs per crate
      
      // Feed consumption: ~110-125g per bird per day
      const feedPerBird = 0.115 + (Math.random() * 0.01); // kg
      const feedConsumed = (currentBirds * feedPerBird).toFixed(2);
      
      // Temperature and lighting (only relevant during brooding)
      let temperature: number | null = null;
      let lightingHours: number | null = null;
      
      if (flockAgeInDays < 120) {
        // Brooding phase temperatures
        if (flockAgeInDays < 7) temperature = 32 + Math.random() * 2;
        else if (flockAgeInDays < 14) temperature = 30 + Math.random() * 2;
        else if (flockAgeInDays < 21) temperature = 28 + Math.random() * 2;
        else if (flockAgeInDays < 28) temperature = 26 + Math.random() * 2;
        else temperature = 22 + Math.random() * 3;
        
        // Lighting hours increase gradually
        lightingHours = Math.min(16, 8 + (flockAgeInDays / 120) * 8);
      } else {
        // Production phase: 14-16 hours of light
        lightingHours = 14 + Math.random() * 2;
      }
      
      // Occasional mortality (random, small numbers)
      const mortalityCount = Math.random() < 0.05 ? Math.floor(Math.random() * 3) : 0;
      
      // Weight tracking (sample every 7 days)
      let averageWeight: number | null = null;
      let sampleSize: number | null = null;
      
      if (daysAgo % 7 === 0 && flockAgeInDays >= 7) {
        sampleSize = 50;
        // Weight curve: 40g at hatch, ~1800g at 18 weeks, ~2000g at peak
        if (flockAgeInDays < 126) {
          averageWeight = 40 + (flockAgeInDays / 126) * 1760;
        } else {
          averageWeight = 1800 + ((flockAgeInDays - 126) / 274) * 200;
        }
        averageWeight = addVariance(averageWeight, 3);
      }
      
      dailyRecordsData.push({
        flockId: demoFlock.id,
        recordDate,
        userId: demoUser.id,
        eggsCollected: eggsCollected > 0 ? eggsCollected : null,
        brokenEggs: brokenEggs > 0 ? brokenEggs : null,
        cratesProduced: cratesProduced > 0 ? cratesProduced : null,
        mortalityCount,
        mortalityReason: mortalityCount > 0 ? "Natural causes / health issues" : null,
        feedConsumed,
        feedType: "Layer Mash",
        temperature: temperature !== null ? temperature.toFixed(2) : null,
        lightingHours: lightingHours !== null ? lightingHours.toFixed(2) : null,
        averageWeight: averageWeight !== null ? averageWeight.toFixed(2) : null,
        sampleSize: sampleSize,
        notes: null,
        reviewStatus: "approved",
        isDuplicate: false,
      });
    }
    
    // Insert daily records in batches of 100
    for (let i = 0; i < dailyRecordsData.length; i += 100) {
      const batch = dailyRecordsData.slice(i, i + 100);
      await db.insert(dailyRecords).values(batch);
      console.log(`  ✅ Inserted daily records ${i + 1} to ${i + batch.length}`);
    }

    // 5. Generate Sales Records (12 months)
    console.log("💰 Generating 12 months of sales records...");
    
    const salesData: any[] = [];
    const customers = [
      "Metro Supermarket",
      "Naivas Stores",
      "QuickMart",
      "Fresh Foods Ltd",
      "Hotel Intercontinental",
      "Sarova Hotels",
      "Wholesale Distributors Ltd",
      "Jane Kamau",
      "John Mwangi",
      "Grace Wanjiru",
    ];
    
    // Generate weekly sales for 12 months (52 weeks)
    for (let weeksAgo = 52; weeksAgo >= 0; weeksAgo--) {
      const saleDate = getDateDaysAgo(weeksAgo * 7);
      const flockAgeAtSale = 450 - (weeksAgo * 7);
      
      // Skip sales before production starts
      if (flockAgeAtSale < 140) continue;
      
      // Number of sales per week (1-3)
      const salesThisWeek = Math.floor(Math.random() * 3) + 1;
      
      for (let s = 0; s < salesThisWeek; s++) {
        const cratesSold = Math.floor(50 + Math.random() * 150); // 50-200 crates
        const pricePerCrate = 350 + Math.random() * 100; // 350-450 KES
        const totalAmount = cratesSold * pricePerCrate;
        
        salesData.push({
          farmId: demoFarm.id,
          saleDate,
          userId: demoUser.id,
          customerName: customers[Math.floor(Math.random() * customers.length)],
          cratesSold,
          pricePerCrate: pricePerCrate.toFixed(2),
          totalAmount: totalAmount.toFixed(2),
          paymentStatus: Math.random() > 0.1 ? "paid" : "pending",
          notes: null,
        });
      }
    }
    
    await db.insert(sales).values(salesData);
    console.log(`✅ Created ${salesData.length} sales records`);

    // 6. Generate Expense Records (12 months)
    console.log("💸 Generating 12 months of expense records...");
    
    const expensesData: any[] = [];
    
    for (let monthsAgo = 12; monthsAgo >= 0; monthsAgo--) {
      const expenseDate = getDateDaysAgo(monthsAgo * 30);
      
      // Feed expenses (weekly)
      for (let week = 0; week < 4; week++) {
        const weekDate = getDateDaysAgo(monthsAgo * 30 + week * 7);
        expensesData.push({
          farmId: demoFarm.id,
          expenseDate: weekDate,
          userId: demoUser.id,
          category: "feed",
          description: "Layer Mash - 50kg bags x 100",
          amount: (addVariance(250000, 10)).toFixed(2), // ~250,000 KES per week
          supplier: "Unga Feeds Ltd",
          receiptNumber: `RCP-${Date.now()}-${week}`,
          notes: null,
        });
      }
      
      // Labor costs (monthly)
      expensesData.push({
        farmId: demoFarm.id,
        expenseDate,
        userId: demoUser.id,
        category: "labor",
        description: "Staff salaries - 5 workers",
        amount: "150000.00", // 150,000 KES
        supplier: null,
        receiptNumber: null,
        notes: "Monthly payroll",
      });
      
      // Utilities (monthly)
      expensesData.push({
        farmId: demoFarm.id,
        expenseDate,
        userId: demoUser.id,
        category: "utilities",
        description: "Electricity and water bills",
        amount: (addVariance(45000, 15)).toFixed(2), // ~45,000 KES
        supplier: "Kenya Power & County Water",
        receiptNumber: null,
        notes: null,
      });
      
      // Medication/Veterinary (quarterly)
      if (monthsAgo % 3 === 0) {
        expensesData.push({
          farmId: demoFarm.id,
          expenseDate,
          userId: demoUser.id,
          category: "medication",
          description: "Vaccination and veterinary supplies",
          amount: (addVariance(85000, 20)).toFixed(2), // ~85,000 KES
          supplier: "VetCare Kenya",
          receiptNumber: `VET-${Date.now()}`,
          notes: "Quarterly vaccination program",
        });
      }
      
      // Equipment maintenance (occasional)
      if (Math.random() < 0.3) {
        expensesData.push({
          farmId: demoFarm.id,
          expenseDate,
          userId: demoUser.id,
          category: "equipment",
          description: "Equipment repair and maintenance",
          amount: (addVariance(35000, 30)).toFixed(2),
          supplier: "AgriTech Services",
          receiptNumber: null,
          notes: null,
        });
      }
      
      // Other operational costs
      if (Math.random() < 0.4) {
        expensesData.push({
          farmId: demoFarm.id,
          expenseDate,
          userId: demoUser.id,
          category: "other",
          description: "Miscellaneous operational expenses",
          amount: (addVariance(25000, 40)).toFixed(2),
          supplier: null,
          receiptNumber: null,
          notes: "Transport, cleaning supplies, etc",
        });
      }
    }
    
    await db.insert(expenses).values(expensesData);
    console.log(`✅ Created ${expensesData.length} expense records`);

    // 7. Feed Inventory
    console.log("🌾 Creating feed inventory records...");
    
    await db.insert(feedInventory).values([
      {
        farmId: demoFarm.id,
        feedType: "Layer Mash",
        supplier: "Unga Feeds Ltd",
        quantityKg: "2500.000",
        unitPrice: "52.50",
        purchaseDate: getDateDaysAgo(7),
        expiryDate: getDateDaysAgo(-60),
        userId: demoUser.id,
      },
      {
        farmId: demoFarm.id,
        feedType: "Layer Pellets",
        supplier: "Pembe Flour Mills",
        quantityKg: "1200.000",
        unitPrice: "55.00",
        purchaseDate: getDateDaysAgo(14),
        expiryDate: getDateDaysAgo(-45),
        userId: demoUser.id,
      },
    ]);
    
    console.log("✅ Created feed inventory");

    // 8. Health Records
    console.log("💉 Creating health records...");
    
    const healthRecordsData: any[] = [
      {
        flockId: demoFlock.id,
        recordDate: getDateDaysAgo(350),
        userId: demoUser.id,
        recordType: "vaccination",
        title: "Marek's Disease Vaccination",
        description: "Day-old chick vaccination",
        medicationUsed: "HVT Vaccine",
        dosage: "1 dose per chick",
        administeredBy: "Dr. Kamau - VetCare Kenya",
        nextDueDate: null,
        cost: "35000.00",
        notes: "All chicks vaccinated at hatchery",
      },
      {
        flockId: demoFlock.id,
        recordDate: getDateDaysAgo(280),
        userId: demoUser.id,
        recordType: "vaccination",
        title: "Newcastle Disease Vaccination",
        description: "Newcastle disease vaccination - Round 1",
        medicationUsed: "LaSota ND Vaccine",
        dosage: "Eye drop method",
        administeredBy: "Dr. Wanjiru",
        nextDueDate: getDateDaysAgo(-30),
        cost: "28000.00",
        notes: "Booster required in 3 months",
      },
      {
        flockId: demoFlock.id,
        recordDate: getDateDaysAgo(190),
        userId: demoUser.id,
        recordType: "vaccination",
        title: "Infectious Bronchitis Vaccination",
        description: "IB vaccination",
        medicationUsed: "IB H120",
        dosage: "Spray application",
        administeredBy: "Dr. Kamau",
        nextDueDate: null,
        cost: "32000.00",
        notes: null,
      },
      {
        flockId: demoFlock.id,
        recordDate: getDateDaysAgo(120),
        userId: demoUser.id,
        recordType: "treatment",
        title: "Coccidiosis Treatment",
        description: "Preventive treatment for coccidiosis",
        medicationUsed: "Amprolium",
        dosage: "1ml per liter of water for 5 days",
        administeredBy: "Farm staff under vet supervision",
        nextDueDate: null,
        cost: "15000.00",
        notes: "Prophylactic treatment",
      },
      {
        flockId: demoFlock.id,
        recordDate: getDateDaysAgo(45),
        userId: demoUser.id,
        recordType: "checkup",
        title: "Routine Flock Health Check",
        description: "Quarterly veterinary inspection",
        medicationUsed: null,
        dosage: null,
        administeredBy: "Dr. Wanjiru - VetCare Kenya",
        nextDueDate: getDateDaysAgo(-45),
        cost: "25000.00",
        notes: "Flock in good health, production rate excellent",
      },
    ];
    
    await db.insert(healthRecords).values(healthRecordsData);
    console.log(`✅ Created ${healthRecordsData.length} health records`);

    // 9. Products (for marketplace)
    console.log("🥚 Creating product listings...");
    
    await db.insert(products).values([
      {
        farmId: demoFarm.id,
        name: "Fresh Brown Eggs - Grade A",
        category: "eggs",
        description: "Premium quality brown eggs from free-range layers. Rich in nutrients and freshly collected daily.",
        unit: "crates",
        currentPrice: "400.00",
        minOrderQuantity: 1,
        stockQuantity: 150,
        isAvailable: true,
      },
      {
        farmId: demoFarm.id,
        name: "Fresh Brown Eggs - Retail Tray",
        category: "eggs",
        description: "Retail packaging - 30 eggs per tray. Perfect for households and small retailers.",
        unit: "trays",
        currentPrice: "420.00",
        minOrderQuantity: 1,
        stockQuantity: 200,
        isAvailable: true,
      },
      {
        farmId: demoFarm.id,
        name: "Spent Layers",
        category: "chickens",
        description: "Healthy spent layers suitable for meat. Available upon request.",
        unit: "pieces",
        currentPrice: "350.00",
        minOrderQuantity: 10,
        stockQuantity: 0,
        isAvailable: false,
      },
    ]);
    
    console.log("✅ Created product listings");

    console.log("\n🎉 Demo data seed completed successfully!");
    console.log("\n📊 Summary:");
    console.log(`  - Farm: ${demoFarm.name}`);
    console.log(`  - Flock: ${demoFlock.name}`);
    console.log(`  - Daily Records: 365 days`);
    console.log(`  - Sales: ${salesData.length} records`);
    console.log(`  - Expenses: ${expensesData.length} records`);
    console.log(`  - Health Records: ${healthRecordsData.length} records`);
    console.log(`  - Products: 3 listings`);
    console.log("\n💡 This farm is clearly tagged with '🎯' and labeled as demo data.");
    console.log("   You can safely delete it when ready to add real farm data.\n");

  } catch (error) {
    console.error("❌ Error seeding demo data:", error);
    throw error;
  }
}

seed();
