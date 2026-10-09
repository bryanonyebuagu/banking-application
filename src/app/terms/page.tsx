export const metadata = { title: "Terms of use" };

export default function TermsPage() {
  return <main id="main-content" className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
    <h1 className="text-4xl font-semibold">Terms of use</h1>
    <p className="mt-3 text-sm text-muted">Effective October 9, 2026</p>
    <div className="mt-8 space-y-7 leading-7 text-muted">
      <section><h2 className="text-xl font-semibold text-ink">Portfolio application</h2><p className="mt-2">This application is provided to demonstrate software design and engineering. It is not a bank or financial-services provider, and nothing displayed is an offer of a deposit account, credit product, investment, payment service or financial advice.</p></section>
      <section><h2 className="text-xl font-semibold text-ink">Synthetic activity</h2><p className="mt-2">Balances, account identifiers, transactions, statements, cards, loans and investments shown in the application are synthetic records. They have no monetary value and cannot be used outside the application.</p></section>
      <section><h2 className="text-xl font-semibold text-ink">Permitted information</h2><p className="mt-2">Use only information appropriate for a development application. Do not upload real checks, identity documents or financial records, and do not reuse a password from another service.</p></section>
      <section><h2 className="text-xl font-semibold text-ink">External providers</h2><p className="mt-2">Payment and banking-provider screens describe future integration boundaries. No external payment rail is active unless the application explicitly identifies an approved provider connection.</p></section>
      <section><h2 className="text-xl font-semibold text-ink">Availability</h2><p className="mt-2">The application may change or become unavailable during development. Do not rely on it to store value, make payments or preserve records needed outside the demonstration.</p></section>
    </div>
  </main>;
}
