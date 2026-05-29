export interface Patient {
  id: number;
  cin: string;
  nom: string;
  prenom: string;
  dateNaissance: Date;
  age: number;
  sexe: 'M' | 'F';
  telephone: string;
  email?: string;
  adresse: string;
  ville: string;
  mutuelle?: string;
  groupeSanguin: string;
  antecedents: string[];
  allergies: string[];
  dateCreation: Date;
  dernierVisite?: Date;
  photo?: string;
}

export interface RendezVous {
  id: number;
  patientId: number;
  patientNom: string;
  date: Date;
  heure: string;
  duree: number; // minutes
  motif: string;
  statut: 'confirme' | 'attente' | 'annule' | 'termine' | 'arrive';
  notes?: string;
  type: 'consultation' | 'controle' | 'urgence';
}

export interface Consultation {
  id: number;
  patientId: number;
  patientNom: string;
  date: Date;
  motif: string;
  type?: 'consultation' | 'controle';
  anamnese: string;
  examenClinique: string;
  tension: string;
  temperature: string;
  poids: string;
  taille: string;
  imc?: number;
  diagnostic: string;
  traitement: string;
  observations: string;
  prochainRdv?: Date;
  medecin: string;
}

export interface Medicament {
  nom: string;
  dosage: string;
  forme: string;
  posologie: string;
  duree: string;
  instructions?: string;
}

export interface Ordonnance {
  id: number;
  patientId: number;
  patientNom: string;
  consultationId?: number;
  date: Date;
  medicaments: Medicament[];
  validite: number; // jours
  renouvelable: boolean;
  notes?: string;
  medecin: string;
}

export interface Examen {
  id: number;
  patientId: number;
  patientNom: string;
  patientCin: string;
  consultationId?: number;
  date: Date;
  analyses: string[];
  laboratoire?: string;
  statut: 'attente' | 'resultat_recu';
  urgence: boolean;
  resultat?: string;
  resultats?: Record<string, string>;
  critique?: boolean;
  dateResultat?: Date;
}

export interface LigneFacture {
  description: string;
  quantite: number;
  prixUnitaire: number;
  total: number;
}

export interface Facture {
  id: number;
  patientId: number;
  patientNom: string;
  consultationId?: number;
  date: Date;
  lignes: LigneFacture[];
  sousTotal: number;
  tva: number;
  total: number;
  statut: 'payee' | 'impayee' | 'partielle' | 'en_attente';
  modePaiement?: 'especes' | 'cheque' | 'virement' | 'mutuelle' | 'cnops' | 'cnss';
  montantPaye: number;
  reste: number;
  notes?: string;
  type?: string;
  datePaiement?: Date;
}

export interface FileAttente {
  id: number;
  patientId: number;
  patientNom: string;
  type: 'sans_rdv' | 'avec_rdv' | 'urgent';
  heureArrivee: string;
  statut: 'en_attente' | 'en_consultation' | 'termine';
  ordre: number;
  date: string;
}

export interface Notification {
  id: number;
  titre: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'danger' | 'critical' | 'result' | 'wait';
  date: Date;
  lue: boolean;
  lien?: string;
  patientId?: number;
}

export interface StatsData {
  totalPatients: number;
  nouveauxPatients: number;
  rdvAujourdhui: number;
  consultationsMois: number;
  revenuMois: number;
  tauxOccupation: number;
  rdvParJour: { jour: string;count: number }[];
  revenusParMois: { mois: string; montant: number }[];
  diagnosticsFrequents: { diagnostic: string; count: number }[];
  repartitionAge: { tranche: string; count: number }[];
}
