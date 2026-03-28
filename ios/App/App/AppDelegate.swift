import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {}

    func applicationDidEnterBackground(_ application: UIApplication) {}

    func applicationWillEnterForeground(_ application: UIApplication) {}

    // Disable WKWebView rubber-band bounce every time app becomes active
    func applicationDidBecomeActive(_ application: UIApplication) {
        guard let root = self.window?.rootViewController else { return }
        disableBounce(in: root)
    }

    private func disableBounce(in vc: UIViewController) {
        if let bridge = vc as? CAPBridgeViewController {
            bridge.webView?.scrollView.bounces = false
            bridge.webView?.scrollView.alwaysBounceVertical = false
            bridge.webView?.scrollView.alwaysBounceHorizontal = false
            // Disable native back-swipe gesture so JS useSwipeBack hook handles navigation
            bridge.webView?.allowsBackForwardNavigationGestures = false
            return
        }
        for child in vc.children { disableBounce(in: child) }
        if let nav = vc as? UINavigationController, let visible = nav.visibleViewController {
            disableBounce(in: visible)
        }
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
