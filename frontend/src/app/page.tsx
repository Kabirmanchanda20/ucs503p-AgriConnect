import Link from 'next/link';
import { Logo } from '@/components/logo';
import { Button, Card } from '@/components/ui';

export default function HomePage() {
  return (
    <div className="space-y-10">
      <section className="overflow-hidden rounded-3xl bg-forest px-6 py-14 text-paper md:px-12">
        <Logo variant="hero" linked={false} className="mb-6" />
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-harvest">
          Direct from the farm
        </p>
        <h1 className="mt-3 max-w-2xl font-display text-5xl leading-tight md:text-6xl">
          Sell harvest. Buy produce. Skip the middleman.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-paper/80">
          AgriConnect is a simple marketplace for farmers and buyers. List a crop,
          find a fair price, and track the order in one place.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/register">
            <Button className="bg-harvest text-soil hover:bg-harvest/90">
              Create a free account
            </Button>
          </Link>
          <Link href="/marketplace">
            <Button variant="secondary" className="border-paper/30 bg-transparent text-paper">
              Browse listings
            </Button>
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: 'Farmers',
            body: 'Post wheat, vegetables, or fruit with photos and a minimum order. See who wants to buy.',
          },
          {
            title: 'Buyers',
            body: 'Filter by crop, district, and price. Place an order for pickup or delivery.',
          },
          {
            title: 'Admins',
            body: 'Verify farmers, suspend abuse, and watch orders and GMV from one desk.',
          },
        ].map((item) => (
          <Card key={item.title}>
            <h2 className="font-display text-2xl text-forest">{item.title}</h2>
            <p className="mt-2 text-ink/70">{item.body}</p>
          </Card>
        ))}
      </section>
    </div>
  );
}
