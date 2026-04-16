import React, { useState, useEffect } from "react";
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

type Tab = "perfil" | "parser" | "tolerancia";

export default function Settings() {
  const { user, setUser } = useAuth();
  const queryClient = useQueryClient();
  const { showToast, ToastComponent } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("perfil");

  // Profile state
  const [name, setName] = useState(user?.name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");
  const [birthDate, setBirthDate] = useState(user?.birthDate ?? "");

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Settings state
  const { data: settingsData, isLoading: settingsLoading } = useGetSettings({
    query: { queryKey: getGetSettingsQueryKey() },
  });
  const settings = settingsData as any;

  const [parserMode, setParserMode] = useState<"builtin" | "ai">("builtin");
  const [aiProvider, setAiProvider] = useState("");
  const [aiApiKey, setAiApiKey] = useState("");
  const [toleranceMeters, setToleranceMeters] = useState(300);

  useEffect(() => {
    if (settings) {
      setParserMode(settings.parserMode ?? "builtin");
      setAiProvider(settings.aiProvider ?? "");
      setAiApiKey(settings.aiApiKey ?? "");
      setToleranceMeters(settings.toleranceMeters ?? 300);
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
      { data: { name, avatarUrl: avatarUrl || null, birthDate: birthDate || null } },
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

  const handlePasswordSave = () => {
    if (newPassword !== confirmPassword) {
      showToast("As senhas novas nao coincidem.");
      return;
    }
    if (newPassword.length < 6) {
      showToast("A nova senha deve ter no minimo 6 caracteres.");
      return;
    }
    updatePasswordMutation.mutate(
      { data: { currentPassword, newPassword } },
      {
        onSuccess: () => {
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
          showToast("Senha alterada com sucesso!", "success");
        },
        onError: (err: any) => showToast(err?.data?.error ?? "Erro ao alterar senha."),
      }
    );
  };

  const handleSettingsSave = () => {
    updateSettingsMutation.mutate(
      { data: { parserMode, aiProvider: aiProvider || null, aiApiKey: aiApiKey || null, toleranceMeters } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
          showToast("Configuracoes salvas!", "success");
        },
        onError: () => showToast("Erro ao salvar configuracoes."),
      }
    );
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "perfil", label: "Perfil" },
    { id: "parser", label: "Parser" },
    { id: "tolerancia", label: "Tolerancia" },
  ];

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "0.65rem 0.9rem",
    borderRadius: 8, border: "1px solid var(--border-strong)",
    background: "var(--surface-2)", color: "var(--text)",
    fontSize: "0.85rem", outline: "none", fontFamily: "Poppins",
  };

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "0.72rem", fontWeight: 600,
    letterSpacing: "0.08em", textTransform: "uppercase",
    color: "var(--text-faint)", marginBottom: "0.4rem",
  };

  const sectionStyle: React.CSSProperties = {
    background: "var(--surface)", border: "1px solid var(--border-strong)",
    borderRadius: 14, boxShadow: "0 4px 16px rgba(0,0,0,0.07)",
    overflow: "hidden", marginBottom: "1.25rem",
  };

  const sectionHeadStyle: React.CSSProperties = {
    padding: "0.85rem 1.25rem", borderBottom: "1px solid var(--border)",
  };

  const sectionBodyStyle: React.CSSProperties = {
    padding: "1.5rem 1.25rem",
  };

  return (
    <Layout>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "0.3rem" }}>
          Configuracoes
        </h1>
        <p style={{ fontSize: "0.82rem", color: "var(--text-faint)" }}>
          Gerencie seu perfil, modo de parser e tolerancia de coordenadas.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.35rem", marginBottom: "1.5rem", borderBottom: "1px solid var(--border-strong)", paddingBottom: "0" }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "0.6rem 1.25rem",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontSize: "0.82rem",
              fontWeight: activeTab === tab.id ? 600 : 400,
              color: activeTab === tab.id ? "var(--accent)" : "var(--text-muted)",
              borderBottom: activeTab === tab.id ? "2px solid var(--accent)" : "2px solid transparent",
              transition: "all 200ms",
              marginBottom: -1,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Perfil */}
      {activeTab === "perfil" && (
        <div className="animate-fade-up">
          {/* Profile info */}
          <div style={sectionStyle}>
            <div style={sectionHeadStyle}>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                Informacoes do Perfil
              </span>
            </div>
            <div style={sectionBodyStyle}>
              {/* Avatar */}
              <div style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "1.25rem" }}>
                <div style={{
                  width: 64, height: 64, borderRadius: "50%",
                  background: "var(--accent-dim)", border: "2px solid var(--border-strong)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "1.4rem", fontWeight: 700, color: "var(--accent)",
                  overflow: "hidden", flexShrink: 0,
                }}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={() => setAvatarUrl("")} />
                  ) : (
                    (user?.name ?? "U").charAt(0).toUpperCase()
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>URL da Foto de Perfil</label>
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://exemplo.com/foto.jpg"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div>
                  <label style={labelStyle}>Nome</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Data de Nascimento</label>
                  <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} style={inputStyle} />
                </div>
              </div>

              <div style={{ marginBottom: "0.25rem" }}>
                <label style={labelStyle}>Email</label>
                <input type="email" value={user?.email ?? ""} disabled style={{ ...inputStyle, opacity: 0.6, cursor: "not-allowed" }} />
              </div>

              <div style={{ marginTop: "1.25rem" }}>
                <button
                  onClick={handleProfileSave}
                  disabled={updateProfileMutation.isPending}
                  style={{
                    padding: "0.65rem 1.5rem", borderRadius: 99,
                    background: "var(--accent)", color: "#fff",
                    border: "none", fontSize: "0.82rem", fontWeight: 600,
                    cursor: "pointer", opacity: updateProfileMutation.isPending ? 0.7 : 1,
                  }}
                >
                  {updateProfileMutation.isPending ? "Salvando..." : "Salvar Perfil"}
                </button>
              </div>
            </div>
          </div>

          {/* Password change */}
          <div style={sectionStyle}>
            <div style={sectionHeadStyle}>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                Alterar Senha
              </span>
            </div>
            <div style={sectionBodyStyle}>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: 400 }}>
                <div>
                  <label style={labelStyle}>Senha Atual</label>
                  <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Nova Senha</label>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Confirmar Nova Senha</label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" style={inputStyle} />
                </div>
                <div>
                  <button
                    onClick={handlePasswordSave}
                    disabled={updatePasswordMutation.isPending}
                    style={{
                      padding: "0.65rem 1.5rem", borderRadius: 99,
                      background: "var(--text)", color: "var(--bg)",
                      border: "none", fontSize: "0.82rem", fontWeight: 600,
                      cursor: "pointer", opacity: updatePasswordMutation.isPending ? 0.7 : 1,
                    }}
                  >
                    {updatePasswordMutation.isPending ? "Salvando..." : "Alterar Senha"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Parser */}
      {activeTab === "parser" && (
        <div className="animate-fade-up">
          <div style={sectionStyle}>
            <div style={sectionHeadStyle}>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                Configuracao do Parser
              </span>
            </div>
            <div style={sectionBodyStyle}>
              {settingsLoading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
                  <div style={{ width: 32, height: 32, border: "2px solid var(--border-strong)", borderTopColor: "var(--accent)", borderRadius: "50%" }} className="animate-spin-ring" />
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: "1.75rem" }}>
                    <label style={{ ...labelStyle, marginBottom: "0.75rem" }}>Modo de Processamento</label>
                    <div style={{ display: "flex", gap: "0.75rem" }}>
                      {[
                        { value: "builtin", label: "Parser Embutido", desc: "Algoritmo proprio, offline, zero custo adicional" },
                        { value: "ai", label: "Inteligencia Artificial", desc: "Maior precisao usando IA externa via API" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setParserMode(opt.value as "builtin" | "ai")}
                          style={{
                            flex: 1, padding: "1rem", borderRadius: 10, textAlign: "left",
                            border: `1px solid ${parserMode === opt.value ? "var(--accent)" : "var(--border-strong)"}`,
                            background: parserMode === opt.value ? "var(--accent-dim)" : "var(--surface-2)",
                            cursor: "pointer", transition: "all 200ms",
                          }}
                        >
                          <div style={{
                            fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.3rem",
                            color: parserMode === opt.value ? "var(--accent)" : "var(--text)",
                          }}>{opt.label}</div>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-faint)" }}>{opt.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {parserMode === "ai" && (
                    <div style={{ marginBottom: "1.5rem", padding: "1.25rem", borderRadius: 10, background: "var(--surface-2)", border: "1px solid var(--border-strong)" }}>
                      <div style={{ marginBottom: "1rem" }}>
                        <label style={labelStyle}>Provedor de IA</label>
                        <select
                          value={aiProvider}
                          onChange={(e) => setAiProvider(e.target.value)}
                          style={{ ...inputStyle, cursor: "pointer" }}
                        >
                          <option value="">Selecione um provedor</option>
                          <option value="openai">OpenAI (GPT-4)</option>
                          <option value="anthropic">Anthropic (Claude)</option>
                          <option value="google">Google (Gemini)</option>
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Chave de API</label>
                        <input
                          type="password"
                          value={aiApiKey}
                          onChange={(e) => setAiApiKey(e.target.value)}
                          placeholder="sk-... ou AIza..."
                          style={inputStyle}
                        />
                        <p style={{ fontSize: "0.7rem", color: "var(--text-faint)", marginTop: "0.4rem" }}>
                          A chave e armazenada de forma segura e usada somente para processar seus arquivos.
                        </p>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleSettingsSave}
                    disabled={updateSettingsMutation.isPending}
                    style={{
                      padding: "0.65rem 1.5rem", borderRadius: 99,
                      background: "var(--accent)", color: "#fff",
                      border: "none", fontSize: "0.82rem", fontWeight: 600,
                      cursor: "pointer", opacity: updateSettingsMutation.isPending ? 0.7 : 1,
                    }}
                  >
                    {updateSettingsMutation.isPending ? "Salvando..." : "Salvar Configuracoes"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Tolerancia */}
      {activeTab === "tolerancia" && (
        <div className="animate-fade-up">
          <div style={sectionStyle}>
            <div style={sectionHeadStyle}>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                Tolerancia de Coordenadas
              </span>
            </div>
            <div style={sectionBodyStyle}>
              {settingsLoading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
                  <div style={{ width: 32, height: 32, border: "2px solid var(--border-strong)", borderTopColor: "var(--accent)", borderRadius: "50%" }} className="animate-spin-ring" />
                </div>
              ) : (
                <>
                  <div style={{ maxWidth: 540 }}>
                    <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "1.75rem", lineHeight: 1.6 }}>
                      Define a distancia maxima (em metros) entre a coordenada GPS e o endereco oficial aceito como correto.
                      Valores menores sao mais rigorosos; valores maiores aceitam maiores divergencias geograficas.
                    </p>

                    <div style={{ marginBottom: "2rem" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                        <label style={labelStyle}>Distancia de Tolerancia</label>
                        <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--accent)", letterSpacing: "-0.01em" }}>
                          {toleranceMeters}m
                        </span>
                      </div>

                      <input
                        type="range"
                        min={100}
                        max={5000}
                        step={100}
                        value={toleranceMeters}
                        onChange={(e) => setToleranceMeters(Number(e.target.value))}
                        style={{ width: "100%", accentColor: "var(--accent)", cursor: "pointer" }}
                      />

                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.4rem" }}>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-faint)" }}>100m — Muito rigoroso</span>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-faint)" }}>5000m — Muito flexivel</span>
                      </div>
                    </div>

                    {/* Visual hint */}
                    <div style={{ padding: "1rem 1.25rem", borderRadius: 10, background: "var(--surface-2)", border: "1px solid var(--border-strong)", marginBottom: "1.5rem" }}>
                      <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.4rem", fontWeight: 600 }}>
                        {toleranceMeters <= 200 ? "Rigoroso" : toleranceMeters <= 800 ? "Moderado" : toleranceMeters <= 2000 ? "Flexivel" : "Muito Flexivel"}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-faint)" }}>
                        {toleranceMeters <= 200
                          ? "Apenas enderecos muito proximos da coordenada sao aceitos. Mais nuances detectadas."
                          : toleranceMeters <= 800
                          ? "Configuracao balanceada para uso geral em areas urbanas."
                          : toleranceMeters <= 2000
                          ? "Aceita divergencias maiores. Util em areas rurais ou com GPS impreciso."
                          : "Muito permissivo. Pode reduzir a qualidade da validacao."}
                      </div>
                    </div>

                    <button
                      onClick={handleSettingsSave}
                      disabled={updateSettingsMutation.isPending}
                      style={{
                        padding: "0.65rem 1.5rem", borderRadius: 99,
                        background: "var(--accent)", color: "#fff",
                        border: "none", fontSize: "0.82rem", fontWeight: 600,
                        cursor: "pointer", opacity: updateSettingsMutation.isPending ? 0.7 : 1,
                      }}
                    >
                      {updateSettingsMutation.isPending ? "Salvando..." : "Salvar Tolerancia"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {ToastComponent}
    </Layout>
  );
}
