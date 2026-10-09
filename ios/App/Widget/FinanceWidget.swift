import WidgetKit
import SwiftUI

// Widget op het beginscherm: "Nog N kaartjes" en "Vrij tot de 25e: € 340".
// Haalt elk half uur GET /api/widget op met de widgetsleutel uit de gedeelde App Group.
// De app zet die sleutel via WidgetBridgePlugin (ios/App/App/WidgetBridgePlugin.swift);
// de sleutels hieronder moeten daar gelijk aan blijven.

private enum Shared {
    static let appGroup = "group.nl.steinbongers.financeapp"
    static let tokenKey = "widgetToken"
    static let apiBaseKey = "widgetApiBase"
    static let cacheKey = "widgetCache"
    static let defaultApiBase = "https://financeapppilot.vercel.app"
    static let refreshInterval: TimeInterval = 30 * 60
}

// MARK: - Gegevens

/// Antwoord van GET /api/widget (zie lib/native/widget.ts).
struct WidgetPayload: Codable {
    struct Free: Codable {
        let amount: Double
        /// Volgende salarisdag, "YYYY-MM-DD".
        let until: String
    }

    let open: Int
    let free: Free?
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
        content: .ready(WidgetPayload(open: 4, free: WidgetPayload.Free(amount: 340, until: "2026-10-25")))
    )
}

enum WidgetLoader {
    static func load(completion: @escaping (WidgetContent) -> Void) {
        let defaults = UserDefaults(suiteName: Shared.appGroup)
        guard let token = defaults?.string(forKey: Shared.tokenKey), !token.isEmpty else {
            completion(.unlinked)
            return
        }
        let base = defaults?.string(forKey: Shared.apiBaseKey) ?? Shared.defaultApiBase
        guard base.hasPrefix("https://"), let url = URL(string: base + "/api/widget") else {
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
                defaults?.removeObject(forKey: Shared.cacheKey)
                completion(.unlinked)
                return
            }
            if status == 200, let data = data, let payload = try? JSONDecoder().decode(WidgetPayload.self, from: data) {
                defaults?.set(data, forKey: Shared.cacheKey)
                completion(.ready(payload))
                return
            }
            // Geen netwerk of even een fout: laat de laatst bekende getallen staan.
            if let cached = defaults?.data(forKey: Shared.cacheKey),
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

    /// "Vrij tot de 25e", uit "YYYY-MM-DD".
    static func freeLabel(_ until: String) -> String {
        let parts = until.split(separator: "-")
        if parts.count >= 3, let day = Int(parts[2].prefix(2)) {
            return "Vrij tot de \(day)e"
        }
        return "Vrij te besteden"
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

// MARK: - Weergave

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
                Text("Vrij te besteden")
                    .font(.system(size: 13))
                    .foregroundStyle(.secondary)
                Text("Stel je salarisdag in")
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
            if family == .systemMedium {
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
        .configurationDisplayName("Kaartjes en vrij geld")
        .description("Hoeveel kaartjes er nog liggen en wat je vrij hebt tot je salaris.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

@main
struct FinanceWidgetBundle: WidgetBundle {
    var body: some Widget {
        FinanceWidget()
    }
}
