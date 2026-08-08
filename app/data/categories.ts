export type Field = {
  slug: string;
  title: string;
  blurb: string;
  code: string;
};

export type Tier = {
  label: string;
  fields: Field[];
};

export type Category = {
  slug: string;
  code: string;
  label: string;
  intro: string;
  tiers: Tier[];
};

type RawField = { slug: string; title: string; blurb: string };
type RawTier = { label: string; fields: RawField[] };
type RawCategory = {
  slug: string;
  code: string;
  label: string;
  intro: string;
  tiers: RawTier[];
};

const raw: RawCategory[] = [
  {
    slug: "extracurriculars",
    code: "EC",
    label: "Extracurriculars",
    intro:
      "Not every activity belongs on your list. Here's how to pick the ones that matter and go deep instead of wide.",
    tiers: [
      {
        label: "Start here",
        fields: [
          { slug: "research", title: "Research programs", blurb: "How to email a professor, land a spot in a lab, and turn it into a real project." },
          { slug: "competitions", title: "Competitions", blurb: "Academic and creative competitions that are actually worth your weekends." },
          { slug: "internships", title: "Internships", blurb: "Finding one as a high schooler, and what to do once you're in the door." },
          { slug: "passion-projects", title: "Passion projects", blurb: "Building something nobody assigned you — that's the one that stands out." },
        ],
      },
      {
        label: "Next up",
        fields: [
          { slug: "fine-arts", title: "Fine arts", blurb: "Where music, art, and theater fit into an application that isn't about either one." },
          { slug: "apprenticeships", title: "Apprenticeships", blurb: "Hands-on training that teaches you a real skill before college does." },
          { slug: "freelancing", title: "Freelancing", blurb: "Getting paid for a skill you already have, on your own schedule." },
          { slug: "nonprofits", title: "Nonprofits", blurb: "Starting or joining one that does more than look good on paper." },
          { slug: "presentations", title: "Presentations & TED-Ed", blurb: "Getting picked to speak, and what to say once you're up there." },
          { slug: "travel-programs", title: "Travel programs", blurb: "Study-abroad and travel programs worth the cost — and the ones that aren't." },
          { slug: "officer-positions", title: "Officer positions", blurb: "How to actually get elected, not just show up to meetings." },
        ],
      },
      {
        label: "When you have time",
        fields: [
          { slug: "clubs", title: "Clubs & organizations", blurb: "Which clubs are worth joining, and which ones just eat your afternoons." },
          { slug: "volunteering", title: "Volunteering", blurb: "How much is enough, and how to find work that isn't just a signature on a form." },
          { slug: "sports", title: "Sports", blurb: "Where athletics fits into your story, on top of or instead of everything else." },
          { slug: "shadowing", title: "Shadowing", blurb: "Spending a day with someone doing the job you think you want." },
          { slug: "jobs", title: "Jobs & employment", blurb: "Part-time work, and what colleges actually think of a paycheck." },
          { slug: "guest-speakers", title: "Guest speakers", blurb: "Bringing in outside voices for your club or class, and getting it approved." },
          { slug: "video-photography", title: "Video & photography", blurb: "Turning a phone camera into a real portfolio." },
          { slug: "visa-international", title: "Visa & international", blurb: "Extracurriculars and applications for international and visa students." },
          { slug: "interview-strategies", title: "Interview strategies", blurb: "Talking about your activities out loud without freezing up." },
          { slug: "college-app-tiers", title: "College app tiers", blurb: "How admissions officers actually rank the things you did." },
        ],
      },
    ],
  },
  {
    slug: "academics",
    code: "AC",
    label: "Academics",
    intro:
      "Grades and course selection, without the panic. Here's how to build a schedule and a GPA you're not embarrassed by.",
    tiers: [
      {
        label: "GPA & performance",
        fields: [
          { slug: "gpa-strategy", title: "GPA strategy", blurb: "How grades actually get weighted, and how to recover from one bad semester." },
          { slug: "gpa-calculator", title: "GPA calculator", blurb: "A tool for figuring out exactly what your next test needs to be." },
          { slug: "ap-course-advice", title: "AP course advice", blurb: "Which AP classes are worth the workload, and which ones aren't." },
          { slug: "dual-credit", title: "Dual credit", blurb: "Earning college credit in high school, and whether it's worth doing." },
          { slug: "credit-by-exam", title: "Credit by exam", blurb: "Testing out of a class instead of sitting through it." },
        ],
      },
      {
        label: "Study strategies",
        fields: [
          { slug: "efficient-studying", title: "Efficient studying", blurb: "A way of studying that still works during finals week, not just in October." },
          { slug: "memory-techniques", title: "Memory techniques", blurb: "Ways to actually remember what you studied, past the test." },
          { slug: "essay-writing", title: "Essay writing", blurb: "Writing essays for class that don't sound like everyone else's." },
          { slug: "study-resources", title: "Study resources", blurb: "Free places to get help when a teacher's explanation isn't clicking." },
        ],
      },
      {
        label: "Planning & strategy",
        fields: [
          { slug: "course-selection-strategy", title: "Course selection strategy", blurb: "Building a schedule around where you're actually headed." },
          { slug: "career-pathways", title: "Career pathways", blurb: "Figuring out what you might want to do, without picking wrong." },
          { slug: "exemption-strategy", title: "Exemption strategy", blurb: "Skipping requirements you've already outgrown." },
          { slug: "summer-courses", title: "Summer courses", blurb: "Getting ahead over the summer without giving up your break." },
        ],
      },
    ],
  },
  {
    slug: "testing",
    code: "ST",
    label: "Standardized testing",
    intro: "SAT, ACT, and PSAT — picking one, prepping for it, and not letting it take over your life.",
    tiers: [
      {
        label: "Start here",
        fields: [
          { slug: "sat", title: "SAT", blurb: "What's on it, how it's scored, and where to start." },
          { slug: "act", title: "ACT", blurb: "How it's different from the SAT, and which one fits you better." },
        ],
      },
      {
        label: "Next up",
        fields: [
          { slug: "study-plans", title: "Study plans", blurb: "A prep schedule that fits around school instead of replacing it." },
          { slug: "score-improvement", title: "Practice & score improvement", blurb: "How to use practice tests without wasting them." },
          { slug: "free-resources", title: "Free resources", blurb: "Prep material that costs nothing and actually works." },
        ],
      },
      {
        label: "When you have time",
        fields: [
          { slug: "psat", title: "PSAT", blurb: "The practice run that quietly matters for scholarships." },
          { slug: "staar", title: "STAAR", blurb: "What it is, and how much it actually affects you." },
          { slug: "transfer-pathways", title: "Transfer pathways", blurb: "Community college routes into UH, A&M, and UT." },
        ],
      },
    ],
  },
  {
    slug: "lifestyle",
    code: "LF",
    label: "Lifestyle",
    intro:
      "The parts of high school nobody puts on a resume — sleep, friendships, and not burning out before senior year.",
    tiers: [
      {
        label: "Start here",
        fields: [
          { slug: "time-management", title: "Time management", blurb: "Fitting school, activities, and an actual life into the same week." },
          { slug: "study-schedules", title: "Study schedules", blurb: "Blocking out a week so studying doesn't eat every evening." },
          { slug: "pomodoro-technique", title: "Pomodoro technique", blurb: "Short focused bursts, for when your attention span checks out early." },
          { slug: "digital-organization", title: "Digital organization", blurb: "Keeping assignments, tabs, and files from turning into chaos." },
        ],
      },
      {
        label: "Next up",
        fields: [
          { slug: "mental-physical-health", title: "Mental & physical health", blurb: "Taking care of yourself without treating it like extra homework." },
          { slug: "gym-fitness", title: "Gym & fitness", blurb: "Building a habit that sticks past the first two weeks." },
          { slug: "meditation", title: "Meditation", blurb: "A few quiet minutes that actually change the rest of your day." },
          { slug: "spiritual-grounding", title: "Spiritual grounding", blurb: "Finding steadiness in something bigger than your GPA." },
        ],
      },
      {
        label: "Also worth knowing",
        fields: [
          { slug: "networking", title: "Networking & connections", blurb: "Meeting people who can actually help, without it feeling transactional." },
          { slug: "social-media-usage", title: "Social media usage", blurb: "Using it without letting it use your whole evening." },
          { slug: "ai-literacy", title: "AI literacy", blurb: "Using new tools well, and knowing where the line is." },
          { slug: "critical-thinking", title: "Critical thinking", blurb: "Questioning what you read before you repeat it." },
        ],
      },
      {
        label: "When you have time",
        fields: [
          { slug: "discipline-motivation", title: "Discipline & motivation", blurb: "What to do on the days you don't feel like doing anything." },
          { slug: "distraction-management", title: "Distraction management", blurb: "Closing the twelve tabs that aren't your homework." },
          { slug: "staying-committed", title: "Staying committed", blurb: "Finishing what you started in September, in March." },
          { slug: "friendships", title: "Friendships", blurb: "Keeping the people around you close while everything else gets busier." },
        ],
      },
    ],
  },
  {
    slug: "college",
    code: "CP",
    label: "College prep",
    intro: "Applications, essays, and financial aid — laid out in the order you'll actually need them.",
    tiers: [
      {
        label: "Start here",
        fields: [
          { slug: "building-a-list", title: "Building your list", blurb: "Reach, target, and safety schools that actually fit you." },
          { slug: "building-your-narrative", title: "Building your narrative", blurb: "Connecting your classes, activities, and essays into one story." },
          { slug: "essays", title: "Essays", blurb: "Finding a story worth telling instead of sounding like everyone else." },
        ],
      },
      {
        label: "Next up",
        fields: [
          { slug: "applications", title: "Applications", blurb: "The Common App, deadlines, and the small details people forget." },
          { slug: "recommendation-letters", title: "Letters of recommendation", blurb: "Who to ask, when to ask, and what to give them." },
          { slug: "application-timeline", title: "Application timeline", blurb: "What to do freshman through senior year, in order." },
        ],
      },
      {
        label: "When you have time",
        fields: [
          { slug: "scholarships", title: "Scholarships", blurb: "Free money worth the time it takes to apply for." },
          { slug: "financial-aid-basics", title: "Financial aid basics", blurb: "FAFSA, the CSS Profile, and how aid actually gets decided." },
          { slug: "how-to-choose", title: "How to choose", blurb: "ED, EA, RD, or rolling — and what each one actually means for you." },
        ],
      },
    ],
  },
  {
    slug: "summer",
    code: "SP",
    label: "Summer planning",
    intro: "Ten free weeks is a lot of time. Here's how to spend it without wasting it or overbooking yourself.",
    tiers: [
      {
        label: "Start here",
        fields: [
          { slug: "planning-your-summer", title: "Planning your summer", blurb: "Turning a free summer into something worth mentioning later." },
          { slug: "summer-programs", title: "Summer programs", blurb: "Which ones are worth the cost, and which ones aren't." },
          { slug: "deadline-calendar", title: "Deadline calendar", blurb: "A month-by-month list so you're not applying in a panic in June." },
        ],
      },
      {
        label: "Next up",
        fields: [
          { slug: "research-programs", title: "Research programs", blurb: "Getting into a lab or project over the summer, not just during the year." },
          { slug: "internships", title: "Internships", blurb: "Finding summer work that actually adds to your story." },
          { slug: "competition-prep", title: "Competition prep", blurb: "Using the summer to get ready for competitions in the fall." },
        ],
      },
      {
        label: "When you have time",
        fields: [
          { slug: "jobs", title: "Jobs", blurb: "Paid work that still counts for something." },
          { slug: "passion-projects", title: "Passion projects", blurb: "Building something on your own when no program fits." },
          { slug: "independent-projects", title: "Independent projects", blurb: "Starting something without a program telling you how." },
          { slug: "rest", title: "Rest", blurb: "Why doing nothing for part of the summer is still a good decision." },
        ],
      },
    ],
  },
];

export const categories: Category[] = raw.map((c) => ({
  ...c,
  tiers: c.tiers.map((tier, tierIndex) => ({
    label: tier.label,
    fields: tier.fields.map((field, fieldIndex) => ({
      ...field,
      code: `${c.code} ${(tierIndex + 1) * 100 + (fieldIndex + 1)}`,
    })),
  })),
}));

export function getCategory(slug: string | undefined): Category | undefined {
  return categories.find((c) => c.slug === slug);
}

export function categoryFieldCount(category: Category): number {
  return category.tiers.reduce((sum, tier) => sum + tier.fields.length, 0);
}

export function getField(
  categorySlug: string | undefined,
  fieldSlug: string | undefined,
): { category: Category; field: Field } | undefined {
  const category = getCategory(categorySlug);
  if (!category) return undefined;
  for (const tier of category.tiers) {
    const field = tier.fields.find((f) => f.slug === fieldSlug);
    if (field) return { category, field };
  }
  return undefined;
}

export type SearchResult = { category: Category; field: Field };

/** Ranked substring search over every field's title, blurb, and category label. */
export function searchFields(query: string, limit = 8): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const scored: (SearchResult & { score: number })[] = [];
  for (const category of categories) {
    const categoryLabel = category.label.toLowerCase();
    for (const tier of category.tiers) {
      for (const field of tier.fields) {
        const title = field.title.toLowerCase();
        let score = 0;
        if (title === q) score = 4;
        else if (title.startsWith(q)) score = 3;
        else if (title.includes(q)) score = 2;
        else if (field.blurb.toLowerCase().includes(q) || categoryLabel.includes(q)) score = 1;

        if (score > 0) scored.push({ category, field, score });
      }
    }
  }

  scored.sort((a, b) => b.score - a.score || a.field.title.localeCompare(b.field.title));
  return scored.slice(0, limit).map(({ category, field }) => ({ category, field }));
}
