import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MockDataService } from '../../services/mock-data.service';
import { ToastService } from '../../services/toast.service';
import { NavHighlightService } from '../../services/nav-highlight.service';
import { Patient, Consultation, Ordonnance, Examen, Medicament, Facture } from '../../models';

interface AnalyseGroup {
  label: string;
  items: string[];
}

@Component({
  selector: 'app-consultation',
  templateUrl: './consultation.component.html',
  styleUrls: ['./consultation.component.css']
})
export class ConsultationComponent implements OnInit, OnDestroy {

  patients: Patient[] = [];
  selectedPatient: Patient | null = null;
  patientLocked = false;

  saving = false;
  savedConsultation: Consultation | null = null;
  savedOrdonnance: Ordonnance | null = null;
  savedExamen: Examen | null = null;
  savedFacture: Facture | null = null;

  printMode: 'ordonnance' | 'analyses' | null = null;

  form = {
    patientId: 0,
    motif: '',
    rapport: '',
    type: 'consultation' as 'consultation' | 'controle'
  };

  medicaments: { nom: string; dosage: string; posologie: string; duree: string }[] = [];

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
  urgentAnalyse = false;
  laboratoire = '';

  prevExamen: Examen | null = null;
  prevResultatsForm: Record<string, string> = {};
  loadingPrevAnalyses = false;
  savingPrevResultats = false;

  medecin = {
    nom: 'Dr. Hassan Benkirane',
    specialite: 'Médecine Générale',
    adresse: '45 Boulevard Anfa',
    ville: 'Casablanca 20000',
    telephone: '0522 123 456',
    inpe: '12345'
  };

  fileAttenteId: number | null = null;

  private observer: IntersectionObserver | null = null;
  private readonly sectionMap: Record<string, string> = {
    'section-consultation': '/consultation',
    'section-ordonnance':   '/ordonnance',
    'section-analyses':     '/examens'
  };

  constructor(
    private dataService: MockDataService,
    private toastService: ToastService,
    private route: ActivatedRoute,
    private router: Router,
    private navHighlight: NavHighlightService
  ) {}

  ngOnInit(): void {
    this.dataService.getPatients().subscribe({
      next: p => {
        this.patients = p;
        const id = this.route.snapshot.queryParamMap.get('patientId');
        if (id && +id > 0) {
          this.form.patientId = +id;
          this.patientLocked = true;
          this.onPatientChange();
        }
        const faId = this.route.snapshot.queryParamMap.get('fileAttenteId');
        if (faId && +faId > 0) this.fileAttenteId = +faId;
      },
      error: () => this.toastService.showError('Erreur de connexion au serveur')
    });

    window.addEventListener('afterprint', () => { this.printMode = null; });

    setTimeout(() => this.initObserver(), 300);
  }

  private initObserver(): void {
    this.observer = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting && e.intersectionRatio >= 0.3) {
          this.navHighlight.set(this.sectionMap[e.target.id] || null);
        }
      });
    }, { threshold: 0.3 });

    Object.keys(this.sectionMap).forEach(id => {
      const el = document.getElementById(id);
      if (el) this.observer!.observe(el);
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.navHighlight.set(null);
  }

  onPatientChange(): void {
    this.selectedPatient = this.patients.find(p => p.id === +this.form.patientId) || null;
    this.prevExamen = null;
    if (this.form.type === 'controle' && this.selectedPatient) {
      this.loadPrevAnalyses();
    }
  }

  onTypeChange(): void {
    if (this.form.type === 'controle' && this.selectedPatient) {
      this.loadPrevAnalyses();
    } else {
      this.prevExamen = null;
    }
  }

  loadPrevAnalyses(): void {
    if (!this.selectedPatient) return;
    this.loadingPrevAnalyses = true;
    this.prevExamen = null;
    this.dataService.getExamensPatient(this.selectedPatient.id).subscribe({
      next: examens => {
        const sorted = examens.sort((a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        this.prevExamen = sorted[0] || null;
        if (this.prevExamen) {
          this.prevResultatsForm = {};
          this.prevExamen.analyses.forEach(a => {
            this.prevResultatsForm[a] = this.prevExamen!.resultats?.[a] || '';
          });
        }
        this.loadingPrevAnalyses = false;
      },
      error: () => { this.loadingPrevAnalyses = false; }
    });
  }

  hasUnfilledPrevResults(): boolean {
    if (!this.prevExamen) return false;
    return this.prevExamen.analyses.some(a => !this.prevExamen!.resultats?.[a]);
  }

  savePrevResultats(): void {
    if (!this.prevExamen) return;
    this.savingPrevResultats = true;
    this.dataService.updateExamen(this.prevExamen.id, {
      resultats: this.prevResultatsForm,
      statut: 'resultat_recu'
    }).subscribe({
      next: updated => {
        this.prevExamen = updated;
        this.savingPrevResultats = false;
        this.toastService.showSuccess('Résultats enregistrés');
      },
      error: () => {
        this.savingPrevResultats = false;
        this.toastService.showError('Erreur lors de l\'enregistrement');
      }
    });
  }

  toggleAnalyse(item: string): void {
    const idx = this.analysesChecked.indexOf(item);
    if (idx === -1) this.analysesChecked.push(item);
    else this.analysesChecked.splice(idx, 1);
  }

  isAnalyseChecked(item: string): boolean {
    return this.analysesChecked.includes(item);
  }

  addMedicament(): void {
    this.medicaments.push({ nom: '', dosage: '', posologie: '', duree: '' });
  }

  removeMedicament(i: number): void {
    this.medicaments.splice(i, 1);
  }

  canSave(): boolean {
    return +this.form.patientId > 0 && !!this.form.motif.trim();
  }

  saveAll(): void {
    if (!this.canSave() || !this.selectedPatient) return;
    this.saving = true;

    const p = this.selectedPatient;

    const consulPayload: Partial<Consultation> = {
      patientId: p.id,
      patientNom: `${p.nom} ${p.prenom}`,
      date: new Date(),
      motif: this.form.motif,
      type: this.form.type,
      anamnese: this.form.rapport,
      examenClinique: '', tension: '', temperature: '', poids: '', taille: '',
      diagnostic: this.form.motif,
      traitement: '', observations: '',
      medecin: this.medecin.nom
    };

    const hasMeds = this.medicaments.some(m => m.nom.trim());
    const hasAnalyses = this.analysesChecked.length > 0;

    this.dataService.addConsultation(consulPayload).subscribe({
      next: savedConsul => {
        this.savedConsultation = savedConsul;
        const consultationId = savedConsul.id;

        const finish = () => {
          this.saving = false;
          if (this.fileAttenteId) {
            this.dataService.updateFileAttente(this.fileAttenteId, { statut: 'termine' }).subscribe();
          }
          this.toastService.showSuccess('Consultation enregistrée');
          setTimeout(() => this.router.navigate(['/dashboard']), 2000);
        };

        // Step 1: POST facture after 400ms
        setTimeout(() => {
          const factureObs = this.form.type === 'consultation'
            ? this.dataService.addFacture({
                patientId: p.id,
                patientNom: `${p.nom} ${p.prenom}`,
                consultationId,
                date: new Date(),
                type: 'Consultation',
                lignes: [{ description: 'Consultation médicale', quantite: 1, prixUnitaire: 200, total: 200 }],
                sousTotal: 200, tva: 0, total: 200,
                statut: 'en_attente', montantPaye: 0, reste: 200
              }).pipe(catchError(() => of(null)))
            : of(null);

          factureObs.subscribe(facture => {
            if (facture) this.savedFacture = facture as Facture;

            // Step 2: POST ordonnance after 400ms
            setTimeout(() => {
              const ordoObs = hasMeds
                ? this.dataService.addOrdonnance({
                    patientId: p.id,
                    patientNom: `${p.nom} ${p.prenom}`,
                    date: new Date(),
                    medicaments: this.medicaments
                      .filter(m => m.nom.trim())
                      .map(m => ({ nom: m.nom, dosage: m.dosage, forme: '', posologie: m.posologie, duree: m.duree } as Medicament)),
                    validite: 30,
                    renouvelable: false,
                    consultationId,
                    medecin: this.medecin.nom
                  }).pipe(catchError(() => of(null)))
                : of(null);

              ordoObs.subscribe(ordo => {
                if (ordo) this.savedOrdonnance = ordo as Ordonnance;

                // Step 3: POST examens after 400ms
                setTimeout(() => {
                  const examObs = hasAnalyses
                    ? this.dataService.addExamen({
                        patientId: p.id,
                        patientNom: `${p.nom} ${p.prenom}`,
                        patientCin: p.cin,
                        date: new Date(),
                        analyses: [...this.analysesChecked],
                        laboratoire: this.laboratoire || undefined,
                        urgence: this.urgentAnalyse,
                        statut: 'attente',
                        consultationId
                      } as any).pipe(catchError(() => of(null)))
                    : of(null);

                  examObs.subscribe(exam => {
                    if (exam) this.savedExamen = exam as Examen;
                    finish();
                  });
                }, 400);
              });
            }, 400);
          });
        }, 400);
      },
      error: () => {
        this.saving = false;
        this.toastService.showError('Erreur de connexion au serveur');
      }
    });
  }

  printOrdonnance(): void {
    if (!this.selectedPatient || !this.medicaments.some(m => m.nom.trim())) return;
    this.printMode = 'ordonnance';
    setTimeout(() => window.print(), 200);
  }

  printAnalyses(): void {
    if (!this.selectedPatient || !this.analysesChecked.length) return;
    this.printMode = 'analyses';
    setTimeout(() => window.print(), 200);
  }

  get checkedAnalysesByGroup(): { label: string; items: string[] }[] {
    return this.analyseGroups
      .map(g => ({ label: g.label, items: g.items.filter(i => this.analysesChecked.includes(i)) }))
      .filter(g => g.items.length > 0);
  }

  calculateAge(dateNaissance: Date | string): number {
    const today = new Date();
    const birth = new Date(dateNaissance);
    let age = today.getFullYear() - birth.getFullYear();
    if (today.getMonth() < birth.getMonth() ||
        (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
    return age;
  }

  get filledMedicaments() {
    return this.medicaments.filter(m => m.nom.trim());
  }

  get today(): Date { return new Date(); }
}