import { Mic, MicOff } from 'lucide-react';
import { motion } from 'framer-motion';

interface MicStatusProps {
  isActive: boolean;
  speakerName?: string;
}

export function MicStatus({ isActive, speakerName }: MicStatusProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        {isActive && (
          <motion.div
            className="absolute inset-0 rounded-full bg-success/30"
            animate={{ scale: [1, 1.6, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
        <div className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full ${
          isActive ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'
        }`}>
          {isActive ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </div>
      </div>
      <div>
        <p className={`font-heading font-semibold text-sm ${isActive ? 'text-success' : 'text-muted-foreground'}`}>
          {isActive ? 'Microphone Active' : 'Microphone Inactive'}
        </p>
        {speakerName && isActive && (
          <p className="text-xs text-muted-foreground">{speakerName} is speaking</p>
        )}
      </div>
    </div>
  );
}