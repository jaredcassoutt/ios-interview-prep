/* Foundation Data Structures — 5 topics */

IPREP.addTopic({
  id: 'arrays', domain: 'foundation',
  title: 'Array & NSArray',
  summary: 'Ordered storage: complexity, growth, mutation, and the Foundation counterparts.',
  cards: [
    { d: 'easy', q: 'Give the complexity of the common Array operations.',
      a: "| Operation | Cost |\n|---|---|\n| `subscript(i)` read or write | **O(1)** |\n| `append` | **Amortised O(1)**, O(n) on the resize |\n| `insert(at:)` / `remove(at:)` | **O(n)**, everything after shifts |\n| `contains` / `firstIndex(of:)` | **O(n)** linear scan |\n| `sort` | **O(n log n)**, introsort |\n| `reserveCapacity` | O(n) once, then no reallocation |\n\n=> Repeated insertion at the front is the accidental O(n^2) people ship most often." },

    { d: 'medium', q: 'How does Array grow, and why is append amortised O(1)?',
      a: "When the buffer fills, Array allocates roughly **double** the capacity, copies, and frees the old buffer.\n\n- A single append can be O(n) on the resize\n- Doubling means n appends cost O(n) **total**\n- So the average is constant\n\n=> `reserveCapacity(n)` before a known-size fill removes every intermediate reallocation. Worth doing whenever you are building a large array in a loop." },

    { d: 'medium', q: 'What is the difference between NSArray and NSMutableArray, and how does it map to Swift?',
      a: "| | Foundation | Swift |\n|---|---|---|\n| Type kind | Class, reference | Struct, value |\n| Immutable | `NSArray` | `let` |\n| Mutable | `NSMutableArray` | `var` |\n| Defensive copy needed | **Yes** | No |\n\n! `NSMutableArray` subclasses `NSArray`, so the type alone does not guarantee immutability. An `NSArray` property should be `copy`.\n\n=> Swift collapses both into one value type. Value semantics remove the need for the defensive copy entirely." },

    { d: 'hard', q: 'Why is `NSArray` declared `@property (copy)` and what would `strong` break?',
      a: "Because a caller can pass an `NSMutableArray` where an `NSArray` is expected.\n\n- With `strong`, you store **their** instance, and they can mutate your state afterwards\n- With `copy`, `-copy` on a mutable array returns an immutable snapshot, so your invariant holds\n\n! The subtlety: `-copy` is **shallow**. The elements are still shared references.\n\n=> Use `-mutableCopy` or a deep copy if the elements are themselves mutable." },

    { d: 'medium', q: 'What is the difference between `map`, `compactMap` and `flatMap`?',
      a: "| Function | Does | Example |\n|---|---|---|\n| `map` | Transform one to one | `[1,2].map(String.init)` gives `[\"1\",\"2\"]` |\n| `compactMap` | Transform, then drop nils | `[String]` to `[Int]`, discarding failures |\n| `flatMap` | Transform to sequences, then concatenate | `[[1,2],[3]]` gives `[1,2,3]` |\n\n=> `flatMap` over optionals was renamed `compactMap` in Swift 4.1, precisely because the two meanings were confusing." },

    { d: 'hard', q: 'What is the performance trap with `filter` then `first`?',
      a: "`array.filter { p($0) }.first` builds an **entire intermediate array** before taking one element.\n\n! O(n) work and O(n) allocation, even if the match is at index 0.\n\n```\narray.first(where: p)          // short-circuits, no allocation\narray.lazy.map{}.filter{}.first // lazy chain, no intermediates\n```\n\n=> The general rule: chained `map` and `filter` on arrays are **eager**, and each step allocates. `.lazy` makes the chain pull-based." },

    { d: 'medium', q: 'How do you remove elements from an array while iterating it?',
      a: "**Do not mutate while iterating.** Use the in-place removal:\n\n```\narray.removeAll { $0.isExpired }   // one pass, O(n)\n```\n\nIf you need the removed elements too:\n\n```\nlet (keep, drop) = array.reduce(into: ([T](), [T]())) { acc, x in\n    x.isExpired ? acc.1.append(x) : acc.0.append(x)\n}\n```\n\n! Iterating indices backwards with `remove(at:)` also works but is O(n^2)." },

    { d: 'hard', q: 'What is `ContiguousArray` and when would you use it?',
      a: "`Array` may be backed by an `NSArray` when bridged from Objective-C, so element access has to check for that. `ContiguousArray` **guarantees native storage** and skips the check.\n\n+ Measurably faster in a tight loop when elements are classes or `@objc` protocols\n! No difference at all for pure Swift value types, which are already contiguous\n\n=> Use it only in the bridged case, after measuring. Otherwise it is noise." },

    { d: 'medium', q: 'How do you get both index and element while iterating, and what is the trap?',
      a: "`for (i, x) in array.enumerated()`.\n\n! `i` is the **offset**, not the index. Identical for `Array`, wrong for `ArraySlice` or any collection whose indices do not start at zero.\n\nA slice keeps its parent's indices, so `slice[0]` may trap.\n\n=> Use `array.indices` or `zip(array.indices, array)` when you need real indices." },

    { d: 'hard', q: 'What is an ArraySlice and why is holding one dangerous?',
      a: "A **view over the parent's buffer** with no copy, which makes slicing O(1).\n\n! It keeps the **entire parent buffer alive.** Slicing 10 elements out of a million-element array and storing the slice retains all million\n! Slice indices are inherited from the parent, so they do not start at zero\n\n=> When you want to keep a slice, materialise it: `Array(slice)`." }
  ],
  quiz: [
    { d: 'easy', q: 'Inserting at the front of a Swift Array of n elements is:', choices: ['O(1)', 'O(log n)', 'O(n)', 'Amortised O(1)'], correct: 2,
      why: 'Every subsequent element shifts one position, so the cost is linear. Repeated front insertion is a common accidental O(n^2).' },
    { d: 'medium', q: '`array.filter(p).first` versus `array.first(where: p)`:', choices: ['Identical performance', 'filter().first builds a full intermediate array; first(where:) short-circuits', 'first(where:) is O(n log n)', 'filter() is lazy by default'], correct: 1,
      why: 'Array filter is eager and allocates. first(where:) stops at the first match with no allocation.' },
    { d: 'medium', q: 'An NSArray property is declared `copy` rather than `strong` because:', choices: ['copy is faster', 'A caller could pass an NSMutableArray and mutate your state later', 'strong causes retain cycles', 'NSArray cannot be retained'], correct: 1,
      why: 'NSMutableArray is a subclass, so the type alone does not guarantee immutability. copy takes an immutable snapshot.' },
    { d: 'hard', q: 'You slice 10 elements from a 1,000,000-element array and store the ArraySlice. Memory held:', choices: ['10 elements', 'The whole 1,000,000-element buffer', 'Nothing, slices are lazy views that free the parent', 'Depends on the element type'], correct: 1,
      why: 'A slice references the parent buffer. Wrap it in Array() to copy out just what you need.' },
    { d: 'medium', q: 'Which turns `["1","x","3"]` into `[1,3]`?', choices: ['map(Int.init)', 'compactMap(Int.init)', 'flatMap { [Int($0)] }', 'filter(Int.init)'], correct: 1,
      why: 'map yields [Int?], compactMap drops the nils and gives [Int].' },
    { d: 'hard', q: 'Why does `enumerated()` misbehave on an ArraySlice?', choices: ['It is not implemented for slices', 'It yields offsets from zero, but slice indices inherit the parent range', 'It copies the slice', 'It reverses the order'], correct: 1,
      why: 'Using the offset as an index into a slice indexes the wrong element or traps. Use indices or zip(collection.indices, collection).' }
  ]
});

IPREP.addTopic({
  id: 'dicts', domain: 'foundation',
  title: 'Dictionary, Hashable & NSDictionary',
  summary: 'Hash tables in Swift and Foundation: complexity, hashing contracts, and the classic bugs.',
  cards: [
    { d: 'easy', q: 'Complexity of Dictionary operations, and what makes them that fast?',
      a: "Lookup, insert and delete are **average O(1)**, worst case O(n) when every key collides.\n\nWhy:\n- The key is hashed to a bucket index\n- Swift uses open addressing with linear probing over a power-of-two table\n- It grows and rehashes when the load factor rises, an O(n) cost amortised across insertions\n\n=> The O(n) worst case is not theoretical: it is exactly what a hash-flooding attack produces, which is why Swift randomises its seed." },

    { d: 'medium', q: 'State the Hashable contract.',
      a: "**If `a == b` then `a.hashValue == b.hashValue`.** The converse need not hold; equal hashes for unequal values is a collision, which is legal and merely slower.\n\nTwo rules follow:\n- `hash(into:)` must feed **exactly** the properties `==` compares, no more and no fewer\n- The hash must stay stable for as long as the value is in a set or used as a key\n\n=> That second rule is why mutable reference types make dangerous keys." },

    { d: 'hard', q: 'What breaks if you mutate an object after using it as a dictionary key?',
      a: "The entry sits in the bucket its **old** hash chose, while lookups probe the new one.\n\n! Lookups miss\n! The entry is unreachable but still occupying space\n! `count` still includes it\n! No diagnostic, no crash. The dictionary is silently corrupt\n\n=> The strongest argument for value-type keys. If you must use a class, hash only immutable identity such as a `let id`." },

    { d: 'medium', q: 'Why does Swift randomise hash seeds per process, and what does it break?',
      a: "**Defence against hash flooding**, where an attacker sends keys engineered to collide and turns your O(1) into O(n).\n\n! The consequence: **iteration order of a Dictionary or Set is not stable across runs**\n\n=> Any test or output depending on dictionary order passes locally and fails in CI. Sort the keys whenever order matters." },

    { d: 'medium', q: 'What is the difference between `dict[key]` and `dict[key, default:]`?',
      a: "```\ncounts[word, default: 0] += 1                    // one lookup, mutates in place\ncounts[word] = (counts[word] ?? 0) + 1           // two lookups, may copy\n```\n\n- `dict[key]` returns `Value?`\n- `dict[key, default: v]` returns non-optional **and** is a valid in-place mutation target\n\n=> The default subscript goes through the `_modify` accessor, so for a COW value like an array it mutates the stored buffer rather than copying it out and back." },

    { d: 'hard', q: 'What is the copy-on-write trap with `dict[key]?.append(x)`?',
      a: "Modern Swift handles `dict[key]?.append(x)` in place via the modify accessor. This pattern definitely copies:\n\n```\nvar a = dict[key] ?? []\na.append(x)\ndict[key] = a          // full copy out and back\n```\n\n=> The safe idiom is `dict[key, default: []].append(x)`, which mutates the stored buffer directly." },

    { d: 'medium', q: 'How do NSDictionary keys differ from Swift Dictionary keys?',
      a: "| | NSDictionary | Swift Dictionary |\n|---|---|---|\n| Keys are | **Copied** | Stored by value |\n| Requirement | `NSCopying` | `Hashable` |\n| Values are | Retained, not copied | Stored by value |\n\n=> `NSDictionary` copies keys defensively so a mutable key cannot be changed under the dictionary. Swift's value-type keys make that unnecessary." },

    { d: 'hard', q: 'How do you write `hash(into:)` correctly for a custom type?',
      a: "```\nstruct User: Hashable {\n    let id: UUID\n    var name: String\n    static func == (a: User, b: User) -> Bool { a.id == b.id }\n    func hash(into hasher: inout Hasher) { hasher.combine(id) }\n}\n```\n\n! `==` compares only `id`, so `hash(into:)` must combine only `id`. Adding `name` would let two equal users hash differently and break the contract\n! Never implement `hashValue` directly; `Hasher` handles seeding and mixing" },

    { d: 'medium', q: 'When does Swift synthesise Hashable and Equatable for you?',
      a: "+ A **struct** whose stored properties are all Hashable\n+ An **enum** whose associated values are all Hashable\n! Not for classes, because value versus identity equality is a design decision only you can make\n! Not if you write a custom `==`; then you must write `hash(into:)` to match\n\n=> Just declare the conformance and the compiler does the rest for the two supported cases." },

    { d: 'hard', q: 'How would you build an LRU cache, and what data structures do you need?',
      a: "Two structures, because neither alone gives O(1) on both operations.\n\n| Need | Structure |\n|---|---|\n| O(1) lookup | Hash map, key to node |\n| O(1) recency reordering | Doubly linked list |\n\n- On access: unlink the node, move it to the head\n- On insert past capacity: drop the tail and **remove its key from the map**\n\n=> On iOS, reach for `NSCache` first. It is thread-safe and evicts under pressure. Write this by hand only when you need deterministic eviction." }
  ],
  quiz: [
    { d: 'medium', q: 'The Hashable contract requires:', choices: ['Equal hashes imply equal values', 'Equal values imply equal hashes', 'Hashes must be unique', 'Hashes must be sorted'], correct: 1,
      why: 'Equality forces hash equality. The reverse is a collision, which is allowed and only costs performance.' },
    { d: 'hard', q: 'You mutate a hashed property of a class instance already used as a dictionary key. The entry:', choices: ['Rehashes automatically', 'Becomes unreachable but still counted', 'Is removed', 'Throws an exception'], correct: 1,
      why: 'It sits in the bucket chosen by the old hash while lookups probe the new one. Silent corruption, no diagnostic.' },
    { d: 'medium', q: 'Dictionary iteration order in Swift is:', choices: ['Insertion order', 'Sorted by key', 'Unspecified and varies between process runs', 'Sorted by hash value, stable across runs'], correct: 2,
      why: 'Per-process seed randomisation defends against hash flooding but makes order non-reproducible. Sort explicitly when order matters.' },
    { d: 'medium', q: 'Best way to increment a counter in a dictionary:', choices: ['counts[w] = (counts[w] ?? 0) + 1', 'counts[w, default: 0] += 1', 'if counts[w] != nil { counts[w]! += 1 }', 'counts.updateValue(counts[w]! + 1, forKey: w)'], correct: 1,
      why: 'The default subscript mutates in place through the modify accessor with a single lookup.' },
    { d: 'hard', q: 'NSDictionary copies its keys because:', choices: ['Copying is faster than retaining', 'A mutable key could otherwise be changed after insertion, corrupting the table', 'Keys must be immutable value types', 'ARC requires it'], correct: 1,
      why: 'That is why keys must conform to NSCopying. Swift Dictionary avoids the problem by using value-type keys.' },
    { d: 'easy', q: 'Swift synthesises Hashable automatically for:', choices: ['Any class', 'A struct whose stored properties are all Hashable', 'Any type with an id property', 'Only enums without associated values'], correct: 1,
      why: 'Structs and enums get synthesis. Classes do not, because value versus identity equality is your design decision.' }
  ]
});

IPREP.addTopic({
  id: 'sets', domain: 'foundation',
  title: 'Set, Set Algebra & NSSet',
  summary: 'Unordered unique collections, the algebra operations, and where they beat arrays.',
  cards: [
    { d: 'easy', q: 'When should you reach for a Set instead of an Array?',
      a: "When you need **membership testing** or **uniqueness**, and order does not matter.\n\n| | Array | Set |\n|---|---|---|\n| `contains` | O(n) | **O(1) average** |\n| Order | Preserved | None |\n| Duplicates | Allowed | Removed |\n\n=> The classic refactor: a loop calling `array.contains(x)` inside another loop over n items is O(n^2). Converting the inner collection to a Set makes it O(n)." },

    { d: 'medium', q: 'Name the set algebra operations and their meaning.',
      a: "| Operation | Returns |\n|---|---|\n| `union` | In either |\n| `intersection` | In both |\n| `subtracting` | In the first, not the second |\n| `symmetricDifference` | In exactly one |\n| `isSubset(of:)` / `isSuperset(of:)` / `isDisjoint(with:)` | A Bool |\n\n- Each has a mutating form: `formUnion`, `formIntersection`, `subtract`, `formSymmetricDifference`\n\n=> All are roughly O(n) in the smaller set, versus the O(n*m) you would hand-write with arrays." },

    { d: 'medium', q: 'How would you diff two lists of items for a table view update using sets?',
      a: "```\nlet inserted = new.subtracting(old)\nlet deleted  = old.subtracting(new)\nlet common   = old.intersection(new)\n```\n\n+ Insert and delete in O(n)\n! No **moves**, and no ordering\n\n=> Sets are the right first tool when position does not matter. Real diffing with moves needs `UICollectionViewDiffableDataSource` or a Myers diff." },

    { d: 'hard', q: 'What does it mean that Set is unordered, in practice?',
      a: "Iteration order depends on hash values and the per-process seed, so **it changes between runs**.\n\n! Never rely on set order in a UI\n! Never write a test asserting an exact iteration sequence\n\nIf you need uniqueness **and** order:\n- An array plus a Set for the membership check\n- `NSOrderedSet`, or `OrderedSet` from swift-collections" },

    { d: 'medium', q: 'How is NSSet different from Swift Set?',
      a: "| | NSSet | Swift Set |\n|---|---|---|\n| Kind | Class, reference | Struct, value |\n| Elements | `id`, hashed via `-hash` / `-isEqual:` | `Hashable` generic |\n| Mutable variant | `NSMutableSet` | `var` |\n| Counting variant | **`NSCountedSet`** | No equivalent |\n\n=> `NSCountedSet` is the one with no Swift standard library counterpart. It is a bag that tracks how many times each object was added." },

    { d: 'hard', q: 'When would you use NSCountedSet?',
      a: "When you need **multiplicity**, not just membership: word frequency, counting tag occurrences, reference counting your own resources.\n\n```\n[set countForObject:x]\n```\n\n=> In pure Swift you would write `Dictionary<T, Int>` with `counts[x, default: 0] += 1`, which is clearer. `NSCountedSet` mostly shows up in older Objective-C code." },

    { d: 'medium', q: 'What does `Set` require of its Element, and why?',
      a: "`Hashable`, which implies `Equatable`.\n\n- The **hash** picks the bucket\n- **Equality** resolves collisions inside that bucket\n\n! The same mutation hazard as dictionary keys applies. Since `Set` gives you no way to get a mutable reference to a stored element, the risk exists only for reference types." },

    { d: 'hard', q: 'You need to deduplicate an array while preserving order. How?',
      a: "```\nvar seen = Set<T>()\nlet unique = array.filter { seen.insert($0).inserted }\n```\n\n`insert` returns `(inserted: Bool, memberAfterInsert: T)`, so this is one pass, O(n), and order is preserved.\n\n! `Array(Set(array))` is shorter but **loses order**. That is the answer interviewers are checking you do not give when order is specified." },

    { d: 'medium', q: 'What is the memory trade-off of a Set versus an Array?',
      a: "| | Array | Set |\n|---|---|---|\n| Storage | Contiguous, growth slack only | Sparse table below a load factor |\n| Cache locality | Good | Poorer |\n| Membership | O(n) | O(1) average |\n\n=> For small n, roughly under 20 elements, a linear array scan is often genuinely **faster**, because hashing plus a pointer chase costs more than scanning twenty contiguous elements already in cache." }
  ],
  quiz: [
    { d: 'easy', q: 'Checking membership in a 10,000 element collection. Array vs Set:', choices: ['Both O(1)', 'Array O(1), Set O(n)', 'Array O(n), Set average O(1)', 'Both O(log n)'], correct: 2,
      why: 'The Set hashes straight to a bucket. The Array must scan linearly.' },
    { d: 'medium', q: 'Which produces elements present in exactly one of two sets?', choices: ['union', 'intersection', 'subtracting', 'symmetricDifference'], correct: 3,
      why: 'symmetricDifference is the XOR of the two sets.' },
    { d: 'medium', q: 'Deduplicating an array while preserving order is best done with:', choices: ['Array(Set(array))', 'array.sorted().unique()', 'A Set for seen-tracking inside a filter', 'array.reduce(Set())'], correct: 2,
      why: 'Array(Set(array)) discards order. seen.insert($0).inserted keeps one pass and preserves the original order.' },
    { d: 'hard', q: 'NSCountedSet exists to:', choices: ['Keep elements sorted', 'Track how many times each object was added', 'Provide thread safety', 'Limit set size'], correct: 1,
      why: 'It is a bag / multiset. The Swift equivalent is a Dictionary of element to count.' },
    { d: 'hard', q: 'For n around 10 elements, a linear array scan can beat a Set lookup because:', choices: ['Sets are O(n) at small sizes', 'Cache locality and no hashing cost dominate at small n', 'Arrays are hashed too', 'Set insert is O(n log n)'], correct: 1,
      why: 'Hashing plus a pointer chase into a sparse table can cost more than scanning ten contiguous elements already in cache.' }
  ]
});

IPREP.addTopic({
  id: 'codable', domain: 'foundation',
  title: 'Codable, JSON & Serialization',
  summary: 'Encoding and decoding, custom keys, error handling, and where Codable stops being enough.',
  cards: [
    { d: 'easy', q: 'What does Codable actually generate for you?',
      a: "`Codable` is `Decodable & Encodable`. For a type whose stored properties are all Codable, the compiler synthesises:\n\n- A `CodingKeys` enum matching the property names\n- `init(from:)`\n- `encode(to:)`\n\n! The moment you write **any one** of those yourself, synthesis stops for that protocol and you own all of it.\n\n=> Synthesis is per-protocol, so writing `init(from:)` still leaves `encode(to:)` generated." },

    { d: 'medium', q: 'How do you map JSON keys that do not match your property names?',
      a: "| Approach | Verdict |\n|---|---|\n| Custom `CodingKeys` with raw values | **Preferred.** Explicit, per-property, visible at the model |\n| `decoder.keyDecodingStrategy = .convertFromSnakeCase` | Global to that decode |\n\n! The global strategy silently mis-transforms edge cases like `id_1` or `URLString`\n! It makes the mapping invisible where the model is defined\n\n=> Prefer explicit `CodingKeys` per model." },

    { d: 'medium', q: 'How do you decode a value whose type varies, for example a field that is sometimes a String and sometimes an Int?',
      a: "```\ninit(from decoder: Decoder) throws {\n    let c = try decoder.container(keyedBy: CodingKeys.self)\n    if let s = try? c.decode(String.self, forKey: .id) { id = s }\n    else { id = String(try c.decode(Int.self, forKey: .id)) }\n}\n```\n\n=> The better interview answer is to say this is a **server contract smell** you would push back on, then show you can handle it defensively anyway." },

    { d: 'hard', q: 'What are the DecodingError cases and why do they matter for debugging?',
      a: "| Case | Means |\n|---|---|\n| `.keyNotFound` | A required key is missing |\n| `.typeMismatch` | The JSON value is the wrong shape |\n| `.valueNotFound` | null where non-optional was expected |\n| `.dataCorrupted` | Malformed JSON, or a failed date/enum conversion |\n\n**Every case carries a `codingPath`**, the exact path to the failing field.\n\n=> Logging `context.codingPath` turns 'decoding failed' into 'user.address[2].zip was a number'. Not logging it is the most common avoidable debugging tax in an iOS codebase." },

    { d: 'medium', q: 'How do you handle a date format the decoder does not understand?',
      a: "Set the strategy once on the decoder, not per model:\n\n```\ndecoder.dateDecodingStrategy = .iso8601\ndecoder.dateDecodingStrategy = .formatted(myFormatter)\ndecoder.dateDecodingStrategy = .custom { d in ... }\n```\n\n! Create the `DateFormatter` **once** and reuse it. Formatter initialisation is genuinely expensive, and constructing one per row in a decode loop is a classic profiler surprise." },

    { d: 'hard', q: 'How do you make decoding resilient so one bad element does not fail the whole array?',
      a: "Wrap each element in a failable box:\n\n```\nstruct Lossy<T: Decodable>: Decodable {\n    let value: T?\n    init(from d: Decoder) throws { value = try? T(from: d) }\n}\nlet items = try decoder.decode([Lossy<Item>].self, from: data).compactMap(\\.value)\n```\n\n+ Right for a feed, where one malformed post should not blank the screen\n! Wrong for a payment response, where you want the failure to be loud\n\n=> The decision is about **what the data is for**, not about robustness in the abstract." },

    { d: 'medium', q: 'Codable versus NSCoding versus JSONSerialization, when do you use each?',
      a: "| Tool | Use when |\n|---|---|\n| **Codable** | Default for JSON and plists. Type-safe, compile-time checked |\n| **NSCoding / NSSecureCoding** | Objective-C archiving, `NSKeyedArchiver`, objects in `UserDefaults` |\n| **JSONSerialization** | The shape is genuinely dynamic and unknown |\n\n=> `NSSecureCoding` additionally requires you to declare expected classes, which blocks a crafted archive from instantiating an unexpected type." },

    { d: 'hard', q: 'What is the cost of Codable, and when does it show up?',
      a: "Synthesised decoding goes through keyed containers and dictionary lookups per field, plus `Any` boxing inside `JSONDecoder`.\n\n| Scale | Matters? |\n|---|---|\n| A few hundred objects | No |\n| Tens of thousands on a scroll | **Yes** |\n\nOptions when it does: decode off the main thread, decode incrementally, drop to a streaming parser, or move to a binary format.\n\n=> Measure first. In most apps the **network** is the bottleneck, not the parse." },

    { d: 'medium', q: 'How do you encode an enum with associated values?',
      a: "Swift synthesises `Codable` for enums with associated values since 5.5, producing a nested keyed structure.\n\nIf you need a specific wire format, usually a `type` discriminator plus a payload, write `init(from:)` manually and switch on the discriminator:\n\n```\nenum Event: Codable {\n    case tap(id: String)\n    case scroll(offset: Double)\n}\n```\n\n=> Interviewers use this to see whether you can hand-roll container code, not to test whether you know the synthesis exists." },

    { d: 'hard', q: 'Why should `JSONDecoder` not be recreated for every request?',
      a: "! It is not free to construct\n! More importantly it carries **configuration**: key strategy, date strategy, data strategy, user info\n! Recreating it per call scatters that configuration across call sites, where it drifts\n\n=> Build one configured decoder in the networking layer and inject it. The same applies doubly to `DateFormatter`, which is expensive enough to show up clearly in a Time Profiler trace." }
  ],
  quiz: [
    { d: 'medium', q: 'Which DecodingError property tells you exactly which field failed?', choices: ['localizedDescription', 'context.codingPath', 'underlyingError', 'debugDescription'], correct: 1,
      why: 'codingPath is the sequence of keys and indices to the failure. Logging it turns an opaque error into a precise one.' },
    { d: 'medium', q: 'You write a custom `init(from:)`. What happens to synthesis?', choices: ['Nothing, both are synthesised anyway', 'Decodable synthesis stops; Encodable synthesis continues', 'Both stop', 'The code will not compile'], correct: 1,
      why: 'Synthesis is per-protocol. Writing init(from:) opts you out of Decodable synthesis only; encode(to:) is still generated.' },
    { d: 'hard', q: 'One malformed element must not fail the whole array decode. Best approach:', choices: ['try? on the whole decode', 'Decode [Lossy<T>] where Lossy swallows per-element errors, then compactMap', 'Use JSONSerialization instead', 'Make every property optional'], correct: 1,
      why: 'Per-element isolation keeps the good rows. try? on the whole decode throws away everything on any failure.' },
    { d: 'easy', q: '`.convertFromSnakeCase` is riskier than explicit CodingKeys because:', choices: ['It is slower', 'It silently mis-transforms edge cases and hides the mapping from the model', 'It only works on structs', 'It breaks Encodable'], correct: 1,
      why: 'Keys like id_1 or URLString convert unexpectedly, and the mapping is no longer visible where the model is defined.' },
    { d: 'medium', q: 'NSSecureCoding adds which guarantee over NSCoding?', choices: ['Encryption at rest', 'You must declare the expected classes, preventing object substitution attacks', 'Faster archiving', 'JSON compatibility'], correct: 1,
      why: 'decodeObject(of:forKey:) validates the class before instantiating, which blocks a crafted archive from creating an unexpected type.' },
    { d: 'hard', q: 'A decode of 20,000 rows is slow. The single most likely avoidable cost is:', choices: ['Using structs instead of classes', 'Creating a DateFormatter per element', 'Using CodingKeys', 'Decoding on a background queue'], correct: 1,
      why: 'DateFormatter construction is famously expensive. Hoist it out, or use .iso8601, and the trace usually flattens.' }
  ]
});

IPREP.addTopic({
  id: 'bridging', domain: 'foundation',
  title: 'Foundation Bridging & Toll-Free Bridging',
  summary: 'How Swift, Foundation and Core Foundation types convert, and what it costs.',
  cards: [
    { d: 'easy', q: 'What is toll-free bridging?',
      a: "Certain Core Foundation and Foundation types share an **identical memory layout**, so a pointer can be cast between them with no conversion cost.\n\n| CF | Foundation |\n|---|---|\n| `CFStringRef` | `NSString` |\n| `CFArrayRef` | `NSArray` |\n| `CFDictionaryRef` | `NSDictionary` |\n\n=> It is free because nothing is copied. The same bytes are simply viewed through two type systems." },

    { d: 'medium', q: 'What is the difference between `__bridge`, `__bridge_retained` and `__bridge_transfer`?',
      a: "They tell ARC what to do with ownership at the Core Foundation boundary, since ARC does not manage CF objects.\n\n| Annotation | Meaning |\n|---|---|\n| `__bridge` | Cast only, no ownership transfer |\n| `__bridge_retained` / `CFBridgingRetain` | ObjC to CF: **you** now own it, must `CFRelease` |\n| `__bridge_transfer` / `CFBridgingRelease` | CF to ObjC: **ARC** takes ownership |\n\n! Getting these wrong is either a leak or an over-release crash." },

    { d: 'medium', q: 'Is Swift String to NSString free?',
      a: "**No, not in general.**\n\n- Native Swift `String` stores UTF-8; `NSString` is UTF-16\n- Swift to `NSString` may require a **copy and transcode**\n- `NSString` into Swift is lazy: Swift keeps the `NSString` and copies only when it needs native storage\n\n=> Practically: avoid repeated bridging in a hot loop, such as calling an Objective-C API with a Swift string per row while scrolling." },

    { d: 'hard', q: 'What is the performance risk of an `Array` that came from Objective-C?',
      a: "A bridged `Array` may be backed by an `NSArray` rather than native contiguous storage.\n\n! Every element access goes through `objc_msgSend`\n! The element may need bridging too\n! A loop can be an order of magnitude slower\n\nFix:\n```\nlet native = Array(bridged)   // one forced copy\n```\n\n=> This is exactly the case where `ContiguousArray` earns its keep." },

    { d: 'medium', q: 'Why can Foundation collections not store nil, and what do they use instead?',
      a: "They store `id` pointers and use nil as a **terminator and error sentinel**, so a nil element would be ambiguous. `NSNull` is a singleton object standing in for null.\n\n! JSON nulls parsed with `JSONSerialization` arrive as `NSNull` inside `[String: Any]`\n! Code casting them to `String` crashes or silently fails\n\n=> `Codable` avoids this entirely by mapping null to a proper Swift `nil`." },

    { d: 'hard', q: 'What does `as`, `as?` and `as!` mean when bridging?',
      a: "| Operator | Means |\n|---|---|\n| `as` | **Guaranteed** conversion the compiler can prove, e.g. `String as NSString` |\n| `as?` | Conditional downcast returning an optional |\n| `as!` | Forced, traps on failure |\n\n! With `[String: Any]` from `JSONSerialization` you write `as?` constantly, and every `as!` there is a crash waiting for a server change.\n\n=> That is the strongest practical argument for `Codable`." },

    { d: 'medium', q: 'What is `NSNumber` and why does it complicate Swift interop?',
      a: "It boxes any C numeric type, **including `Bool`**, so it can live in a Foundation collection.\n\n! It erases which type it was\n! A JSON `true` and a JSON `1` both arrive as `NSNumber`\n! `value as? Bool` may succeed for `1`\n\n=> A real source of bugs when parsing loosely typed JSON. `Codable` decodes to the declared Swift type and removes the ambiguity." },

    { d: 'hard', q: 'What is `unsafeBitCast` and why should the answer usually be no?',
      a: "It reinterprets the bits of one type as another with **no checking whatsoever**.\n\n! Does not consult type metadata\n! Does not adjust reference counts\n! Does not validate layout\n! Getting size or ownership wrong is undefined behaviour, and typically corruption that manifests far from the cause\n\n=> Legitimate uses are rare: C interop where you have already proven layout compatibility, or a measured hot path. Naming it and then explaining why you would not use it is the right interview answer." },

    { d: 'medium', q: 'How do you expose a Swift type to Objective-C, and what cannot cross?',
      a: "Subclass `NSObject` or annotate members `@objc`, and the compiler emits entry points into `YourModule-Swift.h`.\n\n**Cannot cross:**\n! Generics\n! Structs, except a small bridged set\n! Enums with associated values\n! Tuples\n! Protocols with associated types, and `some` / `any` types\n\n=> Anything Swift-only needs a wrapper class, which is why mixed codebases accumulate thin `@objc` adapters." }
  ],
  quiz: [
    { d: 'medium', q: 'Toll-free bridging is free because:', choices: ['The types are copied lazily', 'The memory layouts are identical so the pointer is reinterpreted', 'ARC caches the conversion', 'The compiler inlines the conversion'], correct: 1,
      why: 'Nothing is converted. CFStringRef and NSString are the same bytes viewed through two type systems.' },
    { d: 'hard', q: 'A loop over an Array bridged from Objective-C is 10x slower than expected because:', choices: ['Swift arrays are slow', 'The buffer is an NSArray, so each access goes through objc_msgSend and may bridge the element', 'ARC retains each element twice', 'The array is not sorted'], correct: 1,
      why: 'Force a native copy with Array(bridged) or use ContiguousArray to get contiguous storage and direct access.' },
    { d: 'medium', q: '`CFBridgingRelease` corresponds to:', choices: ['__bridge', '__bridge_retained', '__bridge_transfer', 'CFRetain'], correct: 2,
      why: 'It hands a CF object to ARC, which becomes responsible for releasing it. Getting it wrong is a leak or an over-release.' },
    { d: 'medium', q: 'Parsing JSON with JSONSerialization, a `true` value may cast successfully to both:', choices: ['String and Int', 'Bool and NSNumber-backed Int', 'Date and Double', 'Array and Dictionary'], correct: 1,
      why: 'NSNumber erases the original numeric type, so Bool and 1 become ambiguous. Codable removes the ambiguity by decoding to a declared type.' },
    { d: 'hard', q: 'Which of these CAN be exposed to Objective-C from Swift?', choices: ['A generic struct', 'An enum with associated values', 'A class inheriting NSObject with @objc methods', 'A protocol with an associatedtype'], correct: 2,
      why: 'Only constructs the Objective-C runtime can represent cross the boundary. Swift-only features need a wrapper class.' }
  ]
});
