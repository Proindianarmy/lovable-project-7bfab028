import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, TrendingUp, Handshake, MapPin, CheckCircle2, Users, Clock, Map } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "IssueSnap — Report Local Issues, Track Progress" },
      { name: "description", content: "The modern civic platform connecting citizens and authorities to resolve community challenges efficiently." },
      { property: "og:title", content: "IssueSnap" },
      { property: "og:description", content: "Report local issues. Track progress. Improve communities." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 text-2xl font-bold text-primary">
            <div className="w-9 h-9 grid place-items-center rounded-lg bg-primary text-primary-foreground">
              <Map className="w-5 h-5" />
            </div>
            IssueSnap
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <Link to="/feed" className="hover:text-primary">Explore Issues</Link>
            <a href="#how" className="hover:text-primary">How it Works</a>
            <Link to="/auth" className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground hover:opacity-90">
              Sign In
            </Link>
          </nav>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h1 className="text-5xl md:text-6xl font-bold leading-[1.05] tracking-tight">
            Report Local Issues.<br />Track Progress.<br />Improve Communities.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-md">
            The modern platform that connects citizens and authorities to resolve civic challenges efficiently.
          </p>
          <Link
            to="/report"
            className="mt-8 inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-primary text-primary-foreground font-medium hover:opacity-90"
          >
            <MapPin className="w-4 h-4" /> Report an Issue
          </Link>
        </div>
        <div className="relative aspect-square max-w-md mx-auto">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-info/20 to-primary/10" />
          <img
            alt="City map with issue pins"
            className="relative w-full h-full object-contain p-8"
            src="https://images.unsplash.com/photo-1524661135-423995f22d0b?w=700&h=700&fit=crop"
          />
        </div>
      </section>

      <section className="bg-muted/60 border-y border-border">
        <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
          <Stat icon={CheckCircle2} value="—" label="Issues Resolved" />
          <Stat icon={Users} value="—" label="Active Reporters" />
          <Stat icon={Clock} value="—" label="Faster Response Time" />
        </div>
      </section>

      <section id="how" className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">How it Works</h2>
        <div className="grid md:grid-cols-3 gap-10">
          <Step icon={Camera} title="Snap & Submit" desc="Capture the issue and add details." />
          <Step icon={TrendingUp} title="Track Progress" desc="Follow the status with real-time updates." />
          <Step icon={Handshake} title="Resolve & Improve" desc="Collaborate with local services for solutions." />
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © 2026 IssueSnap. Building better cities together.
      </footer>
    </div>
  );
}

function Stat({ icon: Icon, value, label }: { icon: React.ComponentType<{ className?: string }>; value: string; label: string }) {
  return (
    <div className="flex items-center gap-4 justify-center py-4">
      <div className="w-12 h-12 grid place-items-center rounded-full bg-background border border-border text-primary">
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <div className="text-3xl font-bold">{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function Step({ icon: Icon, title, desc }: { icon: React.ComponentType<{ className?: string }>; title: string; desc: string }) {
  return (
    <div className="text-center">
      <Icon className="w-10 h-10 mx-auto text-primary" />
      <h3 className="mt-4 font-bold">{title}:</h3>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
