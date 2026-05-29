import { Component } from '@angular/core';

@Component({
  selector: 'app-parametres',
  templateUrl: './parametres.component.html',
  styleUrls: ['./parametres.component.css']
})
export class ParametresComponent {
  activeTab = 'profil';
  saved = false;

  profil = {
    nom: 'Benkirane',
    prenom: 'Hassan',
    specialite: 'Médecine Générale',
    inpe: '12345',
    telephone: '0522 123 456',
    email: 'dr.benkirane@medicare.ma',
    adresse: '45 Boulevard Anfa',
    ville: 'Casablanca',
    codePostal: '20000',
    cnom: 'Dr. Hassan Benkirane',
    horaires: {
      lundi: { debut: '09:00', fin: '18:00', actif: true },
      mardi: { debut: '09:00', fin: '18:00', actif: true },
      mercredi: { debut: '09:00', fin: '18:00', actif: true },
      jeudi: { debut: '09:00', fin: '18:00', actif: true },
      vendredi: { debut: '09:00', fin: '17:00', actif: true },
      samedi: { debut: '09:00', fin: '13:00', actif: true },
      dimanche: { debut: '', fin: '', actif: false }
    }
  };

  horairesKeys = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
  horairesLabels: Record<string, string> = {
    lundi: 'Lundi', mardi: 'Mardi', mercredi: 'Mercredi',
    jeudi: 'Jeudi', vendredi: 'Vendredi', samedi: 'Samedi', dimanche: 'Dimanche'
  };

  saveProfile(): void {
    this.saved = true;
    setTimeout(() => this.saved = false, 3000);
  }

  getHoraire(jour: string) {
    return (this.profil.horaires as any)[jour];
  }
}