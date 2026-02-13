# Checklist de Deploy e Rollout — Comunidade de Mapas

## 1) Pré-flight local
- Executar testes: `node tests/run-tests.js`
- Verificar solver smoke (11–14) antes de release
- Confirmar que a feature flag continua desligada por padrão no frontend

## 2) Pré-requisitos de infraestrutura
- Instalar Supabase CLI
- Login: `supabase login`
- Vincular projeto: `supabase link --project-ref <project-ref>`
- Definir ambiente alvo: dev primeiro, prod depois

## 3) Aplicar banco (ordem obrigatória)
1. `backend/sql/002_functions.sql`
2. `backend/sql/001_schema.sql`
3. `backend/sql/003_security.sql`

Opção A (Dashboard SQL Editor): executar os 3 arquivos manualmente na ordem.

Opção B (CLI):
- `supabase db push`

## 4) Deploy das Edge Functions
- `supabase functions deploy validate-map`
- `supabase functions deploy verify-solvability`

Observação importante:
- Os endpoints completos de `/v1/maps` ainda dependem da implementação server-side final.
- Nesta fase, já existe validação e base de segurança para publicação.

## 5) Configuração do frontend (runtime)
No `index.html`, antes de `app.js`, incluir:

```html
<script>
  window.COMMUNITY_ENABLED = true;
  window.COMMUNITY_API_BASE = "https://<project-ref>.functions.supabase.co";
</script>
```

Rollout gradual recomendado:
- manter `window.COMMUNITY_ENABLED = false`
- habilitar somente com `?community=true`
- após validação E2E, ligar globalmente para todos

## 6) CORS e domínio
Permitir origens:
- `https://<username>.github.io`
- `http://localhost:3000`

Permitir header:
- `X-Device-ID`

## 7) Smoke E2E mínimo (prod)
1. Abrir home com `?community=true`
2. Entrar em Mapas
3. Carregar feed (Recentes)
4. Abrir um mapa e jogar
5. Curtir/descurtir
6. Denunciar (uma vez)
7. Testar compartilhamento por link `?map=<id>`

## 8) Critérios de go/no-go
Go se:
- feed carrega sem erro
- jogar mapa comunitário funciona
- curtir e denunciar respondem corretamente
- import por link funciona
- sem regressão no jogo base

No-go se:
- erro recorrente de API (5xx)
- feed vazio por falha backend
- regressão de gameplay/editor/tutorial

## 9) Pós-go-live imediato
- Monitorar logs Supabase por 24h
- Monitorar taxa de erro de publicação
- Monitorar volume de denúncias
- Se necessário, desativar rápido com feature flag
