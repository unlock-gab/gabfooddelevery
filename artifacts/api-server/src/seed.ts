import { db } from "@workspace/db";
import {
  usersTable, citiesTable, zonesTable, restaurantsTable, menuCategoriesTable, productsTable,
  customerProfilesTable, driverProfilesTable,
} from "@workspace/db";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("🌱 Seeding database...");

  // Update user id 1 to admin
  await db.update(usersTable).set({ role: "admin" as any }).where(
    (await import("drizzle-orm")).eq(usersTable.id, 1)
  );

  // Create admin user properly
  const adminHash = await bcrypt.hash("admin123456", 10);
  await db.insert(usersTable).values({
    name: "Super Admin",
    email: "admin@tastycrousty.dz",
    passwordHash: adminHash,
    role: "admin" as any,
    isActive: true,
  }).onConflictDoUpdate({ target: usersTable.email, set: { role: "admin" as any } });

  // Restaurant owner
  const restHash = await bcrypt.hash("resto123", 10);
  await db.insert(usersTable).values([
    { name: "Ali Restaurant", email: "restaurant@tc.dz", passwordHash: restHash, role: "restaurant" as any },
    { name: "Mohamed Livreur", email: "driver@tc.dz", passwordHash: await bcrypt.hash("driver123", 10), role: "driver" as any, phone: "+213 555 123 456" },
    { name: "Yasmine Cliente", email: "customer@tc.dz", passwordHash: await bcrypt.hash("client123", 10), role: "customer" as any, phone: "+213 555 789 012" },
  ]).onConflictDoNothing();

  const allUsers = await db.select().from(usersTable);
  const restaurantOwner = allUsers.find(u => u.email === "restaurant@tc.dz");
  const driver = allUsers.find(u => u.email === "driver@tc.dz");
  const customer = allUsers.find(u => u.email === "customer@tc.dz");

  if (driver) {
    await db.insert(driverProfilesTable).values({ userId: driver.id }).onConflictDoNothing();
  }
  if (customer) {
    await db.insert(customerProfilesTable).values({ userId: customer.id }).onConflictDoNothing();
  }

  // Cities
  const { eq } = await import("drizzle-orm");
  const [alger] = await db.insert(citiesTable).values({ name: "Alger", nameAr: "الجزائر" }).onConflictDoNothing().returning();
  const cities = await db.select().from(citiesTable);
  const cityId = cities[0]?.id;

  if (cityId) {
    const [zone] = await db.insert(zonesTable).values({ cityId, name: "Centre-Ville", nameAr: "وسط المدينة", deliveryFee: "2.50", estimatedMinutes: 20 }).onConflictDoNothing().returning();

    if (restaurantOwner) {
      // Create restaurants
      const [restaurant1] = await db.insert(restaurantsTable).values({
        userId: restaurantOwner.id,
        name: "Le Jardin du Goût",
        nameAr: "حديقة الذوق",
        description: "Cuisine méditerranéenne fraîche et raffinée",
        category: "Méditerranéen",
        cityId,
        zoneId: zone?.id,
        address: "12 Rue Didouche Mourad, Alger",
        status: "approved" as any,
        isOpen: true,
        estimatedPrepTime: 25,
        commissionRate: "10.00",
      }).onConflictDoNothing().returning();

      const [restaurant2] = await db.insert(restaurantsTable).values({
        userId: restaurantOwner.id,
        name: "Burger Palace",
        nameAr: "قصر البرغر",
        description: "Les meilleurs burgers artisanaux d'Alger",
        category: "Fast Food",
        cityId,
        zoneId: zone?.id,
        address: "45 Boulevard Zighout Youcef, Alger",
        status: "approved" as any,
        isOpen: true,
        estimatedPrepTime: 15,
        commissionRate: "12.00",
      }).onConflictDoNothing().returning();

      if (restaurant1) {
        // Menu categories and products for restaurant 1
        const [cat1] = await db.insert(menuCategoriesTable).values({ restaurantId: restaurant1.id, name: "Entrées", nameAr: "المقبلات", sortOrder: 1 }).returning();
        const [cat2] = await db.insert(menuCategoriesTable).values({ restaurantId: restaurant1.id, name: "Plats", nameAr: "الأطباق الرئيسية", sortOrder: 2 }).returning();
        const [cat3] = await db.insert(menuCategoriesTable).values({ restaurantId: restaurant1.id, name: "Desserts", nameAr: "الحلويات", sortOrder: 3 }).returning();

        if (cat1 && cat2 && cat3) {
          await db.insert(productsTable).values([
            { restaurantId: restaurant1.id, categoryId: cat1.id, name: "Salade César", nameAr: "سلطة قيصر", description: "Salade fraîche, croûtons, parmesan", price: "8.50", sortOrder: 1 },
            { restaurantId: restaurant1.id, categoryId: cat1.id, name: "Soupe du jour", nameAr: "حساء اليوم", description: "Soupe maison préparée chaque matin", price: "6.00", sortOrder: 2 },
            { restaurantId: restaurant1.id, categoryId: cat2.id, name: "Tajine d'Agneau", nameAr: "طاجين الخروف", description: "Tajine traditionnel avec légumes de saison", price: "18.00", sortOrder: 1 },
            { restaurantId: restaurant1.id, categoryId: cat2.id, name: "Poulet Rôti aux Herbes", nameAr: "دجاج مشوي بالأعشاب", description: "Demi-poulet mariné aux herbes méditerranéennes", price: "15.00", sortOrder: 2 },
            { restaurantId: restaurant1.id, categoryId: cat2.id, name: "Couscous Royal", nameAr: "الكسكسى الملكي", description: "Couscous avec légumes, merguez et poulet", price: "22.00", sortOrder: 3 },
            { restaurantId: restaurant1.id, categoryId: cat3.id, name: "Makroud", nameAr: "المقروض", description: "Gâteau traditionnel aux dattes", price: "5.00", sortOrder: 1 },
            { restaurantId: restaurant1.id, categoryId: cat3.id, name: "Baklava", nameAr: "البقلاوة", description: "Pâtisserie aux noix et au miel", price: "6.50", sortOrder: 2 },
          ]);
        }
      }

      if (restaurant2) {
        const [bcat1] = await db.insert(menuCategoriesTable).values({ restaurantId: restaurant2.id, name: "Burgers", nameAr: "البرغر", sortOrder: 1 }).returning();
        const [bcat2] = await db.insert(menuCategoriesTable).values({ restaurantId: restaurant2.id, name: "Accompagnements", nameAr: "المرافقات", sortOrder: 2 }).returning();

        if (bcat1 && bcat2) {
          await db.insert(productsTable).values([
            { restaurantId: restaurant2.id, categoryId: bcat1.id, name: "Classic Burger", nameAr: "البرغر الكلاسيكي", description: "Steak haché, cheddar, salade, tomate", price: "12.00", sortOrder: 1 },
            { restaurantId: restaurant2.id, categoryId: bcat1.id, name: "Double Cheese", nameAr: "دبل تشيز", description: "Double steak, double cheddar, sauce maison", price: "15.00", sortOrder: 2 },
            { restaurantId: restaurant2.id, categoryId: bcat1.id, name: "Chicken Crispy", nameAr: "دجاج كريسبي", description: "Filet de poulet croustillant, coleslaw, cornichons", price: "13.00", sortOrder: 3 },
            { restaurantId: restaurant2.id, categoryId: bcat2.id, name: "Frites Maison", nameAr: "بطاطس منزلية", description: "Frites fraîches assaisonnées", price: "4.50", sortOrder: 1 },
            { restaurantId: restaurant2.id, categoryId: bcat2.id, name: "Onion Rings", nameAr: "حلقات البصل", description: "Rondelles d'oignon panées et croustillantes", price: "5.00", sortOrder: 2 },
          ]);
        }
      }
    }
  }

  // Also update user 1 (first registered) to admin
  await db.update(usersTable).set({ role: "admin" as any }).where(eq(usersTable.id, 1));

  console.log("✅ Seeding complete!");
  console.log("\n📋 Demo accounts:");
  console.log("  Admin: admin@tastycrousty.dz / admin123456");
  console.log("  Restaurant: restaurant@tc.dz / resto123");
  console.log("  Livreur: driver@tc.dz / driver123");
  console.log("  Client: customer@tc.dz / client123");
}

seed().catch(console.error).finally(() => process.exit(0));
