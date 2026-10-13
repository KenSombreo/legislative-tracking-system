import Link from "next/link";
import { TRACKING_STAGES } from "../../../lib/tracking";

// Plain-language explanation of each tracker step. Legal references are to the Local Government Code (RA 7160).
const DETAIL: Record<(typeof TRACKING_STAGES)[number]["key"], string> = {
  FILED:
    "A Sangguniang Bayan member files a proposed ordinance or resolution with the SB Secretary. It is given a number and read in session for the first time, then referred to the proper committee.",
  COMMITTEE:
    "The committee studies the measure, invites the offices concerned, and may hold a public hearing where residents and groups can give their views. It then reports back to the Sanggunian with its recommendation.",
  SECOND_READING:
    "The full Sanggunian discusses the measure on the floor. Members may ask questions and propose amendments.",
  THIRD_READING:
    "The final version is read and put to a vote. If a majority votes in favor, the ordinance is enacted or the resolution is adopted.",
  LCE_APPROVAL:
    "An enacted ordinance goes to the Municipal Mayor, who signs it or returns it with a veto. If the Mayor does not act within 10 days, it is considered approved. The Sanggunian can override a veto with a two-thirds vote of all its members (Sec. 54).",
  SP_REVIEW:
    "Within 3 days after approval, the ordinance is sent to the Sangguniang Panlalawigan of Southern Leyte for review. If the SP does not act within 30 days, it is presumed consistent with law (Sec. 56).",
  EFFECTIVE:
    "The ordinance is posted at the Municipal Hall and in other public places. Unless it says otherwise, it takes effect 10 days after posting (Sec. 59).",
};

export default function HowALawIsMadePage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-3xl font-semibold">How a law is made</h1>
        <p className="pub-muted mt-2 max-w-3xl text-lg">
          Local laws of Liloan are called <strong>ordinances</strong>. The Sangguniang Bayan also adopts{" "}
          <strong>resolutions</strong>, which state the body&apos;s position or act on a specific matter (for example,
          endorsing an application or asking an agency to act). Every measure on this portal shows which of these steps it has
          reached.
        </p>
      </header>

      <ol className="space-y-3" aria-label="Steps in passing an ordinance">
        {TRACKING_STAGES.map((s, i) => (
          <li key={s.key} className="pub-card flex gap-4">
            <span
              aria-hidden
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sb-800 text-lg font-bold text-white"
            >
              {i + 1}
            </span>
            <div>
              <h2 className="text-xl font-semibold">
                <span className="sr-only">Step {i + 1}: </span>
                {s.label}
              </h2>
              <p className="pub-muted mt-1 text-lg">{DETAIL[s.key]}</p>
            </div>
          </li>
        ))}
      </ol>

      <section className="pub-card">
        <h2 className="text-xl font-semibold">How you can take part</h2>
        <ul className="mt-2 list-disc space-y-1 pl-6 text-lg">
          <li>
            Attend a{" "}
            <Link href="/public/sessions" className="pub-link">
              regular session or committee hearing
            </Link>
            . Sessions are open to the public.
          </li>
          <li>
            Talk to a{" "}
            <Link href="/public/members" className="pub-link">
              council member
            </Link>{" "}
            about a measure you care about.
          </li>
          <li>
            <Link href="/public/request" className="pub-link">
              Request a copy
            </Link>{" "}
            of any ordinance or resolution, including certified true copies.
          </li>
        </ul>
      </section>
    </div>
  );
}
