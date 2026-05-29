import { Component, OnInit } from '@angular/core';
import { MockDataService } from '../../services/mock-data.service';
import { ToastService } from '../../services/toast.service';
import { Facture } from '../../models';

@Component({
  selector: 'app-facturation',
  templateUrl: './facturation.component.html',
  styleUrls: ['./facturation.component.css']
})
export class FacturationComponent implements OnInit {
  factures: Facture[] = [];
  activeTab: 'attente' | 'payee' | 'toutes' = 'attente';
  encaisserFactureId: number | null = null;
  encaisserForm = { modePaiement: 'especes', montant: 0 };
  confirming = false;
  printFacture: Facture | null = null;

  readonly modesLabel: Record<string, string> = {
    especes: 'Espèces', cheque: 'Chèque', virement: 'Virement',
    cnops: 'CNOPS', cnss: 'CNSS', mutuelle: 'Mutuelle'
  };
  readonly modesIcon: Record<string, string> = {
    especes: 'bi-cash-coin', cheque: 'bi-check2-square', virement: 'bi-bank',
    cnops: 'bi-shield-check', cnss: 'bi-shield-fill-check', mutuelle: 'bi-heart-pulse'
  };

  constructor(private dataService: MockDataService, private toastService: ToastService) {}

  ngOnInit(): void {
    this.loadFactures();
  }

  loadFactures(): void {
    this.dataService.getFactures().subscribe({
      next: f => { this.factures = f; },
      error: () => this.toastService.showError('Erreur de connexion au serveur')
    });
  }

  getTodayString(): string {
    return new Date().toISOString().split('T')[0];
  }

  isToday(dateStr: string | undefined): boolean {
    return !!dateStr && dateStr.startsWith(this.getTodayString());
  }

  isSameMonth(dateStr: string | undefined): boolean {
    if (!dateStr) return false;
    const today = new Date();
    const d = new Date(dateStr);
    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  }

  get facturesAttente(): Facture[] {
    return this.factures.filter(f => f.statut === 'en_attente' || f.statut === 'impayee' || f.statut === 'partielle');
  }

  get facturesPayees(): Facture[] {
    return this.factures.filter(f => f.statut === 'payee');
  }

  get todayCollected(): number {
    return this.factures
      .filter(f => f.statut === 'payee' && this.isToday(f.datePaiement as unknown as string))
      .reduce((s, f) => s + f.montantPaye, 0);
  }

  get pendingSum(): number {
    return this.facturesAttente.reduce((s, f) => s + f.total, 0);
  }

  get monthTotal(): number {
    return this.factures
      .filter(f => f.statut === 'payee' && this.isSameMonth(f.datePaiement as unknown as string))
      .reduce((s, f) => s + f.montantPaye, 0);
  }

  openEncaisser(f: Facture): void {
    this.encaisserFactureId = f.id;
    this.encaisserForm = { modePaiement: 'especes', montant: f.total };
  }

  cancelEncaisser(): void {
    this.encaisserFactureId = null;
  }

  confirmPaiement(f: Facture): void {
    this.confirming = true;
    this.dataService.updateFacture(f.id, {
      statut: 'payee',
      modePaiement: this.encaisserForm.modePaiement as any,
      montantPaye: f.total,
      reste: 0,
      datePaiement: this.getTodayString() as any
    }).subscribe({
      next: () => {
        this.encaisserFactureId = null;
        this.confirming = false;
        this.toastService.showSuccess(`Paiement enregistré — ${f.patientNom} — ${f.total} DH`);
        this.loadFactures();
      },
      error: () => {
        this.confirming = false;
        this.toastService.showError('Erreur lors de l\'enregistrement');
      }
    });
  }

  printRecu(f: Facture): void {
    this.printFacture = f;
    setTimeout(() => window.print(), 200);
    window.addEventListener('afterprint', () => { this.printFacture = null; }, { once: true });
  }

  modeLabel(mode?: string): string {
    return mode ? (this.modesLabel[mode] || mode) : '—';
  }

  modeIcon(mode?: string): string {
    return mode ? (this.modesIcon[mode] || 'bi-credit-card') : 'bi-credit-card';
  }

  get today(): Date { return new Date(); }
}