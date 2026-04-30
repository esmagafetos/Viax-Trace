import React, { useState, useEffect, useRef } from "react";
import {
  useGetSettings,
  useUpdateProfile,
  useUpdatePassword,
  useUpdateSettings,
  getGetSettingsQueryKey,
  getGetMeQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";

type Tab = "perfil" | "financeiro" | "instancias" | "parser" | "tolerancia" | "sobre";

const CICLO_OPTS = [
  { value: 7, label: "Semanal (7 dias)" },
  { value: 14, label: "Quinzenal (14 dias)" },
  { value: 30, label: "Mensal (30 dias)" },
];

export default function Settings() {
  const { user, setUser } = useAuth();
  const queryClient = useQueryClient();
  const { showToast, ToastComponent } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("perfil");
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [name, setName] = useState(user?.name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");
  const [birthDate, setBirthDate] = useState(user?.birthDate ?? "");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { data: settingsData, isLoading: settingsLoading } = useGetSettings({
    query: { queryKey: getGetSettingsQueryKey() },
  });
  const settings = settingsData as any;

  const [parserMode, setParserMode] = useState<"builtin" | "ai">("builtin");
  const [aiProvider, setAiProvider] = useState("");
  const [aiApiKey, setAiApiKey] = useState("");
  const [toleranceMeters, setToleranceMeters] = useState(300);
  const [instanceMode, setInstanceMode] = useState<"builtin" | "geocodebr" | "googlemaps">("builtin");
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState("");
  const [geocodebrUrl, setGeocodebrUrl] = useState("");
  const [mapsKeyTouched, setMapsKeyTouched] = useState(false);
  const [valorPorRota, setValorPorRota] = useState("");
  const [cicloPagamentoDias, setCicloPagamentoDias] = useState(30);
  const [metaMensalRotas, setMetaMensalRotas] = useState("");
  const [despesasFixasMensais, setDespesasFixasMensais] = useState("");

  useEffect(() => {
    if (settings) {
      setParserMode(settings.parserMode ?? "builtin");
      setAiProvider(settings.aiProvider ?? "");
      setAiApiKey(settings.aiApiKey ?? "");
      setToleranceMeters(settings.toleranceMeters ?? 300);
      setInstanceMode(settings.instanceMode ?? "builtin");
      setGoogleMapsApiKey(settings.googleMapsApiKey ?? "");
      setGeocodebrUrl(settings.geocodebrUrl ?? "");
      setValorPorRota(settings.valorPorRota != null ? String(settings.valorPorRota) : "");
      setCicloPagamentoDias(settings.cicloPagamentoDias ?? 30);
      setMetaMensalRotas(settings.metaMensalRotas != null ? String(settings.metaMensalRotas) : "");
      setDespesasFixasMensais(settings.despesasFixasMensais != null ? String(settings.despesasFixasMensais) : "");
    }
  }, [settings]);

  useEffect(() => {
    setName(user?.name ?? "");
    setAvatarUrl(user?.avatarUrl ?? "");
    setBirthDate(user?.birthDate ?? "");
  }, [user]);

  const updateProfileMutation = useUpdateProfile();
  const updatePasswordMutation = useUpdatePassword();
  const updateSettingsMutation = useUpdateSettings();

  const handleProfileSave = () => {
    updateProfileMutation.mutate(
      { data: { name, birthDate: birthDate || null } },
      {
        onSuccess: (data: any) => {
          setUser(data);
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          showToast("Perfil atualizado!", "success");
        },
        onError: () => showToast("Erro ao atualizar perfil."),
      }
    );
  };

  const handleAvatarGallery = async (file: File) => {
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      showToast("Formato inválido. Use JPG, PNG, WEBP ou GIF.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast("Imagem muito grande. Máximo 2MB.");
      return;
    }
    setAvatarUploading(true);
    try {
      const base = (import.meta as any).env?.BASE_URL?.replace(/\/$/, "") ?? "";
      const formData = new FormData();
      formData.append("avatar", file);
      const resp = await fetch(`${base}/api/users/avatar`, { method: "POST", body: formData, credentials: "include" });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        showToast(err.error ?? "Erro ao enviar foto.");
        return;
      }
      const userData = await resp.json();
      setUser(userData);
      setAvatarUrl(userData.avatarUrl ?? "");
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      showToast("Foto atualizada!", "success");
    } catch {
      showToast("Erro ao enviar foto.");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handlePasswordSave = () => {
    if (newPassword !== confirmPassword) { showToast("As senhas não coincidem."); return; }
    if (newPassword.length < 6) { showToast("Senha deve ter no mínimo 6 caracteres."); return; }
    updatePasswordMutation.mutate(
      { data: { currentPassword, newPassword } },
      {
        onSuccess: () => { setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); showToast("Senha alterada!", "success"); },
        onError: (err: any) => showToast(err?.data?.error ?? "Erro ao alterar senha."),
      }
    );
  };

  const handleSettingsSave = () => {
    updateSettingsMutation.mutate(
      {
        data: {
          parserMode, aiProvider: aiProvider || null, aiApiKey: aiApiKey || null, toleranceMeters,
          instanceMode, googleMapsApiKey: googleMapsApiKey || null,
          geocodebrUrl: geocodebrUrl.trim() || null,
          valorPorRota: valorPorRota ? Number(valorPorRota) : null,
          cicloPagamentoDias,
          metaMensalRotas: metaMensalRotas ? Number(metaMensalRotas) : null,
          despesasFixasMensais: despesasFixasMensais ? Number(despesasFixasMensais) : null,
        } as any,
      },
      {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() }); showToast("Configurações salvas!", "success"); },
        onError: () => showToast("Erro ao salvar configurações."),
      }
    );
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "perfil", label: "Perfil" },
    { id: "financeiro", label: "Financeiro" },
    { id: "instancias", label: "Instâncias" },
    { id: "parser", label: "Parser" },
    { id: "tolerancia", label: "Tolerância" },
    { id: "sobre", label: "Sobre" },
  ];

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "0.65rem 0.9rem",
    borderRadius: 8, border: "1px solid var(--border-strong)",
    background: "var(--surface-2)", color: "var(--text)",
    fontSize: "0.85rem", outline: "none", fontFamily: "Poppins",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "0.7rem", fontWeight: 600,
    letterSpacing: "0.09em", textTransform: "uppercase",
    color: "var(--text-faint)", marginBottom: "0.4rem",
  };
  const card: React.CSSProperties = {
    background: "var(--surface)", border: "1px solid var(--border-strong)",
    borderRadius: 14, boxShadow: "0 4px 16px rgba(0,0,0,0.07)",
    overflow: "hidden", marginBottom: "1.25rem",
  };
  const cardHead: React.CSSProperties = { padding: "0.75rem 1.25rem", borderBottom: "1px solid var(--border)" };
  const cardHeadLabel: React.CSSProperties = { fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)" };
  const cardBody: React.CSSProperties = { padding: "1.25rem" };

  const SaveBtn = ({ label, loading, onClick, variant = "primary" }: { label: string; loading: boolean; onClick: () => void; variant?: "primary" | "dark" }) => (
    <button
      onClick={onClick}
      disabled={loading}
      className="btn-full-mobile"
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        padding: "0.65rem 1.5rem", borderRadius: 99,
        background: variant === "dark" ? "var(--text)" : "var(--accent)",
        color: variant === "dark" ? "var(--bg)" : "#fff",
        border: "none", fontSize: "0.82rem", fontWeight: 600,
        cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
      }}
    >
      {loading ? "Salvando..." : label}
    </button>
  );

  return (
    <Layout>
      <div style={{ marginBottom: "1.25rem" }}>
        <h1 style={{ fontSize: "1.3rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "0.2rem" }}>Configurações</h1>
        <p style={{ fontSize: "0.8rem", color: "var(--text-faint)" }}>Perfil, financeiro, instâncias, parser e tolerância.</p>
      </div>

      {/* Tabs */}
      <div className="tabs-row" style={{ display: "flex", gap: "0.15rem", marginBottom: "1.5rem", borderBottom: "1px solid var(--border-strong)" }}>
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: "0.55rem 0.9rem", border: "none", background: "transparent", cursor: "pointer",
            fontSize: "0.78rem", fontWeight: activeTab === tab.id ? 600 : 400,
            color: activeTab === tab.id ? "var(--accent)" : "var(--text-muted)",
            borderBottom: activeTab === tab.id ? "2px solid var(--accent)" : "2px solid transparent",
            transition: "all 200ms", marginBottom: -1, whiteSpace: "nowrap", flexShrink: 0,
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Perfil */}
      {activeTab === "perfil" && (
        <div className="animate-fade-up">
          <div style={card}>
            <div style={cardHead}><span style={cardHeadLabel}>Foto e Informações</span></div>
            <div style={cardBody}>
              <div className="avatar-row" style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "1.25rem" }}>
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div style={{ width: 68, height: 68, borderRadius: "50%", background: "var(--accent-dim)", border: "2px solid var(--border-strong)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", fontWeight: 700, color: "var(--accent)", overflow: "hidden" }}>
                    {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={() => setAvatarUrl("")} /> : (user?.name ?? "U").charAt(0).toUpperCase()}
                  </div>
                  {avatarUploading && (
                    <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%" }} className="animate-spin-ring" />
                    </div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.4rem" }}>Foto de Perfil</div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-faint)", marginBottom: "0.65rem" }}>JPG, PNG, WEBP ou GIF · máx 2 MB</div>
                  <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarGallery(f); e.target.value = ""; }} />
                  <button onClick={() => avatarInputRef.current?.click()} disabled={avatarUploading} style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 1rem", borderRadius: 99, background: "var(--surface-2)", color: "var(--text-muted)", border: "1px solid var(--border-strong)", fontSize: "0.75rem", fontWeight: 500, cursor: "pointer", opacity: avatarUploading ? 0.6 : 1 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>
                    {avatarUploading ? "Enviando..." : "Escolher da galeria"}
                  </button>
                </div>
              </div>
              <div className="form-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div><label style={labelStyle}>Nome</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Data de Nascimento</label><input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} style={inputStyle} /></div>
              </div>
              <div style={{ marginBottom: "0.25rem" }}><label style={labelStyle}>Email</label><input type="email" value={user?.email ?? ""} disabled style={{ ...inputStyle, opacity: 0.6, cursor: "not-allowed" }} /></div>
              <div style={{ marginTop: "1.25rem" }}><SaveBtn label="Salvar Perfil" loading={updateProfileMutation.isPending} onClick={handleProfileSave} /></div>
            </div>
          </div>

          <div style={card}>
            <div style={cardHead}><span style={cardHeadLabel}>Alterar Senha</span></div>
            <div style={cardBody}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem", maxWidth: 400 }}>
                <div><label style={labelStyle}>Senha Atual</label><input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" style={inputStyle} /></div>
                <div><label style={labelStyle}>Nova Senha</label><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" style={inputStyle} /></div>
                <div><label style={labelStyle}>Confirmar Nova Senha</label><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" style={inputStyle} /></div>
                <SaveBtn label="Alterar Senha" loading={updatePasswordMutation.isPending} onClick={handlePasswordSave} variant="dark" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Financeiro */}
      {activeTab === "financeiro" && (
        <div className="animate-fade-up">
          <div style={card}>
            <div style={cardHead}><span style={cardHeadLabel}>Controle de Renda</span></div>
            <div style={cardBody}>
              {settingsLoading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
                  <div style={{ width: 32, height: 32, border: "2px solid var(--border-strong)", borderTopColor: "var(--accent)", borderRadius: "50%" }} className="animate-spin-ring" />
                </div>
              ) : (
                <>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1.5rem", lineHeight: 1.6 }}>
                    Configure sua remuneração por rota e controle suas despesas. As informações são usadas no gráfico financeiro da dashboard.
                  </p>

                  <div className="form-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                    <div>
                      <label style={labelStyle}>Valor por Rota (R$)</label>
                      <input type="number" min="0" step="0.01" value={valorPorRota} onChange={(e) => setValorPorRota(e.target.value)} placeholder="ex: 12.50" style={inputStyle} />
                      <div style={{ fontSize: "0.68rem", color: "var(--text-faint)", marginTop: "0.35rem" }}>Quanto você recebe por rota processada</div>
                    </div>
                    <div>
                      <label style={labelStyle}>Ciclo de Pagamento</label>
                      <select value={cicloPagamentoDias} onChange={(e) => setCicloPagamentoDias(Number(e.target.value))} style={{ ...inputStyle, cursor: "pointer" }}>
                        {CICLO_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      <div style={{ fontSize: "0.68rem", color: "var(--text-faint)", marginTop: "0.35rem" }}>Periodicidade do seu pagamento</div>
                    </div>
                  </div>

                  <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: "1.1rem 1.25rem", marginBottom: "1rem" }}>
                    <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.9rem" }}>Despesas e Metas</div>
                    <div className="form-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      <div>
                        <label style={labelStyle}>Meta Mensal de Rotas</label>
                        <input type="number" min="0" step="1" value={metaMensalRotas} onChange={(e) => setMetaMensalRotas(e.target.value)} placeholder="ex: 200" style={inputStyle} />
                        <div style={{ fontSize: "0.68rem", color: "var(--text-faint)", marginTop: "0.35rem" }}>Quantas rotas quer processar/mês</div>
                      </div>
                      <div>
                        <label style={labelStyle}>Despesas Fixas Mensais (R$)</label>
                        <input type="number" min="0" step="0.01" value={despesasFixasMensais} onChange={(e) => setDespesasFixasMensais(e.target.value)} placeholder="ex: 450.00" style={inputStyle} />
                        <div style={{ fontSize: "0.68rem", color: "var(--text-faint)", marginTop: "0.35rem" }}>Combustível, manutenção, seguro etc.</div>
                      </div>
                    </div>
                  </div>

                  {valorPorRota && cicloPagamentoDias && (
                    <div style={{ background: "var(--accent-dim)", border: "1px solid rgba(212,82,26,0.2)", borderRadius: 10, padding: "0.85rem 1rem", marginBottom: "1.25rem" }}>
                      <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--accent)", marginBottom: "0.3rem" }}>Prévia do seu potencial por ciclo</div>
                      <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
                        Com <strong>{Number(valorPorRota).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>/rota e
                        meta de <strong>{metaMensalRotas || "?"} rotas/mês</strong>,
                        a receita estimada é de <strong>{metaMensalRotas && valorPorRota ? (Number(metaMensalRotas) * Number(valorPorRota) * cicloPagamentoDias / 30).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "?"}</strong> por ciclo.
                      </div>
                    </div>
                  )}

                  <SaveBtn label="Salvar Financeiro" loading={updateSettingsMutation.isPending} onClick={handleSettingsSave} />
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Instâncias */}
      {activeTab === "instancias" && (
        <div className="animate-fade-up">
          <div style={card}>
            <div style={cardHead}><span style={cardHeadLabel}>Instância de Geocodificação</span></div>
            <div style={cardBody}>
              {settingsLoading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
                  <div style={{ width: 32, height: 32, border: "2px solid var(--border-strong)", borderTopColor: "var(--accent)", borderRadius: "50%" }} className="animate-spin-ring" />
                </div>
              ) : (
                <>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1.25rem", lineHeight: 1.6 }}>
                    Escolha o serviço usado para validar endereços. A instância afeta precisão e custo de processamento.
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", marginBottom: "1.25rem" }}>
                    {([
                      {
                        value: "builtin",
                        label: "Padrão Gratuito",
                        badge: "Grátis",
                        badgeColor: "var(--ok)",
                        badgeBg: "var(--ok-dim)",
                        desc: "Photon + Overpass + Nominatim (OSM) + BrasilAPI. Zero custo, sem chave necessária.",
                        icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
                      },
                      {
                        value: "geocodebr",
                        label: "GeocodeR BR",
                        badge: "Local / CNEFE",
                        badgeColor: "#7c3aed",
                        badgeBg: "rgba(124,58,237,0.1)",
                        desc: "Microserviço R via CNEFE/IBGE. Precisão máxima para endereços brasileiros, roda localmente.",
                        icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>,
                      },
                      {
                        value: "googlemaps",
                        label: "Google Maps",
                        badge: "Pay-per-use",
                        badgeColor: "#1565c0",
                        badgeBg: "rgba(21,101,192,0.1)",
                        desc: "Google Maps Geocoding API. Alta precisão global. Requer chave de API paga.",
                        icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
                      },
                    ] as const).map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => { setInstanceMode(opt.value as any); setMapsKeyTouched(false); }}
                        style={{
                          width: "100%", padding: "1rem", borderRadius: 12, textAlign: "left",
                          border: `2px solid ${instanceMode === opt.value ? "var(--accent)" : "var(--border-strong)"}`,
                          background: instanceMode === opt.value ? "var(--accent-dim)" : "var(--surface-2)",
                          cursor: "pointer", transition: "all 200ms",
                          display: "flex", alignItems: "flex-start", gap: "0.85rem",
                        }}
                      >
                        <div style={{ color: instanceMode === opt.value ? "var(--accent)" : "var(--text-muted)", flexShrink: 0, marginTop: 2 }}>{opt.icon}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
                            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: instanceMode === opt.value ? "var(--accent)" : "var(--text)" }}>{opt.label}</span>
                            <span style={{ fontSize: "0.62rem", fontWeight: 700, padding: "0.12rem 0.45rem", borderRadius: 99, background: opt.badgeBg, color: opt.badgeColor, letterSpacing: "0.05em" }}>{opt.badge}</span>
                          </div>
                          <div style={{ fontSize: "0.7rem", color: "var(--text-faint)", lineHeight: 1.5 }}>{opt.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Google Maps key */}
                  {instanceMode === "googlemaps" && (() => {
                    const keyError = mapsKeyTouched && googleMapsApiKey && !googleMapsApiKey.startsWith("AIza")
                      ? 'A chave deve começar com "AIza".'
                      : mapsKeyTouched && googleMapsApiKey && (googleMapsApiKey.length < 35 || googleMapsApiKey.length > 45)
                      ? "Comprimento inválido. Verifique no Google Cloud Console."
                      : null;
                    return (
                      <div style={{ marginBottom: "1.25rem", padding: "1.1rem 1.2rem", borderRadius: 10, background: "rgba(21,101,192,0.05)", border: "1px solid rgba(21,101,192,0.2)" }}>
                        <label style={labelStyle}>Chave de API do Google Maps</label>
                        <input
                          type="password"
                          value={googleMapsApiKey}
                          onChange={(e) => setGoogleMapsApiKey(e.target.value)}
                          onBlur={() => setMapsKeyTouched(true)}
                          placeholder="AIzaSy..."
                          style={{ ...inputStyle, borderColor: keyError ? "var(--accent)" : "var(--border-strong)" }}
                        />
                        {keyError && <div style={{ fontSize: "0.68rem", color: "var(--accent)", marginTop: "0.35rem" }}>{keyError}</div>}
                        {!keyError && googleMapsApiKey && googleMapsApiKey.startsWith("AIza") && (
                          <div style={{ fontSize: "0.68rem", color: "var(--ok)", marginTop: "0.35rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20,6 9,17 4,12"/></svg>
                            Formato de chave válido
                          </div>
                        )}
                        <p style={{ fontSize: "0.68rem", color: "var(--text-faint)", marginTop: "0.45rem", lineHeight: 1.5 }}>
                          A chave é armazenada de forma segura. Habilite a <strong>Geocoding API</strong> no Google Cloud Console.
                        </p>
                      </div>
                    );
                  })()}

                  {/* geocodebr info + URL field */}
                  {instanceMode === "geocodebr" && (
                    <div style={{ marginBottom: "1.25rem", padding: "1.1rem 1.2rem", borderRadius: 10, background: "rgba(124,58,237,0.05)", border: "1px solid rgba(124,58,237,0.2)" }}>
                      <label style={labelStyle}>URL do seu microserviço GeocodeR BR</label>
                      <input
                        type="text"
                        value={geocodebrUrl}
                        onChange={(e) => setGeocodebrUrl(e.target.value)}
                        placeholder="https://meu-geocodebr.exemplo.com"
                        autoComplete="off"
                        spellCheck={false}
                        style={inputStyle}
                      />
                      {geocodebrUrl.trim() && !/^https?:\/\//i.test(geocodebrUrl.trim()) && (
                        <div style={{ fontSize: "0.68rem", color: "var(--accent)", marginTop: "0.35rem" }}>
                          A URL precisa começar com http:// ou https://
                        </div>
                      )}
                      <div style={{ fontSize: "0.68rem", color: "var(--text-faint)", marginTop: "0.55rem", lineHeight: 1.6 }}>
                        Você precisa rodar o microserviço por conta própria. Quando configurado, ele é usado como <strong>fallback</strong> para endereços que Photon/Overpass/Nominatim não conseguiram localizar (ideal para interior do país).
                      </div>
                      <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#7c3aed", marginTop: "0.85rem", marginBottom: "0.4rem" }}>Via Docker</div>
                      <code style={{ background: "var(--surface-2)", padding: "0.4rem 0.6rem", borderRadius: 6, fontSize: "0.66rem", display: "block", wordBreak: "break-all", lineHeight: 1.5 }}>
                        docker run -d -p 8002:8002 -v geocodebr-cache:/root/.cache viax-geocodebr
                      </code>
                      <div style={{ fontSize: "0.66rem", color: "var(--text-faint)", marginTop: "0.5rem", lineHeight: 1.55 }}>
                        Veja o <code style={{ background: "var(--surface-2)", padding: "0 0.25rem", borderRadius: 3 }}>artifacts/geocodebr-service/README.md</code> para instruções completas. Para expor publicamente, use Cloudflare Tunnel ou ngrok.
                      </div>
                    </div>
                  )}

                  <SaveBtn label="Salvar Instância" loading={updateSettingsMutation.isPending} onClick={handleSettingsSave} />
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Parser */}
      {activeTab === "parser" && (
        <div className="animate-fade-up">
          <div style={card}>
            <div style={cardHead}><span style={cardHeadLabel}>Configuração do Parser</span></div>
            <div style={cardBody}>
              {settingsLoading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
                  <div style={{ width: 32, height: 32, border: "2px solid var(--border-strong)", borderTopColor: "var(--accent)", borderRadius: "50%" }} className="animate-spin-ring" />
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: "1.5rem" }}>
                    <label style={{ ...labelStyle, marginBottom: "0.75rem" }}>Modo de Processamento</label>
                    <div className="parser-cards" style={{ display: "flex", gap: "0.75rem" }}>
                      {[
                        { value: "builtin", label: "Parser Embutido", desc: "Algoritmo próprio, offline, zero custo adicional" },
                        { value: "ai", label: "Inteligência Artificial", desc: "Maior precisão usando IA externa via API" },
                      ].map((opt) => (
                        <button key={opt.value} onClick={() => setParserMode(opt.value as any)} style={{ flex: 1, padding: "0.9rem", borderRadius: 10, textAlign: "left", border: `1px solid ${parserMode === opt.value ? "var(--accent)" : "var(--border-strong)"}`, background: parserMode === opt.value ? "var(--accent-dim)" : "var(--surface-2)", cursor: "pointer", transition: "all 200ms" }}>
                          <div style={{ fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.25rem", color: parserMode === opt.value ? "var(--accent)" : "var(--text)" }}>{opt.label}</div>
                          <div style={{ fontSize: "0.7rem", color: "var(--text-faint)" }}>{opt.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  {parserMode === "ai" && (
                    <div style={{ marginBottom: "1.5rem", padding: "1.1rem 1.2rem", borderRadius: 10, background: "var(--surface-2)", border: "1px solid var(--border-strong)" }}>
                      <div style={{ marginBottom: "0.9rem" }}>
                        <label style={labelStyle}>Provedor de IA</label>
                        <select value={aiProvider} onChange={(e) => setAiProvider(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                          <option value="">Selecione um provedor</option>
                          <option value="openai">OpenAI (GPT-4o mini)</option>
                          <option value="anthropic">Anthropic (Claude Haiku)</option>
                          <option value="google">Google (Gemini 1.5 Flash)</option>
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Chave de API</label>
                        <input type="password" value={aiApiKey} onChange={(e) => setAiApiKey(e.target.value)} placeholder="sk-... ou AIza..." style={inputStyle} />
                      </div>
                    </div>
                  )}
                  <SaveBtn label="Salvar Parser" loading={updateSettingsMutation.isPending} onClick={handleSettingsSave} />
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tolerância */}
      {activeTab === "tolerancia" && (
        <div className="animate-fade-up">
          <div style={card}>
            <div style={cardHead}><span style={cardHeadLabel}>Tolerância de Coordenadas</span></div>
            <div style={cardBody}>
              {settingsLoading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
                  <div style={{ width: 32, height: 32, border: "2px solid var(--border-strong)", borderTopColor: "var(--accent)", borderRadius: "50%" }} className="animate-spin-ring" />
                </div>
              ) : (
                <div style={{ maxWidth: 540 }}>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1.5rem", lineHeight: 1.6 }}>
                    Distância máxima (metros) entre a coordenada GPS do arquivo e o endereço oficial para ser considerado correto.
                    Para <strong>avenidas extensas</strong> e <strong>comércios</strong>, o sistema sempre exige validação por distância quando GPS está disponível.
                  </p>
                  <div style={{ marginBottom: "2rem" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                      <label style={labelStyle}>Distância de Tolerância</label>
                      <span style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--accent)" }}>{toleranceMeters}m</span>
                    </div>
                    <input type="range" min={100} max={5000} step={100} value={toleranceMeters} onChange={(e) => setToleranceMeters(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--accent)", cursor: "pointer" }} />
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.4rem" }}>
                      <span style={{ fontSize: "0.68rem", color: "var(--text-faint)" }}>100m · Rigoroso</span>
                      <span style={{ fontSize: "0.68rem", color: "var(--text-faint)" }}>5000m · Flexível</span>
                    </div>
                  </div>
                  <div style={{ padding: "0.9rem 1.1rem", borderRadius: 10, background: "var(--surface-2)", border: "1px solid var(--border)", marginBottom: "1.5rem" }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.3rem" }}>
                      {toleranceMeters <= 200 ? "Rigoroso" : toleranceMeters <= 800 ? "Moderado" : toleranceMeters <= 2000 ? "Flexível" : "Muito Flexível"}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-faint)" }}>
                      {toleranceMeters <= 200 ? "Aceita apenas endereços muito próximos da coordenada. Mais nuances detectadas."
                        : toleranceMeters <= 800 ? "Configuração balanceada para uso geral em áreas urbanas."
                        : toleranceMeters <= 2000 ? "Aceita divergências maiores. Útil em áreas rurais ou GPS impreciso."
                        : "Muito permissivo. Pode reduzir a qualidade da validação."}
                    </div>
                  </div>
                  <SaveBtn label="Salvar Tolerância" loading={updateSettingsMutation.isPending} onClick={handleSettingsSave} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sobre */}
      {activeTab === "sobre" && (
        <div className="animate-fade-up">
          {/* Hero block */}
          <div style={{ ...card, background: "linear-gradient(135deg, var(--surface) 0%, var(--surface-2) 100%)", marginBottom: "1.25rem" }}>
            <div style={{ padding: "2rem 1.75rem", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "0.6rem" }}>
                    <span style={{ fontSize: "1.4rem", fontWeight: 800, letterSpacing: "-0.03em" }}>ViaX<span style={{ opacity: 0.4, fontWeight: 300 }}>:</span>Trace</span>
                    <span style={{ fontSize: "0.62rem", fontWeight: 700, padding: "0.15rem 0.55rem", borderRadius: 5, background: "var(--accent-dim)", color: "var(--accent)", letterSpacing: "0.06em" }}>v8.0</span>
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>Auditoria inteligente de rotas de entrega</div>
                </div>
              </div>
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.7, maxWidth: 620, margin: 0 }}>
                O ViaX:Trace nasceu para ajudar motoristas a entenderem com clareza as nuances do trajeto — termo que usamos para endereços cujas coordenadas da rota não batem com o local correto. O sistema valida cada coordenada GPS e confere se o nome da rua informado condiz com o nome da rua no mapa. Com o tempo, fomos aprimorando o motor e somando novas funções, dando origem à plataforma de auditoria que você usa hoje.
              </p>
            </div>
          </div>

          {/* Links */}
          <div style={card}>
            <div style={cardHead}><span style={cardHeadLabel}>Repositório & Documentação</span></div>
            <div style={cardBody}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                {[
                  {
                    href: "https://github.com/ViaXTrace/Viax-Trace",
                    icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/></svg>,
                    label: "GitHub — ViaXTrace/Viax-Trace",
                    sub: "Código-fonte, issues, pull requests e releases",
                    badge: "Open Source",
                    badgeColor: "#16a34a",
                    badgeBg: "rgba(22,163,74,0.1)",
                  },
                  {
                    href: "https://github.com/ViaXTrace/Viax-Trace/blob/main/README.md",
                    icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10,9 9,9 8,9"/></svg>,
                    label: "Documentação (README)",
                    sub: "Guia de instalação, configuração e uso",
                    badge: "Docs",
                    badgeColor: "#1d4ed8",
                    badgeBg: "rgba(29,78,216,0.1)",
                  },
                  {
                    href: "https://github.com/ViaXTrace/Viax-Trace/issues",
                    icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
                    label: "Issues & Suporte",
                    sub: "Reporte bugs, solicite funcionalidades ou tire dúvidas",
                    badge: "Issues",
                    badgeColor: "#b45309",
                    badgeBg: "rgba(180,83,9,0.1)",
                  },
                  {
                    href: "https://github.com/ViaXTrace/Viax-Trace/releases",
                    icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
                    label: "Releases & Changelog",
                    sub: "Histórico de versões, notas de atualização",
                    badge: "v8.0",
                    badgeColor: "var(--accent)",
                    badgeBg: "var(--accent-dim)",
                  },
                ].map((item) => (
                  <a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: "0.9rem",
                      padding: "0.85rem 1rem", borderRadius: 10,
                      border: "1px solid var(--border)", background: "var(--surface-2)",
                      cursor: "pointer", transition: "border-color 150ms, background 150ms",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--accent)"; (e.currentTarget as HTMLDivElement).style.background = "var(--accent-dim)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLDivElement).style.background = "var(--surface-2)"; }}
                    >
                      <div style={{ color: "var(--text-muted)", flexShrink: 0 }}>{item.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text)" }}>{item.label}</div>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-faint)", marginTop: "0.1rem" }}>{item.sub}</div>
                      </div>
                      <span style={{ fontSize: "0.6rem", fontWeight: 700, padding: "0.12rem 0.5rem", borderRadius: 99, background: item.badgeBg, color: item.badgeColor, letterSpacing: "0.05em", whiteSpace: "nowrap", flexShrink: 0 }}>{item.badge}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--text-faint)", flexShrink: 0 }}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Stack tecnológico */}
          <div style={card}>
            <div style={cardHead}><span style={cardHeadLabel}>Stack Tecnológico</span></div>
            <div style={cardBody}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.6rem" }}>
                {[
                  { layer: "Frontend", tech: "React 18 + Vite", detail: "TypeScript, Tailwind CSS, Wouter" },
                  { layer: "Backend", tech: "Express 5", detail: "TypeScript, REST API, pino logger" },
                  { layer: "Banco de Dados", tech: "PostgreSQL", detail: "Drizzle ORM, migrações automáticas" },
                  { layer: "Monorepo", tech: "pnpm workspaces", detail: "Libs compartilhadas, builds isolados" },
                  { layer: "Geocod. Brasil (CEP)", tech: "BrasilAPI v2", detail: "Primário BR — IBGE/Correios, lat/lon" },
                  { layer: "Geocod. Brasil (CEP)", tech: "AwesomeAPI CEP", detail: "Fallback BR — lat/lon gratuito" },
                  { layer: "Geocod. Global", tech: "Photon (Komoot)", detail: "Sem rate limit, dados OSM" },
                  { layer: "Geocod. Global", tech: "Overpass + Nominatim", detail: "Fallback — geometria OSM precisa" },
                  { layer: "Premium opcional", tech: "Google Maps API", detail: "Máxima precisão, pay-per-use" },
                ].map((item, i) => (
                  <div key={i} style={{ padding: "0.75rem 0.9rem", borderRadius: 10, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: "0.25rem" }}>{item.layer}</div>
                    <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.15rem" }}>{item.tech}</div>
                    <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>{item.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Instalação rápida */}
          <div style={card}>
            <div style={cardHead}><span style={cardHeadLabel}>Instalação</span></div>
            <div style={cardBody}>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1rem", lineHeight: 1.6 }}>
                Scripts de instalação automática estão disponíveis no repositório para Linux, macOS e Windows. Cada script instala dependências, configura o banco e inicia o sistema completo. Para uso normal do app, nada disso é necessário — o backend oficial já está hospedado.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {[
                  {
                    platform: "Linux / macOS",
                    cmd: "curl -fsSL https://raw.githubusercontent.com/ViaXTrace/Viax-Trace/main/install.sh | bash",
                    icon: (
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="3" width="20" height="14" rx="2"/><polyline points="8,21 12,17 16,21"/><line x1="12" y1="17" x2="12" y2="21"/>
                      </svg>
                    ),
                  },
                  {
                    platform: "Windows (PowerShell)",
                    cmd: "iwr -useb https://raw.githubusercontent.com/ViaXTrace/Viax-Trace/main/install.ps1 | iex",
                    icon: (
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
                        <polyline points="9,9 12,12 9,15"/><line x1="13" y1="15" x2="15" y2="15"/>
                      </svg>
                    ),
                  },
                  {
                    platform: "Docker",
                    cmd: "docker compose up -d",
                    icon: (
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="6" width="20" height="12" rx="2"/><line x1="6" y1="10" x2="6" y2="14"/><line x1="10" y1="10" x2="10" y2="14"/><line x1="14" y1="10" x2="14" y2="14"/><line x1="18" y1="10" x2="18" y2="14"/>
                      </svg>
                    ),
                  },
                ].map((item) => (
                  <div key={item.platform} style={{ padding: "0.85rem 1rem", borderRadius: 10, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.45rem" }}>
                      <span style={{ color: "var(--text-muted)" }}>{item.icon}</span>
                      <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text)" }}>{item.platform}</span>
                    </div>
                    <div style={{ fontFamily: "monospace", fontSize: "0.7rem", color: "var(--text-muted)", background: "var(--bg)", padding: "0.45rem 0.7rem", borderRadius: 6, border: "1px solid var(--border)", overflowX: "auto", wordBreak: "break-all" }}>
                      {item.cmd}
                    </div>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: "0.72rem", color: "var(--text-faint)", marginTop: "0.9rem", lineHeight: 1.5 }}>
                Pré-requisitos: <strong>Node.js 18+</strong>, <strong>pnpm</strong> e <strong>PostgreSQL 14+</strong>. O script instala automaticamente o que estiver faltando (requer conexão com internet).
              </p>
            </div>
          </div>

          {/* Licença e versão */}
          <div style={{ ...card, marginBottom: 0 }}>
            <div style={cardHead}><span style={cardHeadLabel}>Licença & Versão</span></div>
            <div style={{ ...cardBody, display: "flex", flexWrap: "wrap", gap: "1.5rem" }}>
              <div>
                <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.3rem" }}>Licença</div>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text)" }}>MIT License</div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>Uso livre, comercial e pessoal</div>
              </div>
              <div>
                <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.3rem" }}>Versão Atual</div>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--accent)" }}>v8.0 — estável</div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>BrasilAPI v2 + Photon global</div>
              </div>
              <div>
                <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.3rem" }}>Ambiente</div>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text)" }}>Node.js 18+</div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>pnpm · PostgreSQL 14+</div>
              </div>
              <div>
                <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.3rem" }}>Repositório</div>
                <a href="https://github.com/ViaXTrace/Viax-Trace" target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--accent)", textDecoration: "none" }}>
                  github.com/ViaXTrace/Viax-Trace
                </a>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>Fork & contribua!</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {ToastComponent}
    </Layout>
  );
}
