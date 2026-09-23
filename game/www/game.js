(() => {
'use strict';
// ---------- Constantes & outils
const COLS = 5, ROWS = 7, TIERS = 30, TIER_XP = 100, DAY = 864e5;
const GAME_URL = /^https?:$/.test(location.protocol) ? location.origin + location.pathname : 'https://stacksnap.app/'; // à remplacer par l'URL publique du jeu
const PRIVACY_URL = 'https://stacksnap.app/privacy'; // à remplacer par votre politique de confidentialité
const $ = id => document.getElementById(id);
const cv = $('c'), ctx = cv.getContext('2d');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const today = () => new Date().toISOString().slice(0, 10);
const dayStr = off => new Date(Date.now() + off * DAY).toISOString().slice(0, 10);
const mulberry = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 };
const seedOf = s => [...String(s)].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261) >>> 0;
const label = lv => { const v = 2 ** lv; return v >= 1e6 ? (v / 1048576 | 0) + 'M' : v >= 1e4 ? (v / 1024 | 0) + 'K' : '' + v };
const clone = o => JSON.parse(JSON.stringify(o));
const native = () => !!window.Capacitor?.isNativePlatform?.();
const platform = () => window.Capacitor?.getPlatform?.();
const plugin = n => native() ? window.Capacitor.Plugins?.[n] : null;
const track = (name, params = {}) => { try { plugin('FirebaseAnalytics')?.logEvent({name, params}) } catch {} };
const show = (id, on) => $(id).style.display = on ? '' : 'none';
const open = id => $(id).style.display = 'flex', close = id => $(id).style.display = 'none';
const anyModal = () => [...document.querySelectorAll('.modal')].some(m => m.style.display === 'flex');

// ---------- Sauvegarde (un seul objet, exportable en code de transfert)
const DEF = {coins: 0, owned: ['classic', 'bg_night', 'snd_soft', 'fx_squares'], skin: 'classic', bg: 'bg_night', snd: 'snd_soft', pfx: 'fx_squares',
  inv: {ham: 0, undo: 0, shuf: 0}, granted: [], noAds: false, best: {}, top: [], ach: [], levels: {}, ms: {},
  stats: {games: 0, tile: 1, merges: 0, combo: 0, bombs: 0, jokers: 0},
  streak: 0, last: '', xp: 0, passClaimed: {f: [], p: []}, tut: false, offerAt: 0,
  lang: null, vol: 80, mute: false, noVib: false, notif: true};
let S;
try { S = Object.assign(clone(DEF), JSON.parse(localStorage.getItem('ss_save')) || {}) } catch { S = clone(DEF) }
for (const k of ['inv', 'stats', 'passClaimed']) S[k] = Object.assign(clone(DEF[k]), S[k]);
const fresh = (() => { try { return !localStorage.getItem('ss_save') } catch { return true } })();
const sig = () => JSON.stringify({...S, updatedAt: 0, syncedAt: 0});
let lastSig = sig();
function save(){ // horodate seulement les vrais changements, puis planifie l'envoi cloud
  const js = sig(); if (js === lastSig) return; lastSig = js; S.updatedAt = Date.now();
  try { localStorage.setItem('ss_save', JSON.stringify(S)) } catch {}
  if (cloudUid) { clearTimeout(cloudTimer); cloudTimer = setTimeout(cloudPush, 4000) }
}

// ---------- Sauvegarde cloud (Firebase Auth + Firestore), liée au compte Game Center / Play Jeux
let cloudUid = null, cloudName = '', cloudTimer;
const FA = () => plugin('FirebaseAuthentication'), FS = () => plugin('FirebaseFirestore');
async function cloudInit(){
  const A = FA(), F = FS(); if (!A || !F) return cloudUi();
  try {
    let u = (await A.getCurrentUser()).user;
    if (!u) try { u = (await (platform() === 'ios' ? A.signInWithGameCenter() : A.signInWithPlayGames())).user } catch {}
    if (!u) u = (await A.signInAnonymously()).user;
    cloudUid = u?.uid; cloudName = u?.displayName || '🎮 ' + String(cloudUid || '').slice(0, 5);
    if (cloudUid) {
      const d = (await F.getDocument({reference: 'saves/' + cloudUid})).snapshot?.data;
      if (d?.save && (fresh || d.updatedAt > (S.syncedAt || 0))) { mergeSave(JSON.parse(d.save)); lang = S.lang || lang; applyLang(); ui() }
      await cloudPush();
    }
  } catch {}
  cloudUi();
}
function mergeSave(R){ // la version distante gagne, sans jamais perdre d'achat ni de succès
  const uni = k => [...new Set([...(S[k] || []), ...(R[k] || [])])];
  const keep = {granted: uni('granted'), owned: uni('owned'), ach: uni('ach'), xp: Math.max(S.xp, R.xp || 0), noAds: S.noAds || !!R.noAds || uni('granted').includes('stacksnap_noads')};
  S = Object.assign(clone(DEF), R, keep); for (const k of ['inv', 'stats', 'passClaimed']) S[k] = Object.assign(clone(DEF[k]), S[k]);
  lastSig = ''; save();
}
async function cloudPush(){
  const F = FS(); if (!F || !cloudUid) return;
  try { const now = Date.now(); await F.setDocument({reference: 'saves/' + cloudUid, data: {save: JSON.stringify(S), updatedAt: now}});
    S.syncedAt = now; localStorage.setItem('ss_save', JSON.stringify(S)) } catch {}
  cloudUi();
}
function cloudUi(){ const el = document.getElementById('cloudTxt'); if (el) el.textContent = t('cloud') + ' : ' + t(cloudUid ? 'synced' : 'offline') }

// ---------- Langues
let lang = S.lang || (navigator.language || 'en').slice(0, 2); if (!I18N[lang]) lang = 'en';
const t = (k, ...a) => String(I18N[lang][k] ?? I18N.en[k] ?? k).replace(/\{(\d)\}/g, (_, i) => a[i]);
function applyLang(){
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i]').forEach(el => el.textContent = t(el.dataset.i));
  $('mode').textContent = t('md_' + G.mode) + ' ▾';
}

// ---------- Son & vibrations
let actx;
function tone(f, dur = .12, type = 'sine', vol = .18, slide = 0, delay = 0){
  if (S.mute || !S.vol) return;
  if (S.snd === 'snd_retro') { type = 'square'; vol *= .5 }
  if (S.snd === 'snd_bubble') { type = 'sine'; slide = slide || 1.8 }
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    const t0 = actx.currentTime + delay, o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(f * slide, t0 + dur);
    g.gain.setValueAtTime(vol * S.vol / 100, t0); g.gain.exponentialRampToValueAtTime(.001, t0 + dur);
    o.connect(g).connect(actx.destination); o.start(t0); o.stop(t0 + dur);
  } catch {}
}
const sfx = {
  drop: () => tone(180, .09, 'triangle', .25, .5),
  merge: (lv, combo) => { const f = 330 * 2 ** (((lv - 1) % 12) / 12) * (1 + (combo - 1) * .25); tone(f, .14, 'triangle', .2); tone(f * 1.5, .18, 'sine', .12, 1, .05) },
  over: () => [440, 370, 311, 220].forEach((f, i) => tone(f, .22, 'square', .07, 1, i * .15)),
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, .2, 'triangle', .15, 1, i * .1)),
  boom: () => { tone(90, .45, 'sawtooth', .25, .3); tone(60, .5, 'square', .12, .5, .05) },
  coin: () => { tone(988, .08, 'square', .08); tone(1319, .2, 'square', .08, 1, .08) },
};
function vibrate(p){
  if (S.noVib) return;
  const H = plugin('Haptics');
  if (H) { H.impact({style: Array.isArray(p) || p > 20 ? 'HEAVY' : 'LIGHT'}).catch(() => {}); return }
  try { navigator.vibrate?.(p) } catch {}
}

// ---------- Skins & thèmes
const SKINS = [
  {id: 'classic', price: 0, r: 12, col: lv => `hsl(${(lv * 47 + 200) % 360} 72% ${lv % 2 ? 58 : 66}%)`},
  {id: 'candy', price: 150, r: 24, col: lv => `hsl(${(lv * 37 + 300) % 360} 85% ${lv % 2 ? 72 : 80}%)`},
  {id: 'neon', price: 300, r: 6, col: lv => `hsl(${(lv * 61 + 90) % 360} 100% 55%)`},
  {id: 'gold', price: 500, r: 2, col: lv => `hsl(${45 - lv * 2} 90% ${Math.max(52, 80 - lv * 2)}%)`},
  {id: 'season', pass: true, r: 16, col: lv => `hsl(${(lv * 29 + 160) % 360} 65% ${lv % 2 ? 60 : 70}%)`},
  {id: 'royal', pass: true, r: 20, col: lv => `hsl(${(280 + lv * 12) % 360} 70% ${Math.max(55, 78 - lv * 2)}%)`},
];
const THEMES = [
  {id: 'bg_night', type: 'bg', price: 0}, {id: 'bg_stars', type: 'bg', price: 400}, {id: 'bg_aurora', type: 'bg', pass: true},
  {id: 'snd_soft', type: 'snd', price: 0}, {id: 'snd_retro', type: 'snd', price: 300}, {id: 'snd_bubble', type: 'snd', price: 300},
  {id: 'fx_squares', type: 'pfx', price: 0}, {id: 'fx_stars', type: 'pfx', price: 300}, {id: 'fx_confetti', type: 'pfx', price: 300},
];
const skin = () => SKINS.find(k => k.id === S.skin) || SKINS[0];
const skinName = id => (I18N[lang].sk || I18N.en.sk)[SKINS.findIndex(k => k.id === id)];
const color = lv => skin().col(lv);

// ---------- Publicités (AdMob) + consentement RGPD / ATT
const AD = {rew: {android: 'ca-app-pub-3940256099942544/5224354917', ios: 'ca-app-pub-3940256099942544/1712485313'},
            int: {android: 'ca-app-pub-3940256099942544/1033173712', ios: 'ca-app-pub-3940256099942544/4411468910'}}; // IDs de TEST Google
let adsReady;
function initAds(){
  const A = plugin('AdMob'); if (!A) return Promise.resolve(false);
  return adsReady ??= (async () => {
    try { const ci = await A.requestConsentInfo(); if (ci.isConsentFormAvailable && ci.status === 'REQUIRED') await A.showConsentForm() } catch {}
    try { const st = await A.trackingAuthorizationStatus(); if (st.status === 'notDetermined') await A.requestTrackingAuthorization() } catch {}
    try { await A.initialize() } catch {}
    return true;
  })();
}
const ads = {
  async rewarded(){
    const A = plugin('AdMob');
    if (S.noAds || !A) { await sleep(300); return true } // sans pub ou web : récompense directe
    try { await initAds(); await A.prepareRewardVideoAd({adId: AD.rew[platform()]}); return !!(await A.showRewardVideoAd()) } catch { return false }
  },
  async interstitial(){
    const A = plugin('AdMob'); if (S.noAds || !A) return;
    try { await initAds(); await A.prepareInterstitial({adId: AD.int[platform()]}); await A.showInterstitial() } catch {}
  },
};

// ---------- Achats intégrés (cordova-plugin-purchase)
const offerActive = () => S.offerAt && Date.now() - S.offerAt < DAY && !S.granted.includes('stacksnap_offer');
const hasPass = () => S.granted.includes('stacksnap_pass_s1');
const PRODUCTS = [
  {id: 'stacksnap_offer', once: true, flash: true, price: '1,99 €', name: () => t('offer'), desc: () => t('offer_d'), visible: offerActive, give(){ S.coins += 2000; S.inv.ham += 10; S.inv.shuf += 5 }},
  {id: 'stacksnap_starter', once: true, best: true, price: '4,99 €', name: () => t('p_starter'), desc: () => t('p_starter_d'), give(){ S.coins += 1000; S.inv.ham += 5; S.inv.undo += 5 }},
  {id: 'stacksnap_pass_s1', once: true, price: '4,99 €', name: () => t('pass_p'), desc: () => t('pass_p_d'), give(){}},
  {id: 'stacksnap_noads', once: true, price: '3,99 €', name: () => t('noads'), desc: () => t('p_noads_d'), give(){ S.noAds = true }},
  {id: 'stacksnap_coins_500', price: '0,99 €', name: () => t('p_coins', 500), give(){ S.coins += 500 }},
  {id: 'stacksnap_coins_1500', price: '2,99 €', name: () => t('p_coins', 1500), give(){ S.coins += 1500 }},
  {id: 'stacksnap_coins_5000', price: '7,99 €', name: () => t('p_coins', 5000), give(){ S.coins += 5000 }},
];
const iapStore = () => (native() && window.CdvPurchase?.store) || null;
const price = id => iapStore()?.get(id)?.pricing?.price || PRODUCTS.find(p => p.id === id).price;
function initIAP(){
  const P = window.CdvPurchase; if (!P || !native() || initIAP.done) return; initIAP.done = true;
  const {store: st, ProductType, Platform} = P, pf = platform() === 'ios' ? Platform.APPLE_APPSTORE : Platform.GOOGLE_PLAY;
  st.register(PRODUCTS.map(p => ({id: p.id, type: p.once ? ProductType.NON_CONSUMABLE : ProductType.CONSUMABLE, platform: pf})));
  st.when().approved(tx => { tx.products.forEach(p => grant(p.id)); tx.finish() })
    .productUpdated(pr => { if (pr.owned && PRODUCTS.find(p => p.id === pr.id)?.once) grant(pr.id, true) });
  st.initialize([pf]);
}
document.addEventListener('deviceready', initIAP);
function grant(id, silent){
  const p = PRODUCTS.find(x => x.id === id); if (!p || (p.once && S.granted.includes(id))) return;
  p.give(); if (p.once) S.granted.push(id);
  save(); ui(); refreshOpen();
  if (!silent) { toast(t('bought')); sfx.win(); track('purchase', {id}) }
}
async function buy(id){
  const P = window.CdvPurchase;
  if (native()) { P?.store.get(id)?.getOffer()?.order(); return } // en natif, jamais d'achat gratuit
  await sleep(400); grant(id); // simulation web uniquement
}

// ---------- Classement mondial (Firestore : scores/{uid}, iOS + Android)
async function lbSubmit(sc){
  const F = FS(); if (!F || !cloudUid || sc <= (S.lbBest || 0)) return;
  try { await F.setDocument({reference: 'scores/' + cloudUid, data: {name: cloudName.slice(0, 20), score: sc, updatedAt: Date.now()}}); S.lbBest = sc; save() } catch {}
}
async function lbShow(){
  const F = FS(); if (!F) return;
  try {
    const r = await F.getCollection({reference: 'scores', queryConstraints: [{type: 'orderBy', fieldPath: 'score', directionStr: 'desc'}, {type: 'limit', limit: 20}]});
    const esc = x => String(x).replace(/[<>&"]/g, c => '&#' + c.charCodeAt(0) + ';');
    $('world').innerHTML = r.snapshots.map(d => `<li ${d.id === cloudUid ? 'style="color:var(--acc)"' : ''}>${esc(d.data.name)} <small>${d.data.score}</small></li>`).join('') || '<li>—</li>';
  } catch {}
}

// ---------- Notifications locales
async function scheduleNotifs(){
  const L = plugin('LocalNotifications'); if (!L) return;
  try {
    await L.cancel({notifications: [{id: 1}, {id: 2}]});
    if (!S.notif || (await L.requestPermissions()).display !== 'granted') return;
    const at = (h, m) => { const d = new Date(Date.now() + DAY); d.setHours(h, m, 0, 0); return d };
    const n = [{id: 1, title: 'Stack & Snap', body: t('n_daily'), schedule: {at: at(19, 0)}}];
    if (S.streak > 1) n.push({id: 2, title: 'Stack & Snap', body: t('n_streak', S.streak), schedule: {at: at(21, 30)}});
    await L.schedule({notifications: n});
  } catch {}
}
document.addEventListener('visibilitychange', () => { if (document.hidden) { scheduleNotifs(); clearTimeout(cloudTimer); cloudPush() } });

// ---------- Toasts (file d'attente)
const toastQ = []; let toastOn = false;
function toast(txt){ toastQ.push(txt); if (!toastOn) nextToast() }
function nextToast(){
  const txt = toastQ.shift(), el = $('toast');
  if (!txt) { toastOn = false; return }
  toastOn = true; el.textContent = txt; el.classList.add('on');
  setTimeout(() => { el.classList.remove('on'); setTimeout(nextToast, 250) }, 1400);
}

// ---------- Missions, succès, pass, coffre
const MISSIONS = {
  tile: g => [t('m_tile', label(g)), () => G.maxLv, v => label(v)],
  combo: g => [t('m_combo', g), () => G.combo],
  score: g => [t('m_score', g), () => G.score],
  merges: g => [t('m_merges', g), () => S.ms.merges],
};
function loadMissions(){
  if (S.ms.date === today()) return;
  const rr = mulberry(seedOf(today() + 'm')), pick = n => Math.floor(rr() * n);
  const opts = [['tile', 7 + pick(3), 60], ['combo', 3 + pick(2), 50], ['score', 1000 * (2 + pick(4)), 60], ['merges', 30 + 10 * pick(4), 40]];
  opts.splice(pick(4), 1);
  S.ms = {date: today(), merges: 0, list: opts.map(([k, g, r]) => ({k, g, r, done: false}))};
}
function checkMissions(){
  for (const m of S.ms.list) if (!m.done) { const [txt, val] = MISSIONS[m.k](m.g);
    if (val() >= m.g) { m.done = true; S.coins += m.r; S.xp += 50; toast(`🎯 ${txt} ! +${m.r} 🪙`); sfx.coin() } }
}
const ACH = [
  ...[8, 9, 10, 11, 12].map((lv, i) => ({id: 't' + lv, txt: () => t('a_tile', label(lv)), ok: () => S.stats.tile >= lv, r: [50, 80, 120, 200, 500][i]})),
  ...[3, 5, 7].map((n, i) => ({id: 'c' + n, txt: () => t('m_combo', n), ok: () => S.stats.combo >= n, r: [30, 80, 200][i]})),
  ...[10, 100, 500].map((n, i) => ({id: 'g' + n, txt: () => t('a_games', n), ok: () => S.stats.games >= n, r: [30, 100, 300][i]})),
  ...[500, 5000].map((n, i) => ({id: 'm' + n, txt: () => t('a_merges', n), ok: () => S.stats.merges >= n, r: [50, 200][i]})),
  {id: 'b10', txt: () => t('a_bombs', 10), ok: () => S.stats.bombs >= 10, r: 60},
  {id: 'j10', txt: () => t('a_jokers', 10), ok: () => S.stats.jokers >= 10, r: 60},
  ...[3, 7, 30].map((n, i) => ({id: 's' + n, txt: () => t('a_streak', n), ok: () => S.streak >= n, r: [50, 150, 500][i]})),
  ...[10, 25, 50].map((n, i) => ({id: 'l' + n, txt: () => t('a_levels', n), ok: () => Object.keys(S.levels).length >= n, r: [100, 250, 600][i]})),
  {id: 'sc10k', txt: () => t('m_score', 10000), ok: () => Math.max(0, ...Object.values(S.best)) >= 10000, r: 150},
];
function checkAch(){
  for (const a of ACH) if (!S.ach.includes(a.id) && a.ok()) { S.ach.push(a.id); S.coins += a.r; S.xp += 20; toast(t('unlocked', a.txt()) + ` +${a.r} 🪙`); sfx.coin(); track('achievement', {id: a.id}) }
}
const tierOf = () => Math.min(TIERS, Math.floor(S.xp / TIER_XP));
function passReward(i, prem){
  if (!prem) return i % 5 === 4 ? {ham: 2} : {c: 30 + 5 * i};
  if (i === 9) return {skin: 'season'}; if (i === 19) return {theme: 'bg_aurora'}; if (i === 29) return {skin: 'royal'};
  return i % 3 === 2 ? {shuf: 2} : {c: 80 + 10 * i};
}
const rwTxt = r => r.c ? r.c + ' 🪙' : r.ham ? r.ham + ' 🔨' : r.shuf ? r.shuf + ' 🔀' : r.skin ? '🎨 ' + skinName(r.skin) : t(r.theme);
function giveReward(r, mult = 1){
  if (r.c) S.coins += r.c * mult; if (r.ham) S.inv.ham += r.ham * mult; if (r.shuf) S.inv.shuf += r.shuf * mult;
  for (const id of [r.skin, r.theme]) if (id && !S.owned.includes(id)) S.owned.push(id);
}
const CHEST = [{c: 20}, {c: 30}, {c: 40}, {c: 60}, {c: 80}, {c: 100}, {c: 200, ham: 2, shuf: 1}];
const chestStreak = () => S.last === dayStr(-1) ? S.streak + 1 : 1;
function renderChest(){
  const n = chestStreak(), d = (n - 1) % 7;
  $('chestTxt').textContent = t('streak', n);
  $('days').innerHTML = CHEST.map((r, i) => `<div class="${i === d ? 'on' : i < d ? 'past' : ''}" ${i === 6 ? 'style="grid-column:span 2"' : ''}>${t('chest_day', i + 1)}<br><b>${i === 6 ? '🎁 ' : ''}${[r.c && r.c + '🪙', r.ham && r.ham + '🔨', r.shuf && r.shuf + '🔀'].filter(Boolean).join(' ')}</b></div>`).join('');
}
async function claimChest(mult){
  if (mult > 1 && !(await ads.rewarded())) return;
  const n = chestStreak(); S.streak = n; S.last = today();
  giveReward(CHEST[(n - 1) % 7], mult); sfx.coin(); close('chest'); save(); ui(); scheduleNotifs(); track('chest', {day: n});
}

// ---------- État de partie
let G = {mode: 'classic'}, cell = 60, dpr = 1, hoverCol = -1, fx = [], shake = 0, lastTs = 0;
const TUT_COLS = [2, 2, 1, 1];
const bestKey = () => G.mode === 'daily' ? 'daily_' + today() : G.mode;
function newGame(mode = G.mode, o = {}){
  const level = o.level ?? 0;
  const seed = mode === 'daily' ? seedOf(today()) : mode === 'puzzle' ? seedOf('lvl' + level) : mode === 'challenge' ? o.seed >>> 0 : (Math.random() * 2 ** 31) >>> 0;
  G = {mode, seed, level, rng: mulberry(seed), grid: Array.from({length: COLS}, () => []), score: 0, maxLv: 3, busy: false, over: false,
    hams: 1, undos: 1, shufs: 1, nextHam: 1500, hamMode: false, continued: false, snap: null, combo: 0, drops: 0,
    time: 120, started: false, target: o.target || 0, tut: -1, q: [], endReason: ''};
  if (mode === 'puzzle') { G.goal = 6 + Math.floor(level / 10); G.moves = G.total = [30, 45, 70, 100, 150][G.goal - 6] - level % 10 }
  if (mode === 'classic' && !S.tut) { G.tut = 0; G.q = [1, 1, 2, 2, 1] }
  G.startBest = S.best[bestKey()] || 0;
  G.cur = randTile(); G.nxt = randTile();
  close('over'); fx = []; applyLang(); ui(); track('game_start', {mode});
}
function randTile(){
  if (G.q.length) return G.q.shift();
  const r = G.rng();
  if (G.maxLv >= 6) { if (r < .03) return 'B'; if (r < .06) return 'J' }
  const top = Math.max(1, Math.min(G.maxLv - 1, 6)), x = G.rng();
  return 1 + Math.floor(x * x * top);
}
const neighbors = (c, r) => [[c - 1, r], [c + 1, r], [c, r - 1], [c, r + 1]].filter(([x, y]) => G.grid[x]?.[y]);
const posOf = tl => { for (let c = 0; c < COLS; c++) { const r = G.grid[c].indexOf(tl); if (r >= 0) return [c, r] } return [0, 0] };
const px = (c, r) => [c * cell + cell / 2, cell * (ROWS + 1) - (r + .5) * cell];
function removeTiles(dead){
  const before = new Map(); G.grid.forEach(col => col.forEach((x, i) => before.set(x, i)));
  G.grid = G.grid.map(col => col.filter(x => !dead.has(x)));
  G.grid.forEach(col => col.forEach((x, i) => { if (before.get(x) !== i) x.fresh = true }));
}
async function resolve(){
  let combo = 0;
  for (;;) {
    let group = null, target = null;
    outer: for (let c = 0; c < COLS; c++) for (let r = 0; r < G.grid[c].length; r++) {
      const tl = G.grid[c][r]; if (!tl.fresh || tl.ice) continue;
      const seen = new Set([tl]), q = [[c, r]];
      while (q.length) { const [x, y] = q.pop();
        for (const [nx, ny] of neighbors(x, y)) { const n = G.grid[nx][ny];
          if (!n.ice && n.lv === tl.lv && !seen.has(n)) { seen.add(n); q.push([nx, ny]) } } }
      if (seen.size > 1) { group = [...seen]; target = tl; break outer }
      tl.fresh = false;
    }
    if (!group) break;
    combo++;
    const lv = target.lv + group.length - 1;
    if (lv > G.maxLv && lv >= 6) toast(t('newtile', label(lv)));
    target.lv = lv; target.s = 1.35;
    G.maxLv = Math.max(G.maxLv, lv); G.combo = Math.max(G.combo, combo);
    Object.assign(S.stats, {merges: S.stats.merges + 1, combo: Math.max(S.stats.combo, combo), tile: Math.max(S.stats.tile, G.maxLv)});
    S.ms.merges++;
    G.score += 2 ** lv * combo;
    removeTiles(new Set(group.filter(x => x !== target)));
    const [x, y] = px(...posOf(target));
    burst(x, y, color(lv), '+' + 2 ** lv * combo);
    if (combo > 1) fx.push({x: cell * COLS / 2, y: cell * 2.2, txt: t('combo', combo), life: 1.4, big: true});
    vibrate(combo > 1 ? [15, 30, 15] : 15); sfx.merge(lv, combo);
    ui(); await sleep(200);
  }
}
function snapshot(){
  const {cur, nxt, score, maxLv, hams, nextHam, moves, drops} = G;
  G.snap = {g: G.grid.map(col => col.map(x => ({lv: x.lv, ice: x.ice}))), cur, nxt, score, maxLv, hams, nextHam, moves, drops};
}
async function drop(c){
  if (G.busy || G.over) return;
  if (G.tut >= 0 && c !== TUT_COLS[G.tut]) { tone(200, .08); return }
  G.busy = true; snapshot(); G.started = true;
  const v = G.cur; G.cur = G.nxt; G.nxt = randTile(); G.drops++;
  if (G.mode === 'puzzle') G.moves--;
  const tl = {lv: typeof v === 'number' ? v : 0, k: typeof v === 'number' ? null : v, vy: ROWS + .5, s: 1, fresh: v !== 'B'};
  G.grid[c].push(tl); vibrate(8); sfx.drop(); ui();
  await sleep(150);
  const r = G.grid[c].indexOf(tl);
  if (v === 'B') { // bombe : détruit le carré 3×3
    const dead = new Set();
    for (let x = c - 1; x <= c + 1; x++) for (let y = r - 1; y <= r + 1; y++) { const n = G.grid[x]?.[y];
      if (n) { dead.add(n); burst(...px(x, y), n.ice ? '#bfe9ff' : n.k ? '#ff5c7a' : color(n.lv)) } }
    removeTiles(dead); sfx.boom(); vibrate([30, 40, 60]); shake = 12; S.stats.bombs++;
  } else if (v === 'J') { // joker : copie la plus grande tuile voisine
    const lvs = neighbors(c, r).map(([x, y]) => G.grid[x][y]).filter(n => !n.ice && !n.k).map(n => n.lv);
    tl.lv = lvs.length ? Math.max(...lvs) : 1; tl.k = null; tl.s = 1.3; S.stats.jokers++;
  }
  await resolve();
  const melted = new Set(); // glace : fond après 3 coups
  G.grid.forEach(col => col.forEach(x => { if (x.ice && --x.ice <= 0) melted.add(x) }));
  if (melted.size) { melted.forEach(x => burst(...px(...posOf(x)), '#bfe9ff')); removeTiles(melted); tone(1200, .12, 'sine', .08); await sleep(120); await resolve() }
  if (G.mode !== 'zen' && G.tut < 0 && G.maxLv >= 5 && G.drops % 12 === 0) {
    const cs = [...Array(COLS).keys()].filter(i => G.grid[i].length < ROWS - 1);
    if (cs.length) G.grid[cs[Math.floor(G.rng() * cs.length)]].push({lv: -1, ice: 3, vy: ROWS + .5, s: 1});
  }
  if (G.mode === 'zen') G.grid.forEach((col, i) => { while (col.length > ROWS - 2) { col.pop(); burst(...px(i, col.length), '#ffffff') } });
  if (G.tut >= 0 && ++G.tut >= TUT_COLS.length) { G.tut = -1; S.tut = true; S.coins += 100; toast(t('tutdone')); sfx.win(); track('tutorial_complete') }
  G.busy = false; ui();
  if (G.mode === 'puzzle' && G.maxLv >= G.goal) return end(true);
  if (G.grid.some(col => col.length > ROWS)) { G.endReason = 'full'; return end(false) }
  if (G.mode === 'puzzle' && G.moves <= 0) { G.endReason = 'moves'; return end(false) }
  if (G.mode === 'timed' && G.time <= 0) { G.endReason = 'time'; return end(false) }
}
function undo(){
  if (G.busy || G.over || !G.snap || !(G.undos + S.inv.undo)) return;
  G.undos ? G.undos-- : S.inv.undo--;
  const sn = G.snap; Object.assign(G, {cur: sn.cur, nxt: sn.nxt, score: sn.score, maxLv: sn.maxLv, hams: sn.hams, nextHam: sn.nextHam, moves: sn.moves, drops: sn.drops});
  G.grid = sn.g.map(col => col.map((x, i) => ({...x, vy: i, s: 1.15})));
  G.snap = null; tone(520, .15, 'sine', .15, .6); ui();
}
async function smash(e){
  const b = cv.getBoundingClientRect(), c = colAt(e), rw = Math.floor((b.bottom - e.clientY) / (b.height / (ROWS + 1)));
  if (G.busy || !G.grid[c][rw]) return;
  snapshot(); G.busy = true; G.hamMode = false; G.hams ? G.hams-- : S.inv.ham--;
  const tl = G.grid[c][rw]; burst(...px(c, rw), tl.ice ? '#bfe9ff' : color(tl.lv));
  removeTiles(new Set([tl])); tone(120, .2, 'sawtooth', .15, .4); vibrate(30); shake = 5; ui();
  await sleep(160); await resolve(); G.busy = false; ui();
}
async function shuffle(){
  if (G.busy || G.over || !(G.shufs + S.inv.shuf)) return;
  snapshot(); G.busy = true; G.shufs ? G.shufs-- : S.inv.shuf--;
  const all = G.grid.flat(), h = G.grid.map(col => col.length);
  for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [all[i], all[j]] = [all[j], all[i]] }
  G.grid = h.map(n => all.splice(0, n).map(x => Object.assign(x, {fresh: true, s: .5})));
  [300, 400, 500].forEach((f, i) => tone(f, .08, 'triangle', .12, 1, i * .05)); ui();
  await sleep(250); await resolve(); G.busy = false; ui();
}
function swapNext(){
  if (G.busy || G.over || G.tut >= 0) return;
  [G.cur, G.nxt] = [G.nxt, G.cur]; tone(660, .06, 'sine', .1); ui();
}
function end(win){
  G.over = true; G.busy = false; G.hamMode = false;
  S.stats.games++;
  const k = bestKey(); if (G.mode !== 'puzzle') S.best[k] = Math.max(S.best[k] || 0, G.score);
  let stars = 0;
  if (G.mode === 'puzzle' && win) { const f = G.moves / G.total; stars = f >= .3 ? 3 : f >= .1 ? 2 : 1; S.levels[G.level] = Math.max(S.levels[G.level] || 0, stars); S.xp += 30; track('level_complete', {level: G.level + 1, stars}) }
  if (G.mode === 'classic') { S.top = [...S.top, {s: G.score, d: today()}].sort((a, b) => b.s - a.s).slice(0, 10); lbSubmit(G.score) }
  const earned = Math.floor(G.score / 20) + stars * 20;
  S.coins += earned; S.xp += 10 + Math.floor(G.score / 50);
  if (S.stats.games >= 3 && !S.offerAt && !S.granted.length) S.offerAt = Date.now();
  save(); ui(); scheduleNotifs(); track('game_over', {mode: G.mode, score: G.score, tile: 2 ** G.maxLv});
  if (S.stats.games % 3 === 0) setTimeout(() => ads.interstitial(), 900);
  if (win) sfx.win(); else { sfx.over(); vibrate([40, 60, 80]) }
  $('ovTitle').textContent = win ? t('win') + ' ' + '⭐'.repeat(stars) : t('over');
  show('newbest', G.mode !== 'puzzle' && G.score > G.startBest && G.startBest > 0);
  $('ovtxt').textContent = t('besttile', G.score, label(G.maxLv)) + (G.mode === 'challenge' ? ` · ${G.score > G.target ? '🏆' : '❌'} ${t('beat', G.target)}` : '');
  $('earn').textContent = `+${earned} 🪙`; $('dbl').dataset.n = earned;
  show('cont', !win && !G.continued && G.mode !== 'zen'); show('nextlvl', win && G.level < 49); show('dbl', earned > 0);
  show('offerBtn', offerActive()); show('chall', G.mode !== 'puzzle');
  setTimeout(() => open('over'), 400);
}

// ---------- Partage (image + lien de défi)
const challengeLink = () => `${GAME_URL}?c=${G.seed}&s=${G.score}`;
async function shareOrCopy(data, btn){
  try { if (navigator.share) return await navigator.share(data); await navigator.clipboard.writeText(data.text); $(btn).textContent = t('copied') } catch {}
}
async function shareImage(){
  const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  g.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#1b1830'; g.fillRect(0, 0, W, H);
  g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.fillStyle = '#ffcf5c'; g.font = '800 72px system-ui'; g.fillText('Stack & Snap', W / 2, 120);
  g.fillStyle = '#f4f1ff'; g.font = '800 140px system-ui'; g.fillText(G.score, W / 2, 280);
  g.fillStyle = '#a9a2cc'; g.font = '600 40px system-ui'; g.fillText(t('besttile', G.score, label(G.maxLv)), W / 2, 350);
  const cs = 120, ox = (W - cs * COLS) / 2, oy = 400;
  g.fillStyle = '#ffffff0d'; g.fillRect(ox, oy, cs * COLS, cs * ROWS);
  G.grid.forEach((col, x) => col.forEach((tl, y) => y < ROWS && paint(g, ox + x * cs + 6, oy + (ROWS - 1 - y) * cs + 6, cs - 12, tl)));
  g.fillStyle = '#a9a2cc'; g.font = '600 34px system-ui'; g.textBaseline = 'alphabetic'; g.textAlign = 'center';
  g.fillText(t('beat', G.score) + ' · ' + GAME_URL.replace(/^https?:\/\//, ''), W / 2, 1310);
  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  const file = new File([blob], 'stacksnap.png', {type: 'image/png'});
  try { if (navigator.canShare?.({files: [file]})) { await navigator.share({files: [file], text: t('sharetxt', G.score) + ' ' + challengeLink()}); return } } catch { return }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'stacksnap.png'; a.click();
}

// ---------- Rendu
function rrect(g, x, y, w, h, r, fill){ g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); g.fillStyle = fill; g.fill() }
function paint(g, x, y, sz, tl){
  let fill, txt;
  if (tl.ice) { fill = '#bfe9ff'; txt = '❄️' }
  else if (tl.k === 'B') { fill = '#3a3350'; txt = '💣' }
  else if (tl.k === 'J') { fill = g.createLinearGradient(x, y, x + sz, y + sz); ['#ff5c7a', '#ffcf5c', '#5cffb0', '#5cb8ff', '#b35cff'].forEach((c, i) => fill.addColorStop(i / 4, c)); txt = '🌈' }
  else { fill = color(tl.lv); txt = label(tl.lv) }
  rrect(g, x, y, sz, sz, skin().r * sz / 52, fill);
  g.fillStyle = '#1b1830'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `800 ${sz * (txt.length > 3 ? .34 : .42)}px system-ui`; g.fillText(txt, x + sz / 2, y + sz / 2 + 1);
  if (tl.ice) { g.font = `800 ${sz * .26}px system-ui`; g.fillText(tl.ice, x + sz * .82, y + sz * .8) }
}
const asTile = v => typeof v === 'number' ? {lv: v} : {lv: 0, k: v};
function preview(canvas, v){ const g = canvas.getContext('2d'); g.clearRect(0, 0, 72, 72); paint(g, 4, 4, 64, asTile(v)) }
function burst(x, y, col, txt){
  const n = S.pfx === 'fx_confetti' ? 22 : 14;
  for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, v = 2 + Math.random() * 4;
    fx.push({x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, life: 1, col: S.pfx === 'fx_confetti' ? `hsl(${Math.random() * 360} 90% 65%)` : col, rot: Math.random() * 6}) }
  if (txt) fx.push({x, y, txt, life: 1.2});
}
function resize(){
  const b = $('board').getBoundingClientRect();
  cell = Math.floor(Math.min(b.width / COLS, (b.height - 8) / (ROWS + 1)));
  dpr = window.devicePixelRatio || 1;
  cv.style.width = cell * COLS + 'px'; cv.style.height = cell * (ROWS + 1) + 'px';
  cv.width = cell * COLS * dpr; cv.height = cell * (ROWS + 1) * dpr;
}
function frame(ts){
  const dt = Math.min(.1, (ts - lastTs) / 1000 || 0); lastTs = ts;
  if (G.mode === 'timed' && G.started && !G.over && !anyModal()) {
    G.time -= dt;
    if (G.time <= 0) { G.time = 0; if (!G.busy) { G.endReason = 'time'; end(false) } }
  }
  info();
  const W = cell * COLS, H = cell * (ROWS + 1);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
  if (shake > .3) { ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake); shake *= .85 }
  const danger = G.grid.some(col => col.length >= ROWS - 1);
  ctx.fillStyle = `rgba(255,92,122,${danger ? .18 + .12 * Math.sin(ts / 140) : .13})`; ctx.fillRect(0, 0, W, cell);
  ctx.strokeStyle = '#ff5c7a'; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(0, cell); ctx.lineTo(W, cell); ctx.stroke(); ctx.setLineDash([]);
  for (let c = 0; c < COLS; c++) {
    const lit = (c === hoverCol && !G.busy) || (G.tut >= 0 && c === TUT_COLS[G.tut]);
    rrect(ctx, c * cell + 3, cell + 3, cell - 6, H - cell - 6, 10, lit ? '#ffffff1c' : '#ffffff08');
    G.grid[c].forEach((tl, r) => {
      tl.vy += (r - tl.vy) * .35; tl.s += (1 - tl.s) * .2;
      const sz = (cell - 8) * tl.s, o = (cell - sz) / 2;
      paint(ctx, c * cell + o, H - (tl.vy + 1) * cell + o, sz, tl);
    });
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (G.tut >= 0) { ctx.font = `${cell * .6}px system-ui`; ctx.fillText('👇', TUT_COLS[G.tut] * cell + cell / 2, cell * .45 + Math.sin(ts / 150) * 6) }
  else if (hoverCol >= 0 && !G.busy && !G.over && !G.hamMode) { ctx.globalAlpha = .35; paint(ctx, hoverCol * cell + 4, 4, cell - 8, asTile(G.cur)); ctx.globalAlpha = 1 }
  fx = fx.filter(p => (p.life -= .025) > 0);
  for (const p of fx) {
    ctx.globalAlpha = Math.min(1, p.life);
    if (p.txt) { p.y -= p.big ? .4 : 1.2; ctx.fillStyle = p.big ? '#ffcf5c' : '#fff'; ctx.font = `800 ${cell * (p.big ? .55 : .32)}px system-ui`; ctx.fillText(p.txt, p.x, p.y) }
    else {
      p.x += p.vx; p.y += p.vy; p.vy += .25; p.rot += .2; ctx.fillStyle = p.col;
      if (S.pfx === 'fx_stars') { ctx.font = `${cell * .22}px system-ui`; ctx.fillText('✦', p.x, p.y) }
      else if (S.pfx === 'fx_confetti') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-5, -2, 10, 4); ctx.restore() }
      else ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
    }
  }
  ctx.globalAlpha = 1;
  if (!G.score && G.tut < 0 && G.grid.every(col => !col.length)) { ctx.fillStyle = '#a9a2cc'; ctx.font = `600 ${cell * .26}px system-ui`;
    ctx.fillText(t('hint1'), W / 2, H / 2); ctx.fillText(t('hint2'), W / 2, H / 2 + cell * .4) }
  if (G.hamMode) { ctx.fillStyle = '#ffcf5c'; ctx.font = `700 ${cell * .26}px system-ui`; ctx.fillText(t('hamhint'), W / 2, cell / 2) }
  requestAnimationFrame(frame);
}
function info(){
  let s = '';
  if (G.tut >= 0) s = t('tut' + (G.tut + 1));
  else if (G.mode === 'timed') { const x = Math.ceil(G.time); s = `⏱ ${x / 60 | 0}:${String(x % 60).padStart(2, '0')}` }
  else if (G.mode === 'puzzle') s = `${t('level')} ${G.level + 1} · 🎯 ${label(G.goal)} · ${t('moves', G.moves)}`;
  else if (G.mode === 'challenge') s = '⚔️ ' + t('beat', G.target);
  else if (G.mode === 'zen') s = '🧘';
  if ($('info').textContent !== s) $('info').textContent = s;
}
function ui(){
  loadMissions(); checkMissions(); checkAch();
  while (G.score >= G.nextHam) { G.hams++; G.nextHam += 1500; tone(880, .2) }
  const k = bestKey();
  $('score').textContent = G.score;
  $('best').textContent = G.mode === 'puzzle' ? ('⭐'.repeat(S.levels[G.level] || 0) || '—') : Math.max(S.best[k] || 0, G.score);
  $('coinsTop').textContent = S.coins; $('passTop').textContent = tierOf();
  const pw = (id, ico, n, extra) => { $(id).textContent = ico + ' ' + n; $(id).disabled = !n || G.over || extra };
  pw('ham', '🔨', G.hams + S.inv.ham); $('ham').classList.toggle('on', G.hamMode);
  pw('undo', '↩️', G.undos + S.inv.undo, !G.snap || G.busy);
  pw('shuf', '🔀', G.shufs + S.inv.shuf, G.busy);
  document.documentElement.style.setProperty('--bg', `hsl(${(250 + (G.maxLv - 3) * 23) % 360} 32% 14%)`);
  document.body.dataset.bg = S.bg;
  preview($('n1'), G.cur); preview($('n2'), G.nxt);
  save();
}

// ---------- Écrans
function renderMenu(){
  $('coins').textContent = S.coins; $('streakTxt').textContent = t('streak', S.streak);
  $('missions').innerHTML = S.ms.list.map(m => { const [txt, val, fmt = x => x] = MISSIONS[m.k](m.g);
    return `<div class="mi ${m.done ? 'done' : ''}"><span>${txt}</span><b>${m.done ? '✅' : fmt(Math.min(val(), m.g)) + '/' + fmt(m.g) + ' · +' + m.r + '🪙'}</b></div>` }).join('');
  $('achCount').textContent = `${S.ach.length}/${ACH.length}`;
  $('achs').innerHTML = ACH.map(a => `<div class="mi ${S.ach.includes(a.id) ? '' : 'done'}"><span>${S.ach.includes(a.id) ? '🏅' : '🔒'} ${a.txt()}</span><b>+${a.r}🪙</b></div>`).join('');
  $('skins').innerHTML = SKINS.map(k => { const own = S.owned.includes(k.id);
    return `<button class="sk ${k.id === S.skin ? 'on' : ''}" data-k="${k.id}" ${!own && k.pass ? 'disabled' : ''}><i style="background:${k.col(3)};border-radius:${k.r / 2}px"></i>${skinName(k.id)}<small>${own ? t(k.id === S.skin ? 'equipped' : 'choose') : k.pass ? t('passonly') : k.price + ' 🪙'}</small></button>` }).join('');
  $('top').innerHTML = S.top.map(x => `<li>${x.s} <small>${x.d}</small></li>`).join('') || '<li>—</li>';
  show('gc', !!(FS() && cloudUid)); $('world').innerHTML = '';
  $('stats').innerHTML = [[t('st_games'), S.stats.games], [t('st_tile'), label(S.stats.tile)], [t('st_merges'), S.stats.merges]]
    .map(([a, b]) => `<div class="mi"><span>${a}</span><b>${b}</b></div>`).join('');
}
function renderShop(){
  $('shopInv').textContent = `🪙 ${S.coins} · 🔨 ${S.inv.ham} · ↩️ ${S.inv.undo} · 🔀 ${S.inv.shuf}`;
  const left = () => { const ms = S.offerAt + DAY - Date.now(); return `${ms / 36e5 | 0}h ${String((ms / 6e4 | 0) % 60).padStart(2, '0')}m` };
  $('iap').innerHTML = PRODUCTS.filter(p => !p.visible || p.visible()).map(p => {
    const has = p.once && S.granted.includes(p.id);
    return `<div class="item ${has ? '' : p.flash ? 'flash' : p.best ? 'best' : ''}"><div>${p.flash && !has ? `<span class="tag">${t('endsin', left())}</span>` : p.best && !has ? `<span class="tag">${t('best_value')}</span>` : ''}<b>${p.name()}</b>${p.desc ? `<small>${p.desc()}</small>` : ''}</div>
      <button class="primary" data-buy="${p.id}" ${has ? 'disabled' : ''}>${has ? t('owned') : price(p.id)}</button></div>` }).join('');
  $('coinshop').innerHTML = COIN_ITEMS.map(c => `<div class="item"><b>${t(c.name)}</b><button data-coin="${c.k}" ${S.coins < c.cost ? 'disabled' : ''}>${c.cost} 🪙</button></div>`).join('');
  $('themes').innerHTML = THEMES.map(th => { const own = S.owned.includes(th.id), on = S[th.type] === th.id;
    return `<div class="item"><b>${t(th.id)}</b><button data-th="${th.id}" ${on || (!own && (th.pass || S.coins < th.price)) ? 'disabled' : ''}>${on ? t('equipped') : own ? t('choose') : th.pass ? t('passonly') : th.price + ' 🪙'}</button></div>` }).join('');
}
const COIN_ITEMS = [{k: 'ham', cost: 200, name: 'buy_ham'}, {k: 'undo', cost: 200, name: 'buy_undo'}, {k: 'shuf', cost: 300, name: 'buy_shuf'}];
function renderPass(){
  const tier = tierOf(), prem = hasPass();
  $('passLvl').textContent = `${t('tier')} ${tier}/${TIERS} · ${S.xp % TIER_XP}/${TIER_XP} XP`;
  $('passBar').style.width = (tier >= TIERS ? 100 : S.xp % TIER_XP) + '%';
  show('buyPass', !prem); $('buyPass').textContent = `${t('pass_p')} · ${price('stacksnap_pass_s1')}`;
  const btn = (tr, i) => { const pr = tr === 'p', r = passReward(i, pr), done = S.passClaimed[tr].includes(i), can = i < tier && (!pr || prem) && !done;
    return `<button data-claim="${tr}:${i}" ${can ? '' : 'disabled'}>${done ? '✅' : (pr && !prem ? '🔒 ' : '') + rwTxt(r)}</button>` };
  $('passList').innerHTML = Array.from({length: TIERS}, (_, i) => `<div class="tier ${i < tier ? 'on' : ''}"><b>${i + 1}</b>${btn('f', i)}${btn('p', i)}</div>`).join('');
}
const MODES = ['classic', 'daily', 'timed', 'zen', 'puzzle'];
function renderModes(){ $('modeList').innerHTML = MODES.map(m => `<button data-mode="${m}"><b>${t('md_' + m)}</b><small>${t('md_' + m + '_d')}</small></button>`).join('') }
function renderLevels(){
  $('lvls').innerHTML = Array.from({length: 50}, (_, i) => `<button data-l="${i}" ${i === 0 || S.levels[i - 1] ? '' : 'disabled'}>${i + 1}<small>${'★'.repeat(S.levels[i] || 0)}</small></button>`).join('');
}
function refreshOpen(){
  const on = id => $(id).style.display === 'flex';
  if (on('shop')) renderShop(); if (on('menu')) renderMenu(); if (on('pass')) renderPass();
}

// ---------- Entrées
const colAt = e => { const r = cv.getBoundingClientRect(); return Math.max(0, Math.min(COLS - 1, Math.floor((e.clientX - r.left) / (r.width / COLS)))) };
cv.addEventListener('pointermove', e => hoverCol = colAt(e));
cv.addEventListener('pointerleave', () => hoverCol = -1);
cv.addEventListener('pointerdown', e => G.hamMode ? smash(e) : drop(colAt(e)));
document.addEventListener('click', e => { const c = e.target.closest('[data-close]'); if (c) close(c.closest('.modal').id) });
$('n1').onclick = $('n2').onclick = swapNext;
$('ham').onclick = () => { if (G.busy || G.over || !(G.hams + S.inv.ham)) return; G.hamMode = !G.hamMode; ui() };
$('undo').onclick = undo;
$('shuf').onclick = shuffle;
$('mode').onclick = () => { if (G.busy) return; renderModes(); open('modes') };
$('modeList').onclick = e => { const b = e.target.closest('[data-mode]'); if (!b) return; close('modes');
  if (b.dataset.mode === 'puzzle') { renderLevels(); open('levels') } else newGame(b.dataset.mode) };
$('lvls').onclick = e => { const b = e.target.closest('[data-l]'); if (!b || b.disabled) return; close('levels'); newGame('puzzle', {level: +b.dataset.l}) };
$('again').onclick = () => newGame(G.mode, {level: G.level, seed: G.seed, target: G.target});
$('nextlvl').onclick = () => newGame('puzzle', {level: G.level + 1});
$('cont').onclick = async () => {
  if (!(await ads.rewarded())) return;
  G.continued = true; G.over = false; close('over');
  if (G.endReason === 'time') G.time += 30; else if (G.endReason === 'moves') G.moves += 5; else G.grid.forEach(col => col.splice(-3));
  tone(523, .15); tone(784, .2, 'sine', .15, 1, .1); ui();
};
$('dbl').onclick = async () => { if (!(await ads.rewarded())) return; const n = +$('dbl').dataset.n; S.coins += n; $('earn').textContent = `+${n * 2} 🪙`; show('dbl', false); sfx.coin(); ui() };
$('shareImg').onclick = shareImage;
$('chall').onclick = () => shareOrCopy({text: t('challtxt', G.score) + ' ' + challengeLink()}, 'chall');
$('offerBtn').onclick = () => { close('over'); renderShop(); open('shop') };
$('menuBtn').onclick = () => { renderMenu(); open('menu') };
$('shopBtn').onclick = () => { renderShop(); open('shop'); track('shop_open') };
$('passBtn').onclick = () => { renderPass(); open('pass') };
$('gc').onclick = lbShow;
$('skins').onclick = e => { const b = e.target.closest('[data-k]'); if (!b) return; const k = SKINS.find(s => s.id === b.dataset.k);
  if (!S.owned.includes(k.id)) { if (k.pass) return; if (S.coins < k.price) { b.querySelector('small').textContent = t('notenough'); return } S.coins -= k.price; S.owned.push(k.id); sfx.coin() }
  S.skin = k.id; ui(); renderMenu() };
$('iap').onclick = e => { const b = e.target.closest('[data-buy]'); if (b && !b.disabled) { b.disabled = true; buy(b.dataset.buy) } };
$('buyPass').onclick = () => buy('stacksnap_pass_s1');
$('restore').onclick = () => { try { window.CdvPurchase?.store.restorePurchases() } catch {} };
$('coinshop').onclick = e => { const b = e.target.closest('[data-coin]'); if (!b) return; const c = COIN_ITEMS.find(x => x.k === b.dataset.coin);
  if (S.coins < c.cost) return; S.coins -= c.cost; S.inv[c.k] += 3; sfx.coin(); ui(); renderShop() };
$('themes').onclick = e => { const b = e.target.closest('[data-th]'); if (!b || b.disabled) return; const th = THEMES.find(x => x.id === b.dataset.th);
  if (!S.owned.includes(th.id)) { S.coins -= th.price; S.owned.push(th.id) }
  S[th.type] = th.id; if (th.type === 'snd') sfx.coin(); ui(); renderShop() };
$('passList').onclick = e => { const b = e.target.closest('[data-claim]'); if (!b || b.disabled) return; const [tr, i] = b.dataset.claim.split(':');
  giveReward(passReward(+i, tr === 'p')); S.passClaimed[tr].push(+i); sfx.coin(); ui(); renderPass() };
$('claim').onclick = () => claimChest(1);
$('claim2').onclick = () => claimChest(2);
// Options
$('oLang').innerHTML = Object.entries(I18N).map(([k, v]) => `<option value="${k}">${v._}</option>`).join('');
$('optBtn').onclick = () => { $('oSnd').checked = !S.mute; $('oVol').value = S.vol; $('oVib').checked = !S.noVib; $('oNotif').checked = S.notif; $('oLang').value = lang; $('code').value = ''; cloudUi(); open('opts') };
$('oSnd').onchange = e => { S.mute = !e.target.checked; save(); sfx.drop() };
$('oVol').onchange = e => { S.vol = +e.target.value; save(); sfx.drop() };
$('oVib').onchange = e => { S.noVib = !e.target.checked; save(); vibrate(30) };
$('oNotif').onchange = e => { S.notif = e.target.checked; save(); scheduleNotifs() };
$('oLang').onchange = e => { lang = S.lang = e.target.value; save(); applyLang(); ui() };
$('privacy').onclick = () => { const A = plugin('AdMob'); A ? A.showConsentForm().catch(() => {}) : window.open(PRIVACY_URL, '_blank') };
$('exportBtn').onclick = async () => {
  const code = btoa(unescape(encodeURIComponent(JSON.stringify(S)))); $('code').value = code; $('code').select();
  try { await navigator.clipboard.writeText(code); $('exportBtn').textContent = t('copied') } catch {}
};
$('importBtn').onclick = () => {
  try { const d = JSON.parse(decodeURIComponent(escape(atob($('code').value.trim()))));
    if (typeof d.coins !== 'number' || !Array.isArray(d.owned)) throw 0;
    localStorage.setItem('ss_save', JSON.stringify(d)); toast(t('imported')); setTimeout(() => location.reload(), 800);
  } catch { toast(t('badcode')) }
};

// ---------- Démarrage
addEventListener('resize', resize);
resize();
const qp = new URLSearchParams(location.search);
if (qp.has('c')) newGame('challenge', {seed: +qp.get('c'), target: +qp.get('s') || 0}); else newGame('classic');
requestAnimationFrame(frame);
if (S.last !== today()) setTimeout(() => { renderChest(); open('chest') }, 500);
initIAP(); initAds(); scheduleNotifs(); cloudInit(); track('app_open');
if ('serviceWorker' in navigator && !native() && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
