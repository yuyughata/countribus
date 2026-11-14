import { SiteFooter, SiteHeader } from "@/components/marketing/site-chrome";
import { getCurrentAgreement } from "@/features/agreements/queries";

export const metadata = { title: "Boarding policy" };

function paras(body: string) {
  return body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export default async function BoardingPolicyPage() {
  const agreement = await getCurrentAgreement("boarding").catch(() => null);
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl space-y-6 px-4 py-10 sm:px-6">
        <div>
          <span className="inline-flex items-center gap-3">
            <span className="rule-gold" />
            <span className="text-accent-strong text-[11px] font-semibold tracking-widest uppercase">
              Travel with confidence
            </span>
          </span>
          <h1 className="font-display text-foreground mt-2 text-3xl font-semibold tracking-tight">
            Boarding policy
          </h1>
          {agreement && (
            <p className="text-subtle mt-1 text-xs">
              Version {agreement.version} · updated{" "}
              {new Date(agreement.published_at).toLocaleDateString("en-NG")}
            </p>
          )}
        </div>

        {!agreement ? (
          <p className="text-muted text-sm">The boarding policy will be published shortly.</p>
        ) : (
          <div className="space-y-6">
            {agreement.content.map((c, i) => (
              <section key={i}>
                <h2 className="text-foreground text-lg font-semibold">
                  {i + 1}. {c.title}
                </h2>
                <div className="text-muted mt-2 space-y-2 text-sm leading-relaxed">
                  {paras(c.body).map((p, j) => (
                    <p key={j}>{p}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
