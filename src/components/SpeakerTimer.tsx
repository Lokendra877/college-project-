import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface SpeakerTimerProps {
  totalSeconds: number;
  startedAt: string | null;
  onTimeUp?: () => void;
}

export function SpeakerTimer({ totalSeconds, startedAt, onTimeUp }: SpeakerTimerProps) {
  const [remaining, setRemaining] = useState(totalSeconds);

  useEffect(() => {
    if (!startedAt) {
      setRemaining(totalSeconds);
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
      const left = Math.max(0, totalSeconds - elapsed);
      setRemaining(left);

      if (left === 0) {
        clearInterval(interval);
        onTimeUp?.();
      }
    }, 200);

    return () => clearInterval(interval);
  }, [startedAt, totalSeconds, onTimeUp]);

  const progress = startedAt ? remaining / totalSeconds : 1;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  const isUrgent = remaining <= 5 && remaining > 0;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-28 h-28">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50" cy="50" r="42"
            className="fill-none stroke-muted"
            strokeWidth="6"
          />
          <motion.circle
            cx="50" cy="50" r="42"
            className={`fill-none ${isUrgent ? 'stroke-destructive' : 'stroke-primary'}`}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 42}`}
            animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - progress) }}
            transition={{ duration: 0.3 }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-heading text-2xl font-bold ${isUrgent ? 'text-destructive' : 'text-foreground'}`}>
            {minutes}:{seconds.toString().padStart(2, '0')}
          </span>
        </div>
      </div>
    </div>
  );
}
