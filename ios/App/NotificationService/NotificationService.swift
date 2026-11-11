import UserNotifications

/// Notification Service Extension: draait op de iPhone vlak voordat een pushmelding over een
/// betaling getoond wordt, en beslist dáár of bedrag, winkel en potje in de tekst mogen.
///
/// De server stuurt een melding zonder details ("Nieuwe betaling") en zet de tekst mét details
/// apart in `detailTitle` en `detailBody`. Die zetten we er alleen in als iOS de voorvertoning
/// op dit moment verbergt tot het toestel ontgrendeld is ("Indien ontgrendeld"). Staat
/// Voorvertoning op "Altijd", dan blijft de tekst zonder details: anders stond het bedrag
/// leesbaar op het vergrendelscherm. De server kan dit niet weten; de iPhone wel.
///
/// Lukt er iets niet, of bestaat dit target niet, dan toont iOS gewoon de tekst zonder details.
/// De knoppen werken in beide gevallen.
class NotificationService: UNNotificationServiceExtension {
    private var contentHandler: ((UNNotificationContent) -> Void)?
    private var original: UNNotificationContent?

    override func didReceive(_ request: UNNotificationRequest,
                             withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void) {
        self.contentHandler = contentHandler
        self.original = request.content
        let info = request.content.userInfo
        guard let title = info["detailTitle"] as? String,
              let body = info["detailBody"] as? String,
              title.count <= 80, body.count <= 160,
              let content = request.content.mutableCopy() as? UNMutableNotificationContent else {
            contentHandler(request.content)
            return
        }
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            if settings.showPreviewsSetting == .whenAuthenticated {
                content.title = title
                content.body = body
            }
            contentHandler(content)
        }
    }

    /// iOS breekt af (te traag): dan de tekst zonder details.
    override func serviceExtensionTimeWillExpire() {
        if let handler = contentHandler, let original = original {
            handler(original)
        }
    }
}
