/* Foundation Data Structures — 5 topics */

IPREP.addTopic({
  id: 'arrays', domain: 'foundation',
  title: 'Array & NSArray',
  summary: 'Ordered storage: complexity, growth, mutation, and the Foundation counterparts.',
  cards: [
    { d: 'easy', q: 'Give the complexity of the common Array operations.',
      a: "- `subscript(i)` read/write: **O(1)**\n- `append`: **amortised O(1)**, O(n) on the resize\n- `insert(at:)` / `remove(at:)`: **O(n)**, everything after shifts\n- `contains` / `firstIndex(of:)`: **O(n)** linear scan\n- `sort`: **O(n log n)**, introsort\n- `reserveCapacity`: O(n) once, then no reallocation up to that size" },
    { d: 'medium', q: 'How does Array grow, and why is append amortised O(1)?',
      a: "When the buffer is full, Array allocates a new buffer of roughly **double** the capacity, copies the elements and frees the old one. A single append can therefore be O(n), but the doubling means n appends cost O(n) total, so the average is constant.\n\n`reserveCapacity(n)` before a known-size fill removes every intermediate reallocation, which matters when building large arrays in a loop." },
    { d: 'medium', q: 'What is the difference between NSArray and NSMutableArray, and how does it map to Swift?',
      a: "`NSArray` is an immutable **class**; `NSMutableArray` subclasses it and adds mutation. Immutability is enforced by the type, but the reference is still shared, so an `NSArray` property should be `copy` to prevent a caller handing you a mutable instance and then mutating it behind your back.\n\nSwift `Array` collapses both into one value type: `let` gives immutability, `var` gives mutation, and the value semantics mean no defensive copy is needed." },
    { d: 'hard', q: 'Why is `NSArray` declared `@property (copy)` and what would `strong` break?',
      a: "Because `NSMutableArray` is a subclass of `NSArray`, a caller can pass a mutable array where an `NSArray` is expected. With `strong` you store their instance and they can mutate your state afterwards. With `copy`, `-copy` on a mutable array returns an immutable snapshot, so your invariant holds.\n\nThe subtlety: `-copy` is shallow, so the **elements** are still shared references. Use `-mutableCopy` or a deep copy if the elements are mutable too." },
    { d: 'medium', q: 'What is the difference between `map`, `compactMap` and `flatMap`?',
      a: "- `map`: transform each element one to one. `[1,2].map(String.init)` gives `[\"1\",\"2\"]`.\n- `compactMap`: transform, then drop nils. Turns `[String]` into `[Int]` via `Int.init` discarding failures.\n- `flatMap`: transform each element into a sequence, then concatenate. `[[1,2],[3]].flatMap { $0 }` gives `[1,2,3]`.\n\n`flatMap` over optionals was renamed to `compactMap` in Swift 4.1 because the two meanings were confusing." },
    { d: 'hard', q: 'What is the performance trap with `filter` then `first`?',
      a: "`array.filter { p($0) }.first` builds an entire intermediate array before taking one element, so it is O(n) work and O(n) allocation even if the match is at index 0. Use `array.first(where: p)`, which short-circuits.\n\nThe general form: chained `map`/`filter` on arrays are eager and each step allocates. `array.lazy.map{}.filter{}.first` makes the chain lazy and avoids the intermediates." },
    { d: 'medium', q: 'How do you remove elements from an array while iterating it?',
      a: "Do not mutate while iterating; build a new array instead. `array.removeAll { $0.isExpired }` does it in one pass in place, which is O(n) and the idiomatic answer. If you need the removed elements, partition:\n\n```\nlet (keep, drop) = array.reduce(into: ([T](), [T]())) { acc, x in\n    x.isExpired ? acc.1.append(x) : acc.0.append(x)\n}\n```\n\nIterating indices backwards and calling `remove(at:)` also works but is O(n^2)." },
    { d: 'hard', q: 'What is `ContiguousArray` and when would you use it?',
      a: "`Array` may be backed by an `NSArray` when bridged from Objective-C, so element access has to check for that. `ContiguousArray` guarantees native contiguous storage and skips the bridging check. For element types that are classes or `@objc` protocols, this can be measurably faster in a tight loop. For pure Swift value types `Array` is already contiguous, so there is no difference and you should not bother." },
    { d: 'medium', q: 'How do you get both index and element while iterating, and what is the trap?',
      a: "`for (i, x) in array.enumerated()`. The trap is that `i` is the **offset**, not the index, which is identical for `Array` but wrong for `ArraySlice` or any collection whose indices do not start at zero. A slice of an array keeps the parent's indices, so `slice[0]` may crash. Use `array.indices` or `zip(array.indices, array)` when you need real indices." },
    { d: 'hard', q: 'What is an ArraySlice and why is holding one dangerous?',
      a: "A slice is a view over the parent's buffer with no copy, which makes slicing O(1). Two consequences:\n1. The slice **keeps the entire parent buffer alive**, so slicing 10 elements out of a million-element array and storing the slice retains all million.\n2. Slice indices are inherited from the parent, so they do not start at zero.\n\nWhen you want to keep a slice, materialise it with `Array(slice)`." }
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
      a: "Lookup, insert and delete are **average O(1)**, worst case O(n) when every key collides. The speed comes from hashing the key to a bucket index. Swift uses open addressing with linear probing over a power-of-two table, and it grows and rehashes when the load factor gets too high, which is an O(n) operation amortised across insertions." },
    { d: 'medium', q: 'State the Hashable contract.',
      a: "If `a == b` then `a.hashValue == b.hashValue`. The converse need not hold: equal hashes for unequal values is a collision, which is legal and merely slower.\n\nTwo practical rules follow. First, `hash(into:)` must feed **exactly** the properties that `==` compares, no more and no fewer. Second, the hash must be stable for as long as the value is in a set or used as a key, which is why mutable reference types make dangerous keys." },
    { d: 'hard', q: 'What breaks if you mutate an object after using it as a dictionary key?',
      a: "The object is sitting in the bucket its old hash chose. Change a property that participates in `hash(into:)` and the new hash points at a different bucket, so lookups miss. The entry is now unreachable but still occupying space, and `count` still includes it. The dictionary is silently corrupt.\n\nThis is the strongest argument for value-type keys. If you must use a class, hash only immutable identity, such as a `let id`." },
    { d: 'medium', q: 'Why does Swift randomise hash seeds per process, and what does it break?',
      a: "Per-process seeding defends against hash-flooding attacks, where an attacker sends keys engineered to collide and turns your O(1) into O(n). The consequence for you is that **iteration order of a Dictionary or Set is not stable across runs**. Any test or output that depends on dictionary order will pass locally and fail in CI. Sort the keys when order matters." },
    { d: 'medium', q: 'What is the difference between `dict[key]` and `dict[key, default:]`?',
      a: "`dict[key]` returns `Value?`. `dict[key, default: v]` returns a non-optional and, crucially, is usable as an **in-place mutation** target:\n\n```\ncounts[word, default: 0] += 1\n```\n\nThat single line does one hash lookup and mutates in place. Writing `counts[word] = (counts[word] ?? 0) + 1` does two lookups and, for a COW value like an array, may trigger a copy." },
    { d: 'hard', q: 'What is the copy-on-write trap with `dict[key]?.append(x)`?',
      a: "Older Swift would return the array value, append to a temporary, and throw it away, or perform a full copy. Modern Swift handles `dict[key]?.append(x)` in place via the modify accessor, but the pattern `var a = dict[key] ?? []; a.append(x); dict[key] = a` definitely copies.\n\nThe safe idiom is `dict[key, default: []].append(x)`, which uses the `_modify` coroutine and mutates the stored buffer directly." },
    { d: 'medium', q: 'How do NSDictionary keys differ from Swift Dictionary keys?',
      a: "`NSDictionary` **copies** its keys, which is why keys must conform to `NSCopying`. That is a defensive design: a mutable key object cannot be changed under the dictionary because the dictionary holds its own copy. Values are retained, not copied.\n\nSwift's `Dictionary` requires `Hashable` and, being a value type with value keys, has no need to copy defensively." },
    { d: 'hard', q: 'How do you write `hash(into:)` correctly for a custom type?',
      a: "```\nstruct User: Hashable {\n    let id: UUID\n    var name: String\n    static func == (a: User, b: User) -> Bool { a.id == b.id }\n    func hash(into hasher: inout Hasher) { hasher.combine(id) }\n}\n```\n\nNote that `==` compares only `id`, so `hash(into:)` must combine only `id`. If it also combined `name`, two users equal by `==` could hash differently and the contract breaks. Never implement `hashValue` directly; `Hasher` handles seeding and mixing." },
    { d: 'medium', q: 'When does Swift synthesise Hashable and Equatable for you?',
      a: "For a struct whose stored properties are all Hashable, or an enum whose associated values are all Hashable, just declare the conformance and the compiler synthesises both. It does not synthesise for classes, because identity versus value equality is a design decision only you can make. If you write a custom `==`, you must also write `hash(into:)` to match." },
    { d: 'hard', q: 'How would you build an LRU cache, and what data structures do you need?',
      a: "A hash map for O(1) lookup plus a doubly linked list for O(1) recency reordering. The map stores key to node; the list keeps most-recent at the head. On access, unlink the node and move it to the head. On insert past capacity, drop the tail and remove its key from the map.\n\nOn iOS you would usually reach for `NSCache` first, which is thread-safe, evicts under memory pressure automatically, and does not need this by hand. Write the manual version when you need deterministic eviction or a size accounting `NSCache` cannot express." }
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
      a: "When you need **membership testing** or **uniqueness**, and order does not matter. `contains` is O(1) on a Set and O(n) on an Array. The classic refactor is a loop that calls `array.contains(x)` inside another loop over n items, which is O(n^2); converting the inner collection to a Set makes it O(n)." },
    { d: 'medium', q: 'Name the set algebra operations and their meaning.',
      a: "- `union`: in either\n- `intersection`: in both\n- `subtracting`: in the first, not the second\n- `symmetricDifference`: in exactly one\n- `isSubset(of:)`, `isSuperset(of:)`, `isDisjoint(with:)`\n\nEach has a mutating form: `formUnion`, `formIntersection`, `subtract`, `formSymmetricDifference`. All are roughly O(n) in the smaller set, versus the O(n*m) you would write by hand with arrays." },
    { d: 'medium', q: 'How would you diff two lists of items for a table view update using sets?',
      a: "```\nlet inserted = new.subtracting(old)\nlet deleted  = old.subtracting(new)\nlet common   = old.intersection(new)\n```\n\nThat gives you insert and delete in O(n). It does not give you **moves** or ordering, which is why real diffing uses `UICollectionViewDiffableDataSource` or a Myers diff. Sets are the right first tool when position does not matter." },
    { d: 'hard', q: 'What does it mean that Set is unordered, in practice?',
      a: "Iteration order depends on the hash values and the per-process seed, so it changes between runs. Two consequences: never rely on set order in a UI, and never write a test asserting an exact iteration sequence. If you need both uniqueness and order, either keep an array plus a Set for the membership check, or use an ordered-set type such as `NSOrderedSet` or `OrderedSet` from swift-collections." },
    { d: 'medium', q: 'How is NSSet different from Swift Set?',
      a: "`NSSet` is an immutable reference type holding `id` elements that must be `NSObject`-hashable via `-hash` and `-isEqual:`. `NSMutableSet` adds mutation. `NSCountedSet` is a bag that tracks how many times each object was added, which has no Swift standard library equivalent.\n\nSwift `Set` is a generic value type requiring `Hashable`, with the same COW behaviour as `Array` and `Dictionary`." },
    { d: 'hard', q: 'When would you use NSCountedSet?',
      a: "When you need multiplicity, not just membership: word frequency, reference counting your own resources, or counting how many times each tag appears across items. `[set countForObject:x]` gives the count. In pure Swift you would use `Dictionary<T, Int>` with `counts[x, default: 0] += 1`, which is usually clearer, so `NSCountedSet` shows up mostly in older Objective-C code." },
    { d: 'medium', q: 'What does `Set` require of its Element, and why?',
      a: "`Hashable`, which implies `Equatable`. It needs the hash to pick a bucket and equality to resolve collisions within that bucket. The same mutation hazard as dictionary keys applies: mutating a stored element's hashed properties makes it unreachable. Since `Set` gives you no way to get a mutable reference to a stored element, the risk only exists for reference types." },
    { d: 'hard', q: 'You need to deduplicate an array while preserving order. How?',
      a: "```\nvar seen = Set<T>()\nlet unique = array.filter { seen.insert($0).inserted }\n```\n\n`insert` returns `(inserted: Bool, memberAfterInsert: T)`, so the filter is one pass, O(n), and preserves order. `Array(Set(array))` is shorter but loses order and is the answer interviewers are checking you do **not** give when order is specified." },
    { d: 'medium', q: 'What is the memory trade-off of a Set versus an Array?',
      a: "A Set keeps its table below a load factor, so it allocates more slots than it holds elements, typically using well over the raw element size. An Array stores elements contiguously with only the growth slack. So a Set costs more memory and worse cache locality per element, in exchange for O(1) membership. For small n, say under about 20 elements, a linear array scan is often genuinely faster because it stays in cache." }
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
      a: "`Codable` is `Decodable & Encodable`. For a type whose stored properties are all Codable, the compiler synthesises a `CodingKeys` enum matching the property names, plus `init(from:)` and `encode(to:)` that read and write each property by key. The moment you write any one of those three yourself, synthesis for that protocol stops and you own all of it." },
    { d: 'medium', q: 'How do you map JSON keys that do not match your property names?',
      a: "Either declare a custom `CodingKeys` enum with raw string values, which is explicit and per-property, or set `decoder.keyDecodingStrategy = .convertFromSnakeCase`, which is global to that decode.\n\nPrefer explicit `CodingKeys` on a per-model basis. The global strategy silently mis-transforms edge cases like `id_1` or `URLString`, and it makes the mapping invisible at the model definition." },
    { d: 'medium', q: 'How do you decode a value whose type varies, for example a field that is sometimes a String and sometimes an Int?',
      a: "Write a custom `init(from:)` and try each type:\n\n```\ninit(from decoder: Decoder) throws {\n    let c = try decoder.container(keyedBy: CodingKeys.self)\n    if let s = try? c.decode(String.self, forKey: .id) { id = s }\n    else { id = String(try c.decode(Int.self, forKey: .id)) }\n}\n```\n\nThe better answer in an interview is to say this is a server contract smell and you would push back, then show you can handle it defensively anyway." },
    { d: 'hard', q: 'What are the DecodingError cases and why do they matter for debugging?',
      a: "- `.keyNotFound(key, context)`: a required key is missing\n- `.typeMismatch(type, context)`: the JSON value is the wrong shape\n- `.valueNotFound(type, context)`: null where non-optional was expected\n- `.dataCorrupted(context)`: malformed JSON, or a failed date/enum conversion\n\nEvery case carries a `codingPath`, which is the exact path to the failing field. Logging `context.codingPath` turns 'decoding failed' into 'user.address[2].zip was a number'. Not logging it is the most common avoidable debugging tax in an iOS codebase." },
    { d: 'medium', q: 'How do you handle a date format the decoder does not understand?',
      a: "Set the strategy once on the decoder rather than per-model:\n\n```\ndecoder.dateDecodingStrategy = .iso8601\n// or\ndecoder.dateDecodingStrategy = .formatted(myFormatter)\n// or\ndecoder.dateDecodingStrategy = .custom { d in ... }\n```\n\nCreate the `DateFormatter` **once** and reuse it. Formatter initialisation is genuinely expensive, and constructing one per row in a decode loop is a classic profiler surprise." },
    { d: 'hard', q: 'How do you make decoding resilient so one bad element does not fail the whole array?',
      a: "Wrap each element in a failable box and decode an array of boxes:\n\n```\nstruct Lossy<T: Decodable>: Decodable {\n    let value: T?\n    init(from d: Decoder) throws {\n        value = try? T(from: d)\n    }\n}\nlet items = try decoder.decode([Lossy<Item>].self, from: data).compactMap(\\.value)\n```\n\nThis is the right call for a feed where a single malformed post should not blank the screen. It is the wrong call for a payment response, where you want the failure to be loud." },
    { d: 'medium', q: 'Codable versus NSCoding versus JSONSerialization, when do you use each?',
      a: "- **Codable**: default for JSON and PLIST, type-safe, compile-time checked.\n- **NSCoding / NSSecureCoding**: required when interoperating with Objective-C archiving, `NSKeyedArchiver`, or storing objects in `UserDefaults` as data. `NSSecureCoding` additionally requires you to declare expected classes, defending against object substitution attacks.\n- **JSONSerialization**: when the shape is genuinely dynamic and you do not know the schema, or you need to touch raw `[String: Any]`. Loses all type safety." },
    { d: 'hard', q: 'What is the cost of Codable, and when does it show up?',
      a: "Synthesised decoding goes through keyed containers and dictionary lookups per field, plus `Any` boxing inside `JSONDecoder`, which sits on top of `JSONSerialization` for older OS versions. For a few hundred objects it is irrelevant. For tens of thousands of rows on a scroll it is measurable, and options are: decode off the main thread, decode incrementally, drop to a streaming parser, or move to a binary format. Measure first: in most apps the network is the bottleneck, not the parse." },
    { d: 'medium', q: 'How do you encode an enum with associated values?',
      a: "Swift synthesises `Codable` for enums with associated values since Swift 5.5, producing a nested keyed structure. If you need a specific wire format, usually a `type` discriminator plus a payload, write it manually:\n\n```\nenum Event: Codable {\n    case tap(id: String)\n    case scroll(offset: Double)\n}\n```\n\nWith a custom `init(from:)` that reads `type` and switches. Interviewers use this to see whether you can hand-roll container code." },
    { d: 'hard', q: 'Why should `JSONDecoder` not be recreated for every request?',
      a: "It is not free to construct, and more importantly it carries configuration: key strategy, date strategy, data strategy, user info. Recreating it per call means the configuration lives at the call site and drifts. Build one configured decoder in your networking layer and inject it. The same applies doubly to `DateFormatter`, which is expensive enough that creating one per decode of a large array shows up clearly in a Time Profiler trace." }
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
      a: "Certain Core Foundation and Foundation types share an identical memory layout, so a pointer can be cast between them with **no conversion cost**. `CFStringRef` and `NSString`, `CFArrayRef` and `NSArray`, `CFDictionaryRef` and `NSDictionary` are the classic trio. You cast with `as` in Swift or a C cast with a bridging annotation in Objective-C. It is free because nothing is copied, only reinterpreted." },
    { d: 'medium', q: 'What is the difference between `__bridge`, `__bridge_retained` and `__bridge_transfer`?',
      a: "They tell ARC what to do with ownership when crossing the Core Foundation boundary, since ARC does not manage CF objects.\n- `__bridge`: cast only, no ownership transfer.\n- `__bridge_retained` (or `CFBridgingRetain`): Objective-C to CF, you now own it and must `CFRelease`.\n- `__bridge_transfer` (or `CFBridgingRelease`): CF to Objective-C, ARC takes ownership and will release it.\n\nGetting these wrong is either a leak or an over-release crash." },
    { d: 'medium', q: 'Is Swift String to NSString free?',
      a: "No, not in general. A native Swift `String` stores UTF-8; `NSString` is UTF-16. Bridging a native Swift string to `NSString` may require a **copy and transcode**. The reverse, an `NSString` bridged into Swift, is lazy: Swift keeps the `NSString` and only copies when it needs native storage.\n\nPractically: avoid repeated bridging in a hot loop, for example calling an Objective-C API with a Swift string per row while scrolling." },
    { d: 'hard', q: 'What is the performance risk of an `Array` that came from Objective-C?',
      a: "A bridged `Array` may be backed by an `NSArray` rather than native contiguous storage. Every element access then goes through `objc_msgSend` and may need to bridge the element too. A loop over it can be an order of magnitude slower than over a native array.\n\nThe fix is to force a native copy once, `let native = Array(bridged)`, or use `ContiguousArray`. This is exactly the case where `ContiguousArray` earns its keep." },
    { d: 'medium', q: 'Why can Foundation collections not store nil, and what do they use instead?',
      a: "`NSArray`, `NSDictionary` and `NSSet` store `id` pointers and use nil as a terminator and error sentinel, so a nil element would be ambiguous. `NSNull` is a singleton object that stands in for null.\n\nThe practical consequence is that JSON nulls parsed with `JSONSerialization` arrive as `NSNull` instances inside `[String: Any]`, and code that casts them to `String` crashes or silently fails. `Codable` avoids this by mapping null to a proper Swift `nil`." },
    { d: 'hard', q: 'What does `as`, `as?` and `as!` mean when bridging?',
      a: "- `as` is a **guaranteed** conversion, used when the compiler can prove it always succeeds, such as `String as NSString`.\n- `as?` is a conditional downcast returning an optional, used for `Any` to a concrete type.\n- `as!` forces it and traps on failure.\n\nWith `[String: Any]` from `JSONSerialization` you are constantly writing `as?`. Every `as!` there is a crash waiting for a server change, which is the strongest practical argument for `Codable`." },
    { d: 'medium', q: 'What is `NSNumber` and why does it complicate Swift interop?',
      a: "`NSNumber` boxes any C numeric type, including `Bool`, into an object so it can live in a Foundation collection. The problem is that it erases which type it was: a JSON `true` and a JSON `1` can both arrive as `NSNumber`, and `value as? Bool` may succeed for `1`. This is a real source of bugs when parsing loosely typed JSON with `JSONSerialization`. `Codable` decodes to the declared Swift type and removes the ambiguity." },
    { d: 'hard', q: 'What is `unsafeBitCast` and why should the answer usually be no?',
      a: "It reinterprets the bits of one type as another with no checking whatsoever. Unlike bridging casts it does not consult type metadata, adjust reference counts, or validate layout. Getting the size or ownership wrong is undefined behaviour and typically a corruption bug that manifests far from the cause.\n\nLegitimate uses are rare: interop with C where you have already proven layout compatibility, or performance work in a hot path you have measured. In an interview, naming it and then explaining why you would not use it is the right answer." },
    { d: 'medium', q: 'How do you expose a Swift type to Objective-C, and what cannot cross?',
      a: "Subclass `NSObject` or annotate members `@objc`, and the compiler emits Objective-C entry points into `YourModule-Swift.h`. What cannot cross: generics, structs (except a small bridged set), enums with associated values, tuples, protocols with associated types, and `some`/`any` types. Anything Swift-only must be wrapped in a class the runtime understands, which is why mixed codebases accumulate thin `@objc` adapter classes." }
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
