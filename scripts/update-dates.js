const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../db.json');
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

// Find the date with the MOST fileAttente entries (richest data)
const dateCounts = {};
db.fileAttente.forEach(f => {
  if (!f.date) return;
  const clean = f.date.split('T')[0];
  dateCounts[clean] = (dateCounts[clean] || 0) + 1;
});

const richestDate = Object.entries(dateCounts)
  .sort((a, b) => b[1] - a[1])[0]?.[0];

console.log('Date counts:', dateCounts);
console.log('Richest date:', richestDate, '→', todayStr);

if (!richestDate || richestDate === todayStr) {
  console.log('Already up to date:', todayStr);
  process.exit(0);
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

db.fileAttente    = db.fileAttente.map(f => ({...f, date: shiftDate(f.date)}));
db.rendezVous     = db.rendezVous.map(r => ({...r, date: shiftDate(r.date)}));
db.consultations  = db.consultations.map(c => ({...c, date: shiftDate(c.date)}));
db.ordonnances    = db.ordonnances.map(o => ({...o, date: shiftDate(o.date)}));
db.examens        = db.examens.map(e => ({...e, date: shiftDate(e.date)}));
db.factures       = db.factures.map(f => ({
  ...f,
  date: shiftDate(f.date),
  datePaiement: shiftDate(f.datePaiement)
}));
db.patients       = db.patients.map(p => ({
  ...p,
  dernierVisite: shiftDate(p.dernierVisite)
}));

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
console.log('Done. Today entries:');
console.log('  fileAttente:', db.fileAttente.filter(f => f.date === todayStr).length);
console.log('  consultations:', db.consultations.filter(c => c.date === todayStr).length);
console.log('  rendezVous:', db.rendezVous.filter(r => r.date === todayStr).length);