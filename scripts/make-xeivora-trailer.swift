import AVFoundation
import AppKit
import CoreVideo
import Foundation

let width = 1920
let height = 1080
let fps = 18
let durationSeconds: Double = 43
let totalFrames = Int(durationSeconds * Double(fps))

let root = "/Users/nadarajahluxshan/Documents/Xeivora"
let artifactsDir = "\(root)/artifacts/xeivora-trailer"
let interimVideoPath = "\(artifactsDir)/Xeivora-Cinematic-Trailer-silent.mp4"
let finalVideoPath = "\(artifactsDir)/Xeivora-Cinematic-Trailer.mp4"
let desktopVideoPath = "/Users/nadarajahluxshan/Desktop/Xeivora-Cinematic-Trailer.mp4"
let voiceoverPath = "\(artifactsDir)/Xeivora-voiceover.aiff"
let heroReferencePath = "/Users/nadarajahluxshan/Desktop/c9efa30f-2138-4f56-93c2-39beb32b720e.png"

struct AppError: Error, CustomStringConvertible {
    let description: String
}

struct Brand {
    static let background = NSColor(hex: "#030305")
    static let panel = NSColor(hex: "#111116", alpha: 0.84)
    static let panelBorder = NSColor.white.withAlphaComponent(0.10)
    static let body = NSColor.white.withAlphaComponent(0.70)
    static let muted = NSColor.white.withAlphaComponent(0.56)
    static let purple = NSColor(hex: "#7c3aed")
    static let violet = NSColor(hex: "#8b5cf6")
    static let magenta = NSColor(hex: "#d946ef")
    static let blue = NSColor(hex: "#60a5fa")
}

extension NSColor {
    convenience init(hex: String, alpha: CGFloat = 1.0) {
        let clean = hex.replacingOccurrences(of: "#", with: "")
        let value = Int(clean, radix: 16) ?? 0
        let red = CGFloat((value >> 16) & 0xff) / 255.0
        let green = CGFloat((value >> 8) & 0xff) / 255.0
        let blue = CGFloat(value & 0xff) / 255.0
        self.init(
            srgbRed: red,
            green: green,
            blue: blue,
            alpha: alpha
        )
    }
}

func clamp(_ value: Double, min: Double = 0, max: Double = 1) -> Double {
    Swift.max(min, Swift.min(max, value))
}

func lerp(_ a: Double, _ b: Double, _ t: Double) -> Double {
    a + (b - a) * t
}

func easeOutCubic(_ x: Double) -> Double {
    let v = clamp(x)
    return 1 - pow(1 - v, 3)
}

func easeInOutCubic(_ x: Double) -> Double {
    let v = clamp(x)
    return v < 0.5 ? 4 * v * v * v : 1 - pow(-2 * v + 2, 3) / 2
}

func progress(_ time: Double, start: Double, end: Double) -> Double {
    clamp((time - start) / (end - start))
}

func nsrect(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat) -> CGRect {
    CGRect(x: x, y: y, width: w, height: h)
}

func topRect(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat) -> CGRect {
    CGRect(x: x, y: y, width: w, height: h)
}

final class TrailerRenderer {
    let heroImage: NSImage

    init(heroImage: NSImage) {
        self.heroImage = heroImage
    }

    func render() throws {
        try FileManager.default.createDirectory(atPath: artifactsDir, withIntermediateDirectories: true)
        try? FileManager.default.removeItem(atPath: interimVideoPath)
        try? FileManager.default.removeItem(atPath: finalVideoPath)
        try? FileManager.default.removeItem(atPath: desktopVideoPath)

        let outputURL = URL(fileURLWithPath: interimVideoPath)
        let writer = try AVAssetWriter(outputURL: outputURL, fileType: .mp4)

        let settings: [String: Any] = [
            AVVideoCodecKey: AVVideoCodecType.h264,
            AVVideoWidthKey: width,
            AVVideoHeightKey: height,
            AVVideoCompressionPropertiesKey: [
                AVVideoAverageBitRateKey: 10_000_000,
                AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel
            ]
        ]

        let input = AVAssetWriterInput(mediaType: .video, outputSettings: settings)
        input.expectsMediaDataInRealTime = false

        let adaptor = AVAssetWriterInputPixelBufferAdaptor(
            assetWriterInput: input,
            sourcePixelBufferAttributes: [
                kCVPixelBufferPixelFormatTypeKey as String: Int(kCVPixelFormatType_32ARGB),
                kCVPixelBufferWidthKey as String: width,
                kCVPixelBufferHeightKey as String: height
            ]
        )

        guard writer.canAdd(input) else {
            throw AppError(description: "Could not add video input.")
        }

        writer.add(input)
        writer.startWriting()
        writer.startSession(atSourceTime: .zero)

        for frameIndex in 0..<totalFrames {
            while !input.isReadyForMoreMediaData {
                Thread.sleep(forTimeInterval: 0.003)
            }

            let buffer = try makePixelBuffer()
            try draw(frameIndex: frameIndex, into: buffer)
            let time = CMTime(value: CMTimeValue(frameIndex), timescale: CMTimeScale(fps))
            adaptor.append(buffer, withPresentationTime: time)

            if frameIndex % fps == 0 {
                print("Rendering second \(frameIndex / fps + 1)/\(Int(durationSeconds))")
            }
        }

        input.markAsFinished()
        let semaphore = DispatchSemaphore(value: 0)
        writer.finishWriting {
            semaphore.signal()
        }
        semaphore.wait()

        if writer.status != .completed {
            throw writer.error ?? AppError(description: "Video writer did not complete.")
        }
    }

    private func makePixelBuffer() throws -> CVPixelBuffer {
        let attrs = [
            kCVPixelBufferCGImageCompatibilityKey as String: true,
            kCVPixelBufferCGBitmapContextCompatibilityKey as String: true
        ] as [String: Any]
        var maybeBuffer: CVPixelBuffer?
        let status = CVPixelBufferCreate(
            kCFAllocatorDefault,
            width,
            height,
            kCVPixelFormatType_32ARGB,
            attrs as CFDictionary,
            &maybeBuffer
        )
        guard status == kCVReturnSuccess, let buffer = maybeBuffer else {
            throw AppError(description: "Could not create pixel buffer.")
        }
        return buffer
    }

    private func draw(frameIndex: Int, into buffer: CVPixelBuffer) throws {
        CVPixelBufferLockBaseAddress(buffer, [])
        defer { CVPixelBufferUnlockBaseAddress(buffer, []) }

        guard let context = CGContext(
            data: CVPixelBufferGetBaseAddress(buffer),
            width: width,
            height: height,
            bitsPerComponent: 8,
            bytesPerRow: CVPixelBufferGetBytesPerRow(buffer),
            space: CGColorSpaceCreateDeviceRGB(),
            bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue
        ) else {
            throw AppError(description: "Could not create graphics context.")
        }

        let time = Double(frameIndex) / Double(fps)
        let graphics = NSGraphicsContext(cgContext: context, flipped: true)
        NSGraphicsContext.saveGraphicsState()
        NSGraphicsContext.current = graphics
        defer { NSGraphicsContext.restoreGraphicsState() }

        drawBaseBackground(time: time)

        if time < 5 {
            drawIntroScene(time: time)
        } else if time < 12 {
            drawFragmentationScene(time: time)
        } else if time < 18 {
            drawQuestionScene(time: time)
        } else if time < 36 {
            drawXeivoraScene(time: time)
        } else {
            drawEndingScene(time: time)
        }

        drawVignette()
    }

    private func drawBaseBackground(time: Double) {
        Brand.background.setFill()
        NSBezierPath(rect: nsrect(0, 0, CGFloat(width), CGFloat(height))).fill()

        radialGlow(center: CGPoint(x: 980 + CGFloat(sin(time * 0.4) * 50), y: 850), radius: 420, inner: Brand.violet.withAlphaComponent(0.08), outer: Brand.violet.withAlphaComponent(0))
        radialGlow(center: CGPoint(x: 340, y: 170), radius: 420, inner: Brand.purple.withAlphaComponent(0.18), outer: Brand.purple.withAlphaComponent(0))
        radialGlow(center: CGPoint(x: 1440, y: 220), radius: 340, inner: Brand.blue.withAlphaComponent(0.08), outer: Brand.blue.withAlphaComponent(0))
    }

    private func drawIntroScene(time: Double) {
        let fade = CGFloat(easeInOutCubic(progress(time, start: 0.2, end: 2.6)))
        let lineFade = CGFloat(easeInOutCubic(progress(time, start: 1.0, end: 4.2)))
        drawWordmark(at: CGPoint(x: 760, y: 360), scale: 1.15, alpha: fade)
        drawCenteredText(
            "AI changed how we work.",
            rect: nsrect(420, 610, 1080, 120),
            size: 64,
            weight: .bold,
            color: NSColor.white.withAlphaComponent(lineFade),
            alignment: .center
        )
        drawCenteredText(
            "ChatGPT  •  Claude  •  Coding  •  Research  •  Documents",
            rect: nsrect(390, 700, 1140, 40),
            size: 20,
            weight: .medium,
            color: Brand.body.withAlphaComponent(0.82 * lineFade),
            alignment: .center
        )
    }

    private func drawFragmentationScene(time: Double) {
        let fade = CGFloat(easeOutCubic(progress(time, start: 5, end: 6.2)))
        let messageFade = CGFloat(easeOutCubic(progress(time, start: 8.6, end: 11.4)))
        let cut1 = CGFloat(1 - clamp(abs(time - 6.2) / 2.1))
        let cut2 = CGFloat(1 - clamp(abs(time - 7.5) / 2.1))
        let cut3 = CGFloat(1 - clamp(abs(time - 8.8) / 2.1))
        let cut4 = CGFloat(1 - clamp(abs(time - 10.0) / 2.2))

        drawFloatingWindow(frame: topRect(160, 170, 420, 220), title: "ChatGPT", body: "Write a launch checklist for a product release.", accent: Brand.violet, alpha: cut1 * fade)
        drawFloatingWindow(frame: topRect(610, 120, 380, 210), title: "Claude", body: "Rewrite this as a founder update with better tone.", accent: Brand.blue, alpha: cut2 * fade)
        drawFloatingWindow(frame: topRect(1020, 200, 440, 230), title: "Code", body: "Fix the auth bug and regenerate the UI route.", accent: Brand.magenta, alpha: cut3 * fade)
        drawFloatingWindow(frame: topRect(420, 400, 540, 200), title: "Research", body: "Compare student visa requirements across multiple sources.", accent: Brand.purple, alpha: cut4 * fade)

        drawCenteredText(
            "But something still feels broken.",
            rect: nsrect(350, 690, 1220, 90),
            size: 58,
            weight: .bold,
            color: NSColor.white.withAlphaComponent(messageFade),
            alignment: .center
        )

        drawCenteredText(
            "Different models.   Lost context.   Fragmented workflows.",
            rect: nsrect(320, 780, 1280, 50),
            size: 24,
            weight: .semibold,
            color: Brand.body.withAlphaComponent(0.88 * messageFade),
            alignment: .center
        )
    }

    private func drawQuestionScene(time: Double) {
        let orbitFade = CGFloat(easeInOutCubic(progress(time, start: 12.1, end: 13.4)))
        let lineFade = CGFloat(easeInOutCubic(progress(time, start: 13.5, end: 16.8)))
        let titleFade = CGFloat(easeInOutCubic(progress(time, start: 14.5, end: 17.8)))

        drawOrbitStage(alpha: orbitFade, yShift: 40)

        drawCenteredText(
            "What if AI felt like one continuous intelligence layer?",
            rect: nsrect(320, 300, 1280, 90),
            size: 42,
            weight: .bold,
            color: NSColor.white.withAlphaComponent(lineFade),
            alignment: .center
        )

        drawGradientHeadline(
            firstLine: "One Intelligence.",
            secondLine: "Infinite Possibilities.",
            y: 430,
            alpha: titleFade,
            firstSize: 74,
            secondSize: 86
        )
    }

    private func drawXeivoraScene(time: Double) {
        let fade = CGFloat(easeInOutCubic(progress(time, start: 18.0, end: 19.2)))
        drawHeroReference(time: time, alpha: fade)
        drawDarkOverlay(alpha: 0.16)

        let chipFade = CGFloat(easeOutCubic(progress(time, start: 18.5, end: 21.0)))
        let detailFade = CGFloat(easeOutCubic(progress(time, start: 20.0, end: 23.5)))
        let useCaseFade = CGFloat(easeOutCubic(progress(time, start: 27.0, end: 31.0)))
        let continuityFade = CGFloat(easeOutCubic(progress(time, start: 29.5, end: 34.5)))

        if time < 27 {
            drawCenteredText(
                "Xeivora brings together the world’s best AI models, memory,\nagents, tools, and workflows into one seamless experience.",
                rect: nsrect(320, 112, 1280, 90),
                size: 30,
                weight: .semibold,
                color: NSColor.white.withAlphaComponent(0.96 * chipFade),
                alignment: .center
            )

            drawPill(label: "OpenAI", frame: topRect(540, 225, 150, 44), fill: Brand.violet.withAlphaComponent(0.88), stroke: nil, textColor: .white, alpha: chipFade)
            drawPill(label: "Claude", frame: topRect(705, 225, 140, 44), fill: Brand.panel.withAlphaComponent(0.88), stroke: NSColor.white.withAlphaComponent(0.12), textColor: .white, alpha: chipFade)
            drawPill(label: "Gemini", frame: topRect(860, 225, 148, 44), fill: Brand.panel.withAlphaComponent(0.88), stroke: NSColor.white.withAlphaComponent(0.12), textColor: .white, alpha: chipFade)
            drawPill(label: "Local AI", frame: topRect(1024, 225, 150, 44), fill: Brand.panel.withAlphaComponent(0.88), stroke: NSColor.white.withAlphaComponent(0.12), textColor: .white, alpha: chipFade)

            drawPill(label: "Memory", frame: topRect(612, 292, 134, 38), fill: Brand.panel.withAlphaComponent(0.9), stroke: Brand.purple.withAlphaComponent(0.28), textColor: .white, alpha: detailFade)
            drawPill(label: "Agents", frame: topRect(758, 292, 122, 38), fill: Brand.panel.withAlphaComponent(0.9), stroke: Brand.purple.withAlphaComponent(0.28), textColor: .white, alpha: detailFade)
            drawPill(label: "Tools", frame: topRect(892, 292, 112, 38), fill: Brand.panel.withAlphaComponent(0.9), stroke: Brand.purple.withAlphaComponent(0.28), textColor: .white, alpha: detailFade)
            drawPill(label: "Workflows", frame: topRect(1016, 292, 156, 38), fill: Brand.panel.withAlphaComponent(0.9), stroke: Brand.purple.withAlphaComponent(0.28), textColor: .white, alpha: detailFade)
        } else {
            drawCenteredText(
                "No more restarting.\nNo more losing context.\nNo more fragmented AI workflows.",
                rect: nsrect(420, 120, 1080, 160),
                size: 34,
                weight: .bold,
                color: NSColor.white.withAlphaComponent(0.98 * continuityFade),
                alignment: .center
            )

            drawUseCaseChip(label: "Writing", x: 244, y: 702, alpha: useCaseFade)
            drawUseCaseChip(label: "Coding", x: 470, y: 648, alpha: useCaseFade)
            drawUseCaseChip(label: "Research", x: 1220, y: 648, alpha: useCaseFade)
            drawUseCaseChip(label: "Automation", x: 1430, y: 704, alpha: useCaseFade)
        }
    }

    private func drawEndingScene(time: Double) {
        let sceneFade = CGFloat(easeInOutCubic(progress(time, start: 36, end: 37.5)))
        drawHeroReference(time: time, alpha: max(0.55, 1 - sceneFade * 0.28))
        drawDarkOverlay(alpha: 0.42 + sceneFade * 0.25)

        let statementFade = CGFloat(1 - clamp((time - 40.2) / 1.8))
        if statementFade > 0.02 {
            drawCenteredText(
                "Build.\nThink.\nCreate.\nContinue.",
                rect: nsrect(720, 180, 480, 240),
                size: 56,
                weight: .bold,
                color: NSColor.white.withAlphaComponent(statementFade),
                alignment: .center
            )
        }

        let endFade = CGFloat(easeInOutCubic(progress(time, start: 38.4, end: 42.2)))
        drawWordmark(at: CGPoint(x: 790, y: 420), scale: 1.22, alpha: endFade)
        drawCenteredText(
            "This is Xeivora.",
            rect: nsrect(420, 550, 1080, 90),
            size: 72,
            weight: .bold,
            color: NSColor.white.withAlphaComponent(endFade),
            alignment: .center
        )
        drawCenteredText(
            "Xeivora.com",
            rect: nsrect(420, 648, 1080, 40),
            size: 30,
            weight: .medium,
            color: Brand.body.withAlphaComponent(0.95 * endFade),
            alignment: .center
        )
        drawPill(label: "Get Started", frame: topRect(820, 720, 280, 70), fill: Brand.violet.withAlphaComponent(0.96), stroke: nil, textColor: .white, alpha: endFade)
    }

    private func drawHeroReference(time: Double, alpha: CGFloat) {
        guard alpha > 0.001 else { return }
        let scale = CGFloat(lerp(1.0, 1.08, progress(time, start: 18, end: 36)))
        let imageSize = heroImage.size
        let coverScale = max(CGFloat(width) / imageSize.width, CGFloat(height) / imageSize.height) * scale
        let drawnWidth = imageSize.width * coverScale
        let drawnHeight = imageSize.height * coverScale
        let shiftX = CGFloat(sin(time * 0.24) * 18)
        let shiftY = CGFloat(cos(time * 0.18) * 10)
        let rect = nsrect((CGFloat(width) - drawnWidth) / 2 + shiftX, (CGFloat(height) - drawnHeight) / 2 + shiftY, drawnWidth, drawnHeight)

        NSGraphicsContext.current?.saveGraphicsState()
        heroImage.draw(in: rect, from: .zero, operation: .sourceOver, fraction: alpha)
        NSGraphicsContext.current?.restoreGraphicsState()
    }

    private func drawDarkOverlay(alpha: CGFloat) {
        Brand.background.withAlphaComponent(alpha).setFill()
        NSBezierPath(rect: nsrect(0, 0, CGFloat(width), CGFloat(height))).fill()
    }

    private func drawVignette() {
        guard let ctx = NSGraphicsContext.current?.cgContext else { return }
        let colors = [
            NSColor.black.withAlphaComponent(0.0).cgColor,
            NSColor.black.withAlphaComponent(0.0).cgColor,
            NSColor.black.withAlphaComponent(0.62).cgColor
        ] as CFArray
        let locations: [CGFloat] = [0, 0.66, 1]
        guard let gradient = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(), colors: colors, locations: locations) else {
            return
        }
        ctx.drawRadialGradient(
            gradient,
            startCenter: CGPoint(x: CGFloat(width) / 2, y: CGFloat(height) / 2),
            startRadius: 40,
            endCenter: CGPoint(x: CGFloat(width) / 2, y: CGFloat(height) / 2),
            endRadius: CGFloat(width) * 0.74,
            options: .drawsAfterEndLocation
        )
    }

    private func radialGlow(center: CGPoint, radius: CGFloat, inner: NSColor, outer: NSColor) {
        guard let ctx = NSGraphicsContext.current?.cgContext else { return }
        let colors = [inner.cgColor, outer.cgColor] as CFArray
        let locations: [CGFloat] = [0, 1]
        guard let gradient = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(), colors: colors, locations: locations) else {
            return
        }
        ctx.drawRadialGradient(
            gradient,
            startCenter: center,
            startRadius: 0,
            endCenter: center,
            endRadius: radius,
            options: .drawsAfterEndLocation
        )
    }

    private func drawWordmark(at point: CGPoint, scale: CGFloat, alpha: CGFloat) {
        guard alpha > 0.001 else { return }
        let x = point.x
        let y = point.y

        NSGraphicsContext.current?.saveGraphicsState()
        let transform = NSAffineTransform()
        transform.translateX(by: x, yBy: y)
        transform.scale(by: scale)
        transform.concat()

        let stroke1 = NSBezierPath()
        stroke1.lineCapStyle = .round
        stroke1.lineWidth = 14
        stroke1.move(to: CGPoint(x: 0, y: 10))
        stroke1.line(to: CGPoint(x: 34, y: 42))
        Brand.violet.withAlphaComponent(alpha).setStroke()
        stroke1.stroke()

        let stroke2 = NSBezierPath()
        stroke2.lineCapStyle = .round
        stroke2.lineWidth = 14
        stroke2.move(to: CGPoint(x: 34, y: 10))
        stroke2.line(to: CGPoint(x: 0, y: 42))
        Brand.magenta.withAlphaComponent(alpha).setStroke()
        stroke2.stroke()

        drawText(
            "Xeivora",
            rect: nsrect(54, -4, 260, 54),
            size: 34,
            weight: .bold,
            color: NSColor.white.withAlphaComponent(alpha),
            alignment: .left
        )

        NSGraphicsContext.current?.restoreGraphicsState()
    }

    private func drawOrbitStage(alpha: CGFloat, yShift: CGFloat = 0) {
        guard alpha > 0.001 else { return }
        radialGlow(center: CGPoint(x: 960, y: 750 - yShift), radius: 360, inner: Brand.violet.withAlphaComponent(0.22 * alpha), outer: Brand.violet.withAlphaComponent(0))

        let outer = NSBezierPath(ovalIn: nsrect(350, 600 - yShift, 1220, 330))
        outer.lineWidth = 2
        Brand.violet.withAlphaComponent(0.20 * alpha).setStroke()
        outer.stroke()

        let inner = NSBezierPath(ovalIn: nsrect(500, 660 - yShift, 920, 210))
        inner.lineWidth = 1.6
        Brand.violet.withAlphaComponent(0.14 * alpha).setStroke()
        inner.stroke()

        let core = NSBezierPath(ovalIn: nsrect(620, 700 - yShift, 680, 130))
        core.lineWidth = 1.2
        Brand.violet.withAlphaComponent(0.10 * alpha).setStroke()
        core.stroke()

        Brand.whiteDot(alpha: alpha).setFill()
        for point in [CGPoint(x: 576, y: 782 - yShift), CGPoint(x: 1340, y: 782 - yShift), CGPoint(x: 780, y: 730 - yShift), CGPoint(x: 1140, y: 730 - yShift)] {
            NSBezierPath(ovalIn: nsrect(point.x - 6, point.y - 6, 12, 12)).fill()
        }
    }

    private func drawGradientHeadline(firstLine: String, secondLine: String, y: CGFloat, alpha: CGFloat, firstSize: CGFloat, secondSize: CGFloat) {
        drawCenteredText(firstLine, rect: nsrect(340, y, 1240, 90), size: firstSize, weight: .bold, color: NSColor.white.withAlphaComponent(alpha), alignment: .center)

        let rect = nsrect(240, y + 86, 1440, 120)
        guard let ctx = NSGraphicsContext.current?.cgContext else { return }
        let path = CGMutablePath()
        let attr = NSAttributedString(string: secondLine, attributes: [
            .font: NSFont.systemFont(ofSize: secondSize, weight: .bold)
        ])
        let line = CTLineCreateWithAttributedString(attr as CFAttributedString)
        let runs = CTLineGetGlyphRuns(line) as Array
        ctx.saveGState()
        ctx.textMatrix = .identity
        ctx.translateBy(x: rect.midX - secondLineWidth(secondLine, size: secondSize) / 2, y: rect.maxY - 34)
        for run in runs {
            let glyphRun = run as! CTRun
            let glyphCount = CTRunGetGlyphCount(glyphRun)
            for idx in 0..<glyphCount {
                var glyph = CGGlyph()
                var position = CGPoint.zero
                CTRunGetGlyphs(glyphRun, CFRange(location: idx, length: 1), &glyph)
                CTRunGetPositions(glyphRun, CFRange(location: idx, length: 1), &position)
                if let runFont = CFDictionaryGetValue(CTRunGetAttributes(glyphRun), Unmanaged.passUnretained(kCTFontAttributeName).toOpaque()) {
                    let ctFont = unsafeBitCast(runFont, to: CTFont.self)
                    if let letterPath = CTFontCreatePathForGlyph(ctFont, glyph, nil) {
                        var transform = CGAffineTransform(translationX: position.x, y: position.y)
                        if let transformed = letterPath.copy(using: &transform) {
                            path.addPath(transformed)
                        }
                    }
                }
            }
        }
        ctx.addPath(path)
        ctx.clip()
        let colors = [Brand.violet.withAlphaComponent(alpha).cgColor, Brand.magenta.withAlphaComponent(alpha).cgColor] as CFArray
        let locations: [CGFloat] = [0, 1]
        if let gradient = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(), colors: colors, locations: locations) {
            ctx.drawLinearGradient(gradient, start: CGPoint(x: rect.minX, y: 0), end: CGPoint(x: rect.maxX, y: 0), options: [])
        }
        ctx.restoreGState()
    }

    private func secondLineWidth(_ text: String, size: CGFloat) -> CGFloat {
        let attr = NSAttributedString(string: text, attributes: [.font: NSFont.systemFont(ofSize: size, weight: .bold)])
        return attr.size().width
    }

    private func drawCenteredText(_ text: String, rect: CGRect, size: CGFloat, weight: NSFont.Weight, color: NSColor, alignment: NSTextAlignment) {
        drawText(text, rect: rect, size: size, weight: weight, color: color, alignment: alignment, lineHeightMultiple: 0.92)
    }

    private func drawText(_ text: String, rect: CGRect, size: CGFloat, weight: NSFont.Weight, color: NSColor, alignment: NSTextAlignment, lineHeightMultiple: CGFloat = 1.15) {
        let style = NSMutableParagraphStyle()
        style.alignment = alignment
        style.lineBreakMode = .byWordWrapping
        style.minimumLineHeight = size * lineHeightMultiple
        style.maximumLineHeight = size * lineHeightMultiple

        let attributes: [NSAttributedString.Key: Any] = [
            .font: NSFont.systemFont(ofSize: size, weight: weight),
            .foregroundColor: color,
            .paragraphStyle: style
        ]

        let string = NSAttributedString(string: text, attributes: attributes)
        string.draw(with: rect, options: [.usesLineFragmentOrigin, .usesFontLeading])
    }

    private func drawFloatingWindow(frame: CGRect, title: String, body: String, accent: NSColor, alpha: CGFloat) {
        guard alpha > 0.001 else { return }
        drawPanel(frame: frame, radius: 28, fill: Brand.panel.withAlphaComponent(0.95 * alpha), stroke: NSColor.white.withAlphaComponent(0.09 * alpha))
        drawPanel(frame: nsrect(frame.minX, frame.minY, frame.width, 38), radius: 28, fill: NSColor.white.withAlphaComponent(0.05 * alpha), stroke: nil)
        accent.withAlphaComponent(0.95 * alpha).setFill()
        NSBezierPath(ovalIn: nsrect(frame.minX + 18, frame.minY + 15, 8, 8)).fill()
        NSColor.white.withAlphaComponent(0.22 * alpha).setFill()
        NSBezierPath(ovalIn: nsrect(frame.minX + 32, frame.minY + 15, 8, 8)).fill()
        NSBezierPath(ovalIn: nsrect(frame.minX + 46, frame.minY + 15, 8, 8)).fill()
        drawText(title, rect: nsrect(frame.minX + 68, frame.minY + 8, frame.width - 88, 22), size: 16, weight: .bold, color: .white.withAlphaComponent(alpha), alignment: .left)
        drawText(body, rect: nsrect(frame.minX + 24, frame.minY + 64, frame.width - 48, frame.height - 82), size: 30, weight: .medium, color: Brand.body.withAlphaComponent(alpha), alignment: .left, lineHeightMultiple: 1.24)
    }

    private func drawPanel(frame: CGRect, radius: CGFloat, fill: NSColor, stroke: NSColor?) {
        let path = NSBezierPath(roundedRect: frame, xRadius: radius, yRadius: radius)
        fill.setFill()
        path.fill()
        if let stroke {
            stroke.setStroke()
            path.lineWidth = 1
            path.stroke()
        }
    }

    private func drawPill(label: String, frame: CGRect, fill: NSColor, stroke: NSColor?, textColor: NSColor, alpha: CGFloat) {
        guard alpha > 0.001 else { return }
        let path = NSBezierPath(roundedRect: frame, xRadius: frame.height / 2, yRadius: frame.height / 2)
        fill.withAlphaComponent(alpha).setFill()
        path.fill()
        if let stroke {
            stroke.withAlphaComponent(alpha).setStroke()
            path.lineWidth = 1
            path.stroke()
        }
        drawText(label, rect: nsrect(frame.minX, frame.minY + (frame.height - 22) / 2 - 1, frame.width, 24), size: frame.height > 40 ? 19 : 16, weight: .semibold, color: textColor.withAlphaComponent(alpha), alignment: .center)
    }

    private func drawUseCaseChip(label: String, x: CGFloat, y: CGFloat, alpha: CGFloat) {
        drawPill(label: label, frame: topRect(x, y, 190, 54), fill: Brand.panel.withAlphaComponent(0.9), stroke: Brand.purple.withAlphaComponent(0.20), textColor: .white, alpha: alpha)
    }
}

extension Brand {
    static func whiteDot(alpha: CGFloat) -> NSColor {
        NSColor.white.withAlphaComponent(0.94 * alpha)
    }
}

func makeVoiceover() throws {
    let script = """
    Over the last year, AI became part of almost everything we do.
    But something still feels broken.
    Different models. Lost context. Fragmented workflows.
    What if AI felt like one continuous intelligence layer?
    Xeivora brings together the world’s best AI models, memory, agents, tools, and workflows into one seamless experience.
    No more restarting. No more losing context. No more fragmented AI workflows.
    This is more than a chatbot.
    This is Xeivora.
    """

    try? FileManager.default.removeItem(atPath: voiceoverPath)
    let process = Process()
    process.executableURL = URL(fileURLWithPath: "/usr/bin/say")
    process.arguments = ["-v", "Daniel", "-r", "155", "-o", voiceoverPath, script]
    try process.run()
    process.waitUntilExit()
    if process.terminationStatus != 0 {
        throw AppError(description: "Voiceover generation failed.")
    }
}

func muxAudio() throws {
    let videoURL = URL(fileURLWithPath: interimVideoPath)
    let audioURL = URL(fileURLWithPath: voiceoverPath)
    let outputURL = URL(fileURLWithPath: finalVideoPath)
    try? FileManager.default.removeItem(at: outputURL)

    let composition = AVMutableComposition()
    let videoAsset = AVURLAsset(url: videoURL)
    let audioAsset = AVURLAsset(url: audioURL)

    guard
        let videoTrack = videoAsset.tracks(withMediaType: .video).first,
        let compositionVideoTrack = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid)
    else {
        throw AppError(description: "Could not load video track.")
    }

    try compositionVideoTrack.insertTimeRange(CMTimeRange(start: .zero, duration: videoAsset.duration), of: videoTrack, at: .zero)
    compositionVideoTrack.preferredTransform = videoTrack.preferredTransform

    if let audioTrack = audioAsset.tracks(withMediaType: .audio).first,
       let compositionAudioTrack = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid) {
        let audioDuration = min(audioAsset.duration, videoAsset.duration)
        try compositionAudioTrack.insertTimeRange(CMTimeRange(start: .zero, duration: audioDuration), of: audioTrack, at: .zero)
    }

    guard let export = AVAssetExportSession(asset: composition, presetName: AVAssetExportPresetHighestQuality) else {
        throw AppError(description: "Could not create export session.")
    }

    export.outputURL = outputURL
    export.outputFileType = .mp4
    export.shouldOptimizeForNetworkUse = true

    let semaphore = DispatchSemaphore(value: 0)
    export.exportAsynchronously {
        semaphore.signal()
    }
    semaphore.wait()

    if export.status != .completed {
        throw export.error ?? AppError(description: "Audio mux export failed.")
    }

    try? FileManager.default.removeItem(atPath: desktopVideoPath)
    try FileManager.default.copyItem(atPath: finalVideoPath, toPath: desktopVideoPath)
}

let heroURL = URL(fileURLWithPath: heroReferencePath)
guard let heroImage = NSImage(contentsOf: heroURL) else {
    throw AppError(description: "Could not load hero reference image.")
}

let renderer = TrailerRenderer(heroImage: heroImage)
try renderer.render()
try makeVoiceover()
try muxAudio()
print("Trailer written to \(desktopVideoPath)")
