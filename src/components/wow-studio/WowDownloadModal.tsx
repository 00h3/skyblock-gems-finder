import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { WowAudio } from "./wow-audio";

interface WowDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WowDownloadModal({ isOpen, onClose }: WowDownloadModalProps) {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const totalMB = 58.4;

  useEffect(() => {
    if (!isOpen) {
      setProgress(0);
      setIsFinished(false);
      return;
    }

    const wasInstalled = localStorage.getItem("wow_studio_installed") === "true";
    if (wasInstalled) {
      setProgress(100);
      setIsFinished(true);
      return;
    }

    let current = 0;
    const interval = setInterval(() => {
      current += Math.random() * 8 + 3;
      if (current >= 100) {
        current = 100;
        clearInterval(interval);
        setProgress(100);
        setIsFinished(true);
        localStorage.setItem("wow_studio_installed", "true");
        WowAudio.checkpoint();

        const timeout = setTimeout(() => {
          onClose();
          navigate({ to: "/wow-studio" as never });
        }, 800);
        return () => clearTimeout(timeout);
      } else {
        setProgress(Math.round(current));
      }
    }, 150);

    return () => clearInterval(interval);
  }, [isOpen, navigate, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40">
      <div className="relative w-full max-w-sm rounded-[24px] bg-white dark:bg-[#15171c] p-6 text-zinc-900 dark:text-white shadow-xl border border-black/5 dark:border-white/5 font-['Inter',sans-serif]">
        <button
          onClick={onClose}
          className="press absolute top-4 right-4 z-10 grid h-8 w-8 place-items-center rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-colors text-zinc-500 dark:text-zinc-400"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#fa4616] shrink-0">
            <img
              src="/icons/arrow-right-1-svgrepo-com.svg"
              className="h-6 w-6 invert"
              alt="WoW 1.0"
            />
          </div>
          <div>
            <h3 className="text-[18px] font-bold">WoW Studio 1.0</h3>
            <p className="text-[13px] text-zinc-500 dark:text-zinc-400">Voxel Engine Beta</p>
          </div>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div
            className="h-full bg-[#fa4616] transition-all duration-150 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mt-3 flex items-center justify-between text-[13px] font-medium text-zinc-500 dark:text-zinc-400">
          <span>
            {Number(((progress / 100) * totalMB).toFixed(1))} MB / {totalMB} MB
          </span>
          <span>{progress}%</span>
        </div>

        {isFinished && (
          <button
            onClick={() => {
              WowAudio.playStart();
              onClose();
              navigate({ to: "/wow-studio" as never });
            }}
            className="press mt-6 w-full rounded-[16px] bg-[#fa4616] py-3.5 text-[14px] font-bold text-white transition-colors hover:bg-[#e03a0f]"
          >
            Launch WoW 1.0
          </button>
        )}
      </div>
    </div>
  );
}
