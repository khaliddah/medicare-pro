import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  Patient, RendezVous, Consultation, Ordonnance,
  Examen, Facture, StatsData, FileAttente
} from '../models';
import { environment } from '../../environments/environment';

const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class MockDataService {

  constructor(private http: HttpClient) {}

  // ───────────── PATIENTS ─────────────
  getPatients(): Observable<Patient[]> {
    return this.http.get<Patient[]>(`${API}/patients`);
  }

  getPatient(id: number): Observable<Patient | undefined> {
    return this.http.get<Patient>(`${API}/patients/${id}`);
  }

  searchPatients(query: string): Observable<Patient[]> {
    if (!query.trim()) return this.getPatients();
    return this.http.get<Patient[]>(`${API}/patients`).pipe(
      map(patients => {
        const q = query.toLowerCase();
        return patients.filter(p =>
          p.nom.toLowerCase().includes(q) ||
          p.prenom.toLowerCase().includes(q) ||
          p.cin.toLowerCase().includes(q) ||
          p.telephone.includes(q)
        );
      })
    );
  }

  addPatient(patient: Partial<Patient>): Observable<Patient> {
    const newPatient = { ...patient, dateCreation: new Date().toISOString(), statut: 'actif' };
    return this.http.post<Patient>(`${API}/patients`, newPatient);
  }

  updatePatient(id: number, data: Partial<Patient>): Observable<Patient> {
    return this.http.put<Patient>(`${API}/patients/${id}`, data);
  }

  // ───────────── RENDEZ-VOUS ─────────────
  getRendezVous(): Observable<RendezVous[]> {
    return this.http.get<RendezVous[]>(`${API}/rendezVous`);
  }

  getRdvAujourdhui(): Observable<RendezVous[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.http.get<RendezVous[]>(`${API}/rendezVous`).pipe(
      map(rdvs => rdvs.filter(r => (r.date as unknown as string).startsWith(today)))
    );
  }

  addRendezVous(rdv: Partial<RendezVous>): Observable<RendezVous> {
    return this.http.post<RendezVous>(`${API}/rendezVous`, rdv);
  }

  updateRendezVous(id: number, data: Partial<RendezVous>): Observable<RendezVous> {
    return this.http.patch<RendezVous>(`${API}/rendezVous/${id}`, data);
  }

  deleteRendezVous(id: number): Observable<void> {
    return this.http.delete<void>(`${API}/rendezVous/${id}`);
  }

  // ───────────── CONSULTATIONS ─────────────
  getConsultations(): Observable<Consultation[]> {
    return this.http.get<Consultation[]>(`${API}/consultations`);
  }

  getConsultationsPatient(patientId: number): Observable<Consultation[]> {
    return this.http.get<Consultation[]>(`${API}/consultations?patientId=${patientId}`);
  }

  getOrdonnancesPatient(patientId: number): Observable<Ordonnance[]> {
    return this.http.get<Ordonnance[]>(`${API}/ordonnances?patientId=${patientId}`);
  }

  getExamensPatient(patientId: number): Observable<Examen[]> {
    return this.http.get<Examen[]>(`${API}/examens?patientId=${patientId}`);
  }

  getFacturesPatient(patientId: number): Observable<Facture[]> {
    return this.http.get<Facture[]>(`${API}/factures?patientId=${patientId}`);
  }

  // ───────────── ORDONNANCES ─────────────
  getOrdonnances(): Observable<Ordonnance[]> {
    return this.http.get<Ordonnance[]>(`${API}/ordonnances`);
  }

  addOrdonnance(ordonnance: Partial<Ordonnance>): Observable<Ordonnance> {
    return this.http.post<Ordonnance>(`${API}/ordonnances`, ordonnance);
  }

  // ───────────── CONSULTATIONS (add) ─────────────
  addConsultation(consultation: Partial<Consultation>): Observable<Consultation> {
    return this.http.post<Consultation>(`${API}/consultations`, consultation);
  }

  // ───────────── EXAMENS ─────────────
  getExamens(): Observable<Examen[]> {
    return this.http.get<Examen[]>(`${API}/examens`);
  }

  addExamen(examen: Partial<Examen>): Observable<Examen> {
    return this.http.post<Examen>(`${API}/examens`, examen);
  }

  updateExamen(id: number, data: Partial<Examen>): Observable<Examen> {
    return this.http.patch<Examen>(`${API}/examens/${id}`, data);
  }

  // ───────────── FACTURES ─────────────
  getFactures(): Observable<Facture[]> {
    return this.http.get<Facture[]>(`${API}/factures`);
  }

  addFacture(facture: Partial<Facture>): Observable<Facture> {
    return this.http.post<Facture>(`${API}/factures`, facture);
  }

  updateFacture(id: number, data: Partial<Facture>): Observable<Facture> {
    return this.http.patch<Facture>(`${API}/factures/${id}`, data);
  }

  // ───────────── FILE D'ATTENTE ─────────────
  getFileAttenteAujourdhui(): Observable<FileAttente[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.http.get<FileAttente[]>(`${API}/fileAttente?date=${today}`);
  }

  getAllFileAttente(): Observable<FileAttente[]> {
    return this.http.get<FileAttente[]>(`${API}/fileAttente`);
  }

  getFileAttenteEnConsultation(): Observable<FileAttente[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.http.get<FileAttente[]>(`${API}/fileAttente?date=${today}&statut=en_consultation`);
  }

  getFileAttenteEnAttente(): Observable<FileAttente[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.http.get<FileAttente[]>(`${API}/fileAttente?date=${today}&statut=en_attente`);
  }

  addFileAttente(item: Partial<FileAttente>): Observable<FileAttente> {
    return this.http.post<FileAttente>(`${API}/fileAttente`, item);
  }

  updateFileAttente(id: number, data: Partial<FileAttente>): Observable<FileAttente> {
    return this.http.patch<FileAttente>(`${API}/fileAttente/${id}`, data);
  }

  deleteFileAttente(id: number): Observable<void> {
    return this.http.delete<void>(`${API}/fileAttente/${id}`);
  }

  getFileAttenteByPatientAndStatut(patientId: number, statut: string): Observable<FileAttente[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.http.get<FileAttente[]>(`${API}/fileAttente?patientId=${patientId}&date=${today}&statut=${statut}`);
  }

  // ───────────── NOTIFICATIONS ─────────────
  getNotifications(): Observable<any[]> {
    return this.http.get<any[]>(`${API}/notifications`);
  }

  // ───────────── STATS ─────────────
  getStats(): Observable<StatsData> {
    return this.http.get<StatsData>(`${API}/stats`);
  }
}