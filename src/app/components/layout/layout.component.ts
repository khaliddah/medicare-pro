import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { forkJoin, Subscription } from 'rxjs';
import { NotificationService } from '../../services/notification.service';
import { NavHighlightService } from '../../services/nav-highlight.service';
import { MockDataService } from '../../services/mock-data.service';
import { SidebarRefreshService } from '../../services/sidebar-refresh.service';
import { Notification, FileAttente } from '../../models';

interface NavItem {
  path: string;
  icon: string;
  label: string;
  children?: NavItem[];
  scrollTarget?: string;
}

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css']
})
export class LayoutComponent implements OnInit, OnDestroy {
  currentRoute = '';
  navOverride: string | null = null;
  unreadCount = 0;
  notifications: Notification[] = [];
  showNotifDropdown = false;
  showPlusMenu = false;
  currentDate = '';
  rdvTodayCount = 0;
  totalPatientsCount = 0;
  fileAttenteEnAttenteCount = 0;

  suivantPatient: FileAttente | null = null;
  enConsultationSidebar: FileAttente | null = null;
  enConsultationPatientAge: number | null = null;

  private suivantTimer: any;
  private notifTimer: any;
  private refreshSub: Subscription = new Subscription();

  navItems: NavItem[] = [
    { path: '/dashboard',    icon: 'bi-speedometer2',     label: 'Tableau de bord' },
    { path: '/patients',     icon: 'bi-people-fill',      label: 'Patients' },
    { path: '/agenda',       icon: 'bi-calendar3',        label: 'Agenda' },
    { path: '/file-attente', icon: 'bi-list-ol',          label: 'File d\'attente' },
    {
      path: '/consultation', icon: 'bi-clipboard2-pulse', label: 'Consultation',
      children: [
        { path: '/ordonnance', icon: 'bi-capsule',  label: 'Ordonnances', scrollTarget: 'section-ordonnance' },
        { path: '/examens',    icon: 'bi-activity', label: 'Analyses',    scrollTarget: 'section-analyses' }
      ]
    },
    { path: '/facturation',  icon: 'bi-credit-card',      label: 'Facturation' },
    { path: '/statistiques', icon: 'bi-bar-chart-fill',   label: 'Statistiques' },
    { path: '/parametres',   icon: 'bi-gear-fill',        label: 'Paramètres' }
  ];

  constructor(
    private router: Router,
    private notifService: NotificationService,
    private navHighlight: NavHighlightService,
    private dataService: MockDataService,
    private sidebarRefreshService: SidebarRefreshService
  ) {}

  ngOnInit(): void {
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((e: any) => {
      this.currentRoute = e.urlAfterRedirects;
    });
    this.currentRoute = this.router.url;

    this.navHighlight.activeOverride$.subscribe(o => {
      this.navOverride = o;
    });

    this.notifService.getNotifications().subscribe(notifs => {
      this.notifications = notifs;
      this.unreadCount = notifs.filter(n => !n.lue).length;
    });

    this.updateClock();
    setInterval(() => this.updateClock(), 60000);

    this.dataService.getRdvAujourdhui().subscribe(rdv => {
      this.rdvTodayCount = rdv.filter(r => r.statut !== 'annule').length;
    });

    this.dataService.getPatients().subscribe(p => {
      this.totalPatientsCount = p.length;
    });

    this.loadSuivant();
    this.suivantTimer = setInterval(() => this.loadSuivant(), 20000);

    this.refreshSub = this.sidebarRefreshService.refresh.subscribe(() => this.loadSuivant());

    this.checkNotifications();
    this.notifTimer = setInterval(() => this.checkNotifications(), 30000);
  }

  ngOnDestroy(): void {
    clearInterval(this.suivantTimer);
    clearInterval(this.notifTimer);
    this.refreshSub.unsubscribe();
  }

  loadSuivant(): void {
    forkJoin({
      consultation: this.dataService.getFileAttenteEnConsultation(),
      attente: this.dataService.getFileAttenteEnAttente()
    }).subscribe(({ consultation, attente }) => {
      this.enConsultationSidebar = consultation[0] || null;

      if (this.enConsultationSidebar) {
        this.dataService.getPatient(this.enConsultationSidebar.patientId).subscribe(p => {
          if (p) {
            const today = new Date();
            const birth = new Date(p.dateNaissance as unknown as string);
            let age = today.getFullYear() - birth.getFullYear();
            if (today.getMonth() < birth.getMonth() ||
              (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
            this.enConsultationPatientAge = age;
          } else {
            this.enConsultationPatientAge = null;
          }
        });
      } else {
        this.enConsultationPatientAge = null;
      }

      this.fileAttenteEnAttenteCount = attente.length;
      const sorted = attente.sort((a, b) => a.ordre - b.ordre);
      if (consultation.length > 0) {
        this.suivantPatient = sorted.find(p => p.ordre === 2) || sorted[0] || null;
      } else {
        this.suivantPatient = sorted.find(p => p.ordre === 1) || sorted[0] || null;
      }
    });
  }

  checkNotifications(): void {
    this.dataService.getFileAttenteEnAttente().subscribe(items => {
      this.notifService.checkFileAttente(items);
    });
  }

  get rdvSubtitle(): string {
    if (this.rdvTodayCount === 0) return 'Aucun rendez-vous aujourd\'hui';
    if (this.rdvTodayCount === 1) return '1 rendez-vous aujourd\'hui';
    return `${this.rdvTodayCount} rendez-vous aujourd'hui`;
  }

  updateClock(): void {
    const now = new Date();
    this.currentDate = now.toLocaleDateString('fr-MA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  isPlusActive(): boolean {
    return this.isActive('/consultation') || this.isActive('/ordonnance') || this.isActive('/examens')
        || this.isActive('/facturation') || this.isActive('/statistiques') || this.isActive('/parametres');
  }

  isActive(path: string): boolean {
    if (this.navOverride && this.currentRoute.startsWith('/consultation')) {
      return this.navOverride === path;
    }
    return this.currentRoute === path || this.currentRoute.startsWith(path + '/');
  }

  isParentActive(item: NavItem): boolean {
    if (this.isActive(item.path)) return true;
    return (item.children || []).some(c => this.isActive(c.path));
  }

  toggleNotifDropdown(): void {
    this.showNotifDropdown = !this.showNotifDropdown;
  }

  markAsRead(id: number): void {
    this.notifService.markAsRead(id);
  }

  markAllRead(): void {
    this.notifService.markAllAsRead();
    this.showNotifDropdown = false;
  }

  navigateTo(path: string): void {
    this.showNotifDropdown = false;
    if (path) this.router.navigate([path]);
  }

  navigateToSection(scrollTarget: string): void {
    this.showNotifDropdown = false;
    this.router.navigate(['/consultation']).then(() => {
      setTimeout(() => {
        const el = document.getElementById(scrollTarget);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    });
  }

  getEnConsultationInitials(): string {
    if (!this.enConsultationSidebar) return '?';
    const parts = this.enConsultationSidebar.patientNom.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
  }

  getSuivantInitials(): string {
    if (!this.suivantPatient) return '?';
    return this.suivantPatient.patientNom.charAt(0).toUpperCase();
  }

  get unreadNotifications(): Notification[] {
    return this.notifications.filter(n => !n.lue);
  }

  getNotifBorderColor(type: string): string {
    const colors: Record<string, string> = {
      critical: '#dc2626', result: '#0d9488', wait: '#d97706',
      danger: '#dc2626', info: '#2563eb', warning: '#d97706', success: '#16a34a'
    };
    return colors[type] || '#94a3b8';
  }

  getNotifIcon(type: string): string {
    const icons: Record<string, string> = {
      critical: 'bi-exclamation-circle-fill text-danger',
      result:   'bi-check-circle-fill text-teal',
      wait:     'bi-clock-fill text-warning',
      danger:   'bi-x-circle-fill text-danger',
      info:     'bi-info-circle-fill text-primary',
      warning:  'bi-exclamation-triangle-fill text-warning',
      success:  'bi-check-circle-fill text-success'
    };
    return icons[type] || 'bi-bell-fill text-secondary';
  }

  getTimeAgo(date: Date): string {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (diff < 1) return 'À l\'instant';
    if (diff < 60) return `Il y a ${diff} min`;
    const h = Math.floor(diff / 60);
    if (h < 24) return `Il y a ${h}h`;
    return `Il y a ${Math.floor(h / 24)}j`;
  }
}