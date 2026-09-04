import AVFoundation
import Foundation

final class BackgroundAudioSession {
    static let shared = BackgroundAudioSession()

    private init() {}

    func activate() {
        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(.playback, mode: .default, options: [.allowAirPlay])
            try session.setActive(true)
        } catch {
            print("Music House audio session error: \(error)")
        }
    }
}
