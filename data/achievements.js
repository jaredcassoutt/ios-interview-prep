/* Achievements — unlockable badges. ctx is supplied by store.checkBadges(). */

[
  { id: 'first-card',  em: '🎬', name: 'First Blood',        xp: 20,
    desc: 'Review your first flashcard.',
    check: c => c.totals.cards >= 1 },

  { id: 'century',     em: '💯', name: 'Century',            xp: 60,
    desc: 'Review 100 flashcards.',
    check: c => c.totals.cards >= 100 },

  { id: 'five-hundred', em: '🗂️', name: 'Card Shark',        xp: 120,
    desc: 'Review 500 flashcards.',
    check: c => c.totals.cards >= 500 },

  { id: 'millennium',  em: '🏔️', name: 'Millennium',         xp: 250,
    desc: 'Review 1,000 flashcards.',
    check: c => c.totals.cards >= 1000 },

  { id: 'streak-3',    em: '🔥', name: 'Warming Up',          xp: 40,
    desc: 'Study three days in a row.',
    check: c => c.streak >= 3 },

  { id: 'streak-7',    em: '🔥', name: 'Week Warrior',        xp: 90,
    desc: 'Keep a 7-day streak.',
    check: c => c.streak >= 7 },

  { id: 'streak-14',   em: '⚡', name: 'Fortnight',           xp: 150,
    desc: 'Keep a 14-day streak.',
    check: c => c.streak >= 14 },

  { id: 'streak-30',   em: '👑', name: 'Unbroken',            xp: 300,
    desc: 'Keep a 30-day streak.',
    check: c => c.streak >= 30 },

  { id: 'perfect-quiz', em: '🎯', name: 'Flawless',           xp: 80,
    desc: 'Score 100% on a quiz round of 8 or more questions.',
    check: c => !!c.flags.perfectQuiz },

  { id: 'fast-quiz',   em: '⚡', name: 'Speed Demon',         xp: 90,
    desc: 'Score 80%+ on a quiz averaging under 6 seconds a question.',
    check: c => !!c.flags.fastQuiz },

  { id: 'quiz-50',     em: '❓', name: 'Question Everything', xp: 60,
    desc: 'Answer 50 quiz questions.',
    check: c => c.totals.quizQ >= 50 },

  { id: 'quiz-200',    em: '🧠', name: 'Quiz Machine',        xp: 130,
    desc: 'Answer 200 quiz questions.',
    check: c => c.totals.quizQ >= 200 },

  { id: 'hard-50',     em: '🪨', name: 'Deep Diver',          xp: 110,
    desc: 'Review 50 cards tagged hard.',
    check: c => c.totals.hardCards >= 50 },

  { id: 'first-chal',  em: '⌨️', name: 'Hello, World',        xp: 40,
    desc: 'Complete your first coding challenge.',
    check: c => c.totals.challenges >= 1 },

  { id: 'chal-10',     em: '🛠️', name: 'Builder',             xp: 120,
    desc: 'Complete 10 coding challenges.',
    check: c => c.totals.challenges >= 10 },

  { id: 'chal-all',    em: '🏗️', name: 'Code Machine',        xp: 300,
    desc: 'Complete every coding challenge.',
    check: c => c.totals.challenges >= IPREP.challenges.length },

  { id: 'no-hints',    em: '🕶️', name: 'No Hints Needed',     xp: 100,
    desc: 'Solve a coding challenge without revealing a hint.',
    check: c => c.totals.noHintWins >= 1 },

  { id: 'no-hints-5',  em: '🥷', name: 'Raw Dogging It',      xp: 180,
    desc: 'Solve five coding challenges with no hints revealed.',
    check: c => c.totals.noHintWins >= 5 },

  { id: 'first-mock',  em: '🎤', name: 'Take the Mic',        xp: 40,
    desc: 'Answer your first mock interview prompt.',
    check: c => c.totals.mocks >= 1 },

  { id: 'mock-all',    em: '🗣️', name: 'Interview Ready',     xp: 300,
    desc: 'Work through every mock interview prompt.',
    check: c => c.totals.mocks >= IPREP.mocks.length },

  { id: 'polyglot',    em: '🌐', name: 'Full Stack of iOS',   xp: 90,
    desc: 'Study all six domains in a single day.',
    check: c => c.day.domains.length >= 6 },

  { id: 'all-topics',  em: '🗺️', name: 'Cartographer',        xp: 140,
    desc: 'Touch at least one card in all 30 topics.',
    check: c => c.seenTopics >= IPREP.topics.length },

  { id: 'quests-1',    em: '✅', name: 'Full House',          xp: 70,
    desc: 'Complete all three daily quests in one day.',
    check: c => c.fullQuestDays() >= 1 },

  { id: 'quests-5',    em: '🎖️', name: 'Grinder',             xp: 160,
    desc: 'Complete all daily quests on five separate days.',
    check: c => c.fullQuestDays() >= 5 },

  { id: 'arc-master',  em: '🔗', name: 'ARC Welder',          xp: 110,
    desc: 'Reach 90% mastery on ARC and retain cycles.',
    check: c => c.topicMastery('arc') >= 0.9 },

  { id: 'thread-safe', em: '🧵', name: 'Thread Safe',         xp: 220,
    desc: 'Master every topic in Concurrency & Threading.',
    check: c => c.domainMastered('concurrency') },

  { id: 'layout-boss', em: '📐', name: 'Layout Engine',       xp: 220,
    desc: 'Master every topic in UI & View Hierarchy.',
    check: c => c.domainMastered('uikit') },

  { id: 'architect',   em: '🏛️', name: 'The Architect',       xp: 220,
    desc: 'Master every topic in Architecture & Design.',
    check: c => c.domainMastered('architecture') },

  { id: 'mastery-10',  em: '🌟', name: 'Ten Deep',            xp: 170,
    desc: 'Reach 90% mastery on ten topics.',
    check: c => c.masteredTopics() >= 10 },

  { id: 'mastery-all', em: '🏆', name: 'Interview Final Boss', xp: 500,
    desc: 'Reach 80% overall mastery across all 30 topics.',
    check: c => c.mastery() >= 0.8 },

  { id: 'night-owl',   em: '🦉', name: 'Night Owl',           xp: 30,
    desc: 'Study between midnight and 4am.',
    check: c => c.hour >= 0 && c.hour < 4 && c.day.cards >= 5 },

  { id: 'early-bird',  em: '🌅', name: 'Early Bird',          xp: 30,
    desc: 'Study before 7am.',
    check: c => c.hour >= 4 && c.hour < 7 && c.day.cards >= 5 },

  { id: 'marathon',    em: '🏃', name: 'Marathon Session',    xp: 100,
    desc: 'Review 100 cards in a single day.',
    check: c => c.day.cards >= 100 },

  { id: 'comeback',    em: '🔄', name: 'The Comeback',        xp: 50,
    desc: 'Return to studying after three or more days away.',
    check: c => !!c.flags.comeback },

  { id: 'streak-quiz', em: '🎳', name: 'On a Roll',           xp: 70,
    desc: 'Get 15 quiz answers right in a row.',
    check: c => c.day.bestQuizStreak >= 15 },

  { id: 'gauntlet-run', em: '💀', name: 'Entered the Gauntlet',  xp: 40,
    desc: 'Attempt a Gauntlet run.',
    check: c => c.S.gauntlet.runs >= 1 },

  { id: 'gauntlet-clear', em: '🛡️', name: 'Gauntlet Cleared',     xp: 200,
    desc: 'Survive a full Gauntlet run without losing all three lives.',
    check: c => c.S.gauntlet.cleared >= 1 },

  { id: 'gauntlet-combo', em: '🌋', name: 'Unstoppable',           xp: 150,
    desc: 'Hit a 10-answer combo in the Gauntlet.',
    check: c => c.S.gauntlet.streak >= 10 },

  { id: 'gauntlet-score', em: '💎', name: 'Five Figures',          xp: 220,
    desc: 'Score 10,000 or more in a single Gauntlet run.',
    check: c => c.S.gauntlet.score >= 10000 }

].forEach(function (b) { IPREP.addBadge(b); });
