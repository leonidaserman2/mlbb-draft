import { AbstractMetaDataSource } from './base';
import { ProDataSource, DataSourceResult } from '../types/source';
import { ProMatchRecord, SourceConfidence } from '../types/snapshot';
import { SAMPLE_RAW_PRO_MATCHES } from '../raw/sampleRawData';
import { normalizeProMatchBatch } from '../normalized/normalizer';

export class MLBBHubMplIdAdapter extends AbstractMetaDataSource implements ProDataSource {
  readonly id = 'mlbbhub-mpl-id';
  readonly name = 'MLBBHub MPL Indonesia';
  readonly category = 'PRO' as const;
  readonly mode = 'UNAVAILABLE' as const;
  readonly confidence: SourceConfidence = 'official';
  readonly sourceUrl = 'https://mlbbhub.com/tournaments/mpl-id';
  readonly description = 'Official MPL Indonesia tournament telemetry and pick/ban match logs.';

  constructor() {
    super();
    this.currentStatus = 'UNAVAILABLE';
  }

  async fetchProMatches(tournament?: string, patch?: string): Promise<DataSourceResult<ProMatchRecord[]>> {
    const startTime = new Date().toISOString();
    this.setStatus('UNAVAILABLE');
    return {
      success: false,
      source: this.name,
      timestamp: startTime,
      data: [],
      error: 'HTTP 404 confirmed on historical endpoint. Deactivated as live source pending verified endpoint.',
    };
  }
}
