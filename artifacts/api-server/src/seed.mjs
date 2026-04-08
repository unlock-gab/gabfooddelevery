import { createRequire } from "module";
const require = createRequire(import.meta.url);

// Use pg and bcryptjs from node_modules
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  const client = await pool.connect();
  console.log("🌱 Seeding database...");

  try {
    const adminPwd = await bcrypt.hash("admin123456", 10);
    const restPwd = await bcrypt.hash("resto123", 10);
    const driverPwd = await bcrypt.hash("driver123", 10);
    const customerPwd = await bcrypt.hash("client123", 10);

    // Insert users
    await client.query(`
      INSERT INTO users (name, email, password_hash, role, is_active)
      VALUES 
        ('Super Admin', 'admin@tastycrousty.dz', $1, 'admin', true),
        ('Ali Restaurant', 'restaurant@tc.dz', $2, 'restaurant', true),
        ('Mohamed Livreur', 'driver@tc.dz', $3, 'driver', true),
        ('Yasmine Cliente', 'customer@tc.dz', $4, 'customer', true)
      ON CONFLICT (email) DO UPDATE SET 
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role
    `, [adminPwd, restPwd, driverPwd, customerPwd]);

    const restRes = await client.query(`SELECT id FROM users WHERE email = 'restaurant@tc.dz'`);
    const driverRes = await client.query(`SELECT id FROM users WHERE email = 'driver@tc.dz'`);
    const customerRes = await client.query(`SELECT id FROM users WHERE email = 'customer@tc.dz'`);

    const restUserId = restRes.rows[0].id;
    const driverUserId = driverRes.rows[0].id;
    const customerUserId = customerRes.rows[0].id;

    // Driver profile
    await client.query(`
      INSERT INTO driver_profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING
    `, [driverUserId]);

    // Customer profile
    await client.query(`
      INSERT INTO customer_profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING
    `, [customerUserId]);

    // City
    await client.query(`INSERT INTO cities (name, name_ar) VALUES ('Alger', 'الجزائر') ON CONFLICT DO NOTHING`);
    const cityRes = await client.query(`SELECT id FROM cities WHERE name = 'Alger' LIMIT 1`);
    const cityId = cityRes.rows[0].id;

    // Zone
    await client.query(`
      INSERT INTO zones (city_id, name, name_ar, delivery_fee, estimated_minutes)
      VALUES ($1, 'Centre-Ville', 'وسط المدينة', '2.50', 20) ON CONFLICT DO NOTHING
    `, [cityId]);
    const zoneRes = await client.query(`SELECT id FROM zones WHERE city_id = $1 LIMIT 1`, [cityId]);
    const zoneId = zoneRes.rows[0].id;

    // Restaurants
    await client.query(`
      INSERT INTO restaurants (user_id, name, name_ar, description, category, city_id, zone_id, address, status, is_open, estimated_prep_time, commission_rate)
      VALUES
        ($1, 'Le Jardin du Goût', 'حديقة الذوق', 'Cuisine méditerranéenne fraîche et raffinée', 'Méditerranéen', $2, $3, '12 Rue Didouche Mourad, Alger', 'approved', true, 25, '10.00'),
        ($1, 'Burger Palace', 'قصر البرغر', 'Les meilleurs burgers artisanaux d''Alger', 'Fast Food', $2, $3, '45 Boulevard Zighout Youcef, Alger', 'approved', true, 15, '12.00')
      ON CONFLICT DO NOTHING
    `, [restUserId, cityId, zoneId]);

    const rest1Res = await client.query(`SELECT id FROM restaurants WHERE name = 'Le Jardin du Goût' LIMIT 1`);
    const rest2Res = await client.query(`SELECT id FROM restaurants WHERE name = 'Burger Palace' LIMIT 1`);

    const rest1Id = rest1Res.rows[0]?.id;
    const rest2Id = rest2Res.rows[0]?.id;

    // Menu for restaurant 1
    if (rest1Id) {
      const existCat = await client.query(`SELECT id FROM menu_categories WHERE restaurant_id = $1 LIMIT 1`, [rest1Id]);
      if (existCat.rows.length === 0) {
        const cat1Res = await client.query(`INSERT INTO menu_categories (restaurant_id, name, name_ar, sort_order) VALUES ($1, 'Entrées', 'المقبلات', 1) RETURNING id`, [rest1Id]);
        const cat2Res = await client.query(`INSERT INTO menu_categories (restaurant_id, name, name_ar, sort_order) VALUES ($1, 'Plats', 'الأطباق الرئيسية', 2) RETURNING id`, [rest1Id]);
        const cat3Res = await client.query(`INSERT INTO menu_categories (restaurant_id, name, name_ar, sort_order) VALUES ($1, 'Desserts', 'الحلويات', 3) RETURNING id`, [rest1Id]);

        const cat1Id = cat1Res.rows[0].id;
        const cat2Id = cat2Res.rows[0].id;
        const cat3Id = cat3Res.rows[0].id;

        await client.query(`
          INSERT INTO products (restaurant_id, category_id, name, name_ar, description, price, sort_order)
          VALUES
            ($1, $2, 'Salade César', 'سلطة قيصر', 'Salade fraîche, croûtons, parmesan', '8.50', 1),
            ($1, $2, 'Soupe du jour', 'حساء اليوم', 'Soupe maison préparée chaque matin', '6.00', 2),
            ($1, $3, 'Tajine d''Agneau', 'طاجين الخروف', 'Tajine traditionnel avec légumes de saison', '18.00', 1),
            ($1, $3, 'Poulet Rôti aux Herbes', 'دجاج مشوي بالأعشاب', 'Demi-poulet mariné aux herbes méditerranéennes', '15.00', 2),
            ($1, $3, 'Couscous Royal', 'الكسكسى الملكي', 'Couscous avec légumes, merguez et poulet', '22.00', 3),
            ($1, $4, 'Makroud', 'المقروض', 'Gâteau traditionnel aux dattes', '5.00', 1),
            ($1, $4, 'Baklava', 'البقلاوة', 'Pâtisserie aux noix et au miel', '6.50', 2)
        `, [rest1Id, cat1Id, cat2Id, cat3Id]);
      }
    }

    // Menu for restaurant 2
    if (rest2Id) {
      const existCat = await client.query(`SELECT id FROM menu_categories WHERE restaurant_id = $1 LIMIT 1`, [rest2Id]);
      if (existCat.rows.length === 0) {
        const bcat1Res = await client.query(`INSERT INTO menu_categories (restaurant_id, name, name_ar, sort_order) VALUES ($1, 'Burgers', 'البرغر', 1) RETURNING id`, [rest2Id]);
        const bcat2Res = await client.query(`INSERT INTO menu_categories (restaurant_id, name, name_ar, sort_order) VALUES ($1, 'Accompagnements', 'المرافقات', 2) RETURNING id`, [rest2Id]);

        const bcat1Id = bcat1Res.rows[0].id;
        const bcat2Id = bcat2Res.rows[0].id;

        await client.query(`
          INSERT INTO products (restaurant_id, category_id, name, name_ar, description, price, sort_order)
          VALUES
            ($1, $2, 'Classic Burger', 'البرغر الكلاسيكي', 'Steak haché, cheddar, salade, tomate', '12.00', 1),
            ($1, $2, 'Double Cheese', 'دبل تشيز', 'Double steak, double cheddar, sauce maison', '15.00', 2),
            ($1, $2, 'Chicken Crispy', 'دجاج كريسبي', 'Filet de poulet croustillant, coleslaw, cornichons', '13.00', 3),
            ($1, $3, 'Frites Maison', 'بطاطس منزلية', 'Frites fraîches assaisonnées', '4.50', 1),
            ($1, $3, 'Onion Rings', 'حلقات البصل', 'Rondelles d''oignon panées et croustillantes', '5.00', 2)
        `, [rest2Id, bcat1Id, bcat2Id]);
      }
    }

    console.log("✅ Seeding complete!");
    console.log("\n📋 Demo accounts:");
    console.log("  Admin:      admin@tastycrousty.dz / admin123456");
    console.log("  Restaurant: restaurant@tc.dz / resto123");
    console.log("  Livreur:    driver@tc.dz / driver123");
    console.log("  Client:     customer@tc.dz / client123");
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(e => {
  console.error("Seed failed:", e.message);
  process.exit(1);
});
