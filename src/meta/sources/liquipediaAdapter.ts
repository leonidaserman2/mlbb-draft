import { AbstractMetaDataSource } from './base';
import { ProDataSource, DataSourceResult } from '../types/source';
import { ProMatchRecord, SourceConfidence } from '../types/snapshot';

/**
 * Liquipedia Historical Competitive Adapter
 * NOTE: Liquipedia applies strict bot protection (Cloudflare / rate limiting)
 * and does not provide an open real-time API for live drafts.
 * Therefore, this adapter is explicitly marked as MANUAL_EXTERNAL.
 * It imports verified static historical archives and does NOT execute aggressive scraping.
 */
export class LiquipediaAdapter extends AbstractMetaDataSource implements ProDataSource {
  readonly id = 'liquipedia-competitive';
  readonly name = 'Liquipedia Historical Competitive';
  readonly category = 'PRO' as const;
  readonly mode = 'MANUAL_EXTERNAL' as const;
  readonly confidence: SourceConfidence = 'secondary';
  readonly sourceUrl = 'https://liquipedia.net/mobilelegends';
  readonly description = 'Manual historical competitive tournament dumps from Liquipedia wiki archives (offline-safe).';

  private manualArchive: ProMatchRecord[] = [];

  constructor(initialArchive: ProMatchRecord[] = []) {
    super();
    this.currentStatus = 'MANUAL_EXTERNAL';
    this.manualArchive = initialArchive;
  }

  /**
   * Import verified manual archive dump
   */
  importManualArchive(records: ProMatchRecord[]): void {
    this.manualArchive = records;
    this.setLastSync(new Date().toISOString(), records.length);
  }

  async fetchProMatches(tournament?: string, patch?: string): Promise<DataSourceResult<ProMatchRecord[]>> {
    const startTime = new Date().toISOString();
    
    // Filter from manually imported archive
    const filtered = this.manualArchive.filter((m) => {
      const matchTourney = !tournament || m.tournament.toLowerCase().includes(tournament.toLowerCase());
      const matchPatch = !patch || m.patch === patch;
      return matchTourney && matchPatch;
    });

    return {
      success: true,
      source: this.name,
      timestamp: startTime,
      data: filtered,
    };
  }
}
