import { Volume2, VolumeX, Mic, MicOff, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface AudioStatusProps {
  isSpeaker: boolean;
  isStreaming: boolean;
  isReceiving: boolean;
  micError: string | null;
}

export function AudioStatus({ isSpeaker, isStreaming, isReceiving, micError }: AudioStatusProps) {
  if (micError) {
    return (
      <div className="flex items-center gap-2 text-destructive text-xs bg-destructive/10 rounded-lg px-3 py-2">
        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
        <span>Mic error: {micError}</span>
      </div>
    );
  }

  if (isSpeaker && isStreaming) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 text-success text-xs bg-success/10 rounded-lg px-3 py-2"
      >
        <Mic className="w-3.5 h-3.5 shrink-0" />
        <span>Your microphone is live — audio is being streamed</span>
        <motion.div
          className="w-2 h-2 rounded-full bg-success"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      </motion.div>
    );
  }

  if (!isSpeaker && isReceiving) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 text-primary text-xs bg-primary/10 rounded-lg px-3 py-2"
      >
        <Volume2 className="w-3.5 h-3.5 shrink-0" />
        <span>Listening to speaker audio</span>
        <motion.div
          className="w-2 h-2 rounded-full bg-primary"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      </motion.div>
    );
  }

  return null;
}
