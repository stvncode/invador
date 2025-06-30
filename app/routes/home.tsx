import React, { useEffect, useState } from 'react'
import type { Route } from "./+types/home"

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Space Invaders" },
    { name: "description", content: "A modern Space Invaders game built with React and Effect-TS" },
  ];
}

export default function Home() {
  const [GameComponent, setGameComponent] = useState<React.ComponentType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Dynamically import the Game component only on the client side
    import("../components/Game").then((module) => {
      setGameComponent(() => module.Game);
      setIsLoading(false);
    }).catch((error) => {
      console.error("Failed to load Game component:", error);
      setIsLoading(false);
    });
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-black via-blue-900 to-purple-900">
        <div className="text-center space-y-4">
          <div className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
            SPACE INVADERS
          </div>
          <div className="text-xl text-gray-300">Loading...</div>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!GameComponent) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-red-900 via-black to-purple-900">
        <div className="text-center space-y-4">
          <div className="text-4xl font-bold text-red-400">Error Loading Game</div>
          <div className="text-gray-300">Please refresh the page to try again.</div>
        </div>
      </div>
    );
  }

  return <GameComponent />;
}