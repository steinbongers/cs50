import Foundation
import AppIntents

/// Actie "Betaling indelen" voor de Opdrachten-app. De gebruiker zet hem één keer in een
/// automatisering "Transactie" (Wallet): bij elke Apple Pay-betaling geeft iOS winkel en bedrag
/// door, deze actie stuurt ze naar de server en toont meteen een melding met het voorgestelde potje.
///
/// Draait op de achtergrond in de app (openAppWhenRun = false); de app komt niet naar voren.
/// Geen kaartnummer of naam: alleen winkel en bedrag.
@available(iOS 17.0, *)
struct RecordPaymentIntent: AppIntent {
    static var title: LocalizedStringResource = "Betaling indelen"
    static var description = IntentDescription("Geeft een Apple Pay-betaling door en toont meteen een melding om hem in een potje te zetten.")
    static var openAppWhenRun = false
    static var isDiscoverable = true

    @Parameter(title: "Winkel", description: "Kies 'Winkel' uit de Transactie.")
    var merchant: String

    @Parameter(title: "Bedrag", description: "Kies 'Bedrag' uit de Transactie.")
    var amount: String

    /// Naam van de kaart in Wallet ("ING Betaalpas", "Visa Card"). Geen kaartnummer. Hiermee weet de
    /// app of het een creditcard is: die betaling komt niet los via de bank.
    @Parameter(title: "Kaart", description: "Kies 'Kaart of pas' uit de Transactie.")
    var card: String?

    static var parameterSummary: some ParameterSummary {
        Summary("Deel \(\.$amount) bij \(\.$merchant) in") {
            \.$card
        }
    }

    func perform() async throws -> some IntentResult {
        let previews = await PaymentNotifications.previewSetting()
        do {
            let response = try await NativeAPI.post(
                "/api/native/device/applepay",
                body: [
                    "merchant": String(merchant.prefix(200)),
                    "amount": String(amount.prefix(40)),
                    "card": String((card ?? "").prefix(80)),
                    "previews": previews
                ],
                timeout: 15
            )
            if response["status"] as? String == "prompt", let prompt = response["prompt"] as? [String: Any] {
                await PaymentNotifications.showPrompt(prompt)
            }
        } catch NativeAPI.Failure.unlinked {
            await PaymentNotifications.showFailure("Open de app een keer, dan is hij weer gekoppeld. De bank vangt deze betaling later op.")
        } catch NativeAPI.Failure.server(let status, _) where status == 422 {
            await PaymentNotifications.showFailure("Het bedrag kwam niet goed door. Kijk in Opdrachten of 'Bedrag' bij de actie staat.")
        } catch {
            // Geen netwerk: niet erg, de bank levert hem later en dan komt er alsnog een melding.
            await PaymentNotifications.showFailure("Geen verbinding. De bank vangt deze betaling later op.")
        }
        return .result()
    }
}

/// Maakt de actie vindbaar in Opdrachten onder de naam van de app.
@available(iOS 17.0, *)
struct PaymentShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: RecordPaymentIntent(),
            phrases: ["Deel een betaling in met \(.applicationName)"],
            shortTitle: "Betaling indelen",
            systemImageName: "creditcard"
        )
    }
}
