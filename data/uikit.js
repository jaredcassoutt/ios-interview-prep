/* UI & View Hierarchy — 7 topics */

IPREP.addTopic({
  id: 'vclifecycle', domain: 'uikit',
  title: 'UIViewController Lifecycle',
  summary: 'The callback order, what is safe in each, and the containment API.',
  cards: [
    { d: 'easy', q: 'List the view controller lifecycle callbacks in order.',
      a: "`loadView` → `viewDidLoad` → `viewWillAppear` → `viewWillLayoutSubviews` → `viewDidLayoutSubviews` → `viewDidAppear` → `viewWillDisappear` → `viewDidDisappear`\n\n| Callback | Fires |\n|---|---|\n| `viewDidLoad` | **Exactly once** per view load |\n| `viewWillAppear` / `viewDidAppear` | Every appearance |\n| `viewWillLayoutSubviews` / `viewDidLayoutSubviews` | **Many times**: every bounds change, rotation, keyboard |" },

    { d: 'medium', q: 'What is safe in `viewDidLoad` and what is not?',
      a: "+ One-time setup, adding subviews, installing constraints, wiring targets, starting a data load\n! **Anything depending on final frames.** The view is loaded but **not laid out**\n\n=> `view.bounds` is whatever came from the nib or a default, not the real size. Rounding a corner, drawing a gradient or computing a scroll offset here produces the wrong result on any device the storyboard was not designed for. Do frame-dependent work in `viewDidLayoutSubviews`." },

    { d: 'medium', q: 'Why is `viewDidLayoutSubviews` tricky, and how do you use it correctly?',
      a: "It fires **repeatedly**, so it must be **idempotent and cheap**.\n\n| Do | Do not |\n|---|---|\n| Set a `CAGradientLayer` frame | **Allocate** a new gradient layer |\n| Update a shadow path | Start a network call |\n\n! Allocating there adds one layer per keyboard show. A slow leak that looks like nothing.\n\n=> The pattern: create once in `viewDidLoad`, position in `viewDidLayoutSubviews`, guard anything one-shot with a flag." },

    { d: 'hard', q: 'When is `viewWillAppear` called but `viewDidAppear` not?',
      a: "During a **cancelled interactive transition.** Swipe back halfway and release:\n\n1. The incoming controller gets `viewWillAppear`\n2. Then `viewWillDisappear` and `viewDidDisappear`\n3. It never appeared\n\n=> Which is why analytics screen-view tracking belongs in `viewDidAppear`, not `viewWillAppear`, and why starting a resource in `viewWillAppear` and stopping it in `viewDidDisappear` can leave you unbalanced." },

    { d: 'medium', q: 'What is `loadView` for and when do you override it?',
      a: "It is responsible for **creating `self.view`**. Override it when building the hierarchy in code with a custom root view class.\n\n```\noverride func loadView() { view = ProfileView() }\n```\n\n! Never call `super.loadView()` in that override\n! Never touch `self.view` inside it. Accessing `view` triggers `loadView`, so you recurse\n! Do not override it at all when using a storyboard or nib" },

    { d: 'hard', q: 'Explain view controller containment and the exact call order.',
      a: "```\naddChild(child)\nview.addSubview(child.view)\nchild.view.frame = ...\nchild.didMove(toParent: self)\n\n// removal\nchild.willMove(toParent: nil)\nchild.view.removeFromSuperview()\nchild.removeFromParent()\n```\n\n- `addChild` calls `willMove(toParent:)` for you, which is why you only call `didMove` explicitly on add\n- `removeFromParent` calls `didMove(toParent: nil)` for you\n\n! Skip these and the child never receives appearance, rotation or trait callbacks. That is the classic 'my child's viewWillAppear never fires' bug." },

    { d: 'medium', q: 'What happened to `didReceiveMemoryWarning` and view unloading?',
      a: "- `viewDidUnload` was deprecated in iOS 6. Views are no longer purged under pressure\n- `didReceiveMemoryWarning` still fires\n\n+ Use it to drop caches, decoded images, anything reconstructible\n! It is **not** a place to tear down your view hierarchy\n\n=> In modern code prefer `NSCache`, which evicts automatically, and observe `UIApplication.didReceiveMemoryWarningNotification` where the controller is not the right owner." },

    { d: 'hard', q: 'How do trait collections fit into the lifecycle?',
      a: "`traitCollectionDidChange(_:)`, deprecated in iOS 17 in favour of `registerForTraitChanges`, fires when size class, dark mode, dynamic type size or display scale changes.\n\n=> It is the correct hook for anything appearance-dependent that Auto Layout and dynamic colours cannot express.\n\n! The common mistake is doing this work in `viewWillAppear`, which **misses in-place changes** such as the user flipping to dark mode while your screen is visible." },

    { d: 'medium', q: 'Where should a view controller start and stop observing?',
      a: "**Symmetric pairs, matched to the same lifecycle level.**\n\n| Work | Start | Stop |\n|---|---|---|\n| Cheap, no visual cost | `viewDidLoad` | `deinit` |\n| Expensive or visible-only: location, video, timers | `viewWillAppear` | `viewWillDisappear` |\n\n! Mixing levels, such as starting in `viewDidLoad` and stopping in `viewDidDisappear`, gives an unbalanced lifetime and either a leak or a crash on the second appearance." },

    { d: 'hard', q: 'What is the difference between `present` and `pushViewController` in terms of lifecycle?',
      a: "| Presentation | Presenter gets disappearance callbacks? |\n|---|---|\n| Push | Yes, but stays alive in the stack |\n| Modal, full screen | Yes |\n| `.overCurrentContext` or a sheet | **No, it stays visible** |\n\n! That last row breaks code assuming 'viewDidAppear means I am the visible screen'.\n\n=> Which is exactly why sheet presentations so often produce duplicate analytics events." }
  ],
  quiz: [
    { d: 'easy', q: 'Which callback fires exactly once per view load?', choices: ['viewWillAppear', 'viewDidLayoutSubviews', 'viewDidLoad', 'viewWillLayoutSubviews'], correct: 2,
      why: 'The appearance and layout callbacks can each fire many times. viewDidLoad is the one-shot setup point.' },
    { d: 'medium', q: 'Rounding a corner using view.bounds in viewDidLoad gives the wrong radius because:', choices: ['bounds is always zero', 'Layout has not run, so bounds is not the final size', 'Corner radius must be set on the layer', 'viewDidLoad runs on a background thread'], correct: 1,
      why: 'Frame-dependent work belongs in viewDidLayoutSubviews, which runs after layout has resolved the real size.' },
    { d: 'hard', q: 'Analytics screen views belong in viewDidAppear rather than viewWillAppear because:', choices: ['viewWillAppear is slower', 'A cancelled interactive back swipe fires viewWillAppear without the screen ever appearing', 'viewWillAppear runs off the main thread', 'viewDidAppear fires more often'], correct: 1,
      why: 'The cancelled-transition case produces a will/did-disappear pair with no appearance, inflating your screen-view counts.' },
    { d: 'medium', q: 'Correct containment removal order:', choices: ['removeFromParent, removeFromSuperview, willMove(toParent: nil)', 'willMove(toParent: nil), removeFromSuperview, removeFromParent', 'removeFromSuperview, didMove(toParent: nil), removeFromParent', 'removeFromParent only'], correct: 1,
      why: 'willMove first, then detach the view, then removeFromParent, which calls didMove(toParent: nil) for you.' },
    { d: 'hard', q: 'A sheet is presented over your controller. Your controller receives:', choices: ['viewWillDisappear and viewDidDisappear', 'No disappearance callbacks, because it stays visible', 'viewDidLoad again', 'Only viewWillDisappear'], correct: 1,
      why: 'Non-fullscreen presentations leave the presenter on screen, so appearance callbacks do not fire. Code assuming otherwise double-counts.' },
    { d: 'medium', q: 'Overriding loadView, you must NOT:', choices: ['Assign to self.view', 'Access self.view before assigning it', 'Create a custom root view class', 'Set a background colour'], correct: 1,
      why: 'Reading self.view triggers loadView, so touching it inside the override recurses infinitely.' }
  ]
});

IPREP.addTopic({
  id: 'viewlayout', domain: 'uikit',
  title: 'UIView Hierarchy & the Layout Pass',
  summary: 'setNeedsLayout, layoutSubviews, display vs layout, and how UIKit batches work.',
  cards: [
    { d: 'easy', q: 'What is the relationship between UIView and CALayer?',
      a: "Every `UIView` is **backed by** a `CALayer` that owns the actual drawing: backing store, transform, corner radius, shadow.\n\nThe view adds on top:\n- Event handling and the responder chain\n- Auto Layout participation\n- An animation-friendly API\n\n=> So a view is a thin, interactive wrapper around a layer. Changing `view.layer.transform` directly bypasses UIView animation semantics, which is why the two APIs sometimes disagree." },

    { d: 'medium', q: 'Explain `setNeedsLayout`, `layoutIfNeeded` and `layoutSubviews`.',
      a: "| Call | Does | You |\n|---|---|---|\n| `setNeedsLayout()` | Marks dirty, returns immediately | **Call this** |\n| `layoutIfNeeded()` | Forces pending layout **now**, synchronously | Call before animating |\n| `layoutSubviews()` | Where layout happens | **Override, never call** |\n\n! Calling `layoutSubviews` directly is always wrong\n! Calling `layoutIfNeeded` in a loop is a performance bug" },

    { d: 'medium', q: 'What is the difference between the layout pass and the display pass?',
      a: "| Pass | Produces | Invalidate with | Callback |\n|---|---|---|---|\n| **Layout** | Geometry, frames | `setNeedsLayout` | `layoutSubviews` |\n| **Display** | Pixels in a backing store | `setNeedsDisplay` | `draw(_:)` |\n\n- Layout runs top-down\n- Both flush before the frame is committed\n\n=> Confusing the two is why people call `setNeedsDisplay` expecting a reposition and get nothing." },

    { d: 'hard', q: 'Describe the full frame lifecycle from a touch to pixels on screen.',
      a: "1. **Touch delivered.** Your handler mutates state and calls `setNeedsLayout`\n2. **Layout pass.** Constraints solved, `layoutSubviews` runs top-down\n3. **Display pass.** Dirty views run `draw(_:)` into their backing store\n4. **Commit.** The layer tree is encoded and sent over IPC to the render server\n5. **Composite.** GPU composites and hands the result to the display at the next vsync\n\n! Missing 16.7 ms, or 8.3 ms at 120 Hz, at **any** stage drops a frame.\n\n=> Which is why heavy work in `layoutSubviews` or `draw(_:)` shows up as jank." },

    { d: 'medium', q: 'What is the difference between `frame` and `bounds`?',
      a: "| | `frame` | `bounds` |\n|---|---|---|\n| Coordinate space | The **superview's** | **Its own** |\n| Origin | Position in the parent | Usually `.zero` |\n| Under a transform | **Undefined** | Still valid |\n\nTwo consequences:\n- Setting `bounds.origin` **scrolls the content**. That is exactly how `UIScrollView` works\n- With a non-identity transform, set `bounds` and `center`, never `frame`, because a rotated rectangle has no meaningful axis-aligned frame" },

    { d: 'hard', q: 'Why is `draw(_:)` expensive and how do you avoid it?',
      a: "Overriding it allocates a **backing store** the size of the view in pixels and forces **CPU rasterisation** on the main thread.\n\n! A full-screen view at 3x is roughly 1170 x 2532 x 4 bytes, about **12 MB**, redrawn on every invalidation.\n\nCompose with layers instead:\n\n| Instead of drawing | Use |\n|---|---|\n| A path | `CAShapeLayer` |\n| A gradient | `CAGradientLayer` |\n| Rounding | `layer.cornerRadius` |\n| An image | `UIImageView` |\n\n=> These are GPU-composited with no backing store. Reach for `draw(_:)` only for genuinely custom rendering." },

    { d: 'medium', q: 'What does `clipsToBounds` cost, and what about `masksToBounds`?',
      a: "They are the **same thing**. `clipsToBounds` on the view sets `masksToBounds` on the layer.\n\n+ For a simple rectangular bounds, the clip is cheap\n! It becomes expensive combined with a corner radius **plus a shadow**, because a shadow is drawn outside the bounds and gets clipped away\n\n=> The correct pattern is a **container view for the shadow** and an inner view for the clip, rather than reaching for `shouldRasterize` to compensate." },

    { d: 'hard', q: 'What is offscreen rendering and which properties trigger it?',
      a: "The GPU must render a layer into a **separate buffer** before compositing, costing a context switch per frame.\n\nTriggers:\n! `masksToBounds` **with** `cornerRadius` on a layer with sublayers or content\n! A shadow enabled without `shadowPath` set, so the shape is derived from the alpha channel\n! `shouldRasterize`\n! Group opacity, masks, some blend modes\n\n=> The cheapest fix is almost always an explicit `shadowPath`. Find them with Color Offscreen-Rendered Yellow in the simulator.\n\n```bad  no shadowPath: the GPU derives the shape from the alpha channel\nlayer.shadowColor = UIColor.black.cgColor\nlayer.shadowOpacity = 0.2\nlayer.shadowRadius = 8\nlayer.cornerRadius = 12\nlayer.masksToBounds = true          // and now the shadow is clipped away too\n```\n\n```good  explicit path, and separate the clip from the shadow\n// container draws the shadow\ncontainer.layer.shadowColor = UIColor.black.cgColor\ncontainer.layer.shadowOpacity = 0.2\ncontainer.layer.shadowRadius = 8\ncontainer.layer.shadowPath = UIBezierPath(\n    roundedRect: container.bounds, cornerRadius: 12\n).cgPath\n\n// inner view does the clipping\ncontent.layer.cornerRadius = 12\ncontent.layer.masksToBounds = true\n```" },

    { d: 'medium', q: 'When does `layoutSubviews` get called?',
      a: "+ The view's own **bounds** change\n+ A subview is added or removed\n+ `setNeedsLayout` or `setNeedsUpdateConstraints` was called and the pass runs\n+ Rotation or a size class change\n+ A scroll view scrolls, which is why `layoutSubviews` on a scroll view is a hot path\n\n! It does **not** fire merely because you moved the view without resizing it. Assuming it does leaves stale layout." },

    { d: 'hard', q: 'Why does adding a subview inside `layoutSubviews` cause problems?',
      a: "1. Adding a subview invalidates layout\n2. That schedules another layout pass\n3. Which calls `layoutSubviews` again\n4. Which adds another subview\n\n=> Either an infinite layout loop, or a steadily growing hierarchy that shows up as a slow leak while scrolling.\n\n! Create subviews once at init or `viewDidLoad`, and only set frames in `layoutSubviews`.\n\n```bad  each pass adds a view, which invalidates layout again\noverride func layoutSubviews() {\n    super.layoutSubviews()\n    let badge = UIView()\n    addSubview(badge)\n    badge.frame = CGRect(x: bounds.maxX - 20, y: 0, width: 16, height: 16)\n}\n```\n\n```good  create once, position every pass\nprivate let badge = UIView()\n\noverride init(frame: CGRect) {\n    super.init(frame: frame)\n    addSubview(badge)\n}\n\noverride func layoutSubviews() {\n    super.layoutSubviews()\n    badge.frame = CGRect(x: bounds.maxX - 20, y: 0, width: 16, height: 16)\n}\n```" },

    { d: 'medium', q: 'What is the difference between `sizeToFit`, `sizeThatFits` and `intrinsicContentSize`?',
      a: "| API | Kind | World |\n|---|---|---|\n| `sizeThatFits(_:)` | A **query**, mutates nothing | Manual layout |\n| `sizeToFit()` | Calls the above and **applies** it | Manual layout |\n| `intrinsicContentSize` | The size the view wants from its content | **Auto Layout** |\n\n=> In an Auto Layout world you override `intrinsicContentSize` and call `invalidateIntrinsicContentSize()` when the content changes." }
  ],
  quiz: [
    { d: 'easy', q: 'Which do you call to request layout without forcing it immediately?', choices: ['layoutSubviews()', 'setNeedsLayout()', 'layoutIfNeeded()', 'setNeedsDisplay()'], correct: 1,
      why: 'setNeedsLayout marks dirty and defers to the run loop layout pass. layoutIfNeeded forces it synchronously.' },
    { d: 'medium', q: 'A view has a rotation transform applied. To reposition it you should set:', choices: ['frame', 'bounds and center', 'frame.origin only', 'anchorPoint'], correct: 1,
      why: 'frame is undefined under a non-identity transform, because a rotated rectangle has no meaningful axis-aligned frame.' },
    { d: 'hard', q: 'The cheapest fix for a shadow that triggers offscreen rendering is:', choices: ['Enable shouldRasterize', 'Set an explicit shadowPath', 'Reduce shadowOpacity', 'Set masksToBounds to true'], correct: 1,
      why: 'Without shadowPath the GPU derives the shape from the alpha channel offscreen. An explicit path removes the pass entirely.' },
    { d: 'medium', q: 'Overriding draw(_:) on a full-screen view costs you:', choices: ['Nothing, it is GPU accelerated', 'A CPU-rasterised backing store of roughly width x height x scale^2 x 4 bytes', 'An extra view controller', 'Auto Layout invalidation'], correct: 1,
      why: 'That is why layer composition with CAShapeLayer or CAGradientLayer beats custom drawing for common effects.' },
    { d: 'hard', q: 'Adding a subview inside layoutSubviews typically causes:', choices: ['A compile error', 'A layout loop or a steadily growing hierarchy', 'Nothing unusual', 'An immediate crash'], correct: 1,
      why: 'Adding a subview invalidates layout, which re-enters layoutSubviews, which adds another subview.' },
    { d: 'medium', q: 'layoutSubviews is NOT triggered by:', choices: ['A bounds change', 'Adding a subview', 'Moving the view without resizing it', 'Device rotation'], correct: 2,
      why: 'Only bounds changes count, not a pure origin move. Assuming otherwise leaves stale internal layout.' }
  ]
});

IPREP.addTopic({
  id: 'autolayout', domain: 'uikit',
  title: 'Auto Layout & Constraints',
  summary: 'The constraint solver, priorities, hugging and compression, and debugging conflicts.',
  cards: [
    { d: 'easy', q: 'What is Auto Layout actually doing?',
      a: "Converting your constraints into a system of **linear equations and inequalities** and solving them with the Cassowary algorithm to produce frames.\n\nEach constraint is:\n```\nitem1.attr1 = multiplier * item2.attr2 + constant\n```\nwith a priority.\n\n=> The solver satisfies every **required** (1000) constraint while getting as close as it can to the optional ones." },

    { d: 'medium', q: 'Explain content hugging versus compression resistance.',
      a: "Both are priorities on a view's intrinsic content size.\n\n| | Resists | High value means |\n|---|---|---|\n| **Content hugging** | Growing larger | 'Stay small' |\n| **Compression resistance** | Shrinking smaller | 'Do not truncate me' |\n\n=> The classic case: two labels side by side, the wrong one truncating. Raise the **compression resistance** of the one that must stay whole, or lower the hugging of the one that should absorb the slack." },

    { d: 'medium', q: 'What does a constraint priority of 1000 versus 999 change?',
      a: "| Priority | Treated as |\n|---|---|\n| 1000 | **Required.** Satisfy it or log a conflict and break one |\n| 999 and below | **Optional.** A goal; the solver minimises the error |\n\n=> The practical trick: make a constraint you might need to break 999, so the layout **degrades gracefully** instead of dumping an unsatisfiable-constraints wall of text. It is also how you build 'prefer this height, but allow less'." },

    { d: 'hard', q: 'How do you actually debug an unsatisfiable constraints log?',
      a: "1. **Read the list.** UIKit prints the conflicting set and says which it broke\n2. **Name your constraints:** `c.identifier = \"card.top\"`, so the log is readable instead of anonymous addresses\n3. **View debugger.** Pause, select the view, inspect constraints and ambiguity\n4. `view.hasAmbiguousLayout` and `exerciseAmbiguityInLayout()` in the debugger show which axis is unconstrained\n\n=> The root cause is nearly always a **duplicate constraint added twice**, or a fixed size fighting an intrinsic size." },

    { d: 'medium', q: 'What is the difference between `translatesAutoresizingMaskIntoConstraints` true and false?',
      a: "When **true** (the default for code-created views), UIKit generates constraints from the `frame` and `autoresizingMask`. Those generated constraints are **required**, so they conflict with everything you add.\n\n```\nview.translatesAutoresizingMaskIntoConstraints = false\n```\n\n! Forgetting this is the single most common cause of an unsatisfiable-constraints log in a code-based layout\n+ Views from a storyboard already have it false\n\n```bad  UIKit generates required constraints that fight yours\nlet label = UILabel()\nview.addSubview(label)\nNSLayoutConstraint.activate([\n    label.topAnchor.constraint(equalTo: view.topAnchor)\n])\n// \"Unable to simultaneously satisfy constraints\"\n```\n\n```good\nlet label = UILabel()\nlabel.translatesAutoresizingMaskIntoConstraints = false\nview.addSubview(label)\nNSLayoutConstraint.activate([\n    label.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor)\n])\n```" },

    { d: 'hard', q: 'What is the performance profile of Auto Layout, and when does it become a problem?',
      a: "Solving is roughly **superlinear** in the number of constraints in a connected system, and it re-runs whenever anything changes.\n\n| Scale | Fine? |\n|---|---|\n| One screen, 100 constraints | Yes |\n| A cell with 60 constraints, re-solved per cell per scroll frame | **No** |\n\nMitigations, in order:\n- Fewer, simpler constraints; avoid deep nesting\n- Fixed row heights where possible\n- Lay the cell out manually in `layoutSubviews`, which is what high-performance feed apps actually do" },

    { d: 'medium', q: 'How do you animate a constraint change correctly?',
      a: "```\nheightConstraint.constant = 200          // outside the block\nUIView.animate(withDuration: 0.3) {\n    self.view.layoutIfNeeded()           // inside the block\n}\n```\n\n! Constraints are **not animatable properties.** The frames they produce are\n! Animating the constraint mutation itself does nothing\n\n=> Call `layoutIfNeeded()` once **before** the block too, if there is a pending layout you do not want folded into the animation.\n\n```bad  constraints are not animatable, so this does nothing\nUIView.animate(withDuration: 0.3) {\n    self.heightConstraint.constant = 200\n}\n```\n\n```good  change the constant outside, lay out inside\nview.layoutIfNeeded()                 // flush anything already pending\nheightConstraint.constant = 200\nUIView.animate(withDuration: 0.3) {\n    self.view.layoutIfNeeded()        // this is what animates\n}\n```" },

    { d: 'hard', q: 'What is a layout guide and why prefer it to a dummy view?',
      a: "`UILayoutGuide` is a rectangle that participates in layout **without being a view**.\n\n+ No backing layer\n+ No drawing\n+ No touch handling\n+ No traversal cost\n\nSystem-provided ones:\n- `safeAreaLayoutGuide`, which keeps content clear of the notch, home indicator and nav bar\n- `readableContentGuide`\n- `keyboardLayoutGuide`" },

    { d: 'medium', q: 'What does `UIStackView` do for you and what does it cost?',
      a: "+ Generates and maintains constraints for a linear arrangement: `axis`, `distribution`, `alignment`, `spacing`\n+ Responds to `isHidden` on arranged subviews by **collapsing** them, which is genuinely useful\n! It is constraints underneath, so deep nesting can be slower than a flat set\n! Debugging a conflict inside one is harder, because you did not write the constraints\n\n=> Two or three levels is fine. Six is a smell." },

    { d: 'hard', q: 'Explain `updateConstraints` and why you usually should not override it.',
      a: "A **batching hook**: mark dirty with `setNeedsUpdateConstraints()` and UIKit calls it once before layout.\n\n! Apple's guidance is that changing constraints directly in place is usually **faster**, because `updateConstraints` adds a whole extra pass\n\n=> Override it only when you are provably rebuilding many constraints repeatedly. If you do, always call `super` **last**." },

    { d: 'medium', q: 'How do self-sizing table view cells work?',
      a: "```\ntableView.rowHeight = UITableView.automaticDimension\ntableView.estimatedRowHeight = 120\n```\n\n! The `contentView` must have an **unbroken chain of constraints from top to bottom**, so the solver can derive a height. One missing vertical constraint and the cell collapses\n\n=> The estimate matters for scroll behaviour: a bad estimate makes the scroll indicator jump as real heights replace guesses. Supply per-row estimates with `estimatedHeightForRowAt` when heights vary a lot." }
  ],
  quiz: [
    { d: 'medium', q: 'Two labels side by side, the wrong one truncates. You should:', choices: ['Lower the hugging priority of the label that must stay whole', 'Raise the compression resistance of the label that must stay whole', 'Set both to required priority', 'Give both a fixed width'], correct: 1,
      why: 'Compression resistance controls resistance to shrinking below intrinsic size, which is what truncation is.' },
    { d: 'easy', q: 'For a view created in code and laid out with constraints you must set:', choices: ['translatesAutoresizingMaskIntoConstraints = true', 'translatesAutoresizingMaskIntoConstraints = false', 'autoresizingMask = .flexibleWidth', 'contentMode = .redraw'], correct: 1,
      why: 'Otherwise UIKit generates required constraints from the frame that conflict with everything you add.' },
    { d: 'medium', q: 'To animate a constraint change you:', choices: ['Change the constant inside the animation block', 'Change the constant outside, then call layoutIfNeeded inside the block', 'Animate the constraint object directly', 'Use CABasicAnimation on the constraint'], correct: 1,
      why: 'Constraints are not animatable. The animation interpolates the frames that layoutIfNeeded produces.' },
    { d: 'hard', q: 'A UITableViewCell with 60 constraints scrolls badly. The most direct explanation is:', choices: ['Too many subviews', 'The solver re-runs per cell per frame and cost grows superlinearly with constraint count', 'Auto Layout runs on a background thread', 'Cells are not being reused'], correct: 1,
      why: 'Constraint solving is the dominant cost. Flattening the hierarchy, or hand-laying out in layoutSubviews, is the standard fix for feed-scale cells.' },
    { d: 'medium', q: 'UILayoutGuide is preferable to a spacer view because:', choices: ['It is easier to see in the debugger', 'It has no backing layer, drawing, or touch handling', 'It supports animation', 'It can hold subviews'], correct: 1,
      why: 'It participates in layout with none of the per-view rendering and traversal cost.' },
    { d: 'hard', q: 'A self-sizing cell collapses to zero height. Most likely cause:', choices: ['estimatedRowHeight is too small', 'The contentView lacks an unbroken top-to-bottom constraint chain', 'rowHeight was set to a fixed value', 'The cell is not registered'], correct: 1,
      why: 'The solver needs a continuous vertical path through the content view to derive a height. One missing link and there is nothing to solve.' }
  ]
});

IPREP.addTopic({
  id: 'cellreuse', domain: 'uikit',
  title: 'UITableView, UICollectionView & Cell Reuse',
  summary: 'The reuse pool, prefetching, diffable data sources, and the bugs reuse causes.',
  cards: [
    { d: 'easy', q: 'Why does cell reuse exist and how does it work?',
      a: "A view per row would be O(rows) memory and would stutter on every new row.\n\n1. The table keeps a small pool, sized to what fits on screen plus a couple\n2. A cell scrolling off goes into the pool, keyed by reuse identifier\n3. `dequeueReusableCell` returns a pooled one and calls `prepareForReuse()`\n\n=> About a dozen cell objects serve ten thousand rows." },

    { d: 'medium', q: 'What must `prepareForReuse` do, and what is the most common reuse bug?',
      a: "Reset anything that will **not be unconditionally overwritten** in `cellForRowAt`: cancel an in-flight image load, clear the image, reset accessories, stop animations, clear selection highlight.\n\n! The classic bug: **the wrong image on the wrong row.**\n1. You start an image load for row 3\n2. The cell is reused for row 40 before it finishes\n3. The completion sets row 3's image on the row 40 cell\n\n=> Fix by cancelling in `prepareForReuse`, and by checking the cell's current index path or a token before assigning.\n\n```bad  the completion fires after the cell moved to another row\nfunc configure(with url: URL) {\n    loader.load(url) { image in\n        DispatchQueue.main.async { self.imageView.image = image }\n    }\n}\n```\n\n```good  clear, cancel, and verify before assigning\nprivate var currentURL: URL?\nprivate var task: LoaderTask?\n\nfunc configure(with url: URL) {\n    currentURL = url\n    imageView.image = nil                 // never show the previous row image\n    task = loader.load(url) { [weak self] image in\n        DispatchQueue.main.async {\n            guard self?.currentURL == url else { return }\n            self?.imageView.image = image\n        }\n    }\n}\n\noverride func prepareForReuse() {\n    super.prepareForReuse()\n    task?.cancel()\n    currentURL = nil\n    imageView.image = nil\n}\n```" },

    { d: 'hard', q: 'Why does checking `tableView.indexPath(for: cell)` in the image completion fix the wrong-image bug?',
      a: "It asks the table what that cell object is **currently** displaying, not what it was when you started. If it no longer matches, discard the result.\n\n| Approach | Trade-off |\n|---|---|\n| Compare index paths | Works, but depends on the table |\n| **A per-cell token** | O(1), no table needed, works for collection views and nested reuse |\n\n=> Store a `UUID` on the cell when the load starts, capture it in the closure, and drop the result if `cell.token != captured`." },

    { d: 'medium', q: 'What is the difference between registering a class and a nib for reuse?',
      a: "| Registration | Creates via | Speed |\n|---|---|---|\n| Class | `init(style:reuseIdentifier:)` | Faster |\n| Nib | Unarchiving the nib each time | **Measurably slower** |\n\n=> Either way, once registered, `dequeueReusableCell(withIdentifier:for:)` **never returns nil**, which is why the modern `for indexPath:` variant is non-optional. The old nil-returning variant predates required registration." },

    { d: 'hard', q: 'What is prefetching and when does it help?',
      a: "`UITableViewDataSourcePrefetching` gives you `prefetchRowsAt` a few screens ahead, and `cancelPrefetchingForRowsAt` when the user reverses.\n\n+ Helps when the per-row work is **asynchronous and cancellable**, like image downloads\n! Does not help if the work must happen on the main thread anyway\n! **Actively hurts** if you start unbounded work and never cancel, because a fast flick queues hundreds of requests\n\n=> The cancel callback is doing real work, not decoration." },

    { d: 'medium', q: 'What does a diffable data source change about your code?',
      a: "You stop mutating rows imperatively and instead apply a **snapshot of section and item identifiers**. UIKit computes the diff and performs the correct insert, delete, move and reload animations.\n\n+ Eliminates 'invalid number of rows' exceptions, which came from the array and the batch updates disagreeing\n! Item identifiers must be `Hashable`, **stable and unique**\n\n=> Using a value that changes when the item changes causes a delete plus insert instead of a reload." },

    { d: 'hard', q: 'Why must diffable data source identifiers be identity, not content?',
      a: "The diff is computed on identifiers. If your identifier hashes the **whole model**, editing a title produces a different identifier.\n\n! The framework sees a delete plus an insert, not an update\n! You lose the reload animation\n! You lose selection\n! You lose scroll position stability\n\n=> Use a stable `id`. To reflect content changes, call `snapshot.reconfigureItems([id])` (iOS 15+), which re-runs the cell provider without recreating the cell.\n\n```bad  synthesised Hashable includes title, so identity tracks content\nstruct Post: Hashable {\n    let id: UUID\n    var title: String\n}\n\nsnapshot.appendItems(posts)\n// Editing a title now reads as: delete this row, insert a different one.\n```\n\n```good  identity is the id; content is read by the cell provider\nstruct Post: Hashable, Identifiable {\n    let id: UUID\n    var title: String\n\n    static func == (a: Post, b: Post) -> Bool { a.id == b.id }\n    func hash(into h: inout Hasher) { h.combine(id) }\n}\n\n// Reflect a content change without recreating the cell:\nsnapshot.reconfigureItems([post.id])      // iOS 15+\ndataSource.apply(snapshot, animatingDifferences: true)\n```\n\nCleaner still: make the snapshot hold **ids only**, so content can never leak into identity.\n\n```good\nvar snapshot = NSDiffableDataSourceSnapshot<Section, Post.ID>()\nsnapshot.appendItems(posts.map(\\.id))\n```" },

    { d: 'medium', q: 'What causes the classic "invalid number of rows in section" crash?',
      a: "**The model and the batch update disagree.** You called `insertRows(at:)` for one row but the data source no longer returns old count plus one.\n\n! It also happens when you mutate the model on a background thread while the table reads it on main.\n\nRules:\n- Mutate the model and update the table in the **same main-thread turn**\n- Use `performBatchUpdates` so the framework validates the whole set at once\n- Or move to a diffable data source, which removes the class of bug" },

    { d: 'hard', q: 'How do you make a complex feed cell scroll at 120Hz?',
      a: "- **Flatten the hierarchy.** Every view costs traversal and composition\n- **Avoid `draw(_:)`.** Use layers\n- **Precompute heights and text layout** off the main thread, cached per item\n- **Decode images off the main thread at display size.** `UIImage(data:)` decodes lazily on first draw, which is on the main thread\n- **Avoid offscreen rendering.** Set `shadowPath`; avoid `cornerRadius` plus `masksToBounds` on complex content\n- **Do not build subviews in `cellForRow`**\n\n=> Then measure with the Animation Hitches template rather than guessing." },

    { d: 'medium', q: 'What is the difference between `reloadData` and `reloadRows`?',
      a: "| | `reloadData` | `reloadRows(at:with:)` |\n|---|---|---|\n| Scope | Everything | Specific rows |\n| Animation | None | Yes |\n| Selection and editing state | **Lost** | Preserved |\n| Cost | Full layout pass | Proportional |\n\n! `reloadData` is the sledgehammer that hides model bugs. Calling it after every small change pays a full layout pass to avoid thinking about the diff, and visibly flickers on a long list." },

    { d: 'hard', q: 'What is a compositional layout and why did it replace flow layout for complex screens?',
      a: "`UICollectionViewCompositionalLayout` describes layout **declaratively**: items inside groups inside sections, each with its own size, spacing, orthogonal scrolling and supplementary views.\n\n| | Flow layout subclass | Compositional |\n|---|---|---|\n| Carousel above a grid above a list | Hundreds of lines of `layoutAttributesForElements` | A few dozen lines |\n| Computes | Often everything up front | Only what is visible |\n\n=> So it also scales to large sections better than a hand-rolled layout." }
  ],
  quiz: [
    { d: 'medium', q: 'The wrong image shows on a row after fast scrolling. The root cause is:', choices: ['The image cache is too small', 'An async completion sets an image on a cell that has since been reused for another row', 'prepareForReuse is called too often', 'The table needs reloadData'], correct: 1,
      why: 'Cancel in prepareForReuse, or verify the cell still represents the index path (or match a per-cell token) before assigning.' },
    { d: 'medium', q: '`dequeueReusableCell(withIdentifier:for:)` returns non-optional because:', choices: ['It creates a cell if the pool is empty, and registration is required', 'It crashes on nil', 'Cells are never deallocated', 'It uses force unwrapping internally'], correct: 0,
      why: 'Registration guarantees the table can always construct one, so the API can be non-optional.' },
    { d: 'hard', q: 'Your diffable item identifier hashes the whole model. Editing a title causes:', choices: ['A smooth reload of that row', 'A delete plus insert, losing selection and animation', 'A crash', 'Nothing, the diff ignores it'], correct: 1,
      why: 'Identifiers must be identity. Use a stable id and reconfigureItems to reflect content changes.' },
    { d: 'medium', q: '"Invalid number of rows in section" means:', choices: ['The cell height is wrong', 'The data source count and the batch update do not agree', 'You forgot to register a cell', 'The table view is nil'], correct: 1,
      why: 'Mutate model and table in the same main-thread turn, or use a diffable data source, which removes the failure mode.' },
    { d: 'hard', q: 'UIImage(data:) decoding is a scroll hazard because:', choices: ['It always fails for large images', 'Decoding is lazy and happens on the main thread at first draw', 'It blocks the network', 'It caches too aggressively'], correct: 1,
      why: 'Force the decode on a background queue at display size, so the main thread only composites an already-decoded bitmap.' },
    { d: 'easy', q: 'Prefetching actively hurts when:', choices: ['The list is short', 'You start unbounded work and never cancel on reversal', 'Cells are self-sizing', 'You use a diffable data source'], correct: 1,
      why: 'A fast flick queues hundreds of requests. cancelPrefetchingForRowsAt exists precisely to bound this.' }
  ]
});

IPREP.addTopic({
  id: 'responder', domain: 'uikit',
  title: 'Responder Chain, Hit Testing & Gestures',
  summary: 'How a touch finds its view, how events bubble, and why taps sometimes do nothing.',
  cards: [
    { d: 'easy', q: 'What is the responder chain?',
      a: "An ordered list of objects that each get a chance to handle an event:\n\n**first responder → superviews up the hierarchy → view controller → window → application → app delegate**\n\nEach `UIResponder` either handles the event or calls `super`, passing it along.\n\n=> It is what makes `sendAction(_:to:nil:for:)` with a nil target work: the action travels the chain until something responds to that selector." },

    { d: 'medium', q: 'Describe hit testing, precisely.',
      a: "UIKit calls `hitTest(_:with:)` on the window and recurses **depth-first in reverse subview order**, topmost first.\n\n1. For each view, call `point(inside:with:)`\n2. If false, **skip that whole branch**\n3. The deepest view returning itself wins\n\nA view is skipped entirely if:\n! `isHidden`\n! `alpha <= 0.01`\n! `isUserInteractionEnabled == false`\n\n=> Hit testing **finds** the target. The responder chain **propagates** from it. Two different systems." },

    { d: 'hard', q: 'A button outside its parent view bounds does not respond. Why, and how do you fix it?',
      a: "Because `point(inside:with:)` on the **parent** returns false there, so hit testing never descends into the button.\n\n! This has nothing to do with `clipsToBounds`. **Visibility and touchability are separate systems.**\n\nFix by overriding on the parent:\n- `point(inside:with:)` to also return true for the button's frame\n- Or `hitTest` to return the button\n\n=> This is exactly how you enlarge a small button's tap target, which is the most-asked version of the question." },

    { d: 'medium', q: 'How do you increase a button\'s tap target without changing its visual size?',
      a: "```\noverride func point(inside p: CGPoint, with e: UIEvent?) -> Bool {\n    bounds.insetBy(dx: -10, dy: -10).contains(p)\n}\n```\n\nA **negative** inset grows the hit rectangle.\n\n- The alternative in modern UIKit is `UIButton.Configuration` with `contentInsets`, which changes the actual frame\n\n=> The HIG minimum is **44 x 44 points**, and this override is how you honour it without a 44pt icon.\n\n```bad  changes the layout and pushes neighbours around\ncloseButton.frame = closeButton.frame.insetBy(dx: -10, dy: -10)\n```\n\n```good  visual size unchanged, hit area grown\nfinal class CloseButton: UIButton {\n    override func point(inside p: CGPoint, with e: UIEvent?) -> Bool {\n        let dx = min(0, bounds.width  - 44) / 2\n        let dy = min(0, bounds.height - 44) / 2\n        return bounds.insetBy(dx: dx, dy: dy).contains(p)\n    }\n}\n```" },

    { d: 'medium', q: 'What is the first responder, and how do you manage it?',
      a: "The object at the head of the responder chain, typically the focused text input.\n\n| Call | Does |\n|---|---|\n| `becomeFirstResponder()` | Requests it |\n| `resignFirstResponder()` | Gives it up |\n| `canBecomeFirstResponder` | Gates eligibility |\n| `view.endEditing(true)` | Walks the hierarchy and resigns whatever holds it |\n\n=> That last one is the reliable way to dismiss a keyboard when you have no reference to the specific field." },

    { d: 'hard', q: 'How do gesture recognizers interact with touch delivery to views?',
      a: "Recognizers get the touches **before** the hit-tested view.\n\n1. While a recognizer is `.possible`, touches go to both\n2. When it **recognises**, it sends `touchesCancelled` to the view and takes over\n\n! Which is why a `UITapGestureRecognizer` on a superview can silently swallow a button's touch.\n\nControls:\n- `cancelsTouchesInView` (set false to let the view keep them)\n- `delaysTouchesBegan`, `delaysTouchesEnded`\n- `shouldRecognizeSimultaneouslyWith`, `shouldRequireFailureOf`, `shouldReceive touch`" },

    { d: 'hard', q: 'Two gesture recognizers conflict. What is your toolkit?',
      a: "| Tool | For |\n|---|---|\n| `require(toFail:)` | Single vs double tap. **Costs a delay** on the single tap |\n| `shouldRecognizeSimultaneouslyWith` | Both should fire, like pinch plus rotate |\n| `shouldBeRequiredToFail` / `shouldRequireFailureOf` | Dynamic precedence |\n| `gestureRecognizer(_:shouldReceive:)` | Reject touches in a region entirely |\n\n=> That last one is the cleanest fix for 'my tap-to-dismiss also fires on the sheet content'. In a scroll view, `panGestureRecognizer` participates too, so a custom pan usually needs simultaneous recognition." },

    { d: 'medium', q: 'What is the difference between `touchesBegan` and a UITapGestureRecognizer?',
      a: "| | Raw touches | Gesture recognizer |\n|---|---|---|\n| What you get | Every touch, build your own state machine | A prebuilt, reusable state machine |\n| Coordination with others | None | Failure and simultaneity system |\n\n=> Use recognizers by default. Drop to raw touches only for genuinely custom multi-touch interaction, and remember you must handle `touchesCancelled`, which is the step people forget." },

    { d: 'hard', q: 'Why might `isUserInteractionEnabled` on a parent break an unrelated child?',
      a: "It disables the **whole subtree** for hit testing. `hitTest` returns nil immediately and never examines subviews, so every descendant becomes untouchable regardless of its own setting.\n\n! The same total blackout comes from `alpha <= 0.01` on an ancestor.\n\n=> That is a real trap when you fade a container to 0 to hide it rather than setting `isHidden`." },

    { d: 'medium', q: 'What does `UIControl` add over a plain view with a tap recognizer?',
      a: "The target-action mechanism with a rich event set: `touchDown`, `touchUpInside`, `touchDragExit`, `valueChanged`.\n\n+ It **tracks the touch through drag**, so `touchUpInside` correctly does not fire if the finger leaves the bounds before lifting\n+ Highlight states and accessibility traits for free\n\n=> A tap recognizer gives you none of that. Reimplementing drag-out cancellation by hand is exactly why `UIControl` exists." }
  ],
  quiz: [
    { d: 'medium', q: 'hitTest recurses through subviews in:', choices: ['Subview array order, front to back', 'Reverse subview order, topmost first', 'Alphabetical order by tag', 'Order of constraint installation'], correct: 1,
      why: 'The last subview is drawn on top and must win the touch, so hit testing walks in reverse.' },
    { d: 'hard', q: 'A button positioned outside its parent bounds is untappable. The fix is:', choices: ['Set clipsToBounds = false', 'Override point(inside:with:) or hitTest on the parent', 'Raise the button zPosition', 'Set isUserInteractionEnabled on the button'], correct: 1,
      why: 'clipsToBounds affects drawing only. Hit testing stops at the parent because point(inside:) returns false.' },
    { d: 'medium', q: 'A view is skipped by hit testing when:', choices: ['alpha <= 0.01, isHidden, or isUserInteractionEnabled is false', 'It has no subviews', 'It has no gesture recognizers', 'Its backgroundColor is clear'], correct: 0,
      why: 'A clear background is still hit-testable, which is why invisible-but-present views intercept taps unexpectedly.' },
    { d: 'hard', q: 'A tap recognizer on a superview stops a button working. The most targeted fix:', choices: ['Remove the recognizer', 'Set cancelsTouchesInView = false, or reject the touch in gestureRecognizer(_:shouldReceive:)', 'Set delaysTouchesBegan = true', 'Move the button above the recognizer view'], correct: 1,
      why: 'On recognition the recognizer cancels touches in the view by default. Either stop cancelling, or refuse touches landing on controls.' },
    { d: 'medium', q: 'touchUpInside does NOT fire if:', choices: ['The touch lasted over a second', 'The finger left the control bounds before lifting', 'The control is inside a scroll view', 'Two fingers were used'], correct: 1,
      why: 'UIControl tracks the touch through drag. That drag-out cancellation is a key reason to use UIControl over a tap recognizer.' },
    { d: 'easy', q: 'The minimum recommended tap target per the HIG is:', choices: ['24x24 pt', '32x32 pt', '44x44 pt', '60x60 pt'], correct: 2,
      why: 'Enlarge via point(inside:) with a negative inset when the visual element is smaller than 44pt.' }
  ]
});

IPREP.addTopic({
  id: 'coreanimation', domain: 'uikit',
  title: 'Core Animation & CALayer',
  summary: 'The layer tree, implicit vs explicit animation, and the model/presentation split.',
  cards: [
    { d: 'easy', q: 'What are the three layer trees?',
      a: "| Tree | Holds | Read with |\n|---|---|---|\n| **Model** | The values you set. The **final** value, even mid-animation | `layer.opacity` |\n| **Presentation** | What is on screen right now, interpolated | `layer.presentation()` |\n| **Render** | Private to the render server, used for compositing | Not accessible |\n\n=> This split is why hit testing a moving view fails: the model layer is already at the destination while the pixels are still travelling." },

    { d: 'medium', q: 'What is implicit animation and why does it not happen on UIView layers?',
      a: "Setting an animatable `CALayer` property normally creates an implicit 0.25s animation, driven by the layer's action lookup.\n\n! But a layer **backing a `UIView`** returns `NSNull` from `action(for:)` outside an animation block, which disables it.\n\n| Layer | `layer.opacity = 0` |\n|---|---|\n| View-backed | Snaps |\n| Standalone sublayer you added | **Fades** |\n\n=> That asymmetry surprises people who add a sublayer and find it animating its frame on every `layoutSubviews`." },

    { d: 'hard', q: 'How do you stop a standalone sublayer from animating its frame on every layout?',
      a: "```\nCATransaction.begin()\nCATransaction.setDisableActions(true)\ngradientLayer.frame = bounds\nCATransaction.commit()\n```\n\nOr return `NSNull` from the layer delegate's `action(for:forKey:)`.\n\n! Without this, resizing on rotation or keyboard appearance produces a visible quarter-second lag as the sublayer animates to catch up." },

    { d: 'medium', q: 'Explain `fillMode` and `isRemovedOnCompletion`.',
      a: "A `CAAnimation` **does not change the model layer.** It only affects the presentation, and on completion it is removed and the layer snaps back.\n\n! Setting `isRemovedOnCompletion = false` plus `fillMode = .forwards` makes it **look** finished. That is a lie:\n! The model value is unchanged\n! Hit testing uses the old value\n! Subsequent layout uses the old value\n! Any read of the property returns the old value\n\n=> The correct fix is to set the model property to the final value and animate **from** the old one." },

    { d: 'hard', q: 'What is the difference between UIView animation and CAAnimation?',
      a: "| | `UIView.animate` | `CABasicAnimation` |\n|---|---|---|\n| Sets the model value | **Yes** | No, you must |\n| End state is real | Yes | Only if you set it |\n| Scope | Animatable `UIView` properties | Any animatable layer property |\n\nDrop to `CAAnimation` when you need:\n- Keyframes on a path\n- Custom timing per keyframe, or `CAAnimationGroup`\n- Layer-only properties like `shadowPath` or `strokeEnd`\n- Fine control over `beginTime` for choreography" },

    { d: 'medium', q: 'What is `anchorPoint` and how does it interact with `position`?',
      a: "A **unit-space point**, default `(0.5, 0.5)`, that defines both the origin of transforms **and** the point `position` places.\n\n! Setting it to `(0, 0)` makes rotation pivot around the top-left **and moves the layer**, because `position` now refers to the top-left.\n\n=> To change the anchor without moving the layer, adjust `position` by the delta. This is the whole trick behind rotating a hand around a clock's centre." },

    { d: 'hard', q: 'What does `shouldRasterize` do and when is it a win?',
      a: "Renders the layer and its sublayers once into a bitmap and reuses it on later frames, at `rasterizationScale`.\n\n+ **A win** for a complex, **static** subtree composited repeatedly, like a detailed card being translated\n! **A loss** when the content changes, because every change invalidates the cache and forces a re-render. Strictly worse than not caching\n! Forgetting `rasterizationScale = UIScreen.main.scale` gives blurry output on Retina\n\n=> Verify with Color Hits Green and Misses Red." },

    { d: 'medium', q: 'Which CALayer properties are animatable, and which are the useful specialised layers?',
      a: "**Animatable:** `position`, `bounds`, `opacity`, `transform`, `backgroundColor`, `cornerRadius`, `borderWidth`, `shadowOpacity`, `shadowPath`, and for `CAShapeLayer`, `path` and `strokeEnd`.\n\n| Layer | For |\n|---|---|\n| `CAShapeLayer` | Vector paths, animatable stroke |\n| `CAGradientLayer` | Gradients |\n| `CAEmitterLayer` | Particles |\n| `CAReplicatorLayer` | Repeated copies |\n| `CATransformLayer` | True 3D |\n| `AVPlayerLayer` | Video |\n\n=> Naming three or four of these unprompted signals real Core Animation experience." },

    { d: 'hard', q: 'How do you animate drawing a path, like a checkmark?',
      a: "```\nlet a = CABasicAnimation(keyPath: \"strokeEnd\")\na.fromValue = 0; a.toValue = 1\na.duration = 0.4\na.timingFunction = CAMediaTimingFunction(name: .easeOut)\nlayer.strokeEnd = 1          // model value FIRST\nlayer.add(a, forKey: \"draw\")\n```\n\n=> Note the model value is set **before** adding the animation, so the layer holds the final state without `fillMode` tricks. This is the canonical Core Animation interview answer." },

    { d: 'medium', q: 'Why does a view being animated not respond to taps where you see it?',
      a: "Hit testing uses the **model** layer, which already holds the destination, while your eye sees the **presentation** layer mid-flight.\n\n=> So the touchable region is at the end position, not the visible one.\n\nIf you need the visible region tappable during an animation:\n- Hit test against `layer.presentation()`\n- Use `UIViewPropertyAnimator`, whose interactive animations keep the model in step\n- Or set `.allowUserInteraction` on the UIView animation options" }
  ],
  quiz: [
    { d: 'medium', q: 'Reading `layer.opacity` during an animation gives you:', choices: ['The current on-screen value', 'The final model value', 'Zero', 'The initial value'], correct: 1,
      why: 'The model tree holds the destination. Use layer.presentation() for the in-flight interpolated value.' },
    { d: 'hard', q: 'isRemovedOnCompletion = false with fillMode = .forwards is discouraged because:', choices: ['It leaks memory', 'The model value is unchanged, so layout and hit testing use the old value', 'It disables the GPU', 'It only works on iOS 12'], correct: 1,
      why: 'It makes the layer look finished while the real state is stale. Set the model property and animate from the old value instead.' },
    { d: 'medium', q: 'A CAGradientLayer you added animates its frame on every rotation. Fix:', choices: ['Set it as the view backing layer', 'Wrap the frame change in a CATransaction with setDisableActions(true)', 'Use UIView.animate with duration 0', 'Set masksToBounds'], correct: 1,
      why: 'Standalone layers get implicit animations. View-backed layers return NSNull from action(for:) and do not.' },
    { d: 'hard', q: 'shouldRasterize hurts performance when:', choices: ['The subtree is static and complex', 'The content changes frequently, invalidating the cache every frame', 'The layer is small', 'rasterizationScale is set correctly'], correct: 1,
      why: 'Every invalidation forces a re-render plus the cache write, which is strictly worse than compositing directly.' },
    { d: 'medium', q: 'To animate a checkmark drawing itself you animate:', choices: ['CAShapeLayer.strokeEnd', 'CALayer.opacity', 'CAGradientLayer.locations', 'CALayer.mask'], correct: 0,
      why: 'strokeEnd controls how much of the path is stroked, from 0 to 1, which reads as drawing.' },
    { d: 'hard', q: 'Changing anchorPoint to (0,0) also moves the layer because:', choices: ['bounds is recalculated', 'position refers to the anchor point, which has moved', 'The transform is reset', 'The superlayer relaid out'], correct: 1,
      why: 'Compensate by adjusting position by the delta if you want to change the pivot without moving the layer.' }
  ]
});

IPREP.addTopic({
  id: 'navigation', domain: 'uikit',
  title: 'Navigation, Coordinators & Deep Linking',
  summary: 'Who decides what screen comes next, and how to keep view controllers reusable.',
  cards: [
    { d: 'easy', q: 'What problem does the coordinator pattern solve?',
      a: "In plain UIKit, a view controller **pushes the next one**, which means it knows about its successor, constructs its dependencies, and cannot be reused elsewhere.\n\n! Navigation logic ends up scattered across every screen.\n\nA coordinator owns the flow: it creates controllers, injects dependencies, and decides what happens on each outcome. The controller just **reports events**.\n\n=> Screens become reusable, and the flow becomes readable and testable in one file." },

    { d: 'medium', q: 'Sketch the shape of a coordinator.',
      a: "```\nprotocol Coordinator: AnyObject {\n    var childCoordinators: [Coordinator] { get set }\n    func start()\n}\n\nfinal class OnboardingCoordinator: Coordinator {\n    var childCoordinators: [Coordinator] = []\n    private let nav: UINavigationController\n    func start() {\n        let vc = WelcomeViewController()\n        vc.onContinue = { [weak self] in self?.showSignUp() }\n        nav.pushViewController(vc, animated: false)\n    }\n}\n```\n\n! The crucial discipline: **remove a child when its flow ends**, or you leak the whole subtree." },

    { d: 'hard', q: 'What is the hardest part of coordinators in practice?',
      a: "**Child lifecycle.** Nothing tells the parent that a flow ended when the user swipes back or dismisses a sheet, so children accumulate and leak.\n\nSolutions:\n- The child calls `didFinish(self)` on a parent delegate\n- Implement `UINavigationControllerDelegate.didShow` and compare the stack against your children\n- `UIAdaptivePresentationControllerDelegate.presentationControllerDidDismiss` for sheets\n\n=> Every real coordinator implementation has some version of this bookkeeping. A candidate who does not mention it has not shipped one." },

    { d: 'medium', q: 'How do you pass data back from a pushed view controller?',
      a: "In order of preference:\n\n1. **A closure** on the pushed controller, set by the coordinator. Simple, one-shot, no protocol boilerplate\n2. **A delegate protocol**, when there are several related callbacks\n3. **A shared observable model** or stream, when the data outlives the screen\n\n! What you must not do: reach up the stack with `navigationController?.viewControllers[0] as? HomeVC`. It couples the screens and crashes the moment the stack composition changes.\n\n```bad  couples the screens; breaks when the stack changes\nif let home = navigationController?.viewControllers.first as? HomeViewController {\n    home.selectedCity = city\n}\nnavigationController?.popViewController(animated: true)\n```\n\n```good  report the event, let the owner decide\nfinal class CityPickerViewController: UIViewController {\n    var onPick: ((City) -> Void)?\n    private func didTap(_ city: City) { onPick?(city) }\n}\n\n// the coordinator owns the decision\nlet picker = CityPickerViewController()\npicker.onPick = { [weak self] city in\n    self?.handle(city)\n    self?.nav.popViewController(animated: true)\n}\n```" },

    { d: 'hard', q: 'How would you implement deep linking cleanly?',
      a: "Parse the URL into a **typed `Route`**, then hand it to a router.\n\n```\nenum Route { case product(id: String), settings, checkout(cart: String) }\n```\n\nThree decisions to state out loud:\n- **Rebuild vs navigate.** Cold launch builds the whole stack; a warm app may need to dismiss modals first\n- **Authentication.** A route may require login, so the router must queue it and replay after auth\n- **Validation.** An unknown URL must fall back gracefully, never crash\n\n=> Parsing into a typed route first is what makes all three tractable." },

    { d: 'medium', q: 'What is `UINavigationController` actually managing?',
      a: "A **stack** of view controllers, plus the navigation bar and the interactive pop gesture.\n\n| Method | Does |\n|---|---|\n| `pushViewController` | Adds one |\n| `popViewController` | Removes the top |\n| `popToRootViewController` | Back to the bottom |\n| `setViewControllers(_:animated:)` | **Replaces the whole stack** |\n\n=> That last one is the one people forget. It is how you complete a flow and land on a detail screen with a sensible back button, without pushing three screens the user never sees." },

    { d: 'hard', q: 'What breaks when you present a modal from a view controller that is not visible?',
      a: "You get 'Attempt to present X on Y whose view is not in the window hierarchy'.\n\nWhen it happens:\n! Presenting from `viewDidLoad`\n! Presenting from a controller already dismissed\n! Presenting from one already covered by another modal\n\nThe fix:\n- Present from the **topmost presented controller**\n- Present no earlier than `viewDidAppear`\n\n=> A coordinator helps, because it holds the presenting context rather than assuming `self` is on screen." },

    { d: 'medium', q: 'Storyboard segues versus programmatic navigation, what is the real trade-off?',
      a: "| | Segues | Programmatic |\n|---|---|---|\n| Flow visibility | A visual map | Read the code |\n| Boilerplate | Less, for simple apps | More |\n| Merge conflicts | **A large XML file** | Normal |\n| Dependency injection | Awkward | Natural |\n| Unit testing the flow | **Not possible** | Yes |\n\n=> Most teams past a certain size move navigation into code, often keeping storyboards or XIBs for individual screen layout." },

    { d: 'hard', q: 'How do you unit test navigation logic?',
      a: "Make the decisions observable and the dependencies injectable. Give the coordinator a navigation **abstraction**:\n\n```\nprotocol Navigator { func push(_ vc: UIViewController, animated: Bool) }\n```\n\n- The test drives the coordinator with a **spy navigator**\n- It asserts on the type of controller pushed and the order\n\n=> The point is that flow logic now lives in a plain object with no view lifecycle, so it tests in milliseconds without a host application." },

    { d: 'medium', q: 'How do you handle navigation state restoration?',
      a: "Encode the current **route stack**, not the view controllers.\n\n- `NSUserActivity` is the system-supported mechanism, and it also feeds Handoff, Spotlight and Siri suggestions\n- Persist a lightweight array of your `Route` enum\n- On launch, replay it through the **same router** used for deep links\n\n=> That reuse is the whole argument for typed routes: restoration, deep links, push notification taps and widget taps all become one code path." }
  ],
  quiz: [
    { d: 'medium', q: 'The main benefit of the coordinator pattern is:', choices: ['Faster rendering', 'View controllers no longer know about their successors, so they become reusable and the flow is testable', 'Less memory usage', 'It removes the need for a navigation controller'], correct: 1,
      why: 'It moves flow decisions out of the screens, which is what makes both reuse and unit testing possible.' },
    { d: 'hard', q: 'The most common coordinator bug is:', choices: ['Retain cycles between coordinator and view controller', 'Failing to remove child coordinators when a flow ends, leaking the subtree', 'Pushing on the wrong thread', 'Not using storyboards'], correct: 1,
      why: 'Nothing signals flow completion on a back swipe or sheet dismissal, so you need explicit didFinish bookkeeping.' },
    { d: 'medium', q: '"Attempt to present on a view controller whose view is not in the window hierarchy" usually means:', choices: ['You presented too early, or from a controller no longer on screen', 'The modal has no storyboard', 'You forgot animated: true', 'The view controller has no navigation controller'], correct: 0,
      why: 'Present from the topmost presented controller, and not before viewDidAppear.' },
    { d: 'hard', q: 'Parsing a deep link into a typed Route enum first is valuable mainly because:', choices: ['It is faster than string comparison', 'Deep links, restoration, push taps and widget taps then share one code path', 'It avoids URL encoding bugs', 'It is required by iOS'], correct: 1,
      why: 'One typed route plus one router handles every entry point, including the auth-required and cold-launch cases.' },
    { d: 'medium', q: 'To replace the whole navigation stack with an animation you use:', choices: ['popToRootViewController', 'setViewControllers(_:animated:)', 'pushViewController repeatedly', 'dismiss(animated:)'], correct: 1,
      why: 'It lands the user on the right screen with a sensible back stack, without animating through screens they never asked for.' },
    { d: 'easy', q: 'Passing data back from a pushed controller is best done with:', choices: ['Reaching into navigationController.viewControllers and casting', 'A closure or delegate the parent or coordinator sets', 'A global singleton', 'NotificationCenter'], correct: 1,
      why: 'Reaching up the stack couples the screens and breaks the moment the stack composition changes.' }
  ]
});
