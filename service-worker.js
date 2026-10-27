/* CYBER-RUNNER : service worker (notifications de rappel + pastille sur l'icône)
   À mettre dans le même dossier que index.html, sur GitHub (remplace l'ancien fichier). */
const CR_CACHE = 'cr-notif-v1';
const CR_DAY_START_H = 10; // la journée cyber va de 10h00 à 9h59

const CR_ICON = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="20" fill="#0a0514"/>' +
  '<rect x="22" y="22" width="52" height="52" rx="6" fill="#05f7e8"/><rect x="34" y="38" width="8" height="12" fill="#0a0514"/>' +
  '<rect x="54" y="38" width="8" height="12" fill="#0a0514"/></svg>');

// minutes depuis 10h00 : "from"/"until" = fenêtre d'envoi. Une seule notif par type et par journée.
const CR_NOTIFS = [
  { id: 'quests', from: 0,   until: 600,  body: () => 'Tes quêtes du jour sont prêtes ! Va chercher tes crédits.', cond: () => true },
  { id: 'spin',   from: 180, until: 840,  body: () => "Fais ton tour gratuit ! Il n'attend que toi 😏", cond: st => st.spinKey !== st.day },
  { id: 'rhythm', from: 480, until: 840,  body: () => "Joue à Cyber-Runner, reste dans le rythme, la première place du classement mondial t'attend.. 😏", cond: st => st.playKey !== st.day },
  { id: 'streak', from: 630, until: 1380, body: st => 'Ta série de ' + st.streak + ' jour' + (st.streak > 1 ? 's' : '') + " va s'éteindre ! Une seule run suffit pour la sauver.", cond: st => st.streak > 0 && st.playKey !== st.day }
];

function cyberDayStart(now) { const st = new Date(now); st.setHours(CR_DAY_START_H, 0, 0, 0); if (now < st) st.setDate(st.getDate() - 1); return st; }
function keyOf(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

async function cacheGet(name) {
  try { const c = await caches.open(CR_CACHE); const r = await c.match(new URL(name, self.registration.scope).href); return r ? await r.json() : null; } catch (e) { return null; }
}
async function cachePut(name, obj) {
  try { const c = await caches.open(CR_CACHE); await c.put(new URL(name, self.registration.scope).href, new Response(JSON.stringify(obj), { headers: { 'Content-Type': 'application/json' } })); } catch (e) {}
}

async function checkNotifs() {
  if (Notification.permission !== 'granted') return;
  const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  if (wins.some(w => w.visibilityState === 'visible')) return; // le jeu est ouvert : pas de rappel
  const state = await cacheGet('cr-state.json');
  if (!state || !state.user || state.on === false) return;
  const now = new Date(), start = cyberDayStart(now), day = keyOf(start), mins = Math.floor((now - start) / 60000);
  const st = Object.assign({}, state, { day: day });
  const fired = (await cacheGet('cr-fired.json')) || {};
  Object.keys(fired).forEach(k => { if (fired[k] !== day) delete fired[k]; });
  for (const n of CR_NOTIFS) {
    const fk = state.user + '|' + n.id;
    if (fired[fk] === day || mins < n.from || mins > n.until || !n.cond(st)) continue;
    await self.registration.showNotification('CYBER-RUNNER', {
      body: n.body(st), tag: 'cr-' + n.id, icon: CR_ICON, badge: CR_ICON, vibrate: [120, 60, 120],
      data: { url: self.registration.scope }
    });
    fired[fk] = day;
    try { if (self.navigator && self.navigator.setAppBadge) await self.navigator.setAppBadge(1); } catch (e) {}
    break; // une seule notification par vérification
  }
  await cachePut('cr-fired.json', fired);
}

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim())); // on ne touche pas au cache des notifications

self.addEventListener('periodicsync', e => { if (e.tag === 'cr-notif-check') e.waitUntil(checkNotifs()); });

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || self.registration.scope;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { if ('focus' in c) return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
  
