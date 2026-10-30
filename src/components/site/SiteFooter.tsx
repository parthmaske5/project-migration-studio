import { Facebook, Instagram, Linkedin, Youtube } from "lucide-react";
import { Logo, navLinks } from "./SiteHeader";

const company = ["About", "Contact", "FAQs", "Terms", "Privacy", "Refund Policy"];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-secondary/50">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-4 max-w-sm text-muted-foreground">A friendly marketplace connecting students, parents, tutors, creators and freelancers.</p>
          <div className="mt-5 flex gap-2">
            {[Facebook, Instagram, Linkedin, Youtube].map((Icon, i) => (
              <a key={i} href="/" aria-label="Social link" className="grid size-10 place-items-center rounded-full bg-card text-primary shadow-soft hover:bg-primary hover:text-primary-foreground">
                <Icon className="size-4" />
              </a>
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-bold">Marketplace</h4>
          <ul className="mt-4 space-y-2 text-muted-foreground">
            {navLinks.slice(1).map((l) => <li key={l.label}><a href={l.href} className="hover:text-primary">{l.label}</a></li>)}
          </ul>
        </div>
        <div>
          <h4 className="font-bold">Company</h4>
          <ul className="mt-4 space-y-2 text-muted-foreground">
            {company.map((c) => <li key={c}><a href={c === "FAQs" ? "/#faq" : "/"} className="hover:text-primary">{c}</a></li>)}
          </ul>
        </div>
      </div>
      <p className="border-t border-border py-6 text-center text-sm text-muted-foreground">© {new Date().getFullYear()} PUPUK Education. All rights reserved.</p>
    </footer>
  );
}
