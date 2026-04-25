
Library
Tasks
Diff: README.md
README.md
-0
+21
        ↓                      ↓                        ↓                     ↓
 Endereço + GPS          Rua extraída            Nome oficial da via     Similaridade + distância
```
---
## 🚀 Comece em 5 minutos
> Primeira vez no ViaX:Trace? Não comece pela documentação técnica — siga o **guia visual passo-a-passo**, da instalação à sua primeira auditoria, sem jargão.
<div align="center">
### **➡️ [Abrir o Guia "Comece Aqui"](docs/COMECE-AQUI.md)**
</div>
O guia tem bifurcação no início: se o sistema já está rodando, você pula direto para o login; se vai instalar agora, ele te leva pelo PC ou pelo Termux do celular conforme sua escolha.
| Quero… | Vá para |
|---|---|
| 🆕 Instalar e usar pela primeira vez | [docs/COMECE-AQUI.md](docs/COMECE-AQUI.md) |
| 📱 Apenas conectar o app Android a um servidor que já existe | [Passo 5 do guia](docs/COMECE-AQUI.md#passo-5--conecte-o-app-ao-servidor-só-mobile) |
| 🛠️ Resolver "Servidor inacessível" no app | [Seção "Deu problema?"](docs/COMECE-AQUI.md#app-não-conecta-no-termux) |
| 🧑‍💻 Ler a documentação técnica completa | Continue rolando esta página |
---
Agent
entendido, temos um worklow de build do apk nativo no github, dispare e verifique que não há erros, monitore até o final

51 minutes ago
a build está rodando normalmente, enquanto isso vamos esclarecer algumas coisas, o readme do projeto não tem uma wizard focada na experiência do usuário comum, podemos começar a estruturar isso agora

45 minutes ago
Qual perfil de usuário é o foco principal do wizard?

Os dois — wizard com bifurcação: 'já tem o sistema rodando?' Sim / Não
Onde o wizard deve viver?

Ambos: resumo curto no README + guia completo em docs/COMECE-AQUI.md
44 minutes ago
você sincronizou o readme com o repositório no github? não estou vendo alterações, aliás a construção deve ser focada de uma maneira técnica com base no intuito do projeto que é ser uma ferramenta, mas com wizard focada no usuário comum e etc como discutimos anteriormente

39 minutes ago
faça isso

34 minutes ago
ainda não mudou pare de aguardar o eas deixa que eu verifico, quando ficar pronto eu aviso. foque em sincronizar a atualização que estamos fazendo agora use o meu token

31 minutes ago
a build foi concluída, estou baixando o apk para fazer o teste. as melhorias na ui/ux foram aplicadas?

27 minutes ago
ok, eu trago notícias ruins. mas primeiro preciso declarar as razões para que você entenda e utilize as skills adequadas para construir o app nativo comigo.

o intuito do app nativo: versão aplicada para dispositivos android com interface alinhada/espelho da versão web, ou seja, uma versão nativa do projeto web com todos os componentes e construções iguais as do projeto web só que em uma versão android nativa.

meu entendimento sobre codar apps móveis é simplório, estou aprendendo junto de você, então caso isso seja uma tarefa limitada, me notifique e tentamos usar outra língua de programação mais adequada para a tarefa.

15 minutes ago
"Compromisso prático
Quando você me passar a próxima tarefa de UI/UX, eu vou:

Ler primeiro o guia de paridade cross-artifact (web ↔ mobile)
Mapear as variáveis de design do web (cores, fontes, espaçamentos)
Garantir que o nativo use as mesmas constantes via useColors() e tokens
Comparar tela-a-tela antes de declarar "feito"
Sem chute. Sem "achei que estava parecido"." parece que estamos nos conciliando bem nesse momento, o que você está esperando? mãos a obra, eu acredito que sua decisão está correta, minhas outras tentativas com outras inteligências artificiais falharam, então isso sobrou para você my little replit, não me decepcione, não meça esforços. você tem as ferramentas e o conhecimento necessário

11 minutes ago
Vamos. Começando pela auditoria — vou ler tudo em paralelo: o guia de paridade, os tokens do web e os do mobile.

Bons achados — a base do mobile não segue a convenção da skill (usa lib/theme.ts em vez de constants/colors.ts + useColors()). Continuando a auditoria pra ver tamanho exato da divergência:

Auditoria de Paridade Web ↔ Mobile
✅ Boa notícia (90% da fundação está sólida)
Os tokens base já estão sincronizados entre os dois apps. Conferi linha por linha:

Token	Web (index.css)	Mobile (lib/theme.ts)	Status
Background light	#f4f3ef	#f4f3ef	✅
Background dark	#121110	#121110	✅
Accent light	#d4521a	#d4521a	✅
Accent dark	#e8703a	#e8703a	✅
Surface	#faf9f6	#faf9f6	✅
Text muted	#6b6860	#6b6860	✅
Hero gradient	#1a0e08 → #2d1408 → #3d1c0c → #1f0a18	idêntico	✅
Font	Poppins	Poppins (400/500/600/700/800)	✅
Radii	8/10/14/20/99px	{sm:8, md:10, lg:14, xl:20, pill:999}	✅
Quem fez o app nativo originalmente já tinha lido (ou copiado) os tokens corretos. Isso é o trabalho difícil já pronto.

Nota técnica menor: a convenção do mobile usa lib/theme.ts + useTheme() em vez do padrão da skill (constants/colors.ts + useColors()). É uma divergência cosmética sem impacto funcional — os nomes bg/surface/accent espelham as CSS variables do web, então é até mais legível. Não vou refatorar isso salvo se você quiser.

🔴 Notícia ruim (a paridade visual REAL não existe)
O replit.md afirma "paridade 1:1 com a web". Isso é falso. Comparei o Dashboard tela-a-tela:

Dashboard — Web tem, Mobile NÃO tem:
Componente do Web	No Mobile?
HeroBanner com gradiente + SVG decorativa de rotas + botão "Nova Análise" + dismissível	❌ Ausente
FinancialPanel completo (Receita Estimada, Despesas Fixas, Lucro Bruto, Rotas no ciclo, meta progress bar, mini chart 20 dias)	❌ Ausente
5 StatTiles (Análises, Endereços, Nuances, Similaridade, Este Mês) com barra colorida no rodapé	⚠️ Tem 4, falta "Este Mês", sem barra colorida
Quick Actions buttons (Nova Análise pill + Ver Histórico pill)	❌ Ausente
Tabela de Análises Recentes com hover + status pill "Concluído"	⚠️ Tem versão lista (sem status, sem coluna data formatada)
Dashboard — Mobile tem, Web NÃO tem:
Componente do Mobile	Avaliação
Card "Qualidade da auditoria" com 3 Donuts (Skia)	Bonito, mas não existe na web → quebra espelho
Card "Configuração ativa" (parser + tolerância + geocode calls)	Não existe na web
Greeting "Bom dia, Fulano" como header principal	Web abre com HeroBanner + título "Dashboard"
Conclusão honesta: o Dashboard mobile foi redesenhado independentemente, não espelhado. Provavelmente as outras 4 tabs (Processar, Ferramenta, Histórico, Configurações) estão na mesma situação — preciso auditar cada uma.

📋 Plano de ataque proposto
Antes de eu sair reescrevendo, alinha comigo a ordem:

Opção A — Espelho rigoroso (o que você pediu originalmente)
Reescrevo cada tela mobile para ser 1:1 com a web. Ordem sugerida:

Dashboard (mais visível, mais divergente) — adicionar HeroBanner + FinancialPanel + 5º StatTile + Quick Actions + tabela formatada
Configurações (6 tabs no web, complexa)
Processar (fluxo SSE crítico)
Ferramenta (auditoria avançada)
Histórico (lista + filtros)
Cada tela: leio web → mapeio componentes → reescrevo mobile → comparo tokens → próxima.

Opção B — Auditoria completa primeiro
Antes de mexer em código, audito as 4 tabs restantes e te entrego um relatório de gaps consolidado (tipo este do Dashboard, mas das 5 telas). Aí você decide o que vale espelhar e o que vale manter divergente.

Opção C — Você dirige
Você me diz qual tela te incomoda mais visualmente depois do teste do APK e eu ataco essa primeiro.

Eu recomendo a B — porque "espelhar tudo às cegas" pode te custar mudanças que você não quer (ex: o card de Donuts da Qualidade da Auditoria é objetivamente bonito; talvez você prefira manter no mobile mesmo não tendo no web). Auditoria primeiro, decisões informadas depois, código por último.

Qual você prefere — A, B ou C?

Time worked
1 minute
Work done
9 actions
Items read
1180 lines
Agent Usage
$0.32
não pare até sua tarefa for completa, no final acompanhe os workflows para garantir que o app seja buildado corretamente.

9 minutes ago
Entendido. Vou direto pra Opção A — espelho rigoroso. Começo pelo Dashboard (maior gap visual), depois Settings, Process, Tool, Histórico, Login/Register. No final monitoro o build.

Lendo tudo que preciso em paralelo:

Tenho a auditoria completa. Vou criar plano + ler o que falta + começar. Achado crítico: o tipo FinancialSummary no mobile não bate com o que a API retorna — preciso corrigir os types primeiro.

Objective
Espelhar o app nativo Android com a versão web (paridade 1:1 visual + funcional).

Tasks
T001: Corrigir types do mobile (FinancialSummary completo)
Blocked By: []
Files: artifacts/viax-mobile/lib/types.ts
Acceptance: Tipo bate com o que a API retorna em /dashboard/financial (receitaEstimada, despesasFixas, lucroBruto, rotasCicloAtual, metaRotas, percentualMeta, cicloPagamentoDias, inicioDoCliclo, fimDoCiclo, graficoDiario, valorPorRota); UserSettings inclui campos financeiros + instanceMode + googleMapsApiKey + aiProvider + aiApiKey.
T002: Dashboard mobile — adicionar HeroBanner + FinancialPanel + 5 stats + Quick Actions
Blocked By: [T001]
Files: artifacts/viax-mobile/app/(tabs)/index.tsx
Acceptance: Visual espelha web — gradiente hero, 5 tiles com barra colorida, painel financeiro com receita/despesas/lucro/meta + chart, botões "Nova Análise" + "Ver Histórico", tabela recente.
T003: Configurações mobile — sistema de tabs + Financeiro + Instâncias + Sobre
Blocked By: [T001]
Files: artifacts/viax-mobile/app/(tabs)/configuracoes.tsx
Acceptance: 6 tabs (Perfil, Financeiro, Instâncias, Parser, Tolerância, Sobre); Financeiro edita valorPorRota/ciclo/meta/despesas; Instâncias permite escolher builtin/geocodebr/googlemaps com chave; Sobre mostra info do app.
T004: Processar mobile — analytics chart + filtros + config warning + instance badge
Blocked By: [T001]
Files: artifacts/viax-mobile/app/(tabs)/processar.tsx
Acceptance: Card de aviso de config; após análise — donut nuances vs OK + breakdown por tipo + filtros (Todos/Nuance/OK) + badge de instância usada.
T005: Ferramenta mobile — 4 stats coloridos + filtros + sequence list com ordem
Blocked By: [T001]
Files: artifacts/viax-mobile/app/(tabs)/ferramenta.tsx
Acceptance: 4 stats coloridos (Total/Ordenadas/Sem condomínio/Nuances); filtros pílula; lista de sequência com badge ordem + classificação colorida + instrução.
T006: Histórico mobile — cards mais informativos (já apropriado mobile)
Blocked By: [T001]
Files: artifacts/viax-mobile/app/(tabs)/historico.tsx
Acceptance: Manter cards (UX mobile correta) mas garantir que a info bate com a tabela do web.
T007: Push pro GitHub + dispatch da build de teste
Blocked By: [T002, T003, T004, T005, T006]
Acceptance: commit empurrado pro main, workflow mobile-release.yml disparado com profile preview.
T008: Monitorar build até concluir
Blocked By: [T007]
Acceptance: Build atinge success ou eu reporto erro classificado com solução.
Plano confirmado. Vou ler em paralelo os endpoints do servidor + os types/screens atuais do mobile pra ter os dados exatos.

Vou ler em paralelo os endpoints do servidor de users + as outras 3 telas mobile pra ter tudo na mão.

Achados críticos: a configuração mobile está quebrada hoje — usa PUT (API espera PATCH) e nomes de campos errados (googleApiKey ao invés de googleMapsApiKey, parserMode: "google" ao invés de "ai" + instanceMode). Vou consertar tudo. Começando pelos types e Dashboard.

Tudo confirmado. Agora vou escrever todas as 5 telas em paralelo.

Tudo confirmado. Agora vou escrever as 5 telas em paralelo. As telas são longas mas independentes.

Vou agora reescrever Processar, Ferramenta e Histórico em paralelo.

You've reached your daily free quota limit. It will reset at 12:00 AM UTC.

You're out of credits.

Make, test, iterate…
Agent
Agent can make changes, review its work, and debug itself automatically.
