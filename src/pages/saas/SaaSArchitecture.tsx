import { motion } from 'framer-motion';
import { SaaSLayout } from '@/components/saas/SaaSLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Smartphone, Globe, Server, ListOrdered, Volume2, ArrowRight } from 'lucide-react';

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

const layers = [
  { icon: Smartphone, label: 'User Phone', desc: 'Scans QR, requests to speak, streams audio via WebRTC.' },
  { icon: Globe, label: 'Web Application', desc: 'React-based PWA — responsive, no app download required.' },
  { icon: Server, label: 'Cloud Backend', desc: 'Authentication, database, realtime subscriptions, edge functions.' },
  { icon: ListOrdered, label: 'Queue System', desc: 'Manages speaker order, grants/revokes mic access in real time.' },
  { icon: Volume2, label: 'Speaker Output', desc: 'Audio routed from WebRTC to the auditorium sound system.' },
];

export default function SaaSArchitecture() {
  return (
    <SaaSLayout>
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div {...fadeUp} className="text-center mb-16">
            <h1 className="font-heading text-4xl md:text-5xl font-bold mb-4">System Architecture</h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              A clean, scalable architecture designed for reliability and low latency.
            </p>
          </motion.div>

          {/* Flow Diagram */}
          <motion.div {...fadeUp} className="max-w-4xl mx-auto mb-16">
            <Card className="border-0 shadow-[var(--shadow-lg)] overflow-hidden">
              <CardContent className="p-8 md:p-12">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  {layers.map((layer, i) => (
                    <div key={layer.label} className="flex items-center gap-4">
                      <div className="text-center space-y-2">
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                          <layer.icon className="w-7 h-7 text-primary" />
                        </div>
                        <p className="font-heading font-semibold text-sm">{layer.label}</p>
                      </div>
                      {i < layers.length - 1 && (
                        <ArrowRight className="w-5 h-5 text-muted-foreground hidden md:block shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Detail Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {layers.map((layer, i) => (
              <motion.div key={layer.label} {...fadeUp} transition={{ delay: i * 0.08, duration: 0.5 }}>
                <Card className="border-0 shadow-[var(--shadow-sm)] h-full">
                  <CardContent className="p-6 space-y-3">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                      <layer.icon className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-heading font-semibold">{layer.label}</h3>
                    <p className="text-sm text-muted-foreground">{layer.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Tech Stack */}
          <motion.div {...fadeUp} className="mt-16 max-w-3xl mx-auto">
            <Card className="border-0 shadow-[var(--shadow-sm)]">
              <CardContent className="p-8">
                <h3 className="font-heading text-xl font-bold mb-6 text-center">Technology Stack</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  {[
                    { name: 'React + Vite', sub: 'Frontend' },
                    { name: 'TypeScript', sub: 'Language' },
                    { name: 'WebRTC', sub: 'Audio Streaming' },
                    { name: 'Lovable Cloud', sub: 'Backend & DB' },
                  ].map(t => (
                    <div key={t.name} className="p-3 rounded-lg bg-muted/20">
                      <p className="font-heading font-semibold text-sm">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.sub}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>
    </SaaSLayout>
  );
}
