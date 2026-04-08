/**
 * TastyCrousty — Comprehensive Demo Seed
 *
 * Creates realistic Algerian food delivery data including:
 *  - 3 cities, 8 zones
 *  - 6 restaurants across categories (Med, Fast Food, Pizza, Algérien, Grillades)
 *  - 3 restaurant owners, 5 drivers, 6 customers, 1 admin
 *  - 16+ orders across all statuses
 *  - Order items, status history, QR tokens
 *  - Ratings, notifications, fraud flags, payments
 *  - Platform settings
 *
 * Run:  pnpm --filter @workspace/api-server run seed
 * Safe: idempotent — uses SEED_VERSION check to avoid duplicate data.
 */

import { db } from "@workspace/db";
import {
  usersTable, citiesTable, zonesTable,
  restaurantsTable, menuCategoriesTable, productsTable,
  customerProfilesTable, driverProfilesTable,
  ordersTable, orderItemsTable, orderStatusHistoryTable, qrDeliveryTokensTable,
  ratingsTable, fraudFlagsTable, notificationsTable, paymentsTable, platformSettingsTable,
} from "@workspace/db";
import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";

const SEED_VERSION = "v4";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function hash(pwd: string) { return bcrypt.hash(pwd, 10); }

function ago(hours: number): Date {
  return new Date(Date.now() - hours * 3600 * 1000);
}

function orderNum(): string {
  return "TC" + Math.floor(Math.random() * 90000 + 10000);
}

// ─── Reset ────────────────────────────────────────────────────────────────────

async function resetTables() {
  // Delete in reverse-dependency order to respect foreign keys
  await db.execute(sql`
    TRUNCATE TABLE
      fraud_flags, notifications, ratings, payments,
      qr_delivery_tokens, order_status_history, order_items, orders,
      dispatch_attempts, delivery_confirmations,
      cart_items, carts,
      products, menu_categories,
      driver_profiles, customer_profiles, addresses,
      restaurants,
      zones, cities,
      users
    RESTART IDENTITY CASCADE
  `);
  // Rebuild platform_settings
  await db.execute(sql`TRUNCATE TABLE platform_settings RESTART IDENTITY CASCADE`);
}

// ─── Main seed ────────────────────────────────────────────────────────────────

async function seed() {
  // Idempotency check
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS platform_settings (
      id serial PRIMARY KEY,
      key text NOT NULL UNIQUE,
      value text NOT NULL,
      updated_at timestamp with time zone NOT NULL DEFAULT now()
    )
  `);

  const existing = await db.select()
    .from(platformSettingsTable)
    .where(eq(platformSettingsTable.key, "demo_seed_version"));

  if (existing[0]?.value === SEED_VERSION) {
    console.log(`✅ Seed already at version ${SEED_VERSION} — skipping.`);
    return;
  }

  console.log(`🌱 Seeding database (version ${SEED_VERSION})...`);
  await resetTables();

  // ──────────────────────────────────────────────────────────
  // USERS
  // ──────────────────────────────────────────────────────────
  const [admin] = await db.insert(usersTable).values({
    name: "Super Admin",
    email: "admin@tastycrousty.dz",
    passwordHash: await hash("admin123456"),
    role: "admin" as any,
    phone: "+213 21 00 00 01",
    isActive: true,
  }).returning();

  // Restaurant owners
  const [owner1, owner2, owner3] = await db.insert(usersTable).values([
    { name: "Ali Belkacem", email: "restaurant@tc.dz", passwordHash: await hash("resto123"), role: "restaurant" as any, phone: "+213 550 111 001", isActive: true },
    { name: "Fatima Zahra Aïssani", email: "resto2@tc.dz", passwordHash: await hash("resto123"), role: "restaurant" as any, phone: "+213 550 111 002", isActive: true },
    { name: "Hocine Kaddour", email: "resto3@tc.dz", passwordHash: await hash("resto123"), role: "restaurant" as any, phone: "+213 550 111 003", isActive: true },
  ]).returning();

  // Drivers
  const [drv1, drv2, drv3, drv4, drv5] = await db.insert(usersTable).values([
    { name: "Mohamed Meziane", email: "driver@tc.dz",  passwordHash: await hash("driver123"), role: "driver" as any, phone: "+213 555 200 001", isActive: true },
    { name: "Yacine Hamdani",  email: "driver2@tc.dz", passwordHash: await hash("driver123"), role: "driver" as any, phone: "+213 555 200 002", isActive: true },
    { name: "Rédha Boudiaf",   email: "driver3@tc.dz", passwordHash: await hash("driver123"), role: "driver" as any, phone: "+213 555 200 003", isActive: true },
    { name: "Sofiane Tebbal",  email: "driver4@tc.dz", passwordHash: await hash("driver123"), role: "driver" as any, phone: "+213 555 200 004", isActive: true },
    { name: "Amine Rahmani",   email: "driver5@tc.dz", passwordHash: await hash("driver123"), role: "driver" as any, phone: "+213 555 200 005", isActive: true },
  ]).returning();

  // Customers
  const [cust1, cust2, cust3, cust4, cust5, cust6] = await db.insert(usersTable).values([
    { name: "Yasmine Boumediene", email: "customer@tc.dz",  passwordHash: await hash("client123"), role: "customer" as any, phone: "+213 540 300 001", isActive: true },
    { name: "Amine Rezzoug",      email: "customer2@tc.dz", passwordHash: await hash("client123"), role: "customer" as any, phone: "+213 540 300 002", isActive: true },
    { name: "Samira Chaouch",     email: "customer3@tc.dz", passwordHash: await hash("client123"), role: "customer" as any, phone: "+213 540 300 003", isActive: true },
    { name: "Karim Talbi",        email: "customer4@tc.dz", passwordHash: await hash("client123"), role: "customer" as any, phone: "+213 540 300 004", isActive: true },
    { name: "Leila Abbès",        email: "customer5@tc.dz", passwordHash: await hash("client123"), role: "customer" as any, phone: "+213 540 300 005", isActive: true },
    { name: "Omar Mekkaoui",      email: "customer6@tc.dz", passwordHash: await hash("client123"), role: "customer" as any, phone: "+213 540 300 006", isActive: true },
  ]).returning();

  // ──────────────────────────────────────────────────────────
  // DRIVER PROFILES
  // ──────────────────────────────────────────────────────────
  await db.insert(driverProfilesTable).values([
    { userId: drv1.id, status: "approved", isOnline: true,  availability: "available" as any, avgRating: "4.92", acceptanceRate: "94.00", totalDeliveries: 312, earningsTotal: "187200.00" },
    { userId: drv2.id, status: "approved", isOnline: true,  availability: "busy"      as any, avgRating: "4.80", acceptanceRate: "88.00", totalDeliveries: 185, earningsTotal: "111000.00" },
    { userId: drv3.id, status: "approved", isOnline: false, availability: "offline"   as any, avgRating: "4.65", acceptanceRate: "76.00", totalDeliveries: 98,  earningsTotal: "58800.00" },
    { userId: drv4.id, status: "approved", isOnline: true,  availability: "available" as any, avgRating: "4.88", acceptanceRate: "91.00", totalDeliveries: 221, earningsTotal: "132600.00" },
    { userId: drv5.id, status: "pending",  isOnline: false, availability: "offline"   as any, avgRating: "0.00", acceptanceRate: "0.00",  totalDeliveries: 0,   earningsTotal: "0.00" },
  ]);

  // ──────────────────────────────────────────────────────────
  // CUSTOMER PROFILES
  // ──────────────────────────────────────────────────────────
  await db.insert(customerProfilesTable).values([
    { userId: cust1.id, riskScore: "low"    as any, totalOrders: 14, cancellationCount: 0, unreachableCount: 0 },
    { userId: cust2.id, riskScore: "low"    as any, totalOrders: 7,  cancellationCount: 1, unreachableCount: 0 },
    { userId: cust3.id, riskScore: "low"    as any, totalOrders: 22, cancellationCount: 0, unreachableCount: 0 },
    { userId: cust4.id, riskScore: "medium" as any, totalOrders: 5,  cancellationCount: 2, unreachableCount: 1, failedConfirmationCount: 1 },
    { userId: cust5.id, riskScore: "low"    as any, totalOrders: 3,  cancellationCount: 0, unreachableCount: 0 },
    { userId: cust6.id, riskScore: "high"   as any, totalOrders: 8,  cancellationCount: 4, unreachableCount: 2, disputeCount: 1 },
  ]);

  // ──────────────────────────────────────────────────────────
  // CITIES & ZONES
  // ──────────────────────────────────────────────────────────
  const [alger, oran, constantine] = await db.insert(citiesTable).values([
    { name: "Alger",       nameAr: "الجزائر",    isActive: true },
    { name: "Oran",        nameAr: "وهران",       isActive: true },
    { name: "Constantine", nameAr: "قسنطينة",   isActive: true },
  ]).returning();

  const [zCentre, zBabElOued, zElBiar, zHydra, zKouba, zBirkhadem, zOranCentre, zConstCentre] = await db.insert(zonesTable).values([
    { cityId: alger.id,       name: "Centre-Ville",  nameAr: "وسط المدينة",  deliveryFee: "200.00", estimatedMinutes: 20 },
    { cityId: alger.id,       name: "Bab El Oued",   nameAr: "باب الواد",    deliveryFee: "250.00", estimatedMinutes: 25 },
    { cityId: alger.id,       name: "El Biar",       nameAr: "البيار",       deliveryFee: "300.00", estimatedMinutes: 30 },
    { cityId: alger.id,       name: "Hydra",         nameAr: "حيدرة",        deliveryFee: "350.00", estimatedMinutes: 35 },
    { cityId: alger.id,       name: "Kouba",         nameAr: "القبة",        deliveryFee: "300.00", estimatedMinutes: 30 },
    { cityId: alger.id,       name: "Birkhadem",     nameAr: "بئر خادم",    deliveryFee: "350.00", estimatedMinutes: 35 },
    { cityId: oran.id,        name: "Centre-Ville",  nameAr: "وسط المدينة",  deliveryFee: "200.00", estimatedMinutes: 20 },
    { cityId: constantine.id, name: "Centre-Ville",  nameAr: "وسط المدينة",  deliveryFee: "200.00", estimatedMinutes: 20 },
  ]).returning();

  // ──────────────────────────────────────────────────────────
  // RESTAURANTS
  // ──────────────────────────────────────────────────────────
  const [rest1, rest2, rest3, rest4, rest5, rest6] = await db.insert(restaurantsTable).values([
    {
      userId: owner1.id,
      name: "Le Jardin du Goût",       nameAr: "حديقة الذوق",
      description: "Cuisine méditerranéenne fraîche et raffinée, au cœur d'Alger.",
      category: "Méditerranéen",
      address: "12 Rue Didouche Mourad, Alger",
      phone: "+213 21 63 11 22",
      cityId: alger.id, zoneId: zCentre.id,
      status: "approved" as any, isOpen: true,
      estimatedPrepTime: 25, commissionRate: "10.00",
    },
    {
      userId: owner1.id,
      name: "Burger Palace",           nameAr: "قصر البرغر",
      description: "Les meilleurs burgers artisanaux d'Alger — viande fraîche locale.",
      category: "Fast Food",
      address: "45 Boulevard Zighout Youcef, Alger",
      phone: "+213 21 74 22 33",
      cityId: alger.id, zoneId: zBabElOued.id,
      status: "approved" as any, isOpen: true,
      estimatedPrepTime: 15, commissionRate: "12.00",
    },
    {
      userId: owner2.id,
      name: "Pizza Roma",              nameAr: "بيتزا روما",
      description: "Pizzas artisanales cuites au feu de bois, pâte maison, ingrédients frais.",
      category: "Pizza",
      address: "8 Rue Hassiba Ben Bouali, Alger",
      phone: "+213 21 55 44 33",
      cityId: alger.id, zoneId: zElBiar.id,
      status: "approved" as any, isOpen: true,
      estimatedPrepTime: 20, commissionRate: "10.00",
    },
    {
      userId: owner2.id,
      name: "Couscous Mama",           nameAr: "كسكسو ماما",
      description: "Saveurs authentiques d'Algérie — couscous, chorba, dolma préparés chaque matin.",
      category: "Algérien",
      address: "3 Rue Ben M'hidi Larbi, Alger",
      phone: "+213 21 48 55 66",
      cityId: alger.id, zoneId: zHydra.id,
      status: "approved" as any, isOpen: true,
      estimatedPrepTime: 30, commissionRate: "10.00",
    },
    {
      userId: owner3.id,
      name: "La Grillade Oranaise",    nameAr: "الشواء الوهراني",
      description: "Grillades au charbon de bois — brochettes, merguez, escalopes, côtelettes.",
      category: "Grillades",
      address: "22 Rue de la Bastille, Oran",
      phone: "+213 41 33 77 88",
      cityId: oran.id, zoneId: zOranCentre.id,
      status: "approved" as any, isOpen: true,
      estimatedPrepTime: 20, commissionRate: "11.00",
    },
    {
      userId: owner3.id,
      name: "Tajine & Thé",            nameAr: "طاجين وشاي",
      description: "Restaurant traditionnel — tajines, couscous, pâtisseries orientales et thé à la menthe.",
      category: "Algérien",
      address: "15 Avenue Belouizdad, Constantine",
      phone: "+213 31 44 22 11",
      cityId: constantine.id, zoneId: zConstCentre.id,
      status: "approved" as any, isOpen: false,
      estimatedPrepTime: 35, commissionRate: "10.00",
    },
  ]).returning();

  // ──────────────────────────────────────────────────────────
  // MENUS — Restaurant 1 (Le Jardin du Goût)
  // ──────────────────────────────────────────────────────────
  const [r1cat1, r1cat2, r1cat3] = await db.insert(menuCategoriesTable).values([
    { restaurantId: rest1.id, name: "Entrées",  nameAr: "المقبلات",           sortOrder: 1 },
    { restaurantId: rest1.id, name: "Plats",    nameAr: "الأطباق الرئيسية",  sortOrder: 2 },
    { restaurantId: rest1.id, name: "Desserts", nameAr: "الحلويات",          sortOrder: 3 },
  ]).returning();

  const [p1, p2, p3, p4, p5, p6, p7] = await db.insert(productsTable).values([
    { restaurantId: rest1.id, categoryId: r1cat1.id, name: "Salade César",           nameAr: "سلطة قيصر",          description: "Romaine fraîche, croûtons, copeaux de parmesan, sauce César maison",  price: "650.00",  sortOrder: 1, isAvailable: true },
    { restaurantId: rest1.id, categoryId: r1cat1.id, name: "Soupe Chorba",            nameAr: "شوربة",               description: "Soupe traditionnelle à la viande, vermicelles et coriandre fraîche",  price: "450.00",  sortOrder: 2, isAvailable: true },
    { restaurantId: rest1.id, categoryId: r1cat2.id, name: "Tajine d'Agneau",         nameAr: "طاجين الخروف",       description: "Tajine d'agneau aux pruneaux, amandes et légumes de saison",          price: "1800.00", sortOrder: 1, isAvailable: true },
    { restaurantId: rest1.id, categoryId: r1cat2.id, name: "Poulet Rôti aux Herbes",  nameAr: "دجاج مشوي بالأعشاب", description: "Demi-poulet mariné aux herbes méditerranéennes, pommes de terre",      price: "1500.00", sortOrder: 2, isAvailable: true },
    { restaurantId: rest1.id, categoryId: r1cat2.id, name: "Couscous Royal",          nameAr: "الكسكسى الملكي",     description: "Couscous maison avec légumes, merguez, poulet et pois chiches",      price: "2200.00", sortOrder: 3, isAvailable: true },
    { restaurantId: rest1.id, categoryId: r1cat3.id, name: "Makroud au Miel",         nameAr: "المقروض بالعسل",     description: "Gâteau traditionnel aux dattes, glacé au miel de fleurs",            price: "400.00",  sortOrder: 1, isAvailable: true },
    { restaurantId: rest1.id, categoryId: r1cat3.id, name: "Baklava Maison",          nameAr: "البقلاوة",           description: "Feuilletés aux amandes et pistaches, sirop de miel",                price: "500.00",  sortOrder: 2, isAvailable: true },
  ]).returning();

  // MENUS — Restaurant 2 (Burger Palace)
  const [r2cat1, r2cat2, r2cat3] = await db.insert(menuCategoriesTable).values([
    { restaurantId: rest2.id, name: "Burgers",         nameAr: "البرغر",        sortOrder: 1 },
    { restaurantId: rest2.id, name: "Accompagnements", nameAr: "المرافقات",    sortOrder: 2 },
    { restaurantId: rest2.id, name: "Boissons",        nameAr: "المشروبات",    sortOrder: 3 },
  ]).returning();

  const [p8, p9, p10, p11, p12, p13, p14] = await db.insert(productsTable).values([
    { restaurantId: rest2.id, categoryId: r2cat1.id, name: "Classic Burger",    nameAr: "البرغر الكلاسيكي",  description: "Steak haché 150g, cheddar, salade, tomate, oignon, sauce maison",   price: "950.00",  sortOrder: 1, isAvailable: true },
    { restaurantId: rest2.id, categoryId: r2cat1.id, name: "Double Smash",      nameAr: "دبل سماش",          description: "Double steak smashé 2×120g, double cheddar, sauce spéciale",      price: "1350.00", sortOrder: 2, isAvailable: true },
    { restaurantId: rest2.id, categoryId: r2cat1.id, name: "Chicken Crispy",    nameAr: "دجاج كريسبي",      description: "Filet de poulet croustillant, coleslaw, cornichons, sauce buffalo", price: "1100.00", sortOrder: 3, isAvailable: true },
    { restaurantId: rest2.id, categoryId: r2cat1.id, name: "Veggie Burger",     nameAr: "برغر نباتي",        description: "Galette de légumes, houmous, avocat, tomates séchées",            price: "900.00",  sortOrder: 4, isAvailable: true },
    { restaurantId: rest2.id, categoryId: r2cat2.id, name: "Frites Maison",     nameAr: "بطاطس منزلية",     description: "Frites fraîches coupées et assaisonnées à la maison",             price: "350.00",  sortOrder: 1, isAvailable: true },
    { restaurantId: rest2.id, categoryId: r2cat2.id, name: "Onion Rings",       nameAr: "حلقات البصل",       description: "Rondelles d'oignon panées, croustillantes, sauce ranch",         price: "400.00",  sortOrder: 2, isAvailable: true },
    { restaurantId: rest2.id, categoryId: r2cat3.id, name: "Soda 33cl",         nameAr: "مشروب غازي",       description: "Coca-Cola, Pepsi, Fanta, Sprite au choix",                       price: "200.00",  sortOrder: 1, isAvailable: true },
  ]).returning();

  // MENUS — Restaurant 3 (Pizza Roma)
  const [r3cat1, r3cat2] = await db.insert(menuCategoriesTable).values([
    { restaurantId: rest3.id, name: "Pizzas",  nameAr: "البيتزا",   sortOrder: 1 },
    { restaurantId: rest3.id, name: "Pâtes",   nameAr: "المعكرونة", sortOrder: 2 },
  ]).returning();

  const [p15, p16, p17, p18, p19] = await db.insert(productsTable).values([
    { restaurantId: rest3.id, categoryId: r3cat1.id, name: "Pizza Margherita",   nameAr: "بيتزا مارغريتا",  description: "Tomate, mozzarella fraîche, basilic, huile d'olive vierge",  price: "1100.00", sortOrder: 1, isAvailable: true },
    { restaurantId: rest3.id, categoryId: r3cat1.id, name: "Pizza 4 Fromages",   nameAr: "بيتزا أربعة أجبان", description: "Mozzarella, gorgonzola, chèvre, parmesan, herbes fraîches",  price: "1400.00", sortOrder: 2, isAvailable: true },
    { restaurantId: rest3.id, categoryId: r3cat1.id, name: "Pizza Merguez",      nameAr: "بيتزا المرقاز",   description: "Tomate, mozzarella, merguez artisanaux, poivrons, harissa", price: "1300.00", sortOrder: 3, isAvailable: true },
    { restaurantId: rest3.id, categoryId: r3cat1.id, name: "Pizza Végétarienne", nameAr: "بيتزا خضار",      description: "Légumes grillés de saison, mozzarella, pesto maison",       price: "1150.00", sortOrder: 4, isAvailable: true },
    { restaurantId: rest3.id, categoryId: r3cat2.id, name: "Lasagne Bolognaise", nameAr: "لازانيا",         description: "Lasagnes maison à la bolognaise, béchamel, parmesan gratiné", price: "1100.00", sortOrder: 1, isAvailable: true },
  ]).returning();

  // MENUS — Restaurant 4 (Couscous Mama)
  const [r4cat1, r4cat2, r4cat3] = await db.insert(menuCategoriesTable).values([
    { restaurantId: rest4.id, name: "Soupes & Entrées", nameAr: "الشوربات والمقبلات", sortOrder: 1 },
    { restaurantId: rest4.id, name: "Plats Traditionnels", nameAr: "الأطباق التقليدية", sortOrder: 2 },
    { restaurantId: rest4.id, name: "Pâtisseries",       nameAr: "الحلويات",           sortOrder: 3 },
  ]).returning();

  const [p20, p21, p22, p23, p24, p25] = await db.insert(productsTable).values([
    { restaurantId: rest4.id, categoryId: r4cat1.id, name: "Chorba Frik",      nameAr: "شوربة الفريك",      description: "Soupe traditionnelle au blé vert, agneau et légumes",           price: "550.00",  sortOrder: 1, isAvailable: true },
    { restaurantId: rest4.id, categoryId: r4cat1.id, name: "Lentilles Maison", nameAr: "عدس منزلي",         description: "Lentilles cuisinées à la tomate, cumin et citron",             price: "450.00",  sortOrder: 2, isAvailable: true },
    { restaurantId: rest4.id, categoryId: r4cat2.id, name: "Couscous au Poulet", nameAr: "كسكسو بالدجاج",   description: "Couscous maison, poulet fermier, légumes braisés",             price: "1600.00", sortOrder: 1, isAvailable: true },
    { restaurantId: rest4.id, categoryId: r4cat2.id, name: "Dolma Feuilles",   nameAr: "الدولمة",           description: "Feuilles de vigne farcies au riz, herbes et citron",          price: "1200.00", sortOrder: 2, isAvailable: true },
    { restaurantId: rest4.id, categoryId: r4cat2.id, name: "Chakhchoukha",     nameAr: "الشخشوخة",         description: "Galettes de pain rompu aux légumes, poulet et bouillon",      price: "1600.00", sortOrder: 3, isAvailable: true },
    { restaurantId: rest4.id, categoryId: r4cat3.id, name: "Qalb Ellouz",      nameAr: "قلب اللوز",        description: "Gâteau algérien aux amandes et eau de fleur d'oranger",       price: "400.00",  sortOrder: 1, isAvailable: true },
  ]).returning();

  // MENUS — Restaurant 5 (La Grillade Oranaise)
  const [r5cat1, r5cat2] = await db.insert(menuCategoriesTable).values([
    { restaurantId: rest5.id, name: "Grillades",     nameAr: "المشويات",   sortOrder: 1 },
    { restaurantId: rest5.id, name: "Accompagnements", nameAr: "المرافقات", sortOrder: 2 },
  ]).returning();

  const [p26, p27, p28, p29, p30] = await db.insert(productsTable).values([
    { restaurantId: rest5.id, categoryId: r5cat1.id, name: "Brochettes Mixtes",   nameAr: "مشاوي مشكلة",     description: "3 brochettes agneau, 2 merguez, 2 kefta, cuites sur braise",  price: "2000.00", sortOrder: 1, isAvailable: true },
    { restaurantId: rest5.id, categoryId: r5cat1.id, name: "Steak Grillé",        nameAr: "ستيك مشوي",       description: "Steak d'entrecôte 250g, sauce au poivre, légumes grillés",   price: "1900.00", sortOrder: 2, isAvailable: true },
    { restaurantId: rest5.id, categoryId: r5cat1.id, name: "Poulet Entier Grillé",nameAr: "دجاجة مشوية",     description: "Poulet entier mariné aux épices, cuit lentement au charbon", price: "1700.00", sortOrder: 3, isAvailable: true },
    { restaurantId: rest5.id, categoryId: r5cat2.id, name: "Salade Fraîche",      nameAr: "سلطة طازجة",      description: "Tomates, concombres, oignons, citron et huile d'olive",      price: "350.00",  sortOrder: 1, isAvailable: true },
    { restaurantId: rest5.id, categoryId: r5cat2.id, name: "Pain Maison",         nameAr: "خبز بلدي",        description: "Pain de campagne cuit à la demande",                        price: "150.00",  sortOrder: 2, isAvailable: true },
  ]).returning();

  // MENUS — Restaurant 6 (Tajine & Thé)
  const [r6cat1, r6cat2] = await db.insert(menuCategoriesTable).values([
    { restaurantId: rest6.id, name: "Tajines",       nameAr: "الطواجن",  sortOrder: 1 },
    { restaurantId: rest6.id, name: "Boissons",      nameAr: "المشروبات", sortOrder: 2 },
  ]).returning();

  await db.insert(productsTable).values([
    { restaurantId: rest6.id, categoryId: r6cat1.id, name: "Tajine de Poulet aux Olives", nameAr: "طاجين الدجاج بالزيتون", description: "Tajine de poulet, olives vertes, citron confit, herbes", price: "1600.00", sortOrder: 1, isAvailable: true },
    { restaurantId: rest6.id, categoryId: r6cat1.id, name: "Tajine d'Agneau aux Légumes", nameAr: "طاجين الخروف بالخضر",  description: "Agneau fondant, carottes, navets, courgettes, pois chiches", price: "1900.00", sortOrder: 2, isAvailable: true },
    { restaurantId: rest6.id, categoryId: r6cat2.id, name: "Thé à la Menthe",             nameAr: "شاي بالنعناع",          description: "Thé vert, menthe fraîche, sucre, pignons de pin",     price: "250.00",  sortOrder: 1, isAvailable: true },
    { restaurantId: rest6.id, categoryId: r6cat2.id, name: "Café Turc",                   nameAr: "قهوة تركية",            description: "Café turc traditionnel servi avec loukoums",           price: "200.00",  sortOrder: 2, isAvailable: true },
  ]);

  // ──────────────────────────────────────────────────────────
  // ORDERS + ITEMS + STATUS HISTORY + PAYMENTS + RATINGS
  // ──────────────────────────────────────────────────────────

  async function createOrder(opts: {
    customer: typeof cust1;
    restaurant: typeof rest1;
    driver?: typeof drv1;
    status: string;
    items: { product: any; qty: number }[];
    deliveryFee?: number;
    address: string;
    phone: string;
    hoursAgo: number;
    paymentMethod?: "cash_on_delivery" | "online";
  }) {
    const deliveryFee = opts.deliveryFee ?? 200;
    const subtotal = opts.items.reduce((s, i) => s + Number(i.product.price) * i.qty, 0);
    const total = subtotal + deliveryFee;

    const [order] = await db.insert(ordersTable).values({
      orderNumber: orderNum(),
      customerId: opts.customer.id,
      restaurantId: opts.restaurant.id,
      driverId: opts.driver?.id ?? null,
      status: opts.status as any,
      deliveryAddress: opts.address,
      deliveryPhone: opts.phone,
      subtotal: subtotal.toFixed(2),
      deliveryFee: deliveryFee.toFixed(2),
      total: total.toFixed(2),
      paymentMethod: opts.paymentMethod ?? "cash_on_delivery",
      paymentStatus: opts.status === "delivered" ? "cash_on_delivery" : "pending",
      zoneId: opts.restaurant.zoneId ?? null,
      createdAt: ago(opts.hoursAgo),
      updatedAt: ago(Math.max(0, opts.hoursAgo - 0.5)),
    }).returning();

    // Items
    await db.insert(orderItemsTable).values(opts.items.map(({ product, qty }) => ({
      orderId: order.id,
      productId: product.id,
      productName: product.name,
      quantity: qty,
      price: product.price,
    })));

    // Status history
    await db.insert(orderStatusHistoryTable).values([
      { orderId: order.id, status: "pending_dispatch" as any, createdAt: ago(opts.hoursAgo) },
      ...(opts.status !== "pending_dispatch" ? [{ orderId: order.id, status: opts.status as any, createdAt: ago(opts.hoursAgo - 0.5) }] : []),
    ]);

    // Payment record for delivered orders
    if (opts.status === "delivered" || opts.status === "refunded") {
      await db.insert(paymentsTable).values({
        orderId: order.id,
        amount: total.toFixed(2),
        method: opts.paymentMethod ?? "cash_on_delivery",
        status: opts.status === "delivered" ? "paid" : "refunded",
      });
    }

    // QR token for delivered orders
    if (opts.status === "delivered") {
      await db.insert(qrDeliveryTokensTable).values({
        orderId: order.id,
        token: `QR-${order.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        isUsed: true,
        expiresAt: ago(-24),
      });
    }

    return order;
  }

  // ── Delivered orders (historical) ──────────────────────────────────────────
  const ord1 = await createOrder({ customer: cust1, restaurant: rest1, driver: drv1, status: "delivered", hoursAgo: 48, address: "15 Rue Larbi Ben M'hidi, Alger", phone: "+213 540 300 001", items: [{ product: p3, qty: 1 }, { product: p1, qty: 1 }, { product: p7, qty: 2 }] });
  const ord2 = await createOrder({ customer: cust3, restaurant: rest2, driver: drv2, status: "delivered", hoursAgo: 36, address: "22 Cité Aïn Allah, Hydra", phone: "+213 540 300 003", items: [{ product: p9, qty: 1 }, { product: p11, qty: 2 }, { product: p13, qty: 1 }] });
  const ord3 = await createOrder({ customer: cust2, restaurant: rest3, driver: drv1, status: "delivered", hoursAgo: 24, address: "8 Rue Bougara, Alger", phone: "+213 540 300 002", items: [{ product: p16, qty: 1 }, { product: p19, qty: 1 }] });
  const ord4 = await createOrder({ customer: cust4, restaurant: rest4, driver: drv4, status: "delivered", hoursAgo: 72, address: "4 Allée des Roses, Kouba", phone: "+213 540 300 004", items: [{ product: p22, qty: 2 }, { product: p20, qty: 1 }] });
  const ord5 = await createOrder({ customer: cust3, restaurant: rest5, driver: drv2, status: "delivered", hoursAgo: 96, address: "11 Avenue des Frères Bouadou, Birtouta", phone: "+213 540 300 003", items: [{ product: p26, qty: 1 }, { product: p28, qty: 1 }, { product: p30, qty: 2 }] });
  const ord6 = await createOrder({ customer: cust5, restaurant: rest1, driver: drv4, status: "delivered", hoursAgo: 12, address: "7 Rue Colonel Amirouche, Birkhadem", phone: "+213 540 300 005", items: [{ product: p4, qty: 1 }, { product: p2, qty: 1 }, { product: p6, qty: 1 }], paymentMethod: "online" });
  const ord7 = await createOrder({ customer: cust6, restaurant: rest2, driver: drv1, status: "delivered", hoursAgo: 60, address: "18 Rue Hassani Abdelkader, Bab El Oued", phone: "+213 540 300 006", items: [{ product: p8, qty: 2 }, { product: p11, qty: 2 }, { product: p14, qty: 2 }] });

  // ── Active / in-progress orders ────────────────────────────────────────────
  const ord8  = await createOrder({ customer: cust1, restaurant: rest2, driver: drv2, status: "on_the_way", hoursAgo: 0.6, address: "15 Rue Larbi Ben M'hidi, Alger", phone: "+213 540 300 001", items: [{ product: p9, qty: 1 }, { product: p11, qty: 1 }] });
  const ord9  = await createOrder({ customer: cust2, restaurant: rest1, driver: drv4, status: "preparing", hoursAgo: 0.8, address: "8 Rue Bougara, Alger", phone: "+213 540 300 002", items: [{ product: p5, qty: 1 }, { product: p1, qty: 1 }] });
  const ord10 = await createOrder({ customer: cust4, restaurant: rest3, driver: drv1, status: "arriving_soon", hoursAgo: 0.4, address: "4 Allée des Roses, Kouba", phone: "+213 540 300 004", items: [{ product: p15, qty: 1 }, { product: p17, qty: 1 }] });
  const ord11 = await createOrder({ customer: cust3, restaurant: rest4, driver: drv4, status: "confirmed_for_preparation", hoursAgo: 0.7, address: "22 Cité Aïn Allah, Hydra", phone: "+213 540 300 003", items: [{ product: p22, qty: 1 }, { product: p20, qty: 1 }] });
  const ord12 = await createOrder({ customer: cust5, restaurant: rest2, driver: drv2, status: "awaiting_customer_confirmation", hoursAgo: 0.3, address: "7 Rue Colonel Amirouche, Birkhadem", phone: "+213 540 300 005", items: [{ product: p8, qty: 1 }, { product: p12, qty: 1 }, { product: p11, qty: 1 }] });
  const ord13 = await createOrder({ customer: cust6, restaurant: rest1, status: "pending_dispatch", hoursAgo: 0.1, address: "18 Rue Hassani Abdelkader, Bab El Oued", phone: "+213 540 300 006", items: [{ product: p3, qty: 1 }, { product: p7, qty: 2 }] });

  // ── Problem / edge-case orders ─────────────────────────────────────────────
  const ord14 = await createOrder({ customer: cust6, restaurant: rest2, driver: drv3, status: "needs_update", hoursAgo: 1.5, address: "Adresse incorrecte, à corriger", phone: "+213 540 300 006", items: [{ product: p8, qty: 1 }, { product: p11, qty: 1 }] });
  const ord15 = await createOrder({ customer: cust4, restaurant: rest1, driver: drv3, status: "confirmation_failed", hoursAgo: 2, address: "12 Rue de la Liberté, Alger", phone: "+213 540 300 004", items: [{ product: p4, qty: 1 }] });
  const ord16 = await createOrder({ customer: cust2, restaurant: rest3, status: "cancelled", hoursAgo: 10, address: "8 Rue Bougara, Alger", phone: "+213 540 300 002", items: [{ product: p16, qty: 2 }] });

  // ── Ready / pickup ──────────────────────────────────────────────────────────
  const ord17 = await createOrder({ customer: cust1, restaurant: rest4, driver: drv4, status: "ready_for_pickup", hoursAgo: 0.5, address: "15 Rue Larbi Ben M'hidi, Alger", phone: "+213 540 300 001", items: [{ product: p23, qty: 1 }, { product: p25, qty: 1 }] });

  // ──────────────────────────────────────────────────────────
  // RATINGS
  // ──────────────────────────────────────────────────────────
  await db.insert(ratingsTable).values([
    { orderId: ord1.id, customerId: cust1.id, targetType: "restaurant" as any, targetId: rest1.id, rating: 5, comment: "Excellent tajine, livraison parfaite. Vraiment au top !" },
    { orderId: ord1.id, customerId: cust1.id, targetType: "driver"     as any, targetId: drv1.id,  rating: 5, comment: "Livreur très professionnel, ponctuel et souriant." },
    { orderId: ord2.id, customerId: cust3.id, targetType: "restaurant" as any, targetId: rest2.id, rating: 4, comment: "Bons burgers, un peu longs mais délicieux." },
    { orderId: ord2.id, customerId: cust3.id, targetType: "driver"     as any, targetId: drv2.id,  rating: 5, comment: "Rapide et sympa !" },
    { orderId: ord3.id, customerId: cust2.id, targetType: "restaurant" as any, targetId: rest3.id, rating: 5, comment: "La meilleure pizza d'Alger, sans hésitation." },
    { orderId: ord3.id, customerId: cust2.id, targetType: "driver"     as any, targetId: drv1.id,  rating: 4, comment: "Livraison OK." },
    { orderId: ord4.id, customerId: cust4.id, targetType: "restaurant" as any, targetId: rest4.id, rating: 4, comment: "Couscous succulent, portions généreuses." },
    { orderId: ord5.id, customerId: cust3.id, targetType: "restaurant" as any, targetId: rest5.id, rating: 5, comment: "Les grillades sont exceptionnelles, viande de qualité." },
    { orderId: ord5.id, customerId: cust3.id, targetType: "driver"     as any, targetId: drv2.id,  rating: 5, comment: "Parfait !" },
    { orderId: ord6.id, customerId: cust5.id, targetType: "restaurant" as any, targetId: rest1.id, rating: 4, comment: "Très bien, la soupe est remarquable." },
    { orderId: ord7.id, customerId: cust6.id, targetType: "restaurant" as any, targetId: rest2.id, rating: 3, comment: "Correct mais les frites étaient tièdes à l'arrivée." },
  ]);

  // ──────────────────────────────────────────────────────────
  // NOTIFICATIONS
  // ──────────────────────────────────────────────────────────
  await db.insert(notificationsTable).values([
    // Customer notifications
    { userId: cust1.id, type: "delivered"        as any, title: "Commande livrée !",         message: "Votre commande a bien été livrée. Bon appétit !",                       isRead: true,  relatedOrderId: ord1.id },
    { userId: cust1.id, type: "on_the_way"        as any, title: "En route !",                message: "Votre livreur Mohamed est en route avec votre commande.",               isRead: false, relatedOrderId: ord8.id },
    { userId: cust1.id, type: "driver_assigned"   as any, title: "Livreur assigné",           message: "Yacine Hamdani a accepté votre commande et se dirige vers vous.",       isRead: false, relatedOrderId: ord8.id },
    { userId: cust2.id, type: "preparation_started" as any, title: "Préparation commencée",   message: "Le restaurant prépare votre commande. Elle sera bientôt prête !",       isRead: false, relatedOrderId: ord9.id },
    { userId: cust3.id, type: "delivered"          as any, title: "Livré avec succès !",       message: "Commande livrée par Yacine. Bon appétit !",                            isRead: true,  relatedOrderId: ord2.id },
    { userId: cust4.id, type: "arriving_soon"      as any, title: "Arrivée imminente !",       message: "Votre livreur est à moins de 2 minutes de chez vous.",                 isRead: false, relatedOrderId: ord10.id },
    { userId: cust5.id, type: "driver_assigned"    as any, title: "Livreur en route",          message: "Yacine se dirige vers vous pour confirmer votre livraison.",           isRead: false, relatedOrderId: ord12.id },
    { userId: cust6.id, type: "correction_needed"  as any, title: "Correction d'adresse requise", message: "Votre livreur n'a pas pu confirmer votre adresse. Veuillez la corriger.", isRead: false, relatedOrderId: ord14.id },
    // Driver notifications
    { userId: drv1.id, type: "mission_request" as any, title: "Nouvelle mission disponible", message: "Commande disponible à Alger Centre — acceptez rapidement !", isRead: false },
    { userId: drv2.id, type: "mission_request" as any, title: "Nouvelle mission disponible", message: "Commande disponible à Bab El Oued — 1 350 DA de valeur.",    isRead: true },
    // Restaurant notifications
    { userId: owner1.id, type: "order_placed"  as any, title: "Nouvelle commande !",          message: "Vous avez reçu une nouvelle commande — préparez-vous !",               isRead: false, relatedOrderId: ord13.id },
    { userId: owner1.id, type: "order_placed"  as any, title: "Commande PrepLock™ confirmée", message: "La commande est confirmée — vous pouvez commencer la préparation.",    isRead: true,  relatedOrderId: ord9.id },
  ]);

  // ──────────────────────────────────────────────────────────
  // FRAUD FLAGS
  // ──────────────────────────────────────────────────────────
  await db.insert(fraudFlagsTable).values([
    {
      userId: cust6.id,
      type: "repeated_cancellation",
      severity: "high" as any,
      description: "Client annulant 4 commandes en 30 jours après préparation. Pattern suspect.",
      relatedOrderId: ord16.id,
      isResolved: false,
    },
    {
      userId: cust4.id,
      type: "repeated_unreachable",
      severity: "medium" as any,
      description: "Client injoignable à 2 reprises lors de la confirmation par le livreur.",
      relatedOrderId: ord15.id,
      isResolved: false,
    },
    {
      userId: cust6.id,
      type: "address_manipulation",
      severity: "critical" as any,
      description: "Adresse délibérément incorrecte soumise pour contourner la confirmation PrepLock™.",
      relatedOrderId: ord14.id,
      isResolved: false,
    },
    {
      userId: cust2.id,
      type: "suspicious_cancellation",
      severity: "low" as any,
      description: "Annulation unique après 30 minutes. À surveiller.",
      relatedOrderId: ord16.id,
      isResolved: true,
      resolvedAt: ago(8),
      resolvedBy: admin.id,
    },
  ]);

  // ──────────────────────────────────────────────────────────
  // PLATFORM SETTINGS
  // ──────────────────────────────────────────────────────────
  await db.insert(platformSettingsTable).values([
    { key: "platform_name",          value: "TastyCrousty" },
    { key: "default_delivery_fee",   value: "200" },
    { key: "max_dispatch_attempts",  value: "5" },
    { key: "dispatch_timeout_mins",  value: "3" },
    { key: "commission_rate_default",value: "10" },
    { key: "demo_seed_version",      value: SEED_VERSION },
  ]).onConflictDoUpdate({ target: platformSettingsTable.key, set: { value: SEED_VERSION } });

  // Final upsert for seed version flag
  await db.insert(platformSettingsTable).values({ key: "demo_seed_version", value: SEED_VERSION })
    .onConflictDoUpdate({ target: platformSettingsTable.key, set: { value: SEED_VERSION } });

  console.log("✅ Seed complete!\n");
  console.log("📋 Demo accounts:");
  console.log("  👤 Admin:       admin@tastycrousty.dz  / admin123456");
  console.log("  🍽️  Restaurant:  restaurant@tc.dz        / resto123");
  console.log("  🛵  Livreur:    driver@tc.dz            / driver123");
  console.log("  🧑  Client:     customer@tc.dz          / client123");
  console.log("\n📊 Seeded:");
  console.log("  3 cities, 8 zones, 6 restaurants, 15 users");
  console.log("  32 menu items across 6 restaurants");
  console.log("  17 orders covering all major statuses");
  console.log("  11 ratings, 12 notifications, 4 fraud flags");
}

seed().catch(console.error).finally(() => process.exit(0));
