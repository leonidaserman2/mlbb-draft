import { DraftStatePhase } from '../types/draft';

export const formatDraftPhase = (phase: DraftStatePhase, banPhaseIndex: number = 0, hasMidDraftBan: boolean = false): string => {
  switch (phase) {
    case 'PRE_DRAFT':
      return 'SETUP';
    case 'BAN_PHASE':
      return hasMidDraftBan ? `BAN PHASE ${banPhaseIndex + 1}` : 'BAN PHASE';
    case 'BAN_REVEAL':
      return 'BANS REVEALED';
    case 'PICK_PHASE':
      return 'PICK PHASE';
    case 'DRAFT_COMPLETE':
      return 'DRAFT COMPLETED';
    default:
      return phase;
  }
};

export const formatTimerSeconds = (seconds: number): string => {
  const clamped = Math.max(0, seconds);
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Lightweight web audio clicks/ticks for desktop feel without external media files.
 */
class SoundFx {
  private ctx: AudioContext | null = null;
  public enabled = true;

  private getContext() {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  playClick() {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {
      // Audio not permitted or failed
    }
  }

  playSelect() {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {
      // Audio not permitted or failed
    }
  }
}

export const soundFx = new SoundFx();
