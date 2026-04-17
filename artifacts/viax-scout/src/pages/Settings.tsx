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

type Tab = "perfil" | "financeiro" | "instancias" | "parser" | "tolerancia";

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
  const [instanceMode, setInstanceMode] = useState<"builtin" | "googlemaps">("builtin");
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState("");
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
                  <div className="instance-cards" style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem" }}>
                    {[
                      { value: "builtin", label: "Padrão Gratuito", badge: "Grátis", badgeColor: "var(--ok)", badgeBg: "var(--ok-dim)", desc: "Nominatim/OSM + BrasilAPI + Photon. Zero custo adicional, rate limit de 1 req/s.", icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> },
                      { value: "googlemaps", label: "Google Maps", badge: "Pay-per-use", badgeColor: "#1565c0", badgeBg: "rgba(21,101,192,0.1)", desc: "Google Maps Geocoding API. Maior precisão para endereços brasileiros. Requer chave de API.", icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> },
                    ].map((opt) => (
                      <button key={opt.value} onClick={() => setInstanceMode(opt.value as any)} style={{ flex: 1, padding: "1rem", borderRadius: 12, textAlign: "left", border: `2px solid ${instanceMode === opt.value ? "var(--accent)" : "var(--border-strong)"}`, background: instanceMode === opt.value ? "var(--accent-dim)" : "var(--surface-2)", cursor: "pointer", transition: "all 200ms" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                          <div style={{ color: instanceMode === opt.value ? "var(--accent)" : "var(--text-muted)" }}>{opt.icon}</div>
                          <span style={{ fontSize: "0.62rem", fontWeight: 700, padding: "0.12rem 0.45rem", borderRadius: 99, background: opt.badgeBg, color: opt.badgeColor, letterSpacing: "0.05em" }}>{opt.badge}</span>
                        </div>
                        <div style={{ fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.3rem", color: instanceMode === opt.value ? "var(--accent)" : "var(--text)" }}>{opt.label}</div>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-faint)", lineHeight: 1.5 }}>{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                  {instanceMode === "googlemaps" && (
                    <div style={{ marginBottom: "1.5rem", padding: "1.1rem 1.2rem", borderRadius: 10, background: "var(--surface-2)", border: "1px solid var(--border-strong)" }}>
                      <label style={labelStyle}>Chave de API do Google Maps</label>
                      <input type="password" value={googleMapsApiKey} onChange={(e) => setGoogleMapsApiKey(e.target.value)} placeholder="AIzaSy..." style={inputStyle} />
                      <p style={{ fontSize: "0.68rem", color: "var(--text-faint)", marginTop: "0.45rem", lineHeight: 1.5 }}>A chave é armazenada de forma segura. Habilite a <strong>Geocoding API</strong> no Google Cloud Console.</p>
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

      {ToastComponent}
    </Layout>
  );
}
