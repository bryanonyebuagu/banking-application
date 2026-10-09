export const metadata = { title: "Privacy notice" };

export default function PrivacyPage() {
  return <main id="main-content" className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
    <h1 className="text-4xl font-semibold">Privacy notice</h1>
    <p className="mt-3 text-sm text-muted">Effective October 9, 2026</p>
    <div className="mt-8 space-y-7 leading-7 text-muted">
      <section><h2 className="text-xl font-semibold text-ink">Development use</h2><p className="mt-2">Chaze Bank is a development portfolio application. Do not provide real government identifiers, banking credentials, card numbers, financial documents or other sensitive financial information.</p></section>
      <section><h2 className="text-xl font-semibold text-ink">Account information</h2><p className="mt-2">The application uses Supabase to authenticate email addresses and passwords. Application profile data and synthetic account activity are stored for the signed-in experience. Passwords are handled by Supabase Auth and are not stored in Chaze Bank application tables.</p></section>
      <section><h2 className="text-xl font-semibold text-ink">Operational data</h2><p className="mt-2">Security events, sessions and support messages may be retained to operate and protect the application. Logs are designed to exclude passwords, authentication tokens and full sensitive payloads.</p></section>
      <section><h2 className="text-xl font-semibold text-ink">No sale of data</h2><p className="mt-2">The project does not sell personal information. Infrastructure providers process limited information required to host the application, authenticate users and deliver transactional email.</p></section>
      <section><h2 className="text-xl font-semibold text-ink">Contact</h2><p className="mt-2">Use the public Contact page for general project questions. Signed-in users can use secure support for account-specific application issues. Never include passwords or verification codes.</p></section>
    </div>
  </main>;
}
