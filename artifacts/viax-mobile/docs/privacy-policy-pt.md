# Política de Privacidade — ViaX:Trace

**Versão:** 1.0
**Última atualização:** 24 de abril de 2026
**Responsável:** ViaX (esmagafetos / equipe ViaX:Trace)
**Contato para questões de privacidade:** *(preencher: e-mail oficial, ex.: privacidade@viax.com.br)*

---

## 1. Quem somos e o que é o ViaX:Trace

O **ViaX:Trace** é um aplicativo Android voltado para entregadores e operações
logísticas brasileiras. Ele audita planilhas de rotas (XLSX/CSV) de aplicativos
de entrega — identificando endereços problemáticos ("nuances") como CEPs
inválidos, ruas inexistentes, números fora do intervalo, e exporta o resultado
em CSV para o usuário.

Esta política descreve **quais dados coletamos, por que coletamos, com quem
compartilhamos e quais são seus direitos** sob a Lei Geral de Proteção de
Dados (LGPD — Lei nº 13.709/2018).

## 2. Quais dados coletamos

| Categoria | Dado específico | Finalidade | Base legal (LGPD) |
|---|---|---|---|
| **Cadastro** | Nome, e-mail, senha (hash) | Login e identificação no app | Execução de contrato (art. 7º, V) |
| **Conteúdo do usuário** | Planilhas XLSX/CSV enviadas para auditoria | Processar a auditoria solicitada | Execução de contrato (art. 7º, V) |
| **Histórico de uso** | Resumo das auditorias passadas (totais, contagens) | Mostrar histórico ao próprio usuário | Execução de contrato (art. 7º, V) |
| **Diagnóstico técnico** | Logs de erro (Sentry): nome do erro, stack trace, sistema operacional, versão do app — **sem PII do usuário** | Identificar e corrigir falhas do app | Legítimo interesse (art. 7º, IX) |
| **Sessão** | Token de autenticação | Manter sessão entre aberturas do app | Execução de contrato |

**O que NÃO coletamos:**
- Localização GPS
- Lista de contatos
- Câmera, microfone ou fotos da galeria
- Identificadores de publicidade (AAID/IDFA)
- Dados de pagamento (não há cobrança no app)

## 3. Onde os dados ficam armazenados

- **Login e histórico de auditorias:** servidores próprios da ViaX, hospedados
  em provedor de nuvem com criptografia em trânsito (HTTPS/TLS) e em repouso.
- **Token de sessão no celular:** armazenado no `Expo SecureStore`, que usa o
  Android Keystore (criptografia de hardware quando disponível).
- **Cache de leitura no celular:** armazenado localmente via `AsyncStorage`,
  apenas para tornar o app responsivo offline. Pode ser limpo a qualquer
  momento em *Configurações do Android → Apps → ViaX:Trace → Armazenamento →
  Limpar dados*.
- **Planilhas processadas:** o conteúdo da planilha é enviado ao servidor
  apenas para a auditoria solicitada e descartado após o processamento. Apenas
  o resumo agregado (contagens por tipo de nuance) fica salvo no histórico.

## 4. Compartilhamento com terceiros

Compartilhamos dados estritamente necessários com os seguintes operadores:

| Operador | Dados | Finalidade | Localização |
|---|---|---|---|
| **Sentry** (Functional Software, Inc.) | Stack traces, versão do app, ID do usuário (apenas para correlacionar crashes) | Monitoramento de falhas | EUA |
| **Expo Application Services** | Versão JS do app (EAS Update), build artifacts | Distribuição de atualizações | EUA |
| **Google Play Services** | Identificador do dispositivo (Play Store) | Distribuição do app | EUA / Internacional |

**Não vendemos, não alugamos, não cedemos seus dados para fins de marketing
ou publicidade.**

## 5. Retenção

- **Conta ativa:** mantemos seus dados enquanto sua conta estiver ativa.
- **Conta excluída:** após pedido de exclusão (item 7), removemos dados de
  cadastro e histórico em até **30 dias**.
- **Logs técnicos (Sentry):** retidos por **90 dias** e então excluídos.

## 6. Segurança

- Criptografia em trânsito (TLS 1.2+) em toda comunicação com nossos servidores.
- Senhas armazenadas com *hash* (bcrypt/argon2).
- Token de sessão no celular guardado no Android Keystore via Expo SecureStore.
- Sessões expiradas (HTTP 401) disparam logout automático e limpeza local.
- Builds de produção do app **não permitem tráfego HTTP em texto plano**.

## 7. Seus direitos (LGPD)

Você pode, a qualquer momento, solicitar:

1. **Confirmação** de que tratamos seus dados;
2. **Acesso** aos seus dados;
3. **Correção** de dados incompletos, inexatos ou desatualizados;
4. **Anonimização, bloqueio ou eliminação** de dados desnecessários;
5. **Portabilidade** dos seus dados;
6. **Eliminação** dos dados tratados com seu consentimento;
7. **Informação** sobre com quem compartilhamos seus dados;
8. **Revogação do consentimento**.

Para exercer qualquer um desses direitos, entre em contato pelo e-mail acima.
Respondemos em até **15 dias**.

## 8. Crianças e adolescentes

O ViaX:Trace **não é destinado a menores de 18 anos** e não coleta
intencionalmente dados de menores. Caso tenhamos coletado dados de um menor
sem o consentimento dos pais/responsáveis, esses dados serão eliminados após
ciência.

## 9. Alterações nesta política

Podemos atualizar esta política. Mudanças significativas serão comunicadas no
próprio app antes de entrarem em vigor. A versão e a data de atualização no
topo desta página indicam a vigência atual.

## 10. Contato

- **E-mail de privacidade:** *(preencher)*
- **Encarregado de Proteção de Dados (DPO):** *(preencher, opcional)*

---

> **Nota para a equipe:** este texto foi gerado como ponto de partida.
> Revise os campos marcados com *(preencher)*, confirme os retentions e
> operadores, e idealmente passe pelo jurídico antes de publicar
> definitivamente. Hospede no domínio próprio (ex.:
> `https://viax.com.br/legal/privacidade`) — a Play Store exige URL pública
> acessível.
