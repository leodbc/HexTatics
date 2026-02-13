# Política de Moderação (MVP)

## Objetivo
Reduzir spam e conteúdo impróprio com custo operacional mínimo.

## Regras automáticas
- Auto-hide quando report_count >= 3 (status -> hidden).
- Bloqueio de duplicata por level_hash.
- Limites de uso por device_id (upload, curtida e denúncia).
- Sanitização de texto de título e autor.

## Motivos de denúncia
- spam
- inappropriate
- impossible
- other

## Ação por status
- public: visível no feed.
- hidden: não visível; aguardando revisão.
- rejected: removido por decisão administrativa.
- draft: reservado para evolução futura.

## Boas práticas
- Não confiar em validação do cliente.
- Registrar IP/UA no edge (se disponível) apenas para anti-abuso.
- Evitar exposição de dados pessoais.
