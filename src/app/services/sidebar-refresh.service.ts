import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SidebarRefreshService {
  private refresh$ = new Subject<void>();
  readonly refresh = this.refresh$.asObservable();

  triggerRefresh(): void {
    this.refresh$.next();
  }
}