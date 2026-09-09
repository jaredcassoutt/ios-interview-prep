/* Coding challenges — 24 */

IPREP.addChallenge({
  id: 'ch-lru', topic: 'dicts', domain: 'foundation', title: 'LRU Cache in O(1)', d: 'hard', minutes: 30,
  prompt: 'Implement an LRU cache with O(1) get and set. Fixed capacity; evict the least recently used entry when full. Generic over a Hashable key and any value.',
  starter: `final class LRUCache<Key: Hashable, Value> {
    init(capacity: Int) {
        // TODO
    }
    func value(for key: Key) -> Value? {
        // TODO
    }
    func set(_ value: Value, for key: Key) {
        // TODO
    }
}`,
  hints: [
    'O(1) lookup means a dictionary. O(1) reordering on access means you cannot use an array, because removing from the middle is O(n).',
    'A doubly linked list gives O(1) unlink and O(1) insert-at-head, provided you already hold the node. The dictionary stores key -> node so you always do.',
    'Use sentinel head and tail nodes so you never need nil checks when unlinking. Remember the dictionary must also drop the evicted key.'
  ],
  solution: `final class LRUCache<Key: Hashable, Value> {
    private final class Node {
        let key: Key
        var value: Value
        var prev: Node?
        var next: Node?
        init(_ key: Key, _ value: Value) { self.key = key; self.value = value }
    }

    private let capacity: Int
    private var map: [Key: Node] = [:]
    private let head = Node?.none          // sentinels built below
    private var first: Node?
    private var last: Node?

    init(capacity: Int) {
        precondition(capacity > 0)
        self.capacity = capacity
    }

    func value(for key: Key) -> Value? {
        guard let node = map[key] else { return nil }
        moveToFront(node)
        return node.value
    }

    func set(_ value: Value, for key: Key) {
        if let node = map[key] {
            node.value = value
            moveToFront(node)
            return
        }
        let node = Node(key, value)
        map[key] = node
        pushFront(node)
        if map.count > capacity, let evicted = last {
            unlink(evicted)
            map[evicted.key] = nil
        }
    }

    // MARK: - list ops, all O(1)

    private func pushFront(_ n: Node) {
        n.prev = nil
        n.next = first
        first?.prev = n
        first = n
        if last == nil { last = n }
    }

    private func unlink(_ n: Node) {
        n.prev?.next = n.next
        n.next?.prev = n.prev
        if first === n { first = n.next }
        if last === n { last = n.prev }
        n.prev = nil; n.next = nil
    }

    private func moveToFront(_ n: Node) {
        guard first !== n else { return }
        unlink(n)
        pushFront(n)
    }
}`,
  checking: 'That you reach for two structures rather than one, and can say why an array fails the O(1) requirement. Interviewers also watch whether you remove the evicted key from the dictionary, which is the most commonly forgotten line, and whether you handle updating an existing key as a move rather than an insert.'
});

IPREP.addChallenge({
  id: 'ch-debounce', topic: 'groupsbarriers', domain: 'concurrency', title: 'Debounce a search field', d: 'medium', minutes: 15,
  prompt: 'A search bar calls search(text:) on every keystroke. Each call hits the network. Implement debouncing so the request fires only after the user stops typing for 300ms. Then say in one sentence how throttle would differ.',
  starter: `final class SearchController {
    func search(_ text: String) {
        performSearch(text)   // fires on every keystroke — fix this
    }
    private func performSearch(_ text: String) { /* network */ }
}`,
  hints: [
    'You need a handle on the scheduled work so you can cancel it. A plain closure passed to asyncAfter gives you no handle.',
    'DispatchWorkItem is cancellable and can be passed to asyncAfter(deadline:execute:).',
    'Cancel the previous item before scheduling the new one, and keep a reference to the current one.'
  ],
  solution: `final class SearchController {
    private var pending: DispatchWorkItem?
    private let delay: TimeInterval = 0.3

    func search(_ text: String) {
        pending?.cancel()
        let item = DispatchWorkItem { [weak self] in
            self?.performSearch(text)
        }
        pending = item
        DispatchQueue.main.asyncAfter(deadline: .now() + delay, execute: item)
    }

    private func performSearch(_ text: String) { /* network */ }
}

// Swift concurrency version:
final class AsyncSearchController {
    private var task: Task<Void, Never>?

    func search(_ text: String) {
        task?.cancel()
        task = Task {
            try? await Task.sleep(for: .milliseconds(300))
            guard !Task.isCancelled else { return }
            await performSearch(text)
        }
    }
    private func performSearch(_ text: String) async { }
}`,
  checking: 'Whether you know DispatchWorkItem exists, whether you capture self weakly, and whether you can articulate the difference: debounce waits for silence and runs once at the end, throttle runs at most once per window and drops the rest. Debounce suits search; throttle suits scroll position reporting.'
});

IPREP.addChallenge({
  id: 'ch-rwlock', topic: 'threadsafety', domain: 'concurrency', title: 'Thread-safe cache property', d: 'medium', minutes: 20,
  prompt: 'Make this cache safe for concurrent access from many threads. Reads should be able to run in parallel; writes must be exclusive. Then rewrite it as an actor.',
  starter: `final class ImageCache {
    private var storage: [String: Data] = [:]

    func data(for key: String) -> Data? {
        storage[key]
    }
    func set(_ data: Data, for key: String) {
        storage[key] = data
    }
}`,
  hints: [
    'A serial queue works but serialises reads too. You want concurrent reads and exclusive writes.',
    'A concurrent queue you create yourself supports barrier blocks. Barriers are ignored on the global queues.',
    'Reads use sync so they can return a value; writes use async with .barrier so the caller does not wait.'
  ],
  solution: `final class ImageCache {
    private let queue = DispatchQueue(label: "ImageCache", attributes: .concurrent)
    private var storage: [String: Data] = [:]

    func data(for key: String) -> Data? {
        queue.sync { storage[key] }
    }

    func set(_ data: Data, for key: String) {
        queue.async(flags: .barrier) { self.storage[key] = data }
    }

    func removeAll() {
        queue.async(flags: .barrier) { self.storage.removeAll() }
    }
}

// Actor version — the compiler enforces isolation, no discipline required.
actor ImageCacheActor {
    private var storage: [String: Data] = [:]

    func data(for key: String) -> Data? { storage[key] }
    func set(_ data: Data, for key: String) { storage[key] = data }
}`,
  checking: 'That every access goes through the queue, including any you add later. A single unguarded read reintroduces the race. Also that you know barriers require a queue you created, and that you can name the actor version as the modern answer without pretending it is free of reentrancy concerns.'
});

IPREP.addChallenge({
  id: 'ch-cycle', topic: 'arc', domain: 'language', title: 'Find and fix three retain cycles', d: 'medium', minutes: 15,
  prompt: 'This view controller leaks. Find every cycle or lifetime bug and fix them. There are three.',
  starter: `final class FeedViewController: UIViewController {
    var onRefresh: (() -> Void)?
    private var timer: Timer?
    private let service = FeedService()

    override func viewDidLoad() {
        super.viewDidLoad()

        onRefresh = {
            self.reload()
        }

        timer = Timer.scheduledTimer(withTimeInterval: 30,\n                                 repeats: true) { _ in
            self.reload()
        }

        NotificationCenter.default.addObserver(
            forName: .userDidLogin, object: nil, queue: .main
        ) { _ in
            self.reload()
        }
    }

    private func reload() { }
}`,
  hints: [
    'The first one is the textbook shape: self holds a closure, the closure holds self.',
    'The second is not fixed by a capture list alone. Ask who retains the timer.',
    'The block-based NotificationCenter observer returns a token. What owns it, and when is it removed?'
  ],
  solution: `final class FeedViewController: UIViewController {
    var onRefresh: (() -> Void)?
    private var timer: Timer?
    private var loginObserver: NSObjectProtocol?
    private let service = FeedService()

    override func viewDidLoad() {
        super.viewDidLoad()

        // 1. Closure stored on self must not capture self strongly.
        onRefresh = { [weak self] in
            self?.reload()
        }

        // 2. weak self is not enough: the run loop retains the timer,
        //    so it must be invalidated or it fires forever.
        timer = Timer.scheduledTimer(withTimeInterval: 30,\n                             repeats: true) { [weak self] _ in
            self?.reload()
        }

        // 3. The block observer is retained by NotificationCenter until
        //    the returned token is removed.
        loginObserver = NotificationCenter.default.addObserver(
            forName: .userDidLogin, object: nil, queue: .main
        ) { [weak self] _ in
            self?.reload()
        }
    }

    deinit {
        timer?.invalidate()
        if let loginObserver {
            NotificationCenter.default.removeObserver(loginObserver)
        }
    }

    private func reload() { }
}`,
  checking: 'Whether you treat this as a keyword exercise or a lifetime exercise. Adding [weak self] to all three and stopping is the common wrong answer: the timer keeps firing and the observer keeps living regardless. The interviewer wants to hear "who retains this, and when is it released".'
});

IPREP.addChallenge({
  id: 'ch-downsample', topic: 'memoryperf', domain: 'performance', title: 'Downsample an image without loading it fully', d: 'hard', minutes: 20,
  prompt: 'A grid shows 120x120pt thumbnails from 4000x3000 photos on disk. Loading them with UIImage(contentsOfFile:) crashes the app. Write a downsampling loader that never materialises the full-resolution bitmap, and say what it saves.',
  starter: `func thumbnail(at url: URL, maxPixelSize: CGFloat) -> UIImage? {
    // UIImage(contentsOfFile:) decodes the whole thing. Do better.
    return nil
}`,
  hints: [
    'ImageIO can read image metadata and produce a thumbnail without decoding the full image. Look at CGImageSource.',
    'kCGImageSourceCreateThumbnailFromImageAlways plus kCGImageSourceThumbnailMaxPixelSize does the downsample during decode.',
    'Pass kCGImageSourceShouldCache false when creating the source, so the full image is never cached, and multiply the point size by the screen scale.'
  ],
  solution: `import ImageIO
import UIKit

func thumbnail(at url: URL, maxPixelSize: CGFloat) -> UIImage? {
    let sourceOptions = [kCGImageSourceShouldCache: false] as CFDictionary
    guard let source = CGImageSourceCreateWithURL(url as CFURL, sourceOptions) else {
        return nil
    }

    let pixels = maxPixelSize * UIScreen.main.scale
    let options = [
        kCGImageSourceCreateThumbnailFromImageAlways: true,
        kCGImageSourceShouldCacheImmediately: true,
        kCGImageSourceCreateThumbnailWithTransform: true,
        kCGImageSourceThumbnailMaxPixelSize: pixels
    ] as CFDictionary

    guard let cgImage = CGImageSourceCreateThumbnailAtIndex(source, 0, options) else {
        return nil
    }
    return UIImage(cgImage: cgImage, scale: UIScreen.main.scale, orientation: .up)
}

// Call it off the main thread; kCGImageSourceShouldCacheImmediately
// forces the decode there rather than lazily at first draw.`,
  checking: 'The number. 4000x3000x4 is about 48MB per image; at 120pt on a 3x screen the thumbnail is 360x360x4, roughly 0.5MB. That is a hundredfold reduction, and it is why the grid stops dying. Also whether you know the decode is lazy by default and that ShouldCacheImmediately moves it onto your background queue.'
});

IPREP.addChallenge({
  id: 'ch-cellimage', topic: 'cellreuse', domain: 'uikit', title: 'Fix the wrong-image-on-wrong-row bug', d: 'medium', minutes: 20,
  prompt: 'Fast scrolling shows the wrong image on rows. Fix it, and make sure the in-flight request is cancelled when the cell is reused.',
  starter: `final class PhotoCell: UITableViewCell {
    @IBOutlet private var photoView: UIImageView!

    func configure(with url: URL) {
        ImageLoader.shared.load(url) { image in
            DispatchQueue.main.async {
                self.photoView.image = image
            }
        }
    }
}`,
  hints: [
    'By the time the completion runs, this cell object may be displaying a completely different row.',
    'Either verify the cell still wants that URL, or cancel the previous request in prepareForReuse. Doing both is standard.',
    'A token stored on the cell is more robust than comparing index paths, because it works for nested reuse and does not need the table view.'
  ],
  solution: `final class PhotoCell: UITableViewCell {
    @IBOutlet private var photoView: UIImageView!

    private var currentURL: URL?
    private var task: ImageLoader.Task?

    func configure(with url: URL) {
        currentURL = url
        photoView.image = nil                 // clear stale content immediately

        task = ImageLoader.shared.load(url) { [weak self] image in
            guard let self else { return }
            DispatchQueue.main.async {
                // The cell may have been reused for another row by now.
                guard self.currentURL == url else { return }
                self.photoView.image = image
            }
        }
    }

    override func prepareForReuse() {
        super.prepareForReuse()
        task?.cancel()
        task = nil
        currentURL = nil
        photoView.image = nil
    }
}`,
  checking: 'Three things: clearing the old image so you never show stale content during the load, guarding the assignment against reuse, and actually cancelling. Candidates usually get the guard and forget the cancel, which leaves a fast flick with dozens of live requests competing for bandwidth.'
});

IPREP.addChallenge({
  id: 'ch-asyncop', topic: 'operations', domain: 'concurrency', title: 'Asynchronous Operation subclass', d: 'hard', minutes: 25,
  prompt: 'Write a reusable AsyncOperation base class that correctly reports isExecuting and isFinished for work that completes asynchronously, and respects cancellation. Then subclass it for a URLSession download.',
  starter: `class AsyncOperation: Operation {
    // The default Operation finishes when main() returns.
    // Make it finish only when finish() is called.
}`,
  hints: [
    'isExecuting and isFinished are read-only computed properties on Operation. You need backing storage and manual KVO notifications.',
    'Override start(), not just main(). Do not call super.start().',
    'Check isCancelled at the top of start(), and make finish() safe to call once from any thread.'
  ],
  solution: `class AsyncOperation: Operation {
    private let lock = NSLock()
    private var _executing = false
    private var _finished = false

    override var isAsynchronous: Bool { true }

    override private(set) var isExecuting: Bool {
        get { lock.withLock { _executing } }
        set {
            willChangeValue(forKey: "isExecuting")
            lock.withLock { _executing = newValue }
            didChangeValue(forKey: "isExecuting")
        }
    }

    override private(set) var isFinished: Bool {
        get { lock.withLock { _finished } }
        set {
            willChangeValue(forKey: "isFinished")
            lock.withLock { _finished = newValue }
            didChangeValue(forKey: "isFinished")
        }
    }

    override func start() {
        guard !isCancelled else { finish(); return }
        isExecuting = true
        main()
    }

    /// Subclasses call this exactly once when their async work completes.
    func finish() {
        if isExecuting { isExecuting = false }
        isFinished = true
    }
}

final class DownloadOperation: AsyncOperation {
    private let url: URL
    private var task: URLSessionDataTask?
    private(set) var data: Data?

    init(url: URL) { self.url = url }

    override func main() {
        task = URLSession.shared.dataTask(with: url) { [weak self] data, _, _ in
            guard let self else { return }
            if !self.isCancelled { self.data = data }
            self.finish()
        }
        task?.resume()
    }

    override func cancel() {
        super.cancel()
        task?.cancel()          // stop the transport, then let the handler finish()
    }
}`,
  checking: 'That you override start() rather than main() alone, that you fire the KVO notifications manually since the properties are no longer synthesised, and that cancel() cancels the underlying task. Forgetting the last one means the queue waits on an operation whose completion may never arrive.'
});

IPREP.addChallenge({
  id: 'ch-cow', topic: 'valueref', domain: 'language', title: 'Implement copy-on-write', d: 'hard', minutes: 20,
  prompt: 'Implement a value-semantic struct that wraps an expensive payload and only copies it when a shared instance is mutated. Prove your understanding by explaining what makes isKnownUniquelyReferenced return false unexpectedly.',
  starter: `struct PixelBuffer {
    // Should behave like a value type, but copying should be cheap
    // until someone writes to a shared copy.
    private var pixels: [UInt8]

    init(size: Int) { pixels = Array(repeating: 0, count: size) }

    subscript(i: Int) -> UInt8 {
        get { pixels[i] }
        set { pixels[i] = newValue }
    }
}`,
  hints: [
    'Move the payload into a class so copying the struct copies only a reference.',
    'isKnownUniquelyReferenced(&ref) tells you whether you are the only owner. It needs an inout reference to a class variable.',
    'Copy before every mutation, never before a read. That is the whole optimisation.'
  ],
  solution: `struct PixelBuffer {
    private final class Storage {
        var pixels: [UInt8]
        init(_ pixels: [UInt8]) { self.pixels = pixels }
    }

    private var storage: Storage

    init(size: Int) {
        storage = Storage(Array(repeating: 0, count: size))
    }

    private mutating func makeUniqueIfNeeded() {
        if !isKnownUniquelyReferenced(&storage) {
            storage = Storage(storage.pixels)   // the deferred deep copy
        }
    }

    subscript(i: Int) -> UInt8 {
        get { storage.pixels[i] }               // no copy on read
        set {
            makeUniqueIfNeeded()
            storage.pixels[i] = newValue
        }
    }

    var count: Int { storage.pixels.count }
}

// Verify:
// var a = PixelBuffer(size: 1000)
// var b = a          // O(1), shares storage
// b[0] = 255         // triggers the copy; a[0] is still 0`,
  checking: 'Two details. The storage class must be a native Swift final class, because isKnownUniquelyReferenced always returns false for Objective-C classes, which silently degrades into copying on every write. And the uniqueness check belongs in the setter only. Putting it in the getter defeats the purpose.'
});

IPREP.addChallenge({
  id: 'ch-continuation', topic: 'swiftconcurrency', domain: 'concurrency', title: 'Bridge a callback API to async/await', d: 'medium', minutes: 15,
  prompt: 'Wrap this legacy callback API in async/await, propagating errors and supporting cancellation. State the one rule you must not break.',
  starter: `final class LegacyUploader {
    func upload(_ data: Data,
                completion: @escaping (Result<URL, Error>) -> Void) -> UploadTask {
        // ...
    }
}

// Wanted:
// func upload(_ data: Data) async throws -> URL`,
  hints: [
    'withCheckedThrowingContinuation turns a callback into a suspension point.',
    'The continuation must be resumed exactly once. Zero leaks the task forever, twice traps.',
    'For cancellation, withTaskCancellationHandler lets you cancel the underlying task when the enclosing Task is cancelled.'
  ],
  solution: `extension LegacyUploader {
    func upload(_ data: Data) async throws -> URL {
        let box = TaskBox()

        return try await withTaskCancellationHandler {
            try await withCheckedThrowingContinuation { continuation in
                let task = self.upload(data) { result in
                    // Exactly one resume, on every path.
                    continuation.resume(with: result)
                }
                box.task = task
                if box.isCancelled { task.cancel() }
            }
        } onCancel: {
            box.cancel()
        }
    }
}

/// Small thread-safe holder so the cancellation handler can reach the task
/// even if it is created after cancellation arrives.
private final class TaskBox: @unchecked Sendable {
    private let lock = NSLock()
    private var _task: UploadTask?
    private var _cancelled = false

    var task: UploadTask? {
        get { lock.withLock { _task } }
        set { lock.withLock { _task = newValue }; if isCancelled { newValue?.cancel() } }
    }
    var isCancelled: Bool { lock.withLock { _cancelled } }

    func cancel() {
        lock.withLock { _cancelled = true }
        task?.cancel()
    }
}`,
  checking: 'The exactly-once rule, stated without prompting. Beyond that, whether you noticed the race where cancellation arrives before the underlying task is assigned. Handling that is what separates a correct bridge from one that hangs occasionally in production.'
});

IPREP.addChallenge({
  id: 'ch-actorcache', topic: 'swiftconcurrency', domain: 'concurrency', title: 'Actor cache without duplicate work', d: 'hard', minutes: 25,
  prompt: 'This actor cache downloads the same image twice when two callers request it simultaneously. Explain why the actor did not prevent it, then fix it.',
  starter: `actor ImageCache {
    private var cache: [URL: UIImage] = [:]

    func image(for url: URL) async throws -> UIImage {
        if let cached = cache[url] { return cached }
        let image = try await download(url)
        cache[url] = image
        return image
    }

    private func download(_ url: URL) async throws -> UIImage { ... }
}`,
  hints: [
    'Actors serialise access to state, but they are reentrant: another call can run while this one is suspended at an await.',
    'Both callers miss the cache, both suspend at the download, and neither has written back yet.',
    'Store the in-flight Task in the dictionary before awaiting, so the second caller finds it and awaits the same work.'
  ],
  solution: `actor ImageCache {
    private enum Entry {
        case ready(UIImage)
        case loading(Task<UIImage, Error>)
    }

    private var cache: [URL: Entry] = [:]

    func image(for url: URL) async throws -> UIImage {
        // Fast paths, both synchronous inside the actor — no suspension yet.
        switch cache[url] {
        case .ready(let image):
            return image
        case .loading(let task):
            return try await task.value          // join the existing download
        case nil:
            break
        }

        let task = Task { try await self.download(url) }
        cache[url] = .loading(task)              // publish BEFORE awaiting

        do {
            let image = try await task.value
            cache[url] = .ready(image)
            return image
        } catch {
            cache[url] = nil                     // let the next caller retry
            throw error
        }
    }

    private func download(_ url: URL) async throws -> UIImage {
        let (data, _) = try await URLSession.shared.data(from: url)
        guard let image = UIImage(data: data) else { throw URLError(.cannotDecodeContentData) }
        return image
    }
}`,
  checking: 'Whether you can articulate reentrancy: the actor prevented the data race, not the logical race. The key line is publishing the Task into the dictionary before the first await, and the key detail most people miss is clearing the entry on failure, so a transient network error does not permanently cache a failed load.'
});

IPREP.addChallenge({
  id: 'ch-retry', topic: 'network', domain: 'architecture', title: 'Retry with exponential backoff and jitter', d: 'medium', minutes: 20,
  prompt: 'Write a generic async retry helper. Retry only on conditions that can succeed on a repeat, use exponential backoff with jitter, cap attempts and total time, and respect cancellation.',
  starter: `func withRetry<T>(
    maxAttempts: Int = 3,
    operation: () async throws -> T
) async throws -> T {
    // TODO
}`,
  hints: [
    'Not every error is retryable. A 400 will fail identically forever; a 503 or a connection loss will not.',
    'Backoff without jitter means every client retries in lockstep and re-hits a recovering server simultaneously.',
    'Task.sleep throws on cancellation, which gives you cancellation support almost for free.'
  ],
  solution: `enum RetryPolicy {
    static func isRetryable(_ error: Error) -> Bool {
        if let api = error as? APIError {
            switch api {
            case .server(let status, _): return status >= 500 || status == 429
            case .offline, .timeout:     return true
            default:                     return false
            }
        }
        if let url = error as? URLError {
            return [.timedOut, .networkConnectionLost,
                    .notConnectedToInternet, .cannotConnectToHost].contains(url.code)
        }
        return false
    }
}

func withRetry<T>(
    maxAttempts: Int = 3,
    baseDelay: Duration = .milliseconds(300),
    maxDelay: Duration = .seconds(8),
    isRetryable: (Error) -> Bool = RetryPolicy.isRetryable,
    operation: () async throws -> T
) async throws -> T {

    var attempt = 0
    while true {
        do {
            return try await operation()
        } catch is CancellationError {
            throw CancellationError()                 // never retry a cancellation
        } catch {
            attempt += 1
            guard attempt < maxAttempts, isRetryable(error) else { throw error }

            // Exponential backoff with full jitter.
            let exponential = baseDelay * Int(pow(2.0, Double(attempt - 1)))
            let capped = min(exponential, maxDelay)
            let jittered = Duration.seconds(
                Double.random(in: 0...capped.seconds)
            )
            try await Task.sleep(for: jittered)       // throws if cancelled
        }
    }
}

private extension Duration {
    var seconds: Double { Double(components.seconds) + Double(components.attoseconds) / 1e18 }
}`,
  checking: 'Jitter is the discriminator. Plain exponential backoff synchronises every client onto the same retry schedule, so a recovering server gets hit by the whole install base at once. Also that you exclude 4xx other than 429, and that you never retry a cancellation.'
});

IPREP.addChallenge({
  id: 'ch-hittest', topic: 'responder', domain: 'uikit', title: 'Enlarge a small button tap target', d: 'medium', minutes: 12,
  prompt: 'A 24x24pt close button is hard to tap. Enlarge the touch area to 44x44pt without changing its visual size or layout. Then handle the case where the button sits partly outside its parent bounds.',
  starter: `final class CloseButton: UIButton {
    // 24x24 visually. Needs a 44x44 touch target.
}`,
  hints: [
    'Hit testing calls point(inside:with:) before descending. Overriding it changes what counts as inside.',
    'insetBy with a negative value grows a rectangle.',
    'If the button extends outside its parent, the parent returns false for point(inside:) and hit testing never reaches the button at all.'
  ],
  solution: `final class CloseButton: UIButton {
    private let minimumTarget = CGSize(width: 44, height: 44)

    override func point(inside point: CGPoint, with event: UIEvent?) -> Bool {
        let dx = min(0, bounds.width  - minimumTarget.width)  / 2
        let dy = min(0, bounds.height - minimumTarget.height) / 2
        return bounds.insetBy(dx: dx, dy: dy).contains(point)
    }
}

/// Case two: the button hangs outside its parent, so hit testing
/// never descends into it. The parent must opt in.
final class BadgeContainerView: UIView {
    override func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? {
        if let hit = super.hitTest(point, with: event) { return hit }

        // Give overflowing subviews a chance.
        for subview in subviews.reversed() where !subview.isHidden
            && subview.isUserInteractionEnabled && subview.alpha > 0.01 {
            let converted = subview.convert(point, from: self)
            if let hit = subview.hitTest(converted, with: event) { return hit }
        }
        return nil
    }
}`,
  checking: 'That you separate the two problems. Growing the button own hit rect does nothing if the parent rejects the point first, and clipsToBounds is irrelevant to both because it affects drawing only. Interviewers use this to see whether you understand that visibility and touchability are separate systems.'
});

IPREP.addChallenge({
  id: 'ch-firstuniq', topic: 'dicts', domain: 'foundation', title: 'First non-repeating character', d: 'easy', minutes: 12,
  prompt: 'Return the first character in a string that appears exactly once, or nil. Then state the complexity and explain the Swift String indexing trap.',
  starter: `func firstUnique(in s: String) -> Character? {
    // TODO
}`,
  hints: [
    'One pass to count, one pass to find the first with count 1. Two passes is still O(n).',
    'A dictionary of Character to Int gives O(1) counting.',
    'Do not try to index a String with an Int; Character is a variable-width grapheme cluster.'
  ],
  solution: `func firstUnique(in s: String) -> Character? {
    var counts: [Character: Int] = [:]
    counts.reserveCapacity(s.count)

    for ch in s {
        counts[ch, default: 0] += 1
    }
    return s.first { counts[$0] == 1 }
}

// O(n) time, O(k) space where k is the alphabet size.
//
// The trap: Swift String is not random access. s[3] does not compile
// because Character is an extended grapheme cluster of variable width,
// so indices are String.Index, not Int, and offsetting is O(n).
// Iterating with for-in, as above, is the idiomatic O(n) traversal.

// If you also need the index:
func firstUniqueIndex(in s: String) -> String.Index? {
    var counts: [Character: Int] = [:]
    for ch in s { counts[ch, default: 0] += 1 }
    return s.indices.first { counts[s[$0]] == 1 }
}`,
  checking: 'Idiomatic Swift more than the algorithm. Using counts[ch, default: 0] += 1 rather than a nil-coalescing double lookup, and knowing why you cannot write s[3]. Reaching for Array(s) to get integer indexing is acceptable if you say out loud that it costs O(n) memory.'
});

IPREP.addChallenge({
  id: 'ch-anagram', topic: 'dicts', domain: 'foundation', title: 'Group anagrams', d: 'medium', minutes: 15,
  prompt: 'Given an array of strings, group the anagrams together. Return an array of groups. Discuss the two keying strategies and their trade-off.',
  starter: `func groupAnagrams(_ words: [String]) -> [[String]] {
    // TODO
}`,
  hints: [
    'Two words are anagrams if some canonical form of them is equal. What canonical form is cheap to compute?',
    'Sorting the characters is O(k log k) per word. A character-count signature is O(k).',
    'Dictionary of key to [String], then return the values.'
  ],
  solution: `func groupAnagrams(_ words: [String]) -> [[String]] {
    var groups: [String: [String]] = [:]

    for word in words {
        let key = String(word.sorted())
        groups[key, default: []].append(word)
    }
    return Array(groups.values)
}

// Alternative key: a character-count signature, O(k) instead of O(k log k).
// Worth it when words are long; the sort is simpler and usually fine.
func groupAnagramsByCount(_ words: [String]) -> [[String]] {
    var groups: [[Character: Int]: [String]] = [:]

    for word in words {
        var signature: [Character: Int] = [:]
        for ch in word { signature[ch, default: 0] += 1 }
        groups[signature, default: []].append(word)
    }
    return Array(groups.values)
}

// Overall: O(n * k log k) for the sort version, O(n * k) for the count version,
// where n is the word count and k the average word length.`,
  checking: 'That you use the default subscript for the append, which mutates in place through the modify accessor rather than copying the array out and back. And that you can compare the two key strategies rather than asserting one is correct.'
});

IPREP.addChallenge({
  id: 'ch-reverselist', topic: 'valueref', domain: 'language', title: 'Reverse a linked list', d: 'medium', minutes: 15,
  prompt: 'Reverse a singly linked list iteratively in O(1) extra space, then recursively. Note what ARC is doing while you rewire the pointers.',
  starter: `final class ListNode {
    var value: Int
    var next: ListNode?
    init(_ value: Int) { self.value = value }
}

func reverse(_ head: ListNode?) -> ListNode? {
    // TODO
}`,
  hints: [
    'Keep three pointers: previous, current, and the saved next. Rewiring loses your handle on the rest of the list unless you save it first.',
    'The loop invariant: everything before current is already reversed.',
    'For the recursive version, recurse to the tail first, then rewire on the way back up.'
  ],
  solution: `func reverse(_ head: ListNode?) -> ListNode? {
    var previous: ListNode? = nil
    var current = head

    while let node = current {
        let next = node.next        // save before we destroy the link
        node.next = previous        // rewire
        previous = node             // advance
        current = next
    }
    return previous                 // new head
}

// Recursive: O(n) time, O(n) stack.
func reverseRecursive(_ head: ListNode?) -> ListNode? {
    guard let head, let next = head.next else { return head }
    let newHead = reverseRecursive(next)
    next.next = head
    head.next = nil                 // critical: otherwise you build a cycle
    return newHead
}

// ARC note: next is a strong reference, so a long list deallocates
// recursively when the head is released, and a list of ~100k nodes
// can overflow the stack in deinit. Production code uses an unowned
// or manual teardown loop for very long lists.`,
  checking: 'The head.next = nil line in the recursive version, which candidates forget and thereby create a two-node cycle. The ARC observation about recursive deallocation is a bonus that signals you think about Swift specifically rather than reciting a generic algorithm.'
});

IPREP.addChallenge({
  id: 'ch-floyd', topic: 'arc', domain: 'language', title: 'Detect a cycle in O(1) space', d: 'medium', minutes: 15,
  prompt: 'Detect whether a linked list contains a cycle using constant extra space, and return the node where the cycle begins. Then connect this to retain cycles.',
  starter: `func cycleStart(_ head: ListNode?) -> ListNode? {
    // TODO — O(1) extra space
}`,
  hints: [
    'A Set of visited nodes works but costs O(n) space. The constraint rules it out.',
    'Two pointers moving at different speeds must meet if there is a cycle.',
    'After they meet, reset one pointer to the head and advance both one step at a time. They meet at the cycle start.'
  ],
  solution: `func cycleStart(_ head: ListNode?) -> ListNode? {
    var slow = head
    var fast = head

    // Phase 1: find a meeting point inside the cycle, if any.
    while fast != nil && fast?.next != nil {
        slow = slow?.next
        fast = fast?.next?.next
        if slow === fast { break }
    }
    guard fast != nil, fast?.next != nil else { return nil }   // no cycle

    // Phase 2: distance from head to start equals distance from
    // meeting point to start, so advance both one step at a time.
    slow = head
    while slow !== fast {
        slow = slow?.next
        fast = fast?.next
    }
    return slow
}

// The connection: ARC cannot do this. Reference counting only knows
// how many references point at an object, never whether they form a
// cycle, so an unreachable cycle keeps a nonzero count forever.
// A tracing collector would walk the graph and find it; ARC does not
// walk anything. That is exactly why weak and unowned exist.`,
  checking: 'The phase-two insight, which is the part that separates memorisation from understanding. The ARC connection is what makes this an iOS interview question rather than a generic one, and volunteering it unprompted lands well.'
});

IPREP.addChallenge({
  id: 'ch-mergesorted', topic: 'arrays', domain: 'foundation', title: 'Merge two sorted arrays in place', d: 'easy', minutes: 12,
  prompt: 'Merge two sorted arrays into one sorted array. Then do the in-place variant where the first array has enough trailing capacity, and explain why you fill from the back.',
  starter: `func merge(_ a: [Int], _ b: [Int]) -> [Int] {
    // TODO
}`,
  hints: [
    'Two indices walking forward, always taking the smaller head.',
    'reserveCapacity avoids repeated reallocation as the result grows.',
    'For the in-place version, filling from the front would overwrite elements you have not read yet.'
  ],
  solution: `func merge(_ a: [Int], _ b: [Int]) -> [Int] {
    var result: [Int] = []
    result.reserveCapacity(a.count + b.count)   // one allocation, not log n

    var i = 0, j = 0
    while i < a.count && j < b.count {
        if a[i] <= b[j] { result.append(a[i]); i += 1 }
        else            { result.append(b[j]); j += 1 }
    }
    result.append(contentsOf: a[i...])
    result.append(contentsOf: b[j...])
    return result
}

/// In place: nums1 has m real elements then n empty slots.
func merge(_ nums1: inout [Int], _ m: Int, _ nums2: [Int], _ n: Int) {
    var i = m - 1          // last real element of nums1
    var j = n - 1          // last element of nums2
    var k = m + n - 1      // last slot overall

    while j >= 0 {
        if i >= 0 && nums1[i] > nums2[j] {
            nums1[k] = nums1[i]; i -= 1
        } else {
            nums1[k] = nums2[j]; j -= 1
        }
        k -= 1
    }
}

// Filling from the back writes only into slots that are already empty
// or already consumed, so nothing is clobbered. Front-filling would
// overwrite nums1[i] before it has been read.`,
  checking: 'reserveCapacity, which shows you know Array growth is amortised through reallocation. And the back-to-front reasoning, stated as a reason rather than a memorised trick. The <= rather than < in the comparison keeps the merge stable, which is worth mentioning.'
});

IPREP.addChallenge({
  id: 'ch-coordinator', topic: 'navigation', domain: 'architecture', title: 'Coordinator for a two-screen flow', d: 'medium', minutes: 25,
  prompt: 'Build a coordinator for a login flow: LoginViewController, then on success a TwoFactorViewController, then hand control back to the parent. Handle the case where the user backs out mid-flow.',
  starter: `protocol Coordinator: AnyObject {
    var childCoordinators: [Coordinator] { get set }
    func start()
}

final class AuthCoordinator: Coordinator {
    var childCoordinators: [Coordinator] = []
    // TODO
}`,
  hints: [
    'The view controllers should not know what comes next. Give them closures or a delegate the coordinator sets.',
    'The parent needs to know when the flow ended. A didFinish callback is the usual mechanism.',
    'Nothing tells you the user swiped back. UINavigationControllerDelegate.didShow lets you detect it.'
  ],
  solution: `protocol Coordinator: AnyObject {
    var childCoordinators: [Coordinator] { get set }
    func start()
}

final class AuthCoordinator: NSObject, Coordinator {
    var childCoordinators: [Coordinator] = []

    private let navigation: UINavigationController
    private let authService: AuthService
    var onFinish: ((Result<Session, Error>) -> Void)?

    init(navigation: UINavigationController, authService: AuthService) {
        self.navigation = navigation
        self.authService = authService
    }

    func start() {
        let vc = LoginViewController(service: authService)
        vc.onCredentials = { [weak self] credentials in
            self?.showTwoFactor(for: credentials)
        }
        navigation.delegate = self
        navigation.pushViewController(vc, animated: true)
    }

    private func showTwoFactor(for credentials: Credentials) {
        let vc = TwoFactorViewController(service: authService, credentials: credentials)
        vc.onVerified = { [weak self] session in
            self?.finish(.success(session))
        }
        navigation.pushViewController(vc, animated: true)
    }

    private func finish(_ result: Result<Session, Error>) {
        navigation.delegate = nil
        onFinish?(result)                 // parent removes us from childCoordinators
    }
}

// Detect the user backing out of the flow entirely.
extension AuthCoordinator: UINavigationControllerDelegate {
    func navigationController(_ nav: UINavigationController,
                              didShow viewController: UIViewController,
                              animated: Bool) {
        guard let from = nav.transitionCoordinator?.viewController(forKey: .from),
              !nav.viewControllers.contains(from) else { return }

        if from is LoginViewController {
            finish(.failure(AuthError.cancelled))   // flow abandoned
        }
    }
}

// Parent side:
// let auth = AuthCoordinator(navigation: nav, authService: service)
// auth.onFinish = { [weak self, weak auth] result in
//     self?.childCoordinators.removeAll { $0 === auth }
//     ...
// }
// childCoordinators.append(auth)
// auth.start()`,
  checking: 'The back-out handling. Almost everyone writes the happy path; the memory leak lives in the case nobody handles. The parent removing the child from childCoordinators in onFinish is the other half, and omitting it means every abandoned flow stays in memory for the life of the app.'
});

IPREP.addChallenge({
  id: 'ch-diff', topic: 'cellreuse', domain: 'uikit', title: 'Diff two arrays for table updates', d: 'hard', minutes: 25,
  prompt: 'Given an old and new array of identifiable items, compute the inserted, deleted and moved index paths needed to animate a table view update. Then say when you would use this versus a diffable data source.',
  starter: `struct Changes {
    var inserted: [Int]
    var deleted: [Int]
    var moved: [(from: Int, to: Int)]
}

func diff<T: Hashable>(old: [T], new: [T]) -> Changes {
    // TODO
}`,
  hints: [
    'Sets give you inserted and deleted in O(n). The hard part is moves.',
    'Build index maps for both arrays first, so lookups are O(1) rather than firstIndex(of:) inside a loop.',
    'An item is moved if it exists in both but at a different index after accounting for insertions and deletions.'
  ],
  solution: `struct Changes {
    var inserted: [Int] = []
    var deleted: [Int] = []
    var moved: [(from: Int, to: Int)] = []
    var isEmpty: Bool { inserted.isEmpty && deleted.isEmpty && moved.isEmpty }
}

func diff<T: Hashable>(old: [T], new: [T]) -> Changes {
    var oldIndex: [T: Int] = [:]
    for (i, item) in old.enumerated() { oldIndex[item] = i }

    var newIndex: [T: Int] = [:]
    for (i, item) in new.enumerated() { newIndex[item] = i }

    var changes = Changes()

    // Deletions: present in old, absent in new.
    for (i, item) in old.enumerated() where newIndex[item] == nil {
        changes.deleted.append(i)
    }

    // Insertions and moves.
    for (i, item) in new.enumerated() {
        guard let from = oldIndex[item] else {
            changes.inserted.append(i)
            continue
        }
        if from != i { changes.moved.append((from: from, to: i)) }
    }
    return changes
}

// Applying it:
// tableView.performBatchUpdates {
//     tableView.deleteRows(at: changes.deleted.map { IndexPath(row: $0, section: 0) }, with: .fade)
//     tableView.insertRows(at: changes.inserted.map { IndexPath(row: $0, section: 0) }, with: .fade)
//     for move in changes.moved {
//         tableView.moveRow(at: IndexPath(row: move.from, section: 0),
//                           to:   IndexPath(row: move.to,   section: 0))
//     }
// }`,
  checking: 'Building the index maps up front rather than calling firstIndex(of:) inside the loop, which would make it O(n^2). And the honest closing answer: use UITableViewDiffableDataSource in production, because it handles this correctly including the interaction between moves and index shifting, which the naive version above gets subtly wrong for some sequences.'
});

IPREP.addChallenge({
  id: 'ch-heightcache', topic: 'autolayout', domain: 'uikit', title: 'Cache self-sizing cell heights', d: 'medium', minutes: 20,
  prompt: 'A feed with variable-height cells has a jumping scroll indicator and stutters when scrolling back up. Explain why, then fix it with a height cache.',
  starter: `override func tableView(_ tv: UITableView,
                        estimatedHeightForRowAt indexPath: IndexPath) -> CGFloat {
    return 100   // wildly wrong for most rows
}`,
  hints: [
    'The scroll indicator size is derived from estimated heights for rows that have not been measured yet.',
    'Once a cell has been displayed you know its real height. Store it.',
    'Key the cache by a stable item identifier, not by index path, or it breaks the moment rows are inserted.'
  ],
  solution: `final class FeedViewController: UITableViewController {
    private var items: [Post] = []
    private var heightCache: [Post.ID: CGFloat] = [:]

    override func viewDidLoad() {
        super.viewDidLoad()
        tableView.rowHeight = UITableView.automaticDimension
        tableView.estimatedRowHeight = 120
    }

    override func tableView(_ tv: UITableView,
                            estimatedHeightForRowAt indexPath: IndexPath) -> CGFloat {
        // A measured height is exact; fall back to a reasonable guess.
        heightCache[items[indexPath.row].id] ?? 120
    }

    // Record the real height once the cell has actually been laid out.
    override func tableView(_ tv: UITableView,
                            didEndDisplaying cell: UITableViewCell,
                            forRowAt indexPath: IndexPath) {
        guard indexPath.row < items.count else { return }
        heightCache[items[indexPath.row].id] = cell.frame.height
    }

    // Content width changes invalidate every cached height.
    override func viewWillTransition(to size: CGSize,
                                     with coordinator: UIViewControllerTransitionCoordinator) {
        super.viewWillTransition(to: size, with: coordinator)
        heightCache.removeAll()
    }
}`,
  checking: 'Keying by item identity rather than index path. Index-path keys look fine until the first insertion, after which every cached height belongs to the wrong row and the scroll position jumps. The rotation invalidation is the second thing candidates miss, since a width change makes every measured height wrong.'
});

IPREP.addChallenge({
  id: 'ch-ratelimit', topic: 'battery', domain: 'performance', title: 'Token bucket rate limiter', d: 'hard', minutes: 25,
  prompt: 'Implement a rate limiter that allows at most N operations per time window, with bursting. Make it safe for concurrent callers and non-blocking. Explain why you would use it on a mobile client.',
  starter: `actor RateLimiter {
    init(capacity: Int, refillPerSecond: Double) {
        // TODO
    }
    func acquire() async {
        // Suspend until a token is available.
    }
}`,
  hints: [
    'Token bucket: tokens accumulate at a fixed rate up to a capacity. Each operation consumes one.',
    'You do not need a timer. Compute how many tokens accrued from the elapsed time on each call.',
    'If no token is available, compute how long until one is and Task.sleep for exactly that long.'
  ],
  solution: `actor RateLimiter {
    private let capacity: Double
    private let refillRate: Double        // tokens per second
    private var tokens: Double
    private var lastRefill: ContinuousClock.Instant

    init(capacity: Int, refillPerSecond: Double) {
        self.capacity = Double(capacity)
        self.refillRate = refillPerSecond
        self.tokens = Double(capacity)    // start full, allowing an initial burst
        self.lastRefill = ContinuousClock.now
    }

    func acquire() async throws {
        while true {
            refill()
            if tokens >= 1 {
                tokens -= 1
                return
            }
            // Sleep exactly as long as one token needs, no polling.
            let deficit = 1 - tokens
            let seconds = deficit / refillRate
            try await Task.sleep(for: .seconds(seconds))
        }
    }

    private func refill() {
        let now = ContinuousClock.now
        let elapsed = (now - lastRefill).seconds
        lastRefill = now
        tokens = min(capacity, tokens + elapsed * refillRate)
    }
}

private extension Duration {
    var seconds: Double { Double(components.seconds) + Double(components.attoseconds) / 1e18 }
}

// Usage: cap image prefetching at 6 per second with a burst of 10.
// let limiter = RateLimiter(capacity: 10, refillPerSecond: 6)
// try await limiter.acquire()
// await load(url)`,
  checking: 'That you compute tokens lazily from elapsed time instead of running a timer, which would keep the CPU waking. And the mobile justification: it bounds concurrent connections during a fast scroll, protects a rate-limited backend, and keeps the radio from being hammered with a burst of tiny requests.'
});

IPREP.addChallenge({
  id: 'ch-pagination', topic: 'network', domain: 'architecture', title: 'Paginated feed loader', d: 'hard', minutes: 30,
  prompt: 'Design a paginated feed loader: cursor-based paging, no duplicate page requests, pull to refresh that resets, and correct behaviour when a refresh lands while a page load is in flight.',
  starter: `@MainActor
final class FeedStore: ObservableObject {
    @Published private(set) var items: [Post] = []
    func loadNextPage() async { }
    func refresh() async { }
}`,
  hints: [
    'Guard against a second loadNextPage while one is already running, or a fast scroll fires five identical requests.',
    'A refresh must invalidate any in-flight page load, or the stale page appends after the reset.',
    'A generation counter is the simplest way to discard results from a superseded request.'
  ],
  solution: `@MainActor
final class FeedStore: ObservableObject {
    @Published private(set) var items: [Post] = []
    @Published private(set) var isLoadingPage = false
    @Published private(set) var error: Error?

    private let api: FeedAPI
    private var cursor: String?
    private var hasMore = true
    private var generation = 0            // invalidates superseded requests
    private var pageTask: Task<Void, Never>?

    init(api: FeedAPI) { self.api = api }

    func loadNextPage() async {
        guard !isLoadingPage, hasMore else { return }   // dedupe + end of list
        isLoadingPage = true
        let myGeneration = generation
        let requestCursor = cursor

        defer { if myGeneration == generation { isLoadingPage = false } }

        do {
            let page = try await api.feed(after: requestCursor)
            guard myGeneration == generation else { return }   // a refresh superseded us

            items.append(contentsOf: page.items)
            cursor = page.nextCursor
            hasMore = page.nextCursor != nil
            error = nil
        } catch is CancellationError {
            return
        } catch {
            guard myGeneration == generation else { return }
            self.error = error
        }
    }

    func refresh() async {
        generation += 1                   // everything in flight is now stale
        pageTask?.cancel()
        cursor = nil
        hasMore = true
        isLoadingPage = false

        do {
            let page = try await api.feed(after: nil)
            items = page.items            // replace, do not append
            cursor = page.nextCursor
            hasMore = page.nextCursor != nil
            error = nil
        } catch {
            self.error = error            // keep existing items on failure
        }
    }
}`,
  checking: 'The generation counter, or any equivalent invalidation. Without it, a pull to refresh followed by a slow page response appends page two of the old feed onto the fresh page one, producing duplicates and a broken cursor. Also that a failed refresh keeps the existing items rather than blanking the screen.'
});

IPREP.addChallenge({
  id: 'ch-mapfilter', topic: 'generics', domain: 'language', title: 'Implement map, filter and compactMap', d: 'medium', minutes: 18,
  prompt: 'Implement map, filter and compactMap yourself as extensions on Sequence, with correct generic signatures including throwing and rethrows. Then explain what rethrows buys the caller.',
  starter: `extension Sequence {
    func myMap<T>(_ transform: (Element) -> T) -> [T] {
        // TODO
    }
}`,
  hints: [
    'The transform may throw. Marking the parameter throws and the function rethrows means non-throwing callers do not need try.',
    'reserveCapacity where you can know the size; Sequence only gives you underestimatedCount.',
    'compactMap is map followed by dropping nils, expressed as a transform returning an Optional.'
  ],
  solution: `extension Sequence {

    func myMap<T>(_ transform: (Element) throws -> T) rethrows -> [T] {
        var result: [T] = []
        result.reserveCapacity(underestimatedCount)
        for element in self {
            result.append(try transform(element))
        }
        return result
    }

    func myFilter(_ isIncluded: (Element) throws -> Bool) rethrows -> [Element] {
        var result: [Element] = []
        for element in self where try isIncluded(element) {
            result.append(element)
        }
        return result
    }

    func myCompactMap<T>(_ transform: (Element) throws -> T?) rethrows -> [T] {
        var result: [T] = []
        result.reserveCapacity(underestimatedCount)
        for element in self {
            if let value = try transform(element) {
                result.append(value)
            }
        }
        return result
    }

    func myReduce<R>(_ initial: R,
                     _ combine: (R, Element) throws -> R) rethrows -> R {
        var accumulator = initial
        for element in self {
            accumulator = try combine(accumulator, element)
        }
        return accumulator
    }
}

// rethrows means: this function throws only if the closure you passed
// throws. So a caller passing a non-throwing closure writes
//     let names = users.myMap { $0.name }
// with no try and no do/catch, while a caller passing a throwing closure
// gets full error propagation. throws alone would force try on everyone.`,
  checking: 'rethrows specifically. Writing throws instead compiles but degrades every call site, and the ability to explain the difference is a reliable signal of Swift depth. reserveCapacity with underestimatedCount rather than count is the second detail, since Sequence may be single-pass and has no count.'
});

IPREP.addChallenge({
  id: 'ch-parallel', topic: 'swiftconcurrency', domain: 'concurrency', title: 'Bounded parallel downloads', d: 'hard', minutes: 25,
  prompt: 'Download 500 images with at most 6 concurrent requests, returning results in the original order, cancelling everything if any one fails. Then say why the naive task group version is wrong.',
  starter: `func downloadAll(_ urls: [URL]) async throws -> [Data] {
    // Naive: one task per URL — 500 concurrent connections.
}`,
  hints: [
    'Adding all 500 tasks to a group starts all 500 at once. The group bounds lifetime, not concurrency.',
    'Add only the first N tasks, then add one more each time a result comes back.',
    'Task groups yield results in completion order, so you must carry the index and reorder at the end.'
  ],
  solution: `func downloadAll(_ urls: [URL], maxConcurrent: Int = 6) async throws -> [Data] {
    try await withThrowingTaskGroup(of: (Int, Data).self) { group in
        var results = [Data?](repeating: nil, count: urls.count)
        var next = 0

        // Prime the pump with at most maxConcurrent tasks.
        while next < min(maxConcurrent, urls.count) {
            let index = next
            group.addTask { (index, try await fetch(urls[index])) }
            next += 1
        }

        // Each completion frees a slot; add exactly one more.
        while let (index, data) = try await group.next() {
            results[index] = data
            if next < urls.count {
                let i = next
                group.addTask { (i, try await fetch(urls[i])) }
                next += 1
            }
        }
        // A throw here cancels the remaining children automatically.
        return results.compactMap { $0 }
    }
}

private func fetch(_ url: URL) async throws -> Data {
    let (data, _) = try await URLSession.shared.data(from: url)
    return data
}

// Why the naive version is wrong: withThrowingTaskGroup bounds the
// LIFETIME of child tasks, not how many run at once. Adding 500 tasks
// starts 500 suspensions competing for connections, blowing past
// URLSession per-host limits and spiking memory with 500 in-flight
// buffers. The group gives you cancellation for free; concurrency
// limiting is still your job.`,
  checking: 'The distinction between lifetime and concurrency, which is the single most common misunderstanding of task groups. Also carrying the index through so you can restore order, since group.next() yields in completion order, and knowing that a throw inside the group cancels the siblings automatically.'
});

IPREP.addChallenge({
  id: 'ch-mainactor', topic: 'threadsafety', domain: 'concurrency', title: 'Fix the threading bugs', d: 'medium', minutes: 18,
  prompt: 'This view model has four threading bugs. Find and fix all of them, then rewrite it using @MainActor and async/await.',
  starter: `final class ProfileViewModel {
    var onUpdate: (() -> Void)?
    private var profile: Profile?
    private var isLoading = false

    func load(id: String) {
        isLoading = true
        URLSession.shared.dataTask(with: url(for: id)) { data, _, _ in
            guard let data else { return }
            self.profile = try? JSONDecoder().decode(Profile.self, from: data)
            self.isLoading = false
            self.onUpdate?()
        }.resume()
    }
}`,
  hints: [
    'Where does the URLSession completion handler run?',
    'What happens if load is called twice quickly, from two places?',
    'Look at the early return. What is left in an inconsistent state?'
  ],
  solution: `// The four bugs:
// 1. onUpdate?() fires on a URLSession background queue, so the UI
//    updates off the main thread.
// 2. profile and isLoading are mutated from a background queue while
//    the main thread reads them — an unsynchronised data race.
// 3. The early return on nil data leaves isLoading stuck at true forever.
// 4. Two concurrent loads race; the slower response wins arbitrarily,
//    and the shared task is never cancelled.

@MainActor
final class ProfileViewModel: ObservableObject {
    @Published private(set) var profile: Profile?
    @Published private(set) var isLoading = false
    @Published private(set) var error: Error?

    private var loadTask: Task<Void, Never>?

    func load(id: String) {
        loadTask?.cancel()                       // bug 4: supersede the old load
        loadTask = Task {
            isLoading = true
            defer { isLoading = false }          // bug 3: always cleared

            do {
                let (data, _) = try await URLSession.shared.data(from: url(for: id))
                try Task.checkCancellation()
                // Bugs 1 and 2: @MainActor guarantees this runs on the main
                // actor, so no hop is needed and no race is possible.
                profile = try JSONDecoder().decode(Profile.self, from: data)
                error = nil
            } catch is CancellationError {
                return
            } catch {
                self.error = error
            }
        }
    }

    deinit { loadTask?.cancel() }
}`,
  checking: 'Whether you find all four, especially the stuck isLoading flag, which produces a spinner that never stops and is a real bug shipped constantly. The @MainActor rewrite should be framed as eliminating two of the bugs structurally rather than fixing them one by one.'
});

/* ---- SwiftUI challenges ---- */

IPREP.addChallenge({
  id: 'ch-stateobject', topic: 'swiftui-state', domain: 'swiftui',
  title: 'Find the state bugs', d: 'medium', minutes: 18,
  prompt: 'This SwiftUI screen loses its data whenever the parent redraws, and the counter resets when the filter toggles. Find every bug and fix them.',
  starter: `final class FeedViewModel: ObservableObject {
    @Published var posts: [Post] = []
    func load() async { posts = await api.posts() }
}

struct FeedScreen: View {
    @ObservedObject var vm = FeedViewModel()
    @State var showUnreadOnly = false

    var body: some View {
        VStack {
            Toggle("Unread only", isOn: $showUnreadOnly)

            if showUnreadOnly {
                List(vm.posts.filter(\\.isUnread)) { PostRow(post: $0) }
            } else {
                List(vm.posts) { PostRow(post: $0) }
            }
        }
        .onAppear { Task { await vm.load() } }
    }
}`,
  hints: [
    '@ObservedObject does not own the object. What happens to the initialiser when the parent recreates this struct?',
    'The if/else creates two different structural identities. Any state inside those branches is discarded on every toggle.',
    'onAppear plus a manual Task does not cancel when the view disappears, and onAppear can fire more than once.'
  ],
  solution: `// Bugs:
// 1. @ObservedObject var vm = FeedViewModel() recreates the view model
//    every time the parent re-renders, wiping posts and restarting the load.
// 2. The if/else gives the two Lists different structural identities, so any
//    @State inside PostRow (and the scroll position) is destroyed on toggle.
// 3. onAppear + Task is not cancelled on disappear, and onAppear can fire
//    more than once, so load() can run concurrently with itself.
// 4. @State should be private; it is this view's own storage.

@Observable
@MainActor
final class FeedViewModel {
    private(set) var posts: [Post] = []
    private var isLoading = false

    func load() async {
        guard !isLoading else { return }      // fix 3: dedupe
        isLoading = true
        defer { isLoading = false }
        posts = await api.posts()
    }
}

struct FeedScreen: View {
    @State private var vm = FeedViewModel()   // fix 1 and 4: this view owns it
    @State private var showUnreadOnly = false

    // fix 2: one List, one identity. The data changes, the view does not.
    private var visible: [Post] {
        showUnreadOnly ? vm.posts.filter(\\.isUnread) : vm.posts
    }

    var body: some View {
        VStack {
            Toggle("Unread only", isOn: $showUnreadOnly)
            List(visible) { PostRow(post: $0) }
        }
        .task { await vm.load() }             // fix 3: cancels on disappear
    }
}`,
  checking: 'Whether you can explain WHY each one breaks, not just the fix. The @ObservedObject lifetime and the if/else identity rule are the two things a senior SwiftUI candidate is expected to know cold. Collapsing the branches into one List with derived data is the move that shows you think in terms of identity rather than in terms of view code.'
});

IPREP.addChallenge({
  id: 'ch-representable', topic: 'swiftui-interop', domain: 'swiftui',
  title: 'Wrap a UIKit view for SwiftUI', d: 'medium', minutes: 22,
  prompt: 'Wrap UITextView so SwiftUI can use it as a multi-line text editor with a two-way text binding. It must size itself to its content, report edits back, and not fight SwiftUI on every keystroke.',
  starter: `struct RichTextEditor: UIViewRepresentable {
    @Binding var text: String
    // TODO
}`,
  hints: [
    'makeUIView runs once; updateUIView runs on every dependency change. Do not allocate in updateUIView.',
    'You need a Coordinator to adopt UITextViewDelegate and write back through the binding.',
    'Writing the binding on every keystroke re-renders SwiftUI, which calls updateUIView, which sets text again. Guard against the echo.'
  ],
  solution: `struct RichTextEditor: UIViewRepresentable {
    @Binding var text: String
    var font: UIFont = .preferredFont(forTextStyle: .body)

    func makeUIView(context: Context) -> UITextView {
        let view = UITextView()
        view.delegate = context.coordinator
        view.font = font
        view.backgroundColor = .clear
        view.textContainerInset = .zero
        view.textContainer.lineFragmentPadding = 0
        view.isScrollEnabled = false          // let SwiftUI own the height
        view.setContentCompressionResistancePriority(.required, for: .vertical)
        return view
    }

    func updateUIView(_ view: UITextView, context: Context) {
        // Guard the echo: SwiftUI re-renders after our own binding write,
        // and reassigning text would reset the selection on every keystroke.
        if view.text != text { view.text = text }
        if view.font != font { view.font = font }
    }

    // iOS 16+: answer the layout proposal explicitly instead of collapsing.
    func sizeThatFits(_ proposal: ProposedViewSize,
                      uiView: UITextView,
                      context: Context) -> CGSize? {
        let width = proposal.width ?? UIView.layoutFittingCompressedSize.width
        let size = uiView.sizeThatFits(CGSize(width: width,
                                              height: .greatestFiniteMagnitude))
        return CGSize(width: width, height: size.height)
    }

    func makeCoordinator() -> Coordinator { Coordinator(text: $text) }

    final class Coordinator: NSObject, UITextViewDelegate {
        private let text: Binding<String>
        init(text: Binding<String>) { self.text = text }

        func textViewDidChange(_ textView: UITextView) {
            text.wrappedValue = textView.text
        }
    }
}`,
  checking: 'The echo guard, which is the bug that makes hand-rolled representables feel broken: without the `if view.text != text` check the cursor jumps to the end on every keystroke. Also that you implement sizeThatFits rather than shrugging at a collapsed height, and that makeUIView does the allocating while updateUIView only applies state.'
});

IPREP.addChallenge({
  id: 'ch-swiftui-layout', topic: 'swiftui-layout', domain: 'swiftui',
  title: 'Wrapping tag layout', d: 'hard', minutes: 28,
  prompt: 'Build a flow layout that arranges tag chips left to right and wraps to the next line when it runs out of width. Use the Layout protocol, not GeometryReader.',
  starter: `struct FlowLayout: Layout {
    var spacing: CGFloat = 8
    // TODO: sizeThatFits and placeSubviews
}`,
  hints: [
    'Layout has two required methods: sizeThatFits reports how much room you need, placeSubviews positions each child.',
    'Both methods need the same line-breaking arithmetic. Compute the rows once in a helper and use it from both.',
    'Ask each subview for its ideal size with subview.sizeThatFits(.unspecified), then walk the width accumulating rows.'
  ],
  solution: `struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize,
                      subviews: Subviews,
                      cache: inout ()) -> CGSize {
        let maxWidth = proposal.width ?? .infinity
        let rows = layout(subviews: subviews, maxWidth: maxWidth)

        let height = rows.reduce(0) { $0 + $1.height } +
                     spacing * CGFloat(max(0, rows.count - 1))
        let width = rows.map(\\.width).max() ?? 0
        return CGSize(width: proposal.width ?? width, height: height)
    }

    func placeSubviews(in bounds: CGRect,
                       proposal: ProposedViewSize,
                       subviews: Subviews,
                       cache: inout ()) {
        let rows = layout(subviews: subviews, maxWidth: bounds.width)
        var y = bounds.minY

        for row in rows {
            var x = bounds.minX
            for item in row.items {
                subviews[item.index].place(
                    at: CGPoint(x: x, y: y),
                    proposal: ProposedViewSize(item.size)
                )
                x += item.size.width + spacing
            }
            y += row.height + spacing
        }
    }

    // MARK: - shared line breaking

    private struct Item { let index: Int; let size: CGSize }
    private struct Row {
        var items: [Item] = []
        var width: CGFloat = 0
        var height: CGFloat = 0
    }

    private func layout(subviews: Subviews, maxWidth: CGFloat) -> [Row] {
        var rows: [Row] = []
        var current = Row()

        for index in subviews.indices {
            let size = subviews[index].sizeThatFits(.unspecified)
            let needed = current.items.isEmpty ? size.width
                                               : current.width + spacing + size.width

            if needed > maxWidth, !current.items.isEmpty {
                rows.append(current)
                current = Row()
                current.items = [Item(index: index, size: size)]
                current.width = size.width
                current.height = size.height
            } else {
                if !current.items.isEmpty { current.width += spacing }
                current.items.append(Item(index: index, size: size))
                current.width += size.width
                current.height = max(current.height, size.height)
            }
        }
        if !current.items.isEmpty { rows.append(current) }
        return rows
    }
}

// Usage:
// FlowLayout(spacing: 8) {
//     ForEach(tags, id: \\.self) { TagChip(text: $0) }
// }`,
  checking: 'That the two protocol methods agree. The classic bug is computing rows differently in sizeThatFits and placeSubviews, which reports one height and draws another, so content clips or leaves a gap. Factoring the line breaking into a shared helper is the fix and the thing to point at. Bonus if you mention the cache parameter exists to avoid recomputing this on every pass.'
});

IPREP.addChallenge({
  id: 'ch-swiftui-perf', topic: 'swiftui-identity', domain: 'swiftui',
  title: 'Stop the unnecessary re-renders', d: 'hard', minutes: 22,
  prompt: 'This feed re-renders every row whenever any single post is liked, and it stutters while scrolling. Diagnose it and fix it without changing what the screen does.',
  starter: `final class AppState: ObservableObject {
    @Published var posts: [Post] = []
    @Published var searchText = ""
    @Published var isLoading = false
    @Published var unreadCount = 0
}

struct FeedView: View {
    @EnvironmentObject var state: AppState

    var body: some View {
        ScrollView {
            LazyVStack {
                ForEach(state.posts, id: \\.self) { post in
                    AnyView(PostRow(post: post).environmentObject(state))
                }
            }
        }
    }
}

struct PostRow: View {
    let post: Post
    @EnvironmentObject var state: AppState

    var body: some View {
        HStack {
            Text(post.title)
            Spacer()
            Text(DateFormatter().string(from: post.date))
        }
    }
}`,
  hints: [
    'ObservableObject publishes one signal for the whole object. How many views observe this one?',
    'id: \\.self hashes the whole post. What happens to identity when a post is liked?',
    'Two more: AnyView erases the type SwiftUI diffs with, and something expensive is being constructed inside body.'
  ],
  solution: `// Five separate problems:
//
// 1. One fat ObservableObject. objectWillChange fires for the whole object,
//    so changing unreadCount invalidates every row observing it.
// 2. id: \\.self makes identity content-based, so liking a post changes its
//    hash and the row is destroyed and rebuilt rather than updated.
// 3. AnyView erases the static type SwiftUI uses to diff, forcing rebuilds.
// 4. DateFormatter() is constructed inside body, once per row per render.
//    Formatter init is genuinely expensive.
// 5. Rows take the whole AppState when they need one post.

@Observable
@MainActor
final class AppState {
    var posts: [Post] = []
    var searchText = ""
    var isLoading = false
    var unreadCount = 0
}

struct FeedView: View {
    @Environment(AppState.self) private var state

    var body: some View {
        ScrollView {
            LazyVStack {
                // 2: stable identity from Identifiable
                // 3: no AnyView, the concrete type stays visible
                ForEach(state.posts) { post in
                    PostRow(post: post)
                }
            }
        }
    }
}

struct PostRow: View {
    let post: Post          // 5: takes only what it needs

    // 4: one formatter for the whole process, not one per row per render
    private static let dateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateStyle = .medium
        return f
    }()

    var body: some View {
        HStack {
            Text(post.title)
            Spacer()
            Text(Self.dateFormatter.string(from: post.date))
        }
    }
}

// With @Observable (1), SwiftUI tracks reads per property, so changing
// unreadCount no longer invalidates rows that never read it.`,
  checking: 'Whether you find all five and can rank them. The @Observable switch and the identity fix are the two that actually change the invalidation graph; the formatter is the one that shows up hardest in a Time Profiler trace. Saying you would confirm with Self._printChanges() and the SwiftUI Instruments template before and after is what separates a diagnosis from a guess.'
});

IPREP.addChallenge({
  id: 'ch-swiftui-nav', topic: 'swiftui-navigation', domain: 'swiftui',
  title: 'Type-safe router for NavigationStack', d: 'hard', minutes: 26,
  prompt: 'Build a router for NavigationStack that supports programmatic navigation, deep links from a URL, and state restoration. Handle a route that requires the user to be signed in.',
  starter: `enum Route: Hashable {
    case product(id: String)
    case order(id: String)
    case settings
}

@Observable
final class Router {
    var path: [Route] = []
    // TODO: parse a URL, push, replace, and handle auth-gated routes
}`,
  hints: [
    'Parsing and navigating are separate jobs. Parse the URL into a Route first, then decide what to do with it.',
    'A modal blocks a push. The router needs to be able to dismiss whatever is presented before navigating.',
    'For an auth-gated route, store the pending route and replay it after sign-in rather than dropping it.'
  ],
  solution: `enum Route: Hashable, Codable {
    case product(id: String)
    case order(id: String)
    case settings

    /// Routes the user must be signed in to reach.
    var requiresAuth: Bool {
        switch self {
        case .order:              return true
        case .product, .settings: return false
        }
    }
}

@Observable
@MainActor
final class Router {
    var path: [Route] = []
    var presentedSheet: Route?
    private var pendingRoute: Route?      // replayed after sign-in

    private let session: Session

    init(session: Session) { self.session = session }

    // MARK: - navigation

    func push(_ route: Route) {
        guard authorised(route) else { return }
        presentedSheet = nil              // a modal would block the push
        path.append(route)
    }

    /// Deep links and cold launches rebuild the stack rather than append.
    func replace(with routes: [Route]) {
        guard let last = routes.last, authorised(last) else { return }
        presentedSheet = nil
        path = routes
    }

    func popToRoot() { path.removeAll() }

    // MARK: - deep links

    /// myapp://product/123  ->  .product(id: "123")
    static func parse(_ url: URL) -> Route? {
        guard url.scheme == "myapp" else { return nil }
        let parts = ([url.host].compactMap { $0 }) + url.pathComponents.filter { $0 != "/" }

        switch parts.first {
        case "product" where parts.count > 1: return .product(id: parts[1])
        case "order"   where parts.count > 1: return .order(id: parts[1])
        case "settings":                      return .settings
        default:                              return nil
        }
    }

    func open(_ url: URL) {
        guard let route = Router.parse(url) else { return }   // never crash on a bad link
        replace(with: [route])
    }

    // MARK: - auth

    private func authorised(_ route: Route) -> Bool {
        if route.requiresAuth && !session.isSignedIn {
            pendingRoute = route
            presentedSheet = .settings      // or a sign-in route
            return false
        }
        return true
    }

    func signedIn() {
        guard let pending = pendingRoute else { return }
        pendingRoute = nil
        push(pending)
    }

    // MARK: - restoration

    var restorationData: Data? { try? JSONEncoder().encode(path) }

    func restore(from data: Data) {
        path = (try? JSONDecoder().decode([Route].self, from: data)) ?? []
    }
}

// View side:
// NavigationStack(path: $router.path) {
//     HomeView()
//         .navigationDestination(for: Route.self) { route in
//             switch route { ... }        // registered ONCE, near the root
//         }
// }
// .onOpenURL { router.open($0) }`,
  checking: 'Three things. Parsing returns an optional so a malformed link degrades instead of crashing. The pending-route replay, which almost everyone omits and which is exactly what happens when a push notification lands on a signed-out app. And registering navigationDestination once near the root, since putting it per-row is the classic silent failure.'
});
