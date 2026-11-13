# Business model, willingness to pay and unit economics for a Dutch "potjes" budgeting app (18-30)

Research date: 2026-10-09. Prices in USD where the source only gives USD; EUR conversions marked as estimates (~0.92 EUR/USD, an assumption). Where no source could be found, items are under "Gaps" or explicitly marked **[ESTIMATE]**.

## 1. Willingness to pay: prices and conversion rates of budgeting/finance apps

### Takeaway
Pure budgeting apps that charge do so at about $8-15/month or $35-110/year. Freemium apps convert a median of only ~2% of downloads to paid, versus ~10.7% for hard-paywall apps (RevenueCat 2026). Young adults do pay for app subscriptions (77% of US 18-29s have at least one). No NL-specific survey on young people paying for finance apps was found.

### Cited Findings
- YNAB costs $14.99/month or $109/year, with a 34-day free trial (2025). — [Nasdaq 2025](https://www.nasdaq.com/articles/top-4-apps-automate-your-finances-and-save-time-2025); [App Store](https://apps.apple.com/app/id1010865877)
- YNAB's price "has continued to gradually increase over the years without major new features" (Feb 2025 review). — [Fortune](https://fortune.com/article/ynab-pros-and-cons)
- Copilot Money (US) is paid only, with no ads: $95/year or $13/month. — [App Store](https://apps.apple.com/us/app/-/id1447330651)
- Emma (UK) is freemium with a paid "Emma Pro" tier: custom categories, export, manual accounts and split transactions. A 2026 Trustpilot complaint mentions an £83.99 annual charge. Subscriber and revenue numbers are not public. — [TechCrunch](https://techcrunch.com/?p=1734137); [Trustpilot](https://it.trustpilot.com/review/emma-app.com)
- Dyme (NL, holds its own PSD2 licence from DNB since 2019) is free with in-app purchases. "Dyme Silver" covers cancelling subscriptions and "Dyme Gold" covers budgets and savings goals; prices are not listed in the store snippet. It reportedly had 350,000 registered users in 2021. — [App Store NL](https://apps.apple.com/nl/app/dyme-budget-geld-kasboek/id1438647102); [Wikipedia](https://en.wikipedia.org/wiki/Dyme_(company))
- RevenueCat State of Subscription Apps 2026 (115k apps, $16B+ revenue):
  - Median download-to-paid conversion is **2.1% for freemium** and **10.7% for hard paywalls** (top 10% of hard-paywall apps: 38.7%); North America 2.8%.
  - Revenue per install at day 60: $3.09 hard paywall vs **$0.38 freemium**.
  - Trial-to-paid: 42.5% for 17-32-day trials vs 25.5% for trials of 4 days or fewer. 55% of 3-day trial cancellations happen on day 0.
  - Median annual price is $34.80. Common price points are $7.99-9.99/month and $29.99-39.99/year.
  - Western Europe annual payer LTV is $26.64, and Western Europe lags on trial conversion.
  - Only 17.3% of new apps reach $1K MRR within two years, and 4.6% reach $10K MRR.
  - Google Play involuntary churn is ~31% of cancellations (iOS 14%).
  - Source: [SaaStr summary of RevenueCat 2026](https://www.saastr.com/the-top-10-learnings-from-revenuecats-state-of-subscription-apps-how-115000-mobile-apps-deliver-16b-in-revenue-whats-working-whats-quietly-killing-growth)
- 70% of subscription apps offer free trials (2025, up from 60% in 2023). — [SaaStr on RevenueCat 2025](https://www.saastr.com/of-trials-start-on-day-0-dont-waste-your-shot)
- RevenueCat 2024: most subscription apps don't make meaningful money. — [TechCrunch 2024](https://techcrunch.com/2024/03/12/most-subscription-mobile-apps-dont-make-money-new-report-shows/)
- YouGov (July 2025, US, n≈1,000): 65% of adults pay for at least one app subscription, rising to **77% among 18-29-year-olds**. — reported via search summary of [eMarketer](https://www.emarketer.com/content/most-americans-pay-mobile-apps) (secondary)
- Global consumer app spending was $155.8B in 2025 (+21.6%), while downloads fell for the fifth year running to 106.9B. — [TechCrunch Jan 2026](https://techcrunch.com/2026/01/14/app-downloads-declined-again-in-2025-but-consumer-spending-soared-to-nearly-156b)

### Inferences
- A realistic paid price for a Dutch app for 18-30s is **€2.99-4.99/month or €24.99-39.99/year**, below YNAB and Copilot, which target older, higher-income US users. Western European LTV per payer (~$27/year) supports this range.
- With freemium at a ~2% (0.7-4%) download-to-paid rate, revenue per *active* user averaged over all users is roughly €0.05-0.15/month **[ESTIMATE]**: for example, 3% of actives paying €3.50/month net of a 15% store fee comes to ~€0.09 per active user per month.
- The product's "manual sorting" ritual is engagement-heavy. That is good for retention but makes a hard paywall risky for a student audience. A long trial (14-30 days, which converts better per RevenueCat) followed by a paywall on the PSD2 bank sync is the most defensible design.

### Gaps
- There are no public conversion rates specific to YNAB, Emma, Spendee, Snoop, Plum or Monefy. These companies do not disclose them, so RevenueCat category medians are the best proxy. Snoop, Plum, Spendee and Monefy prices were not verified in this session.
- No Dutch survey (Nibud, CBS, Deloitte Global Mobile Consumer Survey NL) on young people paying for finance apps was found. Nibud data on young adults' finances exists but was not retrieved.
- The finance-category breakdown of RevenueCat conversion was not available in the summary.

## 2. Alternative business models

### Takeaway
For a small Dutch team, the most realistic models are (a) freemium with paid bank sync or premium features, and (b) B2B2C licences to municipalities, debt-help organisations, universities and employers, who already buy financial-wellbeing services. Affiliate and lead-gen for credit sits poorly with the target group and is regulated. Selling data is effectively excluded by GDPR and the PSD2 purpose limits.

### Cited Findings
- Comparable apps mix models. Dyme combines a subscription with savings on cancelled or renegotiated contracts (it claims €800/year average saving; that is a company claim). — [Wikipedia: Dyme](https://en.wikipedia.org/wiki/Dyme_(company))
- Emma monetises through Pro subscriptions and has raised VC funding (a $2.5M seed led by Connect Ventures, reported 2020). — [TechCrunch](https://techcrunch.com/?p=1953647); [CB Insights](https://www.cbinsights.com/company/emma-technologies/people)
- Dutch municipalities publicly tender debt-help services (schuldhulpverlening), e.g. Epe and Amsterdam. That shows the budget line exists, but the tenders found were for service providers, not apps. — [TED notice](https://ted.europa.eu/en/notice/274518-2022/pdf); [TED notice](https://ted.europa.eu/en/notice/670063-2023/pdf)
- The London borough of Tower Hamlets offers residents a free app that rewards paying bills on time, an example of local government funding consumer money apps (UK, 2024). — [Tower Hamlets](https://www.towerhamlets.gov.uk/News_events/2024/September/Free-app-that-rewards-customers-for-paying-bills-on-times-aims-to-save-users-millions.aspx)
- Hard-paywall apps earn ~8x more per install than freemium apps (day-60 RPI $3.09 vs $0.38), which argues for gating the costly feature (bank sync) behind payment. — [SaaStr/RevenueCat 2026](https://www.saastr.com/the-top-10-learnings-from-revenuecats-state-of-subscription-apps-how-115000-mobile-apps-deliver-16b-in-revenue-whats-working-whats-quietly-killing-growth)

### Inferences (not directly sourced; reasoning from general regulatory knowledge, verify before use)
- **Affiliate/lead-gen.** Savings accounts and energy or phone switching are relatively benign. Referring consumer credit, BNPL or insurance in NL is a regulated intermediary activity (Wft: AFM licence or exemption, duty-of-care rules), and pushing credit to 18-30s conflicts with a budgeting app's mission and reputation. Treat it as low-value and high-risk.
- **B2B2C / white label.** Possible buyers are municipalities (early detection and prevention of debt), universities and hogescholen (student wellbeing), employers (financial-wellbeing benefit) and banks (youth propositions). This model avoids App Store fees and shifts the PSD2 cost to the buyer. Sales cycles are long, and public procurement thresholds and DPIAs apply.
- **Bank sponsorship.** It is possible, but it undermines neutrality, and banks increasingly build their own budgeting tools.
- **Data monetisation.** Under GDPR, transaction data reveals special-category signals (health, religion, union membership via payments) and needs a specific legal basis. PSD2 Art. 66/67 limits AISPs to using data for the service the user requested. Enable Banking terms also restrict use. Selling or sharing data is effectively off the table, and anonymised aggregate insights still carry re-identification risk and reputational risk with this audience.

### Gaps
- No public pricing was found for B2B2C financial-wellbeing licences in NL (e.g. per-resident or per-employee fees). Searches for Dutch municipal budget-app licences returned nothing usable.
- Specific AFM guidance on comparison or affiliate apps was not retrieved in this session.

## 3. Bank data access pricing: Enable Banking and alternatives

### Takeaway
Enable Banking does **not publish a per-account price**. Pricing is volume-based (accounts accessed plus payments per month) with a **monthly minimum invoice**, and it is quoted via sales (a "Get a Quote" tool launched March 2026). Restricted production mode (your own linked accounts) is free. GoCardless Bank Account Data (formerly Nordigen) stopped accepting new signups around July 2025. Tink, Yapily, TrueLayer and Salt Edge are all sales-quoted, so Enable Banking is currently the most accessible self-serve EU option.

### Cited Findings
- Enable Banking FAQ: "The cost depends on the number of accounts accessed and payments made per month." There is a **monthly minimum invoice** covering a set number of accounts and payments, and quotes come from info@enablebanking.com. You can use mock and production environments before signing a contract, but you can't release publicly until a contract and KYB are done. Restricted production mode works only for accounts you link yourself. — [Enable Banking FAQ](https://enablebanking.com/docs/faq/)
- In March 2026 Enable Banking launched a "Get a Quote" tool for onboarding and pricing. It lists no public price table, and enablebanking.com/pricing returns 404. — [enablebanking.com](https://enablebanking.com/)
- Third-party descriptions: "simple pricing based on number of accounts being accessed", and accounts linked via the control panel are free. — [StackShare](https://stackshare.io/fuse-api/vs/tilisy-api). A user reports "free usage for personal accounts". — [Firefly III issue #10753](https://github.com/firefly-iii/firefly-iii/issues/10753)
- GoCardless Bank Account Data: from July 2025 GoCardless stopped accepting new Bank Account Data accounts, while existing users continue. — [Actual Budget docs](https://actualbudget.org/docs/advanced/bank-sync/gocardless/). Free tier wound down through 2025 and existing free users migrated to paid pricing. — [DEV Community](https://dev.to/johnfrandsen/self-hosted-bank-account-aggregation-in-2026-after-the-nordigen-free-tier-shutdown-3mdo). A user report says GoCardless support stated the API will be "only available to enterprise customers" (unconfirmed). — [Invoice Ninja forum](https://forum.invoiceninja.com/t/gocardless-nordigen-service-no-longer-available-alternative-needed/22576). The gocardless.com/pricing page shows only payments pricing. — [GoCardless pricing](https://gocardless.com/pricing/)
- Enable Banking is named the closest self-serve European replacement for GoCardless/Nordigen. — [Open Banking Tracker guide (search snippet)](https://www.openbankingtracker.com/guides/free-open-banking-apis); [DEV Community](https://dev.to/johnfrandsen/gocardless-bank-account-data-alternatives-what-to-use-when-signups-are-disabled-326d)
- Tink: Standard plan is "Contact us", Enterprise is custom, and no EUR prices are published. — [Tink pricing](https://tink.com/pricing/)
- Cert-free aggregation APIs for hobbyists cost roughly €3-15/month (a single-user, self-hosted context, and the author sells one of them). A self-hosted eIDAS QWAC certificate route costs ~€3,000-15,000/year plus licence overhead. — [DEV Community](https://dev.to/johnfrandsen/self-hosted-bank-account-aggregation-in-2026-after-the-nordigen-free-tier-shutdown-3mdo)

### Inferences
- The founder's offer ("first two months free, then pay per connected account") matches the FAQ model. The standard per-account rate and the minimum invoice must be obtained via the quote tool or from sales. **They are not public as of Oct 2026.**
- For modelling, use scenarios **[ESTIMATE, unsourced]**: €0.10 / €0.30 / €0.60 / €1.00 per connected account per month, plus a monthly minimum (assume €100-500/month for planning). With ~1.3 accounts per user (current account plus a savings or partner account), PSD2 cost per active linked user is €0.13-1.30/month.
- Unlike Plaid in the US, EU PSD2 consent must be renewed periodically (historically 90 days, extended to 180 days under the 2023 RTS amendment), so an account may "count" even when the user is inactive. Negotiate billing on *active, consented* accounts only, and drop dormant consents.

### Gaps
- No public per-account price for Enable Banking, Tink, Yapily, TrueLayer, Salt Edge or Plaid EU. All are sales-quoted. The Open Banking Tracker comparison page was rate-limited (HTTP 429) and could not be read in full.
- Salt Edge, Yapily, TrueLayer and Plaid EU pages were not fetched in this session.

## 4. Infrastructure cost per user and unit-economics sketch

### Takeaway
Hosting (Supabase plus Vercel) is a near-fixed ~€45-60/month up to tens of thousands of users, i.e. cents per user. The **PSD2 per-account fee dominates** variable cost. At freemium conversion rates (~2-4%), free users with bank sync are likely loss-making, so bank sync should sit behind payment, or be paid for by a B2B2C client.

### Cited Findings
- Supabase Pro costs $25/month and includes:
  - 100,000 MAU, then $0.00325 per MAU
  - 8 GB database, then $0.125/GB
  - 250 GB egress, then $0.09/GB
  - 2M Edge Function invocations, then $2 per million
  - $10 compute credit (one Micro instance)
  - The Free tier allows 50k MAU and 500 MB of database, and projects pause after one week of inactivity, so it is unsuitable for production.
  - Source: [Supabase pricing](https://supabase.com/pricing)
- Vercel Pro is $20 per member per month. Overage reported as $0.15/GB bandwidth and $0.40 per million invocations (third-party, unverified). — [G2](https://www.g2.com/products/Vercel/reviews); [DEV Community](https://dev.to/focusreactive/how-to-optimize-vercel-costs-bd)
- Apple and Google take 15% on subscriptions for small developers (Small Business Program; Play's 15% subscription rate) **[general knowledge, not fetched this session]**. RevenueCat reports ~31% of Google Play cancellations are involuntary churn. — [SaaStr/RevenueCat](https://www.saastr.com/the-top-10-learnings-from-revenuecats-state-of-subscription-apps-how-115000-mobile-apps-deliver-16b-in-revenue-whats-working-whats-quietly-killing-growth)

### Inferences: unit-economics sketch **[ESTIMATE, all numbers illustrative]**
Assumptions:
- 1,000 monthly active users (MAU), 1.3 linked accounts each.
- Supabase Pro (incl. Micro instance) ≈ €25, Vercel Pro (1 seat) ≈ €19, Web Push (free via Web Push/VAPID; FCM is free). Domain, email and monitoring ≈ €10.
- Fixed infra ≈ **€55/month, so ≈ €0.055/user at 1k MAU and ≈ €0.006 at 10k MAU**.
- Enable Banking at €0.30/account → ≈ €0.39/user/month, subject to the monthly minimum.

| Scenario (per active user/month) | PSD2 cost | Infra | Total cost | Revenue needed to break even |
|---|---|---|---|---|
| Low (€0.10/acct, 10k MAU) | €0.13 | €0.01 | ~€0.14 | ~4% paying at €3.99 (net ~€3.39) |
| Mid (€0.30/acct, 1k MAU) | €0.39 | €0.06 | ~€0.45 | ~13% paying at €3.99 |
| High (€1.00/acct, 1k MAU) | €1.30 | €0.06 | ~€1.36 | ~40% paying, so not viable for freemium |

- At the freemium median (~2% download-to-paid, perhaps 5-10% of *engaged* MAU), giving bank sync free to everyone only breaks even at low per-account prices. Viable options:
  - **(a)** Paid tier includes bank sync (e.g. €3.99/month or €29.99/year). The free tier uses manual entry or CSV import, or a time-limited sync trial (14-30 days).
  - **(b)** Hard paywall after a long trial. RevenueCat median conversion is 10.7%, and at €3.99 each paying user covers the PSD2 cost of ~8-25 free users depending on the per-account price.
  - **(c)** B2B2C: a municipality, university or employer pays per seat (e.g. €1-3 per user per month, **[ESTIMATE]**), covering PSD2 cost plus margin.
- Cost-control levers:
  - Bill only for accounts that are actually consented.
  - Let users link just their main current account.
  - Fetch transactions once a day instead of on every open. This doesn't change per-account fees but limits rate-limit and compute costs.
  - Expire inactive users' consents.
  - Negotiate a startup tier and the size of the minimum invoice.
- Payments friction: web (Stripe/Mollie, ~1.5-3% + fixed fee incl. iDEAL) avoids the 15% store cut, and a PWA can sell outside the stores. RevenueCat notes web revenue is still a small share (3.2% globally).

### Gaps
- Actual Enable Banking per-account rate and minimum invoice (request a quote; the founder's own offer letter is the best source).
- Vercel Pro included function usage could not be confirmed from an official page.
- Mollie/Stripe NL fees and App Store small-business rates were not fetched in this session. Verify them before the final report.
