/* SwiftUI & Declarative UI — 8 topics */

IPREP.addTopic({
  id: 'swiftui-identity', domain: 'swiftui',
  title: 'View Identity, Diffing & the Render Loop',
  summary: 'What a View actually is, how SwiftUI decides to redraw, and why identity governs everything.',
  cards: [
    { d: 'easy', q: 'What is a SwiftUI `View`, really?',
      a: "**A value type describing what the UI should look like for a given state.** Not an object that persists on screen.\n\n- Your struct is created and thrown away constantly\n- The persistent thing is the **render tree** SwiftUI maintains behind it, plus the state attached to each node\n\n=> Closer to a recipe than to a `UIView`. This single fact explains why `body` runs dozens of times, why `@State` lives outside the struct, and why side effects in `body` are a bug." },

    { d: 'medium', q: 'How often does `body` run, and what follows from that?',
      a: "Whenever any tracked dependency changes, and often more than you expect. **It is cheap by design and you must treat it as such.**\n\n! No network calls, analytics, or state mutation in `body`\n! No allocating expensive objects\n! No `Date()` or `UUID()` unless you want a different value each pass\n\n=> Expensive computation belongs in the model or a cached property. Side effects belong in `.task`, `.onAppear` or `.onChange`.\n\n```bad  a side effect and a new formatter on every render\nvar body: some View {\n    analytics.track(\"row_shown\")\n    let formatter = DateFormatter()\n    formatter.dateStyle = .medium\n    return Text(formatter.string(from: post.date))\n}\n```\n\n```good  formatter hoisted, side effect moved to a lifecycle hook\nprivate static let formatter: DateFormatter = {\n    let f = DateFormatter(); f.dateStyle = .medium; return f\n}()\n\nvar body: some View {\n    Text(Self.formatter.string(from: post.date))\n        .onAppear { analytics.track(\"row_shown\") }\n}\n```" },

    { d: 'hard', q: 'Explain structural identity versus explicit identity.',
      a: "| | Structural | Explicit |\n|---|---|---|\n| Comes from | Position in the view tree | `.id(value)` or a `ForEach` identifier |\n| Example | Two branches of `if/else` are **different** identities | You assign it |\n\n=> Identity is how SwiftUI decides 'is this the same view as last time, or a new one?' That decision determines whether **state is preserved**, and whether a change **animates or replaces**." },

    { d: 'hard', q: 'Why does `@State` reset unexpectedly, and how does identity cause it?',
      a: "**State is attached to a view's identity, not to the struct.** Change the identity and SwiftUI discards the old state.\n\nCommon triggers:\n! An `if/else` swapping branches, since each branch is a distinct identity\n! `.id()` bound to a value that changes\n! A `ForEach` keyed on **content** rather than a stable id\n\n=> The fix is nearly always to give the view a stable identity, or move the state up to an owner whose identity is stable.\n\n```bad  two branches, two identities: the field state dies on toggle\nif isEditing {\n    ProfileEditor(user: user)\n} else {\n    ProfileEditor(user: user)      // same type, different identity\n}\n```\n\n```good  one view, one identity, data changes\nProfileEditor(user: user, isEditing: isEditing)\n```\n\n```bad  a new identity on every single render\nRowView(post: post)\n    .id(UUID())\n```" },

    { d: 'medium', q: 'What does `.id()` do, and when does it hurt?',
      a: "It assigns explicit identity. Changing it tells SwiftUI 'this is a different view now', which **destroys the old state and view** and runs the transition rather than an animation.\n\n+ Useful for deliberately resetting a subtree, such as clearing a form\n! Harmful on something that changes often, because you throw away state and force a teardown every time\n! `.id(UUID())` inside `body` is the classic disaster: a new identity on **every** render, so nothing is ever reused" },

    { d: 'hard', q: 'Why is `AnyView` discouraged?',
      a: "It **erases the static type**, which is exactly what SwiftUI uses to diff efficiently.\n\n- With a concrete generic type, SwiftUI compares old and new structurally and updates only what changed\n- Inside `AnyView` it cannot see the shape, so it tends to tear down and rebuild the subtree\n\nAlternatives:\n+ `@ViewBuilder` on a function or computed property\n+ `Group` with `if/else`\n+ Making the branches one type with different data\n\n=> Reach for `AnyView` only for genuinely heterogeneous views in an array.\n\n```bad  the type is erased, so SwiftUI rebuilds instead of updating\nfunc icon(for state: State) -> AnyView {\n    switch state {\n    case .loading: return AnyView(ProgressView())\n    case .ready:   return AnyView(Image(systemName: \"checkmark\"))\n    }\n}\n```\n\n```good  the builder keeps the type visible to the diffing algorithm\n@ViewBuilder\nfunc icon(for state: State) -> some View {\n    switch state {\n    case .loading: ProgressView()\n    case .ready:   Image(systemName: \"checkmark\")\n    }\n}\n```" },

    { d: 'medium', q: 'What does `@ViewBuilder` do?',
      a: "A result builder that turns a block of view expressions into one composed view, supporting `if`, `switch`, and up to ten statements via `TupleView`.\n\n```\n@ViewBuilder\nvar content: some View {\n    if isLoading { ProgressView() }\n    else { list }\n}\n```\n\n=> It is why you can write conditionals inside a `VStack`. Apply it to your own functions and properties to get the same ergonomics **without `AnyView`**." },

    { d: 'hard', q: 'How does SwiftUI know which views to re-render?',
      a: "It **records dependencies as `body` runs.** Reading `@State`, a `@Binding`, an `@Environment` value, or a tracked property of an `@Observable` registers that view as a dependent.\n\n| System | Granularity |\n|---|---|\n| `ObservableObject` | The **whole object**. Every observer redraws |\n| `@Observable` | **Per property.** Only views that read it redraw |\n\n=> That difference is the main performance argument for the Observation framework." },

    { d: 'medium', q: 'How do you actually debug unnecessary re-renders?',
      a: "```\nvar body: some View {\n    let _ = Self._printChanges()\n    ...\n}\n```\n\nIt prints which dependency triggered the pass.\n\n| Output | Means |\n|---|---|\n| A property name | That value changed |\n| `@self` | The view value itself changed |\n| **`@identity`** | The view was **recreated**, not updated. Usually an identity bug |\n\n=> Instruments also has a SwiftUI template showing view body counts per update." },

    { d: 'hard', q: 'What is `EquatableView` / `.equatable()` for?',
      a: "It tells SwiftUI to compare the view's stored properties with `==` and **skip re-running `body`** when they are unchanged.\n\n+ Use when a view is expensive to build and equality is cheap to prove\n! A bad `==` that ignores a real dependency gives you **stale UI**, which is worse than a redundant render\n\n=> A targeted optimisation, not a default. SwiftUI's own comparison can be conservative for types it cannot cheaply compare, notably closures." },

    { d: 'medium', q: 'Why does modifier order matter?',
      a: "Each modifier **wraps** the view it is applied to and returns a new view, so order is composition order.\n\n| Code | Result |\n|---|---|\n| `.padding().background(.red)` | Red area **includes** the padding |\n| `.background(.red).padding()` | Red hugs the content, padding outside |\n\n=> The mental model: you are building a nested tree from the inside out, **not setting properties on an object**.\n\n```bad  the tap area is the un-padded text: dead edges\nText(\"Save\")\n    .onTapGesture { save() }\n    .padding(16)\n```\n\n```good  pad first, then attach the gesture to the padded view\nText(\"Save\")\n    .padding(16)\n    .contentShape(Rectangle())\n    .onTapGesture { save() }\n```" }
  ],
  quiz: [
    { d: 'medium', q: 'A SwiftUI View struct is best described as:', choices: ['A long-lived object like UIView', 'A value-type description of the UI for a given state', 'A view controller replacement', 'A layer-backed renderer'], correct: 1,
      why: 'The struct is created and discarded constantly. SwiftUI keeps a separate render tree, which is why state lives outside the struct.' },
    { d: 'hard', q: 'Your @State resets whenever a toggle flips. Most likely cause:', choices: ['@State cannot hold that type', 'An if/else swap changes the structural identity, so state is discarded', 'You need @StateObject instead', 'The view is not Equatable'], correct: 1,
      why: 'Each branch of an if/else is a separate identity. Give the view stable identity, or lift the state to a stable owner.' },
    { d: 'medium', q: '`.id(UUID())` written inside body causes:', choices: ['Better animation', 'A brand-new identity every render, so nothing is ever reused', 'Nothing, it is ignored', 'A compile error'], correct: 1,
      why: 'The view and all its state are destroyed and rebuilt on every pass. It is the classic accidental performance and state-loss bug.' },
    { d: 'hard', q: 'AnyView hurts performance because it:', choices: ['Allocates on the heap only', 'Erases the static type SwiftUI uses to diff, so subtrees get rebuilt', 'Disables animations', 'Forces main-thread layout'], correct: 1,
      why: 'Prefer @ViewBuilder or Group with if/else, which keep the concrete type visible to the diffing algorithm.' },
    { d: 'medium', q: '`Self._printChanges()` reporting `@identity` means:', choices: ['A property changed', 'The view was recreated rather than updated', 'The environment changed', 'A binding fired'], correct: 1,
      why: 'That points to an identity bug: something upstream is changing the view identity instead of just its data.' },
    { d: 'easy', q: '`.padding().background(.red)` versus `.background(.red).padding()`:', choices: ['Identical output', 'The first paints red including the padding; the second paints red tight to the content', 'The second is invalid', 'Only the first animates'], correct: 1,
      why: 'Modifiers wrap the view they are applied to, so order is composition order, not property assignment.' }
  ]
});

IPREP.addTopic({
  id: 'swiftui-state', domain: 'swiftui',
  title: 'State & Data Flow',
  summary: 'The property wrappers, which one owns the truth, and the bugs each causes.',
  cards: [
    { d: 'easy', q: 'Name each state property wrapper and what it owns.',
      a: "| Wrapper | Owns | Notes |\n|---|---|---|\n| `@State` | **This view owns** value-type state | Mark it `private` |\n| `@Binding` | Nothing | A two-way reference to state owned elsewhere |\n| `@StateObject` | **This view owns** a reference type | Controls its lifetime |\n| `@ObservedObject` | Nothing | Observes an object owned elsewhere |\n| `@EnvironmentObject` | Nothing | Pulls from the environment by type |\n| `@Environment` | Nothing | Reads a system or custom value |\n\n=> The whole system reduces to one question: **who owns this, and who is just reading it?**" },

    { d: 'hard', q: 'What is the difference between `@StateObject` and `@ObservedObject`, and what breaks?',
      a: "| | `@StateObject` | `@ObservedObject` |\n|---|---|---|\n| Manages lifetime | **Yes**, initialises once per identity | **No** |\n| Use where | You **create** the object | You **receive** it |\n\n! The bug: `@ObservedObject var vm = ViewModel()` recreates the view model **every time the parent re-renders**, because the struct is recreated and the initialiser runs again.\n\n=> State resets, in-flight work restarts, and it looks like random data loss.\n\n```bad  recreated on every parent re-render, losing state and work\nstruct FeedView: View {\n    @ObservedObject var vm = FeedViewModel()\n}\n```\n\n```good  the view that creates it owns it\nstruct FeedView: View {\n    @StateObject private var vm = FeedViewModel()      // pre-iOS 17\n}\n\nstruct FeedView17: View {\n    @State private var vm = FeedViewModel()            // @Observable, iOS 17+\n}\n\n// A child that only receives it does not own it:\nstruct RowView: View {\n    @ObservedObject var vm: FeedViewModel     // plain let with @Observable\n}\n```" },

    { d: 'medium', q: 'When is `@StateObject`\'s initialiser actually called?',
      a: "**Lazily, on first `body` evaluation for that identity, and never again** while the identity is stable.\n\n- Note the autoclosure: `@StateObject var vm = ViewModel()` does not run `ViewModel()` on every struct init. It is stored as a closure and invoked once\n\nIf you need constructor arguments:\n```\n_vm = StateObject(wrappedValue: ViewModel(id: id))\n```\n! The wrapped value expression still only runs once, which is exactly why injection here is awkward." },

    { d: 'medium', q: 'What is `@Binding` and how do you create one?',
      a: "A **read-write reference** to state someone else owns. Make one with the `$` projection:\n\n```\nTextField(\"Name\", text: $name)          // passes a Binding<String>\nBinding(get: { }, set: { })             // adapt a value not directly stored\n.constant(value)                        // for previews and tests\n```\n\n=> Use it whenever a child needs to **write back**. Pass the plain value instead when the child only reads." },

    { d: 'hard', q: 'What are the trade-offs of `@EnvironmentObject`?',
      a: "+ Removes the need to thread a dependency through every intermediate view\n+ Genuinely useful for app-wide things like a session or a theme\n! **Runtime crash** if nothing of that type was injected. No compile-time check\n! Dependencies become invisible; you cannot read a view's requirements from its signature\n! Invites one fat object that every view observes, widening invalidation\n\n=> Use it for a small number of genuinely global objects. Inject everything else explicitly." },

    { d: 'medium', q: 'What is `@Environment` for, beyond system values?',
      a: "It reads environment values: `\\.colorScheme`, `\\.dismiss`, `\\.dynamicTypeSize`, `\\.scenePhase`, `\\.isEnabled`.\n\n+ You can define your own with an `EnvironmentKey`, which is the idiomatic way to pass configuration down a subtree without a global\n+ Since iOS 17 it also reads `@Observable` objects by type\n\n=> That last point replaces much of what `@EnvironmentObject` did, without the separate wrapper." },

    { d: 'medium', q: 'State the single-source-of-truth rule and why it matters.',
      a: "**Every piece of state has exactly one owner.** Everyone else derives from it or holds a binding to it.\n\n! Duplicating state, such as copying a model value into `@State` in `onAppear`, creates two truths that **drift**\n! When they disagree the UI shows one and the model has the other, and the bug appears only after a specific sequence of edits\n\n=> When you feel the urge to copy, ask whether it can be **computed** instead. Derived values should be computed properties, not stored state." },

    { d: 'hard', q: 'Where should state live when two sibling views need it?',
      a: "**In their nearest common ancestor**, passed down as a `@Binding` to whichever child mutates it. This is state hoisting.\n\n=> If that ancestor is many levels up and the plumbing gets painful, that is the signal to reach for an **observable model object** held by the ancestor and injected.\n\n! It is not a signal to duplicate the state in both siblings and try to keep them in sync." },

    { d: 'medium', q: 'What do `@AppStorage` and `@SceneStorage` do?',
      a: "| Wrapper | Backed by | For |\n|---|---|---|\n| `@AppStorage` | `UserDefaults` | Genuine user preferences |\n| `@SceneStorage` | Per-scene restoration state | Selected tab, scroll position |\n\n```\n@AppStorage(\"hasOnboarded\") var hasOnboarded = false\n```\n\n! All the `UserDefaults` caveats still apply: no secrets, nothing large." },

    { d: 'hard', q: 'You mutate an @Observable model from a background task and the UI does not update. Why?',
      a: "**Almost always threading, not observation.** SwiftUI expects state mutation on the main actor.\n\n! Mutating from a background context gives undefined behaviour, missed updates, or a crash\n\nThe fix:\n```\n@Observable @MainActor final class Model { }\n```\n\n=> Annotate the model and let the compiler enforce it, rather than remembering to dispatch at every call site.\n\n```bad  mutation off the main actor: updates missed or corrupted\n@Observable final class Model {\n    var items: [Item] = []\n    func load() {\n        URLSession.shared.dataTask(with: url) { data, _, _ in\n            self.items = decode(data)          // background queue\n        }.resume()\n    }\n}\n```\n\n```good  the compiler enforces main-actor mutation\n@Observable @MainActor final class Model {\n    var items: [Item] = []\n    func load() async {\n        let (data, _) = try await URLSession.shared.data(from: url)\n        items = decode(data)                   // guaranteed on the main actor\n    }\n}\n```" },

    { d: 'medium', q: 'Why should `@State` be `private`?',
      a: "Because it is **the view's own storage** and nobody outside should set it.\n\n! Making it non-private lets a parent pass an initial value through the memberwise initialiser\n! That looks like it works, then silently does nothing on later updates, since `@State` initialisers only run once per identity\n\n=> If a parent needs to supply the value, that state does not belong in this view. Hoist it and pass a `@Binding`." }
  ],
  quiz: [
    { d: 'hard', q: '`@ObservedObject var vm = ViewModel()` written inside a view causes:', choices: ['Nothing unusual', 'The view model to be recreated on every parent re-render, resetting state', 'A compile error', 'A retain cycle'], correct: 1,
      why: 'ObservedObject does not manage lifetime. Use @StateObject where the object is created, @ObservedObject where it is received.' },
    { d: 'medium', q: '@StateObject initialises its object:', choices: ['On every body pass', 'Once per view identity', 'Once per app launch', 'Every time the parent updates'], correct: 1,
      why: 'The wrapped value is an autoclosure evaluated lazily on first body and retained for that identity.' },
    { d: 'medium', q: 'The main risk of @EnvironmentObject is:', choices: ['Poor performance', 'A runtime crash when nothing of that type was injected', 'It cannot hold classes', 'It only works on iOS 17'], correct: 1,
      why: 'There is no compile-time check, and it also hides a view dependency that its signature no longer documents.' },
    { d: 'medium', q: 'Two sibling views need to share state. It should live:', choices: ['Duplicated in both, synced with onChange', 'In their nearest common ancestor, passed down as a Binding', 'In a global singleton', 'In @AppStorage'], correct: 1,
      why: 'State hoisting keeps a single source of truth. Duplicating creates two truths that drift apart.' },
    { d: 'hard', q: 'Copying a model value into @State in onAppear is a smell because:', choices: ['onAppear is too late', 'It creates a second source of truth that drifts from the model', '@State cannot hold model types', 'It runs twice'], correct: 1,
      why: 'Derived values should be computed from the source, not stored separately and manually kept in sync.' },
    { d: 'easy', q: '`$value` on a @State property gives you:', choices: ['The wrapped value', 'A Binding to it', 'A copy', 'An ObservableObject'], correct: 1,
      why: 'The dollar prefix accesses the projected value, which for @State is a Binding the child can write through.' }
  ]
});

IPREP.addTopic({
  id: 'swiftui-observation', domain: 'swiftui',
  title: 'Observation: @Observable vs ObservableObject',
  summary: 'The iOS 17 Observation framework, why it is faster, and how to migrate.',
  cards: [
    { d: 'easy', q: 'What does the `@Observable` macro replace?',
      a: "The `ObservableObject` protocol with `@Published` properties.\n\n| Old | New |\n|---|---|\n| Conform to `ObservableObject` | Mark the class `@Observable` |\n| Annotate each property `@Published` | Every stored property is observable automatically |\n| `@StateObject` | `@State` |\n| `@ObservedObject` | A plain `let` |\n| `@EnvironmentObject` | `@Environment(Type.self)` |" },

    { d: 'hard', q: 'Why is `@Observable` more efficient than `ObservableObject`?',
      a: "| | `ObservableObject` | `@Observable` |\n|---|---|---|\n| Signal | One `objectWillChange` for the **whole object** | Tracked **per property** |\n| Who redraws | Every observing view | Only views that read the changed property |\n\n=> On a screen with one large model and many small views, that is the difference between redrawing everything and redrawing one label." },

    { d: 'medium', q: 'How do you own an `@Observable` object in a view?',
      a: "```\n@Observable final class ProfileModel { var name = \"\" }\n\nstruct ProfileView: View {\n    @State private var model = ProfileModel()\n    var body: some View { Text(model.name) }\n}\n```\n\n- `@State` now handles reference types too, giving the same once-per-identity lifetime `@StateObject` used to provide\n- A child that merely **receives** the object takes it as a plain `let`, with no wrapper at all" },

    { d: 'medium', q: 'What is `@Bindable` for?',
      a: "Creating **bindings** to the properties of an `@Observable` object.\n\n```\n@Bindable var model: ProfileModel\nTextField(\"Name\", text: $model.name)\n```\n\n| Need | Use |\n|---|---|\n| Read a property | A plain `let` |\n| Two-way control | **`@Bindable`** |\n\n=> You can also use it inline inside `body`: `@Bindable var m = model`." },

    { d: 'hard', q: 'How does observation tracking actually work?',
      a: "1. The macro rewrites stored properties into computed ones calling `access(keyPath:)` on read and `withMutation(keyPath:)` on write\n2. Both are backed by an `ObservationRegistrar`\n3. SwiftUI wraps each `body` evaluation in `withObservationTracking`\n4. That records the key paths read and registers a callback for the next change to any of them\n\n=> Which is why the dependency set is **exact**, and why it is recomputed on every render rather than declared up front." },

    { d: 'medium', q: 'How do you put an `@Observable` object in the environment?',
      a: "```\n.environment(session)                      // inject\n@Environment(Session.self) var session     // read\n```\n\n! The non-optional form still **traps at runtime** when nothing was injected.\n\n=> So the `@EnvironmentObject` crash risk has not disappeared, it has only moved. Use the optional form when the object may legitimately be absent." },

    { d: 'hard', q: 'What are the migration gotchas from ObservableObject?',
      a: "! Remove `@Published`. The macro owns all stored properties, and leaving it causes a **compile error**\n! `objectWillChange` no longer exists, so any Combine pipeline hanging off it must be rewritten\n! A computed property is observable only if the stored properties it reads are, which surprises people using lazily cached values\n! It raises the deployment target to iOS 17\n\n+ `@StateObject` becomes `@State`, `@ObservedObject` becomes a plain `let`" },

    { d: 'medium', q: 'When should you still use `ObservableObject`?',
      a: "+ You support iOS 16 or earlier\n+ You have an existing Combine pipeline built on `objectWillChange` and the rewrite is not worth it\n\n=> `ObservableObject` is **not deprecated** and works fine. For anything new on a modern deployment target, `@Observable` is the default: less boilerplate, better invalidation, and plain `let` in child views." },

    { d: 'hard', q: 'Does `@Observable` solve threading for you?',
      a: "**No.** It makes observation efficient. It says nothing about which thread mutates the state.\n\n! Mutating an observable model off the main actor is still a bug, and still produces missed or corrupted UI updates.\n\n```\n@Observable @MainActor final class Model { }\n```\n\n=> That combination makes the compiler enforce main-actor mutation. Background work then happens in `async` functions that hop back before assigning." },

    { d: 'medium', q: 'How do you test an `@Observable` model?',
      a: "**Exactly like a plain object**, which is the point.\n\n- Instantiate it, call methods, assert on properties\n- No publisher to await, no view needed\n\n=> If you want to assert that a change fires observation, wrap a read in `withObservationTracking(_:onChange:)` and assert the callback runs. In practice most tests just check the resulting state, which is simpler and less brittle." }
  ],
  quiz: [
    { d: 'hard', q: '@Observable outperforms ObservableObject mainly because it:', choices: ['Uses structs instead of classes', 'Tracks reads per property instead of publishing one signal for the whole object', 'Avoids Combine', 'Runs off the main thread'], correct: 1,
      why: 'objectWillChange invalidates every observing view. Per-property tracking invalidates only the views that read the changed property.' },
    { d: 'medium', q: 'To own an @Observable object in a view you now use:', choices: ['@StateObject', '@State', '@ObservedObject', '@Bindable'], correct: 1,
      why: '@State handles reference types too and gives the once-per-identity lifetime @StateObject used to provide.' },
    { d: 'medium', q: '@Bindable is needed when you want to:', choices: ['Read a property', 'Get $ bindings to an @Observable object for two-way controls', 'Inject into the environment', 'Observe on a background thread'], correct: 1,
      why: 'A plain let is enough to read. The projection for TextField and friends requires @Bindable.' },
    { d: 'hard', q: 'Leaving @Published on a property inside an @Observable class:', choices: ['Is required', 'Causes a compile error', 'Silently does nothing', 'Improves performance'], correct: 1,
      why: 'The macro owns all stored properties. @Published belongs only to ObservableObject.' },
    { d: 'medium', q: '@Observable handles main-thread safety for you:', choices: ['True', 'False, you still need @MainActor on the model'], correct: 1,
      why: 'Observation is about invalidation, not isolation. Mutating off the main actor is still a bug.' }
  ]
});

IPREP.addTopic({
  id: 'swiftui-layout', domain: 'swiftui',
  title: 'The SwiftUI Layout System',
  summary: 'Proposal and response, stacks, frames, GeometryReader, and the custom Layout protocol.',
  cards: [
    { d: 'easy', q: 'Describe the SwiftUI layout algorithm in three steps.',
      a: "1. **The parent proposes** a size. It may propose `nil` in a dimension, meaning 'tell me your ideal'\n2. **The child chooses** its own size. It is not forced\n3. **The parent places** the child in its own coordinate space\n\n=> The key insight candidates miss: **the child decides.** A parent cannot impose a size, only propose one.\n\nWhich is why `.frame()` does not resize a child so much as create a new parent that proposes differently." },

    { d: 'medium', q: 'What does `.frame(width:height:)` actually do?',
      a: "It creates a **new view** that proposes the given size to its child and is itself that size. **It does not set a property on the child.**\n\n! If the child refuses the proposal, for example a `Text` with unbreakable content, the child **overflows** the frame rather than shrinking\n\n- `.frame(maxWidth: .infinity)` means 'propose as much as I am offered', which is how you fill available width\n\n=> This distinction explains most 'why is my frame being ignored' questions." },

    { d: 'hard', q: 'Why is `GeometryReader` a trap, and what should you use instead?',
      a: "! It **accepts the entire proposed size**, and places content top-leading by default, so dropping one into a stack often collapses or expands the layout\n! It reads a size known only during layout, which invites reading-then-writing state and a layout loop\n\n| Instead | Use |\n|---|---|\n| Pick among candidates | `ViewThatFits` |\n| A fraction of the container | `.containerRelativeFrame()` |\n| Just measure | `onGeometryChange` (iOS 18) or a preference key |\n| Measure **and** place | A custom `Layout` |\n\n```bad  greedy: it takes the whole proposal, collapsing the stack\nVStack {\n    GeometryReader { proxy in\n        Text(\"Width is \" + String(Int(proxy.size.width)))\n    }\n    Text(\"Below\")        // pushed off, because the reader took everything\n}\n```\n\n```good  measure without restructuring the layout\nText(\"Hello\")\n    .onGeometryChange(for: CGSize.self) { $0.size }\n        action: { size = $0 }        // iOS 18\n\n// or size relative to the container\nText(\"Hello\")\n    .containerRelativeFrame(.horizontal) { length, _ in length * 0.8 }\n```" },

    { d: 'medium', q: 'What is `fixedSize()` for?',
      a: "It tells a view to use its **ideal** size in the given dimension, **ignoring the proposal**.\n\n```\n.fixedSize(horizontal: false, vertical: true)\n```\n\n=> The canonical use: a `Text` being truncated because the parent proposed too little width. This lets it grow vertically to fit rather than clipping.\n\n! Use it narrowly. Applying it in both dimensions to something large lets the view escape its container entirely." },

    { d: 'hard', q: 'How do stacks distribute space among children?',
      a: "A stack proposes in order of **layout priority**, then by **flexibility**:\n\n1. Ask the least flexible children first\n2. Give them what they need\n3. Divide the remainder among the more flexible ones\n\n=> Which is why a `Text` next to a `Spacer` keeps its natural width: `Text` is inflexible, `Spacer` takes everything left.\n\n- Override the order with `.layoutPriority()`. A higher priority child is served first\n\n=> Understanding this ordering is what lets you fix 'the wrong view is being squashed'." },

    { d: 'medium', q: 'What are alignment guides and when do you need one?',
      a: "A stack aligns children on a named guide: `.leading`, `.center`, `.firstTextBaseline`. `alignmentGuide(_:computeValue:)` lets a child redefine where its guide sits.\n\n=> The real use case is aligning views **across different containers**, for example lining up a label in one `HStack` with a label in another row.\n\n! For that you define a **custom alignment** with an `AlignmentID` and set it on both. That is the answer interviewers listen for." },

    { d: 'hard', q: 'What is the `Layout` protocol and when would you implement one?',
      a: "iOS 16+. Implement `sizeThatFits(proposal:subviews:cache:)` and `placeSubviews(in:proposal:subviews:cache:)` to write a real layout container.\n\nUse it for arrangements a stack cannot express:\n- A flow layout that wraps\n- A radial arrangement\n- A masonry grid\n\n+ Far better than nesting `GeometryReader` with manual offsets, because it participates properly in the proposal system, animates, and can cache measurements" },

    { d: 'medium', q: 'How do `LazyVGrid` and `Grid` differ?',
      a: "| | `LazyVGrid` | `Grid` (iOS 16) |\n|---|---|---|\n| Creation | **Lazy**, only what is visible | Eager |\n| Structure | `GridItem` column definitions | Real rows and columns |\n| Features | Scales to large collections | Cell spanning, alignment across rows |\n| Best for | Large collections | Forms, small structured layouts |\n\n! `Grid` for a thousand items is a performance bug. `LazyVGrid` for a six-cell form is awkward." },

    { d: 'medium', q: 'How does safe area work in SwiftUI?',
      a: "Layout is inset to the safe area by default.\n\n| API | Does |\n|---|---|\n| `.ignoresSafeArea(_:edges:)` | Opts out. Right for a full-bleed background, **almost never for content** |\n| `.safeAreaInset(edge:)` | Adds **your** view to the safe area |\n| `.safeAreaPadding` | Padding matching the safe area |\n\n=> `safeAreaInset` is how you place a persistent bottom bar that content correctly insets around, rather than overlaying it and hiding the last row." },

    { d: 'hard', q: 'Your layout jumps or loops. What are the usual causes?',
      a: "! Reading a geometry value and **writing it into `@State`**, which invalidates layout, which recomputes the value, which writes again\n! A preference key whose value changes on every pass\n! `GeometryReader` nested inside something that sizes to its content, creating a circular dependency\n! An `.id()` changing during layout\n\n=> Break the cycle: use `onGeometryChange` or a preference with a stable comparison, or restructure so size flows one way. If you must store a measured size, **guard the write** so equal values do not trigger an update." }
  ],
  quiz: [
    { d: 'medium', q: 'In SwiftUI layout, the size of a view is ultimately decided by:', choices: ['The parent', 'The child, responding to a proposal', 'The frame modifier', 'The root window'], correct: 1,
      why: 'Parents propose, children choose, parents place. That is why a child can overflow a frame it refuses.' },
    { d: 'hard', q: 'Dropping a GeometryReader into a VStack often breaks layout because it:', choices: ['Renders asynchronously', 'Accepts the entire proposed size and places content top-leading', 'Cannot be nested', 'Disables animations'], correct: 1,
      why: 'It is greedy. Prefer ViewThatFits, containerRelativeFrame, or onGeometryChange when you only need to measure.' },
    { d: 'medium', q: 'A Text is truncating even though there is vertical room. The fix is:', choices: ['.frame(height: 100)', '.fixedSize(horizontal: false, vertical: true)', '.lineLimit(1)', '.scaledToFit()'], correct: 1,
      why: 'It tells the text to take its ideal height rather than accepting a proposal that forces truncation.' },
    { d: 'hard', q: 'For a wrapping flow layout of tags, the right tool is:', choices: ['Nested GeometryReaders with offsets', 'A custom Layout conformance', 'LazyVGrid with fixed columns', 'HStack with Spacers'], correct: 1,
      why: 'Layout participates in the proposal system, animates correctly, and can cache measurements. The GeometryReader approach fights the framework.' },
    { d: 'medium', q: 'To add a persistent bottom bar that content insets around, use:', choices: ['.overlay(alignment: .bottom)', '.safeAreaInset(edge: .bottom)', '.ignoresSafeArea()', 'ZStack'], correct: 1,
      why: 'An overlay covers content, so the last row hides behind the bar. safeAreaInset extends the safe area properly.' },
    { d: 'hard', q: 'A layout loop most often comes from:', choices: ['Too many modifiers', 'Writing a measured geometry value back into state that re-triggers layout', 'Using LazyVStack', 'Animating a frame'], correct: 1,
      why: 'Break the cycle, or guard the write so an unchanged value does not trigger another pass.' }
  ]
});

IPREP.addTopic({
  id: 'swiftui-lists', domain: 'swiftui',
  title: 'Lists, ForEach & Scroll Performance',
  summary: 'List vs lazy stacks, identity in ForEach, and how to keep a feed at 120fps.',
  cards: [
    { d: 'medium', q: 'When do you use `List` versus `LazyVStack` in a `ScrollView`?',
      a: "| | `List` | `LazyVStack` |\n|---|---|---|\n| Backed by | `UICollectionView` | Nothing, it is a stack |\n| **Reuses rows** | **Yes** | **No**, discards and rebuilds |\n| Free features | Separators, swipe actions, selection, editing, section headers | None |\n| Layout freedom | Constrained | Total |\n\n=> `List` is the right default for anything list-shaped. Choose `LazyVStack` when you need a layout `List` cannot express, and expect to do more performance work yourself." },

    { d: 'hard', q: 'Why does `ForEach` identity matter so much?',
      a: "`ForEach` needs a **stable identity per element** to know what was inserted, removed or moved.\n\nGet it wrong and you see:\n! Wrong animations\n! Lost `@State` inside rows\n! Wrong data on rows after an update\n! Scroll position jumps\n\n=> `ForEach(items)` requires `Identifiable`. `ForEach(items, id: \\.self)` hashes the **whole element**, so any content change makes it a different identity and the row is destroyed and recreated.\n\nThis is the diffable-data-source identity problem in a new syntax." },

    { d: 'medium', q: 'What does `id: \\.self` actually do, and when is it acceptable?',
      a: "It uses the element itself as the identifier, requiring `Hashable`.\n\n+ **Acceptable** for genuinely immutable, unique values: a fixed array of enum cases, or strings you control\n! **Unacceptable** for model objects, because editing any property changes the hash and therefore the identity\n! Silently wrong for arrays containing **duplicates**, since two equal elements collide into one identity and SwiftUI drops or duplicates rows\n\n```bad  identity is the whole value, so an edit recreates the row\nForEach(posts, id: \\.self) { post in\n    PostRow(post: post)\n}\n```\n\n```good  identity is stable, content is free to change\nstruct Post: Identifiable {\n    let id: UUID\n    var title: String\n}\n\nForEach(posts) { post in\n    PostRow(post: post)\n}\n\n// id: \\.self is fine only for immutable, unique values:\nForEach([\"daily\", \"weekly\", \"monthly\"], id: \\.self) { Text($0) }\n```" },

    { d: 'medium', q: 'How do you load data for a view correctly?',
      a: "**`.task { }`** is the modern answer.\n\n| | `.task` | `.onAppear` + `Task` |\n|---|---|---|\n| Cancels on disappear | **Automatically** | No |\n| Re-runs on a value change | `.task(id:)` | Manual |\n\n! `.onAppear` can fire more than once in a lazy container\n\n=> Use `.onAppear` only for genuinely synchronous setup. `.task(id:)` is exactly what a detail view whose subject changes needs.\n\n```bad  the task outlives the view; onAppear can fire twice\n.onAppear {\n    Task { await store.load(id: id) }\n}\n```\n\n```good  tied to the view lifetime, and re-runs when the subject changes\n.task(id: id) {\n    await store.load(id: id)\n}\n```" },

    { d: 'hard', q: 'How do you implement infinite scroll in SwiftUI?',
      a: "Attach a trigger to the last row:\n\n```\nForEach(items) { item in\n    Row(item)\n        .task {\n            if item == items.last { await store.loadNextPage() }\n        }\n}\n```\n\n! In a lazy container this can fire **more than once**, so the store must dedupe concurrent page loads\n! It must also handle a refresh landing mid-load\n\n=> The guard in the store is doing real work, not defensive decoration." },

    { d: 'medium', q: 'How do you control or read scroll position?',
      a: "| API | Availability | Nature |\n|---|---|---|\n| `ScrollViewReader` + `scrollTo` | Everywhere | Imperative, one-way |\n| `.scrollPosition(id:)` | iOS 17 | **Two-way binding** |\n| `.scrollTargetBehavior(.paging)` | iOS 17 | Paging and snapping |\n| `.defaultScrollAnchor(.bottom)` | iOS 17 | Start at the bottom, for chat |\n\n=> Before iOS 17 the honest answer is that fine scroll control was a real reason to drop to UIKit." },

    { d: 'hard', q: 'What actually makes a SwiftUI list slow?',
      a: "! Expensive work in `body`: formatting dates, decoding, sorting or filtering a large array on every pass\n! `AnyView` in rows, defeating diffing\n! One large `ObservableObject`, so every row invalidates on any change\n! Unstable `ForEach` identity forcing teardown and rebuild\n! `LazyVStack` where `List` would reuse\n! Full-resolution image loading with no downsampling\n\n=> Measure with the SwiftUI Instruments template and `Self._printChanges()` before optimising anything." },

    { d: 'medium', q: 'How do you get pull to refresh and swipe actions?',
      a: "```\n.refreshable { await store.refresh() }\n.swipeActions(edge: .trailing) { ... }\n```\n\n- `.refreshable` is **async**, so the spinner stays until your work completes\n- `.swipeActions` supports `allowsFullSwipe`\n\n=> Both are `List` features you would otherwise rebuild by hand in a `LazyVStack`, which is a good argument for `List`." },

    { d: 'hard', q: 'How do sections and pinned headers work?',
      a: "```\nList { Section { rows } header: { Text(\"A\") } }\nLazyVStack(pinnedViews: [.sectionHeaders]) { Section { } header: { } }\n```\n\n- In a `List` you get the platform's section behaviour\n- In a lazy stack, pinning keeps the header alive while its section is on screen, which is cheap\n\n! But a header that observes a large model will re-render as you scroll.\n\n=> Keep headers dumb." },

    { d: 'medium', q: 'How do you animate list changes correctly?',
      a: "```\nwithAnimation { items.remove(atOffsets: offsets) }\n```\n\nTwo requirements:\n1. Wrap the **data mutation** in `withAnimation`\n2. Make identity **stable**, so SwiftUI sees an insert or move rather than a wholesale replacement\n\n! If every row animates when one changes, your identity is content-based rather than identity-based.\n\n=> Same root cause as the diffable data source problem in UIKit." }
  ],
  quiz: [
    { d: 'medium', q: 'The key advantage of List over LazyVStack in a ScrollView is:', choices: ['It supports more modifiers', 'Real cell reuse, plus separators, swipe actions and selection', 'It is not lazy', 'It renders on a background thread'], correct: 1,
      why: 'LazyVStack creates lazily but does not reuse, so rows are rebuilt rather than recycled.' },
    { d: 'hard', q: '`ForEach(posts, id: \\.self)` on a mutable model type causes:', choices: ['Better performance', 'Rows to be destroyed and recreated whenever any property changes', 'A compile error', 'Duplicate keys to be merged safely'], correct: 1,
      why: 'Hashing the whole element makes identity content-based. Use a stable id, exactly as with a diffable data source.' },
    { d: 'medium', q: '`.task { }` is preferred over `.onAppear` for async work because it:', choices: ['Runs earlier', 'Cancels its Task automatically when the view disappears', 'Runs on a background thread', 'Only fires once ever'], correct: 1,
      why: 'It ties the task lifetime to the view lifetime. .task(id:) also re-runs when the id changes.' },
    { d: 'medium', q: 'Pull to refresh in SwiftUI is:', choices: ['.onRefresh', '.refreshable { await ... }', '.pullToRefresh()', 'A UIViewRepresentable'], correct: 1,
      why: 'It is async, so the spinner remains until the awaited work finishes.' },
    { d: 'hard', q: 'Every row re-animates when one item changes. The likely cause is:', choices: ['withAnimation was omitted', 'Identity is content-based, so SwiftUI sees a wholesale replacement', 'The list is too long', 'You used List instead of LazyVStack'], correct: 1,
      why: 'Stable identity lets the diff express one insert, delete or move instead of replacing the collection.' },
    { d: 'medium', q: 'To bind the top-most visible item id on iOS 17 you use:', choices: ['ScrollViewReader', '.scrollPosition(id:)', 'GeometryReader', '.onScroll'], correct: 1,
      why: 'It gives two-way control. ScrollViewReader still works but is imperative and one-way.' }
  ]
});

IPREP.addTopic({
  id: 'swiftui-navigation', domain: 'swiftui',
  title: 'Navigation, Sheets & Deep Linking',
  summary: 'NavigationStack, typed paths, programmatic routing, and the modal presentation rules.',
  cards: [
    { d: 'easy', q: 'What did `NavigationStack` fix that `NavigationView` could not do?',
      a: "**Programmatic control.** `NavigationView` had none worth the name.\n\n| | `NavigationView` | `NavigationStack` |\n|---|---|---|\n| Push programmatically | Flip `isActive` per link | Append to a `path` array |\n| Express a deep stack | Barely | Trivially |\n| Deep linking | Painful | Set the path |\n| Restoration | Manual | Encode the path |\n\n=> The stack is **data**. Push, pop, replace and restore are all array manipulation." },

    { d: 'medium', q: 'How do `path` and `navigationDestination` fit together?',
      a: "```\nNavigationStack(path: $path) {\n    RootView()\n        .navigationDestination(for: Product.self) { ProductView(product: $0) }\n        .navigationDestination(for: Order.self)   { OrderView(order: $0) }\n}\n```\n\n1. You append a value to `path`\n2. SwiftUI finds the destination registered for that **type**\n\n- `NavigationLink(value:)` does the same declaratively\n\n=> The stack is data; the destinations are a type-to-view mapping." },

    { d: 'hard', q: 'What is `NavigationPath` and when do you need it over a typed array?',
      a: "A type-erased stack holding **heterogeneous** `Hashable` values, so one path can contain products, orders and settings together.\n\n| | Typed `[Route]` | `NavigationPath` |\n|---|---|---|\n| `Codable` | **Free** | Via its `codable` property |\n| Exhaustive switching | **Yes** | No |\n| Testing | Easier | Harder |\n| Heterogeneous types | No | **Yes** |\n\n=> Use a typed array with a single enum unless values genuinely come from types you do not control." },

    { d: 'hard', q: 'A `navigationDestination` inside a lazy container silently fails. Why?',
      a: "It must be registered in a view that is **actually rendered** when the push happens.\n\n! Inside a `LazyVStack` row or a `ForEach` body, it may not exist yet\n! SwiftUI warns: 'A navigationDestination for ... was declared earlier on the stack. Only the destination declared closest to the root will be used'\n\n=> Attach destinations **once, near the root** of the stack. Never per row.\n\n```bad  registered per row, in a lazy container that may not exist\nNavigationStack(path: $path) {\n    List(products) { product in\n        NavigationLink(value: product) { ProductRow(product: product) }\n            .navigationDestination(for: Product.self) { ProductView(product: $0) }\n    }\n}\n```\n\n```good  registered once, near the root\nNavigationStack(path: $path) {\n    List(products) { product in\n        NavigationLink(value: product) { ProductRow(product: product) }\n    }\n    .navigationDestination(for: Product.self) { ProductView(product: $0) }\n}\n```" },

    { d: 'medium', q: 'How do you dismiss a view in SwiftUI?',
      a: "```\n@Environment(\\.dismiss) private var dismiss\nButton(\"Close\") { dismiss() }\n```\n\n+ Works for **both** a pushed view and a modal, dismissing whichever presentation this view belongs to\n+ Replaced the older `presentationMode` binding\n\n=> You can also flip the `isPresented` binding from the presenter, but `dismiss` keeps the child from needing to know how it was shown." },

    { d: 'medium', q: 'Compare `sheet`, `fullScreenCover` and `popover`.',
      a: "| Modifier | Behaviour |\n|---|---|\n| `.sheet` | A card; presenter stays visible. Resizable with `.presentationDetents` |\n| `.fullScreenCover` | Covers everything. Right for onboarding or an immersive flow |\n| `.popover` | Anchored on iPad and Mac; falls back to a sheet on iPhone unless you set `.presentationCompactAdaptation` |\n\n=> Prefer the `item:` variants over `isPresented:` plus a separate state value. They make it impossible to present with stale or missing data." },

    { d: 'hard', q: 'Why is `.sheet(item:)` better than `.sheet(isPresented:)`?',
      a: "With `isPresented` you keep **two pieces of state**, a boolean and the thing being shown, and they can disagree.\n\n! Set the boolean before the value and the sheet presents with `nil` or stale content. A real and common crash.\n\n`.sheet(item:)` takes an optional `Identifiable`:\n+ Shown exactly when the value is non-nil\n+ The closure receives the **unwrapped** value\n+ One source of truth, **no invalid state representable**\n\n```bad  two pieces of state that can disagree\n@State private var showingDetail = false\n@State private var selected: Post?\n\nButton(\"Open\") {\n    showingDetail = true            // selected may still be nil\n}\n.sheet(isPresented: $showingDetail) {\n    DetailView(post: selected!)     // crash waiting to happen\n}\n```\n\n```good  one source of truth, invalid state unrepresentable\n@State private var selected: Post?\n\nButton(\"Open\") { selected = post }\n.sheet(item: $selected) { post in\n    DetailView(post: post)          // non-optional, guaranteed\n}\n```" },

    { d: 'hard', q: 'How would you implement deep linking with `NavigationStack`?',
      a: "```\n.onOpenURL { url in\n    guard let route = Router.parse(url) else { return }\n    path = [route]              // or append for a deeper stack\n}\n```\n\nThe design points are the same as UIKit:\n- Decide whether to **rebuild** the stack or navigate from current state\n- **Dismiss any presented sheet first**, since a modal blocks a push\n- Handle an auth-required route by queueing it and replaying after login\n\n! And never crash on a malformed URL. Parsing returns an optional for a reason." },

    { d: 'medium', q: 'What is `NavigationSplitView` for?',
      a: "Two and three column layouts on iPad and Mac, **adapting to a stack on compact iPhone automatically**.\n\nYou give it `sidebar`, optional `content` and `detail` closures, plus a `columnVisibility` binding.\n\n! The common mistake is building this from `NavigationStack` and size classes by hand.\n\n=> It handles the adaptation, the column widths and the sidebar toggle for free, which is what makes one codebase feel native on both platforms." },

    { d: 'hard', q: 'How do you restore navigation state across launches?',
      a: "Make the route type `Codable`, persist the path, restore on launch.\n\n```\nif let data = try? JSONEncoder().encode(path.codable) { }\n```\n\n- With a typed array this is trivial\n- `NavigationPath` exposes `codable` for the same purpose\n- `@SceneStorage` is the system-supported place to put it\n\n=> The payoff is the same as UIKit: **one typed route serves deep links, restoration, push taps and widget taps.**" }
  ],
  quiz: [
    { d: 'medium', q: 'NavigationStack improved on NavigationView chiefly by:', choices: ['Faster rendering', 'Representing the whole stack as a data path you can mutate', 'Supporting more than three columns', 'Removing the need for destinations'], correct: 1,
      why: 'Programmatic navigation, deep linking and restoration all become array manipulation instead of scattered isActive bindings.' },
    { d: 'hard', q: 'A navigationDestination declared inside a ForEach row often fails because:', choices: ['ForEach cannot contain modifiers', 'It may not be rendered when the push happens; destinations belong near the root', 'It needs to be Hashable', 'Lazy containers disable navigation'], correct: 1,
      why: 'SwiftUI warns that only the destination closest to the root is used. Register destinations once on the stack.' },
    { d: 'medium', q: '`.sheet(item:)` beats `.sheet(isPresented:)` because it:', choices: ['Animates better', 'Makes an invalid presented-with-no-data state unrepresentable', 'Supports detents', 'Works on iPad'], correct: 1,
      why: 'A separate boolean and value can disagree, which is how sheets present with stale or missing content.' },
    { d: 'easy', q: 'To dismiss the current presentation from inside a child view you use:', choices: ['@Environment(\\.dismiss)', 'presentationMode.wrappedValue', 'NavigationStack.pop()', '@Binding var isPresented'], correct: 0,
      why: 'It works for both pushes and modals, and the child does not need to know how it was presented.' },
    { d: 'hard', q: 'A typed [Route] array is usually preferable to NavigationPath because it is:', choices: ['Faster', 'Codable for free, exhaustively switchable, and easier to test', 'Required by NavigationStack', 'The only option on iOS 17'], correct: 1,
      why: 'NavigationPath earns its keep only when routes genuinely span types you do not control.' },
    { d: 'medium', q: 'Two and three column iPad layouts that adapt to iPhone come from:', choices: ['NavigationStack plus size classes', 'NavigationSplitView', 'HSplitView', 'TabView'], correct: 1,
      why: 'It handles adaptation, column widths and the sidebar toggle, which is a lot to rebuild by hand.' }
  ]
});

IPREP.addTopic({
  id: 'swiftui-animation', domain: 'swiftui',
  title: 'Animation & Transitions',
  summary: 'Implicit versus explicit, transactions, matched geometry, and why animations silently do nothing.',
  cards: [
    { d: 'easy', q: 'What is the difference between implicit and explicit animation?',
      a: "| | Implicit | Explicit |\n|---|---|---|\n| Written as | `.animation(.spring, value: isOpen)` | `withAnimation { isOpen.toggle() }` |\n| Scope | The view it modifies | **Every view affected by that state change** |\n| Trigger | That value changing | That mutation |\n\n=> Use explicit when one action should animate several places. Use implicit when a single view should always animate a specific property." },

    { d: 'hard', q: 'Why does `.animation()` require a `value:` parameter now?',
      a: "The old `.animation(_)` animated **any** change flowing through that view, including ones you never intended.\n\n! Unpredictable as hierarchies grew, which is exactly why it was deprecated.\n\n=> `.animation(_, value:)` scopes it to changes of a specific equatable value, so the trigger is **explicit and local**.\n\nFor several triggers: use several modifiers, or reach for `withAnimation` at the source." },

    { d: 'hard', q: 'What is `matchedGeometryEffect` and what does it need to work?',
      a: "It interpolates between two views sharing an `id` in a common `@Namespace`, producing a hero transition.\n\n```\n@Namespace private var ns\n.matchedGeometryEffect(id: item.id, in: ns)   // on both views\n```\n\nRequirements:\n- The same id and the same namespace\n- The change must be inside `withAnimation`\n! **Only one** view with that id should be the source at a time\n\n=> That last one is the most common failure: both views existing simultaneously makes the effect jump." },

    { d: 'medium', q: 'What is a `transition` and how does it differ from an animation?',
      a: "| | Transition | Animation |\n|---|---|---|\n| Describes | How a view is **inserted or removed** | How a **property changes** on a view that stays |\n| Examples | `.opacity`, `.slide`, `.scale` | Position, colour, size |\n\n! `.transition(.slide)` only takes effect when the view is actually added to or removed from the hierarchy, **and** only when that change is animated.\n\n=> A transition on a view that merely changes size does nothing. That is the usual reason it 'does not work'." },

    { d: 'hard', q: 'Give three reasons an animation silently does nothing.',
      a: "1. **The change was not animated.** A transition or geometry effect needs `withAnimation` or an `.animation(_, value:)` covering it\n2. **Identity changed.** The view was replaced, not updated, so there is nothing to interpolate\n3. **The property is not `Animatable`.** SwiftUI interpolates values conforming to `VectorArithmetic`; a custom property needs `animatableData`\n\n=> A fourth: the modifier is attached **above** the thing that changes, so the change never flows through it." },

    { d: 'medium', q: 'What is `Animatable` and when do you implement it?',
      a: "A protocol with an `animatableData` property SwiftUI interpolates frame by frame.\n\n```\nstruct Arc: Shape {\n    var angle: Double\n    var animatableData: Double {\n        get { angle } set { angle = newValue }\n    }\n}\n```\n\n=> Implement it when animating something SwiftUI cannot interpolate itself, most often a `Shape` driven by a number, or a value counting up.\n\n! Without it, the shape **jumps** to its final value instead of sweeping." },

    { d: 'medium', q: 'What is a `Transaction`?',
      a: "The context carried alongside a state change, holding the animation to use and flags such as `disablesAnimations`. `withAnimation` is sugar for setting one.\n\n```\n.transaction { $0.animation = nil }   // strip animation from a subtree\n```\n\n+ How you stop one part of the screen animating while everything else does\n! Use sparingly. It is a scalpel, and it makes behaviour **non-local**" },

    { d: 'medium', q: 'How do spring animations work, and which do you pick?',
      a: "`.spring(duration:bounce:)` is the modern, intuitive spelling.\n\n| Parameter | Means |\n|---|---|\n| `duration` | Roughly how long it takes to settle |\n| `bounce` | 0 for no overshoot, 1 for very bouncy |\n\nPresets: `.smooth` (no bounce), `.snappy` (slight), `.bouncy`.\n\n=> Springs are **interruptible and preserve velocity**, which is why they feel right for gesture-driven UI where a linear ease looks wrong when interrupted." },

    { d: 'hard', q: 'What are `PhaseAnimator` and `KeyframeAnimator`?',
      a: "Both arrived in iOS 17, replacing chained `asyncAfter` calls for multi-step animation.\n\n| | `PhaseAnimator` | `KeyframeAnimator` |\n|---|---|---|\n| Model | A sequence of **discrete phases** | **Multiple properties on independent timelines** |\n| Good for | A pulsing badge, a shake | A genuinely choreographed moment |\n| Looping | Yes, or on a trigger | Per keyframe track |\n\n=> With `KeyframeAnimator`, scale, rotation and offset can each have their own keyframes." },

    { d: 'medium', q: 'How do you respect Reduce Motion?',
      a: "```\n@Environment(\\.accessibilityReduceMotion) private var reduceMotion\n.animation(reduceMotion ? nil : .spring, value: state)\n```\n\n=> The rule is to remove or simplify **motion**, particularly large translations, scaling and parallax. **Not** to remove all feedback.\n\n! A cross-fade in place of a slide is usually the right substitution: the user still sees that something changed, without the vestibular trigger." }
  ],
  quiz: [
    { d: 'medium', q: '`.animation(_)` without a value: was deprecated because it:', choices: ['Was slow', 'Animated any change flowing through the view, including unintended ones', 'Did not support springs', 'Broke on iPad'], correct: 1,
      why: 'Scoping to a specific equatable value makes the trigger explicit and local.' },
    { d: 'hard', q: 'matchedGeometryEffect jumps instead of interpolating. Likely cause:', choices: ['Wrong animation curve', 'Both views with that id exist as sources at the same time', 'Missing .transition', 'The namespace is @State'], correct: 1,
      why: 'Only one view should be the source for an id at a time, and the change must happen inside withAnimation.' },
    { d: 'medium', q: 'A .transition has no effect on a view that only changes size because transitions apply to:', choices: ['Colour changes', 'Insertion and removal from the hierarchy', 'Layout priority', 'Gesture states'], correct: 1,
      why: 'Property changes on a persisting view are animations, not transitions.' },
    { d: 'hard', q: 'To animate a custom Shape driven by an angle you must implement:', choices: ['Equatable', 'animatableData from Animatable', 'Hashable', 'a Transaction'], correct: 1,
      why: 'Without it SwiftUI cannot interpolate the value and the shape jumps to its final state.' },
    { d: 'medium', q: 'Choreographing several properties on independent timelines is done with:', choices: ['PhaseAnimator', 'KeyframeAnimator', 'TimelineView', 'withAnimation'], correct: 1,
      why: 'PhaseAnimator steps through discrete phases; KeyframeAnimator gives each property its own keyframe track.' },
    { d: 'easy', q: 'Respecting Reduce Motion means:', choices: ['Removing all feedback', 'Replacing large motion with a simpler cue such as a cross-fade', 'Disabling the feature', 'Slowing every animation down'], correct: 1,
      why: 'The user should still perceive the change, without translation, scaling or parallax triggering the vestibular response.' }
  ]
});

IPREP.addTopic({
  id: 'swiftui-interop', domain: 'swiftui',
  title: 'UIKit Interop & Choosing Between Them',
  summary: 'Representables, hosting controllers, coordinators, and an honest account of when to use which.',
  cards: [
    { d: 'medium', q: 'What is `UIViewRepresentable` and what is its lifecycle?',
      a: "```\nfunc makeUIView(context: Context) -> MKMapView      // runs ONCE\nfunc updateUIView(_ view: MKMapView, context: Context)  // runs on every change\nfunc makeCoordinator() -> Coordinator\n```\n\n| Method | Runs | Rule |\n|---|---|---|\n| `makeUIView` | Once | Do all allocation here |\n| `updateUIView` | Whenever a dependency changes | Must be **idempotent** |\n\n! Creating objects or adding observers in `updateUIView` is a leak. It runs more often than you expect." },

    { d: 'hard', q: 'What is the `Coordinator` for?',
      a: "It is the **object** that adopts UIKit delegate and target-action protocols, since a SwiftUI `View` **struct** cannot.\n\n- Created once by `makeCoordinator`\n- Reachable as `context.coordinator`\n- Also where you bridge callbacks **back** into SwiftUI, usually via a `Binding` or closure\n\n```\nclass Coordinator: NSObject, UITextFieldDelegate {\n    var text: Binding<String>\n    func textFieldDidChangeSelection(_ tf: UITextField) {\n        text.wrappedValue = tf.text ?? \"\"\n    }\n}\n```" },

    { d: 'medium', q: 'What is `UIHostingController` and where do you use it?',
      a: "A `UIViewController` hosting a SwiftUI view. **The other direction**: SwiftUI inside a UIKit app.\n\n- Push it, present it, or embed it as a child\n- The main vehicle for **incremental adoption**\n\nTwo practical notes:\n- Use `sizingOptions` (iOS 16+) so it self-sizes to its content when embedded\n- Set `view.backgroundColor = .clear` to sit over UIKit content, since the hosting view is opaque by default" },

    { d: 'hard', q: 'A representable has the wrong size in a SwiftUI layout. What is happening?',
      a: "SwiftUI asks the representable for a size, and by default uses the UIKit view's **intrinsic content size**.\n\n! A view with no intrinsic size, such as a bare `MKMapView` or `UIScrollView`, reports nothing useful and **collapses or fills greedily**.\n\nFixes:\n- Implement `sizeThatFits(_:uiView:context:)` (iOS 16+) to answer the proposal explicitly\n- Give the UIKit view real hugging and compression-resistance priorities\n- Wrap it in a `.frame()` so a parent supplies the size" },

    { d: 'medium', q: 'How do you share a view model between UIKit and SwiftUI screens?',
      a: "Keep the model layer **framework-agnostic** and let both consume it.\n\n| Model kind | UIKit subscribes via |\n|---|---|\n| `ObservableObject` | Its Combine publisher |\n| `@Observable` | `withObservationTracking` |\n\n! The important discipline: **the model must not import UIKit or SwiftUI.**\n\n=> If it does, it is a view model for one framework, and you will end up maintaining two." },

    { d: 'hard', q: 'Where is SwiftUI still genuinely weaker than UIKit?',
      a: "An honest list, which is what interviewers want rather than advocacy:\n\n! **Complex collection layouts.** Compositional layout still expresses things `LazyVGrid` cannot\n! **Fine-grained scroll control.** Much better in iOS 17, but precise offset manipulation and custom paging still favour UIKit\n! **Text editing.** `TextEditor` remains limited next to `UITextView` for attributed text, input accessory views and selection\n! **Deep customisation of system controls**, where you often wrap the UIKit equivalent anyway\n! **Debugging.** Layout problems are harder to inspect than with the view debugger\n! Raising the deployment target for the newest APIs is a real cost" },

    { d: 'medium', q: 'Where is SwiftUI clearly better?',
      a: "+ **Far less code** for the same screen, especially forms, settings and list-shaped UI\n+ **State-driven rendering**, which removes a whole class of 'view and model disagree' bugs\n+ **Previews**, including multiple devices and dynamic type sizes at once\n+ **Dark mode, dynamic type and accessibility** largely for free\n+ **Multiplatform**: the same view code on iPad, Mac, watch and TV\n+ **Animations and transitions** at a fraction of the UIKit effort" },

    { d: 'hard', q: 'How would you adopt SwiftUI incrementally in a large UIKit app?',
      a: "**Bottom-up, at leaf boundaries.**\n\n1. Build **new, self-contained screens** in SwiftUI, hosted with `UIHostingController`, so navigation stays in UIKit\n2. Expose small reusable SwiftUI components to the UIKit side through hosting controllers, so the design system converges\n3. Keep the **model and navigation layers framework-agnostic**, so both sides share them\n4. Move **navigation last**. It is the hardest interop seam\n\n=> Start with a genuinely simple screen, so the first attempt teaches the team without a deadline attached." },

    { d: 'medium', q: 'What is `UIViewControllerRepresentable` for?',
      a: "The same contract as `UIViewRepresentable`, but for a whole controller: `makeUIViewController`, `updateUIViewController`, and a coordinator.\n\nYou need it for anything that is fundamentally a controller:\n- `PHPickerViewController`, `UIImagePickerController`\n- `SFSafariViewController`\n- `MFMailComposeViewController`, `UIActivityViewController`\n\n=> Most 'system picker in SwiftUI' answers are this, though several now have native equivalents such as `PhotosPicker` and `ShareLink`." },

    { d: 'hard', q: 'What are the performance differences worth knowing?',
      a: "| | SwiftUI | UIKit |\n|---|---|---|\n| Per-update cost | Diffing, which a fat observable object can multiply | Precise manual invalidation |\n| Whole bug classes avoided | Reuse bugs, manual invalidation | You own them |\n| Lower floor for extreme cases | No | **Yes** |\n\n=> For typical app UI they are comparable. For very high-frequency updates or very large custom-laid-out collections, UIKit still gives you a lower floor.\n\n! Measure rather than assume." }
  ],
  quiz: [
    { d: 'medium', q: '`updateUIView` must be idempotent because it:', choices: ['Runs on a background thread', 'Runs whenever a dependency changes, more often than you expect', 'Runs only once', 'Cannot access the coordinator'], correct: 1,
      why: 'Creating objects or adding observers there leaks, because it is called repeatedly for the same view.' },
    { d: 'medium', q: 'The Coordinator exists because:', choices: ['SwiftUI views are structs and cannot be UIKit delegates', 'It improves performance', 'UIKit requires a singleton', 'It manages the view lifecycle'], correct: 0,
      why: 'It is a class that adopts the delegate protocols and bridges callbacks back through bindings or closures.' },
    { d: 'hard', q: 'A wrapped MKMapView collapses to zero height. The most direct fix is:', choices: ['Add .padding()', 'Implement sizeThatFits, or give it an explicit frame', 'Use UIViewControllerRepresentable', 'Set clipsToBounds'], correct: 1,
      why: 'It has no useful intrinsic content size, so SwiftUI has nothing to answer the proposal with.' },
    { d: 'medium', q: 'To show SwiftUI inside an existing UIKit navigation stack you use:', choices: ['UIViewRepresentable', 'UIHostingController', 'UIViewControllerRepresentable', 'A storyboard reference'], correct: 1,
      why: 'It is a UIViewController hosting a SwiftUI view, and it is the main vehicle for incremental adoption.' },
    { d: 'hard', q: 'Which is still a genuine SwiftUI weakness worth naming in an interview?', choices: ['Dark mode support', 'Rich text editing and precise scroll control', 'Animations', 'Accessibility'], correct: 1,
      why: 'TextEditor remains limited next to UITextView, and fine offset control still favours UIKit despite iOS 17 improvements.' },
    { d: 'medium', q: 'A shared view model between UIKit and SwiftUI screens must:', choices: ['Subclass UIViewController', 'Not import UIKit or SwiftUI', 'Be a singleton', 'Use Combine only'], correct: 1,
      why: 'The moment it imports a UI framework it belongs to one side, and you end up maintaining two.' }
  ]
});
