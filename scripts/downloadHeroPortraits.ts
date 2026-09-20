import fs from 'fs';
import path from 'path';
import { ALL_MLBB_HEROES } from '../src/data/heroes';

const ASSETS_DIR = path.join(process.cwd(), 'src', 'assets', 'heroes');

if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

// Additional verified URLs for edge cases or specific latest heroes
const SPECIAL_HERO_URLS: Record<string, string> = {
  'wu-zetian': 'https://akmweb.youngjoygame.com/web/svnres/img/mlbb/homepage_1_9_90/100_8d965f05f84621a51f799aeb8fb5f4c4.png',
  'sora': 'https://static.wikia.nocookie.net/mobile-legends/images/0/00/Hero1311-portrait.png/revision/latest',
  'marcel': 'https://static.wikia.nocookie.net/mobile-legends/images/2/27/Hero1321-portrait.png/revision/latest',
  'hirara': 'https://static.wikia.nocookie.net/mobile-legends/images/1/19/Hero1331-portrait.png/revision/latest',
};

async function main() {
  console.log('Fetching verified official MLBB dataset from p3hndrx/MLBB-API...');
  const datasetRes = await fetch(
    'https://raw.githubusercontent.com/p3hndrx/MLBB-API/master/v1/hero-meta-final.json'
  );
  if (!datasetRes.ok) {
    throw new Error(`Failed to fetch dataset: ${datasetRes.statusText}`);
  }
  const dataset = await datasetRes.json();
  const apiHeroes = dataset.data.filter((h: any) => h.hero_name !== 'None');

  const results: {
    heroId: string;
    heroName: string;
    success: boolean;
    localPath: string;
    sourceUrl?: string;
    bytes?: number;
    error?: string;
  }[] = [];

  for (const hero of ALL_MLBB_HEROES) {
    let sourceUrl = SPECIAL_HERO_URLS[hero.id];

    if (!sourceUrl) {
      // Find in dataset
      const match = apiHeroes.find((ah: any) =>
        ah.uid?.toLowerCase() === hero.id.toLowerCase() ||
        ah.hero_name?.toLowerCase().replace(/[^a-z0-9]/g, '') === hero.name.toLowerCase().replace(/[^a-z0-9]/g, '')
      );
      if (match && match.portrait) {
        sourceUrl = match.portrait;
      }
    }

    if (!sourceUrl) {
      console.warn(`No verified URL found for ${hero.name} (${hero.id})`);
      results.push({
        heroId: hero.id,
        heroName: hero.name,
        success: false,
        localPath: `src/assets/heroes/${hero.id}.png`,
        error: 'No verified source URL',
      });
      continue;
    }

    // Download image
    try {
      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      };
      if (sourceUrl.includes('youngjoygame.com') || sourceUrl.includes('yuanzhanapp.com')) {
        headers['Referer'] = 'https://m.mobilelegends.com/';
      }

      const imgRes = await fetch(sourceUrl, { headers });
      if (!imgRes.ok) {
        throw new Error(`HTTP ${imgRes.status} ${imgRes.statusText}`);
      }

      const buffer = Buffer.from(await imgRes.arrayBuffer());
      if (buffer.length < 500) {
        throw new Error(`Suspiciously small payload: ${buffer.length} bytes`);
      }

      const targetFile = path.join(ASSETS_DIR, `${hero.id}.png`);
      fs.writeFileSync(targetFile, buffer);

      results.push({
        heroId: hero.id,
        heroName: hero.name,
        success: true,
        localPath: `src/assets/heroes/${hero.id}.png`,
        sourceUrl,
        bytes: buffer.length,
      });
      process.stdout.write(`Downloaded ${hero.name} (${buffer.length} bytes)\n`);
    } catch (err: any) {
      console.error(`Failed to download ${hero.name}:`, err.message);
      results.push({
        heroId: hero.id,
        heroName: hero.name,
        success: false,
        localPath: `src/assets/heroes/${hero.id}.png`,
        sourceUrl,
        error: err.message,
      });
    }
  }

  // Summary
  const downloaded = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  console.log('\n--- DOWNLOAD SUMMARY ---');
  console.log(`Total Heroes: ${ALL_MLBB_HEROES.length}`);
  console.log(`Successfully Downloaded: ${downloaded.length}`);
  console.log(`Failed / Missing: ${failed.length}`);

  if (failed.length > 0) {
    console.log('Failed heroes:', failed.map((f) => `${f.heroName} (${f.error})`));
  }

  // Save mapping manifest
  fs.writeFileSync(
    path.join(process.cwd(), 'src', 'data', 'heroAssetManifest.json'),
    JSON.stringify(results, null, 2)
  );
}

main().catch(console.error);
