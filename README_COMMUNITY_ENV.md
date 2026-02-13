# Configuração de Ambiente (Frontend)

Inclua antes de `app.js` no HTML (ou via script inline de configuração):

```html
<script>
  window.COMMUNITY_ENABLED = true;
  window.COMMUNITY_API_BASE = "https://SEU_PROJECT_REF.functions.supabase.co";
</script>
```

Se `COMMUNITY_API_BASE` estiver vazio, a UI é exibida mas chamadas de API retornam mensagem de indisponibilidade.

## Rollout seguro recomendado
1. Iniciar com flag desligada:

```html
<script>
  window.COMMUNITY_ENABLED = false;
  window.COMMUNITY_API_BASE = "https://SEU_PROJECT_REF.functions.supabase.co";
</script>
```

2. Validar internamente abrindo com `?community=true`.
3. Após validação E2E, trocar para `window.COMMUNITY_ENABLED = true`.

## Checklist rápido de validação no browser
- Home mostra botão Mapas quando habilitado.
- Tela Mapas carrega sem erro.
- Link `?map=<id>` abre mapa compartilhado.
- Publicar/Curtir/Denunciar retornam feedback de sucesso/erro esperado.
