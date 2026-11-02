# MirAr

Jogo de tiro em realidade aumentada para a web. A câmera traseira é o fundo, o giroscópio
controla a mira e os alvos aparecem em direções aleatórias à volta do jogador.

## Stack

- React 19 + TypeScript + Vite
- Three.js via `@react-three/fiber` (cena 3D transparente por cima do vídeo)
- Zustand (estado do jogo)
- WebAudio sintetizado (sem ficheiros de som)
- PWA (`vite-plugin-pwa`) para instalar no telemóvel em tela cheia

## Correr

```bash
npm install
npm run dev          # http://localhost:5173 — para testar no PC
npm run dev:https    # https://<IP-do-PC>:5173 — para testar no telemóvel
```

Em `localhost` a câmera funciona em HTTP. Fora de `localhost` (telemóvel na mesma rede) a câmera
e o giroscópio exigem HTTPS; o modo `dev:https` usa um certificado auto-assinado, por isso o
navegador mostra um aviso: toca em **Avançadas → Continuar** (Android) ou
**Mostrar detalhes → visitar este website** (iOS).

No desktop não há giroscópio: arrasta com o rato para olhar, clique curto dispara,
`Espaço` dispara, `R` recarrega, `1-4` troca de arma, `Esc` pausa.

## Build

```bash
npm run build
npm run preview
```

Faz deploy da pasta `dist/` em qualquer host HTTPS (Vercel, Netlify, Cloudflare Pages).

## Deploy (Vercel)

Repositório: https://github.com/nelson34marques/MirAR

1. Em https://vercel.com/new importa o repositório `nelson34marques/MirAR`.
2. A Vercel deteta o preset **Vite** sozinha (build `npm run build`, output `dist`). Não é
   preciso `vercel.json`: o jogo é uma única página estática, sem rotas nem backend.
3. Cada `git push` para `main` publica uma nova versão em `https://<projeto>.vercel.app`, já
   com HTTPS, que é o que a câmera e o giroscópio exigem.

Variáveis opcionais (Settings → Environment Variables): `VITE_ERROR_ENDPOINT` para receber os
erros de produção por `sendBeacon`.

Nota: `public/favicon.svg` tem 4,5 MB (imagem raster embutida pelo gerador de favicons). Não é
referenciado pelo `index.html` nem pré-cacheado pelo service worker; pode ser substituído por
um SVG vetorial leve ou apagado.

## Estrutura

```
src/
  config/     armas, alvos, geração de ondas
  state/      store do jogo (zustand)
  sensors/    giroscópio (com fallback para rato) e câmera
  game/       runtime partilhado por frame, movimento e spawn de alvos
  scene/      cena 3D: câmera, alvos, arma, disparo, efeitos, diretor de ondas
  ui/         HUD, radar, mira, ecrãs (menu, calibração, pausa, fim)
  audio/      efeitos sonoros sintetizados
```

## Controlo da vista

Por ordem de preferência, escolhido automaticamente ao tocar em "Iniciar":

1. **Giroscópio**: a vista segue o telemóvel. Usa `RelativeOrientationSensor` (quaternion direto,
   sem o tremor dos ângulos de Euler com o telemóvel na vertical) e cai para `deviceorientation`
   quando essa API não existe ou deixa de entregar leituras. Se o sensor só responder mais tarde,
   o jogo troca sozinho para este modo sem perder a direção atual.
2. **Câmera** (fluxo ótico em `src/sensors/opticalFlow.ts`): em telemóveis sem giroscópio, a
   rotação é estimada pelo deslocamento da imagem em relação a um frame de referência, em dois
   níveis de resolução (~0,7 ms por frame no PC). Arrastar o dedo não move a vista: só a câmera.
3. **Toque**: arrastar para olhar (desktop, ou telemóvel sem sensores nem câmera).

No ecrã de pausa é possível trocar de modo manualmente e abrir o **Diagnóstico de sensores**, que
mostra o que o navegador está a entregar (eventos, permissões, contexto seguro).

## Qualidade

```bash
npm test        # testes unitários (vitest): ondas, pontuação, dano, power-ups, chefe, geometria
npm run lint    # oxlint
```

- **Desempenho adaptativo** (`src/scene/Quality.tsx`): mede os fps e, em modo "auto", baixa a
  resolução do canvas 3D e o número de partículas quando o telemóvel não aguenta; nas definições
  pode fixar-se Alta/Média/Baixa.
- **Erros em produção** (`src/diag/errors.ts`): erros não tratados ficam guardados no
  `localStorage` e aparecem no painel de diagnóstico; com `VITE_ERROR_ENDPOINT=https://…` definido
  no build, são também enviados por `sendBeacon` em JSON.
- **Definições** persistidas: som, vibração, qualidade, idioma (PT/EN em `src/i18n`) e tutorial.
- O relógio do jogo (`runtime.gameTime`) só avança enquanto se joga: pausar não deixa alvos expirar.

## Mecânicas

- **Ondas** progressivas: mais alvos, mais rápidos, maior abertura angular.
- **Alvos**: balão, drone, blindado (3 tiros), divisor (parte-se em dois minis), fantasma (só se
  acerta quando visível), bónus (rápido, vale 500) e bomba (não atingir).
- **Chefe** a cada 5 ondas: muita vida, ataca o jogador a intervalos (aviso sonoro e pulsar
  vermelho antes), e a onda só termina quando cai.
- **Power-ups**: alvos abatidos deixam cair cápsulas; acertar-lhes dá vida (+25), munição
  infinita (10 s), câmera lenta (7 s) ou pontos a dobrar (15 s).
- **Mira tolerante**: cada alvo tem uma esfera de acerto um pouco maior do que o modelo
  (`hitRadius` em `src/config/targets.ts`), multiplicada pelo `aimAssist` da arma; a bomba não
  tem essa folga.
- **Armas** desbloqueadas por onda: pistola, fuzil (automático), caçadeira (7 projéteis), sniper (zoom).
- **Vida**: um alvo que não é abatido a tempo explode contra o jogador (dano cresce com as ondas);
  bombas atingidas tiram 25. Vida a zero = fim de jogo. Cada onda concluída recupera 15.
- **Ondas**: terminam quando todos os alvos previstos foram resolvidos (abatidos, explodidos ou
  bombas), e a seguinte começa logo a seguir, sem limite.
- **Combos** de abates consecutivos multiplicam a pontuação.
- Recorde guardado em `localStorage`.
