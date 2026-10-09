# Mail aan Enable Banking (Deborah)

## Uitleg voor Stein

Deze mail vraagt Enable Banking om de punten die vóór de pilot met externe testers rond moeten zijn (zie `docs/pilotplan.md`, hoofdstuk 2). De mail is in het Engels, omdat Enable Banking een Fins bedrijf is.

De belangrijkste vraag is de eerste: een schriftelijke bevestiging dat Enable Banking tegenover de gebruiker de vergunde AIS-dienstverlener is, en dat wij alleen de gegevens ontvangen en verwerken. Daarmee is onze vergunningsvrije positie geen aanname meer. Daarnaast vraagt de mail naar de prijs, het contract en welke Nederlandse banken in productie werken.

Vul vóór het versturen in: bedrijfsnaam, KvK-nummer, rechtsvorm, adres, je functie en de naam van de app. Zolang de appnaam niet vaststaat, kun je "[Appnaam]" vervangen door "our app" of de werknaam. Het aantal van ongeveer 1,3 rekeningen per gebruiker is een aanname uit het haalbaarheidsrapport.

Bewaar het antwoord als bewijs bij de DPIA (`docs/dpia-concept.md`).

---

**To:** Deborah, Enable Banking
**Subject:** [Appnaam]: role model confirmation, pricing and production access for a Dutch pilot

Dear Deborah,

I am Stein, founder of [Bedrijfsnaam] ([rechtsvorm], registered in the Netherlands, Chamber of Commerce (KvK) number [KvK-nummer], [adres]). We are building [Appnaam], a budgeting web app for young adults in the Netherlands. Users sort each bank transaction into a budget category themselves. We only read account data; we never initiate payments.

We already have an Enable Banking application in restricted mode and have tested it with my own ING accounts. We now want to run a closed pilot of about four weeks with 30 to 50 invited users, aiming for at least 20 linked users. Before we invite anyone outside our own team, we would like to settle the points below.

**1. Role model (written confirmation)**

Our understanding is as follows. Could you please confirm this in writing, or correct it?

- Enable Banking Oy, as an AISP registered with FIN-FSA, provides the account information service to the end user. The end user gives consent to Enable Banking and to their bank, and enters into the AIS agreement with Enable Banking.
- [Bedrijfsnaam] receives the account data from Enable Banking, with the user's explicit consent, and only processes it (sorting into categories). We do not provide an account information service ourselves.
- Under this "partner setup", [Bedrijfsnaam] is a data recipient and not an agent of Enable Banking. Enable Banking will not notify us to FIN-FSA or DNB as an agent.
- No licence or registration with De Nederlandsche Bank (DNB) is required on our side for this setup in the Netherlands.

If our setup would instead make us an agent, please tell us what that means in practice (notification, AML requirements, fit and proper checks, timeline).

We would also like to know how you see the GDPR roles: is Enable Banking an independent controller for the AIS, and do you require a data processing agreement or another agreement with us?

Finally, we plan to show your consent screen unchanged and not hide it behind our own branding. Please let us know if there are requirements for how we present it.

**2. Pricing**

- What is the price per linked account per month?
- Is there a minimum monthly invoice, and how much is it?
- Do you bill on active consents (accounts with a valid consent, even if the user is inactive) or on connections that are actually used (accounts we fetch data for in a given month)? We would prefer billing on active use, and we will revoke dormant consents.
- Do you offer pilot pricing for about 50 users over one to two months? An offer such as "the first two months free, then per linked account" would suit us well.
- For planning: what would the price be at 1,000 and at 10,000 monthly active users, with about 1.3 accounts per user?

**3. Contract**

- What are the steps to sign a production contract, and what documents do you need from us?
- How long does it usually take from first contact to production access?
- Are there requirements for us as a company (legal form, security measures, insurance)?

**4. Production access for Dutch banks**

Please confirm which of these banks are available in production for personal accounts, and whether there are known limitations (consent duration, history, transaction details, balance after transaction):

- ING
- ABN AMRO
- Rabobank
- SNS, ASN Bank and RegioBank (de Volksbank)
- bunq
- Revolut
- Knab
- Triodos Bank

We currently request consent for 90 days. Is 180 days supported for these banks, and which banks require more frequent re-authentication?

**Timing**

We would like to start the pilot with external users as soon as the contract is signed and the role model is confirmed. Until then we will only use our own accounts in restricted mode. A short call is also welcome if that is easier.

Thank you in advance.

Kind regards,

Stein
[Functie], [Bedrijfsnaam]
KvK [KvK-nummer]
[e-mailadres] · [telefoonnummer]
