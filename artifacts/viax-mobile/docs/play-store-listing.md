# Play Store — Materiais de listagem (ViaX:Trace)

Tudo aqui é texto pronto pra colar no Google Play Console. Está em PT-BR
seguindo as regras de tamanho e tom que a Play Store impõe (revisado por
humanos, então sem caps lock, sem promessa "#1", sem emojis no título).

---

## 1. Identificação do app

- **Nome do app (máx 30 chars):** `ViaX:Trace — Auditoria de Rota`  *(30 ✓)*
- **Package name:** `com.viax.trace`
- **Categoria:** Negócios *(ou: Mapas e Navegação — escolher uma)*
- **Tags / palavras-chave:** entrega, motoboy, motorista, rota, planilha,
  endereço, auditoria, CEP, logística

## 2. Descrição curta (máx 80 chars)

```
Audite rotas de entrega: detecte endereços ruins antes de sair pra rua.
```
*(76 ✓)*

## 3. Descrição completa (máx 4.000 chars)

```
ViaX:Trace é a ferramenta que entregadores e operadores logísticos brasileiros
usam pra auditar suas planilhas de rota antes do dia começar.

Você importa o arquivo XLSX ou CSV da sua rota — exatamente como o app de
entrega exporta — e o ViaX:Trace verifica cada linha em segundos:

• Detecta CEPs inválidos
• Identifica ruas inexistentes ou com grafia errada
• Aponta números fora da faixa real da rua
• Sinaliza bairros e cidades incoerentes
• Marca endereços ambíguos que costumam virar tentativa frustrada

O resultado vem como um relatório claro: total de paradas, total de "nuances"
(endereços problemáticos), e a lista detalhada de cada linha com o motivo.

POR QUE USAR O VIAX:TRACE

→ Menos tempo perdido rodando atrás de endereço errado
→ Menos contestação com o aplicativo de entrega no fim do dia
→ Histórico das suas auditorias salvo, pronto pra revisar
→ Exporta o resultado em CSV pra anexar em qualquer lugar
→ Funciona offline depois do primeiro carregamento — abre instantâneo

PRIVACIDADE EM PRIMEIRO LUGAR

→ Não coletamos sua localização
→ Não acessamos seus contatos
→ Suas planilhas são processadas e descartadas — só o resumo fica no histórico
→ Sem anúncios, sem rastreador de marketing
→ Política de privacidade completa em: (URL)

Feito por entregadores, pra entregadores. Em português brasileiro.
```

## 4. Notas da versão (release notes — máx 500 chars)

```
v1.2.0 — Atualização grande de qualidade
• Banner offline avisa quando você fica sem conexão
• Toques mais responsivos com vibração de feedback
• Tela "Processando" mantém o celular acordado até terminar
• Acessibilidade: TalkBack agora narra todos os botões importantes
• Atualizações instantâneas: correções chegam sem precisar baixar APK novo
• Melhor recuperação de erros e cache offline mais inteligente
```

## 5. Especificações de mídia que você precisa preparar

| Item | Quantidade | Especificação |
|---|---|---|
| Ícone | 1 | 512×512 PNG, sem transparência, sem alpha |
| Feature graphic | 1 | 1024×500 PNG/JPG, sem texto crítico nas bordas |
| Screenshots celular | mín. 2, máx. 8 | 16:9 ou 9:16, JPEG/PNG 24-bit, lado mais curto ≥ 320px |
| Screenshots tablet 7" | opcional | 1024×600 mínimo |
| Vídeo promocional | opcional | YouTube URL, 30s–2min |

**Sugestão de roteiro pros 5 screenshots:**
1. Tela de login (mostra a marca + tagline)
2. Dashboard com cards de KPI (mostra que tem dados reais)
3. Tela de upload do arquivo (mostra o caso de uso central)
4. Tela de processamento ao vivo (mostra que tem feedback rico)
5. Resultado final com filtros (mostra o valor entregue)

## 6. Data Safety (Painel de Segurança de Dados) — respostas prontas

Esta é a parte que mais reprova app na revisão. Respostas alinhadas com a
Política de Privacidade:

### Coleta de dados → SIM
| Tipo de dado | Coletado? | Compartilhado? | Opcional? | Finalidade |
|---|---|---|---|---|
| **Endereço de e-mail** | Sim | Não | Não | Funcionalidade do app, gerenciamento de conta |
| **Nome** | Sim | Não | Não | Funcionalidade do app |
| **Senha do usuário** | Sim (hash) | Não | Não | Funcionalidade do app |
| **Arquivos do usuário** (planilhas) | Sim (transitório) | Não | Não | Funcionalidade do app |
| **Diagnóstico de falhas** (Sentry) | Sim | **Sim** (com Sentry) | Não | Análise / Diagnóstico |
| **ID de instalação do app** (Sentry) | Sim | Sim (com Sentry) | Não | Diagnóstico |

### Coleta de dados → NÃO
- Localização (precisa OU aproximada)
- Identificadores pessoais (CPF, RG)
- Informações financeiras
- Saúde e fitness
- Mensagens
- Fotos e vídeos
- Áudio
- Lista de contatos
- Calendário
- Atividade no app (cliques, visualizações de tela)
- Histórico de pesquisa na web
- Histórico de pesquisa no app
- Lista de apps instalados
- Identificadores de publicidade

### Práticas de segurança
- ☑ Os dados são criptografados em trânsito *(TLS)*
- ☑ Você pode solicitar a exclusão dos seus dados *(item 7 da Política)*
- ☑ Sigo as melhores práticas do Google Play Families Policy → **N/A**, app não é direcionado a crianças

## 7. Classificação de conteúdo (IARC questionnaire)

Respostas que dão classificação **L (Livre)**:
- Violência? Não
- Conteúdo sexual? Não
- Linguagem? Não
- Substâncias controladas? Não
- Apostas? Não
- Compartilha localização? Não
- Permite interação entre usuários? Não
- Permite envio de conteúdo gerado pelo usuário em servidor? **Sim** (planilha
  enviada para auditoria — descartada após processamento)
- Coleta dados pessoais? **Sim** (e-mail, nome — informados no Data Safety)

## 8. Público-alvo
- **Faixa etária:** 18+ (uso profissional)
- **Faixa secundária:** —
- **Marketing pra crianças?** Não

## 9. Política de privacidade

URL pública, obrigatória. Hospede o conteúdo de
`docs/privacy-policy-pt.md` em:

```
https://viax.com.br/legal/privacidade
```

*(ou outro domínio próprio acessível sem login).*

## 10. Acesso de teste

Pra revisão da Google, fornecer:
- **E-mail demo:** `revisor.google@viax.com.br`
- **Senha demo:** `(criar com 12+ chars, salvar em local seguro)`
- **Instruções:** "Após login, vá em Processar → Selecionar arquivo → use a
  planilha de exemplo embutida no botão 'Carregar exemplo' (ou anexada)."

## 11. Cronograma de submit

1. **Internal track** (até 100 testers, propagação imediata) — comece aqui
   sempre. Use pra QA e validação real.
2. **Closed track / Alpha** (lista de e-mails) — quando quiser pré-clientes.
3. **Open track / Beta** (público com opt-in) — opcional.
4. **Production** (público) — só quando todas as métricas de crash do Sentry
   estiverem estáveis (< 1% de sessões com crash) por pelo menos 1 semana
   no track interno.

---

## Como subir o primeiro build

```bash
cd artifacts/viax-mobile

# 1. Build de produção (já configurado em eas.json)
eas build -p android --profile production

# 2. Submit para o Internal track
eas submit -p android --profile production
#   ↳ vai usar serviceAccountKeyPath de eas.json
```

> **Pré-requisito do submit:** colocar o arquivo
> `google-play-service-account.json` (gerado no Google Cloud Console com
> permissões de Service Account no Play Console) na raiz de
> `artifacts/viax-mobile/`. O `.gitignore` já protege ele de ir pro git.
