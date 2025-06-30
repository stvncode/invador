import { Button } from '../components/ui/button'
import type { Route } from "./+types/settings"

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Settings - Space Invaders" },
    { name: "description", content: "Customize your Space Invaders gaming experience" },
  ]
}

export default function SettingsRoute() {
  const handleBack = () => {
    window.history.back()
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-blue-900 to-purple-900 text-white flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-cyan-400">Settings</h1>
        <p className="text-gray-300">Settings page is loading...</p>
        <Button onClick={handleBack} variant="outline">
          ← Back to Game
        </Button>
      </div>
    </div>
  )
} 