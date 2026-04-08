import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useListOrders } from "@workspace/api-client-react";
import { formatDA, formatDate, getStatusLabel, getStatusColor } from "@/utils/format";

function OrderItem({ order, colors }: { order: any; colors: any }) {
  const statusColor = getStatusColor(order.status);
  return (
    <TouchableOpacity
      style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => router.push(`/order/${order.id}` as any)}
      activeOpacity={0.85}
    >
      <View style={s.cardHeader}>
        <Text style={[s.orderNum, { color: colors.foreground }]}>
          Commande #{order.id}
        </Text>
        <View style={[s.statusBadge, { backgroundColor: `${statusColor}20` }]}>
          <Text style={[s.statusText, { color: statusColor }]}>
            {getStatusLabel(order.status)}
          </Text>
        </View>
      </View>
      <Text style={[s.restaurant, { color: colors.mutedForeground }]}>
        {order.restaurantName ?? "Restaurant"}
      </Text>
      <View style={s.cardFooter}>
        <Text style={[s.amount, { color: colors.primary }]}>
          {formatDA(order.totalAmount)}
        </Text>
        <Text style={[s.date, { color: colors.mutedForeground }]}>
          {order.createdAt ? formatDate(order.createdAt) : ""}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function OrdersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data: ordersData, isLoading, refetch } = useListOrders(
    {} as any,
    { query: { refetchInterval: 30000 } }
  );
  const orders = (ordersData as any)?.orders ?? [];

  return (
    <View style={[s.flex, { backgroundColor: colors.background }]}>
      <View
        style={[
          s.header,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16),
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[s.title, { color: colors.foreground }]}>Mes commandes</Text>
        <Text style={[s.subtitle, { color: colors.mutedForeground }]}>
          {orders.length} commande{orders.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : orders.length === 0 ? (
        <View style={s.center}>
          <Feather name="package" size={48} color={colors.mutedForeground} />
          <Text style={[s.emptyTitle, { color: colors.foreground }]}>Aucune commande</Text>
          <Text style={[s.emptyDesc, { color: colors.mutedForeground }]}>
            Vos commandes apparaîtront ici
          </Text>
          <TouchableOpacity
            style={[s.shopBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.replace("/(tabs)/")}
          >
            <Text style={[s.shopBtnText, { color: colors.primaryForeground }]}>
              Commander maintenant
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item: any) => String(item.id)}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: insets.bottom + 80 }}
          scrollEnabled={!!orders.length}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />
          }
          renderItem={({ item }) => <OrderItem order={item} colors={colors} />}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  header: { borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontSize: 22, fontWeight: "800" as const, letterSpacing: -0.3 },
  subtitle: { fontSize: 13, marginTop: 2 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: "700" as const },
  emptyDesc: { fontSize: 14, textAlign: "center" as const },
  shopBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, marginTop: 8 },
  shopBtnText: { fontWeight: "700" as const, fontSize: 14 },
  card: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 6 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  orderNum: { fontSize: 15, fontWeight: "700" as const },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: "700" as const },
  restaurant: { fontSize: 13 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  amount: { fontSize: 15, fontWeight: "700" as const },
  date: { fontSize: 12 },
});
