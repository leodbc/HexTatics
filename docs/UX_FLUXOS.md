# UX Fluxos — Comunidade de Mapas

## Visão geral
- Entrada principal: botão 🌍 Mapas na tela inicial.
- Abas do feed: Recentes | Em Alta.
- Card padrão: título, autor, peças, grid, likes, win rate, ações.

## Fluxo: Publicar
1. Usuário abre editor e salva/testa mapa.
2. Clica em 📤 Publicar na Comunidade.
3. Modal mostra preview (nome, peças, grid) + nickname opcional.
4. Validação local de payload.
5. Envio para API.
6. Feedback:
   - sucesso: Mapa publicado.
   - duplicata: Este mapa já foi publicado antes.
   - rate-limit: Muitas publicações hoje.
   - erro rede: Tente novamente.

## Fluxo: Descobrir
1. Usuário clica em 🌍 Mapas.
2. Feed abre em Recentes.
3. Pode alternar para Em Alta.
4. Paginação por cursor com botão Carregar mais.

## Fluxo: Jogar mapa comunitário
1. Usuário abre card.
2. Clica ▶ Jogar.
3. Mapa carrega como custom level.
4. Ao vencer, modal exibe opção de curtir e compartilhar.

## Fluxo: Curtir
1. Usuário toca ❤️ no card ou pós-vitória.
2. API aplica toggle da curtida.
3. UI atualiza contador e estado visual.

## Fluxo: Denunciar
1. Usuário abre menu ⋮ do card.
2. Seleciona Denunciar.
3. Escolhe motivo (spam, inapropriado, impossível, outro).
4. API registra denúncia.
5. Feedback: Denúncia enviada.

## Fluxo: Importar por link
1. Abertura com ?map=<id_ou_slug>.
2. app.js consulta API.
3. Em sucesso, carrega mapa direto no jogo.
4. Em falha, mostra status amigável.

## Estados de UI
- Loading: Carregando mapas...
- Erro: Não foi possível carregar. Tente novamente.
- Empty: Nenhum mapa encontrado ainda. Seja o primeiro.

## Responsividade
- Mobile: 1 coluna de cards, ações em 2 linhas.
- Tablet/desktop: 2–3 colunas.
- Interações touch-first, sem depender de hover.
