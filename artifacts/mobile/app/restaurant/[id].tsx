import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCart } from "@/context/CartContext";
import { useColors } from "@/hooks/useColors";
import { useGetRestaurant, useListMenuCategories, useListProducts } from "@workspace/api-client-react";
import { formatDA } from "@/utils/format";

export default function RestaurantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { items, addItem, updateQuantity, restaurantId, total, itemCount } = useCart();
  const [activeCategory, setActiveCategory] = useState<number | null>(null);

  const restaurantId_ = Number(id);
  const { data: restaurant, isLoading: loadingRest } = useGetRestaurant(restaurantId_);
  const { data: categories } = useListMenuCategories(restaurantId_);
  const { data: products } = useListProducts(restaurantId_, { categoryId: activeCategory ?? undefined } as any);

  const cartCount = (itemId: number) =>
    items.find((i) => i.productId === itemId)?.quantity ?? 0;

  const handleAdd = (product: any) => {
    if (restaurant) {
      addItem(
        { productId: product.id, name: product.name, price: product.price, quantity: 1 },
        restaurantId_,
        (restaurant as any).name
      );
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const differentRest = restaurantId !== null && restaurantId !== restaurantId_;

  if (loadingRest) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const rest = restaurant as any;

  return (
    <View style={[s.flex, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          s.header,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 8),
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={s.headerInfo}>
          <Text style={[s.restName, { color: colors.foreground }]} numberOfLines={1}>
            {rest?.name ?? "Restaurant"}
          </Text>
          {rest?.estimatedPrepTime && (
            <View style={s.metaRow}>
              <Feather name="clock" size={12} color={colors.mutedForeground} />
              <Text style={[s.metaText, { color: colors.mutedForeground }]}>
                {rest.estimatedPrepTime} min
              </Text>
              <View
                style={[
                  s.openDot,
                  { backgroundColor: rest.isOpen ? "#22C55E" : "#6B7280" },
                ]}
              />
              <Text style={[s.metaText, { color: colors.mutedForeground }]}>
                {rest.isOpen ? "Ouvert" : "Fermé"}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Different restaurant warning */}
      {differentRest && (
        <View style={[s.warningBar, { backgroundColor: "#FEF3C7" }]}>
          <Feather name="alert-circle" size={14} color="#D97706" />
          <Text style={s.warningText}>
            Votre panier sera réinitialisé si vous ajoutez un article de ce restaurant
          </Text>
        </View>
      )}

      {/* Categories */}
      {categories && (categories as any[]).length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[s.catBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
          contentContainerStyle={s.catBarContent}
        >
          <Pressable
            style={[
              s.catTab,
              activeCategory === null && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            ]}
            onPress={() => setActiveCategory(null)}
          >
            <Text
              style={[
                s.catTabText,
                { color: activeCategory === null ? colors.primary : colors.mutedForeground },
              ]}
            >
              Tout
            </Text>
          </Pressable>
          {(categories as any[]).map((cat: any) => (
            <Pressable
              key={cat.id}
              style={[
                s.catTab,
                activeCategory === cat.id && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
              ]}
              onPress={() => setActiveCategory(cat.id)}
            >
              <Text
                style={[
                  s.catTabText,
                  { color: activeCategory === cat.id ? colors.primary : colors.mutedForeground },
                ]}
              >
                {cat.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Products */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 16,
          gap: 10,
          paddingBottom: insets.bottom + (itemCount > 0 ? 110 : 80),
        }}
      >
        {(products as any[])?.length === 0 && (
          <View style={s.center}>
            <Feather name="coffee" size={36} color={colors.mutedForeground} />
            <Text style={[s.emptyText, { color: colors.mutedForeground }]}>
              Aucun article disponible
            </Text>
          </View>
        )}
        {(products as any[])?.map((product: any) => {
          const qty = cartCount(product.id);
          return (
            <View
              key={product.id}
              style={[
                s.productCard,
                {
                  backgroundColor: colors.card,
                  borderColor: qty > 0 ? colors.primary : colors.border,
                },
              ]}
            >
              <View style={s.productInfo}>
                <Text style={[s.productName, { color: colors.foreground }]}>{product.name}</Text>
                {product.description ? (
                  <Text style={[s.productDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
                    {product.description}
                  </Text>
                ) : null}
                <Text style={[s.productPrice, { color: colors.primary }]}>
                  {formatDA(product.price)}
                </Text>
              </View>
              <View style={s.qtyControl}>
                {qty === 0 ? (
                  <TouchableOpacity
                    style={[s.addBtn, { backgroundColor: colors.primary }]}
                    onPress={() => handleAdd(product)}
                  >
                    <Feather name="plus" size={18} color={colors.primaryForeground} />
                  </TouchableOpacity>
                ) : (
                  <View style={s.stepper}>
                    <TouchableOpacity
                      style={[s.stepBtn, { borderColor: colors.border }]}
                      onPress={() => {
                        updateQuantity(product.id, qty - 1);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <Feather name="minus" size={14} color={colors.foreground} />
                    </TouchableOpacity>
                    <Text style={[s.stepQty, { color: colors.foreground }]}>{qty}</Text>
                    <TouchableOpacity
                      style={[s.stepBtn, { borderColor: colors.border, backgroundColor: colors.primary }]}
                      onPress={() => handleAdd(product)}
                    >
                      <Feather name="plus" size={14} color={colors.primaryForeground} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Cart footer */}
      {itemCount > 0 && (
        <View
          style={[
            s.cartFooter,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
              paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 16),
            },
          ]}
        >
          <View>
            <Text style={[s.cartItems, { color: colors.mutedForeground }]}>
              {itemCount} article{itemCount !== 1 ? "s" : ""}
            </Text>
            <Text style={[s.cartTotal, { color: colors.foreground }]}>{formatDA(total)}</Text>
          </View>
          <TouchableOpacity
            style={[s.checkoutBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/checkout" as any)}
          >
            <Text style={[s.checkoutBtnText, { color: colors.primaryForeground }]}>
              Commander
            </Text>
            <Feather name="arrow-right" size={16} color={colors.primaryForeground} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  emptyText: { fontSize: 15 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerInfo: { flex: 1 },
  restName: { fontSize: 18, fontWeight: "800" as const, letterSpacing: -0.3 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  metaText: { fontSize: 12 },
  openDot: { width: 6, height: 6, borderRadius: 3 },
  warningBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  warningText: { flex: 1, fontSize: 12, color: "#92400E" },
  catBar: { borderBottomWidth: StyleSheet.hairlineWidth, maxHeight: 48 },
  catBarContent: { paddingHorizontal: 16, gap: 4, alignItems: "center" },
  catTab: { paddingHorizontal: 14, paddingVertical: 12 },
  catTabText: { fontSize: 13, fontWeight: "600" as const },
  productCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  productInfo: { flex: 1, gap: 3 },
  productName: { fontSize: 15, fontWeight: "700" as const },
  productDesc: { fontSize: 12, lineHeight: 17 },
  productPrice: { fontSize: 14, fontWeight: "700" as const },
  qtyControl: { alignItems: "center" },
  addBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  stepper: { flexDirection: "row", alignItems: "center", gap: 8 },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stepQty: { fontSize: 15, fontWeight: "700" as const, minWidth: 20, textAlign: "center" as const },
  cartFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cartItems: { fontSize: 12 },
  cartTotal: { fontSize: 18, fontWeight: "800" as const },
  checkoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 14,
  },
  checkoutBtnText: { fontSize: 15, fontWeight: "700" as const },
});
