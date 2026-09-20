import { AbstractMetaDataSource } from './base';
import { RankedDataSource, DataSourceResult } from '../types/source';
import { MetaSnapshot, SourceConfidence } from '../types/snapshot';
import { SAMPLE_RAW_RANKED_DATA } from '../raw/sampleRawData';
import { normalizeRankedBatch } from '../normalized/normalizer';

export class MLBBHubRankedAdapter extends AbstractMetaDataSource implements RankedDataSource {
  readonly id = 'mlbbhub-ranked';
  readonly name = 'MLBBHub Ranked Statistics';
  readonly category = 'RANKED' as const;
  readonly mode = 'UNAVAILABLE' as const;
  readonly confidence: SourceConfidence = 'primary';
  readonly sourceUrl = 'https://mlbbhub.com/api/v1/ranked';
  readonly description = 'Official-aligned ranked tier matchmaking statistics covering Mythic+ and Glory tiers.';

  constructor() {
    super();
    this.currentStatus = 'UNAVAILABLE';
  }

  async fetchRankedSnapshots(patch: string, rankScope?: string): Promise<DataSourceResult<MetaSnapshot[]>> {
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
