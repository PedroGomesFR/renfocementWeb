"use strict";
const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

// Logger minimal: méthode, chemin, status, durée
app.use((req, res, next) => {
  const t0 = Date.now();
  res.on('finish', () => {
    const dt = Date.now() - t0;
    console.log(`${req.method} ${req.path} -> ${res.statusCode} ${dt}ms`);
  });
  next();
});

// Santé
app.get('/health', (_req, res) => res.status(200).json({ status: 'ok', service: 'dernier-metro-api' }));

// Utilitaires horaires
function toHM(date) {
  return String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
}

function parseHM(str, def) {
  if (!str) return def;
  const [h, m] = str.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return def;
  return { h, m };
}

// Endpoint métier minimal
app.get('/next-metro', (req, res) => {
  const station = (req.query.station || '').toString().trim();
  if (!station) return res.status(400).json({ error: "missing station" });

  // Config via ENV
  const headwayMin = parseInt(process.env.HEADWAY_MIN, 10) || 3;
  const lastWindow = parseHM(process.env.LAST_WINDOW_START, { h: 0, m: 45 });
  const serviceEnd = parseHM(process.env.SERVICE_END, { h: 1, m: 15 });
  const tz = 'Europe/Paris';

  // Heure courante (Europe/Paris)
  const now = new Date();
  // Pour une vraie appli: utiliser une lib timezone (luxon, dayjs, etc). Ici, on suppose le serveur en Europe/Paris.

  const start = new Date(now); start.setHours(5, 30, 0, 0);
  const end = new Date(now); end.setHours(serviceEnd.h, serviceEnd.m, 0, 0);
  const last = new Date(now); last.setHours(lastWindow.h, lastWindow.m, 0, 0);

  if (now < start || now > end) {
    return res.status(200).json({ service: 'closed', tz });
  }

  const next = new Date(now.getTime() + headwayMin * 60 * 1000);
  const isLast = now >= last;

  return res.status(200).json({
    station,
    line: 'M1',
    headwayMin,
    nextArrival: toHM(next),
    isLast,
    tz
  });
});

// 404 JSON
app.use((_req, res) => res.status(404).json({ error: 'not found' }));

app.listen(PORT, () => console.log(`API ready on http://localhost:${PORT}`));
