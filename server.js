const jsonServer = require('json-server');
const fs = require('fs');
const path = require('path');

// Run date update at startup AND store last update date
const dbPath = path.join(__dirname, 'db.json');

function updateDatesIfNeeded() {
  try {
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;

    const toLocalDate = (date) => {
      const yy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      return `${yy}-${mm}-${dd}`;
    };

    // Find richest date in fileAttente
    const dateCounts = {};
    db.fileAttente.forEach(f => {
      if (!f.date) return;
      const clean = f.date.split('T')[0];
      dateCounts[clean] = (dateCounts[clean] || 0) + 1;
    });

    const richestDate = Object.entries(dateCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0];

    if (!richestDate || richestDate === todayStr) {
      console.log('Dates already up to date:', todayStr);
      return;
    }

    const oldDate = new Date(richestDate + 'T12:00:00');
    const newDate = new Date(todayStr + 'T12:00:00');
    const diffDays = Math.round((newDate - oldDate) / (1000 * 60 * 60 * 24));

    console.log(`Shifting ${diffDays} days: ${richestDate} → ${todayStr}`);

    const shiftDate = (dateStr) => {
      if (!dateStr || typeof dateStr !== 'string') return dateStr;
      const clean = dateStr.split('T')[0];
      if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) return dateStr;
      const d = new Date(clean + 'T12:00:00');
      d.setDate(d.getDate() + diffDays);
      return toLocalDate(d);
    };

    db.fileAttente   = db.fileAttente.map(f => ({...f, date: shiftDate(f.date)}));
    db.rendezVous    = db.rendezVous.map(r => ({...r, date: shiftDate(r.date)}));
    db.consultations = db.consultations.map(c => ({...c, date: shiftDate(c.date)}));
    db.ordonnances   = db.ordonnances.map(o => ({...o, date: shiftDate(o.date)}));
    db.examens       = db.examens.map(e => ({...e, date: shiftDate(e.date)}));
    db.factures      = db.factures.map(f => ({
      ...f,
      date: shiftDate(f.date),
      datePaiement: shiftDate(f.datePaiement)
    }));
    db.patients      = db.patients.map(p => ({
      ...p,
      dernierVisite: shiftDate(p.dernierVisite)
    }));

    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    console.log('Dates updated to:', todayStr);
  } catch (err) {
    console.error('Date update error:', err.message);
  }
}

// Update dates at startup
updateDatesIfNeeded();

// Update dates every day at midnight (in case server stays alive)
setInterval(() => {
  updateDatesIfNeeded();
}, 1000 * 60 * 60); // every hour

const server = jsonServer.create();
const router = jsonServer.router(dbPath);
const middlewares = jsonServer.defaults();
const port = process.env.PORT || 3000;

server.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Allow-Methods', '*');
  next();
});

server.use(middlewares);
server.use(router);

server.listen(port, () => {
  console.log('MediCare+ API running on port', port);
});