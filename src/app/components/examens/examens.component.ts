import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MockDataService } from '../../services/mock-data.service';
import { ToastService } from '../../services/toast.service';
import { Patient, Examen } from '../../models';

interface AnalyseGroup {
  label: string;
  items: string[];
}

@Component({
  selector: 'app-examens',
  templateUrl: './examens.component.html',
  styleUrls: ['./examens.component.css']
})
export class ExamensComponent implements OnInit {
  patients: Patient[] = [];
  examens: Examen[] = [];
  filteredExamens: Examen[] = [];
  filterStatut = '';
  activeTab = 'nouvelle';
  saving = false;
  savedExamen: Examen | null = null;
  showPrint = false;
  patientId = 0;
  selectedPatient: Patient | null = null;
  patientLocked = false;

  analyseGroups: AnalyseGroup[] = [
    {
      label: 'Biologie',
      items: ['NFS', 'Glycémie à jeun', 'HbA1c', 'Bilan lipidique',
              'Créatinine', 'Urée', 'TSH', 'Ionogramme', 'CRP', 'ECBU']
    },
    {
      label: 'Cardiologie',
      items: ['ECG', 'Échographie cardiaque', 'Holter ECG']
    },
    {
      label: 'Radiologie',
      items: ['Radio thorax', 'Échographie abdominale', 'Scanner', 'IRM']
    }
  ];

  analysesChecked: string[] = [];
  urgence = false;
  laboratoire = '';

  showModal = false;
  modalExamen: Examen | null = null;
  modalTexte = '';
  modalCritique = false;
  modalSaving = false;

  medecin = {
    nom: 'Dr. Hassan Benkirane',
    specialite: 'Médecine Générale',
    adresse: '45 Boulevard Anfa',
    ville: 'Casablanca 20000',
    telephone: '0522 123 456',
    inpe: '12345'
  };

  constructor(
    private dataService: MockDataService,
    private toastService: ToastService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.dataService.getPatients().subscribe({
      next: p => {
        this.patients = p;
        const id = this.route.snapshot.queryParamMap.get('patientId');
        if (id && +id > 0) {
          this.patientId = +id;
          this.patientLocked = true;
          this.onPatientChange();
        }
      },
      error: () => this.toastService.showError('Erreur de connexion au serveur')
    });
    this.dataService.getExamens().subscribe({
      next: e => { this.examens = e; this.applyFilter(); },
      error: () => this.toastService.showError('Erreur de connexion au serveur')
    });
    window.addEventListener('afterprint', () => { this.showPrint = false; });
  }

  onPatientChange(): void {
    this.selectedPatient = this.patients.find(p => p.id === +this.patientId) || null;
  }

  applyFilter(): void {
    this.filteredExamens = this.examens.filter(e =>
      !this.filterStatut || e.statut === this.filterStatut
    );
  }

  toggle(item: string): void {
    const idx = this.analysesChecked.indexOf(item);
    if (idx === -1) this.analysesChecked.push(item);
    else this.analysesChecked.splice(idx, 1);
  }

  isChecked(item: string): boolean {
    return this.analysesChecked.includes(item);
  }

  canSave(): boolean {
    return +this.patientId > 0 && this.analysesChecked.length > 0;
  }

  save(): void {
    if (!this.canSave() || !this.selectedPatient) return;
    this.saving = true;
    this.dataService.addExamen({
      patientId: this.selectedPatient.id,
      patientNom: `${this.selectedPatient.nom} ${this.selectedPatient.prenom}`,
      patientCin: this.selectedPatient.cin,
      date: new Date(),
      analyses: [...this.analysesChecked],
      laboratoire: this.laboratoire || undefined,
      urgence: this.urgence,
      statut: 'attente'
    }).subscribe({
      next: saved => {
        this.examens.unshift(saved);
        this.savedExamen = saved;
        this.applyFilter();
        this.saving = false;
        this.toastService.showSuccess('Analyses enregistrées');
      },
      error: () => {
        this.saving = false;
        this.toastService.showError('Erreur de connexion au serveur');
      }
    });
  }

  print(): void {
    if (!this.canSave()) return;
    this.showPrint = true;
    setTimeout(() => window.print(), 200);
  }

  resetForm(): void {
    this.patientId = 0;
    this.patientLocked = false;
    this.selectedPatient = null;
    this.analysesChecked = [];
    this.urgence = false;
    this.laboratoire = '';
    this.savedExamen = null;
  }

  get checkedAnalysesByGroup(): { label: string; items: string[] }[] {
    return this.analyseGroups
      .map(g => ({ label: g.label, items: g.items.filter(i => this.analysesChecked.includes(i)) }))
      .filter(g => g.items.length > 0);
  }

  getPatient(id: number): Patient | undefined {
    return this.patients.find(p => p.id === id);
  }

  ouvrirModal(examen: Examen): void {
    this.modalExamen = examen;
    this.modalTexte = examen.resultat || '';
    this.modalCritique = examen.critique || false;
    this.showModal = true;
  }

  fermerModal(): void {
    this.showModal = false;
    this.modalExamen = null;
    this.modalTexte = '';
    this.modalCritique = false;
  }

  sauvegarderResultat(): void {
    if (!this.modalExamen || !this.modalTexte.trim()) return;
    this.modalSaving = true;
    this.dataService.updateExamen(this.modalExamen.id, {
      statut: 'resultat_recu',
      resultat: this.modalTexte.trim(),
      critique: this.modalCritique,
      dateResultat: new Date()
    }).subscribe({
      next: updated => {
        const ex = this.examens.find(e => e.id === updated.id);
        if (ex) Object.assign(ex, updated);
        this.applyFilter();
        this.modalSaving = false;
        this.fermerModal();
        this.toastService.showSuccess('Résultat enregistré');
      },
      error: () => {
        this.modalSaving = false;
        this.toastService.showError('Erreur de connexion au serveur');
      }
    });
  }

  getExamenByStatut(statut: string): Examen[] {
    return this.filteredExamens.filter(e => e.statut === statut);
  }

  calculateAge(dateNaissance: Date | string): number {
    const today = new Date();
    const birth = new Date(dateNaissance);
    let age = today.getFullYear() - birth.getFullYear();
    if (today.getMonth() < birth.getMonth() ||
        (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
    return age;
  }

  get today(): Date { return new Date(); }
}