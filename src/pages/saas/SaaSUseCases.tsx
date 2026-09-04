import { motion } from 'framer-motion';
import { SaaSLayout } from '@/components/saas/SaaSLayout';
import { Card, CardContent } from '@/components/ui/card';
import conferenceHallImage from '@/assets/conference-hall.jpg';
import { GraduationCap, Building2, Landmark, Presentation, Cpu } from 'lucide-react';

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

const cases = [
  {
    icon: GraduationCap,
    title: 'Educational Institutions',
    desc: 'Colleges, universities, and schools can use SmartMic for lectures, seminars, and student Q&A sessions. Professors maintain full control while students participate easily.',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  {
    icon: Building2,
    title: 'Corporate Auditoriums',
    desc: 'Town halls, all-hands meetings, and training sessions. Employees ask questions from their seats without waiting for a roaming mic.',
    color: 'text-success',
    bg: 'bg-success/10',
  },
  {
    icon: Landmark,
    title: 'Government Meeting Halls',
    desc: 'Council meetings, public hearings, and civic forums. Maintain order with queue-based speaking and full session records.',
    color: 'text-warning',
    bg: 'bg-warning/10',
  },
  {
    icon: Presentation,
    title: 'Conferences & Events',
    desc: 'Tech conferences, panels, and workshops. Speakers are managed efficiently and audiences interact seamlessly.',
    color: 'text-destructive',
    bg: 'bg-destructive/10',
  },
  {
    icon: Cpu,
    title: 'Smart Campus / Smart City',
    desc: 'Part of a larger digital transformation initiative. Integrate SmartMic into smart infrastructure for modern, connected venues.',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
];

export default function SaaSUseCases() {
  return (
    <SaaSLayout>
      {/* Hero with background image */}
      <section className="relative overflow-hidden py-24 px-4">
        <div className="absolute inset-0">
          <img src={conferenceHallImage} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/55" />
        </div>
        <div className="container mx-auto max-w-5xl relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="font-heading text-4xl md:text-5xl font-bold mb-4 text-white [text-shadow:_0_2px_20px_rgb(0_0_0_/_40%)]">Built for Every Venue</h1>
            <p className="text-white/80 text-lg max-w-xl mx-auto [text-shadow:_0_1px_8px_rgb(0_0_0_/_30%)]">
              SmartMic adapts to any environment where audience interaction matters.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Use Cases Grid */}
      <section className="py-20">
        <div className="container mx-auto px-4">

          <div className="max-w-4xl mx-auto space-y-6">
            {cases.map((c, i) => (
              <motion.div key={c.title} {...fadeUp} transition={{ delay: i * 0.1, duration: 0.5 }}>
                <Card className="border-0 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow">
                  <CardContent className="p-8 flex flex-col md:flex-row gap-6 items-start">
                    <div className={`w-14 h-14 rounded-2xl ${c.bg} flex items-center justify-center shrink-0`}>
                      <c.icon className={`w-7 h-7 ${c.color}`} />
                    </div>
                    <div>
                      <h3 className="font-heading text-xl font-semibold mb-2">{c.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{c.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </SaaSLayout>
  );
}
