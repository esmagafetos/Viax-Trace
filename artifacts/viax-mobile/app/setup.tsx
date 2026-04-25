import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { useAuth } from "@/lib/auth";
import { useTheme, radii } from "@/lib/theme";
import { api } from "@/lib/api";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import ViaXLogo from "@/components/Logo";
import { useToast } from "@/components/Toast";

export default function SetupScreen() {
  const t = useTheme();
  const router = useRouter();
  const { setServerUrl, serverUrl } = useAuth();
  const { show } = useToast();
  const insets = useSafeAreaInsets();

  const [url, setUrl] = useState(serverUrl ?? "");
  const [testing, setTesting] = useState(false);
  const [tested, setTested] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalize = (raw: string): string => {
    let s = raw.trim().replace(/\/+$/, "");
    if (!s) return "";

    if (/^https?:\/\//i.test(s)) {
      // Replace "localhost" with "127.0.0.1" for Android compatibility
      return s.replace(/^(https?:\/\/)localhost(:\d+)?/i, (_, proto, port) => `${proto}127.0.0.1${port ?? ""}`);
    }

    const hostPart = s.split("/")[0]!.split(":")[0]!.toLowerCase();
    const isLocal =
      hostPart === "localhost" ||
      /^127\./.test(hostPart) ||
      /^10\./.test(hostPart) ||
      /^192\.168\./.test(hostPart) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostPart);

    const proto = isLocal ? "http" : "https";

    // Replace "localhost" with "127.0.0.1" so Android resolves it via IPv4
    const normalized = s.replace(/^localhost(:\d+)?/i, (_, port) => `127.0.0.1${port ?? ""}`);

    return `${proto}://${normalized}`;
  };

  const testConnection = async () => {
    const cleaned = normalize(url);
    if (!cleaned) {
      setError("Informe a URL do servidor.");
      return;
    }
    setError(null);
    setTesting(true);
    try {
      await setServerUrl(cleaned);
      const r = await api<{ status: string }>("/healthz");
      if (r && (r as any).status !== undefined) {
        setTested(true);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        show("Conexão estabelecida.", "success");
      } else {
        throw new Error("Resposta inesperada do servidor.");
      }
    } catch (e: any) {
      setTested(false);
      const msg: string =
        e?.message === "Network request failed"
          ? "Servidor inacessível. Verifique se o Termux está rodando e a URL está correta."
          : (e?.message ?? "Não foi possível conectar.");
      setError(msg);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setTesting(false);
    }
  };

  const proceed = async () => {
    if (!tested) {
      await testConnection();
      return;
    }
    router.replace("/(auth)/login");
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <LinearGradient
        colors={t.heroGradient as unknown as readonly [string, string, ...string[]]}
        locations={t.heroLocations as unknown as readonly [number, number, ...number[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top + 24, paddingBottom: 40, paddingHorizontal: 22 }}
      >
        <ViaXLogo size="md" dark />
        <Text style={{ color: "#f0ede8", fontFamily: "Poppins_800ExtraBold", fontSize: 26, marginTop: 22, letterSpacing: -0.6 }}>
          Configurar servidor
        </Text>
        <Text style={{ color: "rgba(240,237,232,0.65)", fontFamily: "Poppins_400Regular", fontSize: 13, marginTop: 8, lineHeight: 19 }}>
          Informe o endereço exibido pelo Termux para conectar ao backend ViaX:Trace.
        </Text>
      </LinearGradient>

      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: 22, paddingBottom: insets.bottom + 32, gap: 18 }}
          keyboardShouldPersistTaps="handled"
        >

          <View style={{ padding: 14, backgroundColor: t.surface2, borderRadius: radii.md, borderWidth: 1, borderColor: t.accent + "44" }}>
            <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 12, color: t.accent, marginBottom: 6, letterSpacing: 0.4 }}>
              COMO INICIAR O SERVIDOR
            </Text>
            <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 12, color: t.textFaint, lineHeight: 20 }}>
              1. Abra o Termux no mesmo aparelho Android.{"\n"}
              2. Execute o comando abaixo:{"\n"}
              {"   "}
              <Text style={{ fontFamily: "Poppins_600SemiBold", color: t.text }}>
                bash ~/viax-system/start-backend.sh
              </Text>
              {"\n"}
              3. Copie a URL exibida no terminal:{"\n"}
              {"   "}
              <Text style={{ fontFamily: "Poppins_600SemiBold", color: t.text }}>
                http://127.0.0.1:8080
              </Text>
              {"\n"}
              4. Cole no campo abaixo e toque em "Testar conexão".
            </Text>
          </View>

          <Input
            label="URL do servidor Termux"
            placeholder="http://127.0.0.1:8080"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            value={url}
            onChangeText={(v) => { setUrl(v); setTested(false); setError(null); }}
            error={error}
            hint="Use a URL exibida no terminal do Termux. Nunca use https:// para servidor local."
          />

          <Button
            label={testing ? "Testando..." : tested ? "Conexão validada" : "Testar conexão"}
            variant={tested ? "secondary" : "outline"}
            loading={testing}
            fullWidth
            onPress={testConnection}
          />

          <Button
            label="Continuar"
            variant="primary"
            fullWidth
            disabled={!tested}
            onPress={proceed}
          />

          <View style={{ marginTop: 4, padding: 14, backgroundColor: t.surface2, borderRadius: radii.md, borderWidth: 1, borderColor: t.borderStrong }}>
            <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 12, color: t.textMuted, marginBottom: 6, letterSpacing: 0.4 }}>
              DICA
            </Text>
            <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 12, color: t.textFaint, lineHeight: 18 }}>
              Você pode trocar o servidor a qualquer momento em Configurações.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
