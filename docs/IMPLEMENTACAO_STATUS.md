# Status de Implementação — Comunidade de Mapas

## Implementado
- Estrutura de docs e backend SQL/functions.
- Cliente API frontend (api.js).
- UI de comunidade no frontend:
  - botão Mapas na tela inicial
  - tela community com abas Recentes/Em Alta
  - cards com Jogar/Curtir/Compartilhar/Denunciar
  - paginação por cursor (Carregar mais)
  - estados loading/error/empty
- Publicação via editor e no modal de vitória (mapa custom local).
- Importação por URL (?map=<id>) com fetch da API.
- Modais de publicação e denúncia.
- Cache de feed em sessionStorage com TTL.
- Feature flag COMMUNITY_ENABLED e base URL COMMUNITY_API_BASE.
- Teste básico de payload e CI inicial.

## Pendente para produção completa
- Deploy real de funções no Supabase (ambiente externo).
- Implementação server-side final dos endpoints além de validação.
- Solver server-side completo com timeout real.
- Ajustes finos de UX com backend real (mensagens de erro específicas por status code).
