import Foundation
import UIKit
import UserNotifications
import WidgetKit

/// Meldingen na een betaling, met knoppen. Zowel de lokale melding van de Apple Pay-actie als de
/// pushmelding van de server (APNs) gebruiken deze knoppensets.
///
/// - "✓ Klopt" deelt in zonder de app te openen. Op een vergrendelde iPhone vraagt iOS eerst Face ID.
/// - "Ander potje" opent de app op dat kaartje.
/// - "Later" legt hem achteraan de stapel.
///
/// De sleutels in `userInfo` (tx, action, url) komen uit lib/native/payments.ts.
final class PaymentNotifications: NSObject, UNUserNotificationCenterDelegate {
    static let shared = PaymentNotifications()

    static let suggestCategory = "PAYMENT_SUGGEST"
    static let pickCategory = "PAYMENT_PICK"
    static let confirmAction = "PAYMENT_CONFIRM"
    static let otherAction = "PAYMENT_OTHER"
    static let laterAction = "PAYMENT_LATER"

    /// Pad in de webapp dat geopend moet worden zodra de webview klaar is (na tik op een melding).
    static var pendingPath: String?
    static let openPathNotification = Notification.Name("PaymentNotificationsOpenPath")

    /// Meldt zich als afhandelaar en zet de knoppensets klaar. Vroeg aanroepen (AppDelegate), en
    /// opnieuw nadat Capacitor zijn eigen afhandelaar heeft gezet (MainViewController).
    func install() {
        let center = UNUserNotificationCenter.current()
        center.delegate = self
        let confirm = UNNotificationAction(identifier: Self.confirmAction, title: "✓ Klopt", options: [.authenticationRequired])
        let other = UNNotificationAction(identifier: Self.otherAction, title: "Ander potje", options: [.foreground, .authenticationRequired])
        let pick = UNNotificationAction(identifier: Self.otherAction, title: "Kies een potje", options: [.foreground, .authenticationRequired])
        let later = UNNotificationAction(identifier: Self.laterAction, title: "Later", options: [.authenticationRequired])
        // Staat Voorvertoning op "Indien ontgrendeld", dan toont iOS dit tot de iPhone open is.
        let suggest = UNNotificationCategory(
            identifier: Self.suggestCategory,
            actions: [confirm, other],
            intentIdentifiers: [],
            hiddenPreviewsBodyPlaceholder: "Nieuwe betaling",
            options: []
        )
        let pickOnly = UNNotificationCategory(
            identifier: Self.pickCategory,
            actions: [pick, later],
            intentIdentifiers: [],
            hiddenPreviewsBodyPlaceholder: "Nieuwe betaling",
            options: []
        )
        center.setNotificationCategories([suggest, pickOnly])
    }

    /// iOS-stand "Voorvertoning tonen" voor deze app, in de woorden van de server.
    static func previewSetting() async -> String {
        let settings = await UNUserNotificationCenter.current().notificationSettings()
        switch settings.showPreviewsSetting {
        case .always: return "always"
        case .never: return "never"
        default: return "when_unlocked"
        }
    }

    /// Lokale melding met knoppen (Apple Pay-actie), uit het antwoord van /api/native/device/applepay.
    static func showPrompt(_ prompt: [String: Any]) async {
        guard let transactionId = prompt["transactionId"] as? String,
              let title = prompt["title"] as? String,
              let body = prompt["body"] as? String,
              let category = prompt["category"] as? String else { return }
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default
        content.categoryIdentifier = category
        content.threadIdentifier = "betalingen"
        var info: [String: String] = ["tx": transactionId, "url": "/swipen?tx=\(transactionId)&ref=push&tag=betaling"]
        if let action = prompt["action"] as? String { info["action"] = action }
        content.userInfo = info
        let request = UNNotificationRequest(identifier: "betaling-\(transactionId)", content: content, trigger: nil)
        try? await UNUserNotificationCenter.current().add(request)
    }

    static func showFailure(_ text: String) async {
        let content = UNMutableNotificationContent()
        content.title = "Dat lukte niet"
        content.body = text
        let request = UNNotificationRequest(identifier: "betaling-fout-\(UUID().uuidString)", content: content, trigger: nil)
        try? await UNUserNotificationCenter.current().add(request)
    }

    // MARK: - UNUserNotificationCenterDelegate

    /// Ook als de app open is: de melding tonen, met knoppen.
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .list, .sound])
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                didReceive response: UNNotificationResponse,
                                withCompletionHandler completionHandler: @escaping () -> Void) {
        let info = response.notification.request.content.userInfo
        let transactionId = info["tx"] as? String
        let path = Self.safePath(info["url"] as? String)

        switch response.actionIdentifier {
        case Self.confirmAction:
            guard let transactionId = transactionId, let token = info["action"] as? String else {
                completionHandler()
                return
            }
            runInBackground(completionHandler) {
                await Self.send(["action": "confirm", "transactionId": transactionId, "token": token, "source": "notification"])
            }
        case Self.laterAction:
            guard let transactionId = transactionId else {
                completionHandler()
                return
            }
            runInBackground(completionHandler) {
                await Self.send(["action": "later", "transactionId": transactionId, "source": "notification"])
            }
        case UNNotificationDismissActionIdentifier:
            completionHandler()
        default:
            // Tik op de melding zelf of "Ander potje": de app opent (foreground), op dat kaartje.
            if let path = path { Self.open(path) }
            completionHandler()
        }
    }

    // MARK: - Hulpjes

    /// Alleen een pad binnen de eigen webapp ("/swipen?..."), nooit een ander domein.
    static func safePath(_ value: String?) -> String? {
        guard let value = value, value.hasPrefix("/"), !value.hasPrefix("//"), value.count < 300 else { return nil }
        return value
    }

    static func open(_ path: String) {
        DispatchQueue.main.async {
            pendingPath = path
            NotificationCenter.default.post(name: openPathNotification, object: nil)
        }
    }

    private func runInBackground(_ completionHandler: @escaping () -> Void, _ work: @escaping () async -> Void) {
        var task: UIBackgroundTaskIdentifier = .invalid
        task = UIApplication.shared.beginBackgroundTask(withName: "betaling") {
            UIApplication.shared.endBackgroundTask(task)
        }
        Task { @MainActor in
            await work()
            completionHandler()
            if task != .invalid { UIApplication.shared.endBackgroundTask(task) }
        }
    }

    private static func send(_ body: [String: Any]) async {
        do {
            _ = try await NativeAPI.post("/api/native/device/assign", body: body)
            if #available(iOS 14.0, *) { WidgetCenter.shared.reloadAllTimelines() }
        } catch NativeAPI.Failure.server(let status, let message) where status == 403 || status == 404 {
            await showFailure(message ?? "Open de app om hem in te delen.")
        } catch {
            await showFailure("Geen verbinding. Open de app om hem in te delen.")
        }
    }
}
