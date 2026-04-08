import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCart } from "@/context/CartContext";
import { useColors } from "@/hooks/useColors";
import { formatDA } from "@/utils/format";

export default function CheckoutScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { items, restaurantId, restaurantName, total, clearCart } = useCart();
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const deliveryFee = 200;
  const grandTotal = total + deliveryFee;

  const handleOrder = async () => {
    if (!address.trim()) {
      Alert.alert("Adresse requise", "Veuillez saisir votre adresse de livraison.");
      return;
    }
    if (!phone.trim()) {
      Alert.alert("Téléphone requis", "Veuillez saisir votre numéro de téléphone.");
      return;
    }
    if (!restaurantId) {
      Alert.alert("Panier vide", "Votre panier est vide.");
      return;
    }

    setLoading(true);
    try {
      const { AsyncStorage } = await import("@react-native-async-storage/async-storage");
      const token = await AsyncStorage.getItem("tc_token");

      const orderItems = items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.price,
      }));

      const res = await fetch(
        `https://${process.env.EXPO_PUBLIC_DOMAIN}/api/orders`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            restaurantId,
            deliveryAddress: address.trim(),
            deliveryPhone: phone.trim(),
            specialInstructions: notes.trim() || undefined,
            items: orderItems,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur lors de la commande");

      clearCart();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Commande passée ! 🎉",
        "Votre commande a été reçue. Un livreur vous sera assigné sous peu.",
        [
          {
            text: "Suivre ma commande",
            onPress: () => router.replace(`/order/${data.id}` as any),
          },
        ]
      );
    } catch (e: any) {
      Alert.alert("Erreur", e.message ?? "Une erreur est survenue.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <Feather name="shopping-cart" size={48} color={colors.mutedForeground} />
        <Text style={[s.emptyTitle, { color: colors.foreground }]}>Panier vide</Text>
        <TouchableOpacity
          style={[s.backBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.back()}
        >
          <Text style={[s.backBtnText, { color: colors.primaryForeground }]}>
            Retour aux restaurants
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[s.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
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
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.foreground }]}>Commander</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 100 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Restaurant */}
        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={s.cardHeader}>
            <Feather name="shopping-bag" size={16} color={colors.primary} />
            <Text style={[s.cardTitle, { color: colors.foreground }]}>{restaurantName}</Text>
          </View>
          {items.map((item) => (
            <View key={item.productId} style={[s.orderRow, { borderTopColor: colors.border }]}>
              <Text style={[s.orderQty, { color: colors.primary }]}>{item.quantity}x</Text>
              <Text style={[s.orderName, { color: colors.foreground }]} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={[s.orderPrice, { color: colors.mutedForeground }]}>
                {formatDA(item.price * item.quantity)}
              </Text>
            </View>
          ))}
        </View>

        {/* Delivery details */}
        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={s.cardHeader}>
            <Feather name="map-pin" size={16} color={colors.primary} />
            <Text style={[s.cardTitle, { color: colors.foreground }]}>Livraison</Text>
          </View>

          <View style={s.inputGroup}>
            <Text style={[s.label, { color: colors.foreground }]}>Adresse complète *</Text>
            <TextInput
              style={[s.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]}
              placeholder="Rue, quartier, numéro…"
              placeholderTextColor={colors.mutedForeground}
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={2}
            />
          </View>

          <View style={s.inputGroup}>
            <Text style={[s.label, { color: colors.foreground }]}>Téléphone *</Text>
            <TextInput
              style={[s.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]}
              placeholder="+213 5XX XXX XXX"
              placeholderTextColor={colors.mutedForeground}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>

          <View style={s.inputGroup}>
            <Text style={[s.label, { color: colors.foreground }]}>Instructions (optionnel)</Text>
            <TextInput
              style={[s.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]}
              placeholder="Code portail, étage, bâtiment…"
              placeholderTextColor={colors.mutedForeground}
              value={notes}
              onChangeText={setNotes}
            />
          </View>
        </View>

        {/* Summary */}
        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={s.cardHeader}>
            <Feather name="file-text" size={16} color={colors.primary} />
            <Text style={[s.cardTitle, { color: colors.foreground }]}>Récapitulatif</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={[s.summaryLabel, { color: colors.mutedForeground }]}>Sous-total</Text>
            <Text style={[s.summaryValue, { color: colors.foreground }]}>{formatDA(total)}</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={[s.summaryLabel, { color: colors.mutedForeground }]}>Frais de livraison</Text>
            <Text style={[s.summaryValue, { color: colors.foreground }]}>{formatDA(deliveryFee)}</Text>
          </View>
          <View style={[s.summaryRow, s.totalRow, { borderTopColor: colors.border }]}>
            <Text style={[s.totalLabel, { color: colors.foreground }]}>Total</Text>
            <Text style={[s.totalValue, { color: colors.primary }]}>{formatDA(grandTotal)}</Text>
          </View>
        </View>

        {/* Payment */}
        <View style={[s.payCard, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }]}>
          <Feather name="dollar-sign" size={16} color={colors.primary} />
          <Text style={[s.payText, { color: colors.foreground }]}>
            Paiement à la livraison en espèces
          </Text>
        </View>
      </ScrollView>

      {/* CTA */}
      <View
        style={[
          s.cta,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 16),
          },
        ]}
      >
        <TouchableOpacity
          style={[s.orderBtn, { backgroundColor: colors.primary }, loading && s.orderBtnDisabled]}
          onPress={handleOrder}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <>
              <Text style={[s.orderBtnText, { color: colors.primaryForeground }]}>
                Passer la commande
              </Text>
              <Text style={[s.orderBtnAmount, { color: colors.primaryForeground }]}>
                {formatDA(grandTotal)}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 32 },
  emptyTitle: { fontSize: 20, fontWeight: "700" as const },
  backBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  backBtnText: { fontWeight: "700" as const },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 17, fontWeight: "700" as const },
  card: { borderRadius: 14, borderWidth: 1, overflow: "hidden" as const },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
    paddingBottom: 10,
  },
  cardTitle: { fontSize: 15, fontWeight: "700" as const },
  orderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  orderQty: { fontSize: 13, fontWeight: "700" as const, width: 24 },
  orderName: { flex: 1, fontSize: 14 },
  orderPrice: { fontSize: 13, fontWeight: "600" as const },
  inputGroup: { paddingHorizontal: 14, paddingBottom: 12 },
  label: { fontSize: 12, fontWeight: "600" as const, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 44,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 8 },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 14, fontWeight: "600" as const },
  totalRow: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, paddingBottom: 14 },
  totalLabel: { fontSize: 16, fontWeight: "700" as const },
  totalValue: { fontSize: 18, fontWeight: "800" as const },
  payCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  payText: { fontSize: 14, fontWeight: "600" as const },
  cta: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  orderBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 54,
    borderRadius: 14,
    paddingHorizontal: 20,
  },
  orderBtnDisabled: { opacity: 0.6 },
  orderBtnText: { fontSize: 16, fontWeight: "700" as const },
  orderBtnAmount: { fontSize: 16, fontWeight: "800" as const },
});
