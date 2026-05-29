import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MockDataService } from '../../services/mock-data.service';
import { ToastService } from '../../services/toast.service';
import { Patient, Consultation, Ordonnance, Examen, Facture, FileAttente } from '../../models';

@Component({
  selector: 'app-patient-dossier',
  templateUrl: './patient-dossier.component.html',
  styleUrls: ['./patient-dossier.component.css']
})
export class PatientDossierComponent implements OnInit {
  patient: Patient | null = null;
  loading = true;
  activeTab = 0;
  tabLoading = false;
  enConsultationRecord: FileAttente | null = null;

  consultations: Consultation[] = [];
  ordonnances: Ordonnance[] = [];
  examens: Examen[] = [];
  factures: Facture[] = [];

  expandedConsultationId: number | null = null;
  printOrdo: Ordonnance | null = null;
  printExamen: Examen | null = null;
  saisirResultatsId: number | null = null;
  resultatsForm: Record<string, string> = {};
  savingResultats = false;

  readonly medecin = {
    nom: 'Dr. Hassan Benkirane',
    specialite: 'Médecine Générale',
    adresse: '45 Boulevard Anfa',
    ville: 'Casablanca 20000',
    telephone: '0522 123 456',
    inpe: '12345'
  };

  showEditForm = false;
  formSaving = false;
  patientForm: Partial<Patient> = {};
  antecedentInput = '';
  allergieInput = '';

  readonly groupesSanguins = ['Inconnu', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  readonly mutuelles = ['aucune', 'CNOPS', 'CNSS', 'RMA'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dataService: MockDataService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.dataService.getPatient(id).subscribe({
      next: p => {
        this.patient = p ?? null;
        this.loading = false;
        if (this.patient) {
          this.dataService.getFileAttenteByPatientAndStatut(this.patient.id, 'en_consultation').subscribe({
            next: records => { this.enConsultationRecord = records[0] || null; }
          });
        }
      },
      error: () => {
        this.toastService.showError('Erreur de connexion au serveur');
        this.loading = false;
      }
    });
  }

  goBack(): void { this.router.navigate(['/patients']); }

  typeLabel(t: string): string {
    return ({ sans_rdv: 'Sans RDV', avec_rdv: 'Avec RDV', urgent: 'Urgent' } as any)[t] || t;
  }

  terminerConsultation(): void {
    if (!this.enConsultationRecord) return;
    this.dataService.updateFileAttente(this.enConsultationRecord.id, { statut: 'termine' }).subscribe({
      next: () => this.router.navigate(['/dashboard'])
    });
  }

  selectTab(tab: number): void {
    if (!this.patient) return;
    this.activeTab = tab;
    if (tab === 0) return;
    const id = this.patient.id;
    this.tabLoading = true;
    const fail = () => { this.tabLoading = false; this.toastService.showError('Erreur de connexion au serveur'); };

    if (tab === 1) {
      forkJoin({
        consultations: this.dataService.getConsultationsPatient(id),
        ordonnances: this.dataService.getOrdonnancesPatient(id),
        examens: this.dataService.getExamensPatient(id)
      }).subscribe({
        next: ({ consultations, ordonnances, examens }) => {
          this.consultations = consultations;
          this.ordonnances = ordonnances;
          this.examens = examens;
          this.tabLoading = false;
        },
        error: fail
      });
    } else if (tab === 2) {
      this.dataService.getFacturesPatient(id).subscribe({
        next: d => { this.factures = d; this.tabLoading = false; },
        error: fail
      });
    }
  }

  toggleConsultation(id: number): void {
    this.expandedConsultationId = this.expandedConsultationId === id ? null : id;
  }

  getOrdonnanceForConsultation(consultationId: number): Ordonnance | null {
    return this.ordonnances.find((o: any) => o.consultationId === consultationId) || null;
  }

  getExamenForConsultation(consultationId: number): Examen | null {
    return this.examens.find((e: any) => e.consultationId === consultationId) || null;
  }

  openEditForm(): void {
    if (!this.patient) return;
    this.patientForm = {
      ...this.patient,
      antecedents: [...this.patient.antecedents],
      allergies: [...this.patient.allergies],
      mutuelle: this.patient.mutuelle || 'aucune'
    };
    this.antecedentInput = '';
    this.allergieInput = '';
    this.showEditForm = true;
  }

  closeEditForm(): void { this.showEditForm = false; }

  addAntecedent(): void {
    const val = this.antecedentInput.trim();
    if (val && !this.patientForm.antecedents!.includes(val)) {
      this.patientForm.antecedents = [...this.patientForm.antecedents!, val];
    }
    this.antecedentInput = '';
  }

  removeAntecedent(i: number): void {
    this.patientForm.antecedents = this.patientForm.antecedents!.filter((_, idx) => idx !== i);
  }

  addAllergie(): void {
    const val = this.allergieInput.trim();
    if (val && !this.patientForm.allergies!.includes(val)) {
      this.patientForm.allergies = [...this.patientForm.allergies!, val];
    }
    this.allergieInput = '';
  }

  removeAllergie(i: number): void {
    this.patientForm.allergies = this.patientForm.allergies!.filter((_, idx) => idx !== i);
  }

  saveEdit(): void {
    if (!this.patient) return;
    this.formSaving = true;
    const payload = {
      ...this.patientForm,
      mutuelle: this.patientForm.mutuelle === 'aucune' ? undefined : this.patientForm.mutuelle
    };
    this.dataService.updatePatient(this.patient.id, payload).subscribe({
      next: updated => {
        this.patient = updated;
        this.formSaving = false;
        this.showEditForm = false;
        this.toastService.showSuccess('Patient modifié avec succès');
      },
      error: () => {
        this.formSaving = false;
        this.toastService.showError('Erreur lors de l\'enregistrement');
      }
    });
  }

  hasUnfilledResults(exam: Examen): boolean {
    return exam.analyses.some(a => !exam.resultats?.[a]);
  }

  openSaisirResultats(exam: Examen): void {
    this.saisirResultatsId = exam.id;
    this.resultatsForm = {};
    exam.analyses.forEach(a => {
      this.resultatsForm[a] = exam.resultats?.[a] || '';
    });
  }

  saveResultats(exam: Examen): void {
    this.savingResultats = true;
    this.dataService.updateExamen(exam.id, { resultats: this.resultatsForm, statut: 'resultat_recu' }).subscribe({
      next: updated => {
        this.examens = this.examens.map(e => e.id === updated.id ? updated : e);
        this.saisirResultatsId = null;
        this.savingResultats = false;
      },
      error: () => { this.savingResultats = false; }
    });
  }

  printOrdonnance(ordo: Ordonnance): void {
    this.printOrdo = ordo;
    this.printExamen = null;
    setTimeout(() => window.print(), 200);
    window.addEventListener('afterprint', () => { this.printOrdo = null; }, { once: true });
  }

  printAnalyses(exam: Examen): void {
    this.printExamen = exam;
    this.printOrdo = null;
    setTimeout(() => window.print(), 200);
    window.addEventListener('afterprint', () => { this.printExamen = null; }, { once: true });
  }

  get today(): Date { return new Date(); }

  getTotalFactures(): number {
    return this.factures.reduce((sum, f) => sum + f.total, 0);
  }

  getInitials(p: Patient): string { return (p.nom[0] + p.prenom[0]).toUpperCase(); }

  getAvatarColor(id: number): string {
    const colors = ['#1a6b4a', '#1e6bb5', '#9b59b6', '#c97b2a', '#e74c3c', '#00956b'];
    return colors[id % colors.length];
  }

  calculateAge(dateNaissance: Date | string): number {
    const today = new Date();
    const birth = new Date(dateNaissance);
    let age = today.getFullYear() - birth.getFullYear();
    if (today.getMonth() < birth.getMonth() ||
        (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
    return age;
  }

  formatDateInput(date: Date | string | undefined): string {
    if (!date) return '';
    return new Date(date).toISOString().split('T')[0];
  }
}