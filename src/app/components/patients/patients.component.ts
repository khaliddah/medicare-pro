import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { MockDataService } from '../../services/mock-data.service';
import { ToastService } from '../../services/toast.service';
import { Patient } from '../../models';

@Component({
  selector: 'app-patients',
  templateUrl: './patients.component.html',
  styleUrls: ['./patients.component.css']
})
export class PatientsComponent implements OnInit {
  patients: Patient[] = [];
  filteredPatients: Patient[] = [];
  searchQuery = '';
  filterSexe = '';
  filterMutuelle = '';
  filterGenre = '';
  filterGroupe = '';
  filterCin = '';
  filterVille = '';
  searchTerm = '';
  loading = true;
  searchSubject = new Subject<string>();

  totalPatients = 0;
  dossiersActifs = 0;
  avecMutuelle = 0;
  mutuellesActives = 0;

  showColonnesDropdown = false;
  colonnesDisponibles = [
    { key: 'cin',          label: 'CIN',             visible: true  },
    { key: 'age',          label: 'Âge',             visible: true  },
    { key: 'telephone',    label: 'Téléphone',       visible: true  },
    { key: 'ville',        label: 'Ville',           visible: false },
    { key: 'mutuelle',     label: 'Mutuelle',        visible: true  },
    { key: 'groupeSanguin',label: 'Groupe',          visible: true  },
    { key: 'dernierVisite',label: 'Dernière visite', visible: true  }
  ];

  showPatientForm = false;
  isEditMode = false;
  formSaving = false;
  editingPatientId: number | null = null;
  patientForm: Partial<Patient> = this.emptyForm();
  antecedentInput = '';
  allergieInput = '';

  readonly groupesSanguins = ['Inconnu', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  readonly mutuelles = ['aucune', 'CNOPS', 'CNSS', 'RMA'];

  constructor(
    private dataService: MockDataService,
    private toastService: ToastService,
    private router: Router
  ) {}

  get colonnesVisiblesCount(): number {
    return this.colonnesDisponibles.filter(c => c.visible).length;
  }

  hasActiveFilters(): boolean {
    return !!(this.searchTerm || this.filterMutuelle || this.filterGenre || this.filterGroupe || this.filterCin || this.filterVille);
  }

  toggleColonnesDropdown(): void { this.showColonnesDropdown = !this.showColonnesDropdown; }

  toggleColonne(key: string): void {
    const col = this.colonnesDisponibles.find(c => c.key === key);
    if (col) col.visible = !col.visible;
  }

  isColonneVisible(key: string): boolean {
    return this.colonnesDisponibles.find(c => c.key === key)?.visible ?? true;
  }

  calculateKPIs(patientsList: Patient[]): void {
    this.totalPatients = patientsList.length;

    const today = new Date();
    const sixMoisAgo = new Date();
    sixMoisAgo.setMonth(today.getMonth() - 6);
    this.dossiersActifs = patientsList.filter(p => {
      if (!p.dernierVisite) return false;
      return new Date(p.dernierVisite) >= sixMoisAgo;
    }).length;

    this.avecMutuelle = patientsList.filter(p => p.mutuelle && p.mutuelle !== '' && p.mutuelle !== 'aucune').length;
    this.mutuellesActives = new Set(
      patientsList.filter(p => p.mutuelle && p.mutuelle !== '' && p.mutuelle !== 'aucune').map(p => p.mutuelle)
    ).size;
  }

  ngOnInit(): void {
    this.loadPatients();
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(() => {
      this.applyAllFilters();
    });
  }

  loadPatients(): void {
    this.loading = true;
    this.dataService.getPatients().subscribe({
      next: patients => {
        this.patients = patients;
        this.filteredPatients = patients;
        this.calculateKPIs(this.filteredPatients);
        this.loading = false;
      },
      error: () => this.toastService.showError('Erreur de connexion au serveur')
    });
  }

  onSearch(event: any): void {
    this.searchTerm = event.target.value.toLowerCase();
    this.searchQuery = event.target.value;
    this.applyAllFilters();
  }

  onFilterMutuelle(event: any): void {
    this.filterMutuelle = event.target.value;
    this.applyAllFilters();
  }

  onFilterGenre(event: any): void {
    this.filterGenre = event.target.value;
    this.applyAllFilters();
  }

  onFilterGroupe(event: any): void {
    this.filterGroupe = event.target.value;
    this.applyAllFilters();
  }

  applyAllFilters(): void {
    this.filteredPatients = this.patients.filter(p => {
      const matchSearch = !this.searchTerm ||
        (p.nom + ' ' + p.prenom).toLowerCase().includes(this.searchTerm) ||
        (p.cin || '').toLowerCase().includes(this.searchTerm) ||
        (p.telephone || '').includes(this.searchTerm) ||
        (p.ville || '').toLowerCase().includes(this.searchTerm);
      const matchMutuelle = !this.filterMutuelle ||
        (p.mutuelle || '').toLowerCase() === this.filterMutuelle.toLowerCase();
      const matchGenre = !this.filterGenre || p.sexe === this.filterGenre;
      const matchGroupe = !this.filterGroupe || p.groupeSanguin === this.filterGroupe;
      return matchSearch && matchMutuelle && matchGenre && matchGroupe;
    });
    this.calculateKPIs(this.filteredPatients);
  }

  applyFilters(patients: Patient[]): Patient[] {
    let result = patients;
    if (this.filterSexe) result = result.filter(p => p.sexe === this.filterSexe);
    return result;
  }

  onFilterChange(): void {
    this.applyAllFilters();
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.searchTerm = '';
    this.filterSexe = '';
    this.filterMutuelle = '';
    this.filterGenre = '';
    this.filterGroupe = '';
    this.filterCin = '';
    this.filterVille = '';
    this.filteredPatients = [...this.patients];
    this.calculateKPIs(this.filteredPatients);
  }

  viewPatient(patient: Patient): void {
    this.router.navigate(['/patients', patient.id]);
  }

  emptyForm(): Partial<Patient> {
    return { sexe: 'M', antecedents: [], allergies: [], groupeSanguin: 'Inconnu', mutuelle: 'aucune' };
  }

  openAddForm(): void {
    this.isEditMode = false;
    this.editingPatientId = null;
    this.patientForm = this.emptyForm();
    this.antecedentInput = '';
    this.allergieInput = '';
    this.showPatientForm = true;
  }

  openEditForm(patient: Patient, event?: Event): void {
    if (event) event.stopPropagation();
    this.isEditMode = true;
    this.editingPatientId = patient.id;
    this.patientForm = {
      ...patient,
      antecedents: [...patient.antecedents],
      allergies: [...patient.allergies],
      mutuelle: patient.mutuelle || 'aucune'
    };
    this.antecedentInput = '';
    this.allergieInput = '';
    this.showPatientForm = true;
  }

  closeForm(): void { this.showPatientForm = false; }

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

  savePatient(): void {
    this.formSaving = true;
    const payload = {
      ...this.patientForm,
      mutuelle: this.patientForm.mutuelle === 'aucune' ? undefined : this.patientForm.mutuelle
    };

    if (this.isEditMode && this.editingPatientId !== null) {
      this.dataService.updatePatient(this.editingPatientId, payload).subscribe({
        next: updated => {
          const idx = this.patients.findIndex(p => p.id === updated.id);
          if (idx >= 0) this.patients[idx] = updated;
          this.filteredPatients = this.applyFilters([...this.patients]);
          this.formSaving = false;
          this.showPatientForm = false;
          this.toastService.showSuccess('Dossier mis à jour');
        },
        error: () => {
          this.formSaving = false;
          this.toastService.showError('Erreur lors de l\'enregistrement');
        }
      });
    } else {
      this.dataService.addPatient(payload).subscribe({
        next: newP => {
          this.patients.unshift(newP);
          this.filteredPatients = this.applyFilters([...this.patients]);
          this.formSaving = false;
          this.showPatientForm = false;
          this.toastService.showSuccess(`Patient ${newP.prenom} ${newP.nom} créé avec succès`);
        },
        error: () => {
          this.formSaving = false;
          this.toastService.showError('Erreur lors de l\'enregistrement');
        }
      });
    }
  }

  getInitials(patient: Patient): string {
    return (patient.nom[0] + patient.prenom[0]).toUpperCase();
  }

  getAvatarColor(id: number): string {
    const colors = ['#1a6b4a', '#1e6bb5', '#9b59b6', '#c97b2a', '#e74c3c', '#00956b'];
    return colors[id % colors.length];
  }

  calculateAge(dateNaissance: Date | string): number {
    const today = new Date();
    const birth = new Date(dateNaissance);
    let age = today.getFullYear() - birth.getFullYear();
    if (today.getMonth() < birth.getMonth() ||
        (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  exportPatients(): void {
    const headers = ['ID', 'CIN', 'Nom', 'Prénom', 'Age', 'Sexe', 'Téléphone', 'Ville', 'Mutuelle', 'Groupe sanguin', 'Dernière visite'];
    const rows = this.filteredPatients.map(p => [
      p.id, p.cin, p.nom, p.prenom, p.age, p.sexe, p.telephone, p.ville, p.mutuelle || '', p.groupeSanguin || '', p.dernierVisite || ''
    ]);
    const csv = [headers, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `patients_filtres_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  formatDateInput(date: Date | string | undefined): string {
    if (!date) return '';
    return new Date(date).toISOString().split('T')[0];
  }
}