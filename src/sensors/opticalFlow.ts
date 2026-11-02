/**
 * Estima a rotação do telemóvel a partir da imagem da câmera.
 *
 * Reduz cada frame a uma imagem minúscula em tons de cinzento e procura o
 * deslocamento (dx, dy) que melhor alinha o frame atual com um frame de
 * referência, em dois níveis (grosso em metade da resolução, fino em volta do
 * melhor candidato) e com refinamento sub-píxel. Rodar o telemóvel para a
 * esquerda faz a cena deslizar para a direita, e esse deslocamento
 * converte-se em ângulo a partir do campo de visão da câmera.
 *
 * A referência só é substituída quando o deslocamento acumulado passa de
 * alguns píxeis (ou envelhece): assim os movimentos lentos, que num único
 * frame seriam frações de píxel difíceis de medir, acumulam até serem
 * medidos com precisão.
 *
 * Não precisa de giroscópio nem bússola. Tem alguma deriva, mas o jogador
 * pode corrigir arrastando o dedo.
 */
export class OpticalFlowTracker {
  private readonly canvas = document.createElement('canvas');
  private readonly ctx: CanvasRenderingContext2D | null;
  private video: HTMLVideoElement | null = null;
  /** frame de referência (resolução completa e metade) */
  private ref: Uint8Array | null = null;
  private refHalf: Uint8Array | null = null;
  private cur: Uint8Array | null = null;
  private curHalf: Uint8Array | null = null;
  private hasRef = false;
  private refAge = 0;
  /** deslocamento já comunicado em relação à referência atual */
  private reported = { dx: 0, dy: 0 };
  private w = 0;
  private h = 0;
  private hw = 0;
  private hh = 0;
  private sourceWidth = -1;
  private sourceHeight = -1;
  private yawPerPx = 0;
  private pitchPerPx = 0;
  private lastTime = -1;
  private readonly fineGrid = new Float64Array(9);
  /** última velocidade medida (px/frame) para continuar o movimento em frames rejeitados */
  private lastVel = { dx: 0, dy: 0 };
  private coastLeft = 0;
  /** frames seguidos em que se continua o movimento anterior sem medição */
  readonly maxCoast = 3;

  /** deltas acumulados desde o último consumo (radianos) */
  private dYaw = 0;
  private dPitch = 0;

  /** raio de procura (píxeis) no nível grosso, metade da resolução */
  readonly coarseRadius = 5;
  /** largura da imagem reduzida */
  readonly baseWidth = 80;
  /** deslocamento a partir do qual a referência é substituída (píxeis) */
  readonly rekeyShift = 2.5;
  /** idade máxima da referência (frames de vídeo) */
  readonly rekeyAge = 12;
  /** campo de visão diagonal assumido para a câmera traseira (graus) */
  diagonalFov = 70;
  /** ganho global; >1 roda mais depressa */
  gain = 1;

  /** estatísticas para diagnóstico */
  frames = 0;
  accepted = 0;
  rejected = 0;
  lastShift = { dx: 0, dy: 0 };
  /** custo médio do cálculo por frame de vídeo (ms) */
  lastCostMs = 0;

  constructor() {
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
  }

  get active(): boolean {
    return this.video !== null;
  }

  /** alcance máximo por frame, em píxeis da imagem reduzida */
  get maxShift(): number {
    return this.coarseRadius * 2 + 1;
  }

  start(video: HTMLVideoElement) {
    this.video = video;
    this.reset();
  }

  stop() {
    this.video = null;
    this.reset();
  }

  private reset() {
    this.frames = 0;
    this.hasRef = false;
    this.refAge = 0;
    this.reported.dx = 0;
    this.reported.dy = 0;
    this.lastTime = -1;
    this.coastLeft = 0;
    this.lastVel = { dx: 0, dy: 0 };
  }

  /** devolve e zera os deltas acumulados */
  consume(): { yaw: number; pitch: number } {
    const r = { yaw: this.dYaw, pitch: this.dPitch };
    this.dYaw = 0;
    this.dPitch = 0;
    return r;
  }

  private resize(vw: number, vh: number) {
    this.w = this.baseWidth;
    this.h = Math.max(32, Math.round((this.baseWidth * vh) / vw));
    this.hw = this.w >> 1;
    this.hh = this.h >> 1;
    this.canvas.width = this.w;
    this.canvas.height = this.h;
    this.ref = new Uint8Array(this.w * this.h);
    this.cur = new Uint8Array(this.w * this.h);
    this.refHalf = new Uint8Array(this.hw * this.hh);
    this.curHalf = new Uint8Array(this.hw * this.hh);

    const d = Math.sqrt(vw * vw + vh * vh);
    const tanHalfDiag = Math.tan((this.diagonalFov * Math.PI) / 360);
    const hfov = 2 * Math.atan((tanHalfDiag * vw) / d);
    const vfov = 2 * Math.atan((tanHalfDiag * vh) / d);
    this.yawPerPx = hfov / this.w;
    this.pitchPerPx = vfov / this.h;
    this.reset();
  }

  /** o frame atual passa a ser a referência */
  private rekey() {
    const c = this.cur!;
    const ch = this.curHalf!;
    this.cur = this.ref;
    this.curHalf = this.refHalf;
    this.ref = c;
    this.refHalf = ch;
    this.hasRef = true;
    this.refAge = 0;
    this.reported.dx = 0;
    this.reported.dy = 0;
  }

  /** chamar uma vez por frame de render */
  update() {
    const v = this.video;
    const ctx = this.ctx;
    if (!v || !ctx || v.readyState < 2 || v.videoWidth === 0) return;
    if (v.videoWidth !== this.sourceWidth || v.videoHeight !== this.sourceHeight) {
      // dimensões mudaram (rotação do ecrã, troca de câmera)
      this.sourceWidth = v.videoWidth;
      this.sourceHeight = v.videoHeight;
      this.resize(v.videoWidth, v.videoHeight);
    }
    const t = v.currentTime;
    if (t === this.lastTime) return; // mesmo frame de vídeo
    this.lastTime = t;

    const t0 = performance.now();
    ctx.drawImage(v, 0, 0, this.w, this.h);
    const data = ctx.getImageData(0, 0, this.w, this.h).data;
    const cur = this.cur!;
    let sum = 0;
    for (let i = 0, j = 0; i < cur.length; i++, j += 4) {
      // luminância aproximada
      const g = (data[j] * 77 + data[j + 1] * 150 + data[j + 2] * 29) >> 8;
      cur[i] = g;
      sum += g;
    }
    this.downsample(cur, this.curHalf!);
    this.frames += 1;

    if (!this.hasRef) {
      this.rekey();
      return;
    }
    this.refAge += 1;

    // contraste mínimo: imagem uniforme (parede lisa, tampa na câmera) não serve
    const mean = sum / cur.length;
    let varSum = 0;
    for (let i = 0; i < cur.length; i += 7) varSum += (cur[i] - mean) * (cur[i] - mean);
    const contrast = Math.sqrt(varSum / Math.ceil(cur.length / 7));
    if (contrast <= 6) {
      this.rekey();
      this.lastCostMs = this.lastCostMs * 0.9 + (performance.now() - t0) * 0.1;
      return;
    }

    const shift = this.bestShift(this.ref!, cur, this.refHalf!, this.curHalf!);
    if (shift) {
      this.accepted += 1;
      const ddx = shift.dx - this.reported.dx;
      const ddy = shift.dy - this.reported.dy;
      this.reported.dx = shift.dx;
      this.reported.dy = shift.dy;
      this.lastShift = { dx: ddx, dy: ddy };
      this.lastVel = { dx: ddx, dy: ddy };
      this.coastLeft = this.maxCoast;
      // dx > 0 significa que cur[x] = ref[x + dx], ou seja, a cena deslizou para a
      // esquerda: isso acontece quando rodamos para a direita (yaw -)
      this.dYaw -= ddx * this.yawPerPx * this.gain;
      // dy > 0: cena deslizou para cima = inclinámos para baixo (pitch -)
      this.dPitch -= ddy * this.pitchPerPx * this.gain;
      if (Math.abs(shift.dx) >= this.rekeyShift || Math.abs(shift.dy) >= this.rekeyShift || this.refAge >= this.rekeyAge) {
        this.rekey();
      }
    } else {
      // sem correspondência fiável (movimento demasiado rápido, cena mudou):
      // continua brevemente o movimento anterior, para a vista não "prender",
      // e recomeça a partir deste frame
      this.rejected += 1;
      if (this.coastLeft > 0) {
        this.coastLeft -= 1;
        this.lastVel = { dx: this.lastVel.dx * 0.7, dy: this.lastVel.dy * 0.7 };
        this.dYaw -= this.lastVel.dx * this.yawPerPx * this.gain;
        this.dPitch -= this.lastVel.dy * this.pitchPerPx * this.gain;
      }
      this.rekey();
    }
    this.lastCostMs = this.lastCostMs * 0.9 + (performance.now() - t0) * 0.1;
  }

  /** média 2×2 para o nível grosso */
  private downsample(src: Uint8Array, dst: Uint8Array) {
    const w = this.w;
    const hw = this.hw;
    const hh = this.hh;
    for (let y = 0; y < hh; y++) {
      const r0 = y * 2 * w;
      const r1 = r0 + w;
      const o = y * hw;
      for (let x = 0; x < hw; x++) {
        const i = x * 2;
        dst[o + x] = (src[r0 + i] + src[r0 + i + 1] + src[r1 + i] + src[r1 + i + 1]) >> 2;
      }
    }
  }

  /** soma de diferenças absolutas para um deslocamento (dx, dy), ignorando uma margem */
  private sad(ref: Uint8Array, cur: Uint8Array, w: number, h: number, dx: number, dy: number, margin: number): number {
    const x0 = margin;
    const x1 = w - margin;
    const y0 = margin;
    const y1 = h - margin;
    let s = 0;
    for (let y = y0; y < y1; y++) {
      const rowCur = y * w;
      const rowRef = (y + dy) * w + dx;
      for (let x = x0; x < x1; x++) {
        s += Math.abs(cur[rowCur + x] - ref[rowRef + x]);
      }
    }
    return s;
  }

  /**
   * Procura o deslocamento com menor SAD em dois níveis e refina em sub-píxel.
   * Devolve null quando a imagem não permite uma estimativa fiável.
   */
  private bestShift(ref: Uint8Array, cur: Uint8Array, refH: Uint8Array, curH: Uint8Array): { dx: number; dy: number } | null {
    // nível grosso: procura completa em metade da resolução
    const Rc = this.coarseRadius;
    const cm = Rc + 1;
    let cBest = Infinity;
    let cdx = 0;
    let cdy = 0;
    for (let dy = -Rc; dy <= Rc; dy++) {
      for (let dx = -Rc; dx <= Rc; dx++) {
        const s = this.sad(refH, curH, this.hw, this.hh, dx, dy, cm);
        if (s < cBest) {
          cBest = s;
          cdx = dx;
          cdy = dy;
        }
      }
    }

    // nível fino: ±1 em volta de 2× o candidato grosso, na resolução completa
    const w = this.w;
    const h = this.h;
    const fm = 2 * Rc + 4;
    const area = (w - 2 * fm) * (h - 2 * fm);
    if (area <= 0) return null;
    const bx = cdx * 2;
    const by = cdy * 2;
    const grid = this.fineGrid;
    let best = Infinity;
    let bi = 1;
    let bj = 1;
    for (let j = 0; j < 3; j++) {
      for (let i = 0; i < 3; i++) {
        const s = this.sad(ref, cur, w, h, bx + i - 1, by + j - 1, fm);
        grid[j * 3 + i] = s;
        if (s < best) {
          best = s;
          bi = i;
          bj = j;
        }
      }
    }
    const ix = bx + bi - 1;
    const iy = by + bj - 1;

    // erro residual demasiado alto: imagem caótica ou movimento maior que o alcance
    if (best / area > 40) return null;
    // fora de zero só aceita se for claramente melhor do que não mover
    if (ix !== 0 || iy !== 0) {
      const zero = Math.abs(bx) <= 1 && Math.abs(by) <= 1 ? grid[(1 - by) * 3 + (1 - bx)] : this.sad(ref, cur, w, h, 0, 0, fm);
      if (best > zero * 0.9) return null;
    }

    // refinamento sub-píxel: a SAD em torno do mínimo tem forma de V (custo L1),
    // por isso ajusta-se um V em vez de uma parábola. Quando o mínimo cai na borda
    // da grelha fina, calcula-se o vizinho em falta
    const l = bi > 0 ? grid[bj * 3 + bi - 1] : this.sad(ref, cur, w, h, ix - 1, iy, fm);
    const r = bi < 2 ? grid[bj * 3 + bi + 1] : this.sad(ref, cur, w, h, ix + 1, iy, fm);
    const u = bj > 0 ? grid[(bj - 1) * 3 + bi] : this.sad(ref, cur, w, h, ix, iy - 1, fm);
    const d = bj < 2 ? grid[(bj + 1) * 3 + bi] : this.sad(ref, cur, w, h, ix, iy + 1, fm);
    let dx = ix;
    let dy = iy;
    const denX = 2 * (Math.max(l, r) - best);
    if (denX > 0) dx += Math.max(-0.5, Math.min(0.5, (l - r) / denX));
    const denY = 2 * (Math.max(u, d) - best);
    if (denY > 0) dy += Math.max(-0.5, Math.min(0.5, (u - d) / denY));
    return { dx, dy };
  }
}
