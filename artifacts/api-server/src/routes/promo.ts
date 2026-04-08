import { Router } from "express";
import { db } from "@workspace/db";
import { promoCodesTable, promoUsageTable } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import { authenticate } from "../lib/auth";

const router = Router();

router.post("/promo/validate", authenticate, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const { code, subtotal = 0, deliveryFee = 0 } = req.body;

  if (!code) { res.status(400).json({ error: "Code requis" }); return; }

  const [promo] = await db.select().from(promoCodesTable)
    .where(and(eq(promoCodesTable.code, code.toUpperCase()), eq(promoCodesTable.isActive, true)));

  if (!promo) { res.status(404).json({ error: "Code promo invalide ou expiré" }); return; }

  const now = new Date();
  if (promo.expiresAt && promo.expiresAt <= now) {
    res.status(400).json({ error: "Ce code promo a expiré" }); return;
  }

  if (promo.maxUsageTotal && promo.usageCount >= promo.maxUsageTotal) {
    res.status(400).json({ error: "Ce code promo a atteint sa limite d'utilisation" }); return;
  }

  if (promo.minimumBasket && subtotal < Number(promo.minimumBasket)) {
    res.status(400).json({
      error: `Panier minimum requis : ${Number(promo.minimumBasket)} DA`,
      minimumBasket: Number(promo.minimumBasket),
    }); return;
  }

  const userUsage = await db.select({ cnt: count() }).from(promoUsageTable)
    .where(and(eq(promoUsageTable.promoId, promo.id), eq(promoUsageTable.userId, user.id)));
  if (promo.maxUsagePerUser && (userUsage[0]?.cnt ?? 0) >= promo.maxUsagePerUser) {
    res.status(400).json({ error: "Vous avez déjà utilisé ce code promo" }); return;
  }

  let discountAmount = 0;
  if (promo.discountType === "fixed") {
    discountAmount = Math.min(Number(promo.discountValue), subtotal);
  } else if (promo.discountType === "percentage") {
    discountAmount = Math.round(subtotal * Number(promo.discountValue) / 100);
  } else if (promo.discountType === "free_delivery") {
    discountAmount = deliveryFee;
  }

  res.json({
    valid: true,
    code: promo.code,
    description: promo.description ?? null,
    discountType: promo.discountType,
    discountValue: Number(promo.discountValue),
    discountAmount,
    minimumBasket: promo.minimumBasket ? Number(promo.minimumBasket) : null,
  });
});

export default router;
