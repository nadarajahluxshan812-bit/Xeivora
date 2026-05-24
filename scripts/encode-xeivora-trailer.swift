import AVFoundation
import AppKit
import CoreVideo
import Foundation

struct Manifest: Decodable {
    let width: Int
    let height: Int
    let fps: Int
    let durationSeconds: Int
    let frames: Int
    let pattern: String
    let outputMp4: String
}

enum EncodeError: Error {
    case invalidArguments
    case cannotLoadManifest
    case cannotCreateWriter
    case cannotCreatePixelBuffer
    case cannotLoadImage(String)
}

func loadManifest(at path: String) throws -> Manifest {
    let data = try Data(contentsOf: URL(fileURLWithPath: path))
    return try JSONDecoder().decode(Manifest.self, from: data)
}

func pixelBuffer(from image: NSImage, width: Int, height: Int) throws -> CVPixelBuffer {
    let attrs = [
        kCVPixelBufferCGImageCompatibilityKey as String: true,
        kCVPixelBufferCGBitmapContextCompatibilityKey as String: true
    ] as [String: Any]

    var maybeBuffer: CVPixelBuffer?
    let status = CVPixelBufferCreate(kCFAllocatorDefault, width, height, kCVPixelFormatType_32ARGB, attrs as CFDictionary, &maybeBuffer)
    guard status == kCVReturnSuccess, let buffer = maybeBuffer else {
        throw EncodeError.cannotCreatePixelBuffer
    }

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
        throw EncodeError.cannotCreatePixelBuffer
    }

    context.clear(CGRect(x: 0, y: 0, width: width, height: height))

    guard let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
        throw EncodeError.cannotCreatePixelBuffer
    }

    context.draw(cgImage, in: CGRect(x: 0, y: 0, width: width, height: height))
    return buffer
}

func encode(manifest: Manifest) throws {
    let outputURL = URL(fileURLWithPath: manifest.outputMp4)
    try? FileManager.default.removeItem(at: outputURL)

    guard let writer = try? AVAssetWriter(outputURL: outputURL, fileType: .mp4) else {
        throw EncodeError.cannotCreateWriter
    }

    let settings: [String: Any] = [
        AVVideoCodecKey: AVVideoCodecType.h264,
        AVVideoWidthKey: manifest.width,
        AVVideoHeightKey: manifest.height,
        AVVideoCompressionPropertiesKey: [
            AVVideoAverageBitRateKey: 8_000_000,
            AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel
        ]
    ]

    let input = AVAssetWriterInput(mediaType: .video, outputSettings: settings)
    input.expectsMediaDataInRealTime = false

    let adaptor = AVAssetWriterInputPixelBufferAdaptor(
        assetWriterInput: input,
        sourcePixelBufferAttributes: [
            kCVPixelBufferPixelFormatTypeKey as String: Int(kCVPixelFormatType_32ARGB),
            kCVPixelBufferWidthKey as String: manifest.width,
            kCVPixelBufferHeightKey as String: manifest.height
        ]
    )

    guard writer.canAdd(input) else {
        throw EncodeError.cannotCreateWriter
    }

    writer.add(input)
    writer.startWriting()
    writer.startSession(atSourceTime: .zero)

    let timescale = CMTimeScale(manifest.fps)

    for frameIndex in 0..<manifest.frames {
        let fileName = String(format: manifest.pattern, frameIndex)
        let frameURL = URL(fileURLWithPath: fileName)
        guard let image = NSImage(contentsOf: frameURL) else {
            throw EncodeError.cannotLoadImage(frameURL.path)
        }

        while !input.isReadyForMoreMediaData {
            Thread.sleep(forTimeInterval: 0.01)
        }

        let buffer = try pixelBuffer(from: image, width: manifest.width, height: manifest.height)
        let time = CMTime(value: CMTimeValue(frameIndex), timescale: timescale)
        adaptor.append(buffer, withPresentationTime: time)

        if frameIndex % 24 == 0 {
            print("Encoding frame \(frameIndex + 1)/\(manifest.frames)")
        }
    }

    input.markAsFinished()

    let semaphore = DispatchSemaphore(value: 0)
    writer.finishWriting {
        semaphore.signal()
    }
    semaphore.wait()

    if writer.status != .completed {
        throw writer.error ?? EncodeError.cannotCreateWriter
    }
}

let arguments = CommandLine.arguments
guard arguments.count >= 2 else {
    throw EncodeError.invalidArguments
}

let manifestPath = arguments[1]
let manifest = try loadManifest(at: manifestPath)
try encode(manifest: manifest)
print("Video written to \(manifest.outputMp4)")
