import React, { useState } from "react";
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { api } from "@/lib/api";
import { useTheme, radii } from "@/lib/theme";
import { Card, CardHeader, Pill } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ScreenHeader from "@/components/ScreenHeader";
import { useToast } from "@/components/Toast";
import { formatDateTime, formatMs, formatPct } from "@/lib/format";
import type { Analysis, AnalysisListResponse } from "@/lib/types";

const LIMIT = 10;

export default function HistoricoScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { show } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const list = useQuery({
    queryKey: ["analyses", page],
    queryFn: () => api<AnalysisListResponse>(`/analyses?page=${page}&limit=${LIMIT}`),
  });

  const del = useMutation({
    mutationFn: (id: number) => api(`/analyses/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      show("Análise excluída.", "success");
      void queryClient.invalidateQueries({ queryKey: ["analyses"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: any) => show(e?.message ?? "Erro ao excluir.", "error"),
  });

  const confirmDelete = (a: Analysis) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Excluir análise", `Confirmar exclusão de "${a.fileName}"?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: () => del.mutate(a.id) },
    ]);
  };

  const items = list.data?.items ?? [];
  const total = list.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 18, paddingHorizontal: 18, paddingBottom: insets.bottom + 96 }}
      refreshControl={<RefreshControl refreshing={list.isFetching} onRefresh={() => list.refetch()} tintColor={t.accent} />}
    >
      <ScreenHeader
        title="Histórico de análises"
        subtitle={total > 0 ? `${total} análise${total !== 1 ? "s" : ""} encontrada${total !== 1 ? "s" : ""}` : "Nenhuma análise ainda"}
      />

      {list.isLoading ? (
        <View style={{ paddingVertical: 60, alignItems: "center" }}>
          <ActivityIndicator color={t.accent} />
        </View>
      ) : items.length === 0 ? (
        <Card>
          <View style={{ alignItems: "center", paddingVertical: 32, gap: 10 }}>
            <Ionicons name="document-text-outline" size={36} color={t.textFaint} />
            <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 13, color: t.textMuted, textAlign: "center" }}>
              Nenhuma análise encontrada.
            </Text>
            <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 12, color: t.textFaint, textAlign: "center" }}>
              Processe uma rota para começar.
            </Text>
          </View>
        </Card>
      ) : (
        <View style={{ gap: 10 }}>
          {items.map((a) => (
            <Card key={a.id} padded={false}>
              <View style={{ padding: 14 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text numberOfLines={1} style={{ fontFamily: "Poppins_600SemiBold", fontSize: 14, color: t.text }}>{a.fileName}</Text>
                    <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 11, color: t.textFaint, marginTop: 2 }}>
                      #{a.id} · {formatDateTime(a.createdAt)}
                    </Text>
                  </View>
                  <Pressable hitSlop={10} onPress={() => confirmDelete(a)}>
                    <Ionicons name="trash-outline" size={18} color={t.textFaint} />
                  </Pressable>
                </View>

                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                  <Pill label={a.status === "done" ? "Concluído" : a.status} tone={a.status === "done" ? "ok" : "accent"} />
                  <Pill label={a.parserMode === "ai" ? "IA" : a.parserMode === "googlemaps" ? "Google Maps" : "Built-in"} tone="neutral" />
                  <Pill label={`${a.nuances} nuances`} tone={a.nuances > 0 ? "accent" : "ok"} />
                </View>

                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14 }}>
                  <Mini title="Endereços" value={String(a.totalAddresses)} />
                  <Mini title="Geocode" value={String(a.geocodeSuccess)} />
                  <Mini title="Similaridade" value={formatPct(a.similarityAvg)} />
                  <Mini title="Tempo" value={formatMs(a.processingTimeMs)} />
                </View>
              </View>
            </Card>
          ))}
        </View>
      )}

      {totalPages > 1 && (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 18 }}>
          <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 12, color: t.textFaint }}>
            Página {page} de {totalPages}
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button label="Anterior" variant="outline" size="sm" disabled={page <= 1} onPress={() => setPage((p) => Math.max(1, p - 1))} />
            <Button label="Próxima" variant="outline" size="sm" disabled={page >= totalPages} onPress={() => setPage((p) => Math.min(totalPages, p + 1))} />
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function Mini({ title, value }: { title: string; value: string }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, minWidth: 70 }}>
      <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 9, color: t.textFaint, letterSpacing: 1, textTransform: "uppercase" }}>{title}</Text>
      <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 14, color: t.text, marginTop: 2 }}>{value}</Text>
    </View>
  );
}
