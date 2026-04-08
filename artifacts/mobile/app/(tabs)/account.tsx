import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import {
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
  onPress,
  danger,
  colors,
}: {
  icon: string;
  label: string;
  sublabel?: string;
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
      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

export default function AccountScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert("Déconnexion", "Êtes-vous sûr de vouloir vous déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Déconnecter",
        style: "destructive",
        onPress: async () => {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  if (!user) return null;

  const roleColor = ROLE_COLORS[user.role] ?? colors.primary;

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

        {/* PrepLock badge */}
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

        {/* Menu items */}
        <View style={[s.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {user.role === "customer" && (
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
          {user.role === "driver" && (
            <MenuItem
              icon="bar-chart-2"
              label="Mes statistiques"
              sublabel="Vos performances"
              onPress={() => router.push("/(tabs)/orders")}
              colors={colors}
            />
          )}
          <MenuItem
            icon="shield"
            label="Sécurité"
            sublabel="Mot de passe et données"
            onPress={() => {}}
            colors={colors}
          />
          <MenuItem
            icon="help-circle"
            label="Aide & Support"
            onPress={() => {}}
            colors={colors}
          />
        </View>

        <View style={[s.menuCard, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 12 }]}>
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
  profileSection: { alignItems: "center", paddingVertical: 28, paddingHorizontal: 20 },
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
  version: { textAlign: "center" as const, fontSize: 12, marginTop: 24, marginBottom: 8 },
});
