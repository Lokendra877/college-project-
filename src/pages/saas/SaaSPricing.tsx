import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SaaSLayout } from '@/components/saas/SaaSLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import enterpriseAuditoriumImage from '@/assets/enterprise-auditorium.jpg';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

const TIERS = {
  basic: {
    price_id: 'price_1T8jpBFRxLdX1frRfYCLNpA8',
    product_id: 'prod_U6xkJqQPf2PI8w',
  },
  standard: {
    price_id: 'price_1T8jpuFRxLdX1frRYaoeeLFy',
    product_id: 'prod_U6xlpta74qImWO',
  },
};

const plans = [
  {
    name: 'Basic',
    tier: 'basic' as const,
    price: '$29',
    period: '/month',
    desc: 'Perfect for single-room setups.',
    popular: false,
    features: [
      '1 Auditorium',
      'Up to 50 speakers per session',
      'Basic admin controls',
      'QR code generation',
      'Email support',
    ],
  },
  {
    name: 'Standard',
    tier: 'standard' as const,
    price: '$79',
    period: '/month',
    desc: 'For institutions with multiple halls.',
    popular: true,
    features: [
      'Up to 5 Auditoriums',
      'Unlimited speakers per session',
      'Full queue management',
      'Speaker analytics & reports',
      'Audio recordings',
      'CSV & PDF export',
      'Priority support',
    ],
  },
  {
    name: 'Enterprise',
    tier: null,
    price: 'Custom',
    period: '',
    desc: 'For large-scale deployments.',
    popular: false,
    features: [
      'Unlimited Auditoriums',
      'Custom integrations & API',
      'Advanced analytics dashboard',
      'Live translation & subtitles',
      'Dedicated account manager',
      'SSO & role management',
      '99.9% SLA',
    ],
  },
];

export default function SaaSPricing() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<{ subscribed: boolean; product_id: string | null }>({ subscribed: false, product_id: null });

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success('Subscription activated successfully!');
    }
    if (searchParams.get('canceled') === 'true') {
      toast.info('Checkout was canceled.');
    }
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (!error && data) {
        setSubscription({ subscribed: data.subscribed, product_id: data.product_id });
      }
    } catch {}
  };

  const handleSubscribe = async (tier: 'basic' | 'standard') => {
    setLoading(tier);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in first to subscribe.');
        setLoading(null);
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId: TIERS[tier].price_id },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to start checkout');
    } finally {
      setLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to open subscription portal');
    }
  };

  const isCurrentPlan = (tier: string | null) => {
    if (!subscription.subscribed || !tier) return false;
    return subscription.product_id === TIERS[tier as keyof typeof TIERS]?.product_id;
  };

  return (
    <SaaSLayout>
      {/* Hero with background image */}
      <section className="relative overflow-hidden py-24 px-4">
        <div className="absolute inset-0">
          <img src={enterpriseAuditoriumImage} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/55" />
        </div>
        <div className="container mx-auto max-w-5xl relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="font-heading text-4xl md:text-5xl font-bold mb-4 text-white [text-shadow:_0_2px_20px_rgb(0_0_0_/_40%)]">Simple, Transparent Pricing</h1>
            <p className="text-white/80 text-lg max-w-xl mx-auto [text-shadow:_0_1px_8px_rgb(0_0_0_/_30%)]">
              Choose the plan that fits your institution. Upgrade anytime as you scale.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto items-start">
            {plans.map((plan, i) => (
              <motion.div key={plan.name} {...fadeUp} transition={{ delay: i * 0.1, duration: 0.5 }}>
                <Card className={`relative overflow-hidden h-full ${
                  isCurrentPlan(plan.tier)
                    ? 'border-2 border-success shadow-[var(--shadow-lg)]'
                    : plan.popular 
                      ? 'border-2 border-primary shadow-[var(--shadow-lg)]' 
                      : 'border shadow-[var(--shadow-sm)]'
                }`}>
                  {isCurrentPlan(plan.tier) && (
                    <div className="absolute top-0 right-0 bg-success text-success-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">
                      Your Plan
                    </div>
                  )}
                  {plan.popular && !isCurrentPlan(plan.tier) && (
                    <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">
                      Most Popular
                    </div>
                  )}
                  <CardContent className="p-8 space-y-6">
                    <div>
                      <h3 className="font-heading text-xl font-bold">{plan.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{plan.desc}</p>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="font-heading text-4xl font-bold">{plan.price}</span>
                      {plan.period && <span className="text-muted-foreground">{plan.period}</span>}
                    </div>
                    <ul className="space-y-3">
                      {plan.features.map(f => (
                        <li key={f} className="flex items-start gap-2.5 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    {plan.tier === null ? (
                      <Link to="/contact">
                        <Button variant="outline" size="lg" className="w-full">Contact Sales</Button>
                      </Link>
                    ) : isCurrentPlan(plan.tier) ? (
                      <Button variant="outline" size="lg" className="w-full" onClick={handleManageSubscription}>
                        Manage Subscription
                      </Button>
                    ) : (
                      <Button
                        className={`w-full ${plan.popular ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}`}
                        variant={plan.popular ? 'default' : 'outline'}
                        size="lg"
                        disabled={loading === plan.tier}
                        onClick={() => handleSubscribe(plan.tier!)}
                      >
                        {loading === plan.tier ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Subscribe Now
                      </Button>
                    )}
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
