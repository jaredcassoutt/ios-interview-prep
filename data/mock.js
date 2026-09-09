/* Mock interview prompts — 18 open-ended design & debugging questions */

IPREP.addMock({
  id: 'mk-imageloader', domain: 'architecture', title: 'Design an image loading library', d: 'medium', minutes: 25,
  prompt: 'Design an image loading and caching library for a photo feed. Assume 60fps scrolling over thousands of remote images. Walk me through the public API, the internals, and the decisions you would defend.',
  rubric: [
    'Clarifies requirements first: image sizes, feed length, offline expectations, whether images are user-generated or CDN-served',
    'Two-tier cache: an in-memory NSCache of decoded images and a disk cache honouring HTTP caching headers',
    'Cache key includes the target size, not just the URL, so a thumbnail and a full view do not collide',
    'Decoding happens off the main thread, with downsampling via CGImageSourceCreateThumbnailAtIndex so a full bitmap never exists',
    'Explicit cancellation tied to cell reuse, returning a cancellable token from the load call',
    'Bounded concurrency so a fast scroll does not open dozens of connections',
    'Deduplicates concurrent requests for the same key rather than downloading twice',
    'Handles memory warnings by dropping the memory tier and keeping disk',
    'States the memory arithmetic: decoded cost is width x height x 4, independent of file size',
    'Mentions prefetching via UITableViewDataSourcePrefetching and cancelling on reversal'
  ],
  followups: [
    'A user scrolls fast to the bottom of a 10,000 item feed. What happens to your in-flight requests?',
    'How do you evict from the disk cache, and where do you store it so App Review does not reject you?',
    'Two cells request the same URL at the same instant. Trace exactly what happens.',
    'How would you test this without a network?'
  ]
});

IPREP.addMock({
  id: 'mk-networklayer', domain: 'architecture', title: 'Design a network layer', d: 'medium', minutes: 25,
  prompt: 'Design the networking layer for a consumer app with authenticated endpoints. Cover request construction, auth, error handling, retries and testability. Would you use a third-party library?',
  rubric: [
    'Separates endpoint description, transport, decoding and the repository layer',
    'Endpoints are typed values, not stringly-typed URL construction at call sites',
    'A domain error enum rather than leaking URLError and DecodingError to the UI',
    'Token refresh serialised through a single in-flight task so ten 401s trigger one refresh',
    'Retry policy: idempotent requests only, exponential backoff with jitter, capped attempts, respects Retry-After',
    'Testable via URLProtocol injection rather than mocking its own abstraction',
    'Keeps URLSession rather than replacing it, citing caching, HTTP/2 and background transfers',
    'Handles cancellation so a dismissed screen stops its requests',
    'Has a position on third-party libraries with reasons, not dogma',
    'Mentions logging and redaction of tokens in logs'
  ],
  followups: [
    'The refresh token itself expires. What is the user experience and what does your code do?',
    'How do you stop a retry storm when the backend goes down for everyone at once?',
    'Where does response caching live, and how do you invalidate it?',
    'Your API adds a new enum case for order status. What breaks?'
  ]
});

IPREP.addMock({
  id: 'mk-offline', domain: 'architecture', title: 'Design an offline-first app', d: 'hard', minutes: 30,
  prompt: 'Design a note-taking app that works fully offline and syncs when connectivity returns. Multiple devices, same account. Focus on the data flow and conflict handling.',
  rubric: [
    'Local store is the source of truth for the UI; the network is a sync process, not a read path',
    'UI reads from the local store and observes it, so it is never empty and never blocks on the network',
    'Mutations are written locally first and queued with a pending state',
    'A durable outbox that survives app termination, replayed on reconnect',
    'Explicit conflict strategy with a defended choice: last-write-wins, per-field merge, or version vectors',
    'Server-side version numbers or ETags to detect conflicts rather than guessing',
    'Idempotency keys so a replayed mutation does not duplicate a note',
    'Handles deletion versus edit conflicts, which is the case people forget',
    'Surfaces sync state in the UI honestly rather than pretending everything succeeded',
    'Considers CloudKit as an option and says why it would or would not fit'
  ],
  followups: [
    'The same note is edited on two offline devices. Walk me through exactly what the user sees.',
    'A device is offline for three weeks. What happens on reconnect?',
    'How do you handle a note deleted on one device and edited on another?',
    'How do you test the sync engine?'
  ]
});

IPREP.addMock({
  id: 'mk-feed', domain: 'architecture', title: 'Design an infinite-scroll feed', d: 'medium', minutes: 25,
  prompt: 'Design the feed screen for a social app: infinite scroll, pull to refresh, mixed media, and it must stay at 60fps on a five-year-old device.',
  rubric: [
    'Cursor-based pagination rather than offset, with a reason: stability under insertion',
    'Deduplicates concurrent page requests and handles reaching the end',
    'A refresh landing while a page load is in flight must not append stale results; a generation counter or task cancellation',
    'Diffable data source with stable identity-based identifiers, using reconfigure for content changes',
    'Cell height strategy: self-sizing with cached measured heights keyed by item id, or precomputed layout',
    'Media handling: downsampled decode off the main thread, cancellation on reuse, bounded concurrency',
    'Flat cell hierarchies and opaque views; names blending and offscreen rendering as costs',
    'Prefetching with cancellation on scroll reversal',
    'States how it would be measured: Animation Hitches on a release build on a real device',
    'Handles empty, error and end-of-feed states explicitly'
  ],
  followups: [
    'The scroll indicator jumps around. Why, and how do you fix it?',
    'A new post arrives via push while the user is scrolled 200 rows down. What do you do?',
    'How do you keep scroll position stable across a refresh?',
    'The feed stutters only on cellular. What is your first hypothesis?'
  ]
});

IPREP.addMock({
  id: 'mk-leak', domain: 'performance', title: 'Debug a reported memory leak', d: 'medium', minutes: 20,
  prompt: 'QA reports the app slows down and eventually crashes after 20 minutes of normal use. There is no reproducible crash log beyond a jetsam event. Walk me through your investigation from the top.',
  rubric: [
    'Establishes a deterministic reproduction before touching tools',
    'Distinguishes a leak from abandoned memory and says how the diagnosis differs',
    'Memory Graph Debugger first: snapshot, filter by class, count live instances of screens that should be gone',
    'Follows inbound references to the retainer rather than guessing',
    'Enables Malloc Stack Logging so each reference shows its creation stack',
    'Allocations with generation marks for growth that is not a cycle',
    'Names the usual suspects: closures on long-lived services, block-based notification observers, timers, strong delegates, unremoved child coordinators',
    'Checks image and cache sizing, since memory pressure is often footprint not leakage',
    'Verifies the fix by re-running the same cycle count and confirming a return to baseline',
    'Mentions adding a regression guard, such as an assertion or an automated memory test'
  ],
  followups: [
    'The Memory Graph shows one instance, which is correct, but memory still grows. Now what?',
    'How would you catch this class of bug in CI?',
    'What would you look for if this only happened on iPad?',
    'How do you tell whether the growth is your app or a system framework?'
  ]
});

IPREP.addMock({
  id: 'mk-jank', domain: 'performance', title: 'Diagnose scroll jank', d: 'medium', minutes: 20,
  prompt: 'Users report the main list feels janky on older devices, but it is smooth on your iPhone 17 Pro. How do you approach it?',
  rubric: [
    'Reproduces on representative hardware, with a release build, not the simulator',
    'Explains why a debug simulator build is misleading: host CPU and GPU, no optimisation',
    'Uses Animation Hitches or Time Profiler with the main thread isolated',
    'Reads the stack at the spike rather than guessing at causes',
    'Checks the cheap visual diagnostics: Color Blended Layers, Color Offscreen-Rendered Yellow',
    'Names the likely causes in order: main-thread decode, heavy Auto Layout in cells, custom draw, offscreen rendering from shadows, deep hierarchies',
    'Understands the frame budget as a number: 16.7ms at 60Hz, 8.3ms at 120Hz',
    'Distinguishes a hitch from a hang and picks the right tool for each',
    'Proposes a measurable target and re-measures after the fix',
    'Mentions MetricKit for confirming the fix in the field rather than only locally'
  ],
  followups: [
    'The Time Profiler shows most time in layoutSubviews. What now?',
    'It only janks on the first scroll through, then it is fine. What does that tell you?',
    'How do you stop this regressing next quarter?',
    'The trace is flat but it still feels bad. What are you missing?'
  ]
});

IPREP.addMock({
  id: 'mk-analytics', domain: 'architecture', title: 'Design an analytics SDK', d: 'hard', minutes: 30,
  prompt: 'Design an analytics SDK to be embedded in third-party apps. It must not lose events, not drain battery, and not degrade the host app. What is the public API and what is inside?',
  rubric: [
    'Tiny, non-blocking public API: track returns immediately, no work on the caller thread',
    'Typed events rather than free-form dictionaries, or a clear reason for choosing flexibility',
    'Durable local buffer that survives termination, so events are not lost',
    'Batched uploads rather than one request per event, citing the radio tail',
    'Uses a background URLSession so uploads complete after the app is suspended',
    'Bounded buffer with a defined drop policy when the queue grows without connectivity',
    'Idempotency or deduplication, since a retried batch must not double-count',
    'Respects Low Power Mode, thermal state and metered connections',
    'Privacy: no PII by default, ATT and consent gating, documented data collection for the nutrition label',
    'Is defensive about the host: no swizzling by default, no exceptions escaping, bounded memory and disk'
  ],
  followups: [
    'The app is killed mid-upload. What happens to those events?',
    'A host app calls track 10,000 times in a loop on the main thread. What happens?',
    'How do you version the event schema when hosts update on their own timeline?',
    'How do you keep your SDK from being blamed for the host app crashing?'
  ]
});

IPREP.addMock({
  id: 'mk-location', domain: 'performance', title: 'Design a background location feature', d: 'hard', minutes: 25,
  prompt: 'Design a feature that records a user run route in the background, survives the app being suspended, and does not destroy the battery. What are the constraints and how do you work within them?',
  rubric: [
    'Names the required background mode and the App Review expectation of genuine use',
    'Matches accuracy to need and adjusts it dynamically rather than pinning to Best',
    'Uses distanceFilter, pausesLocationUpdatesAutomatically and activityType appropriately',
    'Knows significant location change and region monitoring as the cheap alternatives, and when they are insufficient',
    'Handles the app being terminated and relaunched with the location key',
    'Batches writes to storage rather than one write per fix',
    'Handles permission states properly: when in use versus always, provisional always, and the user downgrading',
    'Degrades under Low Power Mode and thermal pressure',
    'Filters bad fixes by horizontalAccuracy and timestamp rather than trusting every callback',
    'Measures with the Energy Log and MetricKit rather than asserting it is efficient'
  ],
  followups: [
    'The user denies Always and grants When In Use. What does your feature do?',
    'The OS terminates your app mid-run. What does the user see when they reopen it?',
    'GPS drifts and reports a 200m jump. How do you handle it?',
    'How do you test a two-hour run without going for a run?'
  ]
});

IPREP.addMock({
  id: 'mk-modular', domain: 'architecture', title: 'Modularise a large app', d: 'hard', minutes: 30,
  prompt: 'A 400,000-line app has one target, 12-minute incremental builds and five teams stepping on each other. Propose a modularisation strategy and the order you would do it in.',
  rubric: [
    'Starts with the pain being solved: build time, ownership, merge conflicts, or testability. They imply different cuts',
    'Proposes a layering: foundation and utilities, then core services, then features, with dependencies pointing one way',
    'Features depend on interfaces, not on each other, with a composition root wiring the concrete types',
    'Uses SPM local packages rather than a big-bang restructure',
    'Extracts a leaf module first to prove the approach and measure the build-time delta',
    'Addresses cross-feature navigation, usually via a routing abstraction so features do not import each other',
    'Addresses shared resources, assets and localisation, which is where modularisation usually stalls',
    'Notes the costs honestly: more boilerplate, dynamic framework load time, harder global refactors',
    'Measures before and after rather than assuming an improvement',
    'Has a migration story that keeps the app shippable throughout'
  ],
  followups: [
    'Two feature modules both need the user profile. Where does it live?',
    'Feature A needs to push a screen owned by Feature B. How?',
    'Your app launch got slower after modularising. Why might that be?',
    'How do you stop the dependency graph rotting back into a ball of mud?'
  ]
});

IPREP.addMock({
  id: 'mk-download', domain: 'architecture', title: 'Design a resumable download manager', d: 'hard', minutes: 25,
  prompt: 'Design a download manager for large video files: pause, resume, background continuation, and correct behaviour when the app is killed mid-download.',
  rubric: [
    'Uses a background URLSessionConfiguration, not a default session, and explains why',
    'Knows the app can be relaunched to handle completion via handleEventsForBackgroundURLSession',
    'Uses resume data from cancel(byProducingResumeData:) rather than restarting from zero',
    'Handles resume data being invalid, which happens more often than people expect',
    'Persists download state so it survives termination, keyed to the task identifier',
    'Validates the finished file: size, checksum, and moving it out of the temporary location immediately',
    'Stores files in a location that is not backed up, or marks them excluded',
    'Handles disk-full and low-storage conditions',
    'Respects cellular policies and lets the user choose Wi-Fi only',
    'Reports progress without hammering the main thread on every byte'
  ],
  followups: [
    'The app is killed during a download. What happens, and what does the user see on relaunch?',
    'Resume data is rejected by the server. Now what?',
    'The user starts ten downloads at once. What do you do?',
    'How do you handle a server that does not support range requests?'
  ]
});

IPREP.addMock({
  id: 'mk-swiftui', domain: 'architecture', title: 'Migrate a UIKit app to SwiftUI', d: 'medium', minutes: 25,
  prompt: 'You own a mature UIKit app. Leadership wants SwiftUI. How do you approach it, and what would you push back on?',
  rubric: [
    'Asks why: hiring, velocity, a specific pain, or fashion. The answer changes the plan',
    'Rejects a rewrite; proposes incremental adoption at screen or component boundaries',
    'Names the interop tools: UIHostingController, UIViewRepresentable, UIViewControllerRepresentable',
    'Starts with new leaf screens, not the most complex existing one',
    'Identifies where SwiftUI is still weak for their case: complex collection layouts, fine-grained scroll control, deep customisation of system controls',
    'Addresses navigation, which is the hardest interop seam',
    'Considers the minimum deployment target cost honestly',
    'Plans for the team learning curve and code review standards',
    'Keeps the architecture layers, since view models and services are reusable across both',
    'Defines what success looks like and how it would be measured'
  ],
  followups: [
    'A SwiftUI list is slower than your UIKit collection view. What do you do?',
    'How do you handle navigation when half the app is UIKit?',
    'When would you tell leadership no?',
    'How do you keep two UI paradigms from doubling the design system work?'
  ]
});

IPREP.addMock({
  id: 'mk-auth', domain: 'architecture', title: 'Design authentication and session handling', d: 'medium', minutes: 25,
  prompt: 'Design the full authentication story for an app: login, token storage, refresh, logout, and biometric unlock. What are the security decisions?',
  rubric: [
    'Tokens in the Keychain, never UserDefaults, with a reason',
    'Chooses accessibility correctly and explains ThisDeviceOnly for refresh tokens',
    'Short-lived access token plus refresh token, with refresh serialised through one in-flight task',
    'Handles refresh failure by logging out cleanly rather than looping',
    'Biometric gate via LocalAuthentication or a Keychain access control flag, and knows the difference',
    'Handles biometric enrolment changing, which should invalidate the stored credential',
    'Logout clears the Keychain, caches, cookies, and any on-disk personal data',
    'Considers certificate pinning and whether it is warranted for this app',
    'Never logs tokens, and redacts them in any network logging',
    'Handles the multi-device and remote-revocation case'
  ],
  followups: [
    'The user adds a new fingerprint. What should happen to the stored token?',
    'A token leaks in a crash log. How would that have happened and how do you prevent it?',
    'How does logout behave if the device is offline?',
    'What happens when refresh returns 401 while five requests are queued behind it?'
  ]
});

IPREP.addMock({
  id: 'mk-launch', domain: 'performance', title: 'Reduce app launch time', d: 'medium', minutes: 20,
  prompt: 'Cold launch takes 3.2 seconds. Get it under one. Walk me through how you would find the time and what you would change.',
  rubric: [
    'Distinguishes pre-main from post-main time and knows they need different fixes',
    'Measures with the App Launch template in Instruments and DYLD_PRINT_STATISTICS, not by guessing',
    'Pre-main levers: fewer dynamic frameworks, less Objective-C load work, smaller binary, no +load methods',
    'Post-main levers: defer non-critical initialisation, lazy-load services, avoid synchronous I/O and network',
    'Nothing blocking on the main thread in didFinishLaunching, especially not network or a large decode',
    'First frame should render from cached or placeholder data rather than waiting for the network',
    'Third-party SDKs initialised lazily or after first frame, since they are a common hidden cost',
    'Knows the watchdog limit of roughly 20 seconds and that hangs at launch appear in Organizer',
    'Uses MetricKit and Organizer launch metrics to confirm the improvement in the field',
    'Sets a budget and adds a regression check rather than fixing it once'
  ],
  followups: [
    'Pre-main is 1.8 seconds of your 3.2. What do you do?',
    'A vendor SDK insists on initialising in didFinishLaunching. How do you handle that?',
    'Launch is fast for you but slow in the field. What explains the gap?',
    'How would you keep launch time from regressing?'
  ]
});

IPREP.addMock({
  id: 'mk-gallery', domain: 'uikit', title: 'Design a photo gallery', d: 'hard', minutes: 30,
  prompt: 'Design a photo gallery like Apple Photos: a grid of thousands of images, pinch to zoom between grid densities, smooth scrolling, and a detail view with a shared-element transition.',
  rubric: [
    'Uses PHAsset and PHImageManager rather than loading files directly, and knows about request options and caching',
    'PHCachingImageManager with startCachingImages tied to the prefetch API',
    'Requests images at the exact display size, and cancels requests on cell reuse',
    'Compositional layout for the grid, with animated layout transitions between densities',
    'Explains memory arithmetic and why full-resolution decode is impossible at this scale',
    'Handles PHPhotoLibraryChangeObserver so the grid updates when the library changes',
    'Limited photo access permission handled properly, not just full or denied',
    'Custom transition via UIViewControllerAnimatedTransitioning with a matched geometry effect',
    'Handles interactive dismissal, including the cancelled case',
    'Considers iCloud photos that are not downloaded locally, which is the case people forget'
  ],
  followups: [
    'The user pinches between grid densities. What actually happens to the layout and the cached images?',
    'An image is in iCloud and not on device. What does the user see?',
    'How do you keep scroll position when the layout changes?',
    'The transition looks perfect but drops frames on an older device. Where do you look?'
  ]
});

IPREP.addMock({
  id: 'mk-testing', domain: 'architecture', title: 'Define a testing strategy', d: 'medium', minutes: 25,
  prompt: 'You join a team with no tests and a weekly release. Define a testing strategy, what you write first, and how you would argue for the time.',
  rubric: [
    'Starts with where the bugs actually are rather than a coverage target',
    'A pyramid: many fast unit tests, fewer integration tests, very few UI tests',
    'Tests behaviour at seams, so the code must be made injectable first',
    'Networking tested via URLProtocol so real request building and decoding run',
    'View models tested as plain objects with fake services, no host app needed',
    'Snapshot tests for layout regressions, with an honest account of their maintenance cost',
    'UI tests only for critical revenue or auth paths, because they are slow and flaky',
    'Addresses flakiness directly: no sleeps, injected clocks, deterministic fixtures',
    'Ties tests to CI with a time budget, since a slow suite gets ignored',
    'Argues the value in terms of release confidence and regression cost, not coverage percentage'
  ],
  followups: [
    'Leadership asks for 80% coverage. How do you respond?',
    'The existing code has no injection points. Where do you start?',
    'A UI test fails once a week. What do you do?',
    'How do you test something that only breaks on a real device?'
  ]
});

IPREP.addMock({
  id: 'mk-realtime', domain: 'architecture', title: 'Design a real-time chat feature', d: 'hard', minutes: 30,
  prompt: 'Design real-time messaging in an existing app: live message delivery, typing indicators, read receipts, and correct behaviour on flaky networks and after being backgrounded.',
  rubric: [
    'Chooses a transport with reasons: WebSocket for a persistent stream, plus push for when the socket is gone',
    'Knows the socket dies when the app is backgrounded, and push is the fallback delivery path',
    'Local echo with a sending state so the UI is instant, reconciled by server acknowledgement',
    'Client-generated message ids for idempotency, so a retried send does not duplicate',
    'Ordering strategy that does not trust device clocks; server sequence numbers',
    'Gap detection and backfill after a reconnect, rather than assuming continuity',
    'Typing indicators throttled and treated as ephemeral, not persisted',
    'Reconnection with exponential backoff and jitter, and handling of network path changes',
    'Local persistence so the conversation renders instantly and offline',
    'Considers battery: a persistent socket is expensive, so it must be torn down appropriately'
  ],
  followups: [
    'The socket drops for 30 seconds. What does the user see and what does the client do on reconnect?',
    'Two messages arrive out of order. How do you display them?',
    'The user sends a message with no connectivity. Walk me through the states.',
    'How do you keep the socket from draining the battery?'
  ]
});

IPREP.addMock({
  id: 'mk-crashspike', domain: 'performance', title: 'Handle a production crash spike', d: 'medium', minutes: 20,
  prompt: 'You ship a release. Two hours later the crash-free rate drops from 99.6% to 94%. Walk me through the next hour.',
  rubric: [
    'Assesses blast radius first: how many users, which OS versions, which devices, which build',
    'Decides on mitigation before diagnosis: halt the phased rollout, or flip a feature flag',
    'Reads the crash signature and top stack frames rather than speculating',
    'Correlates with what changed in the release, including server changes and remote config',
    'Distinguishes crash types: exception, memory, watchdog, or a forced unwrap',
    'Checks whether it is actually new or a pre-existing crash newly surfaced by traffic',
    'Reproduces locally with the same OS and device where possible',
    'Communicates status to stakeholders with an estimate and a decision point',
    'Ships a fix through the same phased mechanism, and verifies with real metrics',
    'Follows up with a postmortem and a guard so the class of bug cannot recur silently'
  ],
  followups: [
    'The crash only affects iOS 26 on iPad. Does that change your response?',
    'It turns out to be caused by a server response change, not your build. Now what?',
    'You cannot reproduce it. How do you proceed?',
    'What would you have done differently to catch this before release?'
  ]
});

IPREP.addMock({
  id: 'mk-apidesign', domain: 'architecture', title: 'Design the API for a mobile client', d: 'hard', minutes: 30,
  prompt: 'You are designing the backend API alongside the iOS app for a food delivery product. What do you ask the backend team for, and what would you push back on?',
  rubric: [
    'Argues for fewer round trips, citing cellular latency over bandwidth',
    'Requests composite endpoints shaped to screens rather than normalised resources requiring five calls',
    'Cursor-based pagination with a clear stability guarantee',
    'Additive-only evolution within a version, and URL versioning for breaking changes',
    'Client tolerance as the other half of the contract: unknown fields ignored, unknown enum cases mapped to a fallback',
    'Server-driven configuration for things that change faster than app releases, such as fee rules or copy',
    'Explicit, machine-readable errors with a stable code, not just a message string',
    'Idempotency keys on order placement so a retry cannot double-charge',
    'Payload sizing: image variants from the CDN, no unbounded arrays',
    'Realistic about clients never being fully updated, so the API must support old versions for years'
  ],
  followups: [
    'Backend proposes GraphQL. What is your honest position?',
    'They want to remove a field two weeks after launch. What do you say?',
    'How do you handle a user placing an order as the network drops mid-request?',
    'What does the API need to support offline browsing of the menu?'
  ]
});

/* ---- SwiftUI mock prompts ---- */

IPREP.addMock({
  id: 'mk-swiftui-arch', domain: 'swiftui', title: 'Architect a SwiftUI app', d: 'hard', minutes: 30,
  prompt: 'You are starting a new SwiftUI app from scratch: a fitness tracker with a feed, a detail screen, offline history and a settings area. Walk me through the architecture, from the view layer down to persistence.',
  rubric: [
    'Asks about deployment target first, since iOS 17 unlocks @Observable and modern navigation',
    'Uses @Observable model objects rather than reaching reflexively for a view model per screen',
    'Has a clear position on whether MVVM is even needed in SwiftUI, with reasons rather than dogma',
    'Single source of truth: state owned in one place, children take bindings or plain values',
    'Navigation as data via NavigationStack with a typed Route enum, destinations registered near the root',
    'Keeps the model layer free of SwiftUI imports so it stays testable and reusable',
    'Persistence choice defended: SwiftData, Core Data or a plain store, with the trade-off named',
    'Concurrency handled with @MainActor on models and .task for view-scoped async work',
    'Names the SwiftUI-specific performance risks: fat observable objects, AnyView, unstable ForEach identity',
    'Testing strategy that exercises models as plain objects, with previews and snapshots for the views'
  ],
  followups: [
    'Would you write a view model for every screen? Defend your answer.',
    'Where does networking live, and how does a view trigger it without owning it?',
    'The feed re-renders on every scroll tick. How do you find out why?',
    'How would this change if you had to support iOS 16?'
  ]
});

IPREP.addMock({
  id: 'mk-swiftui-vs-uikit', domain: 'swiftui', title: 'SwiftUI or UIKit for this screen', d: 'medium', minutes: 22,
  prompt: 'A product manager wants a photo-heavy browse screen: a mixed grid with variable cell sizes, a horizontally scrolling carousel row, custom paging, and a hero transition into the detail view. Would you build it in SwiftUI or UIKit? Talk me through the decision.',
  rubric: [
    'Asks clarifying questions before choosing: deployment target, team experience, deadline, how much it will change',
    'Recognises that compositional layout still expresses things LazyVGrid cannot',
    'Knows that precise scroll and paging control improved in iOS 17 with scrollTargetBehavior but is still weaker',
    'Names matchedGeometryEffect as the SwiftUI hero transition and its constraint of one source per id',
    'Considers a hybrid: SwiftUI screen hosting a UIKit collection view, or the reverse',
    'Raises image loading and memory, which is framework-agnostic and probably the real risk',
    'Gives a recommendation rather than listing options and stopping',
    'States what would change the answer, so the decision is reviewable later',
    'Considers who maintains it and whether the team can debug SwiftUI layout issues',
    'Does not treat the choice as ideological'
  ],
  followups: [
    'You picked one. What would make you switch?',
    'How would you hide the choice behind an interface so it can be swapped later?',
    'The SwiftUI version drops frames on an iPhone 12. What are your first three checks?',
    'How do you keep the design system consistent if half the app is each framework?'
  ]
});

IPREP.addMock({
  id: 'mk-swiftui-debug', domain: 'swiftui', title: 'Debug a SwiftUI screen', d: 'medium', minutes: 20,
  prompt: 'A SwiftUI screen has three reported bugs: a text field loses focus mid-typing, a sheet sometimes opens blank, and the list scroll position jumps after a refresh. Walk me through diagnosing each one.',
  rubric: [
    'Recognises all three as symptoms of the same root cause family: identity and state ownership',
    'Focus loss: the view is being recreated, so identity is changing under it',
    'Names the usual identity culprits: if/else branches, .id() bound to changing data, ForEach id: \\.self',
    'Blank sheet: .sheet(isPresented:) with a separate value that has not been set yet, or was cleared',
    'Prescribes .sheet(item:) so the invalid state is unrepresentable',
    'Scroll jump: unstable ForEach identity turning an update into a wholesale replacement',
    'Uses Self._printChanges() to see whether the trigger is a property or @identity',
    'Mentions the SwiftUI Instruments template for view body counts',
    'Checks whether a parent is recreating a @StateObject or @ObservedObject',
    'Proposes a regression guard rather than only fixing the three symptoms'
  ],
  followups: [
    'Self._printChanges() prints @identity. What does that tell you?',
    'The text field only loses focus on iPad. Does that change your hypothesis?',
    'How would you prove the fix worked rather than assuming?',
    'Which of these three would you fix first, and why?'
  ]
});
