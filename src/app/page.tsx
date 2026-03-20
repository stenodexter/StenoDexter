import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
      <div className="container flex flex-col items-center justify-center gap-10 px-4 py-16">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
          Welcome to Steno Dexter
        </h1>
        <p className="max-w-xl text-center text-lg text-white/80">
          This Landing Page will be changed.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link
            href="/user"
            className="rounded-xl bg-white/10 px-8 py-3 text-center text-lg font-semibold hover:bg-white/20"
          >
            User space
          </Link>
          <Link
            href="/admin"
            className="rounded-xl border border-white/30 px-8 py-3 text-center text-lg font-semibold hover:bg-white/10"
          >
            Admin space
          </Link>
        </div>
      </div>
    </main>
  );
}
