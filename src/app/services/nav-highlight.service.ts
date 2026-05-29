import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NavHighlightService {
  readonly activeOverride$ = new BehaviorSubject<string | null>(null);
  set(path: string | null): void { this.activeOverride$.next(path); }
}