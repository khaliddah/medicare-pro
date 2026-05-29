import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

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
import { ToastComponent } from './components/toast/toast.component';

@NgModule({
  declarations: [
    AppComponent,
    LayoutComponent,
    DashboardComponent,
    PatientsComponent,
    PatientDossierComponent,
    AgendaComponent,
    ConsultationComponent,
    FileAttenteComponent,
    FacturationComponent,
    StatistiquesComponent,
    ParametresComponent,
    ToastComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }