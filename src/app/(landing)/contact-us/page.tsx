import { Mail, Phone, MapPin } from "lucide-react";

export default function ContactUs() {
  return (
    <div className="space-y-16 py-12 md:py-20">
      {/* Hero Section */}
      <section className="container mx-auto mt-[60px] px-4">
        <div className="mx-auto max-w-3xl space-y-6 text-center">
          <h1 className="text-logo text-4xl font-bold tracking-tight sm:text-5xl">
            Get In Touch
          </h1>
          <p className="text-muted-foreground text-lg">
            Have a question, feedback, or need support? We&apos;d love to hear
            from you. Our team is ready to help.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Mail,
              title: "Email",
              value: "support@stenodexter.com",
              description: "We respond within 24 hours",
            },
            {
              icon: Phone,
              title: "Phone",
              value: "+91 xxx-xxxx-xxx",
              description: "Mon-Fri, 9 AM - 6 PM EST",
            },
            {
              icon: MapPin,
              title: "Office",
              value: "Jaipur, Rajasthan, India",
              description: "Head office location",
            },
          ].map((contact, idx) => {
            const Icon = contact.icon;
            return (
              <div
                key={idx}
                className="border-border bg-card rounded-lg border p-6 text-center transition-shadow hover:shadow-lg"
              >
                <Icon className="text-primary mx-auto mb-4 h-8 w-8" />
                <h3 className="mb-2 font-semibold">{contact.title}</h3>
                <p className="text-primary mb-2 font-mono text-sm">
                  {contact.value}
                </p>
                <p className="text-muted-foreground text-xs">
                  {contact.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Social Links */}
      <section className="container mx-auto px-4">
        <div className="border-border bg-card mx-auto max-w-2xl rounded-lg border p-8 text-center">
          <h2 className="mb-4 text-2xl font-bold">Follow Us</h2>
          <p className="text-muted-foreground mb-6">
            Stay updated with the latest news and announcements
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {["Twitter", "Facebook", "LinkedIn", "Instagram", "YouTube"].map(
              (social) => (
                <button
                  key={social}
                  className="border-border hover:bg-muted rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
                >
                  {social}
                </button>
              ),
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
