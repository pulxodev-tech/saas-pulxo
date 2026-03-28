import { Injectable, inject } from '@angular/core';
import { SurveyService } from './survey.service';
import { OfflineSurveyService, OfflineSurvey } from './offline-survey.service';
import { from, interval, switchMap, catchError, of, concatMap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SurveySyncService {
  private surveyService = inject(SurveyService);
  private offline       = inject(OfflineSurveyService);

  constructor() {
    // Start periodic sync every 5 minutes
    interval(1000 * 60 * 5).pipe(
      switchMap(() => from(this.syncPendingSurveys()))
    ).subscribe();

    // Also sync when coming back online
    window.addEventListener('online', () => this.syncPendingSurveys());
  }

  async syncPendingSurveys(): Promise<void> {
    const pending = await this.offline.getPendingSurveys();
    if (pending.length === 0) return;

    console.log(`[Sync] Found ${pending.length} pending surveys. Attempting sync...`);

    for (const survey of pending) {
      await this.syncOne(survey);
    }
  }

  private async syncOne(survey: OfflineSurvey): Promise<void> {
    const id = survey.id!;
    const payload = { ...survey } as any;
    delete payload.id;
    delete payload.synced;
    delete payload.created_at;

    try {
      this.surveyService.submitSurvey(payload).subscribe({
        next: () => {
          this.offline.markAsSynced(id);
          console.log(`[Sync] Survey ${id} synced successfully.`);
        },
        error: (err) => {
          console.warn(`[Sync] Failed to sync survey ${id}:`, err);
        }
      });
    } catch (error) {
       console.error(`[Sync] unexpected error syncing ${id}:`, error);
    }
  }
}
