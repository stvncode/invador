import * as Effect from "effect/Effect"
import { AnimatePresence, motion } from 'framer-motion'
import React, { useEffect, useState } from 'react'
import {
    CONTROL_LABELS,
    DEFAULT_SETTINGS,
    DIFFICULTY_CONFIGS,
    SettingsOperations,
    SettingsService,
    SettingsServiceLayer
} from '../lib/game/settings'
import { GameSettings } from '../lib/game/types'
// Import components individually to avoid circular imports
import { Button } from './ui/button'
import { ErrorBoundary } from './ui/error-boundary'
import { ButtonLoading, LoadingSpinner } from './ui/loading'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Slider } from './ui/slider'
import { SoundToggle } from './ui/sound-toggle'
import { Switch } from './ui/switch'
import { useToast } from './ui/toast'

interface SettingsProps {
  onBack?: () => void
  onApply?: (settings: GameSettings) => void
}

interface KeyBindingState {
  action: string | null
  isListening: boolean
}

const SettingsRuntime = SettingsServiceLayer

const SettingsContent: React.FC<SettingsProps> = ({ onBack, onApply }) => {
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS)
  const [activeTab, setActiveTab] = useState<'audio' | 'controls' | 'difficulty' | 'advanced'>('audio')
  const [isLoading, setIsLoading] = useState(true)
  const [hasChanges, setHasChanges] = useState(false)
  const [keyBinding, setKeyBinding] = useState<KeyBindingState>({ action: null, isListening: false })
  const [exportData, setExportData] = useState<string>('')
  const [isOperationLoading, setIsOperationLoading] = useState<string | null>(null)
  
  const { addToast } = useToast()

  // Load settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true)
        const loadedSettings = await Effect.runPromise(
          SettingsOperations.getCurrentSettings()
        )
        setSettings(loadedSettings)
        addToast({
          type: 'success',
          title: 'Settings Loaded',
          description: 'Your preferences have been restored',
          duration: 3000
        })
      } catch (error) {
        console.error('Failed to load settings:', error)
        setSettings(DEFAULT_SETTINGS)
        addToast({
          type: 'error',
          title: 'Failed to Load Settings',
          description: 'Using default settings instead',
          duration: 5000
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [addToast])

  // Audio settings handlers
  const handleVolumeChange = async (type: 'master' | 'music' | 'sfx', value: number) => {
    const normalizedValue = value / 100 // Convert 0-100 to 0-1
    const newSettings = {
      ...settings,
      audio: { ...settings.audio, [`${type}Volume`]: normalizedValue }
    }
    setSettings(newSettings)
    setHasChanges(true)

    try {
      setIsOperationLoading(`${type}-volume`)
      await Effect.runPromise(
        SettingsOperations.updateVolume(type, normalizedValue)
      )
    } catch (error) {
      console.error(`Failed to update ${type} volume:`, error)
      addToast({
        type: 'error',
        title: 'Volume Update Failed',
        description: `Could not save ${type} volume setting`
      })
    } finally {
      setIsOperationLoading(null)
    }
  }

  const handleMuteToggle = async () => {
    const newSettings = {
      ...settings,
      audio: { ...settings.audio, muted: !settings.audio.muted }
    }
    setSettings(newSettings)
    setHasChanges(true)

    try {
      setIsOperationLoading('mute')
      await Effect.runPromise(
        SettingsOperations.toggleMute()
      )
      addToast({
        type: 'info',
        title: newSettings.audio.muted ? 'Audio Muted' : 'Audio Unmuted',
        description: newSettings.audio.muted ? 'All sounds disabled' : 'Sounds restored',
        duration: 2000
      })
    } catch (error) {
      console.error('Failed to toggle mute:', error)
      addToast({
        type: 'error',
        title: 'Mute Toggle Failed',
        description: 'Could not save audio setting'
      })
    } finally {
      setIsOperationLoading(null)
    }
  }

  // Graphics settings handlers
  const handleGraphicsToggle = async (setting: keyof GameSettings["graphics"]) => {
    const newValue = !settings.graphics[setting]
    const newSettings = {
      ...settings,
      graphics: { ...settings.graphics, [setting]: newValue }
    }
    setSettings(newSettings)
    setHasChanges(true)

    try {
      setIsOperationLoading(setting)
      await Effect.runPromise(
        SettingsOperations.updateGraphicsSetting(setting, newValue)
      )
      addToast({
        type: 'success',
        title: `${setting} ${newValue ? 'Enabled' : 'Disabled'}`,
        duration: 2000
      })
    } catch (error) {
      console.error(`Failed to update ${setting}:`, error)
      addToast({
        type: 'error',
        title: 'Graphics Setting Failed',
        description: `Could not save ${setting} setting`
      })
    } finally {
      setIsOperationLoading(null)
    }
  }

  // Difficulty handler
  const handleDifficultyChange = async (difficulty: string) => {
    const difficultyLevel = difficulty as "easy" | "normal" | "hard" | "nightmare"
    const newSettings = { ...settings, difficulty: difficultyLevel }
    setSettings(newSettings)
    setHasChanges(true)

    try {
      setIsOperationLoading('difficulty')
      const settingsService = await Effect.runPromise(
        SettingsService.pipe(Effect.provide(SettingsRuntime))
      )
      await Effect.runPromise(
        settingsService.setDifficulty(difficultyLevel)
      )
      addToast({
        type: 'success',
        title: 'Difficulty Updated',
        description: `Game set to ${DIFFICULTY_CONFIGS[difficultyLevel].label} mode`,
        duration: 3000
      })
    } catch (error) {
      console.error('Failed to update difficulty:', error)
      addToast({
        type: 'error',
        title: 'Difficulty Update Failed',
        description: 'Could not save difficulty setting'
      })
    } finally {
      setIsOperationLoading(null)
    }
  }

  // Key binding handlers
  const startKeyBinding = (action: string) => {
    setKeyBinding({ action, isListening: true })
    addToast({
      type: 'info',
      title: 'Press a Key',
      description: `Press any key to bind to ${CONTROL_LABELS[action as keyof typeof CONTROL_LABELS]}`,
      duration: 10000
    })
  }

  const handleKeyPress = async (event: KeyboardEvent) => {
    if (!keyBinding.isListening || !keyBinding.action) return

    event.preventDefault()
    const key = event.code || event.key

    try {
      const isValid = await Effect.runPromise(
        SettingsOperations.validateKeyBinding(key)
      )

      if (isValid) {
        const newControls = { ...settings.controls, [keyBinding.action]: key }
        const newSettings = { ...settings, controls: newControls }
        setSettings(newSettings)
        setHasChanges(true)

        const settingsService = await Effect.runPromise(
          SettingsService.pipe(Effect.provide(SettingsRuntime))
        )
        await Effect.runPromise(
          settingsService.updateControlBinding(keyBinding.action, key)
        )
        
        addToast({
          type: 'success',
          title: 'Key Bound Successfully',
          description: `${CONTROL_LABELS[keyBinding.action as keyof typeof CONTROL_LABELS]} → ${key}`,
          duration: 3000
        })
      } else {
        addToast({
          type: 'warning',
          title: 'Invalid Key',
          description: 'This key is reserved or invalid',
          duration: 3000
        })
      }
    } catch (error) {
      console.error('Failed to update key binding:', error)
      addToast({
        type: 'error',
        title: 'Key Binding Failed',
        description: 'Could not save control binding'
      })
    }

    setKeyBinding({ action: null, isListening: false })
  }

  // Export/Import handlers
  const handleExport = async () => {
    try {
      setIsOperationLoading('export')
      const settingsService = await Effect.runPromise(
        SettingsService.pipe(Effect.provide(SettingsRuntime))
      )
      const exported = await Effect.runPromise(
        settingsService.exportSettings()
      )
      setExportData(exported)
      addToast({
        type: 'success',
        title: 'Settings Exported',
        description: 'Copy the JSON below to backup your settings',
        duration: 5000
      })
    } catch (error) {
      console.error('Failed to export settings:', error)
      addToast({
        type: 'error',
        title: 'Export Failed',
        description: 'Could not export settings'
      })
    } finally {
      setIsOperationLoading(null)
    }
  }

  const handleImport = async () => {
    if (!exportData.trim()) {
      addToast({
        type: 'warning',
        title: 'No Data to Import',
        description: 'Please paste settings JSON first'
      })
      return
    }

    try {
      setIsOperationLoading('import')
      const settingsService = await Effect.runPromise(
        SettingsService.pipe(Effect.provide(SettingsRuntime))
      )
      await Effect.runPromise(
        settingsService.importSettings(exportData)
      )
      addToast({
        type: 'success',
        title: 'Settings Imported',
        description: 'Page will reload to apply new settings',
        duration: 3000
      })
      // Reload settings after a brief delay
      setTimeout(() => window.location.reload(), 2000)
    } catch (error) {
      console.error('Failed to import settings:', error)
      addToast({
        type: 'error',
        title: 'Import Failed',
        description: 'Invalid settings format or data'
      })
    } finally {
      setIsOperationLoading(null)
    }
  }

  const handleReset = async () => {
    try {
      setIsOperationLoading('reset')
      const settingsService = await Effect.runPromise(
        SettingsService.pipe(Effect.provide(SettingsRuntime))
      )
      await Effect.runPromise(
        settingsService.resetToDefaults()
      )
      setSettings(DEFAULT_SETTINGS)
      setHasChanges(false)
      addToast({
        type: 'success',
        title: 'Settings Reset',
        description: 'All settings restored to defaults',
        duration: 3000
      })
    } catch (error) {
      console.error('Failed to reset settings:', error)
      addToast({
        type: 'error',
        title: 'Reset Failed',
        description: 'Could not reset settings'
      })
    } finally {
      setIsOperationLoading(null)
    }
  }

  // Add key listener for key binding
  useEffect(() => {
    if (keyBinding.isListening) {
      document.addEventListener('keydown', handleKeyPress)
      return () => document.removeEventListener('keydown', handleKeyPress)
    }
  }, [keyBinding])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-black via-blue-900 to-purple-900">
        <motion.div 
          className="text-center space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
            Loading Settings...
          </div>
          <LoadingSpinner size="lg" />
          <p className="text-gray-300">Restoring your preferences</p>
        </motion.div>
      </div>
    )
  }

  const tabs = [
    { id: 'audio', label: 'Audio', icon: '🔊' },
    { id: 'controls', label: 'Controls', icon: '🎮' },
    { id: 'difficulty', label: 'Difficulty', icon: '⚔️' },
    { id: 'advanced', label: 'Advanced', icon: '⚙️' },
  ] as const

  return (
    <div 
      className="min-h-screen text-white"
      style={{
        backgroundImage: 'url(/page-bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
        backgroundColor: '#000000' // Fallback color
      }}
    >
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-2">
            SETTINGS
          </h1>
          <p className="text-gray-300">Customize your gaming experience</p>
        </motion.div>

        {/* Navigation Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center mb-8"
        >
          <div className="flex space-x-1 bg-black/50 rounded-lg p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                disabled={isOperationLoading !== null}
                className={`px-6 py-3 rounded-md transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="bg-black/30 rounded-lg p-8 backdrop-blur-sm border border-gray-700"
          >
            {/* Audio Settings */}
            {activeTab === 'audio' && (
              <div className="space-y-8">
                <h2 className="text-2xl font-bold text-cyan-400 mb-6">Audio Settings</h2>
                
                <div className="grid gap-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-foreground">Master Volume</span>
                      <div className="flex items-center space-x-2">
                        {isOperationLoading === 'master-volume' && <LoadingSpinner size="sm" />}
                        <span className="text-sm text-muted-foreground">{Math.round(settings.audio.masterVolume * 100)}%</span>
                      </div>
                    </div>
                    <Slider
                      value={[Math.round(settings.audio.masterVolume * 100)]}
                      onValueChange={(value) => handleVolumeChange('master', value[0])}
                      min={0}
                      max={100}
                      step={1}
                      disabled={isOperationLoading === 'master-volume'}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-foreground">Music Volume</span>
                      <div className="flex items-center space-x-2">
                        {isOperationLoading === 'music-volume' && <LoadingSpinner size="sm" />}
                        <span className="text-sm text-muted-foreground">{Math.round(settings.audio.musicVolume * 100)}%</span>
                      </div>
                    </div>
                    <Slider
                      value={[Math.round(settings.audio.musicVolume * 100)]}
                      onValueChange={(value) => handleVolumeChange('music', value[0])}
                      min={0}
                      max={100}
                      step={1}
                      disabled={isOperationLoading === 'music-volume'}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-foreground">Sound Effects Volume</span>
                      <div className="flex items-center space-x-2">
                        {isOperationLoading === 'sfx-volume' && <LoadingSpinner size="sm" />}
                        <span className="text-sm text-muted-foreground">{Math.round(settings.audio.sfxVolume * 100)}%</span>
                      </div>
                    </div>
                    <Slider
                      value={[Math.round(settings.audio.sfxVolume * 100)]}
                      onValueChange={(value) => handleVolumeChange('sfx', value[0])}
                      min={0}
                      max={100}
                      step={1}
                      disabled={isOperationLoading === 'sfx-volume'}
                    />
                  </div>

                  <div className="flex items-center justify-between space-x-4">
                    <div className="space-y-0.5">
                      <label className="text-sm font-medium text-foreground cursor-pointer">
                        Mute All Audio
                      </label>
                      <p className="text-xs text-muted-foreground">Disable all game sounds</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {isOperationLoading === 'mute' && <LoadingSpinner size="sm" />}
                      <Switch
                        checked={settings.audio.muted}
                        onCheckedChange={handleMuteToggle}
                        disabled={isOperationLoading === 'mute'}
                      />
                    </div>
                  </div>

                  <div className="pt-4">
                    <SoundToggle className="mx-auto" />
                  </div>
                </div>
              </div>
            )}

            {/* Controls Settings */}
            {activeTab === 'controls' && (
              <div className="space-y-8">
                <h2 className="text-2xl font-bold text-cyan-400 mb-6">Control Settings</h2>
                
                <div className="grid gap-4">
                  {Object.entries(CONTROL_LABELS).map(([action, label]) => (
                    <div key={action} className="flex items-center justify-between p-4 bg-black/20 rounded-lg">
                      <span className="font-medium">{label}</span>
                      <Button
                        variant={keyBinding.action === action && keyBinding.isListening ? "destructive" : "outline"}
                        onClick={() => startKeyBinding(action)}
                        className="min-w-[120px]"
                        disabled={keyBinding.isListening && keyBinding.action !== action}
                      >
                        {keyBinding.action === action && keyBinding.isListening
                          ? "Press key..."
                          : settings.controls[action] || "Not set"
                        }
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-blue-900/20 rounded-lg border border-blue-500/30">
                  <p className="text-sm text-blue-200">
                    💡 <strong>Tip:</strong> Click on any control button to rebind it. System keys like F5, F11, etc. are reserved.
                  </p>
                </div>
              </div>
            )}

            {/* Difficulty Settings */}
            {activeTab === 'difficulty' && (
              <div className="space-y-8">
                <h2 className="text-2xl font-bold text-cyan-400 mb-6">Difficulty Settings</h2>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Game Difficulty</label>
                  <Select onValueChange={handleDifficultyChange} defaultValue={settings.difficulty} disabled={isOperationLoading === 'difficulty'}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(DIFFICULTY_CONFIGS).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isOperationLoading === 'difficulty' && (
                    <div className="flex items-center space-x-2 text-sm text-gray-400">
                      <LoadingSpinner size="sm" />
                      <span>Updating difficulty...</span>
                    </div>
                  )}
                </div>

                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-4">Current Difficulty: {DIFFICULTY_CONFIGS[settings.difficulty].label}</h3>
                  <div className="bg-black/20 rounded-lg p-6">
                    <p className="text-gray-300 mb-4">{DIFFICULTY_CONFIGS[settings.difficulty].description}</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-cyan-400 font-medium">Enemy Speed:</span>
                        <span className="ml-2">{(DIFFICULTY_CONFIGS[settings.difficulty].enemySpeedMultiplier * 100)}%</span>
                      </div>
                      <div>
                        <span className="text-cyan-400 font-medium">Spawn Rate:</span>
                        <span className="ml-2">{(DIFFICULTY_CONFIGS[settings.difficulty].enemySpawnRate * 100)}%</span>
                      </div>
                      <div>
                        <span className="text-cyan-400 font-medium">Player Health:</span>
                        <span className="ml-2">{(DIFFICULTY_CONFIGS[settings.difficulty].playerHealthMultiplier * 100)}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="flex items-center justify-between space-x-4">
                    <div className="space-y-0.5">
                      <label className="text-sm font-medium text-foreground cursor-pointer">
                        Particle Effects
                      </label>
                      <p className="text-xs text-muted-foreground">Enable visual particle effects</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {isOperationLoading === 'particles' && <LoadingSpinner size="sm" />}
                      <Switch
                        checked={settings.graphics.particles}
                        onCheckedChange={() => handleGraphicsToggle('particles')}
                        disabled={isOperationLoading === 'particles'}
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between space-x-4">
                    <div className="space-y-0.5">
                      <label className="text-sm font-medium text-foreground cursor-pointer">
                        Screen Shake
                      </label>
                      <p className="text-xs text-muted-foreground">Enable screen shake on impacts</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {isOperationLoading === 'screenShake' && <LoadingSpinner size="sm" />}
                      <Switch
                        checked={settings.graphics.screenShake}
                        onCheckedChange={() => handleGraphicsToggle('screenShake')}
                        disabled={isOperationLoading === 'screenShake'}
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between space-x-4">
                    <div className="space-y-0.5">
                      <label className="text-sm font-medium text-foreground cursor-pointer">
                        VSync
                      </label>
                      <p className="text-xs text-muted-foreground">Enable vertical synchronization</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {isOperationLoading === 'vsync' && <LoadingSpinner size="sm" />}
                      <Switch
                        checked={settings.graphics.vsync}
                        onCheckedChange={() => handleGraphicsToggle('vsync')}
                        disabled={isOperationLoading === 'vsync'}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Advanced Settings */}
            {activeTab === 'advanced' && (
              <div className="space-y-8">
                <h2 className="text-2xl font-bold text-cyan-400 mb-6">Advanced Settings</h2>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Export/Import Settings</h3>
                    <div className="space-y-4">
                      <div className="flex space-x-4">
                        <Button 
                          onClick={handleExport} 
                          variant="outline"
                          disabled={isOperationLoading === 'export'}
                        >
                          {isOperationLoading === 'export' ? <ButtonLoading>Exporting...</ButtonLoading> : 'Export Settings'}
                        </Button>
                        <Button 
                          onClick={handleImport} 
                          variant="outline" 
                          disabled={!exportData.trim() || isOperationLoading === 'import'}
                        >
                          {isOperationLoading === 'import' ? <ButtonLoading>Importing...</ButtonLoading> : 'Import Settings'}
                        </Button>
                      </div>
                      
                      <textarea
                        value={exportData}
                        onChange={(e) => setExportData(e.target.value)}
                        placeholder="Paste settings JSON here to import..."
                        className="w-full h-32 bg-black/20 border border-gray-600 rounded-lg p-3 text-sm font-mono resize-none"
                        disabled={isOperationLoading !== null}
                      />
                    </div>
                  </div>

                  <div className="border-t border-gray-600 pt-6">
                    <h3 className="text-lg font-semibold mb-4 text-red-400">Danger Zone</h3>
                    <Button 
                      onClick={() => {
                        if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
                          handleReset()
                        }
                      }}
                      variant="destructive"
                      disabled={isOperationLoading === 'reset'}
                    >
                      {isOperationLoading === 'reset' ? <ButtonLoading>Resetting...</ButtonLoading> : 'Reset All Settings to Defaults'}
                    </Button>
                    <p className="text-sm text-gray-400 mt-2">
                      This will reset all your customizations and cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Footer Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center mt-8"
        >
          <Button onClick={onBack} variant="outline" size="lg" disabled={isOperationLoading !== null}>
            ← Back to Game
          </Button>
          
          <div className="flex items-center space-x-4">
            {hasChanges && !isOperationLoading && (
              <motion.span 
                className="text-sm text-green-400 flex items-center space-x-1"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <span>✅</span>
                <span>Changes saved automatically</span>
              </motion.span>
            )}
            {isOperationLoading && (
              <div className="flex items-center space-x-2 text-sm text-yellow-400">
                <LoadingSpinner size="sm" />
                <span>Saving...</span>
              </div>
            )}
            {onApply && (
              <Button onClick={() => onApply(settings)} size="lg" disabled={isOperationLoading !== null}>
                Apply & Continue
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

const Settings: React.FC<SettingsProps> = (props) => {
  return (
    <ErrorBoundary fallback={({ error, reset }) => (
      <div 
        className="flex items-center justify-center min-h-screen"
        style={{
          backgroundImage: 'url(/page-bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          imageRendering: 'pixelated',
          backgroundColor: '#000000' // Fallback color
        }}
      >
        <div className="text-center space-y-4 p-8">
          <h1 className="text-4xl font-bold text-red-400">Settings Error</h1>
          <p className="text-gray-300">{error.message}</p>
          <Button onClick={reset} className="bg-red-600 hover:bg-red-700">
            Try Again
          </Button>
        </div>
      </div>
    )}>
      <SettingsContent {...props} />
    </ErrorBoundary>
  )
}

export { Settings }
