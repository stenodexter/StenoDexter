import { Mail, Phone } from "lucide-react";
import { adminInfo } from "~/components/utils/comms/info";

export default function DemoPage() {
  return (
    <div className="container mx-auto mt-[180px] min-h-[60vh] max-w-2xl px-4 text-center">
      {" "}
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Book a Demo</h1>

        <p className="text-muted-foreground">
          Want to explore how Steno Dexter works before enrolling? Get in touch
          with us to schedule a demo session.
        </p>

        <div className="bg-card border-border space-y-4 rounded-lg border p-6 text-left">
          <p className="font-medium">Contact us:</p>

          <div className="flex items-center gap-3">
            <Phone className="text-primary h-4 w-4" />
            <span>{adminInfo.phone}</span>
          </div>

          <div className="flex items-center gap-3">
            <Mail className="text-primary h-4 w-4" />
            <a
              href={`https://mail.google.com/mail/?view=cm&fs=1&to=${adminInfo.email}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              {adminInfo.email}
            </a>
          </div>
        </div>

        <p className="text-muted-foreground text-sm">
          We usually respond within a few hours.
        </p>
      </div>
    </div>
  );
}
