import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MockDataService } from '../../services/mock-data.service';
import { NotificationService } from '../../services/notification.service';
import { Consultation, FileAttente } from '../../models';

interface HourSlot { hour: number; count: number; }
interface MotifItem { motif: string; count: number; }
interface WeekDay   { label: string; patients: number; revenue: number; isToday: boolean; patientBarHeight: number; revenueBarHeight: number; }

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  loading = true;

  // Card 1 – Patients aujourd'hui
  patientsAujourdhuiTotal = 0;
  enAttenteCount = 0;
  vusAujourdhui = 0;

  // Card 2 – Consultations du jour
  consultationsTodayCount = 0;
  consultationTypeCount = 0;
  controleTypeCount = 0;
  urgenceTypeCount = 0;

  // Card 3 – Encaissé aujourd'hui
  encaisseAujourdhui = 0;
  recetteEnAttente = 0;

  // Card 4 – Attente moyenne
  avgWaitMinutes = 0;
  waitTrendLabel = 'Fluide';
  waitTrendColor = '#16a34a';
  waitTrendIcon = '🟢';

  // Card 5 – Activité horaire
  hourlyData: HourSlot[] = Array.from({ length: 12 }, (_, i) => ({ hour: 8 + i, count: 0 }));
  picActivite: number | null = null;
  heureCalme: number | null = null;

  // Card 6 – File d'attente statut
  enAttenteFileCount = 0;
  enConsultationFileCount = 0;
  terminesFileCount = 0;
  avecRdvFileCount = 0;
  totalFileCount = 0;
  completionPct = 0;

  // Card 7 – Top motifs
  topMotifs: MotifItem[] = [];

  // Card 8 – Ordonnances & Analyses
  ordonnancesToday = 0;
  examensToday = 0;
  topMedicine: string | null = null;
  examBio = 0;
  examCardio = 0;
  examRadio = 0;

  // Card 9 – Paiements du jour
  recettePayee = 0;
  recouvPct = 0;
  paiementModes: { label: string; count: number }[] = [];
  facturesEnAttenteCount = 0;
  facturesTotalEnAttente = 0;

  // Card 10 – Comparaison semaine
  weekDays: WeekDay[] = [];
  weekMaxPatients = 1;
  weekMaxRevenue = 1;

  // Card 11 – Résumé semaine
  weekConsultations = 0;
  weekNewPatients = 0;
  weekRdvHonores = 0;
  weekRevenuSemaine = 0;

  // Alertes (kept for data, removed from view)
  urgentEnAttente: FileAttente[] = [];
  longAttenteList: { fa: FileAttente; minutes: number }[] = [];
  sansRdvCount = 0;
  terminesCount = 0;
  unreadNotifCount = 0;

  private todayConsultations: Consultation[] = [];
  private fileAttenteAujourdhui: FileAttente[] = [];
  private refreshTimer: any;

  constructor(
    private dataService: MockDataService,
    private notifService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadAllData();
    this.loadFileAttente();
    this.refreshTimer = setInterval(() => this.loadFileAttente(), 20000);
  }

  ngOnDestroy(): void {
    clearInterval(this.refreshTimer);
  }

  private isSameDay(dateStr: string, today: string): boolean {
    if (!dateStr) return false;
    return dateStr.startsWith(today);
  }

  loadAllData(): void {
    forkJoin({
      consultations: this.dataService.getConsultations(),
      factures: this.dataService.getFactures(),
      ordonnances: this.dataService.getOrdonnances(),
      examens: this.dataService.getExamens(),
      allFileAttente: this.dataService.getAllFileAttente(),
      patients: this.dataService.getPatients(),
      rendezVous: this.dataService.getRendezVous()
    }).subscribe(({ consultations, factures, ordonnances, examens, allFileAttente, patients, rendezVous }) => {
      const toLocalDateStr = (date: Date): string => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      };
      const today = toLocalDateStr(new Date());

      // Filtered arrays for today
      const fileAttenteToday = allFileAttente.filter(f => this.isSameDay(f.date as unknown as string, today));
      const consultationsToday = consultations.filter(c => this.isSameDay(c.date as unknown as string, today));
      const facturesToday = factures.filter(f => this.isSameDay(f.date as unknown as string, today));
      const todayOrds = ordonnances.filter(o => this.isSameDay(o.date as unknown as string, today));
      const todayExams = examens.filter(e => this.isSameDay(e.date as unknown as string, today));

      // Card 1 & 6 – from fileAttenteToday
      this.patientsAujourdhuiTotal = fileAttenteToday.length;
      this.enAttenteCount          = fileAttenteToday.filter(f => f.statut === 'en_attente').length;
      this.terminesFileCount       = fileAttenteToday.filter(f => f.statut === 'termine').length;
      this.enConsultationFileCount = fileAttenteToday.filter(f => f.statut === 'en_consultation').length;
      this.enAttenteFileCount      = this.enAttenteCount;
      this.avecRdvFileCount        = fileAttenteToday.filter(f => f.type === 'avec_rdv').length;
      this.totalFileCount          = fileAttenteToday.length;
      this.vusAujourdhui           = this.terminesFileCount + this.enConsultationFileCount;
      this.completionPct = this.totalFileCount > 0
        ? Math.min(100, Math.round(this.terminesFileCount / this.totalFileCount * 100))
        : 0;

      // Card 2 – from consultationsToday
      this.todayConsultations = consultationsToday;
      this.consultationsTodayCount = consultationsToday.length;
      this.controleTypeCount = consultationsToday.filter(c => {
        const t = (c.type || '').toLowerCase();
        return t.includes('controle') || t.includes('contrôle');
      }).length;
      this.urgenceTypeCount = consultationsToday.filter(c => {
        const t = (c.type || '').toLowerCase();
        return t.includes('urgence');
      }).length;
      this.consultationTypeCount = consultationsToday.length - this.controleTypeCount - this.urgenceTypeCount;

      const typeSum = this.consultationTypeCount + this.controleTypeCount + this.urgenceTypeCount;
      if (typeSum !== consultationsToday.length) {
        console.warn('[Dashboard] COUNT MISMATCH — typeSum:', typeSum, '!== total:', consultationsToday.length);
      } else {
        console.log('[Dashboard] counts OK —', this.consultationTypeCount, 'consult +', this.controleTypeCount, 'contrôle +', this.urgenceTypeCount, 'urgence =', consultationsToday.length);
      }

      // Card 7 – Top motifs
      const motifCount: Record<string, number> = {};
      for (const c of consultationsToday) {
        const key = (c.motif || '').trim();
        if (key) motifCount[key] = (motifCount[key] || 0) + 1;
      }
      this.topMotifs = Object.entries(motifCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([motif, count]) => ({ motif, count }));

      // Card 8 – Ordonnances, Examens
      const ordonnancesCount = todayOrds.length;
      const analysesCount    = todayExams.length;
      this.ordonnancesToday  = ordonnancesCount;
      this.examensToday      = analysesCount;

      const medCount: Record<string, number> = {};
      for (const ord of todayOrds) {
        for (const med of (ord.medicaments || ([] as any[]))) {
          const k = med.nom.trim();
          if (k) medCount[k] = (medCount[k] || 0) + 1;
        }
      }
      this.topMedicine = Object.entries(medCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

      let bio = 0, cardio = 0, radio = 0;
      for (const ex of todayExams) {
        for (const a of (ex.analyses || [])) {
          const lower = a.toLowerCase();
          if (/radio|scanner|irm|echo|imagerie/.test(lower)) radio++;
          else if (/ecg|cardio|holter|doppler/.test(lower)) cardio++;
          else bio++;
        }
      }
      this.examBio = bio; this.examCardio = cardio; this.examRadio = radio;

      // Cards 3 & 9 – from facturesToday
      const encaisseToday      = facturesToday.filter(f => f.statut === 'payee').reduce((sum, f) => sum + (f.total || 0), 0);
      const enAttentePaiement  = facturesToday.filter(f => f.statut === 'en_attente').reduce((sum, f) => sum + (f.total || 0), 0);
      const payeeFacts         = facturesToday.filter(f => f.statut === 'payee');
      const enAttenteFacts     = facturesToday.filter(f => f.statut === 'en_attente');

      this.encaisseAujourdhui    = encaisseToday;
      this.recettePayee          = encaisseToday;
      this.recetteEnAttente      = enAttentePaiement;
      this.facturesTotalEnAttente = enAttentePaiement;
      this.facturesEnAttenteCount = enAttenteFacts.length;
      const recetteTotal = this.recettePayee + this.recetteEnAttente;
      this.recouvPct = recetteTotal > 0 ? Math.min(100, Math.round(this.recettePayee / recetteTotal * 100)) : 0;

      const modeMap: Record<string, number> = {};
      for (const f of payeeFacts) {
        const m = (f as any).modePaiement || 'autre';
        modeMap[m] = (modeMap[m] || 0) + 1;
      }
      const modeLabels: Record<string, string> = {
        especes: 'Espèces', cnops: 'CNOPS', cnss: 'CNSS',
        cheque: 'Chèque', virement: 'Virement', mutuelle: 'Mutuelle'
      };
      this.paiementModes = Object.entries(modeMap)
        .filter(([, c]) => c > 0)
        .map(([mode, count]) => ({ label: modeLabels[mode] || mode, count }));

      // Card 10 – Cette semaine
      const todayDate = new Date();
      const dow = todayDate.getDay(); // 0=dim, 1=lun, 2=mar...
      const offsetToMonday = dow === 0 ? -6 : -(dow - 1);
      const lundi = new Date(todayDate);
      lundi.setDate(todayDate.getDate() + offsetToMonday);
      lundi.setHours(0, 0, 0, 0);

      const labels = ['L', 'M', 'M', 'J', 'V', 'S'];
      const rawDays = [];
      for (let i = 0; i < 6; i++) {
        const d = new Date(lundi);
        d.setDate(lundi.getDate() + i);
        const dateStr = toLocalDateStr(d);
        const isToday = dateStr === today;
        const patients = allFileAttente.filter(f => (f.date as unknown as string) === dateStr).length;
        const revenue = factures
          .filter(f => (f.date as unknown as string) === dateStr && (f as any).statut === 'payee')
          .reduce((s: number, f: any) => s + (f.total || 0), 0);
        rawDays.push({ label: isToday ? 'Auj' : labels[i], dateStr, isToday, patients, revenue });
      }

      const maxPatients = Math.max(...rawDays.map(d => d.patients), 1);
      const maxRevenue  = Math.max(...rawDays.map(d => d.revenue), 1);
      this.weekMaxPatients = maxPatients;
      this.weekMaxRevenue  = maxRevenue;
      this.weekDays = rawDays.map(d => ({
        ...d,
        patientBarHeight: d.patients === 0 ? 0 : Math.max(8, Math.round((d.patients / maxPatients) * 120)),
        revenueBarHeight: d.revenue  === 0 ? 0 : Math.max(8, Math.round((d.revenue  / maxRevenue)  * 120))
      }));

      // Card 11 – Résumé semaine
      const monday = this.getMondayOfWeek(new Date());
      this.weekConsultations = consultations.filter(c =>
        new Date(c.date as unknown as string) >= monday
      ).length;
      this.weekNewPatients = patients.filter(p => {
        try { return new Date(p.dateCreation as unknown as string) >= monday; }
        catch { return false; }
      }).length;
      this.weekRdvHonores = rendezVous.filter(r =>
        r.statut === 'arrive' && new Date(r.date as unknown as string) >= monday
      ).length;
      this.weekRevenuSemaine = factures
        .filter(f => (f as any).statut === 'payee' && new Date((f.date as unknown as string)) >= monday)
        .reduce((sum: number, f: any) => sum + (f.total || f.montant || 0), 0);

      this.computeHourlyData();
      this.loading = false;
    });
  }

  private getMondayOfWeek(d: Date): Date {
    const date = new Date(d);
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    date.setDate(date.getDate() + diff);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  loadFileAttente(): void {
    forkJoin({
      consultation: this.dataService.getFileAttenteEnConsultation(),
      attente: this.dataService.getFileAttenteEnAttente(),
      today: this.dataService.getFileAttenteAujourdhui()
    }).subscribe({
      next: ({ consultation, attente, today }) => {
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const todayFiltered = today.filter(f => this.isSameDay(f.date as unknown as string, todayStr));
        this.fileAttenteAujourdhui = todayFiltered;

        // Card 4 – avg wait
        this.avgWaitMinutes = this.calculateAvgWait(todayFiltered);

        if (this.avgWaitMinutes < 20) {
          this.waitTrendLabel = 'Fluide';  this.waitTrendColor = '#16a34a'; this.waitTrendIcon = '🟢';
        } else if (this.avgWaitMinutes <= 45) {
          this.waitTrendLabel = 'Modéré'; this.waitTrendColor = '#d97706'; this.waitTrendIcon = '🟡';
        } else {
          this.waitTrendLabel = 'Chargé';  this.waitTrendColor = '#dc2626'; this.waitTrendIcon = '🔴';
        }

        // Alertes
        const nowTotalMins = new Date().getHours() * 60 + new Date().getMinutes();
        this.urgentEnAttente = attente.filter(f => f.type === 'urgent');
        this.longAttenteList = attente
          .map(fa => {
            const parts = (fa.heureArrivee || '00:00').split(':');
            const arrivalMins = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
            return { fa, minutes: Math.max(0, nowTotalMins - arrivalMins) };
          })
          .filter(x => x.minutes > 45 && x.fa.type !== 'urgent');
        this.sansRdvCount   = todayFiltered.filter(f => f.type === 'sans_rdv').length;
        this.terminesCount  = todayFiltered.filter(f => f.statut === 'termine').length;
        this.unreadNotifCount = this.notifService.getUnreadCount();

        this.notifService.checkFileAttente(todayFiltered);
        this.computeHourlyData();
      }
    });
  }

  private computeHourlyData(): void {
    const slots: HourSlot[] = Array.from({ length: 12 }, (_, i) => ({ hour: 8 + i, count: 0 }));
    for (const fa of this.fileAttenteAujourdhui) {
      const h = parseInt(fa.heureArrivee.split(':')[0], 10);
      const idx = h - 8;
      if (idx >= 0 && idx < 12) slots[idx].count++;
    }
    this.hourlyData = slots;
    const nonZero = slots.filter(s => s.count > 0);
    this.picActivite = nonZero.length > 0
      ? slots.reduce((mx, s) => s.count > mx.count ? s : mx).hour
      : null;
    this.heureCalme = nonZero.length > 0
      ? nonZero.reduce((mn, s) => s.count < mn.count ? s : mn).hour
      : null;
  }

  get maxHourCount(): number {
    return Math.max(...this.hourlyData.map(h => h.count), 1);
  }

  get currentHour(): number {
    return new Date().getHours();
  }

  get arcDash(): string {
    return `${(this.completionPct * 0.4712).toFixed(1)} 100`;
  }

  get weekRevenue(): number {
    return this.weekRevenuSemaine;
  }

  get consultationsTodaySubtitle(): string {
    let s = `${this.consultationTypeCount} consult.`;
    if (this.controleTypeCount > 0) s += ` · ${this.controleTypeCount} contrôle`;
    if (this.urgenceTypeCount > 0) s += ` · ${this.urgenceTypeCount} urgence`;
    return s;
  }

  getPatientBarHeight(count: number): number {
    if (this.weekMaxPatients === 0) return 4;
    return Math.max(4, Math.round((count / this.weekMaxPatients) * 80));
  }

  getRevenuBarHeight(revenue: number): number {
    if (this.weekMaxRevenue === 0) return 4;
    return Math.max(4, Math.round((revenue / this.weekMaxRevenue) * 80));
  }

  calculateAvgWait(fileAttente: any[]): number {
    const enAttente = fileAttente.filter(p => p.statut === 'en_attente');
    if (enAttente.length === 0) return 0;
    const now = new Date();
    const nowTotalMins = now.getHours() * 60 + now.getMinutes();
    const totalWait = enAttente.reduce((sum, p) => {
      const parts = (p.heureArrivee || '00:00').split(':');
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const arrivalMins = h * 60 + m;
      const waited = Math.max(0, nowTotalMins - arrivalMins);
      return sum + waited;
    }, 0);
    return Math.round(totalWait / enAttente.length);
  }

  get alertsCount(): number {
    return this.urgentEnAttente.length
      + this.longAttenteList.length
      + (this.sansRdvCount > 3 ? 1 : 0);
  }

  timeAgo(heureArrivee: string): string {
    const [h, m] = heureArrivee.split(':').map(Number);
    const diff = Math.max(0, new Date().getHours() * 60 + new Date().getMinutes() - (h * 60 + m));
    if (diff < 1) return 'à l\'instant';
    if (diff < 60) return `il y a ${diff} min`;
    return `il y a ${Math.floor(diff / 60)}h${diff % 60 > 0 ? diff % 60 : ''}`;
  }
}
