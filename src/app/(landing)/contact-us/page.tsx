import { Mail, Phone, MapPin } from "lucide-react";
import { adminInfo } from "~/components/utils/comms/info";

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
            Have a question, feedback or need support? We&apos;d love to hear
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
              value: adminInfo.email,
              action: {
                label: "Send Email",
                href: `https://mail.google.com/mail/?view=cm&fs=1&to=${adminInfo.email}`,
              },
            },
            {
              icon: Phone,
              title: "Phone",
              value: adminInfo.phone,
            },
            {
              icon: MapPin,
              title: "Office",
              value: adminInfo.office,
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

                <p className="text-primary mb-4 font-mono text-sm">
                  {contact.value}
                </p>

                {contact.action ? (
                  <a
                    href={contact.action.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-secondary text-secondary-foreground inline-block rounded-md px-4 py-2 text-sm font-medium transition hover:opacity-90"
                  >
                    {contact.action.label}
                  </a>
                ) : (
                  <p className="text-muted-foreground text-xs">
                    {contact.description}
                  </p>
                )}
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
            {[
              {
                name: "YouTube",
                href: "https://youtube.com/",
              },
            ].map((social) => (
              <a
                key={social.name}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="border-border hover:bg-muted rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
              >
                {social.name}
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
