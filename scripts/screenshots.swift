// Скриншоты для README и обложка репозитория через системный WebKit (macOS, без Chrome).
// 1. npm run build:pages и раздать out/ по адресу http://localhost:3200/dashcraft/
// 2. swift scripts/screenshots.swift
import AppKit
import WebKit

struct Shot {
  let url: String
  let file: String
  let width: CGFloat
  let height: CGFloat
  let scale: CGFloat
  let scrollTo: String? // текст заголовка, к которому прокрутить
}

let root = FileManager.default.currentDirectoryPath
let site = ProcessInfo.processInfo.environment["SITE"] ?? "http://localhost:3200/dashcraft"
let shots = [
  Shot(url: "\(site)/", file: "docs/screenshot-overview.png", width: 1280, height: 860, scale: 2, scrollTo: nil),
  Shot(url: "\(site)/instagram/", file: "docs/screenshot-network.png", width: 1280, height: 900, scale: 2, scrollTo: nil),
  Shot(url: "\(site)/instagram/", file: "docs/screenshot-posts.png", width: 1280, height: 900, scale: 2, scrollTo: "Что заходит лучше"),
  Shot(url: "file://\(root)/docs/social-preview.html", file: "docs/social-preview.png", width: 1280, height: 640, scale: 1, scrollTo: nil),
]

// Снимок приходит в масштабе экрана (на Retina ×2) — приводим к точному размеру в пикселях
func resized(_ image: NSImage, _ w: CGFloat, _ h: CGFloat) -> NSBitmapImageRep? {
  guard let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: Int(w), pixelsHigh: Int(h), bitsPerSample: 8,
                                   samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB,
                                   bytesPerRow: 0, bitsPerPixel: 0) else { return nil }
  NSGraphicsContext.saveGraphicsState()
  NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
  NSGraphicsContext.current?.imageInterpolation = .high
  image.draw(in: NSRect(x: 0, y: 0, width: w, height: h))
  NSGraphicsContext.restoreGraphicsState()
  return rep
}

final class Runner: NSObject, WKNavigationDelegate {
  var queue: [Shot]
  let window = NSWindow(contentRect: .zero, styleMask: .borderless, backing: .buffered, defer: false)
  var web: WKWebView!

  init(_ shots: [Shot]) { queue = shots }

  func next() {
    guard let shot = queue.first else { NSApp.terminate(nil); return }
    let frame = NSRect(x: 0, y: 0, width: shot.width, height: shot.height)
    window.setFrame(frame, display: false)
    web = WKWebView(frame: frame)
    web.navigationDelegate = self
    window.contentView = web
    window.orderBack(nil)
    let url = URL(string: shot.url)!
    if url.isFileURL { web.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent()) }
    else { web.load(URLRequest(url: url)) }
  }

  func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
    let shot = queue.removeFirst()
    // Ждём шрифты, данные и анимацию графиков
    DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) {
      let js = shot.scrollTo.map { text in
        """
        const el = [...document.querySelectorAll('h2,h3,p,div')].find(e => e.children.length === 0 && e.textContent.includes('\(text)'));
        if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 140);
        """
      } ?? "0"
      webView.evaluateJavaScript(js) { _, _ in
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
          let config = WKSnapshotConfiguration()
          webView.takeSnapshot(with: config) { image, error in
            if let image, let rep = resized(image, shot.width * shot.scale, shot.height * shot.scale),
               let png = rep.representation(using: .png, properties: [:]) {
              try! png.write(to: URL(fileURLWithPath: "\(root)/\(shot.file)"))
              print("✓ \(shot.file) \(rep.pixelsWide)×\(rep.pixelsHigh)")
            } else {
              print("✗ \(shot.file): \(error?.localizedDescription ?? "нет картинки")")
            }
            self.next()
          }
        }
      }
    }
  }

  func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
    print("✗ \(queue.removeFirst().file): \(error.localizedDescription)"); next()
  }
  func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
    print("✗ \(queue.removeFirst().file): \(error.localizedDescription)"); next()
  }
}

let app = NSApplication.shared
app.setActivationPolicy(.prohibited)
let runner = Runner(shots)
DispatchQueue.main.async { runner.next() }
app.run()
