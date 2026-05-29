import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private counter = 0;
  private toasts$ = new BehaviorSubject<Toast[]>([]);
  toasts = this.toasts$.asObservable();

  showSuccess(message: string): void {
    this.add({ message, type: 'success' });
  }

  showError(message: string): void {
    this.add({ message, type: 'error' });
  }

  showWarning(message: string): void {
    this.add({ message, type: 'warning' });
  }

  showInfo(message: string): void {
    this.add({ message, type: 'info' });
  }

  private add(toast: Omit<Toast, 'id'>): void {
    const id = ++this.counter;
    const newToast = { ...toast, id };
    this.toasts$.next([...this.toasts$.value, newToast]);
    setTimeout(() => this.dismiss(id), 3000);
  }

  dismiss(id: number): void {
    this.toasts$.next(this.toasts$.value.filter(t => t.id !== id));
  }
}