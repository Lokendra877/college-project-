import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Clock, Mic2, SkipForward, Timer, TrendingUp, Users } from 'lucide-react';
import type { SessionAnalytics } from '@/hooks/useSessionAnalytics';

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

interface AnalyticsPanelProps {
  analytics: SessionAnalytics;
}

export function AnalyticsPanel({ analytics }: AnalyticsPanelProps) {
  const stats = [
    { label: 'Total Speakers', value: analytics.totalSpeakers, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Completed', value: analytics.completedSpeakers, icon: Mic2, color: 'text-success', bg: 'bg-success/10' },
    { label: 'Skipped', value: analytics.skippedSpeakers, icon: SkipForward, color: 'text-warning', bg: 'bg-warning/10' },
    { label: 'Waiting', value: analytics.waitingSpeakers, icon: Clock, color: 'text-accent', bg: 'bg-accent/10' },
  ];

  const timeStats = [
    { label: 'Avg Speaking Time', value: formatDuration(analytics.averageSpeakingTime), icon: TrendingUp },
    { label: 'Total Speaking Time', value: formatDuration(analytics.totalSpeakingTime), icon: Timer },
    { label: 'Session Duration', value: formatDuration(analytics.sessionDuration), icon: BarChart3 },
  ];

  const total = analytics.completedSpeakers + analytics.skippedSpeakers + analytics.waitingSpeakers;
  const completedPct = total > 0 ? (analytics.completedSpeakers / total) * 100 : 0;
  const skippedPct = total > 0 ? (analytics.skippedSpeakers / total) * 100 : 0;
  const waitingPct = total > 0 ? (analytics.waitingSpeakers / total) * 100 : 0;

  const recentSpeakers = analytics.speakerLog.filter(e => e.status === 'done' || e.status === 'skipped').slice(-5).reverse();

  return (
    <Card className="shadow-sm border">
      <CardHeader className="pb-3">
        <CardTitle className="font-heading text-lg flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Session Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-2">
          {stats.map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`${stat.bg} rounded-xl p-3 text-center`}>
              <stat.icon className={`w-4 h-4 ${stat.color} mx-auto mb-1`} />
              <p className="font-heading text-xl font-bold">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {total > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground font-medium">Participation Breakdown</p>
            <div className="flex h-3 rounded-full overflow-hidden bg-muted">
              {completedPct > 0 && <motion.div className="bg-success h-full" initial={{ width: 0 }} animate={{ width: `${completedPct}%` }} transition={{ duration: 0.6 }} />}
              {skippedPct > 0 && <motion.div className="bg-warning h-full" initial={{ width: 0 }} animate={{ width: `${skippedPct}%` }} transition={{ duration: 0.6, delay: 0.1 }} />}
              {waitingPct > 0 && <motion.div className="bg-accent h-full" initial={{ width: 0 }} animate={{ width: `${waitingPct}%` }} transition={{ duration: 0.6, delay: 0.2 }} />}
            </div>
            <div className="flex gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success inline-block" /> Completed</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warning inline-block" /> Skipped</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent inline-block" /> Waiting</span>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {timeStats.map((stat) => (
            <div key={stat.label} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
              <span className="flex items-center gap-2 text-xs text-muted-foreground"><stat.icon className="w-3.5 h-3.5" />{stat.label}</span>
              <span className="font-heading text-sm font-semibold">{stat.value}</span>
            </div>
          ))}
        </div>

        {recentSpeakers.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground font-medium">Recent Speakers</p>
            <div className="space-y-1">
              {recentSpeakers.map((entry) => {
                const duration = entry.started_speaking_at && entry.finished_speaking_at
                  ? Math.round((new Date(entry.finished_speaking_at).getTime() - new Date(entry.started_speaking_at).getTime()) / 1000) : 0;
                return (
                  <div key={entry.id} className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg bg-muted/50">
                    <span className="font-medium truncate max-w-[120px]">{entry.user_name}</span>
                    <div className="flex items-center gap-2">
                      {duration > 0 && <span className="text-muted-foreground">{duration}s</span>}
                      <span className={`text-[10px] uppercase font-semibold ${entry.status === 'done' ? 'text-success' : 'text-warning'}`}>{entry.status}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}