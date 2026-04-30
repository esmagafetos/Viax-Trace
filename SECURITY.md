# Política de Segurança

## Versões suportadas

A versão do branch `main` é a única ativamente suportada com correções de segurança. Recomendamos sempre rodar a versão mais recente.

| Versão  | Suportada          |
| ------- | ------------------ |
| `main`  | ✅                 |
| < main  | ❌                 |

## Reportando uma vulnerabilidade

**Por favor não abra issues públicas para vulnerabilidades de segurança.**

Use uma das duas formas abaixo:

1. **Recomendado** — abra um [Security Advisory privado](https://github.com/ViaXTrace/Viax-Trace/security/advisories/new) no GitHub.
2. Envie um e-mail para **security@viax-trace.dev** com:
   - Descrição da vulnerabilidade
   - Passos para reproduzir
   - Impacto potencial (vazamento de dados, RCE, etc.)
   - Versão / commit afetado

### O que esperar

- **Confirmação:** dentro de 72 horas após o recebimento
- **Avaliação inicial:** dentro de 7 dias
- **Correção e disclosure coordenado:** trabalharemos com você em um cronograma justo (90 dias é o padrão, ajustável para casos críticos)

## Boas práticas para usuários

- **Nunca commite o `.env`** — ele contém `DATABASE_URL`, `SESSION_SECRET` e chaves de API
- Use um `SESSION_SECRET` longo e aleatório (≥ 32 bytes), gerado com:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- Rotacione chaves de API periodicamente (Google Maps, OpenAI, etc.)
- Mantenha o PostgreSQL atrás de um firewall — não exponha a porta 5432 publicamente
- Habilite HTTPS em produção (TLS terminator no Nginx, Caddy, ou load balancer)
- Audite os logs regularmente para detectar tentativas de brute-force em `/api/auth/login`

## Escopo

Em escopo:
- Código deste repositório (`api-server`, `viax-scout`, `geocodebr-service`, `lib/*`, instaladores)
- Configurações padrão de segurança

Fora de escopo:
- Vulnerabilidades em dependências (reporte upstream — ainda assim queremos saber para atualizar)
- Engenharia social contra mantenedores
- DoS via volume bruto (sem amplificação)

Obrigado por ajudar a manter o ViaX:Trace seguro.
