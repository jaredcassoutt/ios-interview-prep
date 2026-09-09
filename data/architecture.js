/* Architecture & Design — 4 topics */

IPREP.addTopic({
  id: 'patterns', domain: 'architecture',
  title: 'MVC, MVP, MVVM & VIPER',
  summary: 'What each pattern actually separates, the trade-offs, and how to argue for one.',
  cards: [
    { d: 'easy', q: 'Why does Apple MVC turn into Massive View Controller?',
      a: "Because `UIViewController` **owns the view**, so it is the V and the C at once, and there is no seam left for anything else.\n\nEverything with nowhere else to go lands there:\n- Networking and parsing\n- Formatting and presentation logic\n- Navigation decisions\n- Analytics and state machines\n\n=> The result is a 2,000-line class that cannot be unit tested, because it needs a view lifecycle to exist at all. Every other pattern on this list is an answer to that one problem." },

    { d: 'medium', q: 'MVP: what moves where, and what is the defining characteristic?',
      a: "The presenter holds the logic and **talks to the view through a protocol**.\n\n| Piece | Role |\n|---|---|\n| View (the VC) | Passive. Implements `showLoading()`, `display(items:)` |\n| Presenter | Receives events, decides, calls back into the view |\n| Model | Plain data |\n\n+ Fully testable with a mock view\n+ Data flow is explicit and imperative, easy to trace\n! Heavy protocol boilerplate\n! Two objects per screen\n\n=> The defining trait: the presenter **holds a reference to the view**. That is exactly what MVVM removes." },

    { d: 'medium', q: 'MVVM: what changes relative to MVP?',
      a: "The view model has **no reference to the view**. The direction of knowledge reverses.\n\n| | MVP | MVVM |\n|---|---|---|\n| Knows about the view | Yes, via protocol | No |\n| Communication | Imperative calls | View observes state |\n| Testing | Needs a mock view | Plain object, no mock |\n\n- The view model exposes observable state; the view binds to it\n- Binding comes from Combine, `@Published`, `@Observable`, or a hand-rolled observer\n\n=> The risk is the view model absorbing everything and becoming a Massive View Model instead." },

    { d: 'hard', q: 'VIPER: name the five parts and say honestly when it is worth it.',
      a: "**V**iew, **I**nteractor (business logic), **P**resenter (view state), **E**ntity (models), **R**outer (navigation).\n\n+ Large app, many teams: strict boundaries make ownership obvious\n+ Genuinely complex business rules get their own testable layer\n! Enormous boilerplate\n! Five files and three protocols to render a list\n\n=> Worth it at team scale and rule complexity. Not worth it for a screen showing a table. The honest interview answer names the cost, not just the structure." },

    { d: 'medium', q: 'What does the Coordinator add to any of these?',
      a: "**Navigation.** None of MVC, MVP or MVVM says who decides the next screen.\n\n- Without one, flow decisions fall back into the view controller\n- That recreates the coupling problem, just for navigation instead of logic\n- A coordinator owns the flow and injects dependencies\n\n=> This is why the common real-world stack is **MVVM-C**: view models for screen logic, coordinators for flow, view controllers reduced to rendering and forwarding events." },

    { d: 'hard', q: 'How do you actually answer "which architecture would you use?" in an interview?',
      a: "**Do not name a pattern first.** Ask about constraints, then justify.\n\nWhat to ask:\n- Team size, and whether several teams touch one feature\n- What level they test at\n- SwiftUI, UIKit, or both\n- Lifespan and rate of change\n\nThen answer in this shape:\n\n> MVVM-C, because it gives testable screen logic without VIPER's file count, and coordinators keep navigation out of the controllers. The risk is view models growing too large, so I would extract use-case objects for anything beyond presentation.\n\n=> What is being assessed is whether you reason about trade-offs or recite acronyms." },

    { d: 'medium', q: 'What is unidirectional data flow and where does it fit?',
      a: "State flows down, events flow up, and every change goes through one reducer: `(State, Action) -> State`.\n\n+ One place to look for any state change\n+ Trivially replayable and testable\n+ Time-travel debugging\n! Boilerplate for every action\n! Awkward for focus, scroll position and one-shot alerts, which are events not state\n\n=> Shines on complex screens with many interacting states. Overkill for a settings toggle. Redux, TCA and SwiftUI's own model all work this way." },

    { d: 'hard', q: 'How do you keep a view model from becoming the new Massive View Controller?',
      a: "Give it **one job**: turn model state into view state, and view events into use-case calls.\n\nEverything else moves out:\n\n| Concern | Belongs in |\n|---|---|\n| Networking | A repository or service |\n| Business rules | Use-case or interactor objects |\n| Formatting | Formatters or a mapper |\n| Navigation | A coordinator |\n| Persistence | Behind a repository protocol |\n\nSmoke test, any one of these means it is doing too much:\n! It imports UIKit\n! It has more than a handful of dependencies\n! Its test file needs more than a couple of fakes" },

    { d: 'medium', q: 'Does the pattern change for SwiftUI?',
      a: "The **pressure** changes, not the principles.\n\n- SwiftUI's `View` is already a value-type description of state, so the 'controller does everything' failure mode does not arise the same way\n- Many SwiftUI apps use `@Observable` model objects with no separate view model per screen\n\nWhat stays true regardless:\n- Business logic still needs a home outside the view\n- Navigation still needs an owner\n- Dependencies still need to be injectable\n\n=> MVVM in SwiftUI is often just 'an observable object', which is fine. Adding a presenter with a view protocol is usually redundant, since bindings already do that job." },

    { d: 'hard', q: 'How do you test each layer of an MVVM-C app?',
      a: "Many fast unit tests, a few snapshot tests, very few UI tests.\n\n| Layer | How | Speed |\n|---|---|---|\n| View model | Inject fakes, drive inputs, assert state | Milliseconds |\n| Coordinator | Spy navigator, assert screens and order | Milliseconds |\n| Services | Stubbed `URLProtocol` or fake store | Fast |\n| Views | Snapshot tests for layout regressions | Medium |\n| Flows | XCUITest, critical happy paths only | Slow, flaky |\n\n=> The shape of that pyramid is the point. UI tests are the most expensive and least reliable, so spend them only where failure would be costly." }
  ],
  quiz: [
    { d: 'medium', q: 'The defining difference between MVP and MVVM is:', choices: ['MVP uses protocols, MVVM does not', 'The presenter holds a reference to the view; the view model does not', 'MVVM requires Combine', 'MVP has no model layer'], correct: 1,
      why: 'MVVM reverses the direction of knowledge: the view observes the view model, which knows nothing about the view.' },
    { d: 'easy', q: 'UIKit MVC degenerates into Massive View Controller mainly because:', choices: ['Objective-C has no namespaces', 'The view controller owns the view, so it is both V and C, and everything lands there', 'Storyboards are slow', 'Models cannot hold logic'], correct: 1,
      why: 'The merged V and C role leaves no natural seam, so networking, formatting and navigation all accumulate in one class.' },
    { d: 'hard', q: 'The strongest honest argument against VIPER for a simple list screen is:', choices: ['It is not testable', 'It cannot handle navigation', 'Five files and several protocols to render a table is a poor cost/benefit trade', 'It only works in Objective-C'], correct: 2,
      why: 'VIPER buys boundaries that pay off at team scale and rule complexity. On a simple screen you pay all the cost and get little back.' },
    { d: 'medium', q: 'A coordinator is added to MVVM because MVVM does not specify:', choices: ['How to fetch data', 'Who owns navigation', 'How to format dates', 'How to persist state'], correct: 1,
      why: 'Without it, flow decisions fall back into the view controller and recreate the coupling problem for navigation.' },
    { d: 'hard', q: 'The clearest sign a view model has taken on too much:', choices: ['It has published properties', 'It imports UIKit or needs many fakes to test', 'It is over 100 lines', 'It uses async/await'], correct: 1,
      why: 'Both indicate it has absorbed presentation-adjacent or infrastructure responsibilities that belong in other layers.' },
    { d: 'medium', q: 'Unidirectional data flow is least comfortable for:', choices: ['Complex interacting state', 'One-shot imperative concerns like focus, scroll position and alerts', 'Testing state transitions', 'Debugging state history'], correct: 1,
      why: 'Those are events rather than state, so they need an awkward consume-once representation inside the state tree.' }
  ]
});

IPREP.addTopic({
  id: 'di', domain: 'architecture',
  title: 'Dependency Injection & Testability',
  summary: 'Getting dependencies into objects without singletons, and what makes code testable.',
  cards: [
    { d: 'easy', q: 'What are the three forms of dependency injection?',
      a: "Initialiser injection is the default. The other two are fallbacks for when a framework owns construction.\n\n| Form | Use when | Cost |\n|---|---|---|\n| **Initialiser** | Almost always | None |\n| **Property** | A storyboard or framework constructs the object | Implicitly unwrapped optionals, a window where the object is invalid |\n| **Method** | The dependency is per-call, like a date or a random source | None |\n\n=> Prefer initialiser injection: the object is always fully formed and its requirements are visible in the signature." },

    { d: 'medium', q: 'What is actually wrong with singletons?',
      a: "Not that they are global. That they are **implicit and unsubstitutable**.\n\n! The dependency does not appear in the type's interface\n! It cannot be replaced in a test\n! Shared mutable state leaks between tests, so order starts to matter\n\n=> Defensible for a genuinely process-wide resource such as `FileManager.default`, but even then inject it behind a protocol so the consumer never names the singleton." },

    { d: 'medium', q: 'How do you make a legacy class with a hardcoded singleton testable?',
      a: "**Default-parameter injection.** A refactor with zero call-site changes.\n\n```\ninit(network: Networking = NetworkManager.shared) {\n    self.network = network\n}\n```\n\n+ Production code keeps working untouched\n+ Tests pass a fake\n+ Applies class by class, no big-bang rewrite\n\n=> The single highest-leverage refactor for a legacy iOS codebase." },

    { d: 'hard', q: 'What is a composition root and why does it matter?',
      a: "The **one place** where the object graph is wired: the app delegate, scene delegate, or a top-level factory.\n\n- Every concrete type is chosen there\n- Nothing below it knows how to construct its own dependencies\n\n=> It is the difference between DI and 'passing things around'. With one composition root you swap the whole graph for a test or a demo mode by changing one file. Without it, `SomeService()` is called in twenty places and there is no seam." },

    { d: 'medium', q: 'What is the difference between a stub, a mock, a spy and a fake?',
      a: "| Double | Behaviour |\n|---|---|\n| **Stub** | Returns canned values. No assertions |\n| **Spy** | Records calls so you assert afterwards |\n| **Mock** | Carries built-in expectations and fails if unmet |\n| **Fake** | A real but simplified implementation, like an in-memory database |\n\n=> Prefer stubs and fakes. Heavy mocking couples the test to the implementation, so a refactor that preserves behaviour still breaks the test. That is exactly the property you do not want." },

    { d: 'hard', q: 'How do you test networking code without hitting the network?',
      a: "Inject a `URLSession` wired to a custom `URLProtocol` that returns canned responses.\n\n```\nlet config = URLSessionConfiguration.ephemeral\nconfig.protocolClasses = [MockURLProtocol.self]\nlet session = URLSession(configuration: config)\n```\n\n+ Your real request building, headers, decoding and error mapping all execute\n+ Integration-level confidence at unit-test speed\n+ No network, no flakiness\n\n=> Better than mocking your own client protocol, which would skip all the code you actually wrote." },

    { d: 'medium', q: 'How do you make time and randomness testable?',
      a: "**Inject them.** Any implicit call to ambient global state is a testability hole.\n\n| Instead of | Inject |\n|---|---|\n| `Date()` | A `Clock` protocol or `() -> Date` |\n| `Int.random` | A generator |\n| `UUID()` | A factory |\n| `Locale.current`, `TimeZone.current` | The value |\n| File system | A protocol |\n\n=> Time bites hardest, because the tests become **flaky** rather than failing outright. A test that asserts 'expired after 30 days' should never have to wait." },

    { d: 'hard', q: 'What are the arguments against a DI container framework on iOS?',
      a: "Most containers resolve by type at **runtime**, which throws away Swift's main advantage.\n\n! A missing registration is a crash, not a compile error\n! The graph becomes invisible; you cannot read a file and see what depends on what\n! An extra dependency and a learning curve\n\n+ Manual initialiser injection gives compile-time safety and a readable graph\n\n=> Containers earn their place in very large multi-module apps where manual wiring becomes genuinely unwieldy. Below that, they cost more than they give." },

    { d: 'medium', q: 'What makes code hard to test, in a checklist?',
      a: "Every item below is a **missing injection point**.\n\n! Constructs its own dependencies internally\n! Reaches for singletons or other global state\n! Does work in `init`\n! Calls `Date()`, `UUID()`, `Bundle.main` or the file system directly\n! Requires a view lifecycle to exercise logic\n! Mixes async and sync with no injection point\n! Keeps the interesting logic in private methods with no public seam\n\n=> Testability is not a separate property you add. It is a consequence of making dependencies explicit." },

    { d: 'hard', q: 'How do you inject dependencies into a storyboard-instantiated view controller?',
      a: "Three options, in increasing order of quality.\n\n| Approach | Verdict |\n|---|---|\n| Property injection after `instantiateViewController` | Traditional. Leaves the object temporarily invalid |\n| `instantiateViewController(identifier:creator:)` | **The modern answer.** Real initialiser injection with a storyboard layout |\n| Construct in code, drop storyboard instantiation | Cleanest, if you can |\n\n=> The `creator:` variant (iOS 13+) is the one worth naming, because most people still reach for property injection out of habit." }
  ],
  quiz: [
    { d: 'easy', q: 'The preferred DI form is initialiser injection because:', choices: ['It is faster', 'The object is always fully formed and its requirements are visible in the signature', 'It avoids protocols', 'Storyboards require it'], correct: 1,
      why: 'Property injection leaves a window where the object is invalid and hides requirements from the type.' },
    { d: 'medium', q: 'The core problem with a singleton dependency is that it is:', choices: ['Slow', 'Implicit and unsubstitutable in tests', 'Thread-unsafe by definition', 'Memory intensive'], correct: 1,
      why: 'It does not appear in the interface and cannot be replaced, so shared mutable state leaks between tests.' },
    { d: 'hard', q: 'Testing networking via a custom URLProtocol is better than mocking your own client because:', choices: ['It is faster', 'Your real request building, headers, decoding and error mapping still execute', 'It requires no setup', 'It works without URLSession'], correct: 1,
      why: 'You get integration-level coverage of the code you actually wrote, at unit-test speed and with no network.' },
    { d: 'medium', q: 'Which test double records calls for later assertion?', choices: ['Stub', 'Spy', 'Fake', 'Dummy'], correct: 1,
      why: 'A stub returns canned values, a fake is a working simplified implementation, and a mock carries built-in expectations.' },
    { d: 'hard', q: 'The main argument against a runtime DI container in Swift is:', choices: ['Performance', 'A missing registration becomes a runtime crash rather than a compile error', 'It cannot handle protocols', 'It requires Objective-C'], correct: 1,
      why: 'It trades away the compile-time safety that is the main reason to use Swift for wiring in the first place.' },
    { d: 'medium', q: 'Injecting a clock rather than calling Date() directly primarily prevents:', choices: ['Memory leaks', 'Flaky, slow, time-dependent tests', 'Timezone crashes', 'Retain cycles'], correct: 1,
      why: 'Tests that wait or depend on wall-clock time are the classic source of intermittent CI failures.' }
  ]
});

IPREP.addTopic({
  id: 'storage', domain: 'architecture',
  title: 'Persistence & Storage Mechanisms',
  summary: 'UserDefaults, Keychain, files, Core Data, SwiftData and SQLite: choosing and using each.',
  cards: [
    { d: 'easy', q: 'Name the storage options and what each is actually for.',
      a: "Pick by **what the data is**, not by what is convenient.\n\n| Option | For | Size |\n|---|---|---|\n| `UserDefaults` | Small preferences | Kilobytes |\n| Keychain | Credentials and secrets | Tiny, encrypted |\n| Files | Blobs, images, downloads, exports | Any |\n| Core Data / SwiftData | Object graph, relationships, querying, migration | Large |\n| SQLite or GRDB | When you want SQL and deterministic performance | Large |\n| CloudKit | Sync across a user's devices | Any |\n\n=> The interview trap is putting big or sensitive data in `UserDefaults`." },

    { d: 'medium', q: 'Why should you not store large data or secrets in UserDefaults?',
      a: "It is a **plist file**, read fully into memory on first access and rewritten on change.\n\n! Large values slow launch and raise memory\n! Every write rewrites the file\n! It is **unencrypted**, trivially readable from a device backup or a jailbroken device\n\n=> Secrets go in the Keychain. Anything large goes in a file or a database." },

    { d: 'medium', q: 'What do the Keychain accessibility classes mean?',
      a: "| Class | Readable |\n|---|---|\n| `WhenUnlocked` | Only while unlocked. **The sensible default** |\n| `AfterFirstUnlock` | After the first unlock since boot. What background tasks need |\n| `WhenUnlockedThisDeviceOnly` | Same, and **excluded from backups** |\n| `WhenPasscodeSetThisDeviceOnly` | Requires a passcode; destroyed if it is removed |\n\n=> `ThisDeviceOnly` is the one interviewers probe. It is what stops a refresh token migrating onto a restored device." },

    { d: 'hard', q: 'What are the Core Data concurrency rules?',
      a: "A context and its managed objects are **bound to one queue**. Break any rule below and you get the wrong-queue crash, usually far from the cause.\n\n- Use `perform` or `performAndWait` for every access outside the context's own queue\n- **Never pass an `NSManagedObject` between contexts.** Pass its `NSManagedObjectID` and re-fetch\n- View context is main-queue; background work uses `newBackgroundContext()` or `performBackgroundTask`\n- Merge with `automaticallyMergesChangesFromParent`, or observe the save notification\n\n=> The object and its context travel together. That single idea covers all four rules." },

    { d: 'hard', q: 'What is a faulted managed object and why does it matter for performance?',
      a: "Core Data returns **faults**: shells with an object ID and no data. Touching a property fires a round trip to the store.\n\n! A loop over 500 fetched objects reading one property each is 500 round trips. This is the classic **N+1**\n\nFixes:\n- `fetchRequest.returnsObjectsAsFaults = false`\n- `relationshipKeyPathsForPrefetching` for relationships\n- `fetchBatchSize` to page\n\n=> Recognising the N+1 pattern here is exactly what a Core Data question is testing." },

    { d: 'medium', q: 'What are the Core Data migration strategies?',
      a: "| Strategy | Handles |\n|---|---|\n| **Lightweight** | Adding or removing attributes and entities, renames with an identifier, optionality changes |\n| **Mapping model** | Changes it cannot infer |\n| **Custom policy** | Transformations needing code (`NSEntityMigrationPolicy`) |\n| **Progressive** | Chained versions when users skip releases |\n\n! The production risk: a user on a two-year-old version needing three migrations at once, on a large store, during launch.\n\n=> Test that path specifically. It is the one that ships broken." },

    { d: 'hard', q: 'When would you choose SQLite or GRDB over Core Data?',
      a: "It is a real trade, not a clear win.\n\n+ Complex queries, joins and aggregates that `NSPredicate` expresses awkwardly\n+ Predictable performance, and you can see the actual SQL\n+ Schema shared with a backend or another platform\n+ Simple testable value types instead of `NSManagedObject` lifecycle rules\n! You lose `NSFetchedResultsController` change tracking\n! You lose graph and relationship management\n! You lose undo support and CloudKit sync integration" },

    { d: 'medium', q: 'How do you choose where in the file system to write?',
      a: "| Location | For | Backed up |\n|---|---|---|\n| `Documents` | User-generated content | Yes |\n| `Library/Application Support` | App-generated data the user did not create | Yes |\n| `Library/Caches` | Reproducible data. **The system may delete it** | No |\n| `tmp` | Scratch | No |\n\n! Backed-up locations count against the user's iCloud quota\n! App Review has rejected apps for backing up re-downloadable content\n\n=> Downloaded content goes in Caches, or gets `isExcludedFromBackup`. And code must survive Caches disappearing." },

    { d: 'hard', q: 'How would you design an offline-first cache layer?',
      a: "A repository that returns local data immediately and refreshes behind it.\n\n1. Read from the store and publish it, so the UI is never empty\n2. Fetch with an `ETag` or `If-Modified-Since`\n3. On 200, write through to the store; the UI updates via the same observation path\n4. On 304 or an error, keep local data and show a subtle staleness cue\n5. Queue mutations locally with a pending flag, replay on reconnect\n\n=> The hard part is **conflict resolution**. Last-write-wins is simplest, per-field merge is better, a server-authoritative version number avoids most of it. Say which you would pick and why." },

    { d: 'medium', q: 'What is SwiftData and how does it relate to Core Data?',
      a: "A Swift-native layer over the **same persistence machinery**, using macros instead of a model editor.\n\n+ Value-type-feeling models, far less boilerplate\n+ Compile-time-checked queries via `@Model` and `@Query`\n+ Integrates directly with SwiftUI\n! Gaps around complex migrations and fine-grained fetch tuning\n! Raises the minimum OS version\n\n=> Reasonable default for a new SwiftUI app. Rarely worth migrating a large existing Core Data stack yet." }
  ],
  quiz: [
    { d: 'easy', q: 'An auth token belongs in:', choices: ['UserDefaults', 'Keychain', 'A file in Documents', 'Core Data'], correct: 1,
      why: 'UserDefaults is an unencrypted plist readable from a backup. The Keychain is encrypted and has accessibility controls.' },
    { d: 'hard', q: 'To stop a refresh token restoring onto a different device you use:', choices: ['kSecAttrAccessibleWhenUnlocked', 'kSecAttrAccessibleAfterFirstUnlock', 'kSecAttrAccessibleWhenUnlockedThisDeviceOnly', 'kSecAttrAccessibleAlways'], correct: 2,
      why: 'ThisDeviceOnly excludes the item from backups, so it cannot migrate during a device restore.' },
    { d: 'medium', q: 'Passing an NSManagedObject between contexts is wrong because:', choices: ['It is slow', 'Managed objects are bound to their context queue; pass the objectID and re-fetch', 'It duplicates the row', 'It breaks faulting'], correct: 1,
      why: 'The object and its context are queue-bound. Violations produce wrong-queue crashes that surface far from the cause.' },
    { d: 'hard', q: 'A loop over 500 fetched Core Data objects is slow. Most likely:', choices: ['The predicate is unindexed', 'Faults firing one per object, an N+1 pattern', 'The context is on the main queue', 'The store is not SQLite'], correct: 1,
      why: 'Use returnsObjectsAsFaults = false, relationshipKeyPathsForPrefetching, and fetchBatchSize to collapse the round trips.' },
    { d: 'medium', q: 'Re-downloadable content must not be stored in Documents because:', choices: ['It is slower', 'It is backed up, counting against iCloud quota, and App Review rejects this', 'It is read-only', 'It is deleted on update'], correct: 1,
      why: 'Use Library/Caches, or set isExcludedFromBackup on the file.' },
    { d: 'hard', q: 'The hardest part of an offline-first design is usually:', choices: ['Choosing a database', 'Conflict resolution when local and server state diverge', 'Serialising to JSON', 'Background fetch scheduling'], correct: 1,
      why: 'Last-write-wins, per-field merge and server version numbers are the options. Naming the trade-off is the expected answer.' }
  ]
});

IPREP.addTopic({
  id: 'network', domain: 'architecture',
  title: 'Network Layer & Mobile API Design',
  summary: 'Building a URLSession layer, and designing the API a mobile client actually wants.',
  cards: [
    { d: 'easy', q: 'What are the layers of a well-factored network stack?',
      a: "Four layers, each testable without a network.\n\n| Layer | Job | Knows about |\n|---|---|---|\n| **Endpoint** | Typed path, method, headers, body | Nothing |\n| **Client** | Builds the request, executes, returns `Data` | Auth, retries, logging |\n| **Decoder** | `Data` to domain models and domain errors | Models |\n| **Repository** | Composes the above into operations | Caching |\n\n=> The test of the design is whether you can unit test each layer in isolation." },

    { d: 'medium', q: 'What does URLSession give you for free that people reimplement badly?',
      a: "+ Connection pooling and HTTP/2 multiplexing\n+ A shared `URLCache` honouring `Cache-Control` and `ETag`\n+ Background transfers that survive suspension or termination\n+ Cellular policies: `allowsExpensiveNetworkAccess`, `waitsForConnectivity`\n+ Automatic retry of idempotent requests on connection reuse failure\n+ System proxy, TLS and certificate handling\n\n=> Hand-rolled clients usually lose the cache and background support. That is why the answer to 'would you use Alamofire?' is normally 'not for the transport'." },

    { d: 'medium', q: 'How do you design the error type for a network layer?',
      a: "A **domain enum** that hides transport detail but keeps enough to act on.\n\n```\nenum APIError: Error {\n    case offline\n    case timeout\n    case unauthorized\n    case server(status: Int, message: String?)\n    case decoding(DecodingError)\n    case cancelled\n}\n```\n\n=> A view model should decide 'show retry' vs 'send to login' vs 'log and show generic' **without inspecting `URLError` codes**. Leaking `URLError` and `DecodingError` to the UI layer is a design smell." },

    { d: 'hard', q: 'How do you implement token refresh without a thundering herd?',
      a: "Serialise refresh through a **single in-flight task**.\n\n```\nactor TokenProvider {\n    private var refreshTask: Task<Token, Error>?\n    func token() async throws -> Token {\n        if let t = current, !t.isExpired { return t }\n        if let task = refreshTask { return try await task.value }\n        let task = Task { try await refresh() }\n        refreshTask = task\n        defer { refreshTask = nil }\n        return try await task.value\n    }\n}\n```\n\n- Ten concurrent 401s trigger **one** refresh; the rest await it\n- Retry each original request **exactly once** after refresh\n- On refresh failure, log out rather than looping" },

    { d: 'hard', q: 'Design a retry policy. What must it include?',
      a: "| Rule | Why |\n|---|---|\n| Idempotent requests only | Retrying a POST can double-charge. Require an idempotency key otherwise |\n| Exponential backoff **with jitter** | Without jitter every client retries in lockstep |\n| Cap attempts and total elapsed time | Otherwise a dead backend hangs the UI forever |\n| Retry 5xx, 429 (honour `Retry-After`), connectivity | A 4xx will fail identically forever |\n| Respect cancellation | A dismissed screen must stop retrying |\n\n=> **Jitter** is the detail interviewers listen for. Without it, retries synchronise into a self-inflicted DDoS on a server that was just recovering." },

    { d: 'medium', q: 'What are the mobile-specific concerns when designing an API?',
      a: "Design for **high latency and intermittent connectivity**, not for bandwidth.\n\n- **Round trips are expensive.** A cold cellular request costs hundreds of milliseconds before a byte moves, so prefer one composite response over five chatty calls\n- **Payload size costs battery**, because the radio stays powered after each transfer\n- **Clients cannot be force-updated**, so the API must stay backward compatible for years\n- **Offline is normal**, not exceptional\n- **Push carries a hint, not a payload**, since delivery is best-effort" },

    { d: 'hard', q: 'Compare pagination strategies for a mobile feed.',
      a: "| Strategy | Stable under insertion | Deep pages | Verdict |\n|---|---|---|---|\n| **Offset / limit** | No, items shift | Slows down | Simple but wrong for feeds |\n| **Cursor / keyset** | Yes | Fast at any depth | **The right default** |\n| **Time-based** | Mostly | Fast | Breaks on ties and clock skew |\n\n! Offset paging shows duplicates or skips items whenever new content is inserted above.\n\n=> Also specify what happens when a client returns after days offline with a stale cursor, and give it a way to refresh from the top without re-paging everything." },

    { d: 'hard', q: 'How do you version a mobile API, and what does backward compatibility require?',
      a: "URL versioning (`/v1/`) for major breaks. Within a version, evolve **additively**.\n\n| Safe | Breaking |\n|---|---|\n| New optional field | Removing a field |\n| New endpoint | Renaming a field |\n| New enum case (if clients tolerate) | Changing a type |\n\nThe client's half of the contract:\n- Ignore unknown fields\n- Default missing optional fields\n- Map unknown enum cases to a fallback, never fail the decode\n\n=> That last point is the most common real-world outage: the server adds a new status string and every old client fails to parse the **whole** response." },

    { d: 'medium', q: 'When would you choose GraphQL over REST for a mobile client, honestly?',
      a: "| GraphQL wins | It costs you |\n|---|---|\n| Screens need different subsets of a large graph | HTTP caching stops working out of the box, since everything is one POST |\n| REST would force over-fetching or many round trips | Query complexity can hurt the server |\n| Several clients with different needs share one backend | Errors are per-field, not per-response |\n| | Tooling and schema discipline are a real investment |\n\n=> For a small app with stable screens, REST plus a couple of composite endpoints is usually the better trade." },

    { d: 'medium', q: 'What is certificate pinning, and when is it worth it?',
      a: "Validating the server's certificate or public key against one you shipped, instead of trusting any CA.\n\n+ Defends against a compromised or coerced CA\n+ Defends against a user-installed proxy certificate\n! If you pin a leaf certificate and it rotates before your update ships, **every client breaks at once**\n\nIf you do it:\n- Pin the **public key**, not the leaf certificate\n- Ship a backup pin\n- Ship a remote kill switch\n\n=> Worth it for banking, health, and anywhere a MITM is a serious threat. Not worth the operational risk otherwise." },

    { d: 'hard', q: 'How would you design image loading for a feed, end to end?',
      a: "1. **Request the right size.** Ask the CDN for a variant sized to the display, not the original\n2. **Two-tier cache.** In-memory `NSCache` of decoded images keyed by URL **plus size**, and a disk cache honouring HTTP caching\n3. **Decode off the main thread**, downsampling with `CGImageSourceCreateThumbnailAtIndex` so a full-resolution bitmap never exists\n4. **Cancel on reuse**, tied to `prepareForReuse` and the prefetch API\n5. **Bound concurrency** so a fast scroll does not open fifty connections\n6. **Placeholder** to avoid layout shift\n\n=> Mentioning downsampling and cancellation is what separates a real answer from a description of a URL loading loop." }
  ],
  quiz: [
    { d: 'medium', q: 'The detail that stops retries becoming a self-inflicted DDoS is:', choices: ['A shorter timeout', 'Exponential backoff with jitter', 'Retrying on 4xx too', 'A larger connection pool'], correct: 1,
      why: 'Without jitter every client retries in lockstep and hits the recovering server simultaneously.' },
    { d: 'hard', q: 'Ten concurrent requests get 401. The correct design triggers:', choices: ['Ten refreshes', 'One refresh that the other nine await', 'An immediate logout', 'Ten retries with no refresh'], correct: 1,
      why: 'Serialise refresh through a single in-flight task. Retry each original request once after it resolves.' },
    { d: 'medium', q: 'Cursor pagination beats offset pagination on mobile mainly because:', choices: ['It uses less bandwidth', 'It is stable when items are inserted, so users do not see duplicates or gaps', 'It supports sorting', 'It is required by REST'], correct: 1,
      why: 'Offsets shift under insertion and degrade in performance deep into a list.' },
    { d: 'hard', q: 'The most common real-world break from an additive server change is:', choices: ['A new endpoint', 'A new enum case the client decodes strictly and fails on', 'A larger payload', 'A new header'], correct: 1,
      why: 'Map unknown raw values to an unknown case. Strict enum decoding turns an additive change into a total parse failure.' },
    { d: 'medium', q: 'Pinning a leaf certificate rather than a public key is risky because:', choices: ['It is slower to validate', 'Certificate rotation breaks every shipped client at once', 'It does not stop MITM', 'iOS does not support it'], correct: 1,
      why: 'Pin the public key, include a backup pin, and ship a kill switch. Clients cannot be force-updated.' },
    { d: 'hard', q: 'The image-loading detail that most reduces memory in a feed is:', choices: ['A larger NSCache limit', 'Downsampling during decode so a full-resolution bitmap never exists', 'Using JPEG instead of PNG', 'Prefetching more aggressively'], correct: 1,
      why: 'A decoded bitmap costs width x height x 4 bytes regardless of file size. Decode straight to display size.' },
    { d: 'easy', q: 'Which does URLSession give you that hand-rolled clients most often lose?', choices: ['TLS', 'HTTP caching and background transfers', 'JSON decoding', 'Retry logic'], correct: 1,
      why: 'URLCache with ETag support and background sessions that survive suspension are both non-trivial to replace.' }
  ]
});
