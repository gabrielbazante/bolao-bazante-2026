# Palpite aleatório realista — Design

**Data:** 2026-06-28
**Autor:** Gabriel Bazante (com brainstorming Claude)
**Status:** aguardando aprovação

## 1. Problema

O modo aleatório (auto-fill do cron quando a fase trava + botão "preencher aleatório" do
usuário) sorteia placares a partir de uma distribuição histórica de placares de Copa,
mas **escolhe o vencedor 50/50, ignorando a força dos times**. Resultado: zebras absurdas
relatadas pelos usuários — "França 1×4 Senegal", "Argentina 0×3 Iraque".

A distribuição de *placares* é boa (frequências reais de Copa); o problema é a **atribuição
do vencedor e da margem sem considerar quem é favorito**.

## 2. Objetivo

Tornar os placares aleatórios realistas e coerentes com a força das seleções:
favorito tende a vencer, zebra é rara e magra, goleada só quando há abismo, jogo
equilibrado dá placar apertado. Sem eliminar a aleatoriedade — só enviesá-la.

## 3. Escopo

- Vale da **R32 em diante**. Os palpites já preenchidos da fase de grupos **não** são
  re-sorteados (jogos disputados/pontuados — reescrever seria mexer em resultado consumado).
- Só as **32 seleções classificadas** para a R32 precisam de nota (não as 48).

## 4. Força da seleção (`lib/team-strength.ts`)

### 4.1 Base (curada — pedigree de Copa + ranking FIFA)

Nota 0–100 por seleção classificada. Mistura pedigree em Copas e força atual (ranking FIFA).
**Esta tabela é o ponto mais sensível — revisar e ajustar à vontade.**

| Cód | Seleção | Nota | | Cód | Seleção | Nota |
|---|---|---|---|---|---|---|
| FRA | França | 92 | | NOR | Noruega | 75 |
| BRA | Brasil | 91 | | MEX | México | 74 |
| ARG | Argentina | 91 | | AUT | Áustria | 73 |
| ESP | Espanha | 88 | | USA | Estados Unidos | 73 |
| ENG | Inglaterra | 87 | | SWE | Suécia | 72 |
| GER | Alemanha | 86 | | ALG | Argélia | 72 |
| POR | Portugal | 85 | | ECU | Equador | 72 |
| NED | Holanda | 84 | | EGY | Egito | 71 |
| BEL | Bélgica | 82 | | CIV | Costa do Marfim | 70 |
| CRO | Croácia | 80 | | CAN | Canadá | 70 |
| MAR | Marrocos | 80 | | PAR | Paraguai | 68 |
| COL | Colômbia | 77 | | GHA | Gana | 68 |
| SUI | Suíça | 76 | | AUS | Austrália | 68 |
| JPN | Japão | 76 | | BIH | Bósnia e Herzegovina | 67 |
| SEN | Senegal | 75 | | COD | Congo DR | 66 |
| | | | | RSA | África do Sul | 65 |
| | | | | CPV | Cabo Verde | 58 |

### 4.2 Ajuste de forma (deste torneio)

Delta a partir do desempenho neste torneio, limitado a **±6** (a base domina, a forma cutuca):

```
ppg   = pontos / jogos disputados        // 0..3
gdpg  = saldo de gols / jogos            // negativo a positivo
delta = clamp( 2.0*(ppg - 1.35) + 1.2*gdpg , -6, +6 )
effectiveRating = base + delta
```

- Fase de grupos: sem jogos prévios neste cálculo → vale só a base (mas escopo começa na R32).
- R32: forma = 3 jogos de grupo. Rodadas seguintes: acumula resultados do mata-mata.
- `1.35` ≈ média de pontos/jogo de quem avança. Um líder de grupo (9 pts, saldo alto) chega
  ao teto +6; quem passou raspando fica perto de 0; 3º colocado magro fica levemente negativo.

`effectiveRating(base, {jogos, pontos, saldo}) → number` — função **pura**, testável.

## 5. Placar híbrido (`lib/random-bet.ts`)

Assinatura passa a `randomBet(forcaCasa: number, forcaFora: number)`. Pura e testável.

### 5.1 Probabilidade de resultado (estilo Elo)

```
d = forcaCasa - forcaFora
e = 1 / (1 + 10^(-d / S))          // expectativa da casa, S = 20 (tunável)
pEmpate = DRAW_MAX * (1 - |2e - 1|) // DRAW_MAX = 0.30
pCasa   = max(0, e       - pEmpate/2)
pFora   = max(0, (1 - e) - pEmpate/2)
```

- Jogo equilibrado (d=0): ~35% casa / 30% empate / 35% fora.
- Abismo (d=20 → e≈0.91): ~87% favorito / 6% empate / 7% zebra.

### 5.2 Margem (reusa as frequências de Copa, reponderadas)

Mantém as listas históricas atuais (`SCORELINES` = `[vencedor, perdedor, peso]`; `DRAWS`).

- **Decidido**: define o vencedor pela §5.1. `favoritoVenceu = vencedor é o de maior nota`.
  Reponderar cada placar `[hi, lo, w]` pela margem `m = hi - lo` e pelo abismo `g = |d|/100`:
  ```
  fator = favoritoVenceu ? exp(K * (m-1) * g) : exp(-K * (m-1))   // K = 0.9
  pesoFinal = w * fator
  ```
  Favorito com abismo grande → puxa pra margens maiores; zebra vencendo → comprime pra 1 gol.
  Sorteia o placar pelos pesos finais; atribui `hi` ao vencedor, `lo` ao perdedor.
- **Empate**: sorteia das frequências de empate como hoje (já são placares baixos).

### 5.3 Aleatoriedade injetável

`randomBet` recebe um `rng = Math.random` opcional como último parâmetro, pra testes
determinísticos: `randomBet(forcaCasa, forcaFora, rng?)`.

## 6. Integração

- **`lib/team-strength.ts`**: exporta `BASE_RATINGS` (por `fifa_code`) e `effectiveRating(...)`.
- **Helper de montagem** (onde houver acesso ao DB): carrega as seleções + calcula forma dos
  fixtures já pontuados, devolve `Map<teamId, effectiveRating>`. Montado uma vez por execução.
- **Consumidores** passam as duas forças por fixture:
  - `check-fixtures` → `autoFillExpiredPhases` (auto-fill ao travar a fase). Já filtra fixtures
    com os dois times; passa a selecionar `home_team_id, away_team_id` e a buscar a nota.
  - `palpites/actions.ts` → botão "preencher aleatório" do usuário (mesma lógica, mesma cara).
- Fallback: time sem nota na tabela (não deveria ocorrer no escopo R32+) → nota neutra 70.

## 7. Testes (TDD)

`random-bet` (propriedades estatísticas sobre N amostras, com `rng` semeado quando útil):
- favorito forte vence com frequência muito maior que a zebra;
- abismo maior → margem média do favorito maior;
- jogo equilibrado → distribuição ~simétrica casa/fora e empate perto do esperado;
- todos os placares dentro do teto (sem absurdos);
- caso reportado: França(forte)×Senegal(médio) → Senegal vencer por 3+ é < ~1%.

`team-strength`:
- `delta` limitado a ±6;
- monotonicidade: mais pontos/saldo → nota efetiva maior;
- sem jogos → `effectiveRating == base`.

## 8. Fora de escopo

- Re-sortear palpites passados da fase de grupos.
- Notas para as 16 seleções eliminadas na fase de grupos.
- Modelo Poisson completo (optou-se pelo híbrido: frequências de Copa reponderadas por força).
