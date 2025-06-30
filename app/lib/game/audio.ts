// Simple functional sound manager
interface SoundState {
  audio: HTMLAudioElement;
  volume: number;
  loop: boolean;
}

interface AudioSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
}

// Global state using closures (functional approach)
let sounds = new Map<string, SoundState>();
let settings: AudioSettings = {
  masterVolume: 0.7,
  musicVolume: 0.5,
  sfxVolume: 0.8,
  muted: false
};

// Pure functions for sound management
const loadSound = async (name: string, path: string, volume: number = 1, loop: boolean = false): Promise<void> => {
  try {
    const audio = new Audio(path);
    audio.preload = 'auto';
    
    return new Promise((resolve) => {
      const onLoad = () => {
        audio.removeEventListener('canplaythrough', onLoad);
        audio.removeEventListener('error', onError);
        sounds.set(name, { audio, volume, loop });
        resolve();
      };
      
      const onError = () => {
        audio.removeEventListener('canplaythrough', onLoad);
        audio.removeEventListener('error', onError);
        console.warn(`Failed to load sound: ${name} from ${path}`);
        resolve(); // Don't reject, just warn and continue
      };
      
      audio.addEventListener('canplaythrough', onLoad);
      audio.addEventListener('error', onError);
      audio.load();
    });
  } catch (error) {
    console.warn(`Error loading sound: ${name}`, error);
  }
};

const playSound = (name: string, forcePlay: boolean = false): void => {
  if (settings.muted && !forcePlay) return;
  
  const sound = sounds.get(name);
  if (!sound) {
    console.warn(`Sound not found: ${name}`);
    return;
  }

  try {
    const { audio, volume, loop } = sound;
    
    // Reset audio to start
    audio.currentTime = 0;
    audio.loop = loop;
    
    // Calculate final volume
    const finalVolume = volume * 
      (name.includes('music') ? settings.musicVolume : settings.sfxVolume) * 
      settings.masterVolume;
    
    audio.volume = Math.max(0, Math.min(1, finalVolume));
    
    // Play the sound
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.warn(`Failed to play sound: ${name}`, error);
      });
    }
  } catch (error) {
    console.warn(`Error playing sound: ${name}`, error);
  }
};

const stopSound = (name: string): void => {
  const sound = sounds.get(name);
  if (sound) {
    sound.audio.pause();
    sound.audio.currentTime = 0;
  }
};

const pauseSound = (name: string): void => {
  const sound = sounds.get(name);
  if (sound) {
    sound.audio.pause();
  }
};

const resumeSound = (name: string): void => {
  if (settings.muted) return;
  
  const sound = sounds.get(name);
  if (sound && sound.audio.paused) {
    sound.audio.play().catch(error => {
      console.warn(`Failed to resume sound: ${name}`, error);
    });
  }
};

const setMuted = (muted: boolean): void => {
  settings.muted = muted;
  
  if (muted) {
    // Pause all sounds
    sounds.forEach((sound) => {
      if (!sound.audio.paused) {
        sound.audio.pause();
      }
    });
  } else {
    // Resume background music if it was playing
    const music = sounds.get('level1-music');
    if (music && music.audio.paused && music.audio.currentTime > 0) {
      resumeSound('level1-music');
    }
  }
};

const isMuted = (): boolean => {
  return settings.muted;
};

const updateSettings = (newSettings: Partial<AudioSettings>): void => {
  settings = { ...settings, ...newSettings };
  
  // Update volumes for all sounds
  sounds.forEach((sound, name) => {
    const finalVolume = sound.volume * 
      (name.includes('music') ? settings.musicVolume : settings.sfxVolume) * 
      settings.masterVolume;
    
    sound.audio.volume = Math.max(0, Math.min(1, finalVolume));
  });
};

const startBackgroundMusic = (): void => {
  if (!settings.muted) {
    playSound('level1-music');
  }
};

const stopBackgroundMusic = (): void => {
  stopSound('level1-music');
};

// Load all sounds function
const loadAllSounds = async (): Promise<void> => {
  const soundsToLoad = [
    { name: 'shoot', path: '/sounds/shoot.wav', volume: 0.3 }, // Lowered from 0.6 to 0.3
    { name: 'explosion', path: '/sounds/explosion.mp3', volume: 0.8 },
    { name: 'low-health', path: '/sounds/low-health.mp3', volume: 0.7 },
    { name: 'power-up', path: '/sounds/power-up.mp3', volume: 0.5 }, // Added power-up sound
    { name: 'level1-music', path: '/sounds/level1.mp3', volume: 0.4, loop: true },
  ];

  console.log('Loading sounds...');
  await Promise.all(
    soundsToLoad.map(sound => 
      loadSound(sound.name, sound.path, sound.volume, sound.loop || false)
    )
  );
  console.log('All sounds loaded!');
};

// Export simple sound manager object
export const soundManager = {
  init: loadAllSounds,
  playSound,
  stopSound,
  pauseSound,
  resumeSound,
  setMuted,
  isMuted,
  updateSettings,
  startBackgroundMusic,
  stopBackgroundMusic,
}; 