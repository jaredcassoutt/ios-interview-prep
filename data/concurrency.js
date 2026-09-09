/* Concurrency & Threading — 5 topics */

IPREP.addTopic({
  id: 'gcd', domain: 'concurrency',
  title: 'GCD Fundamentals: Queues & QoS',
  summary: 'Serial vs concurrent, sync vs async, quality of service, and keeping the main thread free.',
  cards: [
    { d: 'easy', q: 'Serial versus concurrent queue, and sync versus async. Which axis is which?',
      a: "They are **two independent axes**, and conflating them is the most common GCD confusion.\n\n| Axis | Property of | Question |\n|---|---|---|\n| Serial vs concurrent | The **queue** | How many blocks may run at once? |\n| Sync vs async | The **call** | Does the caller wait? |\n\n=> So `concurrentQueue.sync` is legal and blocks the caller, and `serialQueue.async` is legal and does not." },

    { d: 'easy', q: 'Why must UI work happen on the main queue?',
      a: "**UIKit is not thread-safe.** Its internal state, the layout pass, the responder chain and the layer tree all assume single-threaded access.\n\n! Touching them from a background thread gives corruption, undefined layout, and crashes that reproduce one time in fifty\n\n- The main queue is a serial queue bound to the main thread\n- That thread also runs the run loop driving event delivery and the commit to the render server\n\n=> `DispatchQueue.main.async` hops back. The Main Thread Checker flags violations at runtime." },

    { d: 'medium', q: 'List the QoS classes and what each is for.',
      a: "| Class | For | Latency |\n|---|---|---|\n| `.userInteractive` | Must finish this frame. Animation, event handling | Do almost nothing here |\n| `.userInitiated` | User is watching a spinner | Seconds |\n| `.default` | Unspecified. Avoid stating it | |\n| `.utility` | Progress-bar work, downloads, imports | Energy-efficient |\n| `.background` | Invisible maintenance, prefetch, sync | May be deferred substantially |\n\n=> QoS drives CPU priority, I/O priority **and timer coalescing**, so it is a battery decision as much as a speed one." },

    { d: 'medium', q: 'What is priority inversion and how does GCD handle it?',
      a: "A high-priority task waits on a resource held by a **low-priority** task the scheduler is not running, so the high-priority task is effectively demoted.\n\n- GCD mitigates with **priority donation**: a `sync` submission from a high-QoS caller temporarily raises the target queue's QoS so it drains faster\n! It helps but does not eliminate the problem\n\n=> Which is one reason `sync` from the main queue onto a `.background` queue is a bad idea." },

    { d: 'hard', q: 'What exactly deadlocks, and why does `DispatchQueue.main.sync` from the main thread hang?',
      a: "`sync` means: run this block on the target queue and **do not return until it finishes**.\n\n1. Called from the main thread, targeting the main queue\n2. The main thread blocks waiting for the block\n3. The block can only run on the main thread, which is blocked\n4. Instant deadlock\n\n=> The general rule: **never `sync` onto a queue you might already be on.** The same hangs on any serial queue, which happens easily when two helpers both wrap their work in `queue.sync`.\n\n```bad  the main thread waits for a block only it can run\nfunc currentUser() -> User {\n    DispatchQueue.main.sync { self.cachedUser }     // hangs if already on main\n}\n```\n\n```good  never sync onto a queue you might be on\n@MainActor\nfunc currentUser() -> User { cachedUser }\n\n// or, if you must stay with GCD, make the API async and let callers hop\nfunc currentUser(_ completion: @escaping (User) -> Void) {\n    DispatchQueue.main.async { completion(self.cachedUser) }\n}\n```" },

    { d: 'hard', q: 'How do you make a function safe to call from any queue without deadlocking?',
      a: "Do not compare threads. Use a **queue-specific key**:\n\n```\nlet key = DispatchSpecificKey<Void>()\nqueue.setSpecific(key: key, value: ())\nfunc safe<T>(_ work: () -> T) -> T {\n    DispatchQueue.getSpecific(key: key) != nil ? work() : queue.sync(execute: work)\n}\n```\n\n=> Better still, design so the question never arises: make the function always `async`, or make the class an `actor`. A reentrancy check is a smell that the ownership model is unclear." },

    { d: 'medium', q: 'What is thread explosion and how do you prevent it?',
      a: "Submitting many blocks to a **concurrent** queue where each blocks on I/O or a lock.\n\n1. GCD sees blocked threads and spins up more to keep the CPU busy\n2. Up to a hard limit of **64 per queue**\n3. Past that: memory pressure from stacks, context-switch thrashing, eventually a hang\n\nPrevent with:\n- `DispatchSemaphore` as a counting limiter\n- `OperationQueue` with `maxConcurrentOperationCount`\n- `DispatchQueue.concurrentPerform` for CPU-bound work\n\n=> Swift concurrency's cooperative pool avoids the problem structurally." },

    { d: 'medium', q: 'What is `DispatchQueue.concurrentPerform` for?',
      a: "**Data-parallel CPU work** over a fixed iteration count.\n\n```\nDispatchQueue.concurrentPerform(iterations: n) { i in\n    results[i] = expensive(input[i])\n}\n```\n\n+ Blocks until all iterations complete\n+ Uses a thread count matched to active cores, so it cannot cause thread explosion\n! Wrong if the body does I/O, because blocked threads waste cores\n\n=> Right for image processing across tiles or transforming a large array." },

    { d: 'hard', q: 'What is a target queue and why would you set one?',
      a: "Every queue targets another, ultimately a global root queue. `queueA.setTarget(queue: queueB)` funnels A's work through B, so **A inherits B's serialisation**.\n\nUses:\n- A **queue hierarchy**: several logical serial queues targeting one serial queue, mutually exclusive without each holding a thread\n- Applying a QoS ceiling to a whole subsystem\n\n! The target can only be set before the queue is used." },

    { d: 'hard', q: 'What is `DispatchWorkItem` and what does it give you over a plain closure?',
      a: "A reference-typed, **cancellable**, wait-able unit of work.\n\n```\nlet item = DispatchWorkItem { search(text) }\nqueue.asyncAfter(deadline: .now() + 0.3, execute: item)\nitem.cancel()\n```\n\n! `cancel()` only prevents the item from **starting**. It does not interrupt work already running, so a long body must check `item.isCancelled` itself\n\n=> This is the standard debounce. You can also attach `notify` handlers and `wait()` on it." },

    { d: 'medium', q: 'What is the difference between the main queue and the main thread?',
      a: "The main **thread** is an OS thread. The main **queue** is a serial dispatch queue whose blocks execute on it.\n\n! They are not interchangeable. Code can run on the main thread without being on the main queue, for example inside a `sync` block dispatched from the main thread onto another queue\n\n| Check | Use |\n|---|---|\n| Am I on the main thread? | `Thread.isMainThread` |\n| Am I on the main queue? | `dispatchPrecondition(condition: .onQueue(.main))` |" }
  ],
  quiz: [
    { d: 'easy', q: '`DispatchQueue.main.sync { }` called from the main thread:', choices: ['Runs immediately and inline', 'Deadlocks', 'Runs on a background thread', 'Throws an exception'], correct: 1,
      why: 'The main thread waits for a block that can only run on the main thread. Never sync onto a queue you may already be on.' },
    { d: 'medium', q: 'Serial vs concurrent describes the queue; sync vs async describes:', choices: ['The queue priority', 'Whether the calling thread waits', 'The QoS class', 'Whether the block is retained'], correct: 1,
      why: 'They are independent axes. concurrentQueue.sync blocks the caller; serialQueue.async does not.' },
    { d: 'hard', q: '30 network calls submitted async to a concurrent queue cause a hang. The cause is:', choices: ['Too little memory', 'Thread explosion: blocked threads make GCD spawn more up to the 64-thread limit', 'The queue is serial', 'QoS is too low'], correct: 1,
      why: 'Bound concurrency with a semaphore or OperationQueue.maxConcurrentOperationCount, or use URLSession, which already pools connections.' },
    { d: 'medium', q: 'Which QoS should a background sync that the user cannot see use?', choices: ['.userInteractive', '.userInitiated', '.utility', '.background'], correct: 3,
      why: 'It lets the system defer and coalesce the work for battery, especially in Low Power Mode.' },
    { d: 'hard', q: 'DispatchQueue.concurrentPerform is inappropriate when the body:', choices: ['Is CPU bound', 'Performs blocking I/O', 'Writes to distinct array indices', 'Is called with a large iteration count'], correct: 1,
      why: 'It sizes threads to cores. Blocking I/O leaves cores idle with no extra threads to compensate.' },
    { d: 'medium', q: 'DispatchWorkItem.cancel():', choices: ['Interrupts the running block immediately', 'Prevents the item starting, but a running body must check isCancelled itself', 'Throws CancellationError', 'Only works on the main queue'], correct: 1,
      why: 'Cooperative cancellation. The same model applies to Operation and to Swift Task cancellation.' },
    { d: 'hard', q: 'Priority donation in GCD means:', choices: ['Low priority work is deferred forever', 'A serial queue is temporarily raised to the QoS of a higher-priority sync caller', 'Background queues are promoted at launch', 'QoS is ignored for concurrent queues'], correct: 1,
      why: 'It mitigates priority inversion by draining the queue faster so the high-priority waiter unblocks sooner.' }
  ]
});

IPREP.addTopic({
  id: 'threadsafety', domain: 'concurrency',
  title: 'Thread Safety, Races & Deadlocks',
  summary: 'What a data race is, the tools to prevent one, and how to find them.',
  cards: [
    { d: 'easy', q: 'Define a data race precisely.',
      a: "Two or more threads access the same memory location concurrently, **at least one access is a write**, and there is no synchronisation ordering them.\n\n! The result is **undefined behaviour**, not merely an unexpected value. The compiler and CPU may reorder, cache or tear the access.\n\n=> Distinct from a **race condition**, which is a logic bug about ordering, such as a check-then-act another thread invalidates. You can have a race condition with no data race." },

    { d: 'medium', q: 'Compare the common synchronisation primitives on iOS.',
      a: "| Primitive | Best for | Watch out |\n|---|---|---|\n| Serial `DispatchQueue` | **The idiomatic default** | Supports async, easy to reason about |\n| `os_unfair_lock` | Very short critical sections | Not recursive, must not be copied |\n| `NSLock` | Short critical sections | Slower than unfair lock |\n| `NSRecursiveLock` | Same thread re-acquires | Usually a design smell |\n| `DispatchSemaphore` | Counting, so also a limiter | Easy to misuse as a mutex |\n| `actor` | New code | Compiler-enforced, no discipline needed |\n\n! Avoid `@synchronized` in new code. Never use the deprecated `OSSpinLock`." },

    { d: 'medium', q: 'Why is `OSSpinLock` deprecated?',
      a: "It **spins** in a tight loop waiting for the lock.\n\n1. The lock holder is a lower-priority thread\n2. The scheduler has descheduled it\n3. The spinning high-priority thread burns its whole quantum\n4. The holder never runs, never releases\n\n=> Unbounded priority inversion, which can hang the app. `os_unfair_lock` replaced it: it blocks in the kernel and participates in priority donation, so the holder gets boosted." },

    { d: 'hard', q: 'Implement a thread-safe property using a reader-writer pattern.',
      a: "```\nprivate let q = DispatchQueue(label: \"cache\", attributes: .concurrent)\nprivate var _items: [String: Data] = [:]\n\nvar items: [String: Data] { q.sync { _items } }\nfunc set(_ v: Data, for k: String) {\n    q.async(flags: .barrier) { self._items[k] = v }\n}\n```\n\n- Concurrent reads run in parallel\n- The barrier write waits for in-flight reads, runs alone, then lets reads resume\n\n! **Every** access must go through the queue. One unguarded read reintroduces the race\n! Barriers are ignored on the global queues\n\n```bad  one unguarded read reintroduces the race\nprivate let q = DispatchQueue(label: \"cache\", attributes: .concurrent)\nprivate var _items: [String: Data] = [:]\n\nvar items: [String: Data] { _items }                 // not on the queue\nfunc set(_ v: Data, for k: String) {\n    q.async(flags: .barrier) { self._items[k] = v }\n}\n```\n\n```good  every access goes through the queue\nvar items: [String: Data] { q.sync { _items } }\nfunc set(_ v: Data, for k: String) {\n    q.async(flags: .barrier) { self._items[k] = v }\n}\n```\n\n```good  or let the compiler enforce it\nactor Cache {\n    private var items: [String: Data] = [:]\n    func data(for k: String) -> Data? { items[k] }\n    func set(_ v: Data, for k: String) { items[k] = v }\n}\n```" },

    { d: 'medium', q: 'What is a deadlock and what are the classic conditions?',
      a: "Threads each waiting on a resource another holds, so none proceeds. Coffman's four conditions:\n\n1. Mutual exclusion\n2. Hold and wait\n3. No preemption\n4. **Circular wait**\n\n=> Break any one and deadlock is impossible. In practice you enforce **lock ordering**: if every path acquires locks in the same global order, circular wait cannot form. The other rule: never call out to unknown code while holding a lock." },

    { d: 'hard', q: 'What is a livelock, and how does it differ from a deadlock?',
      a: "| | Deadlock | Livelock |\n|---|---|---|\n| Threads are | Blocked | **Actively running** |\n| Progress | None | None |\n| CPU | Idle | **Burning** |\n\nCanonical example: two threads that each release their lock on detecting contention and immediately retry, in lockstep.\n\n=> Worse than deadlock in one respect: it looks like work is happening and it drains battery. Fix with randomised backoff or a fixed acquisition order." },

    { d: 'medium', q: 'How do you actually find a data race?',
      a: "**Thread Sanitizer**, in the scheme's Diagnostics tab. It instruments memory accesses and reports the two conflicting stacks with exact addresses.\n\n! Costs roughly 5-15x runtime and 5-10x memory, so run it in a dedicated CI job or a focused session, not always\n\nAlso:\n- **Main Thread Checker** for UIKit-off-main, a different bug class\n- `dispatchPrecondition` assertions in code\n- **Swift 6 compile-time checking**, which moves the whole class to build time" },

    { d: 'hard', q: 'Why is `lazy var` not thread-safe, and what is?',
      a: "It compiles to a **check-then-initialise with no synchronisation**, so two threads can both see it uninitialised, both run the initialiser, and tear the write.\n\n| Alternative | Guarantee |\n|---|---|\n| `static let` | Initialised exactly once, `dispatch_once` semantics |\n| Eager init in `init` | Trivially safe |\n| Lazy access behind a lock or queue | Safe, more code |\n\n=> `static let` inside a type is the idiomatic thread-safe singleton in Swift, and needs no boilerplate.\n\n```bad  check-then-initialise, unsynchronised: can run twice\nfinal class Service {\n    lazy var client = HTTPClient()\n}\n```\n\n```good  Swift guarantees a static let is initialised exactly once\nfinal class Service {\n    static let shared = Service()\n    let client = HTTPClient()          // eager, trivially safe\n}\n```" },

    { d: 'medium', q: 'Is `let` on a value type enough for thread safety?',
      a: "+ **Yes** for an immutable value type with no reference-type members. Concurrent reads of immutable memory are safe by definition\n! **No** if the struct contains a class reference, because the referenced object is shared mutable state\n! **No** for `let` on a class: it makes the *reference* constant, not the object\n\n=> That is the whole appeal, and the whole caveat, of value semantics for concurrency." },

    { d: 'hard', q: 'What is the atomicity trap with `@property (atomic)` in Objective-C?',
      a: "`atomic` guarantees only that an individual get or set is **not torn**. It says nothing about compound operations.\n\n```\nself.count = self.count + 1   // read, add, write: three operations\n```\n\n! Two threads interleave and lose an increment despite the property being atomic\n! And it costs a lock on **every** access\n\n=> So `atomic` is not thread safety, it is a very weak per-access guarantee. Hence the convention: `nonatomic` everywhere plus real synchronisation at the level of the operation you care about." }
  ],
  quiz: [
    { d: 'medium', q: 'A data race requires:', choices: ['Two threads reading the same memory', 'Concurrent access where at least one is a write, with no synchronisation', 'Two threads on the same queue', 'A lock held too long'], correct: 1,
      why: 'Concurrent reads alone are safe. The write plus missing ordering is what makes the behaviour undefined.' },
    { d: 'hard', q: 'OSSpinLock was deprecated because:', choices: ['It was too slow', 'A spinning high-priority thread can starve a lower-priority lock holder', 'It leaked memory', 'It was not recursive'], correct: 1,
      why: 'Unbounded priority inversion. os_unfair_lock blocks in the kernel and participates in priority donation instead.' },
    { d: 'medium', q: 'In a reader-writer queue, writes use:', choices: ['sync', 'async with .barrier flags on a queue you created', 'sync with .barrier on a global queue', 'A semaphore'], correct: 1,
      why: 'The barrier waits for in-flight reads, runs alone, then resumes concurrency. Barriers are ignored on global queues.' },
    { d: 'medium', q: '`lazy var` accessed from two threads can:', choices: ['Deadlock', 'Initialise twice and tear the storage', 'Throw', 'Return nil'], correct: 1,
      why: 'There is no synchronisation around the check-then-initialise. static let is the guaranteed once-only alternative.' },
    { d: 'hard', q: 'An `atomic` Objective-C property still loses increments because:', choices: ['atomic only applies to objects', 'Read-modify-write is three operations and atomic only protects each individually', 'The compiler ignores atomic', 'ARC reorders the access'], correct: 1,
      why: 'Atomicity per access is not atomicity per operation. You need a lock or a queue around the whole read-modify-write.' },
    { d: 'medium', q: 'The most direct tool for finding a data race is:', choices: ['Instruments Leaks', 'Thread Sanitizer', 'Main Thread Checker', 'Address Sanitizer'], correct: 1,
      why: 'TSan reports both conflicting stacks. Main Thread Checker catches UIKit-off-main, which is a different bug class.' },
    { d: 'hard', q: 'The practical prevention for deadlock in a codebase with several locks is:', choices: ['Use recursive locks everywhere', 'Establish a global lock acquisition order', 'Use spin locks', 'Reduce QoS'], correct: 1,
      why: 'A consistent order breaks the circular-wait condition, which is the one Coffman condition you can actually enforce by convention.' }
  ]
});

IPREP.addTopic({
  id: 'groupsbarriers', domain: 'concurrency',
  title: 'Dispatch Groups, Barriers & Semaphores',
  summary: 'Coordinating multiple pieces of async work without blocking the UI.',
  cards: [
    { d: 'easy', q: 'What is a DispatchGroup for, and how do you use it?',
      a: "Waiting for a **set** of async tasks to all finish.\n\n```\nlet group = DispatchGroup()\nfor url in urls {\n    group.enter()\n    fetch(url) { _ in group.leave() }\n}\ngroup.notify(queue: .main) { self.render() }\n```\n\n! Use `notify`, not `wait`. `notify` schedules a callback and does not block; `wait` blocks the calling thread and must never run on the main queue." },

    { d: 'medium', q: 'What are the failure modes of enter/leave?',
      a: "| Mistake | Symptom |\n|---|---|\n| More leaves than enters | **Immediate crash**, over-release of the group |\n| Missing leave on an error path | `notify` never fires, spinner spins forever |\n| Leave called twice | Crash |\n\nThe defence:\n```\ngroup.enter()\ndefer { group.leave() }   // covers every exit path\n```\n\n=> One `enter` per `leave`, at the same lexical level.\n\n```bad  the early return skips leave, so notify never fires\nfor url in urls {\n    group.enter()\n    fetch(url) { result in\n        guard let data = result else { return }      // leaked a group entry\n        store(data)\n        group.leave()\n    }\n}\n```\n\n```good  defer covers every exit path, including throws\nfor url in urls {\n    group.enter()\n    fetch(url) { result in\n        defer { group.leave() }\n        guard let data = result else { return }\n        store(data)\n    }\n}\n```" },

    { d: 'medium', q: 'What is a barrier block, and on which queues does it work?',
      a: "`queue.async(flags: .barrier)` on a **concurrent** queue:\n\n1. Waits until every previously submitted block finishes\n2. Runs alone, with nothing else on that queue\n3. Lets subsequent blocks resume concurrently\n\n! It only works on a concurrent queue **you created**\n! Barriers submitted to the global concurrent queues are **silently downgraded** to a normal block\n\n=> Because you do not own the global queues and cannot be allowed to stall the whole system." },

    { d: 'hard', q: 'When is a DispatchSemaphore the right tool, and when is it a mistake?',
      a: "+ **Right:** as a counting limiter. `DispatchSemaphore(value: 4)` caps a loop of downloads at four and prevents thread explosion\n! **Mistake:** using it to make an async API synchronous\n\n| `wait()` on | Consequence |\n|---|---|\n| The main thread | Frozen UI, watchdog kill |\n| A cooperative pool thread | Can **deadlock the whole pool** |\n\n=> If you need to bridge async to sync, restructure with `withCheckedContinuation` and `await` instead.\n\n```bad  blocks a cooperative thread: can deadlock the app\nfunc user() -> User {\n    let sem = DispatchSemaphore(value: 0)\n    var result: User!\n    Task { result = await api.user(); sem.signal() }\n    sem.wait()                                  // never do this\n    return result\n}\n```\n\n```good  as a counting limiter, which is what it is actually for\nlet limiter = DispatchSemaphore(value: 4)\nfor url in urls {\n    limiter.wait()\n    queue.async {\n        download(url) { _ in limiter.signal() }\n    }\n}\n```" },

    { d: 'hard', q: 'What is the difference between `group.wait()` and `group.notify()`?',
      a: "| | `wait()` | `notify(queue:)` |\n|---|---|---|\n| Blocks the caller | **Yes** | No |\n| Returns | On completion or timeout | Immediately |\n| Safe on main | **Never** | Yes |\n\n! `wait` on the main thread freezes the UI and will be killed by the watchdog\n! `wait` on a cooperative thread can starve the Swift concurrency pool\n\n=> `wait` is defensible only in a command-line tool or a test." },

    { d: 'medium', q: 'How do you run two independent requests in parallel and combine the results?',
      a: "```\nasync let user  = fetchUser()\nasync let posts = fetchPosts()\nlet (u, p) = try await (user, posts)\n```\n\n`async let` starts both immediately and suspends only at the `await`.\n\n| | GCD group | `async let` |\n|---|---|---|\n| Lines | ~10 with enter/leave | 3 |\n| Cancellation | Manual | **Automatic** |\n| Error propagation | Manual | **Automatic** |" },

    { d: 'hard', q: 'How do you sequence dependent async work without callback pyramids?',
      a: "```\nlet token   = try await login()\nlet profile = try await fetchProfile(token)\nlet feed    = try await fetchFeed(profile.id)\n```\n\nGCD options: chain in completion handlers (the pyramid), or `OperationQueue` with `addDependency`, which expresses the graph declaratively.\n\n=> The interview point: dependencies are a **graph** problem. Independent work should be parallel, dependent work sequential. Getting that classification right is most of the performance win." },

    { d: 'medium', q: 'What does `asyncAfter` guarantee, and what does it not?',
      a: "+ It guarantees the block will not run **before** the deadline\n! It does **not** guarantee it runs **at** the deadline. The queue may be busy, and the system coalesces timers to save power, with more slack at lower QoS\n\n| Good for | Wrong for |\n|---|---|\n| Debounce, retry backoff | Audio scheduling, animation timing |\n\n=> For precision use `CADisplayLink` or a media-clock-based API." },

    { d: 'hard', q: 'Write a debounce with GCD.',
      a: "```\nprivate var pending: DispatchWorkItem?\nfunc search(_ text: String) {\n    pending?.cancel()\n    let item = DispatchWorkItem { [weak self] in self?.performSearch(text) }\n    pending = item\n    DispatchQueue.main.asyncAfter(deadline: .now() + 0.3, execute: item)\n}\n```\n\n| | Debounce | Throttle |\n|---|---|---|\n| Behaviour | Cancels pending work, runs after quiet | Runs at most once per window |\n| Suits | Search-as-you-type | Scroll position reporting |\n\n=> Interviewers ask this because it tests `DispatchWorkItem`, cancellation semantics and that distinction in one question." },

    { d: 'medium', q: 'How do you add a timeout to a group of async work?',
      a: "```\nif group.wait(timeout: .now() + 5) == .timedOut { }   // but this blocks\n```\n\nThe non-blocking pattern: a `DispatchWorkItem` scheduled with `asyncAfter` that fires the failure path, plus a flag so the success path disables it.\n\n! Both sides must be guarded so **exactly one** wins.\n\n=> In Swift concurrency you race the work against `Task.sleep` inside a `withThrowingTaskGroup` and cancel the loser, which is cleaner because cancellation propagates." }
  ],
  quiz: [
    { d: 'medium', q: 'Barriers submitted to a global concurrent queue:', choices: ['Work normally', 'Are silently downgraded to a regular block', 'Crash', 'Block the entire system'], correct: 1,
      why: 'You do not own the global queues, so you cannot be allowed to stall them. Barriers need a queue you created.' },
    { d: 'medium', q: 'The safest way to guarantee group.leave() on every path is:', choices: ['Call it at the end of the closure', 'Use defer { group.leave() } right after the work starts', 'Call leave twice', 'Use group.wait()'], correct: 1,
      why: 'A missing leave on an error path means notify never fires; defer covers every exit including throws.' },
    { d: 'hard', q: 'Blocking a Swift concurrency cooperative thread with DispatchSemaphore.wait() can:', choices: ['Only slow things down', 'Deadlock the pool, because the runtime assumes those threads never block', 'Raise a compiler error', 'Increase priority'], correct: 1,
      why: 'The cooperative pool is sized to cores and assumes forward progress. Use withCheckedContinuation to bridge instead.' },
    { d: 'easy', q: 'Preferred way to react to a DispatchGroup completing:', choices: ['group.wait() on the main queue', 'group.notify(queue: .main)', 'A polling timer', 'group.wait() with a timeout on the main queue'], correct: 1,
      why: 'notify is non-blocking. wait on the main thread freezes the UI and risks a watchdog kill.' },
    { d: 'medium', q: 'asyncAfter guarantees the block runs:', choices: ['Exactly at the deadline', 'No earlier than the deadline', 'Within 1ms of the deadline', 'On the main thread'], correct: 1,
      why: 'Timer coalescing adds slack, more so at lower QoS. Use CADisplayLink or a media clock when precision matters.' },
    { d: 'hard', q: 'Debounce differs from throttle in that debounce:', choices: ['Runs the first call and ignores the rest in a window', 'Cancels pending work on each new call, running only after quiet', 'Runs every call on a background queue', 'Uses a semaphore'], correct: 1,
      why: 'Debounce waits for silence. Throttle runs at most once per window and drops the rest.' }
  ]
});

IPREP.addTopic({
  id: 'operations', domain: 'concurrency',
  title: 'Operation & OperationQueue',
  summary: 'Object-oriented concurrency: dependencies, cancellation, and when it beats GCD.',
  cards: [
    { d: 'easy', q: 'What does OperationQueue give you that a raw DispatchQueue does not?',
      a: "+ **Dependencies.** `b.addDependency(a)` expresses a graph the queue resolves\n+ **Cancellation.** `cancel()` and `cancelAllOperations()`, cooperative via `isCancelled`\n+ **A real concurrency cap** with `maxConcurrentOperationCount`, no semaphore boilerplate\n+ **Observable state.** `isReady`, `isExecuting`, `isFinished`, all KVO-observable\n+ **Reusable, testable units.** An `Operation` subclass is an object you can test alone\n\n=> It is built on GCD, so the cost is a thin layer of objects and KVO." },

    { d: 'medium', q: 'What is the difference between a synchronous and an asynchronous Operation?',
      a: "By default an `Operation` is **finished when `main()` returns**, which is fine for CPU work.\n\n! If `main()` kicks off async work, the operation reports finished immediately and dependents run **too early**\n\nFor async work you must:\n- Override `isAsynchronous` to return true\n- Manage `isExecuting` and `isFinished` yourself\n- Fire the KVO notifications manually\n\n=> Getting that state machine right is the classic `Operation` interview question." },

    { d: 'hard', q: 'Sketch a correct asynchronous Operation subclass.',
      a: "```\nclass AsyncOperation: Operation {\n    private var _executing = false, _finished = false\n    override var isAsynchronous: Bool { true }\n    override var isExecuting: Bool { _executing }\n    override var isFinished: Bool { _finished }\n\n    override func start() {\n        if isCancelled { finish(); return }\n        willChangeValue(forKey: \"isExecuting\")\n        _executing = true\n        didChangeValue(forKey: \"isExecuting\")\n        main()\n    }\n    func finish() {\n        willChangeValue(forKey: \"isExecuting\")\n        willChangeValue(forKey: \"isFinished\")\n        _executing = false; _finished = true\n        didChangeValue(forKey: \"isExecuting\")\n        didChangeValue(forKey: \"isFinished\")\n    }\n}\n```\n\n! You override `start()`, not just `main()`\n! Never call `super.start()`" },

    { d: 'medium', q: 'How does cancellation work, and what is the responsibility split?',
      a: "`cancel()` sets `isCancelled` to true. **That is all it does.**\n\n| State | Effect |\n|---|---|\n| Not started | The queue will not start it |\n| Already running | **Nothing.** The body must check and return |\n\n- A long loop should test `isCancelled` each iteration\n- An async operation must also cancel its underlying request **and then call `finish()`**\n\n! Otherwise the queue waits forever on an operation that will never complete." },

    { d: 'hard', q: 'What are the failure modes of operation dependencies?',
      a: "! **Cycles.** `a.addDependency(b)` plus `b.addDependency(a)` means neither becomes ready. Silent hang, no diagnostic\n! **Cross-queue dependencies are legal**, since the dependency is on the operation not the queue\n! **A cancelled dependency still counts as finished**, so dependents run anyway\n! Adding a dependency **after** the operation started is ignored\n\n=> The third is the subtle one: cancelling a prerequisite does **not** cancel the graph below it. Dependents must check for a result rather than assume success." },

    { d: 'medium', q: 'How do you pass data between dependent operations?',
      a: "+ Give the dependent a reference to the producer and read its result in `main()`. Simple, but couples them\n+ Or use an adapter operation whose only job is moving output to input\n! Do **not** use a shared mutable dictionary. That reintroduces the race the dependency was preventing\n\n=> Either way the read happens after the producer finished, which the dependency guarantees, so no extra synchronisation is needed for the hand-off." },

    { d: 'medium', q: 'When would you pick OperationQueue over Swift concurrency today?',
      a: "+ You must support an OS older than the async/await target\n+ An existing `Operation` subsystem where migration is not worth it\n+ You need **KVO-observable** progress and queue depth for a UI showing a work queue\n+ You need a dependency graph with **dynamic edges added at runtime**\n\n=> For new code, structured concurrency is the default: cancellation propagation, typed errors, and no manual state machine." },

    { d: 'hard', q: 'What is `qualityOfService` on an Operation versus on the queue?',
      a: "Both exist, and candidates routinely conflate QoS with `queuePriority`.\n\n| Property | Scope |\n|---|---|\n| `qualityOfService` | Scheduling against the **whole system** |\n| `queuePriority` | Ordering among **ready operations in the same queue** |\n\n- The operation's QoS is a floor; the queue's applies to operations that do not specify one\n- GCD may **promote** an operation's QoS if a higher-priority operation depends on it, so the effective priority is dynamic" },

    { d: 'medium', q: 'What does `waitUntilFinished` do and why avoid it?',
      a: "`queue.addOperations(_:waitUntilFinished: true)` **blocks the calling thread** until they complete.\n\n! On the main thread it freezes the UI\n! It undermines the entire point of a queue\n\nUse instead:\n- `operation.completionBlock`\n- A final operation depending on all the others\n- `queue.addBarrierBlock` (iOS 13+)\n\n=> Blocking is almost never the right coordination primitive on a client." },

    { d: 'hard', q: 'How would you build an image loader with OperationQueue?',
      a: "- One queue with `maxConcurrentOperationCount` around 4 to 6 for network, plus a decode queue\n- Each load is an async operation: fetch, then a **dependent** decode-and-downsample operation, then hand back on main\n\nKey details interviewers listen for:\n- **Cancel on cell reuse**, via a per-index-path operation map\n- Check `isCancelled` **before** the expensive decode\n- Cache the decoded image keyed by URL **plus target size**\n- Downsample with `CGImageSourceCreateThumbnailAtIndex`, so a full-resolution bitmap never exists" }
  ],
  quiz: [
    { d: 'medium', q: 'An Operation whose main() starts a network request finishes:', choices: ['When the request completes', 'As soon as main() returns, unless you implement isAsynchronous and manage state', 'Never', 'When the queue is cancelled'], correct: 1,
      why: 'The default operation is synchronous. Dependents run too early unless you implement the async state machine.' },
    { d: 'medium', q: 'operation.cancel() on a running operation:', choices: ['Stops it immediately', 'Sets isCancelled; the body must check and return early', 'Throws CancellationError', 'Removes it from the queue and frees it'], correct: 1,
      why: 'Cancellation is cooperative. An async operation must also cancel its request and call finish(), or the queue waits forever.' },
    { d: 'hard', q: 'You cancel operation A. Operation B depends on A. B will:', choices: ['Also be cancelled', 'Run anyway, because a cancelled dependency counts as finished', 'Hang forever', 'Be removed from the queue'], correct: 1,
      why: 'Cancellation does not propagate down the graph. B must check whether A actually produced a result.' },
    { d: 'medium', q: 'queuePriority differs from qualityOfService in that queuePriority:', choices: ['Affects scheduling against the whole system', 'Orders ready operations within the same queue', 'Sets thread count', 'Controls cancellation'], correct: 1,
      why: 'QoS is a system-wide scheduling hint; queuePriority is intra-queue ordering. They are routinely conflated.' },
    { d: 'hard', q: 'Two operations added as dependencies of each other result in:', choices: ['A runtime exception', 'A silent hang, since neither becomes ready', 'One being dropped', 'A compiler error'], correct: 1,
      why: 'There is no cycle detection. Both stay not-ready forever with no diagnostic, which makes it painful to debug.' },
    { d: 'easy', q: 'For a new codebase targeting current iOS, the default concurrency choice is:', choices: ['OperationQueue', 'Structured concurrency with async/await and task groups', 'NSThread', 'Raw pthreads'], correct: 1,
      why: 'It gives cancellation propagation, typed errors and compile-time isolation checking with no manual state machine.' }
  ]
});

IPREP.addTopic({
  id: 'swiftconcurrency', domain: 'concurrency',
  title: 'Swift Concurrency: async/await, Actors & Sendable',
  summary: 'Structured concurrency, actor isolation, the cooperative pool, and migration from GCD.',
  cards: [
    { d: 'easy', q: 'What does `await` actually do?',
      a: "It marks a **suspension point**. The function may suspend there, giving up its thread, and resume later, possibly on a **different** thread.\n\n! It is not a block, and not a thread hop by itself.\n\nTwo consequences:\n- State can change across an `await`, so re-check assumptions afterwards\n- You **cannot hold a lock** across one\n\n=> The visible `await` markers are exactly the points where interleaving is possible, which is why they are required syntax." },

    { d: 'medium', q: 'What is structured concurrency and what does it buy you?',
      a: "Child tasks have a lifetime **bounded by their parent scope**, and the compiler enforces it.\n\n+ **Cancellation propagates** from parent to children\n+ **Errors propagate** out of the scope\n+ No orphaned tasks\n\n| | `async let` / `withTaskGroup` | `Task { }` |\n|---|---|---|\n| Structured | Yes | **No** |\n| Gets the above free | Yes | **No** |\n\n=> `Task { }` is the unstructured escape hatch and must manage its own cancellation and lifetime." },

    { d: 'medium', q: 'Explain the cooperative thread pool.',
      a: "Swift concurrency runs on a pool sized to the **number of cores**, not the number of tasks. Tasks are expected to **suspend rather than block**.\n\n! The hard rule: **never block a cooperative thread**\n! No `semaphore.wait()`, no `DispatchQueue.sync`, no synchronous file or network I/O\n\n- Blocking one thread removes a whole core from the pool\n- Blocking a few can deadlock the app\n\n=> This is the single most important operational fact about Swift concurrency." },

    { d: 'hard', q: 'What is an actor and what exactly does it guarantee?',
      a: "A reference type whose mutable state is **isolated**: all access goes through its serial executor, so there is never concurrent access to its stored properties.\n\n+ The compiler enforces it, requiring `await` for cross-actor access\n! It does **not** guarantee atomicity across suspension points\n\n=> An actor method that awaits mid-way can be interleaved with another call, so an invariant holding before the `await` may not hold after. That is **reentrancy**, and it is the main actor pitfall." },

    { d: 'hard', q: 'Explain actor reentrancy with a concrete bug.',
      a: "```\nactor ImageCache {\n    var cache: [URL: Image] = [:]\n    func image(for url: URL) async -> Image {\n        if let c = cache[url] { return c }\n        let img = await download(url)   // suspension\n        cache[url] = img\n        return img\n    }\n}\n```\n\n1. Two callers ask for the same URL\n2. Both miss the cache\n3. Both suspend at the download\n4. **You download twice**\n\n=> The actor prevented a data race, not duplicated work. Fix by storing the in-flight `Task` in the dictionary **before** awaiting, so the second caller awaits the same task.\n\n```bad  both callers miss, both suspend, both download\nactor ImageCache {\n    private var cache: [URL: Image] = [:]\n    func image(for url: URL) async throws -> Image {\n        if let c = cache[url] { return c }\n        let img = try await download(url)      // suspension: another call runs\n        cache[url] = img\n        return img\n    }\n}\n```\n\n```good  publish the in-flight task before awaiting\nactor ImageCache {\n    private enum Entry { case ready(Image), loading(Task<Image, Error>) }\n    private var cache: [URL: Entry] = [:]\n\n    func image(for url: URL) async throws -> Image {\n        switch cache[url] {\n        case .ready(let img):   return img\n        case .loading(let t):   return try await t.value   // join it\n        case nil:               break\n        }\n        let task = Task { try await self.download(url) }\n        cache[url] = .loading(task)            // published BEFORE the await\n        do {\n            let img = try await task.value\n            cache[url] = .ready(img)\n            return img\n        } catch {\n            cache[url] = nil                   // let the next caller retry\n            throw error\n        }\n    }\n}\n```" },

    { d: 'medium', q: 'What is `@MainActor` and how does it replace `DispatchQueue.main.async`?',
      a: "A global actor whose executor is the main queue. Annotating a type, function or property guarantees at **compile time** that it is only touched on the main thread.\n\n| | `DispatchQueue.main.async` | `@MainActor` |\n|---|---|---|\n| Enforced | At runtime, by a checker | **At compile time** |\n| You must remember | Every call site | Nothing |\n\n=> Annotate at the type level for view models and UI code." },

    { d: 'hard', q: 'What is `Sendable` and why does it exist?',
      a: "It marks a type as **safe to pass across concurrency domains**, and it is the mechanism that lets the compiler prove there are no data races.\n\n| Type | Sendable? |\n|---|---|\n| Value type of Sendable members | Implicitly yes |\n| Final class with only `let` properties | Declare it |\n| Mutable class | No, unless `@unchecked` with your own synchronisation |\n\n! In Swift 6 language mode, violations are **errors**. Under Swift 5 they are warnings you should be fixing now." },

    { d: 'medium', q: 'How do you wrap a callback-based API in async/await?',
      a: "```\nfunc load(_ url: URL) async throws -> Data {\n    try await withCheckedThrowingContinuation { c in\n        legacyLoad(url) { data, error in\n            if let error { c.resume(throwing: error) }\n            else { c.resume(returning: data!) }\n        }\n    }\n}\n```\n\n! `resume` must be called **exactly once**\n! Zero times leaks the task forever\n! Twice traps\n\n=> Use the `checked` variant in development; it detects both. Consider `withUnsafeContinuation` only after profiling." },

    { d: 'hard', q: 'How does Task cancellation work?',
      a: "**Cooperative**, like `Operation`. `task.cancel()` sets a flag and propagates to children.\n\nYour code must respond:\n- Check `Task.isCancelled`\n- Or call `try Task.checkCancellation()`, which throws `CancellationError`\n\n| Cooperates for you | Does not |\n|---|---|\n| `Task.sleep` | A tight CPU loop |\n| `URLSession` async methods | Your own loops |\n\n! A cancelled task still runs to completion unless you check. Cancellation without checks is a no-op." },

    { d: 'medium', q: 'When do you use a task group versus `async let`?',
      a: "| | `async let` | `withTaskGroup` |\n|---|---|---|\n| Count | **Fixed**, known at compile time | **Dynamic** |\n| Results | Named values | As they complete |\n| Bound concurrency | No | **Yes**, by adding incrementally |\n\n=> Groups are the structured-concurrency answer to thread explosion: add N tasks, then add one more each time a result arrives." },

    { d: 'hard', q: 'How would you migrate a GCD codebase to Swift concurrency incrementally?',
      a: "**Bottom-up, boundary first.** The order matters.\n\n1. Wrap leaf callback APIs with `withCheckedContinuation` so they present an async face\n2. Mark view models and UI types `@MainActor`, removing most `DispatchQueue.main.async`\n3. Convert serial-queue-guarded classes into `actor`s, one at a time\n4. Raise strict concurrency checking: `minimal`, then `targeted`, then `complete`\n5. Replace groups and semaphore-limited loops with task groups\n\n! Converting the **top** first leaves you awaiting into blocking code, which is exactly the cooperative-pool hazard." }
  ],
  quiz: [
    { d: 'medium', q: 'After an `await`, the code resumes:', choices: ['On the same thread, guaranteed', 'Possibly on a different thread, and state may have changed', 'On the main thread', 'On a new thread every time'], correct: 1,
      why: 'That is why you cannot hold a lock across an await and must re-check assumptions afterwards.' },
    { d: 'hard', q: 'Calling DispatchSemaphore.wait() inside an async function is dangerous because:', choices: ['It is slower than await', 'It blocks a cooperative pool thread sized to core count, risking pool deadlock', 'Semaphores are deprecated', 'It cancels the task'], correct: 1,
      why: 'The pool assumes tasks suspend rather than block. Blocking removes a core; blocking several can deadlock the app.' },
    { d: 'hard', q: 'Actor reentrancy means:', choices: ['Two threads can access actor state at once', 'Another call can interleave at a suspension point, so invariants may not hold across an await', 'Actors cannot call themselves', 'Actor methods are always synchronous'], correct: 1,
      why: 'Isolation prevents data races, not logical races. Cache the in-flight Task to deduplicate concurrent work.' },
    { d: 'medium', q: '@MainActor on a view model gives you:', choices: ['Faster UI updates', 'Compile-time guarantee it is only touched on the main thread', 'Automatic retain cycle avoidance', 'Background execution'], correct: 1,
      why: 'It moves the main-thread rule from a runtime checker to the type system.' },
    { d: 'medium', q: 'A continuation must be resumed:', choices: ['At least once', 'At most once', 'Exactly once', 'Never, it resumes itself'], correct: 2,
      why: 'Zero resumes leaks the task forever; two traps. The checked variants detect both during development.' },
    { d: 'hard', q: 'Task.cancel() on a task running a tight CPU loop with no checks:', choices: ['Stops it immediately', 'Has no effect; the loop runs to completion', 'Throws CancellationError at the loop', 'Suspends the task'], correct: 1,
      why: 'Cancellation is cooperative. Check Task.isCancelled or call try Task.checkCancellation() at loop boundaries.' },
    { d: 'medium', q: 'A dynamic number of parallel operations is best expressed with:', choices: ['async let in a loop', 'withTaskGroup', 'DispatchSemaphore', 'Task.detached per item'], correct: 1,
      why: 'async let requires a fixed compile-time set. Groups also let you bound concurrency by adding tasks incrementally.' }
  ]
});
