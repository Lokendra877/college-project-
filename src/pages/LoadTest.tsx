import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Users, Play, Square, BarChart3, Clock, Zap, AlertTriangle } from 'lucide-react';

interface OperationMetric {
  operation: string;
  duration: number;
  success: boolean;
  studentIndex: number;
  timestamp: number;
}

interface TestResults {
  totalStudents: number;
  successCount: number;
  failCount: number;
  metrics: OperationMetric[];
  startTime: number;
  endTime: number;
}

function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)] || 0;
}

export default function LoadTest() {
  const [sessionId, setSessionId] = useState('');
  const [studentCount, setStudentCount] = useState(200);
  const [concurrency, setConcurrency] = useState(20);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<TestResults | null>(null);
  const [liveMetrics, setLiveMetrics] = useState<OperationMetric[]>([]);
  const abortRef = useRef(false);

  const simulateStudent = useCallback(async (index: number): Promise<OperationMetric[]> => {
    const metrics: OperationMetric[] = [];
    const deviceId = `load-test-${Date.now()}-${index}`;
    const studentName = `TestStudent_${index}`;

    // 1. Fetch session (read latency)
    let start = performance.now();
    const { error: sessionErr } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    metrics.push({
      operation: 'fetch_session',
      duration: performance.now() - start,
      success: !sessionErr,
      studentIndex: index,
      timestamp: Date.now(),
    });

    if (sessionErr) return metrics;

    // 2. Get queue count (for position)
    start = performance.now();
    const { count, error: countErr } = await supabase
      .from('speaker_queue')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId);
    metrics.push({
      operation: 'get_queue_count',
      duration: performance.now() - start,
      success: !countErr,
      studentIndex: index,
      timestamp: Date.now(),
    });

    // 3. Join queue (write latency)
    start = performance.now();
    const { error: joinErr } = await supabase
      .from('speaker_queue')
      .insert({
        session_id: sessionId,
        user_name: studentName,
        device_id: deviceId,
        position: (count || 0) + index + 1,
        status: 'waiting',
      });
    metrics.push({
      operation: 'join_queue',
      duration: performance.now() - start,
      success: !joinErr,
      studentIndex: index,
      timestamp: Date.now(),
    });

    // 4. Fetch full queue (read under load)
    start = performance.now();
    const { error: queueErr } = await supabase
      .from('speaker_queue')
      .select('*')
      .eq('session_id', sessionId)
      .order('position', { ascending: true });
    metrics.push({
      operation: 'fetch_queue',
      duration: performance.now() - start,
      success: !queueErr,
      studentIndex: index,
      timestamp: Date.now(),
    });

    // 5. Subscribe to realtime (measure subscription setup time)
    start = performance.now();
    const channel = supabase.channel(`test-${deviceId}`);
    await new Promise<void>((resolve) => {
      channel
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'speaker_queue',
          filter: `session_id=eq.${sessionId}`,
        }, () => {})
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') resolve();
        });
      // Timeout after 5s
      setTimeout(resolve, 5000);
    });
    metrics.push({
      operation: 'realtime_subscribe',
      duration: performance.now() - start,
      success: true,
      studentIndex: index,
      timestamp: Date.now(),
    });

    // Unsubscribe
    supabase.removeChannel(channel);

    return metrics;
  }, [sessionId]);

  const runTest = useCallback(async () => {
    if (!sessionId.trim()) return;
    
    abortRef.current = false;
    setIsRunning(true);
    setProgress(0);
    setResults(null);
    setLiveMetrics([]);

    const allMetrics: OperationMetric[] = [];
    const startTime = Date.now();
    let completed = 0;

    // Run in batches for controlled concurrency
    for (let batch = 0; batch < studentCount; batch += concurrency) {
      if (abortRef.current) break;

      const batchSize = Math.min(concurrency, studentCount - batch);
      const promises = Array.from({ length: batchSize }, (_, i) =>
        simulateStudent(batch + i)
      );

      const batchResults = await Promise.allSettled(promises);

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          allMetrics.push(...result.value);
          setLiveMetrics(prev => [...prev, ...result.value]);
        }
        completed++;
      }

      setProgress(Math.round((completed / studentCount) * 100));
    }

    const endTime = Date.now();

    // Cleanup: remove test entries
    await supabase
      .from('speaker_queue')
      .delete()
      .like('device_id', 'load-test-%');

    setResults({
      totalStudents: studentCount,
      successCount: allMetrics.filter(m => m.success).length,
      failCount: allMetrics.filter(m => !m.success).length,
      metrics: allMetrics,
      startTime,
      endTime,
    });

    setIsRunning(false);
  }, [sessionId, studentCount, concurrency, simulateStudent]);

  const stopTest = () => {
    abortRef.current = true;
  };

  // Compute stats per operation
  const getStats = (opName: string) => {
    const durations = (results?.metrics || liveMetrics)
      .filter(m => m.operation === opName && m.success)
      .map(m => m.duration);
    
    if (durations.length === 0) return null;

    return {
      count: durations.length,
      avg: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      min: Math.round(Math.min(...durations)),
      max: Math.round(Math.max(...durations)),
      p50: Math.round(percentile(durations, 50)),
      p95: Math.round(percentile(durations, 95)),
      p99: Math.round(percentile(durations, 99)),
    };
  };

  const operations = ['fetch_session', 'get_queue_count', 'join_queue', 'fetch_queue', 'realtime_subscribe'];
  const opLabels: Record<string, string> = {
    fetch_session: 'Fetch Session',
    get_queue_count: 'Get Queue Count',
    join_queue: 'Join Queue (Write)',
    fetch_queue: 'Fetch Full Queue',
    realtime_subscribe: 'Realtime Subscribe',
  };

  const totalDuration = results ? ((results.endTime - results.startTime) / 1000).toFixed(1) : null;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Load Test — 200 Student Simulation</h1>
        </div>

        {/* Config */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Test Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Session ID</label>
                <Input
                  value={sessionId}
                  onChange={e => setSessionId(e.target.value)}
                  placeholder="Paste session ID here"
                  disabled={isRunning}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Number of Students</label>
                <Input
                  type="number"
                  value={studentCount}
                  onChange={e => setStudentCount(Number(e.target.value))}
                  min={1}
                  max={1000}
                  disabled={isRunning}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Concurrency (batch size)</label>
                <Input
                  type="number"
                  value={concurrency}
                  onChange={e => setConcurrency(Number(e.target.value))}
                  min={1}
                  max={100}
                  disabled={isRunning}
                />
              </div>
            </div>

            <div className="flex gap-3">
              {!isRunning ? (
                <Button onClick={runTest} disabled={!sessionId.trim()} className="gap-2">
                  <Play className="w-4 h-4" /> Start Load Test
                </Button>
              ) : (
                <Button onClick={stopTest} variant="destructive" className="gap-2">
                  <Square className="w-4 h-4" /> Stop Test
                </Button>
              )}
            </div>

            {isRunning && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Simulating students...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary */}
        {(results || liveMetrics.length > 0) && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold text-foreground">{results?.totalStudents || studentCount}</p>
                <p className="text-sm text-muted-foreground">Total Students</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Zap className="w-6 h-6 mx-auto mb-2 text-success" />
                <p className="text-2xl font-bold text-success">{results?.successCount || liveMetrics.filter(m => m.success).length}</p>
                <p className="text-sm text-muted-foreground">Successful Ops</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-destructive" />
                <p className="text-2xl font-bold text-destructive">{results?.failCount || liveMetrics.filter(m => !m.success).length}</p>
                <p className="text-sm text-muted-foreground">Failed Ops</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Clock className="w-6 h-6 mx-auto mb-2 text-accent-foreground" />
                <p className="text-2xl font-bold text-foreground">{totalDuration || '...'}</p>
                <p className="text-sm text-muted-foreground">Total Duration (s)</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Detailed Metrics Table */}
        {(results || liveMetrics.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle>Response Time Breakdown (ms)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium">Operation</th>
                      <th className="text-right py-3 px-4 text-muted-foreground font-medium">Count</th>
                      <th className="text-right py-3 px-4 text-muted-foreground font-medium">Avg</th>
                      <th className="text-right py-3 px-4 text-muted-foreground font-medium">Min</th>
                      <th className="text-right py-3 px-4 text-muted-foreground font-medium">Max</th>
                      <th className="text-right py-3 px-4 text-muted-foreground font-medium">P50</th>
                      <th className="text-right py-3 px-4 text-muted-foreground font-medium">P95</th>
                      <th className="text-right py-3 px-4 text-muted-foreground font-medium">P99</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operations.map(op => {
                      const stats = getStats(op);
                      if (!stats) return null;
                      return (
                        <tr key={op} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="py-3 px-4 font-medium text-foreground">
                            {opLabels[op]}
                            {op === 'join_queue' && <Badge variant="outline" className="ml-2 text-xs">Write</Badge>}
                            {op === 'realtime_subscribe' && <Badge variant="outline" className="ml-2 text-xs">WS</Badge>}
                          </td>
                          <td className="text-right py-3 px-4 text-muted-foreground">{stats.count}</td>
                          <td className="text-right py-3 px-4 font-mono text-foreground">{stats.avg}</td>
                          <td className="text-right py-3 px-4 font-mono text-success">{stats.min}</td>
                          <td className="text-right py-3 px-4 font-mono text-destructive">{stats.max}</td>
                          <td className="text-right py-3 px-4 font-mono text-foreground">{stats.p50}</td>
                          <td className="text-right py-3 px-4 font-mono text-warning">{stats.p95}</td>
                          <td className="text-right py-3 px-4 font-mono text-destructive">{stats.p99}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Throughput */}
        {results && (
          <Card>
            <CardHeader>
              <CardTitle>Throughput Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground">Students / Second</p>
                  <p className="text-2xl font-bold text-foreground">
                    {(results.totalStudents / ((results.endTime - results.startTime) / 1000)).toFixed(1)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Operations / Second</p>
                  <p className="text-2xl font-bold text-foreground">
                    {(results.metrics.length / ((results.endTime - results.startTime) / 1000)).toFixed(1)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Error Rate</p>
                  <p className={`text-2xl font-bold ${results.failCount > 0 ? 'text-destructive' : 'text-success'}`}>
                    {results.metrics.length > 0 ? ((results.failCount / results.metrics.length) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
