import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  FileText, BarChart3, ArrowLeftRight, IndianRupee,
  CheckCircle2, ArrowRight, Zap, Shield, Globe,
} from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Professional Invoicing",
    desc: "Create GST-compliant invoices with auto-numbering, HSN codes, and PDF export.",
  },
  {
    icon: IndianRupee,
    title: "GST Reporting",
    desc: "CGST, SGST, IGST breakdowns. B2B/B2C classification with HSN summary.",
  },
  {
    icon: ArrowLeftRight,
    title: "Bank Reconciliation",
    desc: "Match bank transactions to invoices and expenses automatically.",
  },
  {
    icon: BarChart3,
    title: "Financial Reports",
    desc: "Profit & Loss, Balance Sheet, Trial Balance, General Ledger — all real-time.",
  },
];

const tiers = [
  {
    name: "Free",
    price: "₹0",
    period: "/month",
    desc: "For freelancers and small businesses",
    features: ["Up to 50 invoices/mo", "Basic GST reports", "1 organization", "Email support"],
    cta: "Start Free",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "₹999",
    period: "/month",
    desc: "For growing businesses",
    features: [
      "Unlimited invoices",
      "Advanced GST filing reports",
      "Multi-organization",
      "Team collaboration",
      "Bank reconciliation",
      "Priority support",
    ],
    cta: "Start Free Trial",
    highlighted: true,
  },
];

export default function Landing() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogoClick = (e: React.MouseEvent) => {
    if (location.pathname === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      e.preventDefault();
      navigate("/");
      window.scrollTo({ top: 0 });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" onClick={handleLogoClick} className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">Yoho-Books</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">Log in</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm">Start Free <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-24 md:py-32">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-medium mb-6">
            <Shield className="h-3 w-3" />
            Trusted by 1,000+ Indian businesses
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight max-w-3xl mx-auto">
            Modern Accounting for Growing Businesses
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Invoices, GST, reconciliation — all in one place. Built for Indian businesses that move fast.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/signup">
              <Button size="lg" className="h-12 px-8 text-base">
                Start Free <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" size="lg" className="h-12 px-8 text-base">
                View Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-muted/30">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-medium text-primary mb-2">Everything you need</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Powerful tools, simple interface
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <div key={f.title} className="bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow">
                <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center mb-4">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16 border-y border-border">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 text-center">
            <div>
              <p className="text-3xl font-bold">1,000+</p>
              <p className="text-sm text-muted-foreground">Businesses</p>
            </div>
            <div>
              <p className="text-3xl font-bold">50,000+</p>
              <p className="text-sm text-muted-foreground">Invoices generated</p>
            </div>
            <div>
              <p className="text-3xl font-bold">₹10Cr+</p>
              <p className="text-sm text-muted-foreground">Tracked revenue</p>
            </div>
            <div className="flex items-center gap-1">
              {[1,2,3,4,5].map(i => (
                <Globe key={i} className="h-4 w-4 text-primary" />
              ))}
              <p className="text-sm text-muted-foreground ml-2">4.9 rating</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-medium text-primary mb-2">Simple pricing</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Start free, upgrade when you're ready
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`rounded-xl border p-8 ${
                  tier.highlighted
                    ? "border-primary shadow-lg ring-1 ring-primary/20"
                    : "border-border"
                }`}
              >
                <h3 className="font-semibold text-lg">{tier.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{tier.desc}</p>
                <div className="mt-6">
                  <span className="text-4xl font-bold">{tier.price}</span>
                  <span className="text-muted-foreground">{tier.period}</span>
                </div>
                <Link to="/signup">
                  <Button
                    className="w-full mt-6"
                    variant={tier.highlighted ? "default" : "outline"}
                  >
                    {tier.cta}
                  </Button>
                </Link>
                <ul className="mt-6 space-y-3">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <Link to="/" onClick={handleLogoClick} className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
              <Zap className="h-3 w-3 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm">Yoho-Books</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <Link to="/login" className="hover:text-foreground transition-colors">Login</Link>
          </nav>
          <p className="text-xs text-muted-foreground">© 2026 Yoho-Books. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
