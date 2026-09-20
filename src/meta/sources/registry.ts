import { MetaDataSource, DataSourceInfo } from '../types/source';
import { MLBBHubRankedAdapter } from './mlbbHubRankedAdapter';
import { MLBBHubMplIdAdapter } from './mlbbHubMplIdAdapter';
import { MplPhAdapter } from './mplPhAdapter';
import { LiquipediaAdapter } from './liquipediaAdapter';
import { MLBBDexPatchAdapter } from './mlbbDexPatchAdapter';

export class DataSourceRegistry {
  private sources: Map<string, MetaDataSource> = new Map();

  public readonly rankedAdapter: MLBBHubRankedAdapter;
  public readonly mplIdAdapter: MLBBHubMplIdAdapter;
  public readonly mplPhAdapter: MplPhAdapter;
  public readonly liquipediaAdapter: LiquipediaAdapter;
  public readonly patchAdapter: MLBBDexPatchAdapter;

  constructor() {
    this.rankedAdapter = new MLBBHubRankedAdapter();
    this.mplIdAdapter = new MLBBHubMplIdAdapter();
    this.mplPhAdapter = new MplPhAdapter();
    this.liquipediaAdapter = new LiquipediaAdapter();
    this.patchAdapter = new MLBBDexPatchAdapter();

    this.register(this.rankedAdapter);
    this.register(this.mplIdAdapter);
    this.register(this.mplPhAdapter);
    this.register(this.liquipediaAdapter);
    this.register(this.patchAdapter);
  }

  register(source: MetaDataSource): void {
    this.sources.set(source.id, source);
  }

  getSource(id: string): MetaDataSource | undefined {
    return this.sources.get(id);
  }

  getAllSources(): MetaDataSource[] {
    return Array.from(this.sources.values());
  }

  getAllAdapters(): MetaDataSource[] {
    return this.getAllSources();
  }

  getAllSourceInfos(): DataSourceInfo[] {
    return this.getAllSources().map((s) => s.getInfo());
  }
}

// Export singleton instance
export const dataSourceRegistry = new DataSourceRegistry();
