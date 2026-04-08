import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
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
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useListCities } from "@workspace/api-client-react";

const BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  editable = true,
  colors,
  keyboardType,
  icon,
}: any) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={[fs.label, { color: colors.mutedForeground }]}>{label}</Text>
      <View style={[fs.inputWrap, { borderColor: colors.border, backgroundColor: editable ? colors.background : colors.muted }]}>
        {icon && <Ionicons name={icon} size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />}
        <TextInput
          style={[fs.input, { color: editable ? colors.foreground : colors.mutedForeground }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          secureTextEntry={secureTextEntry}
          editable={editable}
          keyboardType={keyboardType}
          autoCapitalize="none"
        />
        {!editable && <Ionicons name="lock-closed" size={14} color={colors.mutedForeground} />}
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, login, token } = useAuth();

  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const { data: cities } = useListCities(undefined, { query: { staleTime: 120000 } });
  const isDriver = user?.role === "driver";

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${BASE}/api/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setPhone(data.phone ?? "");
          setSelectedCityId(data.cityId ?? null);
        }
      } catch {}
      setLoadingProfile(false);
    };
    if (token) fetchProfile();
  }, [token]);

  const handleSaveInfo = async () => {
    if (!name.trim()) {
      Alert.alert("Erreur", "Le nom ne peut pas être vide.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() || null }),
      });
      if (!res.ok) throw new Error();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Enregistré", "Vos informations ont été mises à jour.");
    } catch {
      Alert.alert("Erreur", "Impossible de sauvegarder les modifications.");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Erreur", "Les mots de passe ne correspondent pas.");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Erreur", "Le nouveau mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/profile/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      Alert.alert("Succès", "Mot de passe modifié avec succès.");
    } catch (e: any) {
      Alert.alert("Erreur", e.message ?? "Impossible de modifier le mot de passe.");
    } finally {
      setLoading(false);
    }
  };

  const cityList = (cities as any[]) ?? [];

  if (loadingProfile) {
    return (
      <View style={[fs.flex, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[fs.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[fs.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={fs.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[fs.headerTitle, { color: colors.foreground }]}>Mon profil</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar */}
        <View style={fs.avatarSection}>
          <View style={[fs.avatar, { backgroundColor: colors.primary }]}>
            <Text style={fs.avatarText}>{user?.name?.charAt(0)?.toUpperCase() ?? "?"}</Text>
          </View>
          <Text style={[fs.avatarName, { color: colors.foreground }]}>{user?.name}</Text>
          <Text style={[fs.avatarEmail, { color: colors.mutedForeground }]}>{user?.email}</Text>
        </View>

        {/* Info Card */}
        <View style={[fs.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[fs.sectionTitle, { color: colors.foreground }]}>
            <Feather name="user" size={15} /> Informations personnelles
          </Text>
          <Field label="Nom complet" value={name} onChangeText={setName} placeholder="Votre nom" colors={colors} icon="person-outline" />
          <Field label="Email" value={user?.email ?? ""} editable={false} colors={colors} icon="mail-outline" />
          <Field label="Téléphone" value={phone} onChangeText={setPhone} placeholder="+213 5xx xxx xxx" keyboardType="phone-pad" colors={colors} icon="call-outline" />

          {/* Wilaya selector */}
          <View style={{ marginBottom: 16 }}>
            <Text style={[fs.label, { color: colors.mutedForeground }]}>
              Wilaya {isDriver && <Text style={{ color: "#EF4444" }}>(fixée à l'inscription)</Text>}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
              {cityList.filter((c: any) => c.isActive).map((city: any) => {
                const active = selectedCityId === city.id;
                return (
                  <TouchableOpacity
                    key={city.id}
                    disabled={isDriver}
                    onPress={() => setSelectedCityId(city.id)}
                    style={[
                      fs.cityChip,
                      {
                        backgroundColor: active ? colors.primary : colors.muted,
                        borderColor: active ? colors.primary : colors.border,
                        opacity: isDriver ? 0.6 : 1,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "600", color: active ? "#fff" : colors.foreground }}>
                      {city.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {isDriver && (
              <Text style={[fs.lockNote, { color: colors.mutedForeground }]}>
                <Ionicons name="lock-closed" size={12} /> La wilaya du livreur est fixée à l'inscription et ne peut pas être modifiée.
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[fs.saveBtn, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
            onPress={handleSaveInfo}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={fs.saveBtnText}>Enregistrer</Text>}
          </TouchableOpacity>
        </View>

        {/* Password Card */}
        <View style={[fs.card, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 16 }]}>
          <Text style={[fs.sectionTitle, { color: colors.foreground }]}>
            <Feather name="lock" size={15} /> Changer le mot de passe
          </Text>
          <Field label="Mot de passe actuel" value={oldPassword} onChangeText={setOldPassword} secureTextEntry placeholder="••••••••" colors={colors} icon="lock-closed-outline" />
          <Field label="Nouveau mot de passe" value={newPassword} onChangeText={setNewPassword} secureTextEntry placeholder="Min. 6 caractères" colors={colors} icon="lock-open-outline" />
          <Field label="Confirmer le nouveau mot de passe" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry placeholder="••••••••" colors={colors} icon="checkmark-circle-outline" />

          <TouchableOpacity
            style={[fs.saveBtn, { backgroundColor: "#0F172A", opacity: loading ? 0.7 : 1 }]}
            onPress={handleChangePassword}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={fs.saveBtnText}>Modifier le mot de passe</Text>}
          </TouchableOpacity>
        </View>

        {/* PrepLock info */}
        <View style={[fs.prepLockBadge, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}40` }]}>
          <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
          <Text style={[fs.prepLockText, { color: colors.foreground }]}>
            TastyCrousty utilise la technologie <Text style={{ color: colors.primary, fontWeight: "700" }}>PrepLock™</Text> pour protéger vos commandes.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const fs = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  avatarSection: { alignItems: "center", marginBottom: 24, marginTop: 8 },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  avatarText: { fontSize: 28, fontWeight: "800", color: "#fff" },
  avatarName: { fontSize: 18, fontWeight: "700", marginBottom: 2 },
  avatarEmail: { fontSize: 13 },
  card: { borderRadius: 16, borderWidth: 1, padding: 18 },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 16 },
  label: { fontSize: 12, fontWeight: "600", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  input: { flex: 1, fontSize: 15 },
  cityChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  lockNote: { fontSize: 11, marginTop: 6, lineHeight: 16 },
  saveBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  prepLockBadge: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 20,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  prepLockText: { flex: 1, fontSize: 13, lineHeight: 19 },
});
