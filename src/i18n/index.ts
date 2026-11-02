import { useSettings } from '../state/settings';
import type { Lang } from '../types';

/**
 * Tradução mínima: dicionários planos por idioma e `t(chave, variáveis)`.
 * As variáveis são escritas como {nome}.
 */
const pt = {
  'menu.kicker': 'Realidade aumentada',
  'menu.tag': 'Aponta o telemóvel, encontra os alvos, dispara.',
  'menu.howto1.title': 'Olha em volta',
  'menu.howto1.text': 'os alvos aparecem em direções aleatórias. Usa o radar.',
  'menu.howto2.title': 'Toca no ecrã',
  'menu.howto2.text': 'ou no botão FOGO para disparar. Recarrega com ⟳.',
  'menu.howto3.title': 'Evita as bombas',
  'menu.howto3.text': 'alvos que não abates a tempo explodem e tiram vida.',
  'menu.howto4.title': 'Apanha power-ups',
  'menu.howto4.text': 'e derrota o chefe a cada 5 ondas. Combos multiplicam pontos.',
  'menu.best': 'Melhor pontuação',
  'menu.start': 'Iniciar',
  'menu.preparing': 'A preparar…',
  'menu.cameraContinues': 'O jogo continua sem câmera.',
  'menu.gyroActive': 'Giroscópio ativo',
  'menu.https': 'Abre em HTTPS para a câmera e o giroscópio funcionarem.',
  'menu.diag': 'Diagnóstico de sensores',
  'menu.settings': 'Definições',
  'menu.howtoLink': 'Como jogar',
  'menu.privacy': 'A imagem da câmera é processada só no teu telemóvel e nunca é enviada para fora.',

  'sensor.cameraMode': 'Sem giroscópio: a vista segue a imagem da câmera. Roda o telemóvel para procurar os alvos.',
  'sensor.denied': 'Permissão de movimento negada. Vais olhar em volta arrastando o dedo.',
  'sensor.noGyro': 'Sem giroscópio detectado. Arrasta para olhar em volta.',
  'sensor.gyroOn': 'Giroscópio ativo',
  'sensor.deniedIos':
    'O Safari não deu acesso ao movimento. Recarrega a página, toca em Iniciar e escolhe "Permitir" quando o Safari perguntar. Se não perguntar: Definições → Safari → Movimento e Orientação.',
  'sensor.reload': 'Recarregar e tentar de novo',

  'calib.ready': 'Pronto?',
  'calib.pointForward': 'Aponta para a frente',
  'calib.gyro': 'Segura o telemóvel na vertical, virado para onde queres que seja a frente do jogo, e toca no ecrã.',
  'calib.camera':
    'A vista segue a imagem da câmera: roda o telemóvel devagar para olhar em volta. Aponta para onde queres que seja a frente e toca no ecrã.',
  'calib.pointer': 'Arrasta para olhar em volta e toca para disparar. Teclas: Espaço dispara, R recarrega, 1-4 troca de arma.',
  'calib.start': 'Começar',
  'calib.msgGyro': 'Giroscópio ativo: move o telemóvel',
  'calib.msgCamera': 'Modo câmera: roda o telemóvel devagar',
  'calib.msgPointer': 'Sem giroscópio: arrasta para olhar',

  'pause.title': 'Pausa',
  'pause.points': '{n} pontos',
  'pause.control': 'Controlo: {mode} ⇄',
  'pause.resume': 'Continuar',
  'pause.end': 'Terminar jogo',

  'mode.gyro': 'giroscópio',
  'mode.camera': 'câmera (imagem)',
  'mode.pointer': 'toque (arrastar)',
  'mode.none': '—',

  'over.record': 'Novo recorde!',
  'over.title': 'Fim de jogo',
  'over.wave': 'Onda',
  'over.kills': 'Abates',
  'over.accuracy': 'Precisão',
  'over.combo': 'Melhor combo',
  'over.time': 'Tempo',
  'over.best': 'Recorde',
  'over.again': 'Jogar outra vez',
  'over.menu': 'Menu',

  'hud.points': 'Pontos',
  'hud.combo': 'Combo x{n}',
  'hud.targets': '{a}/{b} alvos',
  'hud.waveDone': 'Onda concluída!',
  'hud.nextWave': 'Prepara-te para a próxima…',
  'hud.fire': 'FOGO',
  'hud.hold': 'SEGURA',
  'hud.reload': 'Recarregar',
  'hud.pause': 'Pausar',
  'hud.auto': 'auto',
  'hud.semi': 'semi',
  'hud.unlock': 'Onda {n}',
  'hud.boss': 'Chefe',
  'hud.infinite': '∞',

  'wave.label': 'Onda {n}',
  'wave.bossLabel': 'Onda {n} · Chefe',
  'wave.objective': 'Elimina {n} alvos',
  'wave.objectiveBombs': 'Elimina {n} alvos sem tocar nas bombas',
  'wave.objectiveArmored': 'Elimina {n} alvos (blindados precisam de 3 tiros)',
  'wave.objectiveGhost': 'Elimina {n} alvos — os fantasmas só se acertam quando visíveis',
  'wave.objectiveBoss': 'Derrota o chefe antes que ele te derrote',

  'msg.exploded': '{name} explodiu  -{n} vida',
  'msg.bomb': 'BOMBA!  {score}  -{n} vida',
  'msg.waveDone': 'Onda concluída  +{n}',
  'msg.newWeapon': 'Nova arma: {name}',
  'msg.bossAttack': 'Ataque do chefe  -{n} vida',
  'msg.bossDown': 'Chefe abatido  +{n}',
  'msg.heal': '+{n} vida',
  'msg.ammo': 'Munição infinita!',
  'msg.slow': 'Câmera lenta!',
  'msg.double': 'Pontos a dobrar!',

  'effect.ammo': 'Munição ∞',
  'effect.slow': 'Câmera lenta',
  'effect.double': 'Pontos x2',

  'target.balloon': 'Balão',
  'target.drone': 'Drone',
  'target.armored': 'Blindado',
  'target.splitter': 'Divisor',
  'target.mini': 'Mini',
  'target.ghost': 'Fantasma',
  'target.bonus': 'Bónus',
  'target.bomb': 'Bomba',
  'target.boss': 'Chefe',
  'target.heal': 'Vida',
  'target.ammo': 'Munição',
  'target.slow': 'Lentidão',
  'target.double': 'Dobro',

  'weapon.pistol': 'Pistola',
  'weapon.rifle': 'Fuzil',
  'weapon.shotgun': 'Caçadeira',
  'weapon.sniper': 'Sniper',

  'tut.title': 'Como jogar',
  'tut.skip': 'Saltar',
  'tut.next': 'Seguinte',
  'tut.start': 'Entendi',
  'tut.s1.title': 'Procura com a câmera',
  'tut.s1.text': 'Os alvos aparecem à tua volta, no mundo real. Roda o telemóvel para os encontrar. O radar no canto mostra onde estão: à esquerda do radar = roda para a esquerda.',
  'tut.s2.title': 'Dispara',
  'tut.s2.text': 'Toca em qualquer ponto do ecrã ou no botão FOGO. Com o fuzil, segura para disparo contínuo. Quando a munição acaba, recarrega com ⟳ ou espera.',
  'tut.s3.title': 'Não deixes escapar',
  'tut.s3.text': 'Um alvo que não abates a tempo explode contra ti e tira vida. Bombas vermelhas: não lhes acertes. A tua vida é a barra verde; a zero, acabou.',
  'tut.s4.title': 'Power-ups e chefes',
  'tut.s4.text': 'Alvos abatidos deixam cair cápsulas: acerta-lhes para ganhar vida, munição infinita, câmera lenta ou pontos a dobrar. A cada 5 ondas aparece um chefe que ataca de volta.',

  'set.title': 'Definições',
  'set.sound': 'Som',
  'set.vibration': 'Vibração',
  'set.quality': 'Qualidade gráfica',
  'set.quality.auto': 'Auto',
  'set.quality.high': 'Alta',
  'set.quality.medium': 'Média',
  'set.quality.low': 'Baixa',
  'set.language': 'Idioma',
  'set.tutorial': 'Ver tutorial',
  'set.close': 'Fechar',
  'set.on': 'Ligado',
  'set.off': 'Desligado',
  'set.fps': 'Desempenho atual',

  'error.title': 'Algo correu mal',
  'error.text': 'O jogo encontrou um erro inesperado. Recarrega a página para continuar.',
  'error.reload': 'Recarregar',
} as const;

export type MessageKey = keyof typeof pt;

const en: Record<MessageKey, string> = {
  'menu.kicker': 'Augmented reality',
  'menu.tag': 'Point your phone, find the targets, shoot.',
  'menu.howto1.title': 'Look around',
  'menu.howto1.text': 'targets appear in random directions. Use the radar.',
  'menu.howto2.title': 'Tap the screen',
  'menu.howto2.text': 'or the FIRE button to shoot. Reload with ⟳.',
  'menu.howto3.title': 'Avoid the bombs',
  'menu.howto3.text': 'targets you do not shoot in time explode and hurt you.',
  'menu.howto4.title': 'Grab power-ups',
  'menu.howto4.text': 'and beat the boss every 5 waves. Combos multiply points.',
  'menu.best': 'Best score',
  'menu.start': 'Start',
  'menu.preparing': 'Preparing…',
  'menu.cameraContinues': 'The game continues without the camera.',
  'menu.gyroActive': 'Gyroscope active',
  'menu.https': 'Open over HTTPS so the camera and gyroscope can work.',
  'menu.diag': 'Sensor diagnostics',
  'menu.settings': 'Settings',
  'menu.howtoLink': 'How to play',
  'menu.privacy': 'The camera image is processed only on your phone and never leaves it.',

  'sensor.cameraMode': 'No gyroscope: the view follows the camera image. Rotate the phone to search for targets.',
  'sensor.denied': 'Motion permission denied. You will look around by dragging.',
  'sensor.noGyro': 'No gyroscope detected. Drag to look around.',
  'sensor.gyroOn': 'Gyroscope active',
  'sensor.deniedIos':
    'Safari did not grant motion access. Reload the page, tap Start and choose "Allow" when Safari asks. If it does not ask: Settings → Safari → Motion & Orientation Access.',
  'sensor.reload': 'Reload and try again',

  'calib.ready': 'Ready?',
  'calib.pointForward': 'Point forward',
  'calib.gyro': 'Hold the phone upright, facing where you want the front of the game to be, and tap the screen.',
  'calib.camera':
    'The view follows the camera image: rotate the phone slowly to look around. Point where you want the front to be and tap the screen.',
  'calib.pointer': 'Drag to look around and tap to shoot. Keys: Space shoots, R reloads, 1-4 switch weapon.',
  'calib.start': 'Go',
  'calib.msgGyro': 'Gyroscope active: move the phone',
  'calib.msgCamera': 'Camera mode: rotate the phone slowly',
  'calib.msgPointer': 'No gyroscope: drag to look',

  'pause.title': 'Paused',
  'pause.points': '{n} points',
  'pause.control': 'Control: {mode} ⇄',
  'pause.resume': 'Resume',
  'pause.end': 'End game',

  'mode.gyro': 'gyroscope',
  'mode.camera': 'camera (image)',
  'mode.pointer': 'touch (drag)',
  'mode.none': '—',

  'over.record': 'New record!',
  'over.title': 'Game over',
  'over.wave': 'Wave',
  'over.kills': 'Kills',
  'over.accuracy': 'Accuracy',
  'over.combo': 'Best combo',
  'over.time': 'Time',
  'over.best': 'Record',
  'over.again': 'Play again',
  'over.menu': 'Menu',

  'hud.points': 'Score',
  'hud.combo': 'Combo x{n}',
  'hud.targets': '{a}/{b} targets',
  'hud.waveDone': 'Wave cleared!',
  'hud.nextWave': 'Get ready for the next one…',
  'hud.fire': 'FIRE',
  'hud.hold': 'HOLD',
  'hud.reload': 'Reload',
  'hud.pause': 'Pause',
  'hud.auto': 'auto',
  'hud.semi': 'semi',
  'hud.unlock': 'Wave {n}',
  'hud.boss': 'Boss',
  'hud.infinite': '∞',

  'wave.label': 'Wave {n}',
  'wave.bossLabel': 'Wave {n} · Boss',
  'wave.objective': 'Destroy {n} targets',
  'wave.objectiveBombs': 'Destroy {n} targets without hitting bombs',
  'wave.objectiveArmored': 'Destroy {n} targets (armored take 3 shots)',
  'wave.objectiveGhost': 'Destroy {n} targets — ghosts can only be hit while visible',
  'wave.objectiveBoss': 'Defeat the boss before it defeats you',

  'msg.exploded': '{name} exploded  -{n} health',
  'msg.bomb': 'BOMB!  {score}  -{n} health',
  'msg.waveDone': 'Wave cleared  +{n}',
  'msg.newWeapon': 'New weapon: {name}',
  'msg.bossAttack': 'Boss attack  -{n} health',
  'msg.bossDown': 'Boss defeated  +{n}',
  'msg.heal': '+{n} health',
  'msg.ammo': 'Infinite ammo!',
  'msg.slow': 'Slow motion!',
  'msg.double': 'Double points!',

  'effect.ammo': 'Ammo ∞',
  'effect.slow': 'Slow motion',
  'effect.double': 'Points x2',

  'target.balloon': 'Balloon',
  'target.drone': 'Drone',
  'target.armored': 'Armored',
  'target.splitter': 'Splitter',
  'target.mini': 'Mini',
  'target.ghost': 'Ghost',
  'target.bonus': 'Bonus',
  'target.bomb': 'Bomb',
  'target.boss': 'Boss',
  'target.heal': 'Health',
  'target.ammo': 'Ammo',
  'target.slow': 'Slow',
  'target.double': 'Double',

  'weapon.pistol': 'Pistol',
  'weapon.rifle': 'Rifle',
  'weapon.shotgun': 'Shotgun',
  'weapon.sniper': 'Sniper',

  'tut.title': 'How to play',
  'tut.skip': 'Skip',
  'tut.next': 'Next',
  'tut.start': 'Got it',
  'tut.s1.title': 'Search with the camera',
  'tut.s1.text': 'Targets appear around you, in the real world. Rotate the phone to find them. The radar in the corner shows where they are: left on the radar = turn left.',
  'tut.s2.title': 'Shoot',
  'tut.s2.text': 'Tap anywhere on the screen or the FIRE button. With the rifle, hold for continuous fire. When ammo runs out, reload with ⟳ or wait.',
  'tut.s3.title': 'Do not let them escape',
  'tut.s3.text': 'A target you do not shoot in time explodes against you and takes health. Red bombs: do not hit them. Your health is the green bar; at zero, it is over.',
  'tut.s4.title': 'Power-ups and bosses',
  'tut.s4.text': 'Destroyed targets drop capsules: shoot them for health, infinite ammo, slow motion or double points. Every 5 waves a boss appears and fights back.',

  'set.title': 'Settings',
  'set.sound': 'Sound',
  'set.vibration': 'Vibration',
  'set.quality': 'Graphics quality',
  'set.quality.auto': 'Auto',
  'set.quality.high': 'High',
  'set.quality.medium': 'Medium',
  'set.quality.low': 'Low',
  'set.language': 'Language',
  'set.tutorial': 'Show tutorial',
  'set.close': 'Close',
  'set.on': 'On',
  'set.off': 'Off',
  'set.fps': 'Current performance',

  'error.title': 'Something went wrong',
  'error.text': 'The game hit an unexpected error. Reload the page to continue.',
  'error.reload': 'Reload',
};

const dictionaries: Record<Lang, Record<MessageKey, string>> = { pt, en };

export function currentLang(): Lang {
  return useSettings.getState().language;
}

/** traduz uma chave no idioma atual, substituindo {variáveis} */
export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  const lang = currentLang();
  let s: string = dictionaries[lang][key] ?? pt[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
  }
  return s;
}

/** hook: devolve `t` e volta a renderizar quando o idioma muda */
export function useT() {
  useSettings((s) => s.language);
  return t;
}

export function formatNumber(n: number): string {
  return n.toLocaleString(currentLang() === 'pt' ? 'pt-PT' : 'en-US');
}
