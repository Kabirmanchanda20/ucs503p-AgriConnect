import Link from 'next/link';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui';

export default function HomePage() {
  return (
    <div className="landing-page">
      {/* Hero: brand + outcome + CTAs — one composition */}
      <section className="landing-hero relative isolate overflow-hidden text-paper">
        <div className="landing-hero-glow" aria-hidden />
        <div className="relative mx-auto flex min-h-[min(88vh,760px)] max-w-6xl flex-col justify-center px-5 py-16 sm:px-8 md:px-12">
          <div className="landing-rise grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <Logo variant="hero" linked={false} />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-harvest">
                Farm-to-market marketplace
              </p>
              <h1 className="mt-3 max-w-xl font-display text-[2.15rem] font-semibold leading-[1.15] tracking-tight sm:text-5xl md:text-[3.25rem]">
                Sell harvest and buy produce without the middleman.
              </h1>
              <p className="mt-5 max-w-xl font-sans text-lg leading-relaxed text-paper/90 sm:text-xl">
                AgriConnect connects farmers and buyers: list crops with photos, find fair
                local prices, and track every order in one place — free to join.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link href="/register" className="landing-cta-primary">
                  <Button variant="gold" className="min-h-12 px-6">
                    Join free — sell or buy
                  </Button>
                </Link>
                <Link href="/marketplace">
                  <Button variant="outline-light" className="min-h-12">
                    Browse fresh produce
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dual paths */}
      <section className="landing-section bg-field">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 md:px-12">
          <h2 className="font-display text-3xl text-forest sm:text-4xl">
            Pick your path. Start connecting today.
          </h2>
          <p className="mt-3 max-w-2xl text-ink/70">
            Two sides. One marketplace. Choose what you need — then create your free account.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <article className="landing-path group">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-leaf">For farmers</p>
              <h3 className="mt-2 font-display text-2xl text-forest">
                List your harvest. Get buyer orders.
              </h3>
              <ul className="mt-4 space-y-2 text-ink/75">
                <li>Post wheat, vegetables, or fruit with photos and a minimum order.</li>
                <li>Set your price and district so nearby buyers can find you.</li>
                <li>Accept orders and track pickup or delivery status.</li>
              </ul>
              <Link href="/register?role=FARMER" className="mt-6 inline-block">
                <Button className="w-full sm:w-auto">Start selling free</Button>
              </Link>
            </article>

            <article className="landing-path group">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-harvest">For buyers</p>
              <h3 className="mt-2 font-display text-2xl text-forest">
                Find fresh produce. Order direct.
              </h3>
              <ul className="mt-4 space-y-2 text-ink/75">
                <li>Browse by crop, district, and price — no middleman markup maze.</li>
                <li>Place an order for pickup or delivery from the farmer.</li>
                <li>Follow order status from placed to completed in one place.</li>
              </ul>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/marketplace">
                  <Button variant="secondary">Browse marketplace</Button>
                </Link>
                <Link href="/register?role=BUYER">
                  <Button>Join as a buyer</Button>
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="landing-section border-y border-forest/10 bg-paper">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 md:px-12">
          <h2 className="font-display text-3xl text-forest sm:text-4xl">How AgriConnect works</h2>
          <p className="mt-3 max-w-2xl text-ink/70">
            Match. Trust. Transact — three steps from signup to a completed order.
          </p>
          <ol className="mt-10 grid gap-8 sm:grid-cols-3">
            {[
              {
                step: '01',
                title: 'Create a free account',
                body: 'Sign up as a farmer or buyer. No fees to join.',
              },
              {
                step: '02',
                title: 'List or browse produce',
                body: 'Farmers post listings with photos. Buyers filter crop, place, and price.',
              },
              {
                step: '03',
                title: 'Order and track',
                body: 'Place the order, choose pickup or delivery, and follow status until done.',
              },
            ].map((item) => (
              <li key={item.step} className="landing-step">
                <span className="font-display text-4xl text-leaf/40">{item.step}</span>
                <h3 className="mt-2 font-display text-xl text-forest">{item.title}</h3>
                <p className="mt-2 text-ink/70">{item.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Trust — honest only */}
      <section className="landing-section bg-field">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 md:px-12">
          <h2 className="font-display text-3xl text-forest">Why people join</h2>
          <p className="mt-3 max-w-2xl text-ink/70">
            Clear promises — no invented numbers. Just what the platform actually does.
          </p>
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { title: 'Free to join', body: 'Create an account and start listing or browsing today.' },
              { title: 'Farm to buyer', body: 'Deal directly — skip the long middleman chain.' },
              { title: 'Photos on listings', body: 'See what you are buying before you order.' },
              { title: 'Orders in one place', body: 'Track status from placed to completed.' },
            ].map((item) => (
              <li key={item.title} className="border-l-2 border-leaf/50 pl-4">
                <h3 className="font-semibold text-forest">{item.title}</h3>
                <p className="mt-1 text-sm text-ink/70">{item.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="landing-close relative overflow-hidden bg-forest text-paper">
        <div className="landing-hero-glow opacity-60" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-5 py-16 sm:px-8 md:px-12">
          <h2 className="max-w-2xl font-display text-3xl leading-tight sm:text-4xl">
            Ready to connect farm to market?
          </h2>
          <p className="mt-3 max-w-xl text-paper/80">
            Join free, list your crop or find produce near you, and keep every order on track.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className="landing-cta-primary">
              <Button variant="gold" className="min-h-12 px-6">
                Create your free account
              </Button>
            </Link>
            <Link href="/marketplace">
              <Button variant="outline-light" className="min-h-12">
                Browse listings
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
