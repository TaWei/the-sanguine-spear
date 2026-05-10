export type AudioEvent =
  | 'menu_open'
  | 'menu_select'
  | 'menu_cancel'
  | 'hit'
  | 'hit_crit'
  | 'miss'
  | 'level_up'
  | 'phase_player'
  | 'phase_enemy'
  | 'victory'
  | 'defeat';

export type MusicTrack = 'map' | 'battle' | 'victory' | 'defeat' | 'prep';

export interface AudioConfig {
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  muted: boolean;
}

export class AudioManager {
  private config: AudioConfig = {
    masterVolume: 1.0,
    sfxVolume: 0.8,
    musicVolume: 0.6,
    muted: false,
  };
  private currentMusic: MusicTrack | null = null;
  private musicPlaying = false;
  private sfxPlaying = new Set<string>();

  /** Play a sound effect */
  playSFX(event: AudioEvent, _critical = false): void {
    if (this.config.muted) return;
    const key = `${event}${_critical ? '_crit' : ''}`;
    this.sfxPlaying.add(key);
    // In a real implementation, this would call Phaser's sound.play()
    // For now, track the state for testability
  }

  /** Play background music */
  playMusic(track: MusicTrack): void {
    if (this.config.muted) return;
    if (this.currentMusic !== track) {
      this.stopMusic();
      this.currentMusic = track;
      this.musicPlaying = true;
    }
  }

  /** Stop current music */
  stopMusic(): void {
    this.musicPlaying = false;
    this.currentMusic = null;
  }

  /** Fade music to a new track */
  fadeToMusic(track: MusicTrack, _duration = 500): void {
    this.stopMusic();
    this.playMusic(track);
  }

  /** Play victory fanfare */
  playVictoryFanfare(): void {
    this.fadeToMusic('victory');
  }

  /** Play defeat music */
  playDefeatMusic(): void {
    this.fadeToMusic('defeat');
  }

  /** Set master volume */
  setMasterVolume(volume: number): void {
    this.config.masterVolume = Math.max(0, Math.min(1, volume));
  }

  /** Set SFX volume */
  setSFXVolume(volume: number): void {
    this.config.sfxVolume = Math.max(0, Math.min(1, volume));
  }

  /** Set music volume */
  setMusicVolume(volume: number): void {
    this.config.musicVolume = Math.max(0, Math.min(1, volume));
  }

  /** Toggle mute */
  toggleMute(): void {
    this.config.muted = !this.config.muted;
    if (this.config.muted) {
      this.stopMusic();
    }
  }

  /** Get whether music is currently playing */
  get isMusicPlaying(): boolean {
    return this.musicPlaying;
  }

  /** Get current music track */
  get currentTrack(): MusicTrack | null {
    return this.currentMusic;
  }

  /** Get audio config */
  get audioConfig(): Readonly<AudioConfig> {
    return this.config;
  }
}
