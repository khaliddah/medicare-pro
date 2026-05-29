import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { delay, switchMap, finalize } from 'rxjs/operators';
import { MockDataService } from '../../services/mock-data.service';
import { ToastService } from '../../services/toast.service';
import { SidebarRefreshService } from '../../services/sidebar-refresh.service';
import { FileAttente, Patient, RendezVous } from '../../models';

@Component({
  selector: 'app-file-attente',
  templateUrl: './file-attente.component.html',
  styleUrls: ['./file-attente.component.css']
})
export class FileAttenteComponent implements OnInit, OnDestroy {

  enAttenteList: FileAttente[] = [];
  enConsultationItem: FileAttente | null = null;
  terminedTodayList: FileAttente[] = [];
  rdvAujourdhui: RendezVous[] = [];
  loading = false;
  isSwapping = false;
  private refreshTimer: any;

  // Modal
  showAddModal = false;
  searchQuery = '';
  searchResults: Patient[] = [];
  selectedPatient: Patient | null = null;
  addType: 'sans_rdv' | 'avec_rdv' | 'urgent' = 'sans_rdv';
  createMode = false;
  createNom = '';
  createPrenom = '';
  createTel = '';
  addingToQueue = false;
  private allPatients: Patient[] = [];

  constructor(
    private dataService: MockDataService,
    private toastService: ToastService,
    private sidebarRefreshService: SidebarRefreshService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.load();
    this.dataService.getPatients().subscribe(p => { this.allPatients = p; });
    this.dataService.getRdvAujourdhui().subscribe(r => {
      this.rdvAujourdhui = r.filter(rv => rv.statut !== 'annule');
    });
    this.refreshTimer = setInterval(() => this.load(), 30000);
  }

  ngOnDestroy(): void {
    clearInterval(this.refreshTimer);
  }

  load(): void {
    this.loading = true;
    forkJoin({
      attente: this.dataService.getFileAttenteEnAttente(),
      consultation: this.dataService.getFileAttenteEnConsultation(),
      today: this.dataService.getFileAttenteAujourdhui()
    }).subscribe({
      next: ({ attente, consultation, today }) => {
        this.enAttenteList = attente.sort((a, b) => a.ordre - b.ordre);
        this.enConsultationItem = consultation[0] || null;
        this.terminedTodayList = today.filter(x => x.statut === 'termine');
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  // Aliases for template
  get enAttente(): FileAttente[] { return this.enAttenteList; }
  get enConsultation(): FileAttente | null { return this.enConsultationItem; }

  getWaitMinutes(heureArrivee: string): number {
    const [h, m] = heureArrivee.split(':').map(Number);
    const arrivalMinutes = h * 60 + m;
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
    const waited = nowMinutes - arrivalMinutes;
    return waited > 0 ? waited : 0;
  }

  get avgWait(): number {
    if (this.enAttenteList.length > 0) {
      const total = this.enAttenteList.reduce(
        (sum, p) => sum + this.getWaitMinutes(p.heureArrivee), 0
      );
      return Math.round(total / this.enAttenteList.length);
    }
    // Fallback: estimate from terminated patients today (no heureAppel field → 20 min default)
    return this.terminedTodayList.length > 0 ? 20 : 0;
  }

  appellerSuivant(): void {
    const next = this.enAttenteList[0];
    if (!next) return;

    const terminePrev$ = this.enConsultationItem
      ? this.dataService.updateFileAttente(this.enConsultationItem.id, { statut: 'termine' })
      : null;

    const appelNext = () => {
      this.dataService.updateFileAttente(next.id, { statut: 'en_consultation' }).subscribe({
        next: () => {
          this.toastService.showSuccess(`Appel de ${next.patientNom}`);
          this.sidebarRefreshService.triggerRefresh();
          this.load();
        },
        error: () => this.toastService.showError('Erreur réseau')
      });
    };

    if (terminePrev$) {
      terminePrev$.subscribe({ next: appelNext, error: appelNext });
    } else {
      appelNext();
    }
  }

  removeFromQueue(item: FileAttente): void {
    this.dataService.updateFileAttente(item.id, { statut: 'termine' }).subscribe({
      next: () => { this.load(); },
      error: () => this.toastService.showError('Erreur réseau')
    });
  }

  moveUp(item: FileAttente): void {
    if (this.isSwapping) return;
    const list = this.enAttenteList;
    const idx = list.findIndex(x => x.id === item.id);
    if (idx <= 0) return;
    const prev = list[idx - 1];
    const o1 = item.ordre; const o2 = prev.ordre;
    this.isSwapping = true;
    this.dataService.updateFileAttente(item.id, { ordre: o2 }).pipe(
      delay(500),
      switchMap(() => this.dataService.updateFileAttente(prev.id, { ordre: o1 })),
      delay(500),
      switchMap(() => this.dataService.getFileAttenteEnAttente()),
      finalize(() => { this.isSwapping = false; })
    ).subscribe({
      next: (attente) => { this.enAttenteList = attente.sort((a, b) => a.ordre - b.ordre); }
    });
  }

  moveDown(item: FileAttente): void {
    if (this.isSwapping) return;
    const list = this.enAttenteList;
    const idx = list.findIndex(x => x.id === item.id);
    if (idx < 0 || idx >= list.length - 1) return;
    const next = list[idx + 1];
    const o1 = item.ordre; const o2 = next.ordre;
    this.isSwapping = true;
    this.dataService.updateFileAttente(item.id, { ordre: o2 }).pipe(
      delay(500),
      switchMap(() => this.dataService.updateFileAttente(next.id, { ordre: o1 })),
      delay(500),
      switchMap(() => this.dataService.getFileAttenteEnAttente()),
      finalize(() => { this.isSwapping = false; })
    ).subscribe({
      next: (attente) => { this.enAttenteList = attente.sort((a, b) => a.ordre - b.ordre); }
    });
  }

  ouvrirConsultation(item: FileAttente): void {
    this.router.navigate(['/consultation'], {
      queryParams: { patientId: item.patientId, fileAttenteId: item.id }
    });
  }

  marquerArrive(rdv: RendezVous): void {
    const nextOrdre = this.enAttenteList.length > 0
      ? Math.max(...this.enAttenteList.map(x => x.ordre)) + 1 : 1;
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' });
    this.dataService.addFileAttente({
      patientId: rdv.patientId,
      patientNom: rdv.patientNom,
      type: 'avec_rdv',
      heureArrivee: now,
      statut: 'en_attente',
      ordre: nextOrdre,
      date: today
    }).subscribe({
      next: () => {
        this.load();
        this.toastService.showSuccess('Patient ajouté à la file d\'attente');
        setTimeout(() => {
          this.dataService.updateRendezVous(rdv.id, { statut: 'arrive' }).subscribe(() => {
            this.dataService.getRdvAujourdhui().subscribe(r => {
              this.rdvAujourdhui = r.filter(rv => rv.statut !== 'annule');
            });
          });
        }, 400);
      },
      error: () => this.toastService.showError('Erreur réseau')
    });
  }

  isInQueue(patientId: number): boolean {
    return this.enAttenteList.some(x => x.patientId === patientId) ||
           (!!this.enConsultationItem && this.enConsultationItem.patientId === patientId);
  }

  isAlreadyArrived(rdv: RendezVous): boolean {
    return (rdv.statut as string) === 'arrive' || this.isInQueue(rdv.patientId);
  }

  // ── MODAL ──
  openAddModal(): void {
    this.showAddModal = true;
    this.searchQuery = ''; this.searchResults = [];
    this.selectedPatient = null; this.addType = 'sans_rdv';
    this.createMode = false;
    this.createNom = ''; this.createPrenom = ''; this.createTel = '';
  }

  closeAddModal(): void { this.showAddModal = false; }

  onSearch(): void {
    const q = this.searchQuery.trim().toLowerCase();
    if (q.length < 2) { this.searchResults = []; return; }
    this.searchResults = this.allPatients.filter(p =>
      `${p.nom} ${p.prenom}`.toLowerCase().includes(q) || p.telephone.includes(q)
    ).slice(0, 8);
  }

  selectPatient(p: Patient): void {
    this.selectedPatient = p;
    this.searchQuery = `${p.prenom} ${p.nom}`;
    this.searchResults = [];
    this.createMode = false;
  }

  switchToCreate(): void {
    this.createMode = true;
    this.selectedPatient = null;
    this.searchResults = [];
  }

  confirmerAjout(): void {
    if (this.createMode) {
      if (!this.createNom.trim() || !this.createPrenom.trim()) return;
      this.addingToQueue = true;
      this.dataService.addPatient({
        nom: this.createNom.trim(), prenom: this.createPrenom.trim(),
        telephone: this.createTel.trim(),
        cin: '', adresse: '', ville: '', sexe: 'M',
        groupeSanguin: 'Inconnu', antecedents: [], allergies: [],
        dateNaissance: new Date('1990-01-01')
      }).subscribe({
        next: p => {
          this.toastService.showSuccess(`Patient ${p.prenom} ${p.nom} créé avec succès`);
          this.addPatientToQueue(p);
        },
        error: () => { this.addingToQueue = false; this.toastService.showError('Erreur création patient'); }
      });
    } else if (this.selectedPatient) {
      this.addPatientToQueue(this.selectedPatient);
    }
  }

  private addPatientToQueue(p: Patient): void {
    const nextOrdre = this.enAttenteList.length > 0
      ? Math.max(...this.enAttenteList.map(x => x.ordre)) + 1 : 1;
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' });
    this.dataService.addFileAttente({
      patientId: p.id, patientNom: `${p.nom} ${p.prenom}`,
      type: this.addType, heureArrivee: now,
      statut: 'en_attente', ordre: nextOrdre, date: today
    }).subscribe({
      next: () => {
        this.addingToQueue = false;
        this.showAddModal = false;
        this.load();
        this.toastService.showSuccess(`${p.prenom} ${p.nom} ajouté à la file`);
      },
      error: () => { this.addingToQueue = false; this.toastService.showError('Erreur réseau'); }
    });
  }

  typeLabel(t: string): string {
    return ({ sans_rdv: 'Sans RDV', avec_rdv: 'Avec RDV', urgent: 'Urgent' } as any)[t] || t;
  }
}