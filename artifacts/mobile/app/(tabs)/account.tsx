import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useGetDriverStats } from "@workspace/api-client-react";
import { formatDA } from "@/utils/format";

const ROLE_LABELS: Record<string, string> = {
  customer: "Client",
  driver: "Livreur",
  restaurant: "Restaurant",
  admin: "Administrateur",
};

const ROLE_COLORS: Record<string, string> = {
  customer: "#0BA5E9",
  driver: "#F0A000",
  restaurant: "#22C55E",
  admin: "#8B5CF6",
};

function MenuItem({
  icon,
  label,
  sublabel,
  rightText,
  onPress,
  danger,
  colors,
}: {
  icon: string;
  label: string;
  sublabel?: string;
  rightText?: string;
  onPress: () => void;
  danger?: boolean;
  colors: any;
}) {
  return (
    <TouchableOpacity
      style={[s.menuItem, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        style={[
          s.menuIcon,
          { backgroundColor: danger ? "#FEE2E2" : colors.muted },
        ]}
      >
        <Feather
          name={icon as any}
          size={18}
          color={danger ? "#EF4444" : colors.mutedForeground}
        />
      </View>
      <View style={s.menuLabel}>
        <Text
          style={[
            s.menuLabelText,
            { color: danger ? "#EF4444" : colors.foreground },
          ]}
        >
          {label}
        </Text>
        {sublabel ? (
          <Text style={[s.menuSublabel, { color: colors.mutedForeground }]}>
            {sublabel}
          </Text>
        ) : null}
      </View>
      {rightText ? (
        <Text style={[s.menuRightText, { color: colors.primary }]}>{rightText}</Text>
      ) : (
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      )}
    </TouchableOpacity>
  );
}

function DriverEarningsCard({ colors }: { colors: any }) {
  const { data: stats, isLoading, refetch } = useGetDriverStats({
    query: { staleTime: 0, refetchOnWindowFocus: true, refetchOnMount: true },
  });
  const st = stats as any;

  // Refetch every time the driver opens the Compte tab
  useFocusEffect(useCallback(() => { refetch(); }, []));

  return (
    <View style={[s.earningsCard, { backgroundColor: colors.primary }]}>
      <Text style={s.earningsTitle}>Mes gains</Text>
      {isLoading ? (
        <ActivityIndicator color="#fff" style={{ marginTop: 8 }} />
      ) : (
        <>
          <Text style={s.earningsAmount}>
            {formatDA(st?.earningsTotal ?? 0)}
          </Text>
          <Text style={s.earningsSub}>Total cumulé</Text>
          {(st?.earningsTotal ?? 0) > 0 && (
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "rgba(0,0,0,0.2)", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, marginTop: 8, marginBottom: 2 }}>
              <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>Commission TC (12%)</Text>
              <Text style={{ color: "#FDE68A", fontSize: 12, fontWeight: "700" }}>−{formatDA(Math.round((st?.earningsTotal ?? 0) * 0.12))}</Text>
            </View>
          )}
          <View style={s.earningsRow}>
            <View style={s.earningsStat}>
              <Text style={s.earningsStatValue}>{st?.totalDeliveries ?? 0}</Text>
              <Text style={s.earningsStatLabel}>Livraisons</Text>
            </View>
            <View style={[s.earningsDivider, { backgroundColor: "rgba(255,255,255,0.3)" }]} />
            <View style={s.earningsStat}>
              <Text style={s.earningsStatValue}>
                {st?.avgRating ? Number(st.avgRating).toFixed(1) : "–"}
              </Text>
              <Text style={s.earningsStatLabel}>Note ★</Text>
            </View>
            <View style={[s.earningsDivider, { backgroundColor: "rgba(255,255,255,0.3)" }]} />
            <View style={s.earningsStat}>
              <Text style={s.earningsStatValue}>
                {formatDA(st?.earningsToday ?? 0)}
              </Text>
              <Text style={s.earningsStatLabel}>Aujourd'hui</Text>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

export default function AccountScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, isLoading, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert("Déconnexion", "Êtes-vous sûr de vouloir vous déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Déconnecter",
        style: "destructive",
        onPress: async () => {
          try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          } catch {}
          await logout();
          router.replace("/" as any);
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={[s.flex, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[s.flex, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center", padding: 32 }]}>
        <Ionicons name="person-circle-outline" size={72} color={colors.mutedForeground} />
        <Text style={[s.userName, { color: colors.foreground, marginTop: 16, textAlign: "center" }]}>
          Connectez-vous
        </Text>
        <Text style={[s.userEmail, { color: colors.mutedForeground, textAlign: "center", marginBottom: 24 }]}>
          Accédez à votre compte et vos commandes
        </Text>
        <TouchableOpacity
          style={{ backgroundColor: colors.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14 }}
          onPress={() => router.push("/(auth)/login" as any)}
        >
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>Se connecter</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const roleColor = ROLE_COLORS[user.role] ?? colors.primary;
  const isDriver = user.role === "driver";

  return (
    <View style={[s.flex, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16),
          paddingBottom: insets.bottom + 80,
        }}
      >
        {/* Profile card */}
        <View style={s.profileSection}>
          <View style={[s.avatar, { backgroundColor: roleColor }]}>
            <Text style={s.avatarText}>
              {user.name?.charAt(0)?.toUpperCase() ?? "?"}
            </Text>
          </View>
          <Text style={[s.userName, { color: colors.foreground }]}>{user.name}</Text>
          <Text style={[s.userEmail, { color: colors.mutedForeground }]}>{user.email}</Text>
          <View style={[s.roleBadge, { backgroundColor: `${roleColor}20` }]}>
            <Text style={[s.roleBadgeText, { color: roleColor }]}>
              {ROLE_LABELS[user.role] ?? user.role}
            </Text>
          </View>
        </View>

        {/* Driver earnings */}
        {isDriver && (
          <View style={s.section}>
            <DriverEarningsCard colors={colors} />
          </View>
        )}

        {/* PrepLock badge (customer only) */}
        {!isDriver && (
          <View style={[s.prepLockCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="lock-closed" size={20} color={colors.primary} />
            <View style={s.prepLockText}>
              <Text style={[s.prepLockTitle, { color: colors.foreground }]}>
                Technologie PrepLock™
              </Text>
              <Text style={[s.prepLockDesc, { color: colors.mutedForeground }]}>
                Votre repas commence à être préparé seulement après confirmation du livreur
              </Text>
            </View>
          </View>
        )}

        {/* Menu items */}
        <View style={[s.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {!isDriver && (
            <>
              <MenuItem
                icon="package"
                label="Mes commandes"
                sublabel="Suivez vos livraisons"
                onPress={() => router.push("/(tabs)/orders")}
                colors={colors}
              />
              <MenuItem
                icon="map-pin"
                label="Mes adresses"
                sublabel="Gérez vos adresses de livraison"
                onPress={() => {}}
                colors={colors}
              />
            </>
          )}
          {isDriver && (
            <MenuItem
              icon="list"
              label="Historique des livraisons"
              sublabel="Vos missions passées"
              onPress={() => router.push("/(tabs)/orders")}
              colors={colors}
            />
          )}
          <MenuItem
            icon="shield"
            label="Sécurité & Profil"
            sublabel="Informations personnelles et mot de passe"
            onPress={() => router.push("/profile" as any)}
            colors={colors}
          />
          <MenuItem
            icon="help-circle"
            label="Aide & Support"
            onPress={() => {}}
            colors={colors}
          />
        </View>

        <View
          style={[
            s.menuCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              marginTop: 12,
            },
          ]}
        >
          <MenuItem
            icon="log-out"
            label="Déconnexion"
            onPress={handleLogout}
            danger
            colors={colors}
          />
        </View>

        <Text style={[s.version, { color: colors.mutedForeground }]}>
          TastyCrousty v1.0 · Algérie 🇩🇿
        </Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  section: { marginHorizontal: 16, marginBottom: 12 },
  profileSection: { alignItems: "center", paddingVertical: 24, paddingHorizontal: 20 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: { fontSize: 32, fontWeight: "700" as const, color: "#fff" },
  userName: { fontSize: 20, fontWeight: "800" as const, letterSpacing: -0.3, marginBottom: 4 },
  userEmail: { fontSize: 13, marginBottom: 10 },
  roleBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  roleBadgeText: { fontSize: 13, fontWeight: "700" as const },

  earningsCard: {
    borderRadius: 20,
    padding: 20,
  },
  earningsTitle: { fontSize: 13, fontWeight: "600" as const, color: "rgba(255,255,255,0.8)", marginBottom: 4 },
  earningsAmount: { fontSize: 36, fontWeight: "800" as const, color: "#fff", letterSpacing: -1 },
  earningsSub: { fontSize: 12, color: "rgba(255,255,255,0.65)", marginBottom: 16, marginTop: 2 },
  earningsRow: { flexDirection: "row", alignItems: "center" },
  earningsStat: { flex: 1, alignItems: "center" },
  earningsStatValue: { fontSize: 18, fontWeight: "700" as const, color: "#fff" },
  earningsStatLabel: { fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  earningsDivider: { width: 1, height: 32, marginHorizontal: 4 },

  prepLockCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  prepLockText: { flex: 1 },
  prepLockTitle: { fontSize: 14, fontWeight: "700" as const, marginBottom: 2 },
  prepLockDesc: { fontSize: 12, lineHeight: 18 },

  menuCard: { marginHorizontal: 16, borderRadius: 14, borderWidth: 1, overflow: "hidden" as const },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  menuLabel: { flex: 1 },
  menuLabelText: { fontSize: 15, fontWeight: "600" as const },
  menuSublabel: { fontSize: 12, marginTop: 1 },
  menuRightText: { fontSize: 14, fontWeight: "700" as const },
  version: { textAlign: "center" as const, fontSize: 12, marginTop: 24, marginBottom: 8 },
});
