import { useRef, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, BarChart3, Sliders, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface AudioVisualizerProps {
  analyserNode: AnalyserNode | null;
  isReceiving: boolean;
}

type VisualizerMode = 'spectrum' | 'waveform' | 'balance';

interface BalanceMetrics {
  bass: number;
  body: number;
  presence: number;
  peakLevel: number;
  isClipping: boolean;
  isFeedbackRisk: boolean;
}

export function AudioVisualizer({ analyserNode, isReceiving }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const [mode, setMode] = useState<VisualizerMode>('spectrum');
  const [metrics, setMetrics] = useState<BalanceMetrics>({
    bass: 0,
    body: 0,
    presence: 0,
    peakLevel: 0,
    isClipping: false,
    isFeedbackRisk: false,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyserNode || !isReceiving) {
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          drawIdleState(ctx, canvas.width, canvas.height);
        }
      }
      setMetrics({
        bass: 0,
        body: 0,
        presence: 0,
        peakLevel: 0,
        isClipping: false,
        isFeedbackRisk: false,
      });
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyserNode.frequencyBinCount;
    const freqData = new Uint8Array(bufferLength);
    const timeData = new Uint8Array(analyserNode.fftSize);

    let frameCount = 0;

    const draw = () => {
      if (!canvasRef.current || !analyserNode) return;

      const width = canvasRef.current.width;
      const height = canvasRef.current.height;

      analyserNode.getByteFrequencyData(freqData);
      analyserNode.getByteTimeDomainData(timeData);

      if (frameCount % 3 === 0) {
        let bassSum = 0, bassCount = 0;
        let bodySum = 0, bodyCount = 0;
        let presSum = 0, presCount = 0;
        let maxPeak = 0;

        for (let i = 0; i < Math.min(65, bufferLength); i++) {
          const val = freqData[i];
          if (val > maxPeak) maxPeak = val;

          if (i >= 1 && i <= 5) {
            bassSum += val;
            bassCount++;
          } else if (i >= 6 && i <= 25) {
            bodySum += val;
            bodyCount++;
          } else if (i >= 26 && i <= 60) {
            presSum += val;
            presCount++;
          }
        }

        const avgBass = bassCount ? Math.round((bassSum / bassCount) / 2.55) : 0;
        const avgBody = bodyCount ? Math.round((bodySum / bodyCount) / 2.55) : 0;
        const avgPres = presCount ? Math.round((presSum / presCount) / 2.55) : 0;
        const peakVal = Math.round(maxPeak / 2.55);

        const isFeedbackRisk = maxPeak > 235 && avgBody < 35;
        const isClipping = maxPeak >= 250;

        setMetrics({
          bass: avgBass,
          body: avgBody,
          presence: avgPres,
          peakLevel: peakVal,
          isClipping,
          isFeedbackRisk,
        });
      }

      frameCount++;

      if (mode === 'spectrum') {
        drawSpectrum(ctx, freqData, width, height);
      } else if (mode === 'waveform') {
        drawWaveform(ctx, timeData, width, height);
      } else {
        drawBalanceMeter(ctx, freqData, width, height);
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [analyserNode, isReceiving, mode]);

  return (
    <Card className="border border-border/60 bg-card/60 backdrop-blur-sm shadow-sm overflow-hidden">
      <CardHeader className="p-3.5 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Activity className="w-3.5 h-3.5" />
            </div>
            <div>
              <CardTitle className="font-heading text-xs font-semibold text-foreground">
                Audio Visualizer & Balance Studio
              </CardTitle>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg border border-border/40">
            <Button
              variant={mode === 'spectrum' ? 'default' : 'ghost'}
              size="sm"
              className="h-6 text-[10px] px-2 rounded-md font-medium"
              onClick={() => setMode('spectrum')}
            >
              <BarChart3 className="w-3 h-3 mr-1" /> Spectrum
            </Button>
            <Button
              variant={mode === 'waveform' ? 'default' : 'ghost'}
              size="sm"
              className="h-6 text-[10px] px-2 rounded-md font-medium"
              onClick={() => setMode('waveform')}
            >
              <Activity className="w-3 h-3 mr-1" /> Waveform
            </Button>
            <Button
              variant={mode === 'balance' ? 'default' : 'ghost'}
              size="sm"
              className="h-6 text-[10px] px-2 rounded-md font-medium"
              onClick={() => setMode('balance')}
            >
              <Sliders className="w-3 h-3 mr-1" /> Balance VU
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3.5 pt-1 space-y-2.5">
        <div className="rounded-xl overflow-hidden bg-background/90 border border-border/70 relative shadow-inner">
          <canvas
            ref={canvasRef}
            width={440}
            height={115}
            className="w-full h-[115px] block"
          />

          {isReceiving && (
            <div className="absolute top-2 right-2 flex items-center gap-1.5">
              {metrics.isClipping ? (
                <span className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground animate-pulse shadow-sm">
                  <ShieldAlert className="w-2.5 h-2.5" /> CLIPPING
                </span>
              ) : metrics.isFeedbackRisk ? (
                <span className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white animate-pulse shadow-sm">
                  <ShieldAlert className="w-2.5 h-2.5" /> FEEDBACK RISK
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[9px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Echo Guard OK
                </span>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-4 gap-2 pt-0.5">
          <div className="rounded-lg bg-muted/30 border border-border/40 p-2 text-center">
            <span className="text-[10px] text-muted-foreground block font-medium">Warmth (Bass)</span>
            <span className="font-heading text-xs font-bold text-foreground">
              {isReceiving ? `${metrics.bass}%` : '--'}
            </span>
            <div className="w-full h-1 bg-muted rounded-full mt-1 overflow-hidden">
              <div
                className="h-full bg-sky-500 transition-all duration-150"
                style={{ width: `${metrics.bass}%` }}
              />
            </div>
          </div>

          <div className="rounded-lg bg-muted/30 border border-border/40 p-2 text-center">
            <span className="text-[10px] text-muted-foreground block font-medium">Body (Voice)</span>
            <span className="font-heading text-xs font-bold text-primary">
              {isReceiving ? `${metrics.body}%` : '--'}
            </span>
            <div className="w-full h-1 bg-muted rounded-full mt-1 overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-150"
                style={{ width: `${metrics.body}%` }}
              />
            </div>
          </div>

          <div className="rounded-lg bg-muted/30 border border-border/40 p-2 text-center">
            <span className="text-[10px] text-muted-foreground block font-medium">Clarity (Treble)</span>
            <span className="font-heading text-xs font-bold text-foreground">
              {isReceiving ? `${metrics.presence}%` : '--'}
            </span>
            <div className="w-full h-1 bg-muted rounded-full mt-1 overflow-hidden">
              <div
                className="h-full bg-violet-500 transition-all duration-150"
                style={{ width: `${metrics.presence}%` }}
              />
            </div>
          </div>

          <div className="rounded-lg bg-muted/30 border border-border/40 p-2 text-center">
            <span className="text-[10px] text-muted-foreground block font-medium">Safety Headroom</span>
            <span
              className={`font-heading text-xs font-bold ${
                metrics.peakLevel > 88
                  ? 'text-destructive'
                  : metrics.peakLevel > 75
                  ? 'text-amber-500'
                  : 'text-emerald-500'
              }`}
            >
              {isReceiving ? `${Math.max(0, 100 - metrics.peakLevel)}%` : '--'}
            </span>
            <div className="w-full h-1 bg-muted rounded-full mt-1 overflow-hidden">
              <div
                className={`h-full transition-all duration-150 ${
                  metrics.peakLevel > 88
                    ? 'bg-destructive'
                    : metrics.peakLevel > 75
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${metrics.peakLevel}%` }}
              />
            </div>
          </div>
        </div>

        {!isReceiving && (
          <p className="text-[11px] text-muted-foreground text-center italic">
            Visualizer activates automatically when audience or speaker audio streams in.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function drawIdleState(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = 'hsl(var(--muted) / 0.1)';
  ctx.fillRect(0, 0, width, height);

  // Draw flat center line
  ctx.strokeStyle = 'hsl(var(--muted-foreground) / 0.2)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(0, height / 2);
  ctx.lineTo(width, height / 2);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawSpectrum(
  ctx: CanvasRenderingContext2D,
  dataArray: Uint8Array,
  width: number,
  height: number
) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = 'rgba(10, 12, 18, 0.85)';
  ctx.fillRect(0, 0, width, height);

  const usableBins = Math.min(dataArray.length, 64);
  const barCount = 44;
  const binsPerBar = Math.max(1, Math.floor(usableBins / barCount));
  const barWidth = Math.max(2, width / barCount - 2);
  const maxBarHeight = height - 12;

  for (let i = 0; i < barCount; i++) {
    let sum = 0;
    const startBin = i * binsPerBar;
    for (let j = 0; j < binsPerBar; j++) {
      sum += dataArray[startBin + j] || 0;
    }
    const avg = sum / binsPerBar;
    const barHeight = Math.max(3, (avg / 255) * maxBarHeight);

    const x = i * (barWidth + 2) + 4;
    const y = height - barHeight - 4;

    const gradient = ctx.createLinearGradient(x, height, x, y);
    if (i < 8) {
      gradient.addColorStop(0, 'rgba(14, 165, 233, 0.4)');
      gradient.addColorStop(1, 'rgba(56, 189, 248, 0.95)');
    } else if (i < 28) {
      gradient.addColorStop(0, 'rgba(99, 102, 241, 0.4)');
      gradient.addColorStop(1, 'rgba(129, 140, 248, 0.95)');
    } else {
      gradient.addColorStop(0, 'rgba(168, 85, 247, 0.4)');
      gradient.addColorStop(1, 'rgba(192, 132, 252, 0.95)');
    }

    ctx.fillStyle = gradient;

    const radius = Math.min(barWidth / 2, 3);
    ctx.beginPath();
    ctx.moveTo(x, height - 4);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.lineTo(x + barWidth - radius, y);
    ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
    ctx.lineTo(x + barWidth, height - 4);
    ctx.closePath();
    ctx.fill();

    if (barHeight > 10) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fillRect(x, y - 2, barWidth, 1.5);
    }
  }
}

function drawWaveform(
  ctx: CanvasRenderingContext2D,
  dataArray: Uint8Array,
  width: number,
  height: number
) {
  const bufferLength = dataArray.length;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = 'rgba(10, 12, 18, 0.85)';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(0, height / 2);
  ctx.lineTo(width, height / 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#6366f1';
  ctx.shadowColor = '#818cf8';
  ctx.shadowBlur = 8;
  ctx.beginPath();

  const sliceWidth = width / bufferLength;
  let x = 0;

  for (let i = 0; i < bufferLength; i++) {
    const v = dataArray[i] / 128.0;
    const y = (v * height) / 2;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
    x += sliceWidth;
  }

  ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawBalanceMeter(
  ctx: CanvasRenderingContext2D,
  dataArray: Uint8Array,
  width: number,
  height: number
) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = 'rgba(10, 12, 18, 0.85)';
  ctx.fillRect(0, 0, width, height);

  const half = Math.floor(dataArray.length / 2);
  let leftEnergy = 0;
  let rightEnergy = 0;

  for (let i = 0; i < half; i++) {
    leftEnergy += dataArray[i] || 0;
  }
  for (let i = half; i < dataArray.length; i++) {
    rightEnergy += dataArray[i] || 0;
  }

  const leftNorm = Math.min(1, leftEnergy / (half * 160));
  const rightNorm = Math.min(1, rightEnergy / (half * 160));

  const barHeight = 18;
  const paddingX = 40;
  const barWidth = width - paddingX * 2;

  // Channel L
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.font = 'bold 10px monospace';
  ctx.fillText('CH-L', 8, 38);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.fillRect(paddingX, 26, barWidth, barHeight);

  const lGrad = ctx.createLinearGradient(paddingX, 0, paddingX + barWidth, 0);
  lGrad.addColorStop(0, '#10b981');
  lGrad.addColorStop(0.7, '#f59e0b');
  lGrad.addColorStop(1, '#ef4444');
  ctx.fillStyle = lGrad;
  ctx.fillRect(paddingX, 26, barWidth * leftNorm, barHeight);

  // Channel R
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.fillText('CH-R', 8, 76);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.fillRect(paddingX, 64, barWidth, barHeight);

  const rGrad = ctx.createLinearGradient(paddingX, 0, paddingX + barWidth, 0);
  rGrad.addColorStop(0, '#10b981');
  rGrad.addColorStop(0.7, '#f59e0b');
  rGrad.addColorStop(1, '#ef4444');
  ctx.fillStyle = rGrad;
  ctx.fillRect(paddingX, 64, barWidth * rightNorm, barHeight);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  for (let p = 0.25; p <= 1; p += 0.25) {
    const tickX = paddingX + barWidth * p;
    ctx.beginPath();
    ctx.moveTo(tickX, 20);
    ctx.lineTo(tickX, 90);
    ctx.stroke();
  }
}
