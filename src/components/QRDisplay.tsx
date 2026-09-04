import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent } from '@/components/ui/card';

interface QRDisplayProps {
  sessionId: string;
  size?: number;
}

export function QRDisplay({ sessionId, size = 200 }: QRDisplayProps) {
  const url = `${window.location.origin}/session/${sessionId}`;

  return (
    <Card className="gradient-card border-0 shadow-[var(--shadow-lg)]">
      <CardContent className="flex flex-col items-center gap-4 p-6">
        <div className="rounded-xl bg-card p-4 shadow-[var(--shadow-sm)]">
          <QRCodeSVG
            value={url}
            size={size}
            bgColor="transparent"
            fgColor="hsl(220, 25%, 10%)"
            level="H"
          />
        </div>
        <p className="text-sm text-muted-foreground font-body break-all text-center max-w-xs">
          {url}
        </p>
      </CardContent>
    </Card>
  );
}
