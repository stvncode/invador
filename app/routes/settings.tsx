import { Settings } from '../components/Settings'
import type { Route } from "./+types/settings"

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Settings - Space Invaders" },
    { name: "description", content: "Customize your Space Invaders gaming experience" },
  ]
}

export default function SettingsRoute() {
  const handleBack = () => {
    window.location.href = '/'
  }

  return (
    <div 
      className="min-h-screen text-white"
      style={{
        backgroundImage: 'url(/page-bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
        backgroundColor: '#000000'
      }}
    >
      <Settings onBack={handleBack} />
    </div>
  )
} 