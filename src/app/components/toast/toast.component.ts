import { Component } from '@angular/core';
import { ToastService, Toast } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.css']
})
export class ToastComponent {
  toasts: Toast[] = [];

  constructor(private toastService: ToastService) {
    this.toastService.toasts.subscribe(t => this.toasts = t);
  }

  dismiss(id: number): void {
    this.toastService.dismiss(id);
  }

  trackById(_: number, toast: Toast): number {
    return toast.id;
  }
}