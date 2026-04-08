import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { Linking } from "react-native";
import React, { useState, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useColors } from "@/hooks/useColors";
import { useListRestaurants, useListOrders, useGetAvailableMissions, useAcceptMission, useRejectMission, useGetDriverStats } from "@workspace/api-client-react";
import { formatDA, getStatusLabel, getStatusColor } from "@/utils/format";
import { useQueryClient } from "@tanstack/react-query";

const CATEGORIES = [
  "Tous", "Fast Food", "Pizza", "Algérien",
  "Méditerranéen", "Grillades", "Sandwichs", "Desserts",
];

function RestaurantCard({ restaurant, colors }: { restaurant: any; colors: any }) {
  return (
    <TouchableOpacity
      style={[styles.restCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => router.push(`/restaurant/${restaurant.id}` as any)}
      activeOpacity={0.85}
    >
      <View style={[styles.restImage, { backgroundColor: colors.muted }]}>
        {restaurant.coverUrl ? null : (
          <Feather name="coffee" size={32} color={colors.mutedForeground} />
        )}
        <View style={[styles.statusBadge, { backgroundColor: restaurant.isOpen ? "#22C55E" : "#6B7280" }]}>
          <Text style={styles.statusBadgeText}>{restaurant.isOpen ? "Ouvert" : "Fermé"}</Text>
        </View>
      </View>
      <View style={styles.restInfo}>
        <Text style={[styles.restName, { color: colors.foreground }]} numberOfLines={1}>
          {restaurant.name}
        </Text>
        {restaurant.description ? (
          <Text style={[styles.restDesc, { color: colors.mutedForeground }]} numberOfLines={1}>
            {restaurant.description}
          </Text>
        ) : null}
        <View style={styles.restMeta}>
          <View style={styles.restMetaItem}>
            <Feather name="clock" size={12} color={colors.mutedForeground} />
            <Text style={[styles.restMetaText, { color: colors.mutedForeground }]}>
              {restaurant.estimatedPrepTime} min
            </Text>
          </View>
          {restaurant.avgRating > 0 && (
            <View style={styles.restMetaItem}>
              <Ionicons name="star" size={12} color="#F59E0B" />
              <Text style={[styles.restMetaText, { color: colors.mutedForeground }]}>
                {Number(restaurant.avgRating).toFixed(1)}
              </Text>
            </View>
          )}
          {restaurant.category ? (
            <View style={[styles.catChip, { backgroundColor: `${colors.primary}20` }]}>
              <Text style={[styles.catChipText, { color: colors.primary }]}>{restaurant.category}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function DriverHome({ colors, insets }: { colors: any; insets: any }) {
  const [isOnline, setIsOnline] = useState<boolean | null>(null); // null = loading from server
  const [toggling, setToggling] = useState(false);
  const qc = useQueryClient();

  // Load initial online status from server
  const { data: driverStats, isError: statsError } = useGetDriverStats({ query: { staleTime: 0 } });
  useEffect(() => {
    if (driverStats && isOnline === null) {
      setIsOnline((driverStats as any).isOnline ?? false);
    }
  }, [driverStats]);
  // Fallback: if stats API fails, default to offline to unblock the spinner
  useEffect(() => {
    if (statsError && isOnline === null) setIsOnline(false);
  }, [statsError, isOnline]);

  // Available missions: orders in dispatch that specifically notified this driver
  const { data: availableMissions = [], isLoading: loadingAvailable, refetch: refetchAvailable } = useGetAvailableMissions({
    query: {
      refetchInterval: isOnline ? 2000 : 0,
      enabled: isOnline === true,
    },
  });

  // Active missions: orders already assigned to this driver
  const { data: activeData, isLoading: loadingActive, refetch: refetchActive } = useListOrders(
    {} as any,
    { query: { refetchInterval: isOnline ? 2000 : 0, enabled: isOnline === true } }
  );
  const activeOrders = ((activeData as any)?.orders ?? []).filter((o: any) =>
    ["driver_assigned", "awaiting_customer_confirmation", "confirmed_for_preparation",
     "preparing", "ready_for_pickup", "picked_up", "on_the_way", "arriving_soon"].includes(o.status)
  );

  // Track status changes and show in-app notifications
  const prevStatuses = useRef<Record<number, string>>({});
  const STATUS_ALERTS: Record<string, { title: string; body: string }> = {
    preparing:        { title: "🍳 Le restaurant prépare !", body: "La cuisine a commencé votre commande. Préparez-vous à partir." },
    ready_for_pickup: { title: "📦 Commande prête !", body: "Rendez-vous au restaurant pour récupérer la commande." },
    confirmed_for_preparation: { title: "✅ Adresse confirmée", body: "La commande va être préparée. Restez disponible." },
    awaiting_customer_confirmation: { title: "📞 Confirmation en attente", body: "Appelez le client pour confirmer son adresse." },
  };

  useEffect(() => {
    for (const order of activeOrders) {
      const prev = prevStatuses.current[order.id];
      if (prev && prev !== order.status) {
        const alert = STATUS_ALERTS[order.status];
        if (alert) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert(alert.title, `${alert.body}\n\nCommande #${order.id}`);
        }
      }
      prevStatuses.current[order.id] = order.status;
    }
  }, [activeOrders]);

  const accept = useAcceptMission();
  const reject = useRejectMission();

  const missions = availableMissions as any[];
  const isLoading = loadingAvailable || loadingActive;

  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

  const refetchAll = () => { refetchAvailable(); refetchActive(); };

  const handleCancelMission = (orderId: number, orderNumber: string) => {
    Alert.alert(
      "Annuler la mission ?",
      `La commande ${orderNumber} sera remise en attente et un autre livreur sera contacté.`,
      [
        { text: "Non, continuer", style: "cancel" },
        {
          text: "Oui, annuler",
          style: "destructive",
          onPress: async () => {
            setCancellingId(orderId);
            try {
              const { default: AsyncStorage } = await import("@react-native-async-storage/async-storage");
              const token = await AsyncStorage.getItem("tc_token");
              const res = await fetch(
                `https://${process.env.EXPO_PUBLIC_DOMAIN}/api/driver/missions/${orderId}/cancel`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                  body: JSON.stringify({ reason: "Annulé par le livreur" }),
                }
              );
              if (res.ok) {
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                refetchAll();
              } else {
                const err = await res.json();
                Alert.alert("Impossible d'annuler", err.error ?? "Erreur inconnue");
              }
            } catch {
              Alert.alert("Erreur réseau", "Vérifiez votre connexion et réessayez.");
            }
            setCancellingId(null);
          },
        },
      ]
    );
  };

  const apiCall = async (path: string, body?: object) => {
    const { default: AsyncStorage } = await import("@react-native-async-storage/async-storage");
    const token = await AsyncStorage.getItem("tc_token");
    return fetch(`https://${process.env.EXPO_PUBLIC_DOMAIN}/api${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: body ? JSON.stringify(body) : undefined,
    });
  };

  const handleStartConfirmation = async (orderId: number) => {
    setConfirmingId(orderId);
    try {
      const res = await apiCall(`/driver/missions/${orderId}/start-confirmation`);
      if (res.ok) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        refetchAll();
      } else {
        const err = await res.json();
        Alert.alert("Erreur", err.error ?? "Impossible de changer le statut");
      }
    } catch {
      Alert.alert("Erreur réseau", "Vérifiez votre connexion.");
    } finally {
      setConfirmingId(null);
    }
  };

  const handleDriverConfirm = async (orderId: number, result: "confirmed" | "needs_correction" | "failed") => {
    setConfirmingId(orderId);
    try {
      const res = await apiCall(`/driver/confirm/${orderId}`, { result });
      if (res.ok) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        refetchAll();
      } else {
        const err = await res.json();
        Alert.alert("Erreur", err.error ?? "Impossible de confirmer");
      }
    } catch {
      Alert.alert("Erreur réseau", "Vérifiez votre connexion.");
    } finally {
      setConfirmingId(null);
    }
  };

  const handleAccept = async (orderId: number) => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    accept.mutate(
      { orderId },
      {
        onSuccess: () => { refetchAll(); },
        onError: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
      }
    );
  };

  const handleReject = async (orderId: number) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    reject.mutate({ orderId }, { onSuccess: refetchAll });
  };

  const toggleOnline = async (value: boolean) => {
    setToggling(true);
    try {
      const { default: AsyncStorage } = await import("@react-native-async-storage/async-storage");
      const token = await AsyncStorage.getItem("tc_token");
      const res = await fetch(
        `https://${process.env.EXPO_PUBLIC_DOMAIN}/api/driver/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ isOnline: value }),
        }
      );
      if (res.ok) {
        setIsOnline(value);
        await Haptics.notificationAsync(
          value ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
        );
        if (value) refetchAll();
      }
    } catch {}
    setToggling(false);
  };

  // Still loading initial status
  if (isOnline === null) {
    return (
      <View style={[ds.flex, ds.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[ds.flex, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[ds.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16), backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={ds.headerLeft}>
          <View style={[ds.statusDot, { backgroundColor: isOnline ? "#22C55E" : "#6B7280" }]} />
          <Text style={[ds.headerTitle, { color: colors.foreground }]}>Mes missions</Text>
        </View>
        <View style={ds.headerRight}>
          {!toggling ? (
            <Switch
              value={isOnline}
              onValueChange={toggleOnline}
              trackColor={{ false: colors.border, true: "#22C55E" }}
              thumbColor="#fff"
              ios_backgroundColor={colors.border}
            />
          ) : (
            <ActivityIndicator size="small" color={colors.primary} />
          )}
        </View>
      </View>

      {/* Status banner */}
      <View style={[ds.statusBanner, { backgroundColor: isOnline ? "#F0FDF4" : colors.muted, borderBottomColor: isOnline ? "#BBF7D0" : colors.border }]}>
        <Ionicons name={isOnline ? "radio-button-on" : "radio-button-off"} size={14} color={isOnline ? "#16A34A" : colors.mutedForeground} />
        <Text style={[ds.statusBannerText, { color: isOnline ? "#15803D" : colors.mutedForeground }]}>
          {isOnline ? "Vous êtes en ligne — les missions arrivent automatiquement" : "Vous êtes hors ligne — activez pour recevoir des missions"}
        </Text>
      </View>

      {/* Content */}
      {!isOnline ? (
        <View style={ds.offlineState}>
          <View style={[ds.offlineIconBox, { backgroundColor: colors.muted }]}>
            <Ionicons name="bicycle-outline" size={48} color={colors.mutedForeground} />
          </View>
          <Text style={[ds.emptyTitle, { color: colors.foreground }]}>Hors ligne</Text>
          <Text style={[ds.emptyDesc, { color: colors.mutedForeground }]}>
            Activez le mode en ligne pour commencer à recevoir des missions.
          </Text>
          <TouchableOpacity style={[ds.goOnlineBtn, { backgroundColor: "#22C55E" }]} onPress={() => toggleOnline(true)} disabled={toggling}>
            {toggling ? <ActivityIndicator color="#fff" /> : <><Ionicons name="power" size={18} color="#fff" /><Text style={ds.goOnlineBtnText}>Passer en ligne</Text></>}
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80 }}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetchAll} tintColor={colors.primary} />}
        >
          {/* ===== Available missions (pending acceptance) ===== */}
          {missions.length > 0 && (
            <View style={{ marginBottom: 24 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#F59E0B" }} />
                <Text style={{ fontSize: 14, fontWeight: "700", color: colors.foreground }}>
                  Nouvelle mission — Acceptez vite ! ({missions.length})
                </Text>
              </View>
              {missions.map((m: any) => (
                <View key={m.orderId} style={[ds.missionCard, { backgroundColor: "#FFFBEB", borderColor: "#FCD34D" }]}>
                  {/* Header: restaurant name + badge gain */}
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <Text style={{ fontSize: 15, fontWeight: "800", color: colors.foreground }} numberOfLines={1}>
                      {m.restaurantName}
                    </Text>
                    <View style={{ backgroundColor: "#F0A000", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                      <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>
                        +{formatDA(m.estimatedEarnings)}
                      </Text>
                    </View>
                  </View>

                  {/* A → B route visual */}
                  <View style={{ backgroundColor: "#fff", borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: "#FDE68A" }}>
                    {/* Point A — Restaurant */}
                    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                      <View style={{ alignItems: "center", width: 22 }}>
                        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "#F59E0B", alignItems: "center", justifyContent: "center" }}>
                          <Text style={{ color: "#fff", fontSize: 11, fontWeight: "900" }}>A</Text>
                        </View>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 10, color: "#9CA3AF", fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 }}>Restaurant</Text>
                        <Text style={{ fontSize: 13, fontWeight: "600", color: "#1F2937", marginTop: 1 }} numberOfLines={2}>
                          {m.restaurantAddress && m.restaurantAddress !== "N/A" ? m.restaurantAddress : m.restaurantName}
                        </Text>
                      </View>
                    </View>

                    {/* Dashed connector */}
                    <View style={{ flexDirection: "row", marginVertical: 4 }}>
                      <View style={{ width: 22, alignItems: "center" }}>
                        <View style={{ width: 2, height: 18, borderStyle: "dashed", borderWidth: 1, borderColor: "#D1D5DB" }} />
                      </View>
                    </View>

                    {/* Point B — Client */}
                    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                      <View style={{ alignItems: "center", width: 22 }}>
                        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "#22C55E", alignItems: "center", justifyContent: "center" }}>
                          <Text style={{ color: "#fff", fontSize: 11, fontWeight: "900" }}>B</Text>
                        </View>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 10, color: "#9CA3AF", fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 }}>Client</Text>
                        <Text style={{ fontSize: 13, fontWeight: "600", color: "#1F2937", marginTop: 1 }} numberOfLines={2}>
                          {m.deliveryAddress ?? "Adresse non spécifiée"}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <TouchableOpacity
                      style={{ flex: 1, backgroundColor: "#EF4444", borderRadius: 10, paddingVertical: 10, alignItems: "center" }}
                      onPress={() => handleReject(m.orderId)}
                      disabled={reject.isPending}
                    >
                      <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>Refuser</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ flex: 2, backgroundColor: "#22C55E", borderRadius: 10, paddingVertical: 10, alignItems: "center" }}
                      onPress={() => handleAccept(m.orderId)}
                      disabled={accept.isPending}
                    >
                      {accept.isPending ? <ActivityIndicator color="#fff" size="small" /> : (
                        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>✓ Accepter</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* ===== Active missions (already accepted) ===== */}
          {activeOrders.length > 0 && (
            <View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#22C55E" }} />
                <Text style={{ fontSize: 14, fontWeight: "700", color: colors.foreground }}>
                  En cours ({activeOrders.length})
                </Text>
              </View>
              {activeOrders.map((item: any) => {
                const cancellableDriverStatuses = ["driver_assigned", "awaiting_customer_confirmation", "needs_update", "confirmation_failed"];
                const canCancel = cancellableDriverStatuses.includes(item.status);

                // Determine next step instructions based on status
                const beforePickup = ["driver_assigned", "awaiting_customer_confirmation", "confirmed_for_preparation", "preparing", "ready_for_pickup"].includes(item.status);
                const afterPickup = ["picked_up", "on_the_way", "arriving_soon"].includes(item.status);

                const nextStepMap: Record<string, string> = {
                  driver_assigned: "📍 Confirmez l'adresse client, puis allez au restaurant",
                  awaiting_customer_confirmation: "⏳ En attente de confirmation de l'adresse client...",
                  confirmed_for_preparation: "🍳 Le restaurant prépare — rendez-vous au restaurant",
                  preparing: "🍳 Le restaurant prépare — rendez-vous au restaurant",
                  ready_for_pickup: "🛍️ Commande prête ! Allez récupérer au restaurant",
                  picked_up: "🛵 Commande récupérée — livrez chez le client",
                  on_the_way: "🛵 En route — livrez chez le client",
                  arriving_soon: "📍 Vous êtes presque arrivé chez le client !",
                };
                const nextStep = nextStepMap[item.status];

                const openMaps = (address: string) => {
                  const encoded = encodeURIComponent(address + ", Algérie");
                  const url = Platform.OS === "ios"
                    ? `maps:?q=${encoded}`
                    : `geo:0,0?q=${encoded}`;
                  Linking.openURL(url).catch(() =>
                    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encoded}`)
                  );
                };

                return (
                  <View key={item.id} style={[ds.missionCard, { backgroundColor: colors.card, borderColor: colors.border, padding: 0, overflow: "hidden" }]}>
                    <TouchableOpacity
                      style={{ padding: 14 }}
                      onPress={() => router.push(`/order/${item.id}` as any)}
                      activeOpacity={0.85}
                    >
                      <View style={[ds.missionStatus, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
                        <Text style={[ds.missionStatusText, { color: getStatusColor(item.status) }]}>
                          {getStatusLabel(item.status)}
                        </Text>
                      </View>
                      <Text style={[ds.missionRestaurant, { color: colors.foreground }]}>
                        {item.restaurantName ?? `Commande #${item.id}`}
                      </Text>
                      {nextStep && (
                        <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 4, marginBottom: 6 }}>
                          {nextStep}
                        </Text>
                      )}
                      <View style={ds.missionFooter}>
                        <Text style={[ds.missionAmount, { color: colors.primary }]}>{formatDA(item.total)}</Text>
                        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                      </View>
                    </TouchableOpacity>

                    {/* Navigation + Call buttons */}
                    {(beforePickup || afterPickup || item.deliveryPhone) && (
                      <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: colors.border }}>
                        {beforePickup && item.restaurantAddress && (
                          <TouchableOpacity
                            style={{ flex: 1, paddingVertical: 11, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6, backgroundColor: "#EFF6FF" }}
                            onPress={() => openMaps(item.restaurantAddress)}
                          >
                            <Ionicons name="navigate" size={14} color="#2563EB" />
                            <Text style={{ color: "#2563EB", fontSize: 13, fontWeight: "600" }}>Restaurant</Text>
                          </TouchableOpacity>
                        )}
                        {afterPickup && item.deliveryAddress && (
                          <TouchableOpacity
                            style={{ flex: 1, paddingVertical: 11, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6, backgroundColor: "#F0FDF4" }}
                            onPress={() => openMaps(item.deliveryAddress)}
                          >
                            <Ionicons name="navigate" size={14} color="#16A34A" />
                            <Text style={{ color: "#16A34A", fontSize: 13, fontWeight: "600" }}>Client</Text>
                          </TouchableOpacity>
                        )}
                        {/* Call customer button */}
                        {item.deliveryPhone ? (
                          <TouchableOpacity
                            style={{ flex: 1, paddingVertical: 11, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6, backgroundColor: "#F0FDF4", borderLeftWidth: (beforePickup && item.restaurantAddress) || (afterPickup && item.deliveryAddress) ? 1 : 0, borderLeftColor: colors.border }}
                            onPress={() => {
                              Alert.alert(
                                "Appeler le client",
                                `📞  ${item.deliveryPhone}`,
                                [
                                  { text: "Annuler", style: "cancel" },
                                  {
                                    text: "Appeler",
                                    onPress: () => Linking.openURL(`tel:${item.deliveryPhone}`),
                                  },
                                ]
                              );
                            }}
                          >
                            <Ionicons name="call" size={14} color="#16A34A" />
                            <Text style={{ color: "#16A34A", fontSize: 13, fontWeight: "600" }}>Appeler</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    )}

                    {/* Step 1: driver_assigned → tap to "I'm going to restaurant & will call customer" */}
                    {item.status === "driver_assigned" && (
                      <TouchableOpacity
                        style={{ borderTopWidth: 1, borderTopColor: "#FCD34D", paddingVertical: 13, alignItems: "center", backgroundColor: "#FFFBEB", flexDirection: "row", justifyContent: "center", gap: 8 }}
                        onPress={() => handleStartConfirmation(item.id)}
                        disabled={confirmingId === item.id}
                      >
                        {confirmingId === item.id ? (
                          <ActivityIndicator size="small" color="#D97706" />
                        ) : (
                          <>
                            <Ionicons name="call-outline" size={16} color="#D97706" />
                            <Text style={{ color: "#D97706", fontSize: 14, fontWeight: "700" }}>
                              Je pars au restaurant — Confirmer avec le client
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}

                    {/* Step 2: awaiting_customer_confirmation → driver called customer, confirm result */}
                    {item.status === "awaiting_customer_confirmation" && (
                      <View style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
                        <Text style={{ textAlign: "center", fontSize: 12, color: "#6B7280", paddingTop: 10, paddingHorizontal: 14 }}>
                          Avez-vous joint et confirmé l'adresse avec le client ?
                        </Text>
                        <View style={{ flexDirection: "row" }}>
                          <TouchableOpacity
                            style={{ flex: 1, paddingVertical: 12, alignItems: "center", backgroundColor: "#F0FDF4", borderRightWidth: 1, borderRightColor: colors.border }}
                            onPress={() => handleDriverConfirm(item.id, "confirmed")}
                            disabled={confirmingId === item.id}
                          >
                            {confirmingId === item.id ? (
                              <ActivityIndicator size="small" color="#16A34A" />
                            ) : (
                              <Text style={{ color: "#16A34A", fontSize: 13, fontWeight: "700" }}>✓ Confirmé</Text>
                            )}
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={{ flex: 1, paddingVertical: 12, alignItems: "center", backgroundColor: "#FEF2F2" }}
                            onPress={() => handleDriverConfirm(item.id, "failed")}
                            disabled={confirmingId === item.id}
                          >
                            <Text style={{ color: "#EF4444", fontSize: 13, fontWeight: "700" }}>✕ Injoignable</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {canCancel && item.status !== "driver_assigned" && item.status !== "awaiting_customer_confirmation" && (
                      <TouchableOpacity
                        style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: 10, alignItems: "center", backgroundColor: "#FEF2F2" }}
                        onPress={() => handleCancelMission(item.id, item.orderNumber ?? `#${item.id}`)}
                        disabled={cancellingId === item.id}
                      >
                        {cancellingId === item.id ? (
                          <ActivityIndicator size="small" color="#EF4444" />
                        ) : (
                          <Text style={{ color: "#EF4444", fontSize: 13, fontWeight: "600" }}>
                            ✕ Annuler cette mission
                          </Text>
                        )}
                      </TouchableOpacity>
                    )}

                    {canCancel && (item.status === "driver_assigned" || item.status === "awaiting_customer_confirmation") && (
                      <TouchableOpacity
                        style={{ paddingVertical: 9, alignItems: "center" }}
                        onPress={() => handleCancelMission(item.id, item.orderNumber ?? `#${item.id}`)}
                        disabled={cancellingId === item.id}
                      >
                        {cancellingId === item.id ? (
                          <ActivityIndicator size="small" color="#9CA3AF" />
                        ) : (
                          <Text style={{ color: "#9CA3AF", fontSize: 12 }}>
                            Annuler la mission
                          </Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* Empty state */}
          {missions.length === 0 && activeOrders.length === 0 && !isLoading && (
            <View style={[ds.emptyState, { paddingTop: 60 }]}>
              <Ionicons name="bicycle-outline" size={52} color={colors.mutedForeground} />
              <Text style={[ds.emptyTitle, { color: colors.foreground }]}>Aucune mission active</Text>
              <Text style={[ds.emptyDesc, { color: colors.mutedForeground }]}>
                Les nouvelles missions apparaîtront ici automatiquement
              </Text>
              <TouchableOpacity onPress={refetchAll} style={[ds.refreshBtn, { borderColor: colors.border }]}>
                <Feather name="refresh-cw" size={14} color={colors.mutedForeground} />
                <Text style={[ds.refreshBtnText, { color: colors.mutedForeground }]}>Actualiser</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { itemCount } = useCart();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Tous");

  const { data: restaurants, isLoading, refetch } = useListRestaurants(
    { status: "approved" } as any,
    { query: { staleTime: 30000 } }
  );

  if (user?.role === "driver") {
    return <DriverHome colors={colors} insets={insets} />;
  }

  const all = (restaurants as any[]) ?? [];
  const filtered = all.filter((r: any) => {
    const matchSearch =
      !search ||
      r.name?.toLowerCase().includes(search.toLowerCase()) ||
      (r.category ?? "").toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "Tous" || r.category === category;
    return matchSearch && matchCat;
  });

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16),
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
              Bonjour {user?.name?.split(" ")[0] ?? "👋"}
            </Text>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              Que voulez-vous manger ?
            </Text>
          </View>
          {itemCount > 0 && (
            <TouchableOpacity
              style={[styles.cartBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push("/checkout" as any)}
            >
              <Feather name="shopping-cart" size={18} color={colors.primaryForeground} />
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{itemCount}</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Search */}
        <View style={[styles.searchBar, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Rechercher un restaurant…"
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Feather name="x" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        {/* Categories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catScroll}
        >
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat}
              style={[
                styles.catBtn,
                {
                  backgroundColor: category === cat ? colors.primary : colors.background,
                  borderColor: category === cat ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setCategory(cat)}
            >
              <Text
                style={[
                  styles.catBtnText,
                  { color: category === cat ? colors.primaryForeground : colors.foreground },
                ]}
              >
                {cat}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Restaurant list */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Feather name="search" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Aucun restaurant trouvé
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item: any) => String(item.id)}
          contentContainerStyle={{
            padding: 16,
            gap: 12,
            paddingBottom: insets.bottom + 80,
          }}
          scrollEnabled={!!filtered.length}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />
          }
          renderItem={({ item }) => (
            <RestaurantCard restaurant={item} colors={colors} />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16, paddingBottom: 12 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  greeting: { fontSize: 13 },
  headerTitle: { fontSize: 20, fontWeight: "800" as const, letterSpacing: -0.3 },
  cartBtn: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  cartBadge: {
    position: "absolute", top: -4, right: -4,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: "#EF4444",
    alignItems: "center", justifyContent: "center",
  },
  cartBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" as const },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 14 },
  catScroll: { gap: 8, paddingBottom: 2 },
  catBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  catBtnText: { fontSize: 12, fontWeight: "600" as const },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: { fontSize: 15 },
  restCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden" as const,
  },
  restImage: {
    height: 160,
    alignItems: "center",
    justifyContent: "center",
    position: "relative" as const,
  },
  statusBadge: {
    position: "absolute" as const,
    top: 10,
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" as const },
  restInfo: { padding: 12 },
  restName: { fontSize: 16, fontWeight: "700" as const, marginBottom: 2 },
  restDesc: { fontSize: 12, marginBottom: 8 },
  restMeta: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" as const },
  restMetaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  restMetaText: { fontSize: 12 },
  catChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  catChipText: { fontSize: 11, fontWeight: "600" as const },
});

const ds = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerTitle: { fontSize: 22, fontWeight: "800" as const },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statusBannerText: { flex: 1, fontSize: 12, lineHeight: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  offlineState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
    gap: 12,
  },
  offlineIconBox: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  goOnlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 30,
    marginTop: 8,
  },
  goOnlineBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" as const },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: "700" as const, textAlign: "center" as const },
  emptyDesc: { fontSize: 14, textAlign: "center" as const, lineHeight: 20 },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 4,
  },
  refreshBtnText: { fontSize: 13 },
  missionCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    gap: 6,
  },
  missionStatus: { alignSelf: "flex-start" as const, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  missionStatusText: { fontSize: 11, fontWeight: "700" as const },
  missionRestaurant: { fontSize: 16, fontWeight: "700" as const },
  missionAddress: { fontSize: 13 },
  missionFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  missionAmount: { fontSize: 15, fontWeight: "700" as const },
});
