import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
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

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Veuillez remplir tous les champs.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `https://${process.env.EXPO_PUBLIC_DOMAIN}/api/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), password }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur de connexion");
      await login(data.token, data.user);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/" as any);
    } catch (e: any) {
      setError(e.message ?? "Erreur inconnue");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (email: string, pass: string) => {
    setEmail(email);
    setPassword(pass);
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
        <View style={s.header}>
          <View style={s.logoBox}>
            <Text style={s.logoIcon}>🍽</Text>
          </View>
          <Text style={s.brand}>TastyCrousty</Text>
          <Text style={s.tagline}>La livraison synchronisée en Algérie</Text>
        </View>

        <View style={s.card}>
          <Text style={s.title}>Connexion</Text>

          {error ? (
            <View style={s.errorBox}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}

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
              autoComplete="email"
            />
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>Mot de passe</Text>
            <TextInput
              style={s.input}
              placeholder="••••••••"
              placeholderTextColor={colors.mutedForeground}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
            />
          </View>

          <TouchableOpacity
            style={[s.btn, loading && s.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={s.btnText}>Se connecter</Text>
            )}
          </TouchableOpacity>

          <View style={s.divider}>
            <View style={s.divLine} />
            <Text style={s.divText}>Accès démo</Text>
            <View style={s.divLine} />
          </View>

          <View style={s.demoRow}>
            <Pressable style={s.demoBtn} onPress={() => fillDemo("customer@tc.dz", "client123")}>
              <Text style={s.demoBtnText}>Client</Text>
            </Pressable>
            <Pressable style={s.demoBtn} onPress={() => fillDemo("driver@tc.dz", "driver123")}>
              <Text style={s.demoBtnText}>Livreur</Text>
            </Pressable>
          </View>
        </View>

        <View style={s.footer}>
          <Text style={s.footerText}>Pas encore de compte ? </Text>
          <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
            <Text style={s.footerLink}>S'inscrire gratuitement</Text>
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
      paddingTop: insets.top + (Platform.OS === "web" ? 67 : 40),
      paddingBottom: insets.bottom + 24,
    },
    header: { alignItems: "center", marginBottom: 32 },
    logoBox: {
      width: 72,
      height: 72,
      borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    logoIcon: { fontSize: 36 },
    brand: { fontSize: 24, fontWeight: "800" as const, color: colors.foreground, letterSpacing: -0.5 },
    tagline: { fontSize: 13, color: colors.mutedForeground, marginTop: 4 },
    card: {
      backgroundColor: colors.card,
      borderRadius: colors.radius * 2,
      padding: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    title: { fontSize: 20, fontWeight: "700" as const, color: colors.foreground, marginBottom: 20 },
    errorBox: {
      backgroundColor: "#FEE2E2",
      borderRadius: colors.radius,
      padding: 12,
      marginBottom: 16,
    },
    errorText: { color: "#B91C1C", fontSize: 13 },
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
    divider: { flexDirection: "row", alignItems: "center", marginVertical: 20 },
    divLine: { flex: 1, height: 1, backgroundColor: colors.border },
    divText: { fontSize: 12, color: colors.mutedForeground, marginHorizontal: 12 },
    demoRow: { flexDirection: "row", gap: 10 },
    demoBtn: {
      flex: 1,
      height: 40,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    demoBtnText: { fontSize: 13, fontWeight: "600" as const, color: colors.foreground },
    footer: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
    footerText: { color: colors.mutedForeground, fontSize: 14 },
    footerLink: { color: colors.primary, fontSize: 14, fontWeight: "600" as const },
  });
