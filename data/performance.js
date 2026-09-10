/* Performance & Network — 3 topics */

IPREP.addTopic({
  id: 'memoryperf', domain: 'performance',
  title: 'Memory Management & Instruments',
  summary: 'Finding leaks and abandoned memory, image footprint, and the jetsam limits.',
  cards: [
    { d: 'easy', alias: 'What is the difference between a leak and abandoned memory?', q: 'What is the difference between a memory leak and abandoned memory?',
      a: "Both grow. Only one is findable with the Leaks tool.\n\n| | Leak | Abandoned |\n|---|---|---|\n| Still referenced | No | **Yes** |\n| Usual cause | A retain cycle | An unbounded cache, unpopped controllers, unremoved observers |\n| Found with | Leaks, Memory Graph | Allocations with generation marks |\n\n=> To find abandoned memory: mark a generation, do a round trip that should return to the starting state, mark again, and inspect what survived." },

    { d: 'medium', q: 'How do you use the Memory Graph Debugger?',
      a: "Reach the suspect state, then click the memory graph button in the debug bar.\n\nThe workflow that actually finds bugs:\n- Push and pop the screen a few times\n- Snapshot, then filter for the view controller's class name\n- **More than one live instance means it is retained**\n- Follow the inbound arrows to whoever is holding it\n\n=> Enable Malloc Stack Logging in the scheme first, so each reference shows the stack that created it. Purple exclamation marks flag detected cycles." },

    { d: 'medium', q: 'How much memory does an image actually use?',
      a: "Roughly `width * height * 4` bytes, **independent of the file size on disk**.\n\n| | Size |\n|---|---|\n| 4000x3000 JPEG on disk | 2 MB |\n| Same image decoded | **48 MB** |\n| Downsampled to 120pt at 3x | 0.5 MB |\n\n! Twenty full-resolution thumbnails is roughly a gigabyte, and an immediate jetsam kill.\n\n=> Downsample at decode time with `CGImageSourceCreateThumbnailAtIndex` and `kCGImageSourceThumbnailMaxPixelSize`, which never materialises the full bitmap. This is the highest-value memory fix in most photo-adjacent apps.\n\n```bad  decodes the full bitmap, about 48 MB, per thumbnail\nlet image = UIImage(contentsOfFile: path)\ncell.imageView.image = image\n```\n\n```good  downsample during decode, so the full bitmap never exists\nfunc thumbnail(at url: URL, maxPixelSize: CGFloat) -> UIImage? {\n    let src = CGImageSourceCreateWithURL(\n        url as CFURL, [kCGImageSourceShouldCache: false] as CFDictionary\n    )\n    guard let src else { return nil }\n    let opts = [\n        kCGImageSourceCreateThumbnailFromImageAlways: true,\n        kCGImageSourceShouldCacheImmediately: true,\n        kCGImageSourceCreateThumbnailWithTransform: true,\n        kCGImageSourceThumbnailMaxPixelSize: maxPixelSize * scale\n    ] as CFDictionary\n    guard let cg = CGImageSourceCreateThumbnailAtIndex(src, 0, opts)\n    else { return nil }\n    return UIImage(cgImage: cg, scale: UIScreen.main.scale, orientation: .up)\n}\n```" },

    { d: 'hard', q: 'What is jetsam and what are the practical limits?',
      a: "The memory-pressure killer. **iOS has no swap**, so reclaiming memory means terminating processes by priority.\n\n- A background app goes first\n- There is no exception and no normal crash report, only a `JetsamEvent` log\n- Limits vary by device and are not public API\n\n| Context | Rough budget |\n|---|---|\n| Foreground app, older device | A few hundred MB |\n| Foreground app, recent device | More |\n| Widget or share extension | **Tens of MB** |\n\n=> That last row is why an extension that loads a full-size image dies instantly." },

    { d: 'medium', q: 'What is the difference between the Allocations and Leaks instruments?',
      a: "| Tool | Answers | Use for |\n|---|---|---|\n| **Allocations** | What is growing? | Abandoned memory, growth over time, generation marks |\n| **Leaks** | What is definitively unreachable? | Retain cycles |\n\n=> A **rising Allocations graph with a flat Leaks count** is the signature of abandoned memory. Saying that out loud in an interview signals you have actually used both." },

    { d: 'hard', alias: 'Your app grows by 5MB every time the user opens and closes a screen. Walk through the diagnosis.', q: 'Your app grows by 5MB every time the user opens and closes a screen. How do you find the cause?',
      a: "1. **Reproduce deterministically.** Open and close ten times\n2. **Memory Graph**, filter for the view controller class. More than one live instance means it is retained\n3. **Follow inbound references** to the retainer, rather than guessing\n4. If exactly one instance survives, the growth is elsewhere: **Allocations with generation marks**\n5. Fix, then re-run the same ten-cycle test and confirm a return to baseline\n\nUsual culprits:\n- A closure capturing self stored on a long-lived service\n- A block-based `NotificationCenter` observer never removed\n- A strong delegate\n- A `Timer` never invalidated\n- A child coordinator never removed from its parent" },

    { d: 'medium', q: 'What is `NSCache` and why prefer it to a dictionary?',
      a: "+ **Thread-safe**, unlike a plain dictionary\n+ **Evicts automatically under memory pressure**\n+ `countLimit` and `totalCostLimit` as soft bounds\n+ Does not copy its keys, unlike `NSDictionary`\n! Eviction is opaque and can happen at any moment\n! The cost value is arbitrary and only means anything if you are consistent\n\n=> It is a cache, never a store of record. Use it for decoded images and computed layouts, not for anything you cannot recompute." },

    { d: 'hard', q: 'What is memory footprint versus resident size, and which do you optimise?',
      a: "**Optimise footprint.** That is what jetsam charges you.\n\n| Metric | Counts |\n|---|---|\n| Resident size (RSS) | All physical pages, including shared framework and file-backed pages |\n| **Footprint** | Dirty, non-purgeable memory attributed to your process |\n\n=> This is why `Data(contentsOf:options: .mappedIfSafe)` is cheap: the pages are clean and file-backed, so the kernel can evict and re-read them. Xcode's memory gauge shows footprint." },

    { d: 'medium', q: 'What are the common sources of unbounded memory growth in an iOS app?',
      a: "! An image cache with no limit\n! `NotificationCenter` block observers never removed, each retaining its captures\n! Retained view controllers from coordinator or navigation bugs\n! Accumulating `Timer` or `CADisplayLink` instances\n! An ever-growing array of log or analytics events awaiting flush\n! A Core Data context never reset, holding every object ever faulted in\n! An autorelease pool not draining in a long synchronous loop\n\n=> The Core Data one is worth naming unprompted: a long-lived background context accumulates registered objects until you `reset()` or use a fresh context per batch." },

    { d: 'hard', q: 'How do you reduce memory during app launch?',
      a: "- Do not decode images or build hierarchies for screens the user has not reached\n- Defer non-critical framework initialisation; each dynamic framework costs load time and dirty pages\n- Parse large static data lazily instead of building it at launch\n- Move work out of `didFinishLaunchingWithOptions` into a post-first-frame phase\n- Use `Data(contentsOf:options: .mappedIfSafe)` for large resource files so pages stay clean\n\n=> Measure with the App Launch template in Instruments, which shows time and the allocation timeline in one trace." }
  ],
  quiz: [
    { d: 'easy', q: 'A 4000x3000 photo decoded into memory costs approximately:', choices: ['2 MB, the JPEG size', '12 MB', '48 MB', '96 MB'], correct: 2,
      why: 'width x height x 4 bytes, independent of the compressed file size. Downsample at decode time to avoid materialising it.' },
    { d: 'medium', q: 'A rising Allocations graph with zero reported leaks indicates:', choices: ['A false positive', 'Abandoned memory: still referenced but never used again', 'A retain cycle', 'GPU memory pressure'], correct: 1,
      why: 'Leaks only finds unreachable allocations. Use Allocations generation marks across a round trip to find what survives.' },
    { d: 'hard', q: 'Jetsam terminates your background app because:', choices: ['It exceeded a CPU limit', 'iOS has no swap, so it kills processes by priority under memory pressure', 'It used too many threads', 'The watchdog timed out'], correct: 1,
      why: 'There is no page-out path, so reclamation means termination. Extensions get far tighter budgets than the main app.' },
    { d: 'medium', q: 'NSCache is preferred over a Dictionary for images because it:', choices: ['Is faster', 'Is thread-safe and evicts automatically under memory pressure', 'Persists to disk', 'Preserves insertion order'], correct: 1,
      why: 'Eviction is opaque, so it is always a cache and never a store of record.' },
    { d: 'hard', q: 'Memory-mapped file reads are cheap in footprint terms because the pages are:', choices: ['Compressed', 'Clean and file-backed, so the kernel can evict and re-read them', 'Stored on the GPU', 'Shared between processes'], correct: 1,
      why: 'Jetsam charges dirty non-purgeable memory. Clean file-backed pages are reclaimable without killing you.' },
    { d: 'medium', q: 'A long-lived Core Data background context grows unboundedly because it:', choices: ['Leaks the store', 'Keeps every faulted-in object registered until reset()', 'Duplicates the persistent store', 'Never saves'], correct: 1,
      why: 'Call reset() between batches, or use a fresh context per unit of work.' }
  ]
});

IPREP.addTopic({
  id: 'renderperf', domain: 'performance',
  title: 'Scroll & Rendering Performance',
  summary: 'The frame budget, hitches, and the concrete causes of jank.',
  cards: [
    { d: 'easy', q: 'What is the frame budget and what does missing it look like?',
      a: "| Refresh rate | Budget per frame |\n|---|---|\n| 60 Hz | **16.7 ms** |\n| 120 Hz ProMotion | **8.3 ms** |\n\nThat budget covers main-thread work, layout, drawing, the commit, and GPU compositing combined.\n\n=> Missing it shows the previous frame again, which reads as a stutter. Apple calls this a **hitch** and measures it as hitch time per second of scrolling. One 200ms hang is far worse perceptually than twenty 20ms ones." },

    { d: 'medium', alias: 'Name the main causes of dropped frames while scrolling.', q: 'What usually causes dropped frames while scrolling?',
      a: "In rough order of how often they are the real cause:\n\n! Synchronous work on the main thread: JSON decoding, disk I/O, image decoding\n! Expensive `layoutSubviews` or heavy Auto Layout in complex cells\n! Custom `draw(_:)` rasterising on the CPU\n! Offscreen rendering from a shadow with no `shadowPath`, or masks\n! Blending from non-opaque views stacked deep\n! Allocating views in `cellForRowAt` instead of reusing\n! Blocking on a lock or a semaphore\n\n=> The first two account for most real cases. Check them before anything else." },

    { d: 'medium', q: 'How do you find a scroll hitch with Instruments?',
      a: "Use the **Animation Hitches** template, or Time Profiler with the main thread isolated.\n\n1. Record a scroll on a **release build on a real device**\n2. Find the spike in the hitch timeline\n3. Open the main-thread stack at that timestamp\n\n! Profiling a debug build in the simulator is the classic wasted afternoon: it has your Mac's GPU and no ARC optimisation.\n\n=> The template breaks out the commit phase, so you can tell whether time went to your work, to layout and commit, or to the render server." },

    { d: 'hard', q: 'What is blending and why does it cost?',
      a: "When a layer is not opaque, the GPU must **read what is behind it and combine per pixel**, for every overlapping layer. Eight translucent views means eight reads and blends per pixel.\n\nThe fix:\n- Set `isOpaque = true`\n- Give the view a solid `backgroundColor`\n\n! A view with a **clear** background colour is not opaque, even if it looks solid. `UILabel` with a clear background is the single most common blended layer in a cell.\n\n=> Find them with Color Blended Layers in the simulator's Debug menu. Green is opaque, red is blended, and a mostly-red screen is a real finding.\n\n```bad  clear background: the GPU blends against everything behind\ntitleLabel.backgroundColor = .clear\n```\n\n```good  opaque, so nothing behind needs reading\ntitleLabel.backgroundColor = .systemBackground\ntitleLabel.isOpaque = true\n```\n\nCheck it with **Color Blended Layers** in the simulator Debug menu. Green is opaque, red is blended." },

    { d: 'hard', alias: 'Explain image decoding as a scroll hazard and give the fix.', q: 'Why does loading images cause scroll jank, and how do you fix it?',
      a: "`UIImage(named:)` and `UIImage(data:)` **do not decode immediately**. Decoding happens lazily on the main thread the first time the image is drawn, which is mid-scroll.\n\n```\nlet opts: [CFString: Any] = [\n  kCGImageSourceCreateThumbnailFromImageAlways: true,\n  kCGImageSourceThumbnailMaxPixelSize: maxDim,\n  kCGImageSourceShouldCacheImmediately: true\n]\nlet src = CGImageSourceCreateWithURL(url as CFURL, nil)!\nlet cg = CGImageSourceCreateThumbnailAtIndex(src, 0, opts as CFDictionary)!\n```\n\n=> That downsamples **and** forces the decode off the main thread in one step, so the main thread only composites an already-decoded bitmap." },

    { d: 'medium', q: 'What does `isOpaque` actually do?',
      a: "It **promises** the view covers its bounds completely with fully opaque pixels, so the compositor need not read or blend what is behind it.\n\n! It is a promise, not an enforcement. Set it true on a view with transparency and you get visual corruption.\n\nIt defaults to true on `UIView` but effectively becomes false the moment:\n- `backgroundColor` is nil or has alpha\n- `alpha < 1`" },

    { d: 'hard', q: 'How do you diagnose a hang versus a hitch?',
      a: "| | Hitch | Hang |\n|---|---|---|\n| What | A missed frame during animation | Main thread unresponsive |\n| Scale | Milliseconds | From ~250 ms; past the watchdog it is a `0x8badf00d` kill |\n| Tool | Animation Hitches | Hangs instrument, Xcode Organizer, MetricKit `MXHangDiagnostic` |\n\nCommon causes of hangs specifically:\n! Synchronous network on the main thread\n! A `sync` deadlock\n! A large synchronous file read\n! A main-thread lock waiting on background work" },

    { d: 'medium', q: 'What is the cost of a deep view hierarchy?',
      a: "Every view costs on **four** axes at once: an object, a backing layer, layout traversal, hit-test traversal, and a compositing pass. Repeated for every visible cell, every frame.\n\nFlattening helps disproportionately:\n- Replace nested containers with constraints on a single level\n- Draw simple decoration with a layer rather than a subview\n- Use `UILayoutGuide` instead of spacer views\n\n=> Debug View Hierarchy shows the depth. View count per cell is a good quick metric." },

    { d: 'hard', q: 'Why must you profile on a real device with a release build?',
      a: "! The simulator uses your **Mac's** CPU and GPU, with a completely different memory architecture\n! Debug builds disable optimisation, so ARC traffic, generic specialisation and inlining are all absent, often changing timings several-fold\n! Thermal state, Low Power Mode and real storage speed only exist on device\n\n=> A number from a debug simulator build is not merely imprecise. It can point you at the wrong function entirely." },

    { d: 'medium', q: 'What is `CADisplayLink` and when do you use it?',
      a: "A timer **synchronised to the display refresh**, firing once per frame with a `targetTimestamp` for the upcoming frame.\n\nUse it for animation driven by your own state, custom scrubbing, or measuring frame timing.\n\n- Set `preferredFrameRateRange` so the system can pick an efficient rate rather than always running at 120 Hz\n- Add it in `.common` run loop mode so it keeps firing during scrolling\n! Always `invalidate()` it. The run loop retains it exactly like `Timer`" }
  ],
  quiz: [
    { d: 'easy', q: 'The per-frame budget on a 120Hz ProMotion display is:', choices: ['16.7 ms', '8.3 ms', '33 ms', '4 ms'], correct: 1,
      why: 'That budget covers main-thread work, layout, commit and GPU compositing combined.' },
    { d: 'hard', q: 'UIImage(data:) causes scroll jank because decoding happens:', choices: ['On a background queue', 'Lazily on the main thread at first draw', 'During initialisation', 'On the GPU'], correct: 1,
      why: 'Force the decode off the main thread at display size with CGImageSourceCreateThumbnailAtIndex.' },
    { d: 'medium', q: 'A UILabel with a clear background inside a cell is a performance concern because:', choices: ['It allocates a backing store', 'It is non-opaque, so the GPU must blend it against everything behind', 'It breaks Auto Layout', 'It disables reuse'], correct: 1,
      why: 'Set isOpaque true with a solid backgroundColor. Color Blended Layers shows these in red.' },
    { d: 'medium', q: 'Profiling in the simulator with a debug build is misleading mainly because:', choices: ['The simulator has no GPU', 'It uses your Mac CPU/GPU and skips compiler optimisation', 'Instruments does not attach', 'Memory is unlimited'], correct: 1,
      why: 'The differences are large enough to point you at the wrong function, not merely to shift the numbers.' },
    { d: 'hard', q: 'A 300ms freeze on tapping a button is best investigated with:', choices: ['Animation Hitches', 'The Hangs instrument or Xcode Organizer hang reports', 'Leaks', 'Core Animation FPS gauge'], correct: 1,
      why: 'A hang is main-thread unresponsiveness, a different measurement from a missed animation frame.' },
    { d: 'medium', q: 'CADisplayLink must be invalidated because:', choices: ['It is a struct', 'The run loop retains it, exactly like Timer', 'It holds a GPU buffer', 'It blocks the main queue'], correct: 1,
      why: 'Without invalidate() it fires forever and keeps its target alive, which is a classic view controller leak.' }
  ]
});

IPREP.addTopic({
  id: 'battery', domain: 'performance',
  title: 'Battery, Background Execution & Network Efficiency',
  summary: 'What actually drains a phone, and how iOS lets you do work when the app is not open.',
  cards: [
    { d: 'easy', q: 'What are the biggest battery consumers in a typical app?',
      a: "In rough order:\n\n1. The **cellular radio**\n2. **GPS** at high accuracy\n3. The **display**, if you keep it awake or drive 120 Hz unnecessarily\n4. Sustained **CPU and GPU** work\n5. **Wake-ups** that stop the device idling\n\n=> The non-obvious one is the last. Ten small requests spread over a minute cost far more than one batched request, because each one powers the radio and holds it high for seconds afterwards." },

    { d: 'medium', q: 'What is the radio tail and why does it dominate network energy?',
      a: "After a transfer, the cellular radio **stays in a high-power state for several seconds** in case more data arrives.\n\n! A 1 KB request can cost about as much energy as a 100 KB one.\n\nWhat follows:\n- **Batch** requests rather than trickling them\n- **Prefetch** what you will plausibly need in the same window\n- Use discretionary background transfers so the system can coalesce your traffic with other apps'\n- **Never poll on a timer**" },

    { d: 'medium', alias: 'Compare the background execution modes.', q: 'What are the ways to run code while your app is in the background?',
      a: "| Mode | Duration | For |\n|---|---|---|\n| `BGAppRefreshTask` | Seconds, opportunistic | Refreshing content |\n| `BGProcessingTask` | Minutes, usually overnight while charging | Maintenance, ML, cleanup |\n| Background `URLSession` | Out of process, can relaunch you | **The only reliable way to finish a large download** |\n| Silent push | Best-effort, throttled | Server-initiated wake-up |\n| Declared modes (audio, location, VoIP) | Continuous | Real ongoing work; App Review requires genuine use |\n\n=> **None of them is a guarantee.** The system decides." },

    { d: 'hard', q: 'What are the practical rules for `BGTaskScheduler`?',
      a: "- Register every identifier in `Info.plist` **and** in `didFinishLaunching`, before launch completes, or registration throws\n- Submit the next request when the task **starts**, not when it finishes, or you can miss a cycle\n- Set `expirationHandler` and save partial state, because you **will** be cut off mid-work\n- Call `setTaskCompleted(success:)` exactly once, or the system penalises your future scheduling\n! `earliestBeginDate` is a floor, never a promise. You may run hours later, or not at all\n\n=> Test with the `_simulateLaunchForTaskWithIdentifier` debugger command. Waiting for the real scheduler is impractical.\n\n```bad  submits on completion, so an expiry leaves nothing pending\nfunc handle(_ task: BGAppRefreshTask) {\n    Task {\n        await sync()\n        scheduleNext()          // never reached if we are expired first\n        task.setTaskCompleted(success: true)\n    }\n}\n```\n\n```good  submit on start, and always save partial state on expiry\nfunc handle(_ task: BGAppRefreshTask) {\n    scheduleNext()                        // first thing, not last\n\n    let work = Task {\n        await sync()\n        task.setTaskCompleted(success: true)\n    }\n    task.expirationHandler = {\n        work.cancel()\n        task.setTaskCompleted(success: false)\n    }\n}\n```" },

    { d: 'medium', q: 'How do you use location without destroying the battery?',
      a: "**Match the accuracy to the need.** `kCLLocationAccuracyBest` runs the GPS chip continuously; `.hundredMeters` can use cell and Wi-Fi triangulation, which is dramatically cheaper.\n\nOther levers:\n- `distanceFilter`, so callbacks only arrive on meaningful movement\n- **Significant location change**: cell-tower based, very cheap, and can wake a terminated app\n- **Region monitoring** and beacons for entry and exit events\n- `allowsBackgroundLocationUpdates` only while genuinely needed\n- `pausesLocationUpdatesAutomatically`\n\n=> Stop updating the instant you no longer need it." },

    { d: 'hard', q: 'What is the watchdog and what are its limits?',
      a: "A system process that terminates apps blocking too long at lifecycle transitions. Exception code `0x8badf00d`, 'ate bad food'.\n\n| Transition | Rough budget |\n|---|---|\n| Launch | ~20 seconds |\n| Resume, suspend, background | ~10 seconds |\n\n! The overwhelming cause is synchronous network or disk I/O on the main thread during launch.\n! The clock runs in the background too, so a slow `applicationDidEnterBackground` can kill you.\n\n=> Xcode Organizer surfaces these as launch hangs from real users." },

    { d: 'medium', q: 'How do you make network usage efficient beyond just batching?',
      a: "- **HTTP caching.** Honour `Cache-Control`, send `ETag`, and let a 304 cost a few bytes instead of a payload\n- **Compression.** gzip or brotli, which `URLSession` negotiates automatically\n- **Right-sized assets.** Request image variants from the CDN rather than originals\n- **Delta sync.** Ask for changes since a cursor, not the full list\n- `waitsForConnectivity` instead of failing and retrying on a timer\n- `isDiscretionary` for non-urgent transfers, letting the system pick Wi-Fi while charging" },

    { d: 'hard', q: 'What is thermal throttling and how should an app respond?',
      a: "Sustained load raises temperature, and iOS responds by reducing clocks, dimming the display, and eventually refusing to charge.\n\nRead `ProcessInfo.processInfo.thermalState` and observe `thermalStateDidChangeNotification`.\n\n| State | Do |\n|---|---|\n| `.serious` | Reduce frame rate, pause background processing, lower video quality, stop prefetching |\n| `.critical` | The minimum only |\n\n=> Ignoring it does not avoid the cost. The system throttles you anyway, unpredictably, in the middle of something the user cares about." },

    { d: 'medium', q: 'What is Low Power Mode and what should change when it is on?',
      a: "Read `ProcessInfo.processInfo.isLowPowerModeEnabled`, observe `NSProcessInfoPowerStateDidChange`.\n\nThe system already reduces background refresh, lowers the display refresh rate, and defers discretionary work. Your app should cooperate **visibly**:\n- Stop autoplaying video\n- Reduce or disable non-essential animation\n- Pause prefetching and polling\n- Lower sync frequency\n\n=> Apple's own apps do this, and users notice when a third-party app is the one still burning their last 10%." },

    { d: 'hard', q: 'How do you measure energy impact objectively?',
      a: "| Tool | Gives you |\n|---|---|\n| Xcode Energy gauge | Coarse live signal: CPU, network, location, display |\n| Instruments Energy Log | A trace from an untethered device |\n| **MetricKit** | Daily aggregated CPU, location, network and hang time from **real users** |\n| Xcode Organizer | Battery and hang metrics across your install base |\n\n=> Naming MetricKit specifically signals you have shipped and monitored an app, not only profiled one locally." }
  ],
  quiz: [
    { d: 'medium', q: 'Ten small requests spread over a minute cost far more energy than one batched request because:', choices: ['TCP handshakes dominate', 'The radio stays in a high-power tail state for seconds after each transfer', 'DNS lookups are cached', 'Each request allocates a thread'], correct: 1,
      why: 'The tail means a 1KB request can cost about the same energy as a 100KB one. Batch and prefetch instead of trickling.' },
    { d: 'hard', q: 'You should submit the next BGAppRefreshTask request:', choices: ['When the current task completes', 'When the current task starts', 'In applicationDidEnterBackground only', 'Once at first launch'], correct: 1,
      why: 'Submitting on start guarantees a pending request exists even if you are expired before finishing.' },
    { d: 'medium', q: 'The 0x8badf00d termination means:', choices: ['Out of memory', 'The watchdog killed you for blocking too long at a lifecycle transition', 'An uncaught exception', 'Invalid code signature'], correct: 1,
      why: 'Roughly 20s for launch and 10s for the other transitions. Synchronous main-thread I/O is the usual cause.' },
    { d: 'medium', q: 'The cheapest location option that can still wake a terminated app is:', choices: ['kCLLocationAccuracyBest with a distanceFilter', 'Significant location change monitoring', 'Continuous background updates', 'requestLocation in a timer'], correct: 1,
      why: 'It is cell-tower based rather than GPS, so it costs very little and still relaunches the app on movement.' },
    { d: 'hard', q: 'At ProcessInfo thermalState .serious a well-behaved app should:', choices: ['Continue as normal, the system handles it', 'Reduce frame rate, pause background processing and prefetching', 'Terminate itself', 'Increase QoS to finish faster'], correct: 1,
      why: 'The system will throttle regardless. Degrading deliberately keeps the reduction away from what the user is actively doing.' },
    { d: 'hard', q: 'The only way to see real-world energy and hang behaviour across your user base is:', choices: ['Instruments Energy Log', 'Xcode Energy gauge', 'MetricKit payloads and Xcode Organizer', 'Console logs'], correct: 2,
      why: 'The first two are local profiling. MetricKit delivers aggregated field metrics from actual devices.' }
  ]
});
