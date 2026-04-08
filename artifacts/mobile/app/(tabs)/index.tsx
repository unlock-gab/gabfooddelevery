import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
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
import { useListRestaurants, useListOrders } from "@workspace/api-client-react";
import { formatDA, getStatusLabel, getStatusColor } from "@/utils/format";

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
  const [isOnline, setIsOnline] = useState(false);
  const [toggling, setToggling] = useState(false);

  const { data: missionsData, isLoading, refetch } = useListOrders(
    {} as any,
    { query: { refetchInterval: isOnline ? 15000 : 0, enabled: isOnline } }
  );
  const orders = (missionsData as any)?.orders ?? [];
  const active = orders.filter((o: any) =>
    ["driver_assigned", "awaiting_customer_confirmation", "confirmed_for_preparation", "preparing", "ready_for_pickup", "picked_up", "on_the_way", "arriving_soon"].includes(o.status)
  );

  const toggleOnline = async (value: boolean) => {
    setToggling(true);
    try {
      const { default: AsyncStorage } = await import("@react-native-async-storage/async-storage");
      const token = await AsyncStorage.getItem("tc_token");
      const res = await fetch(
        `https://${process.env.EXPO_PUBLIC_DOMAIN}/api/driver/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ isOnline: value }),
        }
      );
      if (res.ok) {
        setIsOnline(value);
        await Haptics.notificationAsync(
          value
            ? Haptics.NotificationFeedbackType.Success
            : Haptics.NotificationFeedbackType.Warning
        );
        if (value) refetch();
      }
    } catch {}
    setToggling(false);
  };

  return (
    <View style={[ds.flex, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          ds.header,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16),
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
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
              thumbColor={isOnline ? "#fff" : "#fff"}
              ios_backgroundColor={colors.border}
            />
          ) : (
            <ActivityIndicator size="small" color={colors.primary} />
          )}
        </View>
      </View>

      {/* Online/offline status banner */}
      <View
        style={[
          ds.statusBanner,
          {
            backgroundColor: isOnline ? "#F0FDF4" : colors.muted,
            borderBottomColor: isOnline ? "#BBF7D0" : colors.border,
          },
        ]}
      >
        <Ionicons
          name={isOnline ? "radio-button-on" : "radio-button-off"}
          size={14}
          color={isOnline ? "#16A34A" : colors.mutedForeground}
        />
        <Text
          style={[
            ds.statusBannerText,
            { color: isOnline ? "#15803D" : colors.mutedForeground },
          ]}
        >
          {isOnline
            ? "Vous êtes en ligne — les missions arrivent automatiquement"
            : "Vous êtes hors ligne — activez pour recevoir des missions"}
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
            Activez le mode en ligne pour commencer à recevoir des missions de livraison.
          </Text>
          <TouchableOpacity
            style={[ds.goOnlineBtn, { backgroundColor: "#22C55E" }]}
            onPress={() => toggleOnline(true)}
            disabled={toggling}
          >
            {toggling ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="power" size={18} color="#fff" />
                <Text style={ds.goOnlineBtnText}>Passer en ligne</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : isLoading ? (
        <View style={ds.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : active.length === 0 ? (
        <View style={ds.emptyState}>
          <Ionicons name="bicycle-outline" size={52} color={colors.mutedForeground} />
          <Text style={[ds.emptyTitle, { color: colors.foreground }]}>Aucune mission active</Text>
          <Text style={[ds.emptyDesc, { color: colors.mutedForeground }]}>
            Les nouvelles missions apparaîtront ici automatiquement
          </Text>
          <TouchableOpacity onPress={() => refetch()} style={[ds.refreshBtn, { borderColor: colors.border }]}>
            <Feather name="refresh-cw" size={14} color={colors.mutedForeground} />
            <Text style={[ds.refreshBtnText, { color: colors.mutedForeground }]}>Actualiser</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={active}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80 }}
          scrollEnabled={!!active.length}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[ds.missionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
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
              <Text style={[ds.missionAddress, { color: colors.mutedForeground }]} numberOfLines={1}>
                {item.deliveryAddress}
              </Text>
              <View style={ds.missionFooter}>
                <Text style={[ds.missionAmount, { color: colors.primary }]}>
                  {formatDA(item.totalAmount)}
                </Text>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </View>
            </TouchableOpacity>
          )}
        />
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
