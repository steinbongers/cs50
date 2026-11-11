import Foundation
import Security

// Gedeeld door de app én de widget (in Xcode bij beide targets aanvinken).
// De apparaatsleutel staat in de Keychain, in de toegangsgroep van de App Group, zodat de widget
// hem kan lezen. Niet in gewone UserDefaults: de Keychain is versleuteld en blijft op dit toestel.

enum NativeShared {
    static let appGroup = "group.nl.steinbongers.financeapp"
    static let apiBaseKey = "widgetApiBase"
    static let widgetCacheKey = "widgetCache"
    /// Oude widgetsleutel (WidgetBridgePlugin); alleen nog als terugval.
    static let legacyTokenKey = "widgetToken"
    static let defaultApiBase = "https://financeapppilot.vercel.app"

    static var defaults: UserDefaults? { UserDefaults(suiteName: appGroup) }

    /// Basisadres van de webapp: wat de app als vertrouwde herkomst opsloeg, anders de standaard.
    static var apiBase: String {
        let base = defaults?.string(forKey: apiBaseKey) ?? defaultApiBase
        return base.hasPrefix("https://") ? base : defaultApiBase
    }
}

enum DeviceKeychain {
    private static let service = "nl.steinbongers.financeapp.device"
    private static let keyAccount = "deviceKey"
    private static let installationAccount = "installationId"

    private static func query(_ account: String) -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecAttrAccessGroup as String: NativeShared.appGroup,
        ]
    }

    private static func read(_ account: String) -> String? {
        var q = query(account)
        q[kSecReturnData as String] = true
        q[kSecMatchLimit as String] = kSecMatchLimitOne
        var item: CFTypeRef?
        guard SecItemCopyMatching(q as CFDictionary, &item) == errSecSuccess, let data = item as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    @discardableResult
    private static func write(_ account: String, _ value: String) -> Bool {
        let data = Data(value.utf8)
        let q = query(account)
        // Leesbaar na de eerste ontgrendeling na een herstart (de widget en de Apple Pay-actie
        // draaien op de achtergrond), en alleen op dit toestel: niet in een back-up naar een ander toestel.
        let attributes: [String: Any] = [
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
        ]
        let status = SecItemUpdate(q as CFDictionary, attributes as CFDictionary)
        if status == errSecItemNotFound {
            var add = q
            for (k, v) in attributes { add[k] = v }
            return SecItemAdd(add as CFDictionary, nil) == errSecSuccess
        }
        return status == errSecSuccess
    }

    private static func delete(_ account: String) {
        SecItemDelete(query(account) as CFDictionary)
    }

    static var deviceKey: String? { read(keyAccount) }

    @discardableResult
    static func setDeviceKey(_ key: String) -> Bool { write(keyAccount, key) }

    static func clearDeviceKey() { delete(keyAccount) }

    /// Vaste id van deze installatie, voor de koppeling op de server. Geen toestelgegevens.
    static var installationId: String {
        if let existing = read(installationAccount) { return existing }
        let id = UUID().uuidString.lowercased()
        write(installationAccount, id)
        return id
    }
}

enum NativeAPI {
    enum Failure: Error {
        case unlinked
        case server(Int, String?)
        case network
    }

    /// POST met de apparaatsleutel. Antwoord als JSON-object.
    static func post(_ path: String, body: [String: Any], timeout: TimeInterval = 20) async throws -> [String: Any] {
        guard let key = DeviceKeychain.deviceKey, !key.isEmpty else { throw Failure.unlinked }
        guard let url = URL(string: NativeShared.apiBase + path) else { throw Failure.network }
        var request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: timeout)
        request.httpMethod = "POST"
        request.setValue("Bearer \(key)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await URLSession.shared.data(for: request)
        } catch {
            throw Failure.network
        }
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] ?? [:]
        if status == 401 { throw Failure.unlinked }
        guard (200..<300).contains(status) else { throw Failure.server(status, json["error"] as? String) }
        return json
    }
}
