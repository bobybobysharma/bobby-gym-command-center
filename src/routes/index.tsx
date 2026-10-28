import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { EnquiryForm } from "@/components/enquiry-form";
import hero from "@/assets/hero.jpg";
import strength from "@/assets/strength.jpg";
import cardio from "@/assets/cardio.jpg";
import functional from "@/assets/functional.jpg";
import locker from "@/assets/locker.jpg";
import trainer from "@/assets/trainer.jpg";

const ASSETS: Record<string, string> = { hero, strength, cardio, functional, locker, trainer };
const img = (u: string | null) =>
  !u ? strength : u.startsWith("asset:") ? (ASSETS[u.slice(6)] ?? strength) : u;

const homeQuery = queryOptions({
  queryKey: ["home"],
  queryFn: async () => {
    const { data: gymId, error: gErr } = await supabase.rpc("default_gym_id");
    if (gErr) throw gErr;
    const gym = gymId as string;
    const [settings, plans, trainers, facilities] = await Promise.all([
      supabase.from("gym_settings").select("tagline, hero, contact").eq("gym_id", gym).maybeSingle(),
      supabase.from("membership_plans").select("id, name, description, price_paise, duration_months, benefits, promo_label").eq("gym_id", gym).eq("is_active", true).order("sort_order"),
      supabase.from("trainers").select("id, name, specialty, bio, experience_years, image_url").eq("gym_id", gym).eq("is_active", true).order("sort_order"),
      supabase.from("facilities").select("id, name, description, image_url").eq("gym_id", gym).eq("is_active", true).order("sort_order"),
    ]);
    for (const r of [settings, plans, trainers, facilities]) if (r.error) throw r.error;
    return {
      gym,
      settings: settings.data as { tagline: string | null; hero: { image?: string; headline?: string; subtext?: string }; contact: { phone?: string; email?: string; address?: string } } | null,
      plans: plans.data ?? [],
      trainers: trainers.data ?? [],
      facilities: facilities.data ?? [],
    };
  },
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bobby Gym — Strength. Discipline. Results." },
      { name: "description", content: "Membership plans, expert coaches and a full training floor. Enquire today to join Bobby Gym." },
      { property: "og:title", content: "Bobby Gym — Strength. Discipline. Results." },
      { property: "og:description", content: "Membership plans, expert coaches and a full training floor. Enquire today." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(homeQuery),
  component: Index,
});

const inr = (p: number) => "₹" + (p / 100).toLocaleString("en-IN");

function Index() {
  const { data } = useSuspenseQuery(homeQuery);
  const heroData: { image?: string; headline?: string; subtext?: string } = data.settings?.hero ?? {};
  const contact: { phone?: string; email?: string; address?: string } = data.settings?.contact ?? {};
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Toaster />
      <header className="absolute inset-x-0 top-0 z-10 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 sm:flex sm:justify-between md:px-12">
        <span className="min-w-0 font-display text-2xl">BOBBY <span className="text-primary">GYM</span></span>
        <nav className="hidden gap-8 text-sm text-muted-foreground md:flex">
          <a href="#plans" className="hover:text-foreground">Plans</a>
          <a href="#facilities" className="hover:text-foreground">Facilities</a>
          <a href="#coaches" className="hover:text-foreground">Coaches</a>
          <a href="#enquire" className="hover:text-foreground">Contact</a>
        </nav>
        <Button asChild size="sm" className="h-11 shrink-0"><a href="#enquire">Join now</a></Button>
      </header>

      <section className="relative flex min-h-[80svh] items-center overflow-hidden py-28 sm:min-h-[88svh]">
        <img src={img(heroData.image ?? "asset:hero")} alt="Bobby Gym training floor" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-hero-overlay" />
        <div className="relative min-w-0 max-w-3xl px-4 sm:px-6 md:px-12">
          <p className="mb-4 text-xs font-semibold uppercase text-primary">{data.settings?.tagline}</p>
          <h1 className="break-words font-display text-4xl leading-[1.12] sm:text-5xl md:text-7xl">{heroData.headline ?? "YOUR FITNESS. YOUR STRENGTH."}</h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">{heroData.subtext}</p>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:flex">
            <Button asChild size="lg" className="min-h-12 shadow-glow"><a href="#enquire">Book a free trial</a></Button>
            <Button asChild size="lg" variant="outline" className="min-h-12"><a href="#plans">View plans</a></Button>
          </div>
        </div>
      </section>

      <Section id="plans" eyebrow="Membership" title="Pick your plan">
        <div className="grid items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {data.plans.map((p) => (
            <div key={p.id} className={`relative flex min-w-0 flex-col rounded-lg border bg-card p-5 sm:p-6 ${p.promo_label ? "border-primary shadow-glow" : ""}`}>
              {p.promo_label && <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">{p.promo_label}</span>}
              <h3 className="break-words font-display text-2xl leading-tight">{p.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
              <p className="mt-6 font-display text-4xl text-primary">{inr(p.price_paise)}</p>
              <p className="text-xs text-muted-foreground">for {p.duration_months} month{p.duration_months > 1 ? "s" : ""}</p>
              <ul className="mt-6 flex-1 space-y-3 text-sm leading-relaxed">
                {p.benefits.map((b) => <li key={b}>✓ {b}</li>)}
              </ul>
              <Button asChild className="mt-6 min-h-12" variant={p.promo_label ? "default" : "outline"}>
                <a href="#enquire">Enquire</a>
              </Button>
            </div>
          ))}
        </div>
      </Section>

      <Section id="facilities" eyebrow="Facilities" title="Everything you need to train">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data.facilities.map((f) => (
            <div key={f.id} className="group relative min-w-0 overflow-hidden rounded-lg border bg-card">
              <img src={img(f.image_url)} alt={f.name} loading="lazy" className="aspect-[4/3] w-full object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-105" />
              <div className="p-5">
                <h3 className="break-words font-display text-xl leading-tight">{f.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.description}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section id="coaches" eyebrow="Coaches" title="Train with the best">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data.trainers.map((t) => (
            <div key={t.id} className="min-w-0 overflow-hidden rounded-lg border bg-card">
              <img src={img(t.image_url)} alt={t.name} loading="lazy" className="aspect-[4/3] w-full object-cover" />
              <div className="p-5">
                <h3 className="break-words font-display text-xl leading-tight">{t.name}</h3>
                <p className="text-sm font-semibold text-primary">{t.specialty}</p>
                {t.experience_years != null && <p className="text-xs text-muted-foreground">{t.experience_years} years experience</p>}
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t.bio}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section id="enquire" eyebrow="Get started" title="Send us an enquiry">
        <div className="grid gap-10 md:grid-cols-2">
          <EnquiryForm gymId={data.gym} plans={data.plans} />
          <div className="min-w-0 space-y-4 break-words text-muted-foreground">
            {contact.phone && <p><span className="text-foreground">Phone:</span> <a className="inline-block py-2 underline underline-offset-4" href={`tel:${contact.phone.replace(/[^+0-9]/g, "")}`}>{contact.phone}</a></p>}
            {contact.email && <p><span className="text-foreground">Email:</span> {contact.email}</p>}
            {contact.address && <p><span className="text-foreground">Address:</span> {contact.address}</p>}
          </div>
        </div>
      </Section>

      <footer className="border-t px-6 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Bobby Gym
      </footer>
    </div>
  );
}

function Section({ id, eyebrow, title, children }: { id: string; eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mx-auto max-w-7xl scroll-mt-6 px-4 py-12 sm:px-6 md:px-12 md:py-20">
      <p className="text-xs font-semibold uppercase text-primary">{eyebrow}</p>
      <h2 className="mb-7 mt-2 break-words font-display text-3xl leading-tight sm:text-4xl md:mb-10 md:text-5xl">{title}</h2>
      {children}
    </section>
  );
}

