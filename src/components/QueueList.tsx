import type { Tables } from '@/integrations/supabase/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Clock, User, X, SkipForward, Mail, Shield, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

type QueueEntry = Tables<'speaker_queue'>;

interface QueueListProps {
  queue: QueueEntry[];
  currentDeviceId?: string;
  isAdmin?: boolean;
  isModerator?: boolean;
  onSkip?: (id: string) => void;
  onRemove?: (id: string) => void;
  onPromoteModerator?: (id: string) => void;
  onGrantNext?: () => void;
  onGrantMic?: (id: string) => void;
}

export function QueueList({ queue, currentDeviceId, isAdmin, isModerator, onSkip, onRemove, onPromoteModerator, onGrantNext, onGrantMic }: QueueListProps) {
  const showControls = isAdmin || isModerator;

  if (queue.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <User className="w-10 h-10 mb-2 opacity-40" />
        <p className="text-sm">No speakers in queue</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <AnimatePresence mode="popLayout">
        {queue.map((entry, index) => {
          const isSpeaking = entry.status === 'speaking';
          const isMe = entry.device_id === currentDeviceId;
          const entryIsModerator = (entry as any).is_moderator === true;

          return (
            <motion.div
              key={entry.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all ${
                isSpeaking
                  ? 'bg-success/10 border-2 border-success/30'
                  : isMe
                  ? 'bg-primary/5 border-2 border-primary/20'
                  : 'bg-muted/30 border border-border'
              }`}
            >
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${
                isSpeaking ? 'gradient-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {isSpeaking ? <Mic className="w-4 h-4" /> : index + 1}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {entry.user_name}
                  {isMe && <span className="ml-1 text-xs text-primary">(You)</span>}
                  {entryIsModerator && (
                    <span className="ml-1 text-xs text-accent inline-flex items-center gap-0.5">
                      <Shield className="w-3 h-3" /> Moderator
                    </span>
                  )}
                </p>
                {isAdmin && entry.user_email && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                    <Mail className="w-3 h-3 shrink-0" />
                    {entry.user_email}
                  </p>
                )}
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {isSpeaking ? <span className="text-success">Speaking now</span> : `Position #${index + 1}`}
                </p>
              </div>

              {showControls && (
                <div className="flex gap-1">
                  {isAdmin && !entryIsModerator && onPromoteModerator && (
                    <Button variant="ghost" size="icon" onClick={() => onPromoteModerator(entry.id)} className="h-8 w-8 text-accent hover:bg-accent/10" title="Promote to Moderator">
                      <Shield className="w-4 h-4" />
                    </Button>
                  )}
                  {!isSpeaking && entry.status === 'waiting' && onGrantMic && (
                    <Button variant="ghost" size="icon" onClick={() => onGrantMic(entry.id)} className="h-8 w-8 text-success hover:bg-success/10" title="Grant Mic">
                      <PlayCircle className="w-4 h-4" />
                    </Button>
                  )}
                  {isSpeaking && onSkip && (
                    <Button variant="ghost" size="icon" onClick={() => onSkip(entry.id)} className="h-8 w-8 text-warning hover:bg-warning/10">
                      <SkipForward className="w-4 h-4" />
                    </Button>
                  )}
                  {onRemove && (
                    <Button variant="ghost" size="icon" onClick={() => onRemove(entry.id)} className="h-8 w-8 text-destructive hover:bg-destructive/10">
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
