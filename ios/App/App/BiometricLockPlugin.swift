import Foundation
import UIKit
import Capacitor
import LocalAuthentication

/// Face ID-slot: ontgrendelen met Face ID of Touch ID, met de toegangscode van het toestel
/// als terugval (`.deviceOwnerAuthentication`). Vanuit de webapp: `registerPlugin("BiometricLock")`,
/// zie lib/native/plugins.ts.
@objc(BiometricLockPlugin)
public class BiometricLockPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "BiometricLockPlugin"
    public let jsName = "BiometricLock"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "checkAvailability", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "authenticate", returnType: CAPPluginReturnPromise)
    ]

    private var activeObserver: NSObjectProtocol?

    @objc func checkAvailability(_ call: CAPPluginCall) {
        let context = LAContext()
        var error: NSError?
        let available = context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error)
        // biometryType is pas gevuld na canEvaluatePolicy.
        _ = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: nil)
        call.resolve([
            "available": available,
            "biometry": Self.biometryName(context.biometryType)
        ])
    }

    @objc func authenticate(_ call: CAPPluginCall) {
        let reason = call.getString("reason") ?? "Ontgrendel de app"
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            // Bij terugkomen uit de achtergrond is de app soms nog niet actief; Face ID weigert dan.
            // Wacht in dat geval op het moment dat hij wel actief is.
            if UIApplication.shared.applicationState == .active {
                self.evaluate(call, reason: reason)
                return
            }
            if let observer = self.activeObserver {
                NotificationCenter.default.removeObserver(observer)
            }
            self.activeObserver = NotificationCenter.default.addObserver(
                forName: UIApplication.didBecomeActiveNotification,
                object: nil,
                queue: .main
            ) { [weak self] _ in
                guard let self = self else { return }
                if let observer = self.activeObserver {
                    NotificationCenter.default.removeObserver(observer)
                    self.activeObserver = nil
                }
                self.evaluate(call, reason: reason)
            }
        }
    }

    private func evaluate(_ call: CAPPluginCall, reason: String) {
        let context = LAContext()
        context.localizedCancelTitle = "Annuleer"
        var error: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) else {
            call.reject("Ontgrendelen kan niet op dit toestel", "unavailable", error)
            return
        }
        context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason) { success, error in
            // Houd de context vast tot het antwoord er is.
            _ = context
            if success {
                call.resolve()
                return
            }
            let code: String
            switch (error as? LAError)?.code {
            case .some(.userCancel), .some(.appCancel), .some(.systemCancel):
                code = "cancelled"
            default:
                code = "failed"
            }
            call.reject("Niet ontgrendeld", code, error)
        }
    }

    private static func biometryName(_ type: LABiometryType) -> String {
        switch type {
        case .faceID:
            return "faceId"
        case .touchID:
            return "touchId"
        default:
            return "none"
        }
    }
}
