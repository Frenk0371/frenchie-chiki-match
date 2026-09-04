import SwiftUI

@main
struct MusicHouseApp: App {
    @Environment(\.scenePhase) private var scenePhase

    init() {
        BackgroundAudioSession.shared.activate()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active {
                BackgroundAudioSession.shared.activate()
            }
        }
    }
}
