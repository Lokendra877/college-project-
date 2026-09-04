import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SaaSLayout } from '@/components/saas/SaaSLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import auditoriumImage from '@/assets/auditorium.jpg';
import {
  QrCode, Users, ShieldCheck, Mic2, BarChart3,
  ArrowRight, CheckCircle2, Timer, AlertTriangle, Handshake,
  MessageSquare, Smartphone, ListOrdered, Volume2, Fingerprint,
  Star, ThumbsUp, Zap
} from 'lucide-react';

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

const problems = [
  { icon: Timer, title: 'Mic Passing Delays', desc: 'Physical mics waste minutes being passed around large audiences.', color: 'vibrant-orange' },
  { icon: AlertTriangle, title: 'No Speaker Order', desc: 'Without a queue, Q&A sessions become chaotic and unfair.', color: 'vibrant-pink' },
  { icon: ShieldCheck, title: 'Hygiene Concerns', desc: 'Shared microphones pose health risks in large gatherings.', color: 'vibrant-purple' },
  { icon: MessageSquare, title: 'Poor Interaction', desc: 'Audiences disengage when speaking is difficult or disorganized.', color: 'vibrant-blue' },
];

const steps = [
  { icon: QrCode, title: 'Display QR Code', desc: 'Auditorium screen shows a session-specific QR code.' },
  { icon: Smartphone, title: 'Scan on Phone', desc: 'Attendees scan the code with their smartphone camera.' },
  { icon: Fingerprint, title: 'Auto Identification', desc: 'System recognizes the device automatically.' },
  { icon: Handshake, title: 'Request to Speak', desc: 'User taps a button to join the speaking queue.' },
  { icon: ListOrdered, title: 'Queue Manages Order', desc: 'Fair first-come-first-served queue system.' },
  { icon: Volume2, title: 'Voice on Speakers', desc: 'Audio streams directly to the auditorium speakers.' },
];

const features = [
  { icon: Fingerprint, title: 'Auto User ID', desc: 'Devices are remembered across sessions.', color: 'primary' },
  { icon: ListOrdered, title: 'Queue-Based Mic', desc: 'Orderly, fair speaker management.', color: 'secondary' },
  { icon: ShieldCheck, title: 'Contactless', desc: 'No physical mic needed.', color: 'accent' },
  { icon: BarChart3, title: 'Admin Dashboard', desc: 'Full control over sessions.', color: 'vibrant-orange' },
  { icon: ThumbsUp, title: 'Upvote Questions', desc: 'Submit & upvote top questions.', color: 'vibrant-blue' },
  { icon: Mic2, title: 'Live Polls', desc: 'Real-time polls for instant feedback.', color: 'vibrant-pink' },
];

const testimonials = [
  {
    quote: "SmartMic transformed our Q&A sessions. No more mic passing delays, and our students actually engage now.",
    author: "Dr. Sarah Chen",
    role: "Dean of Academic Affairs",
    institution: "Stanford University"
  },
  {
    quote: "Perfect for our large auditorium events. The setup was literally 2 minutes, and our team is saving hours.",
    author: "Michael Rodriguez",
    role: "Event Manager",
    institution: "Google Campus"
  },
  {
    quote: "The polls and Q&A features are game changers. Conference attendance jumped 40% because people actually speak up now.",
    author: "Jennifer Patel",
    role: "VP of Operations",
    institution: "TechCorp Annual Summit"
  }
];

const institutions = [
  "Stanford University", "MIT", "Google Campus", "Microsoft", "Harvard Law School", "Yale School of Management"
];

export default function SaaSHome() {
  return (
    <SaaSLayout>
      {/* Hero */}
      <section className="relative overflow-hidden min-h-[90vh] flex items-center">
        {/* Background image */}
        <div className="absolute inset-0">
          <img src={auditoriumImage} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/55" />
        </div>
        {/* Colorful blob shapes */}
        <div className="absolute top-20 -left-20 w-72 h-72 bg-primary/20 blob-shape blur-[80px] animate-float" />
        <div className="absolute bottom-20 -right-20 w-80 h-80 bg-secondary/20 blob-shape-2 blur-[100px] animate-float" style={{ animationDelay: '1.5s' }} />

        <div className="container mx-auto px-4 py-20 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto text-center"
          >
            {/* Mic icon */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
              className="mx-auto w-20 h-20 mb-8 rounded-2xl gradient-primary flex items-center justify-center shadow-colored"
            >
              <Mic2 className="w-10 h-10 text-primary-foreground" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/10 text-white text-sm font-semibold mb-8 border border-white/20 backdrop-blur-sm"
            >
              <Zap className="w-4 h-4" />
              Enterprise-Grade Auditorium Solution
            </motion.div>

            <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl leading-tight mb-8 text-white [text-shadow:_0_2px_20px_rgb(0_0_0_/_40%)]">
              Smart, Contactless{' '}
              <span className="text-gradient">Microphone System</span>{' '}
              for Auditoriums
            </h1>

            <p className="text-lg md:text-xl text-white/85 max-w-2xl mx-auto mb-12 leading-relaxed [text-shadow:_0_1px_8px_rgb(0_0_0_/_30%)]">
              Turn smartphones into controlled microphones using QR-based access. 
              Eliminate mic passing, maintain hygiene, and bring order to every session.
            </p>

          </motion.div>

           {/* Trust badges */}
           <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ delay: 0.5, duration: 0.6 }}
             className="mt-20 flex flex-wrap items-center justify-center gap-6"
           >
             {['No hardware needed', 'Works on any smartphone', 'Setup in under 2 minutes', 'Enterprise-ready security'].map((text, i) => (
               <div key={i} className="flex items-center gap-2 text-sm text-white/90 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 shadow-sm">
                 <CheckCircle2 className="w-4 h-4 text-green-400" />
                 <span>{text}</span>
               </div>
             ))}
           </motion.div>
         </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <motion.div {...fadeUp} className="text-center mb-14">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Testimonials</p>
            <h2 className="font-heading text-4xl md:text-5xl mb-4">
              Loved by <span className="text-gradient">Educators</span> Worldwide
            </h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((testimonial, i) => (
              <motion.div key={i} {...fadeUp} transition={{ delay: i * 0.1, duration: 0.5 }}>
                <Card className="card-hover h-full border shadow-sm">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, j) => (
                        <Star key={j} className="w-4 h-4 fill-vibrant-yellow text-vibrant-yellow" />
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground italic leading-relaxed">&quot;{testimonial.quote}&quot;</p>
                    <div className="pt-3 border-t border-border">
                      <p className="font-heading font-semibold text-sm">{testimonial.author}</p>
                      <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                      <p className="text-xs text-primary font-medium mt-1">{testimonial.institution}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Institution Trust */}
          <motion.div {...fadeUp} className="mt-16">
            <p className="text-center text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-6">Trusted by leading institutions</p>
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
              {institutions.map((inst, i) => (
                <div key={i} className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
                  {inst}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 bg-muted/30 relative">
        <div className="container mx-auto px-4">
          <motion.div {...fadeUp} className="text-center mb-14">
            <p className="text-sm font-semibold text-destructive uppercase tracking-wider mb-3">The Problem</p>
            <h2 className="font-heading text-4xl md:text-5xl mb-4">
              Traditional Mics Are <span className="text-destructive">Broken</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">Every large venue faces these challenges during audience interaction.</p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {problems.map((p, i) => (
              <motion.div key={p.title} {...fadeUp} transition={{ delay: i * 0.1, duration: 0.5 }}>
                <Card className={`card-hover h-full border-2 border-${p.color}/20 hover:border-${p.color}/40`}>
                  <CardContent className="p-6 text-center space-y-3">
                    <div className={`w-14 h-14 rounded-2xl bg-${p.color}/10 flex items-center justify-center mx-auto`}>
                      <p.icon className={`w-7 h-7 text-${p.color}`} />
                    </div>
                    <h3 className="font-heading font-bold text-lg">{p.title}</h3>
                    <p className="text-sm text-muted-foreground">{p.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <motion.div {...fadeUp} className="text-center mb-14">
            <p className="text-sm font-semibold text-accent uppercase tracking-wider mb-3">How It Works</p>
            <h2 className="font-heading text-4xl md:text-5xl mb-4">
              <span className="text-gradient-accent">6 Simple Steps</span> to Digital Mic
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">A simple flow from QR scan to voice output.</p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {steps.map((s, i) => (
              <motion.div key={s.title} {...fadeUp} transition={{ delay: i * 0.08, duration: 0.5 }}>
                <Card className="card-hover h-full border shadow-sm relative overflow-hidden group">
                  <CardContent className="p-6 space-y-3 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                        <s.icon className="w-6 h-6 text-primary" />
                      </div>
                      <span className="text-xs font-bold text-primary/50 uppercase tracking-widest">Step {i + 1}</span>
                    </div>
                    <h3 className="font-heading font-bold text-lg">{s.title}</h3>
                    <p className="text-sm text-muted-foreground">{s.desc}</p>
                  </CardContent>
                  {/* Step number watermark */}
                  <div className="absolute -bottom-4 -right-2 font-heading text-[80px] font-extrabold text-muted/40 leading-none select-none">
                    {i + 1}
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div {...fadeUp} className="text-center mb-14">
            <p className="text-sm font-semibold text-secondary uppercase tracking-wider mb-3">Features</p>
            <h2 className="font-heading text-4xl md:text-5xl mb-4">
              Powerful <span className="text-gradient">Features</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">Everything you need to run professional auditorium sessions.</p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {features.map((f, i) => (
              <motion.div key={f.title} {...fadeUp} transition={{ delay: i * 0.08, duration: 0.5 }}>
                <Card className="card-hover h-full border shadow-sm group">
                  <CardContent className="p-6 space-y-3">
                    <div className={`w-12 h-12 rounded-xl bg-${f.color}/10 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <f.icon className={`w-6 h-6 text-${f.color}`} />
                    </div>
                    <h3 className="font-heading font-bold text-lg">{f.title}</h3>
                    <p className="text-sm text-muted-foreground">{f.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link to="/features">
              <Button variant="outline" size="lg" className="font-heading font-semibold border-2 rounded-xl">
                See All Features <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div {...fadeUp}>
            <Card className="border-0 overflow-hidden relative rounded-3xl">
              <div className="absolute inset-0 gradient-primary" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(0_0%_100%/0.15),transparent_60%)]" />
              <CardContent className="p-12 md:p-20 text-center relative z-10">
                <h2 className="font-heading text-4xl md:text-5xl text-primary-foreground mb-6">
                  Ready to Modernize Your Auditorium?
                </h2>
                <p className="text-primary-foreground/80 text-lg max-w-xl mx-auto mb-10">
                  Join institutions that have already eliminated mic-passing delays and improved audience engagement.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link to="/contact">
                    <Button size="lg" className="bg-white text-primary hover:bg-white/90 text-base px-10 h-14 font-heading font-semibold rounded-xl shadow-lg">
                      Request a Demo
                    </Button>
                  </Link>
                  <Link to="/pricing">
                    <Button size="lg" variant="outline" className="border-2 border-white/40 text-primary-foreground hover:bg-white/10 text-base px-10 h-14 font-heading font-semibold rounded-xl">
                      View Pricing
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>
    </SaaSLayout>
  );
}