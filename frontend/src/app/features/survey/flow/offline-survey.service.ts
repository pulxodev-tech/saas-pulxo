import { Injectable } from '@angular/core';
import { Dexie, type Table } from 'dexie';

export interface OfflineSurvey {
  id?: number;
  form_id: number;
  group_id: number;
  respondent_phone: string;
  respondent_name?: string;
  respondent_last_name?: string;
  respondent_gender?: string;
  respondent_age?: number;
  respondent_occupation?: string;
  respondent_neighborhood?: string;
  encuestador_lat?: number;
  encuestador_lng?: number;
  address_lat?: number;
  address_lng?: number;
  responses: any;
  created_at: number;
  synced: boolean;
}

export interface SurveyDraft {
  id: string; // phone + formId
  step: string;
  formId: number;
  data: any;
  updated_at: number;
}

@Injectable({
  providedIn: 'root'
})
export class OfflineSurveyService extends Dexie {
  surveys!: Table<OfflineSurvey, number>;
  drafts!: Table<SurveyDraft, string>;

  constructor() {
    super('PulxoOfflineDB');
    this.version(1).stores({
      surveys: '++id, form_id, respondent_phone, synced',
      drafts: 'id, formId'
    });
  }

  // ── Drafts (In-progress) ──────────────────────────────────────────────────
  async saveDraft(draft: SurveyDraft): Promise<void> {
    await this.drafts.put({ ...draft, updated_at: Date.now() });
  }

  async getDraft(id: string): Promise<SurveyDraft | undefined> {
    return await this.drafts.get(id);
  }

  async deleteDraft(id: string): Promise<void> {
    await this.drafts.delete(id);
  }

  // ── Finalized Surveys (Pending Sync) ──────────────────────────────────────
  async saveSurvey(survey: Omit<OfflineSurvey, 'id' | 'synced' | 'created_at'>): Promise<number> {
    return await this.surveys.add({
      ...survey,
      created_at: Date.now(),
      synced: false
    });
  }

  async getPendingSurveys(): Promise<OfflineSurvey[]> {
    return await this.surveys.where('synced').equals(0).toArray();
  }

  async markAsSynced(id: number): Promise<void> {
    await this.surveys.update(id, { synced: true });
  }

  async deleteSyncedSurveys(): Promise<void> {
    await this.surveys.where('synced').equals(1).delete();
  }
}
