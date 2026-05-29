import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LayoutComponent } from './components/layout/layout.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { PatientsComponent } from './components/patients/patients.component';
import { PatientDossierComponent } from './components/patient-dossier/patient-dossier.component';
import { AgendaComponent } from './components/agenda/agenda.component';
import { ConsultationComponent } from './components/consultation/consultation.component';
import { FileAttenteComponent } from './components/file-attente/file-attente.component';
import { FacturationComponent } from './components/facturation/facturation.component';
import { StatistiquesComponent } from './components/statistiques/statistiques.component';
import { ParametresComponent } from './components/parametres/parametres.component';

const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'patients', component: PatientsComponent },
      { path: 'patients/:id', component: PatientDossierComponent },
      { path: 'agenda', component: AgendaComponent },
      { path: 'file-attente', component: FileAttenteComponent },
      { path: 'consultation', component: ConsultationComponent },
      { path: 'facturation', component: FacturationComponent },
      { path: 'statistiques', component: StatistiquesComponent },
      { path: 'parametres', component: ParametresComponent }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }