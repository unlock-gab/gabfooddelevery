import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
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

const BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

type City = { id: number; name: string; nameAr?: string | null };
type Zone = { id: number; name: string; nameAr?: string | null; deliveryFee?: number | null; estimatedMinutes?: number | null };

function PickerModal<T extends { id: number; name: string; nameAr?: string | null }>({
  visible,
  title,
  items,
  selectedId,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  items: T[];
  selectedId: number | null;
  onSelect: (item: T) => void;
  onClose: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={onClose} />
      <View style={[s.modalSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 8 }]}>
        <View style={[s.modalHandle, { backgroundColor: colors.border }]} />
        <Text style={[s.modalTitle, { color: colors.foreground }]}>{title}</Text>
        <FlatList
          data={items}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                s.modalItem,
                { borderBottomColor: colors.border },
                selectedId === item.id && { backgroundColor: `${colors.primary}12` },
              ]}
              onPress={() => { onSelect(item); onClose(); }}
            >
              <Text style={[s.modalItemText, { color: colors.foreground }]}>{item.name}</Text>
              {item.nameAr ? (
                <Text style={[s.modalItemSub, { color: colors.mutedForeground }]}>{item.nameAr}</Text>
              ) : null}
              {selectedId === item.id && (
                <Feather name="check" size={18} color={colors.primary} />
              )}
            </TouchableOpacity>
          )}
        />
      </View>
    </Modal>
  );
}

export default function CheckoutScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { items, restaurantId, restaurantName, total, clearCart } = useCart();

  const [cities, setCities] = useState<City[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [cityModal, setCityModal] = useState(false);
  const [zoneModal, setZoneModal] = useState(false);
  const [loadingZones, setLoadingZones] = useState(false);

  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  const fetchGPS = async () => {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission refusée",
          "Activez la localisation dans les paramètres de votre appareil pour utiliser le GPS."
        );
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const [geo] = await Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      if (geo) {
        const parts = [
          geo.streetNumber,
          geo.street,
          geo.district ?? geo.subregion,
          geo.city,
        ].filter(Boolean);
        setAddress(parts.join(", "));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert("GPS", "Impossible de convertir votre position en adresse.");
      }
    } catch {
      Alert.alert("GPS", "Erreur lors de la récupération de votre position.");
    } finally {
      setGpsLoading(false);
    }
  };

  const deliveryFee = selectedZone?.deliveryFee ? Number(selectedZone.deliveryFee) : 350;
  const grandTotal = total + deliveryFee;

  useEffect(() => {
    fetch(`${BASE}/api/cities`)
      .then((r) => r.json())
      .then((data) => setCities(Array.isArray(data) ? data.filter((c: City) => c) : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedCity) { setZones([]); setSelectedZone(null); return; }
    setLoadingZones(true);
    setSelectedZone(null);
    fetch(`${BASE}/api/cities/${selectedCity.id}/zones`)
      .then((r) => r.json())
      .then((data) => setZones(Array.isArray(data) ? data.filter((z: Zone) => z) : []))
      .catch(() => setZones([]))
      .finally(() => setLoadingZones(false));
  }, [selectedCity]);

  const handleOrder = async () => {
    if (!selectedZone) {
      Alert.alert("Zone requise", "Veuillez sélectionner votre zone de livraison.");
      return;
    }
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

      const res = await fetch(`${BASE}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          restaurantId,
          zoneId: selectedZone.id,
          deliveryAddress: address.trim(),
          deliveryPhone: phone.trim(),
          specialInstructions: notes.trim() || undefined,
          items: orderItems,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur lors de la commande");

      clearCart();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Commande passée ! 🎉",
        "Votre commande a été reçue. Un livreur vous sera assigné sous peu.",
        [{ text: "Suivre ma commande", onPress: () => router.replace(`/order/${data.id}` as any) }]
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
        <TouchableOpacity style={[s.backBtn, { backgroundColor: colors.primary }]} onPress={() => router.back()}>
          <Text style={[s.backBtnText, { color: colors.primaryForeground }]}>Retour aux restaurants</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const SelectRow = ({
    label,
    value,
    placeholder,
    onPress,
    required,
    disabled,
    loading: spin,
  }: {
    label: string;
    value?: string;
    placeholder: string;
    onPress: () => void;
    required?: boolean;
    disabled?: boolean;
    loading?: boolean;
  }) => (
    <View style={s.inputGroup}>
      <Text style={[s.label, { color: colors.foreground }]}>
        {label}{required ? " *" : ""}
      </Text>
      <TouchableOpacity
        style={[
          s.selectBtn,
          {
            borderColor: !value ? colors.border : colors.primary,
            backgroundColor: colors.background,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
      >
        {spin ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Text style={[s.selectText, { color: value ? colors.foreground : colors.mutedForeground }]} numberOfLines={1}>
            {value ?? placeholder}
          </Text>
        )}
        <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      <PickerModal
        visible={cityModal}
        title="Choisir une ville"
        items={cities}
        selectedId={selectedCity?.id ?? null}
        onSelect={(c) => setSelectedCity(c)}
        onClose={() => setCityModal(false)}
      />
      <PickerModal
        visible={zoneModal}
        title="Choisir une zone de livraison"
        items={zones}
        selectedId={selectedZone?.id ?? null}
        onSelect={(z) => setSelectedZone(z as Zone)}
        onClose={() => setZoneModal(false)}
      />

      <KeyboardAvoidingView
        style={[s.flex, { backgroundColor: colors.background }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
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
          {/* Restaurant items */}
          <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={s.cardHeader}>
              <Feather name="shopping-bag" size={16} color={colors.primary} />
              <Text style={[s.cardTitle, { color: colors.foreground }]}>{restaurantName}</Text>
            </View>
            {items.map((item) => (
              <View key={item.productId} style={[s.orderRow, { borderTopColor: colors.border }]}>
                <Text style={[s.orderQty, { color: colors.primary }]}>{item.quantity}x</Text>
                <Text style={[s.orderName, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
                <Text style={[s.orderPrice, { color: colors.mutedForeground }]}>{formatDA(item.price * item.quantity)}</Text>
              </View>
            ))}
          </View>

          {/* Delivery details */}
          <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={s.cardHeader}>
              <Feather name="map-pin" size={16} color={colors.primary} />
              <Text style={[s.cardTitle, { color: colors.foreground }]}>Adresse de livraison</Text>
            </View>

            <SelectRow
              label="Ville"
              value={selectedCity?.name}
              placeholder="Sélectionner une ville…"
              onPress={() => setCityModal(true)}
              required
            />

            <SelectRow
              label="Zone de livraison"
              value={selectedZone?.name}
              placeholder={selectedCity ? "Sélectionner une zone…" : "Choisir une ville d'abord"}
              onPress={() => setZoneModal(true)}
              required
              disabled={!selectedCity || loadingZones}
              loading={loadingZones}
            />

            {selectedZone?.estimatedMinutes ? (
              <View style={[s.zoneBadge, { backgroundColor: `${colors.primary}12`, marginHorizontal: 14, marginBottom: 10 }]}>
                <Feather name="clock" size={12} color={colors.primary} />
                <Text style={[s.zoneBadgeText, { color: colors.primary }]}>
                  Livraison estimée : ~{selectedZone.estimatedMinutes} min — {formatDA(deliveryFee)}
                </Text>
              </View>
            ) : null}

            <View style={s.inputGroup}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <Text style={[s.label, { color: colors.foreground, marginBottom: 0 }]}>Adresse *</Text>
                <TouchableOpacity
                  style={[s.gpsBtn, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }]}
                  onPress={fetchGPS}
                  disabled={gpsLoading}
                  activeOpacity={0.7}
                >
                  {gpsLoading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <Feather name="navigation" size={12} color={colors.primary} />
                      <Text style={[s.gpsBtnText, { color: colors.primary }]}>Ma position GPS</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
              <TextInput
                style={[
                  s.input,
                  { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background },
                ]}
                placeholder="Rue, quartier, numéro de bâtiment…"
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
                style={[
                  s.input,
                  { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background },
                ]}
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
                style={[
                  s.input,
                  { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background },
                ]}
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
            <Text style={[s.payText, { color: colors.foreground }]}>Paiement à la livraison en espèces</Text>
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
                <Text style={[s.orderBtnText, { color: colors.primaryForeground }]}>Passer la commande</Text>
                <Text style={[s.orderBtnAmount, { color: colors.primaryForeground }]}>{formatDA(grandTotal)}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
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
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, paddingBottom: 10 },
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
  selectBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
  },
  selectText: { fontSize: 14, flex: 1 },
  zoneBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  zoneBadgeText: { fontSize: 12, fontWeight: "600" as const },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 8 },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 14, fontWeight: "600" as const },
  totalRow: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, paddingBottom: 14 },
  totalLabel: { fontSize: 16, fontWeight: "700" as const },
  totalValue: { fontSize: 18, fontWeight: "800" as const },
  payCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1 },
  payText: { fontSize: 14, fontWeight: "600" as const },
  gpsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  gpsBtnText: { fontSize: 12, fontWeight: "600" as const },
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
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "60%",
    paddingTop: 12,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: "700" as const, paddingHorizontal: 20, paddingBottom: 12 },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  modalItemText: { flex: 1, fontSize: 15, fontWeight: "600" as const },
  modalItemSub: { fontSize: 13 },
});
