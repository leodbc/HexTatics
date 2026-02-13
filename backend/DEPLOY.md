# Deploy Backend (Supabase)

## Pré-requisitos
- Supabase CLI instalado.
- Projeto Supabase criado (dev/prod).
- CLI autenticado com `supabase login`.

## Migrações SQL (ordem)
1. backend/sql/002_functions.sql
2. backend/sql/001_schema.sql
3. backend/sql/003_security.sql

Recomendação: aplicar primeiro em dev, validar E2E e só então repetir em prod.

## Deploy Edge Functions
- backend/functions/validate-map.js
- backend/functions/verify-solvability.js

## Comandos sugeridos
```bash
supabase login
supabase link --project-ref <project-ref>
supabase db push
supabase functions deploy validate-map
supabase functions deploy verify-solvability
```

## Validação pós-deploy
- Executar chamada de validação para garantir função ativa.
- Verificar tabelas `maps`, `map_votes`, `map_reports`, `map_runs` no projeto alvo.
- Confirmar policy RLS aplicada (leitura pública apenas para status `public`).

## CORS
Permitir:
- https://<username>.github.io
- http://localhost:3000
- header X-Device-ID

## Frontend
Definir em runtime:
- window.COMMUNITY_ENABLED = true
- window.COMMUNITY_API_BASE = "https://<project-ref>.functions.supabase.co"

## Rollback rápido
- Desligar frontend: `window.COMMUNITY_ENABLED = false`.
- Manter backend ativo sem exposição de UI enquanto investiga.
