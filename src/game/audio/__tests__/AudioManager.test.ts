import { describe, it, expect, beforeEach } from 'vitest';
import { AudioManager } from '../AudioManager';

describe('AudioManager', () => {
  let audio: AudioManager;

  beforeEach(() => {
    audio = new AudioManager();
  });

  it('plays battle music when requested', () => {
    audio.playMusic('battle');
    expect(audio.isMusicPlaying).toBe(true);
    expect(audio.currentTrack).toBe('battle');
  });

  it('fades music when victory fanfare is played', () => {
    audio.playMusic('battle');
    audio.playVictoryFanfare();
    expect(audio.currentTrack).toBe('victory');
  });

  it('stops music when muted', () => {
    audio.playMusic('map');
    audio.toggleMute();
    expect(audio.isMusicPlaying).toBe(false);
  });

  it('respects volume settings', () => {
    audio.setMasterVolume(0.5);
    expect(audio.audioConfig.masterVolume).toBe(0.5);
  });

  it('mutes all audio when toggleMute is called', () => {
    audio.toggleMute();
    expect(audio.audioConfig.muted).toBe(true);
    audio.toggleMute();
    expect(audio.audioConfig.muted).toBe(false);
  });

  it('can play SFX events', () => {
    // Should not throw
    audio.playSFX('hit');
    audio.playSFX('miss');
    audio.playSFX('level_up');
  });
});
