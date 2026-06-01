export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-900 via-blue-900 to-blue-950 px-4 py-8">
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}
