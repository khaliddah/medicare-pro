import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Notification, FileAttente } from '../models';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private notifications$ = new BehaviorSubject<Notification[]>([]);
  private seenIds = new Set<number>();
  private longWaitNotified = new Set<number>();
  private longQueueNotified = false;

  getNotifications(): Observable<Notification[]> {
    return this.notifications$.asObservable();
  }

  getUnreadCount(): number {
    return this.notifications$.value.filter(n => !n.lue).length;
  }

  markAsRead(id: number): void {
    const notifs = this.notifications$.value.map(n =>
      n.id === id ? { ...n, lue: true } : n
    );
    this.notifications$.next(notifs);
  }

  markAllAsRead(): void {
    const notifs = this.notifications$.value.map(n => ({ ...n, lue: true }));
    this.notifications$.next(notifs);
  }

  addNotification(notif: Omit<Notification, 'id' | 'date' | 'lue'>): Notification {
    const current = this.notifications$.value;
    const newNotif: Notification = {
      ...notif,
      id: Date.now() + Math.floor(Math.random() * 1000),
      date: new Date(),
      lue: false
    };
    this.notifications$.next([newNotif, ...current]);
    return newNotif;
  }

  removeNotification(id: number): void {
    const notifs = this.notifications$.value.filter(n => n.id !== id);
    this.notifications$.next(notifs);
  }

  checkFileAttente(items: FileAttente[]): void {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const enAttente = items.filter(i => i.statut === 'en_attente');

    // Detect new arrivals (sans_rdv, urgent)
    for (const item of items.filter(i => i.statut !== 'termine')) {
      if (!this.seenIds.has(item.id)) {
        this.seenIds.add(item.id);
        if (item.type === 'sans_rdv') {
          this.addNotification({
            titre: `${item.patientNom} vient d'arriver sans RDV`,
            message: '',
            type: 'info',
            lien: '/file-attente'
          });
        }
        if (item.type === 'urgent') {
          this.addNotification({
            titre: `⚡ ${item.patientNom} — Patient URGENT en attente`,
            message: '',
            type: 'danger',
            lien: '/file-attente'
          });
        }
      }
    }

    // Long wait (> 45 min)
    for (const item of enAttente) {
      const parts = item.heureArrivee.split(':').map(Number);
      const arrivalMinutes = parts[0] * 60 + parts[1];
      const waitMinutes = Math.max(0, nowMinutes - arrivalMinutes);
      if (waitMinutes > 45 && !this.longWaitNotified.has(item.id)) {
        this.longWaitNotified.add(item.id);
        this.addNotification({
          titre: `${item.patientNom} — ${waitMinutes} min • Longue attente`,
          message: '',
          type: 'warning',
          lien: '/file-attente'
        });
      }
    }

    // Long queue (> 5 en_attente)
    if (enAttente.length > 5 && !this.longQueueNotified) {
      this.longQueueNotified = true;
      this.addNotification({
        titre: `${enAttente.length} patients en attente — File chargée`,
        message: '',
        type: 'warning',
        lien: '/file-attente'
      });
    } else if (enAttente.length <= 5) {
      this.longQueueNotified = false;
    }
  }

  notifyConsultationTerminee(patientNom: string): void {
    const notif = this.addNotification({
      titre: `${patientNom} — Consultation terminée`,
      message: '',
      type: 'success'
    });
    setTimeout(() => this.removeNotification(notif.id), 5000);
  }
}