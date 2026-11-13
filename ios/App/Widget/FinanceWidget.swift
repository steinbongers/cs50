import WidgetKit
import SwiftUI
import AppIntents

// Widget op het beginscherm.
// - Klein en middel: "Nog N kaartjes" en "Nog over tot de 25e: € 340" (alleen lezen).
// - Groot (interactief, iOS 17): de oudste open betaling met je meestgebruikte potjes als knoppen
//   en "Later". Een tik deelt in zonder de app te openen en toont meteen de volgende.
//
// Haalt elk half uur GET /api/widget op met de apparaatsleutel uit de Keychain (NativeShared.swift,
// gezet door NativePushPlugin). Een oudere koppeling met een widgetsleutel in de App Group
// (WidgetBridgePlugin) blijft werken voor klein en middel.

private enum Shared {
    static let refreshInterval: TimeInterval = 30 * 60

    /// Apparaatsleutel, of de oude widgetsleutel als terugval.
    static var token: String? {
        if let key = DeviceKeychain.deviceKey, !key.isEmpty { return key }
        if let legacy = NativeShared.defaults?.string(forKey: NativeShared.legacyTokenKey), !legacy.isEmpty { return legacy }
        return nil
    }
}

// MARK: - Gegevens

/// Antwoord van GET /api/widget (zie lib/native/widget.ts).
struct WidgetPayload: Codable {
    struct Free: Codable {
        let amount: Double
        /// Volgende salarisdag, "YYYY-MM-DD".
        let until: String
    }

    /// Eén potje als knop op de grote widget.
    struct Option: Codable, Identifiable {
        let id: String
        let name: String
        /// Kleursleutel uit lib/categories/palette.ts ("blauw", "groen", ...).
        let color: String
    }

    /// De oudste open betaling (alleen in nieuwere antwoorden).
    struct Card: Codable {
        let id: String
        let merchant: String
        let amount: Double
        /// Boekdatum, "YYYY-MM-DD".
        let date: String
        let options: [Option]
    }

    let open: Int
    let free: Free?
    let card: Card?
}

enum WidgetContent {
    /// Nog geen sleutel: de app is nog niet gekoppeld.
    case unlinked
    /// Wel gekoppeld, maar nog nooit gelukt om op te halen.
    case unavailable
    case ready(WidgetPayload)
}

struct FinanceEntry: TimelineEntry {
    let date: Date
    let content: WidgetContent

    static let sample = FinanceEntry(
        date: Date(),
        content: .ready(WidgetPayload(
            open: 4,
            free: WidgetPayload.Free(amount: 340, until: "2026-10-25"),
            card: WidgetPayload.Card(
                id: "voorbeeld",
                merchant: "Albert Heijn",
                amount: -12.4,
                date: "2026-10-20",
                options: [
                    WidgetPayload.Option(id: "1", name: "Boodschappen", color: "groen"),
                    WidgetPayload.Option(id: "2", name: "Uit eten", color: "oranje"),
                    WidgetPayload.Option(id: "3", name: "Vervoer", color: "blauw"),
                    WidgetPayload.Option(id: "4", name: "Leuke dingen", color: "paars")
                ]
            )
        ))
    )
}

enum WidgetLoader {
    static func load(completion: @escaping (WidgetContent) -> Void) {
        let defaults = NativeShared.defaults
        guard let token = Shared.token else {
            completion(.unlinked)
            return
        }
        guard let url = URL(string: NativeShared.apiBase + "/api/widget") else {
            completion(.unlinked)
            return
        }

        var request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 15)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        URLSession.shared.dataTask(with: request) { data, response, _ in
            let status = (response as? HTTPURLResponse)?.statusCode ?? 0
            if status == 401 {
                // Sleutel ingetrokken (nieuwe gekoppeld op een ander toestel, of account weg).
                defaults?.removeObject(forKey: NativeShared.widgetCacheKey)
                completion(.unlinked)
                return
            }
            if status == 200, let data = data, let payload = try? JSONDecoder().decode(WidgetPayload.self, from: data) {
                defaults?.set(data, forKey: NativeShared.widgetCacheKey)
                completion(.ready(payload))
                return
            }
            // Geen netwerk of even een fout: laat de laatst bekende getallen staan.
            if let cached = defaults?.data(forKey: NativeShared.widgetCacheKey),
               let payload = try? JSONDecoder().decode(WidgetPayload.self, from: cached) {
                completion(.ready(payload))
            } else {
                completion(.unavailable)
            }
        }.resume()
    }
}

struct FinanceProvider: TimelineProvider {
    func placeholder(in context: Context) -> FinanceEntry {
        FinanceEntry.sample
    }

    func getSnapshot(in context: Context, completion: @escaping (FinanceEntry) -> Void) {
        if context.isPreview {
            completion(FinanceEntry.sample)
            return
        }
        WidgetLoader.load { content in
            completion(FinanceEntry(date: Date(), content: content))
        }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<FinanceEntry>) -> Void) {
        WidgetLoader.load { content in
            let now = Date()
            let entry = FinanceEntry(date: now, content: content)
            completion(Timeline(entries: [entry], policy: .after(now.addingTimeInterval(Shared.refreshInterval))))
        }
    }
}

// MARK: - Tekst

enum WidgetText {
    static func cards(_ open: Int) -> String {
        if open == 0 { return "Alles in een potje" }
        return open == 1 ? "Nog 1 kaartje" : "Nog \(open) kaartjes"
    }

    /// "Nog over tot de 25e", uit "YYYY-MM-DD".
    static func freeLabel(_ until: String) -> String {
        let parts = until.split(separator: "-")
        if parts.count >= 3, let day = Int(parts[2].prefix(2)) {
            return "Nog over tot de \(day)e"
        }
        return "Nog over"
    }

    /// "€ 12,40": met centen, zonder teken (een uitgave is een uitgave).
    static func exactAmount(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.locale = Locale(identifier: "nl_NL")
        formatter.numberStyle = .currency
        formatter.currencyCode = "EUR"
        let text = formatter.string(from: NSNumber(value: abs(value))) ?? "€ \(abs(value))"
        return value > 0 ? "+ " + text : text
    }

    /// "di 20 okt", uit "YYYY-MM-DD".
    static func day(_ iso: String) -> String {
        let parser = DateFormatter()
        parser.locale = Locale(identifier: "en_US_POSIX")
        parser.dateFormat = "yyyy-MM-dd"
        guard let date = parser.date(from: String(iso.prefix(10))) else { return "" }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "nl_NL")
        formatter.dateFormat = "EEE d MMM"
        return formatter.string(from: date)
    }

    /// "€ 340": hele euro's, Nederlandse notatie.
    static func amount(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.locale = Locale(identifier: "nl_NL")
        formatter.numberStyle = .currency
        formatter.currencyCode = "EUR"
        formatter.maximumFractionDigits = 0
        formatter.minimumFractionDigits = 0
        return formatter.string(from: NSNumber(value: value.rounded())) ?? "€ \(Int(value.rounded()))"
    }
}

// MARK: - Knoppen (App Intents)

enum WidgetActions {
    /// Stuurt de keuze naar de server en bewaart het antwoord, zodat de widget meteen de volgende toont.
    static func send(_ body: [String: Any]) async {
        var body = body
        body["source"] = "widget"
        body["widget"] = true
        guard let response = try? await NativeAPI.post("/api/native/device/assign", body: body, timeout: 12),
              let widget = response["widget"],
              let data = try? JSONSerialization.data(withJSONObject: widget),
              (try? JSONDecoder().decode(WidgetPayload.self, from: data)) != nil else { return }
        NativeShared.defaults?.set(data, forKey: NativeShared.widgetCacheKey)
    }
}

/// Zet de getoonde betaling in een potje.
struct AssignCardIntent: AppIntent {
    static var title: LocalizedStringResource = "Indelen"
    static var isDiscoverable = false

    @Parameter(title: "Betaling") var transactionId: String
    @Parameter(title: "Potje") var categoryId: String

    init() {}
    init(transactionId: String, categoryId: String) {
        self.transactionId = transactionId
        self.categoryId = categoryId
    }

    func perform() async throws -> some IntentResult {
        await WidgetActions.send(["action": "pick", "transactionId": transactionId, "categoryId": categoryId])
        return .result()
    }
}

/// Legt de getoonde betaling achteraan de stapel.
struct LaterCardIntent: AppIntent {
    static var title: LocalizedStringResource = "Later"
    static var isDiscoverable = false

    @Parameter(title: "Betaling") var transactionId: String

    init() {}
    init(transactionId: String) {
        self.transactionId = transactionId
    }

    func perform() async throws -> some IntentResult {
        await WidgetActions.send(["action": "later", "transactionId": transactionId])
        return .result()
    }
}

// MARK: - Weergave

enum WidgetColor {
    /// Zelfde kleuren als de potjes in de app (app/globals.css, --cat-*, lichte modus).
    static func of(_ key: String) -> Color {
        switch key {
        case "blauw": return Color(red: 0.039, green: 0.310, blue: 0.659)
        case "indigo": return Color(red: 0.231, green: 0.263, blue: 0.627)
        case "paars": return Color(red: 0.357, green: 0.247, blue: 0.651)
        case "roze": return Color(red: 0.659, green: 0.137, blue: 0.353)
        case "rood": return Color(red: 0.639, green: 0.165, blue: 0.231)
        case "oranje": return Color(red: 0.639, green: 0.275, blue: 0.110)
        case "geel": return Color(red: 0.541, green: 0.325, blue: 0.000)
        case "groen": return Color(red: 0.000, green: 0.439, blue: 0.247)
        case "mint": return Color(red: 0.051, green: 0.420, blue: 0.400)
        default: return Color(red: 0.294, green: 0.318, blue: 0.384)
        }
    }
}

struct LargeCardView: View {
    let payload: WidgetPayload

    private let columns = [GridItem(.flexible(), spacing: 8), GridItem(.flexible(), spacing: 8)]

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            if let card = payload.card {
                VStack(alignment: .leading, spacing: 2) {
                    HStack(alignment: .firstTextBaseline) {
                        Text(card.merchant)
                            .font(.system(size: 17, weight: .semibold))
                            .lineLimit(1)
                        Spacer(minLength: 8)
                        Text(WidgetText.exactAmount(card.amount))
                            .font(.system(size: 17, weight: .semibold, design: .rounded))
                            .lineLimit(1)
                    }
                    Text(WidgetText.day(card.date))
                        .font(.system(size: 13))
                        .foregroundStyle(.secondary)
                }
                // In StandBy of op een vergrendeld scherm toont iOS hier een grijze balk.
                .privacySensitive()

                LazyVGrid(columns: columns, spacing: 8) {
                    ForEach(card.options) { option in
                        Button(intent: AssignCardIntent(transactionId: card.id, categoryId: option.id)) {
                            Text(option.name)
                                .font(.system(size: 14, weight: .semibold))
                                .lineLimit(1)
                                .minimumScaleFactor(0.75)
                                .frame(maxWidth: .infinity, minHeight: 30)
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(WidgetColor.of(option.color))
                    }
                }

                Button(intent: LaterCardIntent(transactionId: card.id)) {
                    Text("Later")
                        .font(.system(size: 14, weight: .medium))
                        .frame(maxWidth: .infinity, minHeight: 26)
                }
                .buttonStyle(.bordered)
            } else {
                Spacer(minLength: 0)
                Image(systemName: "checkmark.circle")
                    .font(.system(size: 28, weight: .semibold))
                    .foregroundStyle(.tint)
                Text("Stapel leeg")
                    .font(.system(size: 20, weight: .semibold))
            }

            Spacer(minLength: 0)
            Divider()
            HStack(alignment: .firstTextBaseline) {
                Text(WidgetText.cards(payload.open))
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(.secondary)
                Spacer(minLength: 8)
                if let free = payload.free {
                    Text("\(WidgetText.freeLabel(free.until)): \(WidgetText.amount(free.amount))")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                        .privacySensitive()
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

struct CardsView: View {
    let open: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Image(systemName: open == 0 ? "checkmark.circle" : "square.stack")
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(.tint)
            Text(WidgetText.cards(open))
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(.primary)
                .lineLimit(2)
                .minimumScaleFactor(0.8)
        }
    }
}

struct FreeView: View {
    let free: WidgetPayload.Free?

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            if let free = free {
                Text(WidgetText.freeLabel(free.until))
                    .font(.system(size: 13))
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                Text(WidgetText.amount(free.amount))
                    .font(.system(size: 26, weight: .semibold, design: .rounded))
                    .foregroundStyle(.primary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
            } else {
                Text("Nog over")
                    .font(.system(size: 13))
                    .foregroundStyle(.secondary)
                Text("Kies je vaste kosten in de app")
                    .font(.system(size: 13))
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }
        }
    }
}

struct MessageView: View {
    let text: String

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Image(systemName: "square.stack")
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(.tint)
            Spacer(minLength: 0)
            Text(text)
                .font(.system(size: 13))
                .foregroundStyle(.secondary)
                .lineLimit(4)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
}

struct FinanceWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: FinanceEntry

    var body: some View {
        content
            .containerBackground(.fill.tertiary, for: .widget)
    }

    @ViewBuilder
    private var content: some View {
        switch entry.content {
        case .unlinked:
            MessageView(text: "Open de app om de widget te koppelen")
        case .unavailable:
            MessageView(text: "Even geen verbinding. Probeer het straks opnieuw.")
        case .ready(let payload):
            if family == .systemLarge {
                LargeCardView(payload: payload)
            } else if family == .systemMedium {
                HStack(alignment: .top, spacing: 16) {
                    CardsView(open: payload.open)
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                    FreeView(free: payload.free)
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomLeading)
                }
            } else {
                VStack(alignment: .leading, spacing: 0) {
                    CardsView(open: payload.open)
                    Spacer(minLength: 8)
                    FreeView(free: payload.free)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
            }
        }
    }
}

// MARK: - Widget

struct FinanceWidget: Widget {
    let kind = "FinanceWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: FinanceProvider()) { entry in
            FinanceWidgetView(entry: entry)
        }
        .configurationDisplayName("Kaartjes en Nog over")
        .description("Je kaartjes en wat je nog over hebt.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

@main
struct FinanceWidgetBundle: WidgetBundle {
    var body: some Widget {
        FinanceWidget()
    }
}
