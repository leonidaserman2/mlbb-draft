import { DataSourceInfo, DataSourceStatus, MetaDataSource, SourceMode } from '../types/source';
import { SourceConfidence } from '../types/snapshot';

export abstract class AbstractMetaDataSource implements MetaDataSource {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly category: 'RANKED' | 'PRO' | 'PATCH' | 'HERO_METADATA';
  abstract readonly mode: SourceMode;
  abstract readonly confidence: SourceConfidence;
  abstract readonly sourceUrl: string;
  abstract readonly description: string;

  protected currentStatus: DataSourceStatus = 'UNAVAILABLE';
  protected lastSyncTime?: string;
  protected count: number = 0;

  get status(): DataSourceStatus {
    return this.currentStatus;
  }

  setStatus(newStatus: DataSourceStatus): void {
    this.currentStatus = newStatus;
  }

  getInfo(): DataSourceInfo {
    return {
      id: this.id,
      name: this.name,
      category: this.category,
      mode: this.mode,
      status: this.currentStatus,
      confidence: this.confidence,
      lastSync: this.lastSyncTime,
      recordCount: this.count,
      description: this.description,
      sourceUrl: this.sourceUrl,
    };
  }

  setLastSync(time: string, recordCount: number): void {
    this.lastSyncTime = time;
    this.count = recordCount;
  }
}
