import Foundation
import UIKit
import Capacitor
import UserNotifications
import WidgetKit

/// Koppelt deze iPhone aan het account: meldingen met knoppen (APNs), de Apple Pay-actie en de widget.
/// Vanuit de webapp: `registerPlugin("NativePush")`, zie lib/native/plugins.ts.
///
/// De webapp vraagt de server om een apparaatsleutel (server action `linkDevice`) en geeft die hier
/// door; de plugin bewaart hem in de Keychain. Alleen de eigen webapp mag dat, geen andere pagina
/// in de webview (zie `trustedOrigin`).
@objc(NativePushPlugin)
public class NativePushPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativePushPlugin"
    public let jsName = "NativePush"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "registration", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setDeviceKey", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clear", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openSettings", returnType: CAPPluginReturnPromise)
    ]

    /// Laatste APNs-token (hex), gezet door AppDelegate.
    static var apnsToken: String?
    static var apnsWaiters: [(String?) -> Void] = []

    static func didRegister(token: Data?) {
        let hex = token.map { $0.map { String(format: "%02x", $0) }.joined() }
        DispatchQueue.main.async {
            if let hex = hex { apnsToken = hex }
            let waiters = apnsWaiters
            apnsWaiters = []
            for waiter in waiters { waiter(hex) }
        }
    }

    override public func load() {
        NotificationCenter.default.addObserver(forName: PaymentNotifications.openPathNotification, object: nil, queue: .main) { [weak self] _ in
            self?.openPendingPath()
        }
        openPendingPath()
    }

    @objc func status(_ call: CAPPluginCall) {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            let permission: String
            switch settings.authorizationStatus {
            case .authorized, .provisional, .ephemeral: permission = "granted"
            case .denied: permission = "denied"
            default: permission = "prompt"
            }
            call.resolve([
                "permission": permission,
                "linked": DeviceKeychain.deviceKey != nil,
                "shortcutsAvailable": ProcessInfo.processInfo.isOperatingSystemAtLeast(OperatingSystemVersion(majorVersion: 17, minorVersion: 0, patchVersion: 0))
            ])
        }
    }

    @objc func requestPermission(_ call: CAPPluginCall) {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
            if granted {
                DispatchQueue.main.async { UIApplication.shared.registerForRemoteNotifications() }
            }
            call.resolve(["granted": granted])
        }
    }

    /// Alles wat de server nodig heeft om dit toestel te koppelen. Wacht hoogstens 8 seconden op het APNs-token.
    @objc func registration(_ call: CAPPluginCall) {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            let previews: String
            switch settings.showPreviewsSetting {
            case .always: previews = "always"
            case .never: previews = "never"
            default: previews = "when_unlocked"
            }
            let authorized = settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional
            let finish: (String?) -> Void = { token in
                var result: [String: Any] = [
                    "installationId": DeviceKeychain.installationId,
                    "previews": previews,
                    "apnsEnv": Self.apnsEnvironment
                ]
                if let token = token { result["apnsToken"] = token }
                call.resolve(result)
            }
            DispatchQueue.main.async { [weak self] in
                // Net als de sleutel zelf: alleen de eigen webapp krijgt het APNs-token, geen andere
                // pagina die in de webview open staat (inlogdienst, bank).
                guard let self = self, self.trustedOrigin() != nil else {
                    call.reject("Niet toegestaan vanaf deze pagina", "forbidden")
                    return
                }
                guard authorized else { return finish(nil) }
                if let token = Self.apnsToken { return finish(token) }
                var done = false
                let once: (String?) -> Void = { token in
                    if done { return }
                    done = true
                    finish(token)
                }
                Self.apnsWaiters.append(once)
                UIApplication.shared.registerForRemoteNotifications()
                DispatchQueue.main.asyncAfter(deadline: .now() + 8) { once(Self.apnsToken) }
            }
        }
    }

    @objc func setDeviceKey(_ call: CAPPluginCall) {
        guard let key = call.getString("key"), key.count >= 32, key.count <= 128 else {
            call.reject("Ongeldige sleutel", "invalid")
            return
        }
        DispatchQueue.main.async { [weak self] in
            guard let self = self, let base = self.trustedOrigin() else {
                call.reject("Niet toegestaan vanaf deze pagina", "forbidden")
                return
            }
            guard DeviceKeychain.setDeviceKey(key) else {
                call.reject("Bewaren lukte niet", "keychain")
                return
            }
            NativeShared.defaults?.set(base, forKey: NativeShared.apiBaseKey)
            NativeShared.defaults?.removeObject(forKey: NativeShared.widgetCacheKey)
            WidgetCenter.shared.reloadAllTimelines()
            call.resolve()
        }
    }

    /// Bij uitloggen of ontkoppelen: sleutel en widgetcache weg. Geeft de installatie-id terug
    /// zodat de webapp de koppeling ook op de server kan weghalen.
    @objc func clear(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self, self.trustedOrigin() != nil else {
                call.reject("Niet toegestaan vanaf deze pagina", "forbidden")
                return
            }
            DeviceKeychain.clearDeviceKey()
            NativeShared.defaults?.removeObject(forKey: NativeShared.widgetCacheKey)
            NativeShared.defaults?.removeObject(forKey: NativeShared.legacyTokenKey)
            WidgetCenter.shared.reloadAllTimelines()
            call.resolve(["installationId": DeviceKeychain.installationId])
        }
    }

    /// Opent de instellingen van deze app (meldingen, voorvertoning).
    @objc func openSettings(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            if let url = URL(string: UIApplication.openSettingsURLString) {
                UIApplication.shared.open(url)
            }
            call.resolve()
        }
    }

    /// Debug-builds praten met de testomgeving van APNs, TestFlight en App Store met productie.
    static var apnsEnvironment: String {
        #if DEBUG
        return "sandbox"
        #else
        return "production"
        #endif
    }

    /// Na een tik op een melding: open dat pad in de webapp.
    private func openPendingPath() {
        guard let path = PaymentNotifications.pendingPath,
              let server = bridge?.config.serverURL,
              let url = URL(string: path, relativeTo: server)?.absoluteURL,
              url.host == server.host else { return }
        PaymentNotifications.pendingPath = nil
        bridge?.webView?.load(URLRequest(url: url))
    }

    /// "https://host" van de webapp (server.url uit capacitor.config.ts), maar alleen als de
    /// pagina die nu open staat ook op die host draait. Moet op de main thread.
    private func trustedOrigin() -> String? {
        guard let server = bridge?.config.serverURL,
              let scheme = server.scheme, scheme == "https",
              let host = server.host,
              let current = bridge?.webView?.url,
              current.scheme == "https",
              current.host == host else {
            return nil
        }
        if let port = server.port {
            return "\(scheme)://\(host):\(port)"
        }
        return "\(scheme)://\(host)"
    }
}
