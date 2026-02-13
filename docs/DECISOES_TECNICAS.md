# Decisões Técnicas — Comunidade de Mapas

## Escopo MVP
- Nome da aba: Mapas.
- Publicação sem login obrigatório.
- Identificação por device_id persistido em localStorage (UUID v4).
- Backend: Supabase (PostgreSQL + RLS + Edge Functions para regras complexas).
- Frontend hospedado em GitHub Pages (estático), consumindo API externa via HTTPS.

## Limites MVP
- Upload: máximo 10 mapas por 24h por device_id.
- Grid: até 12x10.
- Peças: até 50.
- Título: 3–40 caracteres.
- level_json: até 10KB serializado.

## Funcionalidades MVP
- Publicar mapa.
- Feed público (Recentes e Em Alta).
- Jogar mapa comunitário.
- Curtir (1 por device_id por mapa, toggle).
- Denunciar com motivo.
- Compartilhar por link ?map=<id>.
- Moderação mínima (auto-hide por denúncias).
- Telemetria básica (starts e wins).

## Pós-MVP
- Login OAuth.
- Perfil de criador.
- Ranking all-time.
- Curadoria/destaques.
- Eventos temáticos.
- Comentários.
- Tags/categorias.
- Seguidores.

## Arquitetura de implantação
- Frontend: GitHub Pages.
- Backend: Supabase API + Edge Functions.
- Banco: PostgreSQL gerenciado do Supabase.
- CORS: domínio do Pages + localhost para dev.

## Riscos e mitigação
- Spam: rate-limit + deduplicação por hash + denúncia.
- Conteúdo inválido: validação em frontend e backend.
- Custo: iniciar no free tier, monitorar uso.
- Regressão: smoke tests e feature flag COMMUNITY_ENABLED.
