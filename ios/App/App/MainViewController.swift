import UIKit
import Capacitor

/// Hoofdscherm van de app. Registreert de eigen plugins uit deze map: die staan niet in
/// node_modules, dus `npx cap sync` kent ze niet en zet ze niet in packageClassList.
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(BiometricLockPlugin())
        bridge?.registerPluginInstance(WidgetBridgePlugin())
        bridge?.registerPluginInstance(NativePushPlugin())
        // Capacitor zet zijn eigen afhandelaar voor meldingen; wij gebruiken geen Capacitor-meldingsplugins,
        // dus zetten we de onze terug (knoppen "Klopt", "Ander potje", "Later").
        PaymentNotifications.shared.install()
    }
}
