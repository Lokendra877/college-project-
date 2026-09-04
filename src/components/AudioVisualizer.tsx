import { useRef, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, BarChart3 } from 'lucide-react';

interface AudioVisualizerProps {
  analyserNode: AnalyserNode | null;
  isReceiving: boolean;
}

type VisualizerMode = 'spectrum' | 'waveform';

export function AudioVisualizer({ analyserNode, isReceiving }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const [mode, setMode] = useState<VisualizerMode>('spectrum');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyserNode || !isReceiving) {
      // Clear canvas when not receiving
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          drawIdleState(ctx, canvas.width, canvas.height);
        }
      }
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      if (!canvasRef.current || !analyserNode) return;

      const width = canvas.width;
      const height = canvas.height;

      if (mode === 'spectrum') {
        drawSpectrum(ctx, analyserNode, width, height);
      } else {
        drawWaveform(ctx, analyserNode, width, height);
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [analyserNode, isReceiving, mode]);

  return (
    <Card className="border-0 shadow-[var(--shadow-sm)]">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <CardTitle className="font-heading text-sm">Audio Visualizer</CardTitle>
          </div>
          <div className="flex gap-1">
            <Button
              variant={mode === 'spectrum' ? 'default' : 'ghost'}
              size="sm"
              className="h-6 text-[10px] px-2"
              onClick={() => setMode('spectrum')}
            >
              <BarChart3 className="w-3 h-3 mr-1" /> Spectrum
            </Button>
            <Button
              variant={mode === 'waveform' ? 'default' : 'ghost'}
              size="sm"
              className="h-6 text-[10px] px-2"
              onClick={() => setMode('waveform')}
            >
              <Activity className="w-3 h-3 mr-1" /> Waveform
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg overflow-hidden bg-background border border-border">
          <canvas
            ref={canvasRef}
            width={400}
            height={120}
            className="w-full h-[120px]"
          />
        </div>
        {!isReceiving && (
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            Visualizer activates when receiving speaker audio
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

function drawSpectrum(ctx: CanvasRenderingContext2D, analyser: AnalyserNode, width: number, height: number) {
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(dataArray);

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = 'hsl(var(--muted) / 0.05)';
  ctx.fillRect(0, 0, width, height);

  // Only use lower ~60% of frequency bins (most relevant for voice)
  const usableBins = Math.floor(bufferLength * 0.6);
  const barCount = 48;
  const binsPerBar = Math.max(1, Math.floor(usableBins / barCount));
  const barWidth = (width / barCount) - 1;
  const maxBarHeight = height - 4;

  for (let i = 0; i < barCount; i++) {
    // Average the bins for this bar
    let sum = 0;
    const startBin = i * binsPerBar;
    for (let j = 0; j < binsPerBar; j++) {
      sum += dataArray[startBin + j] || 0;
    }
    const avg = sum / binsPerBar;
    const barHeight = (avg / 255) * maxBarHeight;

    const x = i * (barWidth + 1) + 1;
    const y = height - barHeight - 2;

    // Color gradient: primary at low freq, accent at high
    const hueShift = (i / barCount) * 30;
    const intensity = Math.min(1, avg / 180);
    
    // Create gradient per bar
    const gradient = ctx.createLinearGradient(x, height, x, y);
    gradient.addColorStop(0, `hsla(${220 + hueShift}, 70%, 55%, ${0.3 + intensity * 0.7})`);
    gradient.addColorStop(1, `hsla(${240 + hueShift}, 80%, 65%, ${0.5 + intensity * 0.5})`);

    ctx.fillStyle = gradient;

    // Rounded bar tops
    const radius = Math.min(barWidth / 2, 3);
    ctx.beginPath();
    ctx.moveTo(x, height - 2);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.lineTo(x + barWidth - radius, y);
    ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
    ctx.lineTo(x + barWidth, height - 2);
    ctx.closePath();
    ctx.fill();

    // Peak dot
    if (barHeight > 8) {
      ctx.fillStyle = `hsla(${230 + hueShift}, 90%, 75%, 0.9)`;
      ctx.fillRect(x, y - 1, barWidth, 2);
    }
  }
}

function drawWaveform(ctx: CanvasRenderingContext2D, analyser: AnalyserNode, width: number, height: number) {
  const bufferLength = analyser.fftSize;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteTimeDomainData(dataArray);

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = 'hsl(var(--muted) / 0.05)';
  ctx.fillRect(0, 0, width, height);

  // Center reference line
  ctx.strokeStyle = 'hsl(var(--muted-foreground) / 0.1)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(0, height / 2);
  ctx.lineTo(width, height / 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Waveform with glow
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'hsl(var(--primary))';
  ctx.shadowColor = 'hsl(var(--primary))';
  ctx.shadowBlur = 6;
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

  // Secondary softer line for depth
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'hsla(var(--primary) / 0.15)';
  ctx.beginPath();
  x = 0;
  for (let i = 0; i < bufferLength; i++) {
    const v = dataArray[i] / 128.0;
    const y = (v * height) / 2;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
    x += sliceWidth;
  }
  ctx.stroke();
}
