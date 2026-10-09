import Foundation
import Capacitor
import WidgetKit

/// Geeft de widgetsleutel van de webapp door aan de widget op het beginscherm, via de
/// gedeelde App Group. Vanuit de webapp: `registerPlugin("WidgetBridge")`, zie lib/native/plugins.ts.
///
/// De sleutels hieronder moeten gelijk blijven aan die in ios/App/Widget/FinanceWidget.swift.
@objc(WidgetBridgePlugin)
public class WidgetBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetBridgePlugin"
    public let jsName = "WidgetBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setToken", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearToken", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise)
    ]

    static let appGroup = "group.nl.steinbongers.financeapp"
    static let tokenKey = "widgetToken"
    static let apiBaseKey = "widgetApiBase"
    static let cacheKey = "widgetCache"

    private var defaults: UserDefaults? {
        UserDefaults(suiteName: Self.appGroup)
    }

    @objc func setToken(_ call: CAPPluginCall) {
        guard let token = call.getString("token"), token.count >= 32, token.count <= 128 else {
            call.reject("Ongeldige widgetsleutel", "invalid")
            return
        }
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            // Alleen de eigen webapp mag een sleutel zetten, geen pagina van een bank of
            // inlogdienst die toevallig in dezelfde webview open staat.
            guard let base = self.trustedOrigin() else {
                call.reject("Niet toegestaan vanaf deze pagina", "forbidden")
                return
            }
            guard let defaults = self.defaults else {
                call.reject("App Group ontbreekt", "unavailable")
                return
            }
            defaults.set(token, forKey: Self.tokenKey)
            defaults.set(base, forKey: Self.apiBaseKey)
            defaults.removeObject(forKey: Self.cacheKey)
            WidgetCenter.shared.reloadAllTimelines()
            call.resolve()
        }
    }

    @objc func clearToken(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            guard self.trustedOrigin() != nil else {
                call.reject("Niet toegestaan vanaf deze pagina", "forbidden")
                return
            }
            self.defaults?.removeObject(forKey: Self.tokenKey)
            self.defaults?.removeObject(forKey: Self.cacheKey)
            WidgetCenter.shared.reloadAllTimelines()
            call.resolve()
        }
    }

    @objc func status(_ call: CAPPluginCall) {
        let token = defaults?.string(forKey: Self.tokenKey) ?? ""
        call.resolve(["linked": !token.isEmpty])
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
