import { useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { SlidersHorizontal, RotateCcw, Volume2, ShieldCheck, Waves, Gauge } from 'lucide-react';
import type { EQBand, AudioEnhancementSettings } from '@/hooks/useWebRTC';

interface AudioEqualizerProps {
  onEQChange: (band: EQBand, gainDb: number) => void;
  onVolumeChange?: (value: number) => void;
  enhancements?: AudioEnhancementSettings;
  onEnhancementChange?: (key: keyof AudioEnhancementSettings, value: boolean) => void;
  inputLevel?: number;
}

const BANDS: { key: EQBand; label: string; freq: string }[] = [
  { key: 'bass', label: 'Bass', freq: '200 Hz' },
  { key: 'mid', label: 'Mid', freq: '1 kHz' },
  { key: 'treble', label: 'Treble', freq: '3 kHz' },
];

const PRESETS: Record<string, Record<EQBand, number>> = {
  Flat: { bass: 0, mid: 0, treble: 0 },
  Auditorium: { bass: 3, mid: 0, treble: 2 },
  'Lecture Hall': { bass: 2, mid: 2, treble: 3 },
  Clarity: { bass: -2, mid: 3, treble: 2 },
  Warm: { bass: 4, mid: 2, treble: 0 },
  Outdoor: { bass: 5, mid: 1, treble: 4 },
  'Voice Boost': { bass: -1, mid: 5, treble: 3 },
  'De-Ess': { bass: 0, mid: 0, treble: -4 },
};

export function AudioEqualizer({ onEQChange, onVolumeChange, enhancements, onEnhancementChange, inputLevel = 0 }: AudioEqualizerProps) {
  const [gains, setGains] = useState<Record<EQBand, number>>({ bass: 0, mid: 0, treble: 0 });
  const [volume, setVolume] = useState(100);
  const [activePreset, setActivePreset] = useState<string | null>('Flat');

  const handleChange = (band: EQBand, value: number[]) => {
    const db = value[0];
    setGains((prev) => ({ ...prev, [band]: db }));
    setActivePreset(null);
    onEQChange(band, db);
  };

  const applyPreset = (presetName: string) => {
    const preset = PRESETS[presetName];
    setGains(preset);
    setActivePreset(presetName);
    BANDS.forEach((b) => onEQChange(b.key, preset[b.key]));
  };

  const resetAll = () => {
    applyPreset('Flat');
    setVolume(100);
    onVolumeChange?.(1.0);
  };

  const handleVolumeChange = (value: number[]) => {
    const v = value[0];
    setVolume(v);
    onVolumeChange?.(v / 100);
  };

  return (
    <Card className="border-0 shadow-[var(--shadow-sm)]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-primary" />
            <CardTitle className="font-heading text-sm">Audio Controls</CardTitle>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={resetAll} title="Reset all">
            <RotateCcw className="w-3 h-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Audio Enhancement Toggles */}
        {enhancements && onEnhancementChange && (
          <div className="space-y-2.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3 h-3" /> Audio Processing
            </p>
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center justify-between bg-muted/20 rounded-lg px-3 py-2">
                <Label htmlFor="noise-suppression" className="text-xs cursor-pointer flex items-center gap-1.5">
                  <Waves className="w-3 h-3 text-primary" /> Noise Suppression
                </Label>
                <Switch
                  id="noise-suppression"
                  checked={enhancements.noiseSuppression}
                  onCheckedChange={(v) => onEnhancementChange('noiseSuppression', v)}
                  className="scale-75"
                />
              </div>
              <div className="flex items-center justify-between bg-muted/20 rounded-lg px-3 py-2">
                <Label htmlFor="echo-cancel" className="text-xs cursor-pointer flex items-center gap-1.5">
                  <Waves className="w-3 h-3 text-primary" /> Echo Cancellation
                </Label>
                <Switch
                  id="echo-cancel"
                  checked={enhancements.echoCancellation}
                  onCheckedChange={(v) => onEnhancementChange('echoCancellation', v)}
                  className="scale-75"
                />
              </div>
              <div className="flex items-center justify-between bg-muted/20 rounded-lg px-3 py-2">
                <Label htmlFor="auto-gain" className="text-xs cursor-pointer flex items-center gap-1.5">
                  <Gauge className="w-3 h-3 text-primary" /> Auto Gain Control
                </Label>
                <Switch
                  id="auto-gain"
                  checked={enhancements.autoGainControl}
                  onCheckedChange={(v) => onEnhancementChange('autoGainControl', v)}
                  className="scale-75"
                />
              </div>
            </div>
          </div>
        )}

        {/* Level Meter */}
        {inputLevel > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Audio Level</p>
            <div className="flex items-center gap-2">
              <Progress
                value={inputLevel}
                className="h-2 flex-1"
              />
              <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">{inputLevel}%</span>
            </div>
          </div>
        )}

        {/* Volume Control */}
        {onVolumeChange && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Volume2 className="w-3 h-3" /> Volume
              </span>
              <span className="text-[10px] text-muted-foreground tabular-nums">{volume}%</span>
            </div>
            <Slider
              min={0}
              max={200}
              step={5}
              value={[volume]}
              onValueChange={handleVolumeChange}
            />
          </div>
        )}

        <div className="h-px bg-border" />

        {/* EQ Presets */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Room Presets</p>
          <div className="flex gap-1.5 flex-wrap">
            {Object.keys(PRESETS).map((presetName) => (
              <Button
                key={presetName}
                variant={activePreset === presetName ? 'default' : 'outline'}
                size="sm"
                className="text-xs min-w-16"
                onClick={() => applyPreset(presetName)}
              >
                {presetName}
              </Button>
            ))}
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* EQ Bands */}
        {BANDS.map(({ key, label, freq }) => (
          <div key={key} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">{label}</span>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {gains[key] > 0 ? '+' : ''}{gains[key]} dB
              </span>
            </div>
            <Slider
              min={-12}
              max={12}
              step={1}
              value={[gains[key]]}
              onValueChange={(v) => handleChange(key, v)}
            />
            <p className="text-[10px] text-muted-foreground">{freq}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
