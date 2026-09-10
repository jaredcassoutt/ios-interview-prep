/* Language Fundamentals — 6 topics */

IPREP.addTopic({
  id: 'arc', domain: 'language',
  title: 'ARC, Retain Cycles & weak/unowned',
  summary: 'How Swift and Objective-C manage object lifetime, where cycles come from, and how to break them.',
  cards: [
    { d: 'easy', q: 'What does ARC actually do, and when does it do it?',
      a: "ARC is **compile-time**, not runtime garbage collection. The compiler inserts `retain`, `release` and `autorelease` where it can prove ownership changes.\n\n- No tracing collector, no GC thread\n- Deallocation is **deterministic**: the instant the count hits zero, `deinit` runs\n- The cost is spread through your code as retain/release traffic\n\n=> That last point is why ARC shows up in a Time Profiler trace at all." },

    { d: 'easy', q: 'What is a retain cycle, and why does ARC not catch it?',
      a: "Two or more objects holding **strong** references to each other, so neither count ever reaches zero.\n\n! ARC only **counts** references. It never walks the object graph looking for unreachable islands\n! A tracing collector would find the island. ARC has nothing that traverses\n\n=> So a cycle simply leaks. Breaking it requires a human decision about which edge is not ownership." },

    { d: 'medium', q: 'Difference between `weak` and `unowned`?',
      a: "| | `weak` | `unowned` |\n|---|---|---|\n| Type | Optional | Non-optional |\n| On dealloc | **Zeroed to nil** | Left dangling |\n| Access after death | Safe, becomes nil | **Traps** |\n| Cost | Side table bookkeeping | Cheaper |\n\n=> Use `weak` when the other object can legitimately die first. Use `unowned` only when you can guarantee the target outlives the referrer, such as a child that cannot outlive its parent." },

    { d: 'medium', q: 'How does a zeroing weak reference actually work under the hood?',
      a: "Every object ever weakly referenced gets an entry in a global **side table**, holding the strong count, the weak count, and the list of weak slots.\n\n- When the strong count hits zero, the runtime walks that entry and nils every registered slot before deallocating\n\n! That extra indirection and locking is why `weak` reads are measurably more expensive than strong or `unowned` reads.\n\n=> Do not put a `weak` read in a tight loop." },

    { d: 'medium', alias: 'Name the three classic retain cycle shapes in iOS code.', q: 'Where do retain cycles usually come from in an iOS app?',
      a: "1. **Closure captures self**, and self holds the closure. A stored completion handler, a Combine sink, a `Timer` block\n2. **Parent and child both strong.** A controller holds a view model that holds a strong back reference\n3. **Delegate declared strong.** Delegates should almost always be `weak var delegate: FooDelegate?`\n\n=> A fourth, sneakier one: `NotificationCenter` block observers, which retain the block until you remove the token.\n\n```bad  three separate leaks\nfinal class FeedViewController: UIViewController {\n    var onRefresh: (() -> Void)?\n    private var timer: Timer?\n\n    override func viewDidLoad() {\n        super.viewDidLoad()\n        onRefresh = { self.reload() }             // 1: self holds it\n        timer = Timer.scheduledTimer(withTimeInterval: 30,\n                                 repeats: true) { _ in\n            self.reload()                       // 2: run loop holds it\n        }\n        NotificationCenter.default.addObserver(\n            forName: .didLogin, object: nil, queue: .main\n        ) { _ in self.reload() }                  // 3: centre holds it\n    }\n}\n```\n\n```good\nprivate var observer: NSObjectProtocol?\n\nonRefresh = { [weak self] in self?.reload() }\ntimer = Timer.scheduledTimer(withTimeInterval: 30,\n                             repeats: true) { [weak self] _ in\n    self?.reload()\n}\nobserver = NotificationCenter.default.addObserver(\n    forName: .didLogin, object: nil, queue: .main\n) { [weak self] _ in self?.reload() }\n\ndeinit {\n    timer?.invalidate()            // weak self alone does NOT stop it\n    if let observer { NotificationCenter.default.removeObserver(observer) }\n}\n```" },

    { d: 'medium', q: 'Why must a `weak` delegate property be declared on a class-bound protocol?',
      a: "`weak` only applies to **reference types**. A bare `protocol FooDelegate` could be adopted by a struct, so the compiler refuses.\n\n```\nprotocol FooDelegate: AnyObject { }\nweak var delegate: FooDelegate?\n```\n\n+ Constrains conformance to classes\n+ Lets the compiler use a faster class-existential representation" },

    { d: 'hard', q: 'Does `[weak self]` alone always prevent a cycle? When is it not enough?',
      a: "**No.** It breaks the closure-to-self edge, not a cycle running through another object.\n\n! Self holds a `Task` holding a closure that strongly captures a coordinator that holds self: still a leak\n! A repeating `Timer` you never invalidate is retained by the **run loop**, so the closure lives forever regardless of how it captures self\n\n=> Lifetime is a graph question, not a keyword question." },

    { d: 'hard', q: 'When is `[unowned self]` the right call over `[weak self]`?',
      a: "When the closure **cannot** outlive self and the optional unwrap is noise: a closure executed synchronously and not stored, or one whose only owner is self and is torn down in `deinit`.\n\n| Choice | Failure mode |\n|---|---|\n| `weak` | Silent no-op |\n| `unowned` | **Crash** |\n\n=> Most teams standardise on `weak` because a silent no-op beats a crash. Reach for `unowned` when you actively want a crash to tell you the lifetime assumption broke." },

    { d: 'hard', q: 'What is `autoreleasepool` and when do you still need it in Swift?',
      a: "A pool holding objects returned `+0` (autoreleased), drained when the pool exits. UIKit wraps each run loop turn in one, so normally you never think about it.\n\n! You need an explicit `autoreleasepool { }` when a **tight loop creates many temporary Objective-C-backed objects**, because the run loop never gets a chance to turn.\n\n=> Classic case: looping over thousands of files building `UIImage` or `NSData`. Peak memory spikes until you wrap the body." },

    { d: 'hard', q: 'Object is deallocated but you still see the memory held. What are you looking for?',
      a: "Distinguish the two failure modes first.\n\n| | Leak | Abandoned |\n|---|---|---|\n| References remain | No | **Yes** |\n| Cause | A cycle | Growing cache, unpopped controllers, unremoved observers |\n| Tool | Leaks, Memory Graph | Allocations with generation marks |\n\n=> Memory Graph Debugger plus `malloc` stack logging tells you exactly who holds the reference." },

    { d: 'medium', alias: 'What is the ownership rule for `deinit`?', q: 'When does `deinit` run, and on which thread?',
      a: "`deinit` runs when the strong count reaches zero, before memory is freed, **on whatever thread released the last reference**.\n\n! An object released on a background queue runs its `deinit` there, so any UIKit teardown inside is a threading bug\n! It cannot be called directly\n! It cannot be `async`\n\n- The superclass `deinit` runs automatically after the subclass one" }
  ],
  quiz: [
    { d: 'easy', q: 'ARC is best described as:', choices: ['A tracing garbage collector that runs periodically', 'Compile-time insertion of retain/release calls', 'A runtime that scans for unreachable objects', 'Manual memory management with helper macros'], correct: 1,
      why: 'The compiler statically inserts the memory management calls. There is no tracing collector, so deallocation is deterministic.' },
    { d: 'medium', q: 'Which declaration is correct for a delegate that must not create a retain cycle?', choices: ['var delegate: FooDelegate?', 'weak var delegate: FooDelegate?  where protocol FooDelegate {}', 'weak var delegate: FooDelegate?  where protocol FooDelegate: AnyObject {}', 'unowned var delegate: FooDelegate!'], correct: 2,
      why: 'weak requires a reference type, so the protocol must be class-bound with AnyObject. Without that constraint the code will not compile.' },
    { d: 'medium', q: 'A repeating Timer created with the block API and `[weak self]` still keeps the view controller alive. Why?', choices: ['weak self does not work inside Timer blocks', 'The run loop retains the timer, and you never invalidated it, so the block and its captures live on', 'Timers always use unowned capture internally', 'The block is copied to the heap, which makes captures strong'], correct: 1,
      why: 'weak self stops the timer from retaining the controller, but the run loop retains the timer forever until you call invalidate(). The controller may deallocate, but the timer keeps firing and the resource leaks.' },
    { d: 'hard', q: 'You want a crash rather than a silent no-op if a lifetime assumption is violated. Which capture do you use?', choices: ['weak', 'unowned', 'strong', 'autoreleasing'], correct: 1,
      why: 'unowned traps on access after deallocation, which surfaces the broken assumption immediately. weak silently becomes nil and the closure body is skipped.' },
    { d: 'hard', q: 'When does an explicit autoreleasepool still earn its keep in Swift?', choices: ['Any time you use closures', 'In a tight loop creating many temporary Objective-C-backed objects', 'When implementing deinit', 'Only in Objective-C code'], correct: 1,
      why: 'The run loop drains the pool once per turn. A long synchronous loop never gives it a chance, so temporaries accumulate and peak memory spikes.' },
    { d: 'medium', q: 'On which thread does deinit run?', choices: ['Always the main thread', 'Always a background thread', 'Whichever thread released the last strong reference', 'The thread the object was created on'], correct: 2,
      why: 'deinit runs synchronously wherever the final release happened. Touching UIKit there is a threading bug.' }
  ]
});

IPREP.addTopic({
  id: 'valueref', domain: 'language',
  title: 'Value vs Reference Types & Copy-on-Write',
  summary: 'Structs vs classes, semantics, performance, and how Swift collections avoid copying.',
  cards: [
    { d: 'easy', q: 'What is the core semantic difference between a struct and a class?',
      a: "| | Struct | Class |\n|---|---|---|\n| Assignment gives you | An independent copy | The same instance |\n| Identity (`===`) | None | Yes |\n| Inheritance | No | Yes |\n| `deinit` | No | Yes |\n| Reference counting | No | Yes |\n| Memberwise init | Free | No |\n\n=> Everything else follows from the first row. A struct means nobody else can observe your mutations." },

    { d: 'medium', alias: 'Where do struct and class instances actually live?', q: 'What is the difference between the stack and the heap, and where do structs and classes live?',
      a: "'Stack vs heap' is an oversimplification. **A struct is stored inline in whatever contains it.**\n\n| Struct location | Lives |\n|---|---|\n| Local variable | Stack |\n| Property of a class | Inside that class instance, on the heap |\n| Element of an array | In the array's heap buffer |\n\nA class instance is always a heap allocation with a header holding type and counts.\n\n=> The consequence that matters: struct storage costs **no separate allocation and no retain/release traffic**." },

    { d: 'medium', q: 'Explain copy-on-write and why Swift collections need it.',
      a: "`Array`, `Dictionary`, `Set` and `String` are structs wrapping a heap buffer.\n\n1. Copying the struct copies only the **reference**. Cheap\n2. Before any **mutation**, the type checks `isKnownUniquelyReferenced`\n3. If more than one owner exists, it deep-copies first, then mutates\n\n=> You get value semantics at the cost of reference passing, and you pay for a copy only when a shared value is actually written to." },

    { d: 'hard', q: 'How do you implement copy-on-write in your own type?',
      a: "```\nfinal class Box { var data: [Int]; init(_ d: [Int]) { data = d } }\nstruct Buffer {\n    private var box: Box\n    mutating func append(_ x: Int) {\n        if !isKnownUniquelyReferenced(&box) { box = Box(box.data) }\n        box.data.append(x)\n    }\n}\n```\n\n! `isKnownUniquelyReferenced` requires an `inout` reference to a **class** variable\n! It always returns false for Objective-C classes, so the box must be a native Swift final class\n! Check on mutation only, never on read\n\n```bad  the box is not a native final class, so it copies every write\nstruct Buffer {\n    private var box: NSMutableArray            // Objective-C class\n    mutating func append(_ x: Int) {\n        if !isKnownUniquelyReferenced(&box) { }  // always false\n    }\n}\n```\n\n```good\nstruct Buffer {\n    private final class Box {\n        var data: [Int]\n        init(_ d: [Int]) { data = d }\n    }\n    private var box: Box\n\n    mutating func append(_ x: Int) {\n        if !isKnownUniquelyReferenced(&box) { box = Box(box.data) }\n        box.data.append(x)\n    }\n    subscript(i: Int) -> Int { box.data[i] }   // no check on read\n}\n```" },

    { d: 'medium', q: 'What is the classic performance trap when passing large structs around?',
      a: "A large struct is copied by value at every boundary unless the optimiser proves otherwise. Twenty stored properties through five calls is five copies.\n\nFixes, in order of preference:\n1. Pass `borrowing` or `inout` where that is the real intent\n2. Shrink the struct\n3. Wrap the heavy part in a COW box\n\n=> In practice the compiler is good at this for non-escaping calls, so **measure before you contort the design**." },

    { d: 'medium', q: 'When should you choose a class over a struct?',
      a: "+ You need **identity**: two things with equal values are still different, like a session or a view controller\n+ You need **shared mutable state** many owners must observe\n+ You need inheritance, or Objective-C and UIKit interop\n+ You need `deinit` for resource cleanup\n\n=> Apple's guidance: struct by default, class when one of the above applies. Note that 'cheaper copies' is **not** on the list, because COW already handles that." },

    { d: 'hard', q: 'What are the thread-safety implications of value vs reference types?',
      a: "Value types are not magically thread-safe, but they make safety **achievable**: if each thread has its own copy, there is no shared mutable state.\n\n! The danger is a value type in a **shared location**. Two threads mutating the same `var array` property is a data race\n! Worse than a torn read, it can corrupt the COW buffer itself and crash\n\n=> Reference types share by definition, so every mutable property needs a queue, a lock, or an actor." },

    { d: 'medium', q: 'What does `mutating` actually mean on a struct method?',
      a: "It tells the compiler the method may write to `self`, so `self` is passed **`inout`** rather than borrowed.\n\nConsequences:\n! You cannot call it on a `let` value\n! You cannot call it through a protocol existential unless the variable is a `var`\n! You cannot capture `self` in an escaping closure inside it\n+ You may reassign `self` entirely" },

    { d: 'hard', q: 'What is the difference between `==` and `===`?',
      a: "| | `==` | `===` |\n|---|---|---|\n| Compares | **Values** | **Identity** |\n| Comes from | `Equatable`, you define it | Built in |\n| Applies to | Anything | Class instances only |\n\n=> Two traps: structs are never identical because they have no identity, and a class can legitimately be `Equatable` with `==` returning true for two distinct instances. That is exactly what you want for a model type." },

    { d: 'medium', q: 'Why is `String` a struct, and what does that cost?',
      a: "It is a COW struct over a UTF-8 buffer, so it gets value semantics without copying on every pass.\n\n! It is **not** a random-access collection, because a `Character` is an extended grapheme cluster of variable width\n! Indexing is O(n) and requires `String.Index`, not `Int`\n\n=> When you need integer indexing and fixed-width elements, drop to `Array(string.utf8)` or `utf16`." },

    { d: 'hard', q: 'What is a struct that contains a class reference, and why is it dangerous?',
      a: "A value type with a reference inside. Copying the struct copies the **pointer**, not the object.\n\n! You get **shallow** value semantics: two copies look independent but share the inner object\n! Mutating through one is visible through the other\n\n=> The single most common accidental aliasing bug in otherwise value-oriented code. Either make the inner type a value type, implement COW deliberately, or document that the type is a reference wrapper." }
  ],
  quiz: [
    { d: 'easy', q: 'Copying a Swift Array of 10,000 elements is:', choices: ['O(n), the buffer is deep-copied immediately', 'O(1) until one of the copies is mutated', 'O(log n)', 'O(1) always, mutation is shared'], correct: 1,
      why: 'Copy-on-write: the copy shares the buffer, and the deep copy happens lazily at the first mutation of a non-uniquely-referenced buffer.' },
    { d: 'medium', q: 'A struct stored as a property of a class instance lives:', choices: ['On the stack', 'On the heap, inline inside the class instance', 'In a separate heap allocation of its own', 'In static storage'], correct: 1,
      why: 'Value types are stored inline in their container. The container here is a heap-allocated class instance, so the struct is on the heap with no separate allocation.' },
    { d: 'hard', q: 'isKnownUniquelyReferenced returns false unexpectedly for your box type. Most likely cause?', choices: ['The box is a struct', 'The box is an Objective-C class or is not final', 'You passed it by value instead of inout', 'The array was empty'], correct: 1,
      why: 'It requires an inout reference to a native Swift class variable and always returns false for Objective-C classes, so the check silently degrades into copying every time.' },
    { d: 'medium', q: 'Two threads append to the same `var items: [Int]` property with no synchronisation. Worst realistic outcome?', choices: ['One append is lost', 'Nothing, arrays are thread-safe', 'Heap corruption or a crash from a torn COW buffer', 'A compiler error'], correct: 2,
      why: 'Concurrent mutation of a COW buffer can corrupt the buffer state itself, not merely lose an element. This is undefined behaviour, not a benign lost update.' },
    { d: 'medium', q: 'Which is NOT a reason to pick a class over a struct?', choices: ['You need reference identity', 'You need inheritance', 'You want cheaper copies of a large payload', 'You need deinit for cleanup'], correct: 2,
      why: 'Cheap copies of a large payload are what copy-on-write gives you inside a struct. Reaching for a class purely for copy cost is usually the wrong trade.' },
    { d: 'hard', q: 'A struct holds a reference to a class. You copy the struct and mutate the inner object through the copy. The original:', choices: ['Is unaffected, value semantics guarantee isolation', 'Sees the change, because only the pointer was copied', 'Triggers a copy-on-write deep copy automatically', 'Fails to compile'], correct: 1,
      why: 'Value semantics are shallow. The struct copy duplicates the reference, so both structs point at one shared object.' }
  ]
});

IPREP.addTopic({
  id: 'protocols', domain: 'language',
  title: 'Protocols, POP & Existentials',
  summary: 'Protocol design, witness tables, `some` vs `any`, and where protocol-oriented programming pays off.',
  cards: [
    { d: 'easy', q: 'What problem does protocol-oriented programming solve that class inheritance does not?',
      a: "| | Inheritance | Protocols |\n|---|---|---|\n| How many | One superclass | Many, composable |\n| Works on | Classes only | Structs and enums too |\n| Storage | Inherited whether you want it or not | None imposed |\n| Substitution in tests | Hard | Easy |\n\n=> The practical win is testability: you can substitute a fake conformance where you could never substitute a superclass." },

    { d: 'medium', alias: 'Difference between a protocol requirement and a protocol extension method?', q: 'What is the difference between declaring a method in a protocol and only in its extension?',
      a: "**This is the single most-asked POP gotcha.**\n\n| Declared in | Dispatch | Concrete type's version wins? |\n|---|---|---|\n| Protocol **body** (a requirement) | Witness table, dynamic | **Yes** |\n| Extension **only** | Static, on the compile-time type | **No** |\n\n=> Calling an extension-only method through `any P` runs the extension version even if the concrete type shadows it. If you want polymorphism, the method must be a declared requirement.\n\n```bad  greet() is extension-only, so the concrete override is ignored\nprotocol Greeter { }\nextension Greeter { func greet() -> String { \"hello\" } }\n\nstruct Loud: Greeter { func greet() -> String { \"HELLO\" } }\n\nlet g: any Greeter = Loud()\ng.greet()        // \"hello\"  <- static dispatch on the protocol\n```\n\n```good  declare it as a requirement to get dynamic dispatch\nprotocol Greeter { func greet() -> String }\nextension Greeter { func greet() -> String { \"hello\" } }  // default\n\nlet g: any Greeter = Loud()\ng.greet()        // \"HELLO\"\n```" },

    { d: 'medium', q: 'What is a witness table?',
      a: "The compiler-generated list of function pointers implementing a protocol's requirements **for a given concrete type**. The protocol analogue of a class vtable.\n\n- Calling a requirement on an existential looks up the implementation there\n- Static and generic dispatch can skip it entirely by specialising the call\n\n=> Which is why generics can be as fast as concrete code, and `any P` cannot." },

    { d: 'hard', q: 'What is an existential container and why does `any P` cost something?',
      a: "`any P` is boxed: **three words of inline buffer**, plus type metadata, plus witness table pointers.\n\n! If the value fits in three words it is stored inline\n! Otherwise it is **heap-boxed** and the container holds a pointer\n\nCosts:\n! A possible allocation\n! Loss of static type information, so calls go through the witness table\n! No specialisation, no inlining\n\n=> `some P` has none of these, because the concrete type is known at compile time." },

    { d: 'medium', alias: '`some P` versus `any P` in one sentence each.', q: 'What is the difference between `some` and `any`?',
      a: "| | `some P` | `any P` |\n|---|---|---|\n| Is | One specific concrete type, hidden from the caller | Any conforming type, possibly different per value |\n| Resolved | Compile time | Runtime |\n| Boxing | None | Yes |\n| Heterogeneous collection | Impossible | **This is its purpose** |\n\n=> Rule of thumb: reach for `some` by default, use `any` only when you genuinely need heterogeneity, such as `[any Drawable]`." },

    { d: 'hard', q: 'Why could you not put a protocol with an associated type in an array before Swift 5.7?',
      a: "A protocol with an `associatedtype` or a `Self` requirement was **not a valid type**, only a constraint, because the compiler could not give the existential a concrete layout.\n\n+ Swift 5.7 added constrained existentials, so `any Collection<Int>` is now legal\n! `any Equatable` still does not work usefully, because `==` takes two `Self` values and the compiler cannot prove two boxes hold the same type\n\n=> Self-in-parameter-position is the remaining restriction." },

    { d: 'medium', q: 'How do you give a protocol a default implementation, and what is the risk?',
      a: "Put it in an extension:\n\n```\nextension Greeter { func greet() { print(\"hi\") } }\n```\n\n! The risk is **silent behaviour divergence**. If `greet()` is not also declared as a requirement, a conforming type that defines its own still gets the extension version through `any Greeter`\n\n=> Declare every method you intend to be overridable in the protocol body." },

    { d: 'medium', q: 'How do protocols make code testable in practice?',
      a: "Define the dependency as a **narrow** protocol, inject it, substitute a fake:\n\n```\nprotocol HTTPClient { func get(_ url: URL) async throws -> Data }\nfinal class ProfileService {\n    init(client: HTTPClient) { self.client = client }\n}\n```\n\n=> Keep the protocol as small as the **consumer** needs, not as wide as the implementation. A four-method protocol you fully control beats mocking `URLSession`." },

    { d: 'hard', q: 'What is a protocol composition, and when do you use it?',
      a: "```\nfunc render(_ x: some Drawable & Identifiable)\ntypealias Renderable = Drawable & Identifiable\n```\n\n+ States exactly the capabilities a function needs, at the call site\n+ Keeps protocols small, avoiding the fat-interface problem\n+ No need to invent a new protocol for the combination\n\n=> Use the typealias form when the combination recurs." },

    { d: 'medium', q: 'What does `@objc` on a protocol change?',
      a: "It makes the protocol visible to the Objective-C runtime.\n\n+ `optional` requirements\n+ Runtime checks with `respondsToSelector:`\n+ Usable as a delegate for UIKit classes that call it dynamically\n! Class-only conformance\n! Only Objective-C-representable types\n! Dispatch through `objc_msgSend` instead of a witness table" },

    { d: 'hard', alias: 'Design question: when is POP the wrong tool?', q: 'When is protocol-oriented programming the wrong choice?',
      a: "! A protocol with **one conformer**\n! A protocol whose only purpose is mocking a type you own\n! A hierarchy of protocols with default implementations calling each other\n! `any P` in a hot path where boxing shows in a profile\n\n=> That third one reproduces the fragile base class problem with worse tooling, because you cannot see the override chain. Concrete types and plain functions are still the default." }
  ],
  quiz: [
    { d: 'medium', q: 'A method exists only in a protocol extension, not as a requirement. You call it on `any P` holding a type that redefines it. Which runs?', choices: ['The concrete type version', 'The extension version', 'Whichever is defined last', 'A compile error'], correct: 1,
      why: 'Extension-only methods use static dispatch on the compile-time type, which is the protocol. To get dynamic dispatch, declare the method as a protocol requirement.' },
    { d: 'medium', q: '`some P` as a return type means:', choices: ['Any type conforming to P, varying per call', 'One specific concrete type, hidden from the caller but fixed at compile time', 'A boxed existential', 'A generic parameter chosen by the caller'], correct: 1,
      why: 'Opaque types preserve the concrete type for the compiler while hiding it from the caller, so there is no boxing and full specialisation is possible.' },
    { d: 'hard', q: 'What does an existential container hold?', choices: ['Only a pointer to the object', 'A 3-word inline buffer, type metadata, and witness table pointers', 'A copy of the protocol definition', 'A vtable inherited from NSObject'], correct: 1,
      why: 'Values larger than the inline buffer are heap-boxed, which is the hidden allocation cost of `any P`.' },
    { d: 'medium', q: 'Which capability does @objc add to a Swift protocol?', choices: ['Associated types', 'Optional requirements', 'Value type conformance', 'Generic constraints'], correct: 1,
      why: 'optional requirements come from the Objective-C runtime. The trade is class-only conformance and objc_msgSend dispatch.' },
    { d: 'hard', q: 'Why can you still not usefully form `any Equatable`?', choices: ['Equatable is a class-only protocol', '`==` takes two Self values and the compiler cannot prove two boxes share a type', 'Equatable has an associated type', 'It is allowed since Swift 5.7'], correct: 1,
      why: 'Self requirements in argument position are the remaining restriction. Constrained existentials fixed associated types, not Self-in-parameters.' }
  ]
});

IPREP.addTopic({
  id: 'generics', domain: 'language',
  title: 'Generics & Associated Types',
  summary: 'Type parameters, constraints, specialisation, and how generics differ from existentials at runtime.',
  cards: [
    { d: 'easy', q: 'What do generics buy you over `Any` or a protocol existential?',
      a: "**Type relationships the compiler can check.**\n\n```\nfunc first<T>(_ a: [T]) -> T?      // return type matches element type\nfunc first(_ a: [Any]) -> Any?     // caller must downcast, may crash\n```\n\n+ A compile-time guarantee instead of a runtime crash\n+ The compiler can **specialise** the function per concrete type and inline it\n\n=> Generics are both safer and faster than the `Any` version." },

    { d: 'medium', q: 'What is generic specialisation?',
      a: "The optimiser generates a **dedicated copy** of a generic function for each concrete type, replacing the generic calling convention and witness table lookups with direct, inlinable calls.\n\n! Without it, generics pass type metadata and witness tables at runtime\n! Specialisation happens within a module by default\n! Across module boundaries you need `@inlinable` or whole-module optimisation\n\n=> Which is why a generic in a framework can be slower than the same code in your app target." },

    { d: 'medium', q: 'What is an `associatedtype` and why does it exist?',
      a: "A placeholder for a type the **conforming type** chooses, letting a protocol describe a family rather than one shape.\n\n```\nprotocol Container {\n    associatedtype Item\n    mutating func append(_ x: Item)\n}\n```\n\n=> Generics parameterise a function or type. Associated types parameterise a **protocol**." },

    { d: 'hard', alias: 'Explain `where` clauses on a generic and on an extension.', q: 'What does a `where` clause do on a generic function, and on an extension?',
      a: "On a function, it restricts callers:\n```\nfunc sum<C: Collection>(_ c: C) -> Int where C.Element == Int\n```\n\nOn an extension, it adds members that exist only for some instantiations:\n```\nextension Array where Element: Comparable { func sorted() }\n```\n\n=> That second form is a **conditional extension**, and it is the idiomatic way to layer capability without polluting the base type." },

    { d: 'medium', q: 'What is conditional conformance?',
      a: "`extension Array: Equatable where Element: Equatable` means an array is equatable **exactly when** its elements are.\n\n+ Lets generic types propagate conformance instead of needing wrappers\n\n=> Before Swift 4.1 you could not express this, which is why `[[Int]] == [[Int]]` used to fail to compile." },

    { d: 'hard', q: 'Generic parameter vs `some` parameter, what is the difference?',
      a: "`func f<T: P>(_ x: T)` and `func f(_ x: some P)` are **the same thing**. The second is sugar for the first.\n\nThe difference appears only when you need to **name** the type:\n- To constrain two parameters to be the same type\n- To reference `T` in the return type\n\n=> Use `some` when the type appears once and is never referenced." },

    { d: 'hard', q: 'Why is `[any Shape]` sometimes right and `[some Shape]` never valid?',
      a: "`some Shape` is **one fixed concrete type**, so an array of them would be homogeneous, in which case you would just write `[Circle]`.\n\n- Heterogeneity is exactly what existentials provide\n- So a mixed collection must be `[any Shape]`\n\n! The cost is boxing per element and dynamic dispatch per call.\n\n=> Fine for a dozen view models. Wrong for a million particles." },

    { d: 'medium', q: 'What is type erasure and when do you write an `AnyX` wrapper?',
      a: "Hiding a generic or associated type behind a concrete box that forwards calls through stored closures. `AnySequence`, `AnyPublisher` and `AnyView` all do this.\n\n- Before constrained existentials you needed it to store protocol-with-associated-type values\n- Today you often do not\n\n=> Still worth writing when you want to hide implementation types across a module boundary or break a compile-time dependency." },

    { d: 'medium', q: 'How does a generic constraint improve an API you would otherwise write with `Any`?',
      a: "```\nfunc value(for key: Any) -> Any?         // casts, no key guarantee\nfinal class Cache<Key: Hashable, Value> { }  // compiler-enforced\n```\n\n+ Autocompletion at the call site\n+ The optimiser can specialise the storage\n+ Keys are provably hashable\n\n=> The general lesson: **constraints are documentation the compiler enforces.**" },

    { d: 'hard', q: 'What is the performance model of an unspecialised generic call?',
      a: "The function receives:\n- The value **indirectly**\n- A pointer to the type metadata\n- One witness table per constraint\n\n! Every operation, including copy, destroy and any protocol call, is an indirect call through those tables\n! No inlining, no register passing for small values\n\n=> Typically several times slower than the specialised version, which is why hot generic code in a framework should be `@inlinable`." }
  ],
  quiz: [
    { d: 'medium', q: '`func f(_ x: some P)` is equivalent to:', choices: ['func f(_ x: any P)', 'func f<T: P>(_ x: T)', 'func f(_ x: P.Type)', 'None of these'], correct: 1,
      why: 'some in parameter position is sugar for an unnamed generic parameter. It differs from any P, which boxes the value.' },
    { d: 'medium', q: 'Why can a generic in a framework be slower than the same code in your app?', choices: ['Frameworks disable optimisation', 'Specialisation does not cross module boundaries unless the code is @inlinable or WMO applies', 'Generics are always interpreted', 'The linker strips generics'], correct: 1,
      why: 'Without the body visible across the boundary, the optimiser must emit the unspecialised path with metadata and witness tables passed at runtime.' },
    { d: 'easy', q: 'Which enables `[[Int]] == [[Int]]` to compile?', choices: ['Type erasure', 'Conditional conformance', 'Existential types', 'Associated types'], correct: 1,
      why: 'Array is Equatable only where Element: Equatable, which is a conditional conformance added in Swift 4.1.' },
    { d: 'hard', q: 'You need a heterogeneous collection of shapes. The right type is:', choices: ['[some Shape]', '[any Shape]', '[Shape.Type]', '[AnyObject]'], correct: 1,
      why: 'some Shape is one fixed concrete type, so it cannot be heterogeneous. any Shape boxes each element and dispatches dynamically.' },
    { d: 'hard', q: 'An unspecialised generic call passes which extra arguments at runtime?', choices: ['Nothing extra', 'Type metadata and one witness table per constraint', 'A copy of the protocol definition', 'The caller stack frame'], correct: 1,
      why: 'That indirection is the cost model: no inlining, indirect value access, and a witness table call for every protocol operation.' }
  ]
});

IPREP.addTopic({
  id: 'closures', domain: 'language',
  title: 'Closures, Blocks & Capture Semantics',
  summary: 'Escaping vs non-escaping, capture lists, block storage in Objective-C, and the bugs each causes.',
  cards: [
    { d: 'easy', alias: 'What is a closure, precisely?', q: 'What is a closure, and what does it capture?',
      a: "**A function plus the environment it captured.** The captured variables live in a heap-allocated context the closure keeps alive.\n\n=> That is why closures can create retain cycles.\n\n| | Swift closure | Objective-C block |\n|---|---|---|\n| Default capture | **By reference** | **By value** |\n| Opt out with | A capture list | `__block` |" },

    { d: 'medium', q: 'Swift closures capture by reference. What does that actually mean?',
      a: "Capturing a `var` captures the **variable**, not its value at capture time.\n\n```\nvar n = 0\nlet f = { n += 1 }\nf(); f()\nprint(n)   // 2\n```\n\n- Later mutations outside are visible inside\n- Mutations inside are visible outside\n\n=> To snapshot the value instead, put it in the capture list: `{ [n] in print(n) }` captures a constant copy." },

    { d: 'medium', alias: '`@escaping` versus non-escaping, and why the default matters.', q: 'What is the difference between an escaping and a non-escaping closure?',
      a: "| | Non-escaping (default) | `@escaping` |\n|---|---|---|\n| Guarantee | Finishes before the function returns | May be stored and called later |\n| Storage | Can live on the stack | Heap-allocated |\n| Capturing self | No cycle risk, no `self.` needed | Becomes ownership |\n\n=> Non-escaping has been the default since Swift 3 precisely because it is cheaper and safer, and it forces you to write `self.` exactly where a cycle is possible." },

    { d: 'hard', q: 'Why can a mutating struct method not capture self in an escaping closure?',
      a: "In a mutating method `self` is **`inout`**, a temporary exclusive borrow valid only for the call.\n\n! An escaping closure could outlive the call and write to `self` after the borrow ended\n! That would violate the exclusivity guarantee, so the compiler rejects it\n\n=> Workaround: capture the specific values you need, or make the type a class." },

    { d: 'medium', q: 'What does a capture list actually do?',
      a: "It evaluates each expression **at closure creation time** and stores the result as a constant in the closure's context.\n\n| Capture list | Stores |\n|---|---|\n| `[weak self]` | A weak reference |\n| `[value = self.expensive]` | A snapshot |\n| `[x]` | A copy, unaffected by later mutation |\n\n! It runs **once**, when the closure literal is evaluated, not when the closure is called." },

    { d: 'hard', q: 'The `guard let self = self else { return }` dance. What is it doing and when is it wrong?',
      a: "It promotes a weak reference to strong for the body's duration, so self cannot deallocate midway and leave half-updated state. Since Swift 5.8 you can write `guard let self else { return }`.\n\n! Wrong when the closure is long-lived and you actually want it to no-op after teardown\n! Dangerous in a **repeating** callback, because you resurrect a strong reference on every invocation\n\n=> That last case can keep a controller alive across an entire scroll session.\n\n```bad  a repeating callback resurrects a strong self on every invocation\nscrollObserver = observe(\\.contentOffset) { [weak self] _, _ in\n    guard let self else { return }\n    self.updateHeader()          // keeps the controller alive for the whole scroll\n}\n```\n\n```good  keep it weak for the whole body when the work is a single hop\nscrollObserver = observe(\\.contentOffset) { [weak self] _, _ in\n    self?.updateHeader()\n}\n```\n\nThe strong promotion is right when the body has several steps and half-updated state would be wrong:\n\n```good\nloader.load { [weak self] result in\n    guard let self else { return }\n    self.items = result\n    self.tableView.reloadData()\n    self.updateEmptyState()\n}\n```" },

    { d: 'medium', q: 'What is `__block` in Objective-C and what is the Swift equivalent?',
      a: "`__block` marks a local variable as **mutable from inside a block and shared** with the enclosing scope, moving it from the stack to a heap box.\n\n=> Swift has no equivalent keyword because Swift closures already capture by reference. The Swift analogue of the **opposite** behaviour, capturing by value, is the capture list." },

    { d: 'hard', q: 'Where do Objective-C blocks live, and why does `copy` matter for block properties?',
      a: "A block literal starts on the **stack**. Storing it past the current scope requires `Block_copy` to move it to the heap.\n\n! Without the copy you get a dangling pointer once the frame pops\n\n```\n@property (nonatomic, copy) void (^handler)(void);\n```\n\n=> Under ARC the compiler inserts most of these automatically, but `copy` is still the correct and conventional declaration." },

    { d: 'medium', q: 'What is a trailing closure and why does argument order matter?',
      a: "If the last parameter is a closure you can write it outside the parentheses, which is what makes `array.map { }` read well.\n\n- Multiple trailing closures arrived in Swift 5.3: the first unlabelled, the rest labelled\n\n=> The design lesson: **put the closure last in your own APIs**, which is why completion handlers conventionally come last." },

    { d: 'hard', q: 'A completion handler is sometimes called synchronously and sometimes asynchronously. Why is that a bug?',
      a: "It makes reentrancy and locking **unpredictable for the caller**.\n\n! If the caller holds a lock when it calls you, a synchronous callback re-enters that state\n! The same code path with a cache miss goes async and does not\n\nThe fix: **always** dispatch the callback, or always call it synchronously, and document which.\n\n=> Swift concurrency removes the ambiguity, because `await` is always a suspension point." }
  ],
  quiz: [
    { d: 'medium', q: 'In Swift, `var n = 0; let f = { n += 1 }; f(); f(); print(n)` prints:', choices: ['0', '1', '2', 'Compile error'], correct: 2,
      why: 'Swift closures capture the variable itself, not a snapshot, so both calls mutate the same storage.' },
    { d: 'medium', q: 'A non-escaping closure parameter allows you to:', choices: ['Store it in a property for later', 'Omit explicit self and avoid retain-cycle risk', 'Capture self unowned safely', 'Call it from another thread after return'], correct: 1,
      why: 'It is guaranteed to finish before the function returns, so there is no ownership question and no self. requirement.' },
    { d: 'hard', q: 'Why does the compiler reject capturing self in an escaping closure inside a mutating struct method?', choices: ['Structs cannot be captured', 'self is inout, an exclusive borrow that cannot outlive the call', 'Escaping closures require class types', 'It would create a retain cycle'], correct: 1,
      why: 'Escaping past the borrow would let the closure write to self after exclusivity ended, so the compiler forbids it.' },
    { d: 'medium', q: 'Objective-C block properties are declared `copy` because:', choices: ['Blocks are immutable', 'A block literal starts on the stack and must be moved to the heap to outlive its scope', 'copy is faster than strong', 'It prevents retain cycles'], correct: 1,
      why: 'Without the copy the property would point at a stack frame that has already been popped.' },
    { d: 'hard', q: 'A completion handler that is synchronous on cache hit and asynchronous on miss is a bug because:', choices: ['It is slower', 'It makes reentrancy and lock behaviour unpredictable for callers', 'It leaks memory', 'It cannot be tested'], correct: 1,
      why: 'The same call site behaves differently depending on data, so a caller holding a lock can deadlock or re-enter only in one branch.' },
    { d: 'easy', q: '`[weak self]` in a capture list is evaluated:', choices: ['Every time the closure is called', 'Once, when the closure literal is created', 'When self deallocates', 'At compile time'], correct: 1,
      why: 'Capture lists evaluate their expressions once, at closure creation, and store the results in the closure context.' }
  ]
});

IPREP.addTopic({
  id: 'objc', domain: 'language',
  title: 'Objective-C Runtime, Categories & Delegates',
  summary: 'Message dispatch, categories vs extensions, the delegate pattern, and Swift/ObjC interop.',
  cards: [

    { d: 'medium', q: 'What is the difference between `copy` and `retain` (or `strong`) for a property?',
      a: "`retain`/`strong` keeps **their** object. `copy` stores **your own** snapshot.\n\n| | strong | copy |\n|---|---|---|\n| Stores | The same instance | A copy |\n| Caller can mutate it later | **Yes** | No |\n| Cost | A retain | An allocation |\n\n```bad  the caller still owns the object you are holding\n@property (nonatomic, strong) NSString *name;\n\nNSMutableString *n = [NSMutableString stringWithString:@\"Jo\"];\nobj.name = n;\n[n appendString:@\"ker\"];      // obj.name silently changed too\n```\n\n```good\n@property (nonatomic, copy) NSString *name;\n```\n\n=> Use `copy` for any property whose type has a mutable subclass: `NSString`, `NSArray`, `NSDictionary`, `NSSet`, and blocks. In Swift, value types make this unnecessary." },

    { d: 'easy', q: 'What happens when you send a message in Objective-C?',
      a: "`[obj doThing]` compiles to `objc_msgSend(obj, @selector(doThing))`.\n\n1. Look up the selector in the class's **method cache**\n2. Then the method list\n3. Then walk the superclass chain\n4. If nothing is found, enter **message forwarding**\n\n=> Because lookup is by selector at runtime, Objective-C can do things Swift cannot: swizzling, `respondsToSelector:`, and adding methods at runtime." },

    { d: 'medium', q: 'What are the three chances to handle an unrecognised selector?',
      a: "| Step | Hook | Cost |\n|---|---|---|\n| 1 | `+resolveInstanceMethod:` add an IMP with `class_addMethod` | Cheap |\n| 2 | `-forwardingTargetForSelector:` return another receiver | Fast forwarding |\n| 3 | `-forwardInvocation:` with `-methodSignatureForSelector:` | **Slow**, fully general |\n\n=> If all three decline you get `doesNotRecognizeSelector:` and a crash. Step 3 boxes the call into an `NSInvocation` you can inspect and rewrite." },

    { d: 'medium', q: 'Category versus Swift extension, what is the real difference?',
      a: "| | Category | Swift extension |\n|---|---|---|\n| When | Runtime, at load | Compile time |\n| Stored properties | **No** (fixed ivar layout) | Computed only |\n| Duplicate selector | **Last loaded silently wins** | Compile error |\n| Can add | Methods | Methods, computed properties, inits, conformances |\n\n=> That third row is the dangerous one. Two categories defining the same selector is undefined behaviour with no diagnostic." },

    { d: 'hard', q: 'How do you fake a stored property on a category?',
      a: "**Associated objects.**\n\n```\nobjc_setAssociatedObject(self, &key, value, OBJC_ASSOCIATION_RETAIN_NONATOMIC);\nobjc_getAssociatedObject(self, &key);\n```\n\n+ The runtime tears them down automatically when the object deallocates\n! Slower than a real ivar\n! Invisible to memory graph tooling\n! Easy to create a cycle with `RETAIN` on something pointing back" },

    { d: 'medium', alias: 'Describe the delegate pattern and its trade-offs versus closures and notifications.', q: 'When would you use a delegate instead of a closure or a notification?',
      a: "| | Delegate | Closure | Notification |\n|---|---|---|---|\n| Cardinality | One to one | One to one | One to many |\n| Best for | Many related callbacks | A single result | Full decoupling |\n| Traceable | Yes | Yes | **No** |\n| Typed | Yes | Yes | No |\n| Main risk | Must be `weak` | Retain cycles | Leaked observers |\n\n=> UIKit uses delegates for `UITableViewDelegate` precisely because there are dozens of related callbacks with a defined lifecycle." },

    { d: 'hard', q: 'What is method swizzling, and what breaks when you do it?',
      a: "Exchanging two method implementations at runtime with `method_exchangeImplementations`, usually to instrument or patch a framework method.\n\n! Global and order-dependent\n! Breaks if two libraries swizzle the same selector\n! Must happen exactly once, typically in `+load`, not `+initialize`\n! You must call through to the original or silently drop behaviour\n! Confuses crash symbolication\n\n=> Acceptable for analytics and debugging tools. Rarely acceptable in product code." },

    { d: 'medium', q: 'What does `@objc dynamic` do in Swift and what needs it?',
      a: "- `@objc` exposes the member to the Objective-C runtime\n- `dynamic` forces dispatch **through** `objc_msgSend` rather than a vtable or direct call\n\nYou need both for anything relying on runtime interception:\n- KVO observation of a property\n- Swizzling\n- Some older framework callbacks\n\n! Without `dynamic`, Swift may devirtualise the call and your KVO observer never fires. A classic silent bug." },

    { d: 'medium', q: 'What is the difference between `nil`, `Nil`, `NULL` and `NSNull`?',
      a: "| Token | Is |\n|---|---|\n| `nil` | Null **object** pointer |\n| `Nil` | Null **class** pointer |\n| `NULL` | Null C pointer |\n| `NSNull` | A real singleton **object** representing null |\n\n! The trap: a JSON null becomes an `NSNull` **instance**, which is not falsy, and crashes when you message it as a string.\n\n=> Foundation collections cannot store nil, which is exactly why `NSNull` exists." },

    { d: 'medium', q: 'What is unusual about sending a message to `nil` in Objective-C?',
      a: "**It is legal and returns zero.** `[nil anything]` does nothing and yields 0, nil, or a zeroed struct depending on the return type.\n\n+ Which is why Objective-C code has fewer nil checks than you would expect\n! And why bugs hide: a nil receiver silently does nothing instead of crashing\n\n=> Swift's optionals exist largely to make this explicit. `foo?.bar()` is the direct analogue." },

    { d: 'hard', q: 'How does Swift bridge to Objective-C for a class you write?',
      a: "Subclass `NSObject` or mark members `@objc`, and the generated `YourModule-Swift.h` exposes them.\n\n**Cannot cross:**\n! Generics, structs, enums with associated values\n! Tuples\n! Protocol existentials with associated types\n\n! Bridging also has a cost: `String` to `NSString` and `Array` to `NSArray` can allocate.\n\n=> Avoid crossing the boundary in a hot loop." }
  ],
  quiz: [
    { d: 'medium', q: 'Two categories on the same class define the same selector. What happens?', choices: ['Compile error', 'Both run in load order', 'Whichever category loads last silently wins', 'The runtime raises an exception'], correct: 2,
      why: 'Category method installation is last-writer-wins at load time, with no diagnostic. This is why category collisions are so hard to debug.' },
    { d: 'medium', q: 'Your KVO observer never fires for a Swift property. Most likely missing:', choices: ['@objc only', '@objc dynamic', 'weak', '@available'], correct: 1,
      why: 'Without dynamic the compiler can dispatch directly and skip the runtime hook KVO relies on, so no change notification is emitted.' },
    { d: 'hard', q: 'Which forwarding step is the slowest but most general?', choices: ['+resolveInstanceMethod:', '-forwardingTargetForSelector:', '-forwardInvocation:', 'respondsToSelector:'], correct: 2,
      why: 'forwardInvocation: builds an NSInvocation with boxed arguments, which is expensive but lets you inspect and rewrite the whole call.' },
    { d: 'easy', q: '`[nil doSomething]` in Objective-C:', choices: ['Crashes', 'Returns a zero value and does nothing', 'Throws an exception', 'Is a compile error'], correct: 1,
      why: 'Messaging nil is a no-op returning zero. It hides bugs, which is part of why Swift made nullability explicit.' },
    { d: 'hard', q: 'A category cannot add a stored property because:', choices: ['Categories are compile-time only', 'The instance memory layout is fixed once the class is realised', 'ARC forbids it', 'Properties must be declared in the header'], correct: 1,
      why: 'You cannot grow the ivar layout of an already-realised class, which is why associated objects exist as the side-table workaround.' },
    { d: 'medium', q: 'A JSON null decoded into a `[String: Any]` from JSONSerialization appears as:', choices: ['nil, so the key is absent', 'NSNull, a real object that is not falsy', 'An empty string', 'A decoding exception'], correct: 1,
      why: 'Foundation collections cannot hold nil, so null becomes the NSNull singleton, which crashes if you message it as the expected type.' }
  ]
});
