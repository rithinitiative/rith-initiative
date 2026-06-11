import { Link } from "react-router-dom";
import { Facebook, Instagram, Mail } from "lucide-react";
import footerLogo from "@/assets/footer-logo.png";

const footerLinks = {
  navigation: [
    { href: "/", label: "Home" },
    { href: "/about", label: "About" },
    { href: "/projects", label: "Projects" },
    { href: "/events", label: "Events" },
    { href: "/blogs", label: "Blogs" },
    { href: "/shop", label: "Shop" },
    { href: "/donate", label: "Donate" },
    { href: "/contact", label: "Contact" },
    { href: "/admin/login", label: "Admin", rel: "nofollow" },
  ],
  social: [
    { icon: Instagram, href: "https://instagram.com/rithinitiative", label: "Instagram" },
    { icon: Facebook, href: "https://www.facebook.com/p/The-Rith-Initiative-61580213405598/", label: "Facebook" },
  ],
};

export function Footer() {
  return (
    <footer className="bg-foreground text-background">
      <div className="container-wide section-padding">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-3 mb-6">
              <img 
                src={footerLogo} 
                alt="The Rith Initiative Logo" 
                className="w-12 h-12 object-contain"
                loading="lazy"
                decoding="async"
              />
              <span className="font-heading text-xl font-semibold">
                The Rith Initiative
              </span>
            </Link>
            <p className="text-background/70 max-w-md mb-6 leading-relaxed">
              A 501(c)(3) nonprofit organization dedicated to sharing and preserving Indian culture 
              through community events, arts, and cultural programming in Virginia.
            </p>
            <div className="flex gap-4">
              {footerLinks.social.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center transition-all hover:bg-primary hover:scale-110"
                  aria-label={social.label}
                >
                  <social.icon size={18} />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-heading text-lg font-semibold mb-6">Quick Links</h4>
            <ul className="space-y-3">
              {footerLinks.navigation.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    rel={link.rel}
                    className="text-background/70 hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-heading text-lg font-semibold mb-6">Get in Touch</h4>
            <div className="space-y-4 text-background/70">
              <a
                href="mailto:rithinitiative@gmail.com"
                className="flex items-center gap-2 hover:text-primary transition-colors"
              >
                <Mail size={16} />
                rithinitiative@gmail.com
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-background/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-background/50 text-sm">
            © {new Date().getFullYear()} The Rith Initiative. All rights reserved.
          </p>
          <p className="text-background/50 text-sm">
            501(c)(3) Nonprofit Organization
          </p>
        </div>
      </div>
    </footer>
  );
}
