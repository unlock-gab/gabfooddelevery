import { Feather, Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useGetOrder } from "@workspace/api-client-react";
import { formatDA, formatDate, getStatusLabel, getStatusColor } from "@/utils/format";

const ORDER_STEPS = [
  { key: "pending_dispatch", label: "Commande reçue" },
  { key: "driver_assigned", label: "Livreur assigné" },
  { key: "confirmed_for_preparation", label: "PrepLock™ confirmé" },
  { key: "preparing", label: "En préparation" },
  { key: "ready_for_pickup", label: "Prêt pour pickup" },
  { key: "on_the_way", label: "En route" },
  { key: "delivered", label: "Livré" },
];

const STEP_ORDER = [
  "pending_dispatch", "dispatching_driver", "driver_assigned",
  "awaiting_customer_confirmation", "confirmed_for_preparation",
  "preparing", "ready_for_pickup", "picked_up", "on_the_way",
  "arriving_soon", "delivered",
];

function getStepIndex(status: string): number {
  return STEP_ORDER.indexOf(status);
}

export default function OrderTrackingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const orderId = Number(id);
  const prevStatus = useRef<string>("");

  const { data: order, isLoading, refetch } = useGetOrder(orderId, {
    query: { refetchInterval: 10000 },
  });

  const o = order as any;
  const statusColor = o ? getStatusColor(o.status) : colors.primary;
  const currentStepIdx = o ? getStepIndex(o.status) : -1;

  useEffect(() => {
    if (o?.status && o.status !== prevStatus.current) {
      prevStatus.current = o.status;
    }
  }, [o?.status]);

  if (isLoading && !order) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!o) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={40} color={colors.mutedForeground} />
        <Text style={[s.emptyTitle, { color: colors.foreground }]}>Commande introuvable</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[s.linkText, { color: colors.primary }]}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isFinal = ["delivered", "cancelled"].includes(o.status);

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
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.foreground }]}>
          Commande #{o.id}
        </Text>
        <TouchableOpacity onPress={() => refetch()}>
          <Feather name="refresh-cw" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 40 }}
      >
        {/* Status card */}
        <View
          style={[
            s.statusCard,
            {
              backgroundColor: `${statusColor}12`,
              borderColor: `${statusColor}30`,
            },
          ]}
        >
          <View style={[s.statusDot, { backgroundColor: statusColor }]} />
          <View style={s.statusInfo}>
            <Text style={[s.statusLabel, { color: statusColor }]}>
              {getStatusLabel(o.status)}
            </Text>
            {!isFinal && (
              <Text style={[s.statusSubText, { color: colors.mutedForeground }]}>
                Mise à jour en temps réel · toutes les 10s
              </Text>
            )}
          </View>
          {!isFinal && <ActivityIndicator size="small" color={statusColor} />}
        </View>

        {/* PrepLock notice */}
        {["driver_assigned", "awaiting_customer_confirmation"].includes(o.status) && (
          <View
            style={[s.prepLockCard, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }]}
          >
            <Ionicons name="lock-closed" size={18} color={colors.primary} />
            <View style={s.prepLockText}>
              <Text style={[s.prepLockTitle, { color: colors.foreground }]}>
                PrepLock™ en attente
              </Text>
              <Text style={[s.prepLockDesc, { color: colors.mutedForeground }]}>
                Votre livreur confirme votre adresse avant que le restaurant commence à préparer.
              </Text>
            </View>
          </View>
        )}

        {/* Timeline */}
        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[s.cardTitle, { color: colors.foreground }]}>Suivi</Text>
          {ORDER_STEPS.map((step, idx) => {
            const stepIdx = getStepIndex(step.key);
            const done = currentStepIdx >= stepIdx;
            const active = currentStepIdx === stepIdx;
            const isLast = idx === ORDER_STEPS.length - 1;
            return (
              <View key={step.key} style={s.timelineRow}>
                <View style={s.timelineLeft}>
                  <View
                    style={[
                      s.timelineDot,
                      {
                        backgroundColor: done ? colors.primary : colors.border,
                        borderColor: active ? colors.primary : "transparent",
                      },
                    ]}
                  >
                    {done && <Feather name="check" size={10} color={colors.primaryForeground} />}
                  </View>
                  {!isLast && (
                    <View
                      style={[
                        s.timelineLine,
                        { backgroundColor: done ? colors.primary : colors.border },
                      ]}
                    />
                  )}
                </View>
                <Text
                  style={[
                    s.timelineLabel,
                    {
                      color: done ? colors.foreground : colors.mutedForeground,
                      fontWeight: active ? ("700" as const) : ("400" as const),
                    },
                  ]}
                >
                  {step.label}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Order details */}
        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[s.cardTitle, { color: colors.foreground }]}>Détails</Text>
          <View style={s.detailRow}>
            <Feather name="map-pin" size={14} color={colors.mutedForeground} />
            <Text style={[s.detailText, { color: colors.foreground }]} numberOfLines={2}>
              {o.deliveryAddress}
            </Text>
          </View>
          {o.driverName && (
            <View style={s.detailRow}>
              <Ionicons name="bicycle-outline" size={14} color={colors.mutedForeground} />
              <Text style={[s.detailText, { color: colors.foreground }]}>
                {o.driverName}
              </Text>
            </View>
          )}
          <View style={s.detailRow}>
            <Feather name="clock" size={14} color={colors.mutedForeground} />
            <Text style={[s.detailText, { color: colors.mutedForeground }]}>
              {o.createdAt ? formatDate(o.createdAt) : ""}
            </Text>
          </View>
        </View>

        {/* Total */}
        <View style={[s.totalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[s.totalLabel, { color: colors.mutedForeground }]}>Total payé</Text>
          <Text style={[s.totalValue, { color: colors.primary }]}>
            {formatDA(o.total ?? o.totalAmount)}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: "700" as const },
  linkText: { fontSize: 15, fontWeight: "600" as const },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 17, fontWeight: "700" as const },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusInfo: { flex: 1 },
  statusLabel: { fontSize: 16, fontWeight: "700" as const },
  statusSubText: { fontSize: 12, marginTop: 2 },
  prepLockCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  prepLockText: { flex: 1 },
  prepLockTitle: { fontSize: 14, fontWeight: "700" as const, marginBottom: 2 },
  prepLockDesc: { fontSize: 12, lineHeight: 18 },
  card: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: "700" as const, marginBottom: 4 },
  timelineRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, minHeight: 44 },
  timelineLeft: { alignItems: "center", width: 20 },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineLine: { width: 2, flex: 1, marginVertical: 4 },
  timelineLabel: { flex: 1, fontSize: 14, paddingTop: 2 },
  detailRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  detailText: { flex: 1, fontSize: 14 },
  totalCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: { fontSize: 15 },
  totalValue: { fontSize: 20, fontWeight: "800" as const },
});
