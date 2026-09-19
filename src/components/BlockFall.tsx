import { useEffect, useState, useRef } from "react";
import { MobileShell } from "@/components/MobileShell";
import { Button } from "@/components/ui/button";

export function BlockFall() {
  const [gameState, setGameState] = useState<"lobby" | "countdown" | "playing">("lobby");
  const [playerCount, setPlayerCount] = useState(1);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (gameState === "countdown") {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setGameState("playing");
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameState]);

  return (
    <MobileShell>
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        {gameState === "lobby" && (
          <div className="space-y-4">
            <h1 className="text-3xl font-black">Welcome to Block Fall</h1>
            <p className="text-xl">Waiting for players to join...</p>
            <div className="flex gap-2">
              <Button onClick={() => setGameState("countdown")}>Join Game</Button>
            </div>
          </div>
        )}
        {gameState === "countdown" && (
          <div className="space-y-4">
            <h1 className="text-3xl font-black">Starting with {playerCount} player{playerCount > 1 ? 's' : ''}</h1>
            <p className="text-5xl font-black">{countdown}</p>
          </div>
        )}
        {gameState === "playing" && (
          <div className="text-2xl font-black">Game in progress...</div>
        )}
      </div>
    </MobileShell>
  );
}
