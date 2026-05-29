import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MockDataService } from '../../services/mock-data.service';
import { ToastService } from '../../services/toast.service';
import { Patient, Ordonnance, Medicament } from '../../models';

@Component({
  selector: 'app-ordonnance',
  templateUrl: './ordonnance.component.html',
  styleUrls: ['./ordonnance.component.css']
})
export class OrdonnanceComponent implements OnInit {
  patients: Patient[] = [];
  ordonnances: Ordonnance[] = [];
  selectedPatient: Patient | null = null;
  patientLocked = false;
  activeTab = 'nouvelle';
  saving = false;
  savedOrdonnance: Ordonnance | null = null;
  showPrint = false;

  patientId = 0;

  medicaments: { nom: string; dosage: string; posologie: string; duree: string }[] = [
    { nom: '', dosage: '', posologie: '', duree: '' }
  ];

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
    this.dataService.getOrdonnances().subscribe({
      next: o => this.ordonnances = o,
      error: () => this.toastService.showError('Erreur de connexion au serveur')
    });
    window.addEventListener('afterprint', () => { this.showPrint = false; });
  }

  onPatientChange(): void {
    this.selectedPatient = this.patients.find(p => p.id === +this.patientId) || null;
  }

  addMedicament(): void {
    this.medicaments.push({ nom: '', dosage: '', posologie: '', duree: '' });
  }

  removeMedicament(i: number): void {
    if (this.medicaments.length > 1) this.medicaments.splice(i, 1);
  }

  get filledMedicaments() {
    return this.medicaments.filter(m => m.nom.trim());
  }

  canSave(): boolean {
    return +this.patientId > 0 && this.filledMedicaments.length > 0;
  }

  save(): void {
    if (!this.canSave() || !this.selectedPatient) return;
    this.saving = true;
    const meds: Medicament[] = this.filledMedicaments
      .map(m => ({ nom: m.nom, dosage: m.dosage, forme: '', posologie: m.posologie, duree: m.duree }));
    this.dataService.addOrdonnance({
      patientId: this.selectedPatient.id,
      patientNom: `${this.selectedPatient.nom} ${this.selectedPatient.prenom}`,
      date: new Date(),
      medicaments: meds,
      validite: 30,
      renouvelable: false,
      medecin: this.medecin.nom
    }).subscribe({
      next: saved => {
        this.ordonnances.unshift(saved);
        this.savedOrdonnance = saved;
        this.saving = false;
        this.toastService.showSuccess('Ordonnance enregistrée');
      },
      error: () => {
        this.saving = false;
        this.toastService.showError('Erreur de connexion au serveur');
      }
    });
  }

  print(ordo?: Ordonnance): void {
    if (ordo) this.savedOrdonnance = ordo;
    if (!this.savedOrdonnance && this.selectedPatient && this.filledMedicaments.length) {
      this.savedOrdonnance = {
        id: 0,
        patientId: this.selectedPatient.id,
        patientNom: `${this.selectedPatient.nom} ${this.selectedPatient.prenom}`,
        date: new Date(),
        medicaments: this.filledMedicaments.map(m => ({ nom: m.nom, dosage: m.dosage, forme: '', posologie: m.posologie, duree: m.duree })),
        validite: 30,
        renouvelable: false,
        medecin: this.medecin.nom
      };
    }
    this.showPrint = true;
    setTimeout(() => window.print(), 200);
  }

  resetForm(): void {
    this.patientId = 0;
    this.patientLocked = false;
    this.selectedPatient = null;
    this.savedOrdonnance = null;
    this.medicaments = [{ nom: '', dosage: '', posologie: '', duree: '' }];
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