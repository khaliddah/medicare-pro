import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { MockDataService } from '../../services/mock-data.service';

type PeriodeType = 'mois' | '3mois' | '6mois' | 'annee';

@Component({
  selector: 'app-statistiques',
  templateUrl: './statistiques.component.html',
  styleUrls: ['./statistiques.component.css']
})
export class StatistiquesComponent implements OnInit {
  loading = true;
  selectedPeriode: PeriodeType = 'mois';
  periodeSubtitle = '';

  // KPI Row 1
  patientsVus = 0;
  nouvellesConsultations = 0;
  revenusPeriode = 0;
  tauxOccupation = 0;

  // KPI trends
  patientsVusTrend = 0;
  revenusTrendPct = 0;
  joursTravailles = 0;

  // Revenue chart
  revenusChart: { label: string; montant: number; isCurrent: boolean }[] = [];

  // Consultations par type
  consParType: { type: string; count: number; pct: number }[] = [];

  // Top diagnostics
  topDiagnostics: { diagnostic: string; count: number; pct: number }[] = [];

  // Répartition âge (all patients)
  repartitionAge: { tranche: string; count: number; pct: number }[] = [];

  // Patients par mutuelle (all patients)
  mutuelles: { nom: string; count: number; pct: number }[] = [];

  // KPI misc
  tauxRetourPatients = 0;
  moyenneConsultationsJour = 0;
  analysesTotal = 0;
  analysesResultatsRecus = 0;

  // Délai paiement
  delaiMoyenPaiement = 0;

  // Sexe
  hommes = 0;
  femmes = 0;
  hommesPct = 0;
  femmesPct = 0;

  // Examens catégories
  examensParCategorie: { categorie: string; count: number; pct: number }[] = [];

  // Nouveaux patients
  nouveauxPatientsMois = 0;
  nouveauxPatientsMoisPrecedent = 0;

  // Row 4 factures
  encaissePeriode = 0;
  impayePeriode = 0;
  nbFacturesPeriode = 0;
  tauxRecouvrement = 0;

  readonly AGE_COLORS = ['#7c3aed', '#2563eb', '#0d9488', '#16a34a', '#d97706'];

  private allPatients: any[] = [];
  private allConsultations: any[] = [];
  private allFactures: any[] = [];
  private allExamens: any[] = [];

  private readonly MOIS_LABELS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
  private readonly MOIS_FULL = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

  constructor(private dataService: MockDataService) {}

  ngOnInit(): void {
    forkJoin({
      patients: this.dataService.getPatients(),
      consultations: this.dataService.getConsultations(),
      factures: this.dataService.getFactures(),
      examens: this.dataService.getExamens()
    }).subscribe(({ patients, consultations, factures, examens }) => {
      this.allPatients = patients;
      this.allConsultations = consultations;
      this.allFactures = factures;
      this.allExamens = examens;
      this.compute();
      this.loading = false;
    });
  }

  selectPeriode(p: PeriodeType): void {
    this.selectedPeriode = p;
    this.compute();
  }

  private getPeriodeDates(): { startDate: Date; endDate: Date } {
    const today = new Date();
    const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    let startDate: Date;

    if (this.selectedPeriode === 'mois') {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0);
    } else if (this.selectedPeriode === '3mois') {
      startDate = new Date(today.getFullYear(), today.getMonth() - 2, 1, 0, 0, 0, 0);
    } else if (this.selectedPeriode === '6mois') {
      startDate = new Date(today.getFullYear(), today.getMonth() - 5, 1, 0, 0, 0, 0);
    } else {
      startDate = new Date(today.getFullYear(), 0, 1, 0, 0, 0, 0);
    }

    return { startDate, endDate };
  }

  private compute(): void {
    const today = new Date();
    const { startDate, endDate } = this.getPeriodeDates();
    const currentMonthName = this.MOIS_FULL[today.getMonth()];

    // Subtitle
    if (this.selectedPeriode === 'mois') {
      this.periodeSubtitle = `Analyse de l'activité — ${currentMonthName} ${today.getFullYear()}`;
    } else if (this.selectedPeriode === '3mois') {
      const s = new Date(today.getFullYear(), today.getMonth() - 2, 1);
      this.periodeSubtitle = `Analyse de l'activité — ${this.MOIS_FULL[s.getMonth()]} → ${currentMonthName} ${today.getFullYear()}`;
    } else if (this.selectedPeriode === '6mois') {
      const s = new Date(today.getFullYear(), today.getMonth() - 5, 1);
      const sy = s.getFullYear();
      const yearSuffix = sy !== today.getFullYear() ? ` ${sy}` : '';
      this.periodeSubtitle = `Analyse de l'activité — ${this.MOIS_FULL[s.getMonth()]}${yearSuffix} → ${currentMonthName} ${today.getFullYear()}`;
    } else {
      this.periodeSubtitle = `Analyse de l'activité — ${today.getFullYear()}`;
    }

    const inPeriod = (dateVal: any): boolean => {
      const d = new Date(dateVal as string);
      return d >= startDate && d <= endDate;
    };

    const consultsPeriod = this.allConsultations.filter(c => inPeriod(c.date));
    const facturesPeriod = this.allFactures.filter(f => inPeriod(f.date));
    const examensPeriod = this.allExamens.filter(e => inPeriod(e.date));

    // KPI 1: Patients vus (unique)
    const uniquePids = new Set(consultsPeriod.map((c: any) => c.patientId));
    this.patientsVus = uniquePids.size;

    // KPI 2: Consultations
    this.nouvellesConsultations = consultsPeriod.length;

    // KPI 3: Revenus
    this.revenusPeriode = facturesPeriod
      .filter((f: any) => f.statut === 'payee')
      .reduce((s: number, f: any) => s + (f.montantPaye || 0), 0);

    // KPI 4: Taux occupation
    const workDays = this.getWorkDaysInPeriod(startDate, endDate);
    this.tauxOccupation = Math.min(100, Math.round((consultsPeriod.length / Math.max(workDays * 8, 1)) * 100));
    this.joursTravailles = workDays;

    // Previous period for trends
    let prevStart: Date, prevEnd: Date;
    if (this.selectedPeriode === 'mois') {
      prevStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      prevEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);
    } else if (this.selectedPeriode === '3mois') {
      prevStart = new Date(today.getFullYear(), today.getMonth() - 5, 1);
      prevEnd = new Date(today.getFullYear(), today.getMonth() - 3, 0, 23, 59, 59);
    } else if (this.selectedPeriode === '6mois') {
      prevStart = new Date(today.getFullYear(), today.getMonth() - 11, 1);
      prevEnd = new Date(today.getFullYear(), today.getMonth() - 6, 0, 23, 59, 59);
    } else {
      prevStart = new Date(today.getFullYear() - 1, 0, 1);
      prevEnd = new Date(today.getFullYear() - 1, 11, 31, 23, 59, 59);
    }
    const inPrev = (d: any) => { const dt = new Date(d); return dt >= prevStart && dt <= prevEnd; };
    const prevConsults = this.allConsultations.filter(c => inPrev(c.date));
    const prevUniqueIds = new Set(prevConsults.map((c: any) => c.patientId));
    this.patientsVusTrend = this.patientsVus - prevUniqueIds.size;
    const prevRevenu = this.allFactures.filter(f => inPrev((f as any).date) && (f as any).statut === 'payee')
      .reduce((s, f: any) => s + (f.montantPaye || 0), 0);
    this.revenusTrendPct = prevRevenu > 0
      ? Math.round(((this.revenusPeriode - prevRevenu) / prevRevenu) * 100)
      : (this.revenusPeriode > 0 ? 100 : 0);

    // Revenue chart
    this.buildRevenusChart(today);

    // Consultations par type
    const typeMap: Record<string, number> = { 'Consultation': 0, 'Contrôle': 0, 'Urgence': 0 };
    consultsPeriod.forEach((c: any) => {
      if (c.type === 'controle') typeMap['Contrôle']++;
      else if (c.type === 'urgence') typeMap['Urgence']++;
      else typeMap['Consultation']++;
    });
    const totalCons = consultsPeriod.length || 1;
    this.consParType = Object.entries(typeMap).map(([type, count]) => ({
      type, count, pct: Math.round((count / totalCons) * 100)
    }));

    // Top diagnostics (motif first)
    const diagCount: Record<string, number> = {};
    consultsPeriod.forEach((c: any) => {
      const key = (c.motif || c.diagnostic || '').trim();
      if (key) diagCount[key] = (diagCount[key] || 0) + 1;
    });
    const maxDiag = Math.max(...Object.values(diagCount), 1);
    this.topDiagnostics = Object.entries(diagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([diagnostic, count]) => ({
        diagnostic, count, pct: Math.round((count / maxDiag) * 100)
      }));

    // Répartition âge (all patients)
    const ageTranches = [
      { label: '0-18', min: 0, max: 18 },
      { label: '19-35', min: 19, max: 35 },
      { label: '36-55', min: 36, max: 55 },
      { label: '56-70', min: 56, max: 70 },
      { label: '71+', min: 71, max: 200 }
    ];
    const totalPats = this.allPatients.length || 1;
    this.repartitionAge = ageTranches.map(t => {
      const count = this.allPatients.filter((p: any) => {
        const age = this.calculateAge(p.dateNaissance);
        return age >= t.min && age <= t.max;
      }).length;
      return { tranche: t.label, count, pct: Math.round((count / totalPats) * 100) };
    });

    // Patients par mutuelle (all patients)
    const mutuelleCounts: Record<string, number> = {};
    this.allPatients.forEach((p: any) => {
      const m = (p.mutuelle || 'Aucune').trim();
      mutuelleCounts[m] = (mutuelleCounts[m] || 0) + 1;
    });
    this.mutuelles = Object.entries(mutuelleCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([nom, count]) => ({ nom, count, pct: Math.round((count / totalPats) * 100) }));

    // Taux retour patients
    const patConsultCounts: Record<number, number> = {};
    this.allConsultations.forEach((c: any) => {
      patConsultCounts[c.patientId] = (patConsultCounts[c.patientId] || 0) + 1;
    });
    const returningPats = Object.values(patConsultCounts).filter(n => n > 1).length;
    this.tauxRetourPatients = Math.round((returningPats / totalPats) * 100);

    // Moyenne consultations/jour
    this.moyenneConsultationsJour = workDays > 0
      ? Math.round((consultsPeriod.length / workDays) * 10) / 10
      : 0;

    // Analyses demandées
    this.analysesTotal = examensPeriod.length;
    this.analysesResultatsRecus = examensPeriod.filter((e: any) => e.statut === 'resultat_recu').length;

    // Délai moyen paiement
    const payeesWithDate = facturesPeriod.filter((f: any) => f.statut === 'payee' && f.datePaiement);
    if (payeesWithDate.length > 0) {
      const totalDays = payeesWithDate.reduce((sum: number, f: any) => {
        const df = new Date(f.date as string);
        const dp = new Date(f.datePaiement as string);
        return sum + Math.max(0, Math.round((dp.getTime() - df.getTime()) / 86400000));
      }, 0);
      this.delaiMoyenPaiement = Math.round(totalDays / payeesWithDate.length);
    } else {
      this.delaiMoyenPaiement = 0;
    }

    // Sexe (all patients)
    this.hommes = this.allPatients.filter((p: any) => p.sexe === 'M').length;
    this.femmes = this.allPatients.filter((p: any) => p.sexe === 'F').length;
    const totalSexe = (this.hommes + this.femmes) || 1;
    this.hommesPct = Math.round((this.hommes / totalSexe) * 100);
    this.femmesPct = Math.round((this.femmes / totalSexe) * 100);

    // Examens par catégorie
    const cardiologieKw = ['ecg', 'écho cardiaque', 'echo cardiaque', 'holter'];
    const radiologieKw = ['radio thorax', 'écho abdominale', 'echo abdominale', 'scanner', 'irm'];
    const catMap: Record<string, number> = { 'Biologie': 0, 'Cardiologie': 0, 'Radiologie': 0 };
    examensPeriod.forEach((e: any) => {
      (e.analyses || []).forEach((a: string) => {
        const low = a.toLowerCase();
        if (cardiologieKw.some(k => low.includes(k))) {
          catMap['Cardiologie']++;
        } else if (radiologieKw.some(k => low.includes(k))) {
          catMap['Radiologie']++;
        } else {
          catMap['Biologie']++;
        }
      });
    });
    const totalExams = Object.values(catMap).reduce((a, b) => a + b, 0) || 1;
    this.examensParCategorie = Object.entries(catMap).map(([categorie, count]) => ({
      categorie, count, pct: Math.round((count / totalExams) * 100)
    }));

    // Factures stats for period
    this.encaissePeriode = this.revenusPeriode;
    this.impayePeriode = facturesPeriod
      .filter((f: any) => f.statut === 'en_attente' || f.statut === 'impayee')
      .reduce((s: number, f: any) => s + ((f.total || 0) - (f.montantPaye || 0)), 0);
    this.nbFacturesPeriode = facturesPeriod.length;
    const totalFacture = this.encaissePeriode + this.impayePeriode;
    this.tauxRecouvrement = totalFacture > 0 ? Math.round((this.encaissePeriode / totalFacture) * 100) : 0;

    // Nouveaux patients
    const mStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const pmStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const pmEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);
    this.nouveauxPatientsMois = this.allPatients.filter((p: any) => {
      const d = new Date(p.dateCreation as string);
      return d >= mStart && d <= today;
    }).length;
    this.nouveauxPatientsMoisPrecedent = this.allPatients.filter((p: any) => {
      const d = new Date(p.dateCreation as string);
      return d >= pmStart && d <= pmEnd;
    }).length;
  }

  private buildRevenusChart(today: Date): void {
    if (this.selectedPeriode === 'mois') {
      const year = today.getFullYear();
      const month = today.getMonth();
      const lastDay = new Date(year, month + 1, 0).getDate();
      const weeks = [
        { label: 'Sem. 1', s: 1, e: 7 },
        { label: 'Sem. 2', s: 8, e: 14 },
        { label: 'Sem. 3', s: 15, e: 21 },
        { label: 'Sem. 4', s: 22, e: lastDay }
      ];
      const currentWeek = Math.min(3, Math.floor((today.getDate() - 1) / 7));
      this.revenusChart = weeks.map((w, i) => {
        const wS = new Date(year, month, w.s, 0, 0, 0);
        const wE = new Date(year, month, w.e, 23, 59, 59);
        const montant = this.allFactures
          .filter((f: any) => {
            const d = new Date(f.date as string);
            return f.statut === 'payee' && d >= wS && d <= wE;
          })
          .reduce((s: number, f: any) => s + (f.montantPaye || 0), 0);
        return { label: w.label, montant, isCurrent: i === currentWeek };
      });
    } else if (this.selectedPeriode === '3mois') {
      this.revenusChart = [];
      for (let i = 2; i >= 0; i--) this.revenusChart.push(this.monthBar(today, i));
    } else if (this.selectedPeriode === '6mois') {
      this.revenusChart = [];
      for (let i = 5; i >= 0; i--) this.revenusChart.push(this.monthBar(today, i));
    } else {
      this.revenusChart = [];
      for (let m = 0; m < 12; m++) {
        const montant = this.allFactures
          .filter((f: any) => {
            const fd = new Date(f.date as string);
            return f.statut === 'payee' && fd.getMonth() === m && fd.getFullYear() === today.getFullYear();
          })
          .reduce((s: number, f: any) => s + (f.montantPaye || 0), 0);
        this.revenusChart.push({ label: this.MOIS_LABELS[m], montant, isCurrent: m === today.getMonth() });
      }
    }
  }

  private monthBar(today: Date, monthsBack: number): { label: string; montant: number; isCurrent: boolean } {
    const d = new Date(today.getFullYear(), today.getMonth() - monthsBack, 1);
    const m = d.getMonth();
    const y = d.getFullYear();
    const montant = this.allFactures
      .filter((f: any) => {
        const fd = new Date(f.date as string);
        return f.statut === 'payee' && fd.getMonth() === m && fd.getFullYear() === y;
      })
      .reduce((s: number, f: any) => s + (f.montantPaye || 0), 0);
    return { label: this.MOIS_LABELS[m], montant, isCurrent: monthsBack === 0 };
  }

  calculateAge(dateNaissance: Date | string): number {
    const today = new Date();
    const birth = new Date(dateNaissance as string);
    let age = today.getFullYear() - birth.getFullYear();
    if (today.getMonth() < birth.getMonth() ||
      (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
    return age;
  }

  private getWorkDaysInPeriod(startDate: Date, endDate: Date): number {
    let count = 0;
    const cur = new Date(startDate);
    cur.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    while (cur <= end) {
      if (cur.getDay() !== 0) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  }

  getBarWidth(count: number, max: number): number {
    return Math.round((count / Math.max(max, 1)) * 100);
  }

  getMaxRevenu(): number {
    return Math.max(...this.revenusChart.map(r => r.montant), 1);
  }

  getMaxCons(): number {
    return Math.max(...this.consParType.map(c => c.count), 1);
  }

  getMaxDiag(): number {
    return Math.max(...this.topDiagnostics.map(d => d.count), 1);
  }

  getMaxAge(): number {
    return Math.max(...this.repartitionAge.map(r => r.count), 1);
  }

  getMaxMutuelle(): number {
    return Math.max(...this.mutuelles.map(m => m.count), 1);
  }

  getDonutDash(pct: number): string {
    const c = 2 * Math.PI * 32;
    return `${(pct / 100) * c} ${c}`;
  }

  getMutuelleColor(nom: string): string {
    const c: Record<string, string> = { 'CNOPS': '#0d9488', 'CNSS': '#2563eb', 'RMA': '#7c3aed' };
    return c[nom] || '#64748b';
  }

  getMutuelleBg(nom: string): string {
    const c: Record<string, string> = { 'CNOPS': '#f0fdfa', 'CNSS': '#eff6ff', 'RMA': '#f5f3ff' };
    return c[nom] || '#f1f5f9';
  }

  getNouveauxEvolution(): string {
    const diff = this.nouveauxPatientsMois - this.nouveauxPatientsMoisPrecedent;
    if (diff > 0) return `+${diff} vs mois précédent`;
    if (diff < 0) return `${diff} vs mois précédent`;
    return 'Stable vs mois précédent';
  }

  get allPatientsCount(): number {
    return this.allPatients.length;
  }
}