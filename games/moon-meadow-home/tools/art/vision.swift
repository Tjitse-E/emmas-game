import AppKit
import CoreImage
import Foundation
import Vision

func cgImage(_ path: String) -> CGImage {
    guard let img = NSImage(contentsOfFile: path),
          let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
        FileHandle.standardError.write("cannot read \(path)\n".data(using: .utf8)!); exit(2)
    }
    return cg
}

let args = CommandLine.arguments
guard args.count >= 3 else { print("usage: vision text <png> | vision mask <png> <out.png>"); exit(2) }
let handler = VNImageRequestHandler(cgImage: cgImage(args[2]))
switch args[1] {
case "text":
    let req = VNRecognizeTextRequest()
    req.recognitionLevel = .accurate
    try handler.perform([req])
    for obs in req.results ?? [] {
        if let top = obs.topCandidates(1).first, top.confidence >= 0.5 { print(top.string) }
    }
case "mask":
    let req = VNGenerateForegroundInstanceMaskRequest()
    try handler.perform([req])
    guard let res = req.results?.first else { exit(1) }
    let buf = try res.generateScaledMaskForImage(forInstances: res.allInstances, from: handler)
    let ci = CIImage(cvPixelBuffer: buf)
    let rep = NSBitmapImageRep(ciImage: ci)
    try rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: args[3]))
default:
    exit(2)
}
