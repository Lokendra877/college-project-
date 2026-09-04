import { motion } from 'framer-motion';
import { SaaSLayout } from '@/components/saas/SaaSLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Clock, Mic2, MicOff, SkipForward, PlayCircle, FileText } from 'lucide-react';

const mockQueue = [
  { id: 1, name: 'Rahul Sharma', status: 'speaking', time: '1:23' },
  { id: 2, name: 'Priya Patel', status: 'waiting', time: '-' },
  { id: 3, name: 'Amit Kumar', status: 'waiting', time: '-' },
  { id: 4, name: 'Sneha Gupta', status: 'waiting', time: '-' },
  { id: 5, name: 'Vikram Singh', status: 'done', time: '0:28' },
  { id: 6, name: 'Ananya Desai', status: 'done', time: '0:45' },
];

const mockLogs = [
  { time: '10:05', event: 'Session started' },
  { time: '10:06', event: 'Vikram Singh granted mic' },
  { time: '10:06', event: 'Vikram Singh finished (28s)' },
  { time: '10:07', event: 'Ananya Desai granted mic' },
  { time: '10:08', event: 'Ananya Desai finished (45s)' },
  { time: '10:08', event: 'Rahul Sharma granted mic' },
];

export default function SaaSAdminDemo() {
  return (
    <SaaSLayout>
      <section className="py-8">
        <div className="container mx-auto px-4">
          {/* Demo Banner */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-lg bg-warning/10 border border-warning/30 text-center"
          >
            <p className="text-sm font-medium text-warning">
              This is a demo dashboard for presentation purposes. Data shown is simulated.
            </p>
          </motion.div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-between mb-6"
          >
            <div>
              <h1 className="font-heading text-2xl font-bold">CS101 — Data Structures Lecture</h1>
              <p className="text-sm text-muted-foreground">Admin Dashboard &bull; Live Session</p>
            </div>
            <Button variant="destructive" size="sm">End Session</Button>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left: Current Speaker */}
            <div className="space-y-4">
              <Card className="border-0 shadow-[var(--shadow-md)]">
                <CardHeader>
                  <CardTitle className="font-heading text-lg flex items-center gap-2">
                    <Mic2 className="w-5 h-5 text-primary" /> Active Speaker
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center py-4">
                    <div className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center mx-auto mb-3">
                      <Mic2 className="w-8 h-8 text-success animate-pulse" />
                    </div>
                    <p className="font-heading text-xl font-bold">Rahul Sharma</p>
                    <p className="text-2xl font-mono font-bold text-primary mt-2">1:23</p>
                    <p className="text-xs text-muted-foreground">of 0:30 limit</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <SkipForward className="w-4 h-4 mr-1" /> Skip
                    </Button>
                    <Button variant="destructive" size="sm" className="flex-1">
                      <MicOff className="w-4 h-4 mr-1" /> Revoke
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <Card className="border-0 shadow-[var(--shadow-sm)]">
                  <CardContent className="p-4 text-center">
                    <Users className="w-5 h-5 text-primary mx-auto mb-1" />
                    <p className="font-heading text-2xl font-bold">6</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-[var(--shadow-sm)]">
                  <CardContent className="p-4 text-center">
                    <Clock className="w-5 h-5 text-warning mx-auto mb-1" />
                    <p className="font-heading text-2xl font-bold">3</p>
                    <p className="text-xs text-muted-foreground">Waiting</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Center: Queue */}
            <div>
              <Card className="border-0 shadow-[var(--shadow-md)]">
                <CardHeader>
                  <CardTitle className="font-heading text-lg flex items-center justify-between">
                    Speaker Queue
                    <Button variant="outline" size="sm">
                      <PlayCircle className="w-4 h-4 mr-1" /> Grant Next
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {mockQueue.map(speaker => (
                    <div
                      key={speaker.id}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        speaker.status === 'speaking'
                          ? 'bg-success/10 border border-success/30'
                          : speaker.status === 'done'
                          ? 'bg-muted/30'
                          : 'bg-card'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          speaker.status === 'speaking' ? 'bg-success text-success-foreground' :
                          speaker.status === 'done' ? 'bg-muted text-muted-foreground' :
                          'bg-primary/10 text-primary'
                        }`}>
                          {speaker.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{speaker.name}</p>
                          {speaker.time !== '-' && (
                            <p className="text-xs text-muted-foreground">{speaker.time}</p>
                          )}
                        </div>
                      </div>
                      <Badge variant={
                        speaker.status === 'speaking' ? 'default' :
                        speaker.status === 'done' ? 'secondary' : 'outline'
                      } className="text-[10px] uppercase">
                        {speaker.status}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Right: Logs */}
            <div>
              <Card className="border-0 shadow-[var(--shadow-md)]">
                <CardHeader>
                  <CardTitle className="font-heading text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" /> Session Logs
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {mockLogs.map((log, i) => (
                    <div key={i} className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
                      <span className="font-mono text-xs text-muted-foreground whitespace-nowrap mt-0.5">{log.time}</span>
                      <p className="text-sm">{log.event}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </SaaSLayout>
  );
}
