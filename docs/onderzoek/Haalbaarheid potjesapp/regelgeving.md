# Regelgeving: Dutch PFM app using Enable Banking (PSD2 AIS), pilot and NL launch

Status: research notes as of 2026-10-09. This is not legal advice. Items marked UNVERIFIED or listed under Gaps should be confirmed with Enable Banking and/or a Dutch fintech/privacy lawyer.

## 1. Who needs to be a registered AISP, and can the founder operate under Enable Banking's licence?

### Takeaway
DNB's own Q&A says that a party that only *processes* data (for example categorising it) that a licensed AISP retrieved under the user's own AIS contract falls outside PSD2 and needs no licence. The EBA/Commission Q&A also lets an AISP pass consolidated data to a third party with the user's explicit agreement. Enable Banking Oy is a FIN-FSA-registered AISP and offers a "partner setup" to customers without their own licence. So operating without a DNB licence looks feasible, provided the contract and consent flow make Enable Banking the AIS provider to the end user. Small-provider exemptions do NOT apply to AIS. If the founder *itself* contracts with users to provide AIS, it needs a DNB licence.

### Cited Findings
- DNB (Q&A, 12 Nov 2019): "A licence requirement applies if a party enters into a contract or agreement with an account holder" to provide an account information service. — [DNB: AIS licence requirements in cases involving outsourcing or multiple parties](https://www.dnb.nl/en/sector-information/open-book-supervision/laws-and-eu-regulations/psd2/account-information-services-licence-requirements-in-cases-involving-outsourcing-or-multiple-parties/)
- DNB, same page: a third party may process retrieved data (for example categorise it) without a licence. Such a party "will fall outside the scope of PSD2 and will not be subject to a licence requirement". The condition is that the user has a contract for account information services with the AISP that retrieves the relatively "raw" data for a specific period at the user's request. DNB refers to EBA Q&A 4098. — [DNB](https://www.dnb.nl/en/sector-information/open-book-supervision/laws-and-eu-regulations/psd2/account-information-services-licence-requirements-in-cases-involving-outsourcing-or-multiple-parties/)
- DNB, same page: a party that *retrieves* data for an AISP and has access to the user's personal payment data or a security token is presumed to have a contract with the user and needs its own licence. A purely technical transmitter without such access does not. — [DNB](https://www.dnb.nl/en/sector-information/open-book-supervision/laws-and-eu-regulations/psd2/account-information-services-licence-requirements-in-cases-involving-outsourcing-or-multiple-parties/)
- EBA Q&A 2018_4098 (final answer 13/09/2019): PSD2 does not require the AISP to provide consolidated information to the PSU itself. "The AISP may therefore transmit the consolidated information to a third party with the PSU's explicit agreement." The third party's use of that information may fall under other EU law such as the GDPR. — [EBA Q&A 2018_4098](https://www.eba.europa.eu/single-rule-book-qa/qna/view/publicId/2018_4098)
- Enable Banking Oy describes itself as a "Registered Account Information Service Provider regulated by Finnish Financial Supervisory Authority (FIN-FSA)". Its API terms say "the API relies on Enable Banking acting as an authorised AISP" and link to the EBA register. — [Enable Banking Terms](https://enablebanking.com/terms/)
- The Enable Banking API terms "do not govern your use of the API as an End User". End users accept separate "Enable Banking API Terms for End Users" at tilisy.enablebanking.com/terms. I could not render that page (JavaScript app). — [Enable Banking Terms](https://enablebanking.com/terms/)
- Enable Banking's March 2026 "Get a Quote" form asks whether the customer operates "under your own license (AISP/PISP) or require[s] a partner setup". This confirms that both a non-licensed (partner) model and a bring-your-own-licence model exist. — [Enable Banking changelog March 2026](https://enablebanking.com/blog/2026/04/08/enable-banking-changelogmarch-2026)
- Enable Banking FAQ:
  - Enable Banking can also use a licensed TPP's own eIDAS certificates (QWAC/QSealC) and then acts "as a technical service provider".
  - "Your production application will become active once you have signed a contract with Enable Banking".
  - Restricted production mode lets you "activate your production application in the restricted mode by linking your own accounts", and "only linked accounts would be accessible".
  - "By regulation, we are required to obtain explicit and informed consent from end users".
  - Enable Banking "does not store, cache, or process data for any purpose other than delivering it".
  - [Enable Banking FAQ](https://enablebanking.com/docs/faq/)
- DNB: the licence exemption (art. 1a Vrijstellingsregeling Wft) does not apply to payment services 6, 7 and 8. Service 8 is account information services, so a small-AISP exemption is not available in NL. — [DNB: Vrijstelling vergunningplicht](https://www.dnb.nl/voor-de-sector/open-boek-toezicht/sectoren/betaalinstellingen/vergunningaanvraag-betaaldiensten-overzichtspagina/vrijstelling-vergunningplicht/)
- UK FCA (comparable, non-binding for NL):
  - Agent model: the principal is "responsible for whatever services your agent does and doesn't provide". The consumer agreement must "make clear that the agent is providing AIS or PIS on your behalf".
  - A technical service provider that does not provide AIS to the consumer needs no authorisation.
  - [FCA: AISP models under PSD2](https://www.fca.org.uk/firms/agency-models-under-psd2)
- TrueLayer: an agent of an AISP "cannot provide or purport to provide account information services in its own right". — [TrueLayer blog](https://truelayer.com/blog/open-banking/data-chain-agents/)

### Inferences
- There are two possible non-licensed structures.
  - (a) "Data recipient / end user of data" model (DNB Q&A scenario 3 plus EBA 4098). The end user contracts with Enable Banking for AIS and explicitly agrees that Enable Banking passes data to the app. The app then only processes (categorises into "potjes"). Under DNB's Q&A this falls outside PSD2.
  - (b) Agent model. The app acts as Enable Banking's agent, which would require a passport notification to DNB via FIN-FSA (see section 2).
  - Model (a) seems to be what Enable Banking's standard non-licensed onboarding (the Tilisy end-user consent screens) is built around, but this is an inference. Enable Banking must confirm in writing which model applies.
- In model (a), the app's UI and terms should not claim that the app itself provides AIS. The consent screen hosted by Enable Banking, which shows Enable Banking as the AISP, is important evidence. Don't white-label or hide it.
- The DNB Q&A is from 2019 and is framed around "raw" data for a specific period. Continuous background sync (cron) is still under the AISP's consent (90/180-day validity), so it should fit. Confirm this.

### Gaps
- I could not read Enable Banking's end-user terms (tilisy.enablebanking.com/terms). I also found no public Enable Banking page that describes the "partner setup" legally: agent vs. data recipient, and which party is controller under the GDPR. **Ask Enable Banking:**
  - (1) Under the partner setup, is my company your PSD2 agent or a third-party data recipient?
  - (2) Does it require any notification to FIN-FSA/DNB?
  - (3) What are the GDPR roles (are you the controller for AIS and I the controller for my processing)? Is there a DPA or data-sharing agreement?
  - (4) Are there limits on use cases, branding or end-user count?
  - (5) Can the pilot run in restricted mode? Restricted mode only covers accounts linked by the developer, so external testers need full production.
- I found no DNB statement after 2019 that changes the 2019 Q&A.

## 2. Does a Dutch company using Enable Banking need to register/notify DNB? Pilot vs launch. PSD3/PSR and FiDA timelines

### Takeaway
DNB registration or notification is only needed if the app becomes Enable Banking's *agent*. In that case Enable Banking notifies its home regulator (FIN-FSA), and the agent appears in the home member state register and the EBA register. In the data-recipient model nothing is notified to DNB. PSD2 has no pilot exemption: a closed pilot with real bank data has the same legal position as a launch. PSD3/PSR are politically agreed but not yet in force, with application around 2027-2028. FiDA is still pending.

### Cited Findings
- DNB defines a betaaldienstagent as "een persoon die bij de uitvoering van betaaldiensten voor rekening van een betaalinstelling optreedt".
  - The agent needs AML/CFT controls and fit-and-proper policymakers.
  - The institution notifies, and a one-month notification period starts once the information is complete.
  - Agents of PSPs from another member state that are active in NL are registered "in het register van de lidstaat van herkomst van de betaaldienstverlener" and in the EBA register.
  - [DNB: Betaaldienstagent](https://www.dnb.nl/voor-de-sector/open-boek-toezicht/sectoren/betaalinstellingen/betaaldienstagent/)
- DNB: payment institutions licensed in another member state must notify DNB before starting activities through an agent in NL. Contact: infobetaalinstelling@dnb.nl. — [DNB: Grensoverschrijdende dienstverlening](https://www.dnb.nl/voor-de-sector/open-boek-toezicht/sectoren/betaalinstellingen/betaaldienstagent/betaalinstellingen-grensoverschrijdende-dienstverlening/)
- DNB: providing payment services in NL professionally without a licence or exemption is prohibited. — [DNB: Verbod zonder vergunning](https://www.dnb.nl/voor-de-sector/open-boek-toezicht/sectoren/betaalinstellingen/vergunningaanvraag-betaaldiensten-overzichtspagina/verbod-om-zonder-vergunning-actief-te-zijn-als-betaaldienstverlener/)
- PSD3/PSR timeline:
  - Provisional political agreement on 27 Nov 2025.
  - Final compromise texts published on 23 Apr 2026, with Official Journal publication expected in H2 2026.
  - The PSR enters into force 20 days after publication and applies about 21 months later (around 2027-2028).
  - Banks must offer a permissions dashboard where users can view and revoke AIS access.
  - Not yet confirmed in the OJ as of the sources found.
  - [Open Banking Tracker PSD3/PSR guide](https://www.openbankingtracker.com/guides/psd3-psr-readiness); [Worldline 2026](https://worldline.com/en/home/main-navigation/resources/blogs/2026/the-scope-and-timeline-are-locked-in-for-psd3-and-psr-what-should-psps-know); [PwC client alert April 2026](https://legal.pwc.de/content/services/regcore-client-alert/pwc-client-alert-eus-new-payments-framework-april-2026.pdf)
- The EBA's PSD3 opinion proposed that white-label arrangements where a provider acts on behalf of a PSP should fall within the agent framework. This is a policy direction, not law. — [Sidley on EBA PSD3 opinion](https://www.sidley.com/en/insights/newsupdates/2022/07/psd3-what-to-expect-based-on-the-european-banking-authority-opinion)
- FiDA (proposal 28 Jun 2023, procedure 2023/0205(COD)):
  - KPMG (2026) expects adoption later in 2026 and phased application, with the first data categories from mid/end 2027.
  - FiDA covers data beyond payment accounts: credit, savings, investments, insurance, pensions.
  - [KPMG Cyprus FiDA alert 2026](https://assets.kpmg.com/content/dam/kpmg/cy/pdf/2026/fida-alert-2026.pdf); [KPMG intro to FiDA](https://kpmg.com/cy/en/home/insights/2026/02/introduction-to-fida-understanding-the-financial-data-access-regulation.html)

### Inferences
- Payment account data stays under PSD2/PSR, not FiDA. FiDA matters only if the app later wants savings or investment data. Neither PSD3/PSR nor FiDA changes anything for the pilot or the 2026-27 launch. Monitor whether PSR finalisation tightens rules on white-label/"licence-as-a-service" (watch for the agent-framework idea above).
- Pilot vs launch: from a PSD2 perspective there is no difference, because real users, real bank data and Enable Banking production apply either way. The difference is mostly practical: GDPR documentation depth, app-store distribution and monetisation.

### Gaps
- I did not confirm whether the PSR/PSD3 texts are now in the Official Journal. Check EUR-Lex.
- There is no DNB guidance specific to "licence-as-a-service" AIS for unlicensed Dutch apps. A lawyer should confirm that model (a) holds under the Wft.

## 3. GDPR/AVG obligations

### Takeaway
The app is a controller of financial personal data, including third-party data (counterparty names and IBANs in transactions). It needs a lawful basis (contract, art. 6(1)(b), seems most fitting), a privacy statement, DPAs with processors (Supabase, Vercel), and a clear role split with Enable Banking. A DPIA is very likely advisable and probably mandatory at launch, given systematic analysis of financial behaviour, even if it is not strictly mandatory for a 10-30 person pilot.

### Cited Findings
- EBA Q&A 4098: the use by a third party of AIS data transmitted by the AISP may be governed by the GDPR. — [EBA Q&A 2018_4098](https://www.eba.europa.eu/single-rule-book-qa/qna/view/publicId/2018_4098)
- DNB: the GDPR applies to both the AISP and any technical provider. — [DNB Q&A](https://www.dnb.nl/en/sector-information/open-book-supervision/laws-and-eu-regulations/psd2/account-information-services-licence-requirements-in-cases-involving-outsourcing-or-multiple-parties/)
- Enable Banking says it does not store or process data except to deliver it. — [Enable Banking FAQ](https://enablebanking.com/docs/faq/)
- A DPIA is mandatory when processing is likely to result in high risk. National authorities publish lists, and the AP's list was the subject of EDPB Opinion 16/2018. — [EDPB SME guide (NL)](https://www.edpb.europa.eu/sme-data-protection-guide/faq-frequently-asked-questions/answer/what-data-protection-impact_nl); [European Commission: when is a DPIA required](https://commission.europa.eu/law/law-topic/data-protection/rules-business-and-organisations/obligations/when-data-protection-impact-assessment-dpia-required_nl)
- The Commission gives a bank that assesses creditworthiness using databases as an example that requires a DPIA. — [European Commission](https://commission.europa.eu/law/law-topic/data-protection/rules-business-and-organisations/obligations/when-data-protection-impact-assessment-dpia-required_nl)

### Inferences
- **Lawful basis.** For the core service (import and categorise transactions), art. 6(1)(b) (necessary for the contract) fits better than consent. PSD2 "explicit consent" is a separate concept, handled by Enable Banking's consent flow. Optional analytics or push notifications should rely on consent or legitimate interest.
- **Third-party data.** Counterparty names and IBANs belong to non-users. The basis is plausibly legitimate interest (art. 6(1)(f)) of the controller and user. Minimise: don't use counterparty data for anything other than showing it to the user, and don't enrich or profile counterparties. The existing design (hashed IBANs, no logging of transaction data) supports minimisation. Note that hashed IBANs are still pseudonymised personal data, not anonymous data.
- **DPIA.** Financial transaction data reveals behaviour, and can indirectly reveal health, religion or union membership through merchants. That puts it close to special categories. Criteria such as sensitive data, systematic evaluation, vulnerable users (people in financial trouble) and innovative technology make two or more EDPB criteria likely, so treat a DPIA as required for launch. A lightweight DPIA before the pilot is cheap and good practice.
- **Processors.** Sign or accept Supabase's and Vercel's DPAs (both offer standard DPAs: UNVERIFIED in this research). Choose EU regions: a Supabase project in an EU region, and Vercel functions pinned to an EU region. Check sub-processors and US transfers under SCCs or the EU-US Data Privacy Framework.
- **Enable Banking.** It is likely an independent controller for the AIS itself, with the app as controller for its own processing. Confirm this, and whether they offer a DPA or data-sharing addendum.
- **Retention and rights.**
  - Define retention: for example, delete transactions X months after account deletion, or immediately on deletion.
  - Provide export (art. 20) and deletion (art. 17). The app already has export and deletion.
  - Keep a register of processing activities (art. 30): the small-company exemption likely does not apply because processing is not occasional.
  - Have a data breach procedure, since notification to the AP is required within 72h.

### Gaps
- I could not retrieve the AP's official DPIA-mandatory list (the AP website returned 403). I therefore can't confirm whether "financial situation" processing is explicitly on it. Check autoriteitpersoonsgegevens.nl.
- I found no AP guidance specific to PFM apps or counterparty data in transactions.
- I did not verify the Supabase/Vercel DPA terms or EU-region options in this session.

## 4. Consumer, app-store and company requirements

### Takeaway
Apple requires finance apps to be submitted by a legal entity, not an individual developer account. That makes a KvK-registered company (with a D-U-N-S number for the Apple organisation account) a practical prerequisite for App Store or TestFlight distribution. The app must also offer in-app account deletion and an in-app privacy policy link. Sign in with Apple is needed only if third-party social logins (such as Google) are offered.

### Cited Findings
- Apple 5.1.1(ix): "Apps that provide services in highly regulated fields (such as banking and financial services ...) or that require sensitive user information should be submitted by a legal entity that provides the services, and not by an individual developer." — [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- Apple 5.1.1(v): if the app supports account creation, it must offer account deletion within the app. — [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- Apple 5.1.1(i): a privacy policy link is required in App Store Connect and in the app. It must cover what is collected and how it is used, third-party sharing, retention/deletion, and how to revoke consent or request deletion. — [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- Apple 4.8: apps that use a third-party/social login for the primary account must also offer an equivalent privacy-friendly login option (in practice Sign in with Apple). This is not needed if the app only uses its own account system. — [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- Apple 2.2: betas go through TestFlight. TestFlight builds "should comply with the App Review Guidelines", and testers cannot be compensated. — [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- Apple 3.1.2(a): auto-renewable subscriptions must provide ongoing value and last at least 7 days. — [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

### Inferences
- If the pilot runs as a PWA or web app on Vercel (the project has PWA plus Apple login), the App Store rules don't apply to the pilot. That is a fast route to "next week" without an Apple organisation account. TestFlight external testing does require the Apple account, and 5.1.1(ix) likely means an organisation account.
- A KvK registration (eenmanszaak or BV) is needed anyway to sign Enable Banking's production contract as a business and to be an identifiable controller in the privacy statement (UNVERIFIED: whether Enable Banking contracts with natural persons).

### Gaps
- Dutch consumer law for later monetisation was not researched with sources in this session: the Wet langdurige contracten / online cancellation button, the 14-day withdrawal right for digital services, and transparent pricing (ACM). Confirm with ACM or ConsuWijzer guidance before monetising.
- KvK registration thresholds and the choice between BV and eenmanszaak were not sourced. Liability considerations favour a BV for a financial-data product (inference).

## 5. Practical checklist (pilot vs public launch)

### Takeaway
Before the pilot:
- Enable Banking production contract with written confirmation of the non-licensed model.
- Company/KvK.
- Privacy statement and pilot terms.
- DPAs and EU regions for Supabase and Vercel.
- Basic register of processing and a light DPIA.
- Working delete and export.

Before launch: a full DPIA, legal review of the AIS structure, an Apple organisation account (if native), consumer-law-compliant terms, and a security review.

### Cited Findings
- Enable Banking production is activated only after signing a contract. Restricted mode covers only accounts the developer links, so external testers need unrestricted production. — [Enable Banking FAQ](https://enablebanking.com/docs/faq/)
- The end user must give explicit, informed consent to Enable Banking as AISP. — [Enable Banking FAQ](https://enablebanking.com/docs/faq/)
- Under PSD2, no licence is needed for pure processing only if the user's AIS contract is with the licensed AISP. — [DNB Q&A](https://www.dnb.nl/en/sector-information/open-book-supervision/laws-and-eu-regulations/psd2/account-information-services-licence-requirements-in-cases-involving-outsourcing-or-multiple-parties/)
- Apple requirements for finance apps (legal entity, deletion, privacy policy). — [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

### Inferences

**Pilot (10-30 testers, next week), minimum:**
1. Signed Enable Banking production contract, and an email from Enable Banking confirming the partner (non-licensed) model, its legal basis (agent vs. data recipient), and that no DNB/FIN-FSA notification is needed. If the contract is not signed yet, the pilot is limited to the founder's own accounts (restricted mode) or mock data.
2. KvK registration (company name and address for the privacy statement and contracts).
3. Short privacy statement (NL):
   - controller identity
   - data categories (transactions, counterparty names, hashed IBAN)
   - purposes and basis
   - recipients (Enable Banking, Supabase, Vercel)
   - EU storage
   - retention
   - rights and the AP complaint route
4. Pilot terms or tester agreement: beta status, no financial advice, data deleted at the end of the pilot on request, and how to revoke bank access.
5. Accept the Supabase and Vercel DPAs, confirm EU regions, and ensure no transaction data appears in logs, error tracking or analytics.
6. Register of processing activities (one page) and a short DPIA-lite or risk note.
7. Working account deletion (including the Enable Banking session/consent revoke) and data export.
8. Breach procedure (72h to the AP).
9. Distribute as a PWA/web app, or via TestFlight only with an organisation Apple account.

**Public launch, additionally:**
1. Lawyer review of the PSD2 structure and Enable Banking contract (agent vs. recipient), plus a check against the final PSR text.
2. Full DPIA. Consider prior consultation with the AP if residual high risk remains.
3. Apple Developer organisation account (D-U-N-S), App Privacy "nutrition labels", in-app deletion, Sign in with Apple if social logins are used.
4. Terms of service and consumer-law compliance for subscriptions (cancellation button, withdrawal right, price transparency).
5. Security measures: pentest or security review, encryption at rest, access controls (RLS), and incident response.
6. Monitor FiDA and PSR application dates (around 2027-2028).

### Gaps
- All Enable Banking-specific legal points (end-user terms, partner model, GDPR roles) are unverified from public sources. This is the single most important question to put to Enable Banking.
- Questions for a lawyer:
  - (1) Does model (a) hold under the Wft for continuous sync?
  - (2) Who is controller for which processing?
  - (3) Is a DPIA mandatory for the pilot?
  - (4) Is there liability exposure if Enable Banking's consent screens are white-labelled?
