<div align="center">

# Comece aqui — Guia rápido (2 minutos)

**Da instalação à sua primeira auditoria de rota, sem jargão técnico.**

</div>

---

## Como funciona

O ViaX:Trace tem dois componentes:

- **Backend oficial** — já está rodando na nuvem em `https://viax-trace-api.onrender.com`. Você não precisa instalar nada.
- **App Android** — você baixa, instala e abre. Já vem apontando para o backend oficial.

---

## Passo 1 — Baixe o app

Acesse a página de Releases do projeto e baixe o APK mais recente:

**[github.com/esmagafetos/Viax-Scout/releases](https://github.com/esmagafetos/Viax-Scout/releases)**

Procure pelo arquivo `viax-trace-vX.Y.Z.apk` (a versão mais recente fica no topo da lista).

---

## Passo 2 — Instale no Android

1. Abra o APK baixado pelo gerenciador de arquivos do celular.
2. Se o Android pedir, autorize **"Instalar de fontes desconhecidas"** apenas para essa instalação.
3. Toque em **Instalar**.

> Em alguns aparelhos, o navegador onde você baixou o APK também precisa estar autorizado. Geralmente o sistema te leva direto para essa tela quando necessário.

---

## Passo 3 — Crie sua conta

1. Abra o app **ViaX:Trace**.
2. Toque em **Criar conta** e preencha nome, e-mail e senha.
3. Pronto — você já está dentro do dashboard.

> Se já tem uma conta (criada na web ou em outro celular), basta tocar em **Entrar** e usar o mesmo e-mail e senha.

---

## Passo 4 — Faça sua primeira auditoria

1. No menu inferior, toque em **Processar**.
2. Selecione um arquivo `.xlsx` ou `.csv` com a coluna **Endereço** (obrigatória) e, idealmente, colunas **lat/lon** com o GPS coletado em campo.
3. Aguarde o processamento — o progresso aparece em tempo real, linha a linha.
4. Ao final, baixe o relatório CSV ou abra cada análise no **Histórico**.

---

## Formato da planilha

| Coluna | Tipo | Obrigatório | Aliases aceitos |
|---|---|---|---|
| Endereço | texto | **Sim** | `endereco`, `endereço`, `address` |
| Latitude | número | Não | `lat`, `latitude` |
| Longitude | número | Não | `lon`, `lng`, `longitude` |
| Cidade | texto | Não | `cidade`, `city` |
| Bairro | texto | Não | `bairro`, `neighborhood` |
| CEP | texto | Não | `cep`, `zipcode` — ativa fontes brasileiras |

> Tamanho máximo: **10 MB** · até **500 endereços por planilha**.

---

## Deu problema?

| Sintoma | O que fazer |
|---|---|
| **App não abre / trava na splash** | Desinstale e reinstale o APK pelo gerenciador de arquivos. |
| **"Erro de conexão" ao logar** | Verifique sua internet. O backend pode levar até 30 s para acordar se ficou ocioso (free tier do Render). |
| **"Credenciais inválidas"** | Confira se o e-mail está digitado certo (sem espaços) e se a senha tem ao menos 6 caracteres. |
| **Não consigo subir planilha** | Confirme que o arquivo é `.xlsx` ou `.csv` e que tem ao menos a coluna de endereço. |
| **Quero apontar para outro backend** | Build local: `flutter run --dart-define=API_BASE=https://seu-backend`. Veja [Self-host](../README.md#self-host-opcional). |

---

## E se eu quiser rodar minha própria instância?

Você não precisa — o app oficial já vem configurado. Mas se quiser hospedar o backend na sua infraestrutura, veja a seção [**Self-host**](../README.md#self-host-opcional) do README. Em resumo: `docker compose up -d` e pronto.

---

<div align="center">

[Voltar para o README](../README.md) · [Reportar problema](https://github.com/esmagafetos/Viax-Scout/issues/new)

</div>
