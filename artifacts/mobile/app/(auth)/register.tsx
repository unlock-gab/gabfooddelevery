import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
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

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"customer" | "driver">("customer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Veuillez remplir tous les champs.");
      return;
    }
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `https://${process.env.EXPO_PUBLIC_DOMAIN}/api/auth/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), email: email.trim(), password, role }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur lors de l'inscription");
      await login(data.token, data.user);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)/");
    } catch (e: any) {
      setError(e.message ?? "Erreur inconnue");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const s = styles(colors, insets);

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={s.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.topRow}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backText}>← Retour</Text>
          </TouchableOpacity>
        </View>

        <View style={s.card}>
          <Text style={s.title}>Créer un compte</Text>
          <Text style={s.subtitle}>Rejoignez TastyCrousty gratuitement</Text>

          {error ? (
            <View style={s.errorBox}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}

          <Text style={s.label}>Je suis</Text>
          <View style={s.roleRow}>
            {(["customer", "driver"] as const).map((r) => (
              <TouchableOpacity
                key={r}
                style={[s.roleBtn, role === r && s.roleBtnActive]}
                onPress={() => setRole(r)}
              >
                <Text style={[s.roleBtnText, role === r && s.roleBtnTextActive]}>
                  {r === "customer" ? "Client" : "Livreur"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>Nom complet</Text>
            <TextInput
              style={s.input}
              placeholder="Mohammed Amine Benali"
              placeholderTextColor={colors.mutedForeground}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>Adresse email</Text>
            <TextInput
              style={s.input}
              placeholder="votre@email.com"
              placeholderTextColor={colors.mutedForeground}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>Mot de passe</Text>
            <TextInput
              style={s.input}
              placeholder="Min. 6 caractères"
              placeholderTextColor={colors.mutedForeground}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[s.btn, loading && s.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={s.btnText}>Créer mon compte</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={s.footer}>
          <Text style={s.footerText}>Déjà un compte ? </Text>
          <TouchableOpacity onPress={() => router.replace("/(auth)/login")}>
            <Text style={s.footerLink}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = (colors: any, insets: any) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    container: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: insets.top + (Platform.OS === "web" ? 67 : 24),
      paddingBottom: insets.bottom + 24,
    },
    topRow: { marginBottom: 24 },
    backBtn: { alignSelf: "flex-start" },
    backText: { color: colors.primary, fontSize: 16, fontWeight: "600" as const },
    card: {
      backgroundColor: colors.card,
      borderRadius: colors.radius * 2,
      padding: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    title: { fontSize: 22, fontWeight: "800" as const, color: colors.foreground, marginBottom: 4 },
    subtitle: { fontSize: 14, color: colors.mutedForeground, marginBottom: 20 },
    errorBox: {
      backgroundColor: "#FEE2E2",
      borderRadius: colors.radius,
      padding: 12,
      marginBottom: 16,
    },
    errorText: { color: "#B91C1C", fontSize: 13 },
    roleRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
    roleBtn: {
      flex: 1,
      height: 44,
      borderRadius: colors.radius,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    roleBtnActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}15` },
    roleBtnText: { fontSize: 14, fontWeight: "600" as const, color: colors.mutedForeground },
    roleBtnTextActive: { color: colors.primary },
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 13, fontWeight: "600" as const, color: colors.foreground, marginBottom: 6 },
    input: {
      height: 48,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      fontSize: 15,
      color: colors.foreground,
      backgroundColor: colors.background,
    },
    btn: {
      height: 50,
      backgroundColor: colors.primary,
      borderRadius: colors.radius,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 8,
    },
    btnDisabled: { opacity: 0.6 },
    btnText: { color: colors.primaryForeground, fontWeight: "700" as const, fontSize: 16 },
    footer: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
    footerText: { color: colors.mutedForeground, fontSize: 14 },
    footerLink: { color: colors.primary, fontSize: 14, fontWeight: "600" as const },
  });
