import { Component, OnInit, HostListener } from '@angular/core';
import { MockDataService } from '../../services/mock-data.service';
import { ToastService } from '../../services/toast.service';
import { SidebarRefreshService } from '../../services/sidebar-refresh.service';
import { Patient, RendezVous } from '../../models';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  rdvs: RendezVous[];
}

@Component({
  selector: 'app-agenda',
  templateUrl: './agenda.component.html',
  styleUrls: ['./agenda.component.css']
})
export class AgendaComponent implements OnInit {
  currentMonth = new Date();
  calendarDays: CalendarDay[] = [];
  allRdvs: RendezVous[] = [];
  allPatients: Patient[] = [];
  filteredPatients: Patient[] = [];
  selectedDate: Date | null = null;
  selectedDayRdvs: RendezVous[] = [];
  todayRdvs: RendezVous[] = [];
  viewMode: 'month' | 'list' = 'month';
  showNewRdvForm = false;
  saving = false;

  // Patient autocomplete
  patientQuery = '';
  selectedPatient: Patient | null = null;
  showPatientDropdown = false;

  // Inline confirm annuler
  confirmingCancel: number | null = null;

  timeSlots: string[] = [];

  mois = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  jours = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];

  newRdv = {
    patientId: 0,
    patientNom: '',
    date: new Date().toISOString().split('T')[0],
    heure: '09:00',
    motif: '',
    type: 'consultation' as 'consultation' | 'controle' | 'urgence',
    statut: 'confirme' as 'confirme' | 'attente' | 'annule' | 'termine' | 'arrive'
  };

  get todayString(): string {
    return new Date().toISOString().split('T')[0];
  }

  constructor(
    private dataService: MockDataService,
    private toastService: ToastService,
    private sidebarRefreshService: SidebarRefreshService
  ) {
    for (let h = 8; h <= 19; h++) {
      this.timeSlots.push(`${h.toString().padStart(2, '0')}:00`);
      if (h < 19) this.timeSlots.push(`${h.toString().padStart(2, '0')}:30`);
    }
  }

  ngOnInit(): void {
    this.dataService.getPatients().subscribe(p => { this.allPatients = p; });
    this.loadRdvs();
  }

  loadRdvs(): void {
    this.dataService.getRendezVous().subscribe(rdvs => {
      this.allRdvs = rdvs;
      this.buildCalendar();
      const todayStr = this.todayString;
      this.todayRdvs = rdvs
        .filter(r => (r.date as unknown as string).startsWith(todayStr))
        .sort((a, b) => a.heure.localeCompare(b.heure));
      this.selectDay(this.selectedDate || new Date());
    });
  }

  // ── Patient autocomplete ──

  onPatientInput(): void {
    const q = this.patientQuery.toLowerCase().trim();
    if (!q) { this.filteredPatients = []; this.showPatientDropdown = false; return; }
    this.filteredPatients = this.allPatients.filter(p =>
      `${p.nom} ${p.prenom}`.toLowerCase().includes(q) ||
      `${p.prenom} ${p.nom}`.toLowerCase().includes(q)
    ).slice(0, 8);
    this.showPatientDropdown = this.filteredPatients.length > 0;
  }

  selectPatient(p: Patient): void {
    this.selectedPatient = p;
    this.patientQuery = `${p.nom} ${p.prenom}`;
    this.newRdv.patientId = p.id;
    this.newRdv.patientNom = `${p.nom} ${p.prenom}`;
    this.showPatientDropdown = false;
    this.filteredPatients = [];
  }

  clearPatient(): void {
    this.selectedPatient = null;
    this.patientQuery = '';
    this.newRdv.patientId = 0;
    this.newRdv.patientNom = '';
    this.filteredPatients = [];
    this.showPatientDropdown = false;
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: Event): void {
    const target = e.target as HTMLElement;
    if (!target.closest('.patient-autocomplete')) {
      this.showPatientDropdown = false;
    }
  }

  // ── Calendar ──

  buildCalendar(): void {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    this.calendarDays = [];

    for (let i = firstDay.getDay(); i > 0; i--) {
      const d = new Date(year, month, -i + 1);
      this.calendarDays.push({ date: d, isCurrentMonth: false, isToday: false, rdvs: this.getRdvsForDay(d) });
    }
    const today = new Date();
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      this.calendarDays.push({
        date, isCurrentMonth: true,
        isToday: this.isSameDay(date, today),
        rdvs: this.getRdvsForDay(date)
      });
    }
    const remaining = 42 - this.calendarDays.length;
    for (let d = 1; d <= remaining; d++) {
      const date = new Date(year, month + 1, d);
      this.calendarDays.push({ date, isCurrentMonth: false, isToday: false, rdvs: this.getRdvsForDay(date) });
    }
  }

  getRdvsForDay(date: Date): RendezVous[] {
    return this.allRdvs
      .filter(r => this.isSameDay(new Date(r.date as unknown as string), date))
      .sort((a, b) => a.heure.localeCompare(b.heure));
  }

  isSameDay(d1: Date, d2: Date): boolean {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  }

  prevMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, 1);
    this.buildCalendar();
  }

  nextMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
    this.buildCalendar();
  }

  goToToday(): void {
    this.currentMonth = new Date();
    this.buildCalendar();
    this.selectDay(new Date());
  }

  selectDay(date: Date): void {
    this.selectedDate = date;
    this.selectedDayRdvs = this.getRdvsForDay(date);
    this.newRdv.date = date.toISOString().split('T')[0];
    this.confirmingCancel = null;
  }

  // ── Actions ──

  markArrive(rdv: RendezVous): void {
    const today = this.todayString;
    const now = new Date().toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' });

    this.dataService.getFileAttenteAujourdhui().subscribe(list => {
      const maxOrdre = list.length > 0 ? Math.max(...list.map(x => x.ordre)) : 0;

      this.dataService.addFileAttente({
        patientId: rdv.patientId,
        patientNom: rdv.patientNom,
        type: 'avec_rdv',
        heureArrivee: now,
        statut: 'en_attente',
        ordre: maxOrdre + 1,
        date: today
      }).subscribe({
        next: () => {
          setTimeout(() => {
            this.dataService.updateRendezVous(rdv.id, { statut: 'arrive' }).subscribe({
              next: () => {
                this.sidebarRefreshService.triggerRefresh();
                this.loadRdvs();
                this.toastService.showSuccess(`${rdv.patientNom} ajouté à la file`);
              }
            });
          }, 400);
        },
        error: () => this.toastService.showError('Erreur')
      });
    });
  }

  requestCancel(rdv: RendezVous): void {
    this.confirmingCancel = rdv.id;
  }

  cancelConfirm(): void {
    this.confirmingCancel = null;
  }

  confirmAnnuler(rdv: RendezVous): void {
    this.confirmingCancel = null;
    // Optimistic UI: remove immediately
    this.allRdvs = this.allRdvs.map(r => r.id === rdv.id ? { ...r, statut: 'annule' as any } : r);
    this.todayRdvs = this.todayRdvs.map(r => r.id === rdv.id ? { ...r, statut: 'annule' as any } : r);
    this.selectedDayRdvs = this.selectedDayRdvs.map(r => r.id === rdv.id ? { ...r, statut: 'annule' as any } : r);
    this.buildCalendar();

    this.dataService.updateRendezVous(rdv.id, { statut: 'annule' }).subscribe({
      next: () => {
        this.toastService.showWarning(`RDV annulé — ${rdv.patientNom}`);
        this.loadRdvs();
      },
      error: () => {
        this.toastService.showError('Erreur annulation');
        this.loadRdvs();
      }
    });
  }

  // ── Save ──

  saveRdv(): void {
    if ((!this.selectedPatient && !this.patientQuery.trim()) || this.saving) return;

    if (this.newRdv.date < this.todayString) {
      this.toastService.showError('Impossible de créer un RDV pour une date passée');
      return;
    }

    this.saving = true;

    if (this.selectedPatient) {
      this.postRdv(this.selectedPatient.id, this.newRdv.patientNom);
      return;
    }

    const q = this.patientQuery.toLowerCase().trim();
    const found = this.allPatients.find(p =>
      `${p.nom} ${p.prenom}`.toLowerCase().includes(q) ||
      `${p.prenom} ${p.nom}`.toLowerCase().includes(q) ||
      p.nom.toLowerCase().includes(q)
    );

    if (found) {
      this.postRdv(found.id, `${found.nom} ${found.prenom}`);
    } else {
      this.dataService.addPatient({
        nom: this.patientQuery.trim(), prenom: '', telephone: '',
        antecedents: [], allergies: [], adresse: '', ville: '',
        cin: '', groupeSanguin: '', sexe: 'M', age: 0, dateNaissance: new Date() as any
      }).subscribe({
        next: (p) => this.postRdv(p.id, p.nom),
        error: () => { this.saving = false; this.toastService.showError('Erreur patient'); }
      });
    }
  }

  private postRdv(patientId: number, patientNom: string): void {
    this.dataService.addRendezVous({
      patientId,
      patientNom,
      date: new Date(this.newRdv.date) as any,
      heure: this.newRdv.heure,
      type: this.newRdv.type,
      motif: this.newRdv.motif,
      statut: this.newRdv.statut
    }).subscribe({
      next: () => {
        this.saving = false;
        this.toastService.showSuccess('RDV enregistré');
        this.showNewRdvForm = false;
        this.clearPatient();
        this.newRdv = {
          patientId: 0, patientNom: '',
          date: this.todayString,
          heure: '09:00', motif: '',
          type: 'consultation', statut: 'confirme'
        };
        this.loadRdvs();
      },
      error: () => { this.saving = false; this.toastService.showError('Erreur enregistrement'); }
    });
  }

  // ── Helpers ──

  getStatutClass(statut: string): string {
    const map: Record<string, string> = {
      confirme: 'statut-confirme', attente: 'statut-attente',
      annule: 'statut-annule', termine: 'statut-termine', arrive: 'statut-arrive'
    };
    return map[statut] || '';
  }

  getTypeColor(type: string): string {
    const map: Record<string, string> = {
      consultation: '#0d9488', controle: '#1e6bb5', urgence: '#e74c3c'
    };
    return map[type] || '#7a8b9a';
  }

  get monthLabel(): string {
    return `${this.mois[this.currentMonth.getMonth()]} ${this.currentMonth.getFullYear()}`;
  }

  get upcomingRdvs(): RendezVous[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.allRdvs
      .filter(r => new Date(r.date as unknown as string) >= today && r.statut !== 'annule')
      .sort((a, b) => {
        const da = new Date(a.date as unknown as string).getTime();
        const db = new Date(b.date as unknown as string).getTime();
        return da !== db ? da - db : a.heure.localeCompare(b.heure);
      })
      .slice(0, 12);
  }

  get statsToday() {
    const today = this.todayString;
    const t = this.allRdvs.filter(r => (r.date as unknown as string).startsWith(today));
    return {
      total: t.filter(r => r.statut !== 'annule').length,
      confirme: t.filter(r => r.statut === 'confirme').length,
      arrive: t.filter(r => r.statut === 'arrive').length,
      annule: t.filter(r => r.statut === 'annule').length
    };
  }
}