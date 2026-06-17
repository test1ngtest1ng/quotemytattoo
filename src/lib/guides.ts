/** Editorial guides - SEO content. Image placeholders use `imageAlt` (drop a
 *  real file at /images/guides/{slug}.jpg later and the page will use it). */

export type GuideSection = { h2: string; body: string[]; list?: string[] };
export type Guide = {
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  readTime: string;
  updated: string;
  imageAlt: string;
  intro: string;
  sections: GuideSection[];
  faqs: { q: string; a: string }[];
};

export const GUIDES: Guide[] = [
  {
    slug: "how-much-does-a-tattoo-cost-uk",
    title: "How much does a tattoo cost in the UK?",
    category: "Pricing",
    excerpt:
      "UK tattoo prices explained - hourly rates, minimum charges, what drives the cost, and how to get an accurate quote.",
    readTime: "5 min read",
    updated: "16 June 2026",
    imageAlt: "A tattoo artist working on a detailed black-and-grey forearm piece",
    intro:
      "Tattoo prices in the UK vary a lot - by size, detail, placement, the artist's experience and where you are. This guide breaks down typical costs and how to get a quote you can rely on.",
    sections: [
      {
        h2: "Typical UK tattoo prices",
        body: [
          "Most UK artists charge either an hourly rate or a flat price for the piece. As a rough guide:",
        ],
        list: [
          "Minimum charge (tiny/simple): £50-£100",
          "Small piece (palm-sized): £80-£200",
          "Medium piece (a few hours): £200-£500",
          "Large work / sleeves (multi-session): £600+ and often priced per session or per day",
          "Typical hourly rates: £80-£150+, higher for sought-after artists",
        ],
      },
      {
        h2: "What affects the price",
        body: ["A few things move the number up or down:"],
        list: [
          "Size and level of detail - fine detail and colour packing take longer",
          "Placement - ribs, hands and feet are fiddly and can take more time",
          "Custom design work vs flash (pre-drawn designs)",
          "The artist's experience, demand and waiting list",
          "Your location - city-centre studios often charge more",
        ],
      },
      {
        h2: "How to get an accurate quote",
        body: [
          "The best way to know the real cost is to share your idea with a few artists and compare. Post a reference image, the placement and rough size, and you'll get quotes from artists who actually do that style.",
          "Be wary of a price that seems far below the rest - quality, hygiene and safety matter more than saving a few pounds on something permanent.",
        ],
      },
      {
        h2: "Deposits and tipping",
        body: [
          "Most studios take a deposit to book your appointment, which usually comes off the final price. Tipping isn't compulsory in the UK but is appreciated for great work - 10-20% is common if you'd like to.",
        ],
      },
    ],
    faqs: [
      { q: "Why do tattoo prices vary so much?", a: "Because every tattoo is different. Size, detail, colour, placement and the artist's experience all change how long it takes and what it costs." },
      { q: "Is it cheaper to get a bigger tattoo in one sitting?", a: "Often, yes - many artists offer a day rate that works out cheaper per hour than booking several short sessions." },
      { q: "Should I choose the cheapest quote?", a: "No. For something permanent, prioritise the artist's portfolio, reviews and hygiene over price alone." },
    ],
  },
  {
    slug: "is-your-tattoo-artist-licensed",
    title: "Is your tattoo artist licensed? How to check",
    category: "Safety & standards",
    excerpt:
      "Every UK tattoo studio must be registered with its local council. Here's how to check your artist is licensed, insured and hygienic.",
    readTime: "4 min read",
    updated: "16 June 2026",
    imageAlt: "A clean, professional tattoo studio workstation with sterilised equipment",
    intro:
      "In the UK, tattooing is regulated for good reason. Before you book, it's worth a two-minute check to make sure your artist and studio are above board.",
    sections: [
      {
        h2: "Council registration is the law",
        body: [
          "Under the Local Government (Miscellaneous Provisions) Act 1982, anyone tattooing in England and Wales must be registered with their local council, and so must the premises. Scotland and Northern Ireland have their own licensing schemes.",
          "You can ask the studio for their registration, or contact the local council's environmental health team to confirm it.",
        ],
      },
      {
        h2: "What good studios do",
        body: ["A professional studio should:"],
        list: [
          "Use single-use, sterile needles opened in front of you",
          "Use barriers and fresh gloves, and clean surfaces between clients",
          "Have an autoclave or single-use tubes/grips",
          "Hold public liability insurance",
          "Give you a consent form and aftercare advice",
        ],
      },
      {
        h2: "Red flags to avoid",
        body: ["Walk away if you see any of these:"],
        list: [
          "No visible registration and an unwillingness to discuss it",
          "Re-used needles or equipment that isn't sterilised",
          "A dirty or cluttered workspace",
          "Pressure to skip the consent form or rush the booking",
        ],
      },
    ],
    faqs: [
      { q: "How do I check if a tattoo studio is registered?", a: "Ask the studio directly, or contact your local council's environmental health department - registration is a public record." },
      { q: "Do tattoo artists need insurance?", a: "It isn't legally required everywhere, but reputable artists carry public liability insurance. It's reasonable to ask." },
      { q: "Is home tattooing legal in the UK?", a: "Premises must be registered too, so most home setups won't meet the requirements. Always choose a registered studio." },
    ],
  },
  {
    slug: "what-is-a-tattoo-consent-form",
    title: "What is a tattoo consent form?",
    category: "Before you book",
    excerpt:
      "Before any tattoo you'll sign a consent form and a short medical questionnaire. Here's what they cover and why they matter.",
    readTime: "3 min read",
    updated: "16 June 2026",
    imageAlt: "A client filling in a tattoo consent form at a studio reception desk",
    intro:
      "Every professional studio asks you to complete a consent form before they start. It protects you and the artist, and it's a sign you're in good hands.",
    sections: [
      {
        h2: "What the form covers",
        body: ["A typical consent form confirms:"],
        list: [
          "You're 18 or over (tattooing under-18s is illegal in the UK, even with parental consent)",
          "You're not under the influence of alcohol or drugs",
          "You understand the tattoo is permanent",
          "Relevant medical details - allergies, skin conditions, medication, pregnancy, fainting history",
          "Consent to the design, placement and aftercare advice given",
        ],
      },
      {
        h2: "Why the medical questions matter",
        body: [
          "The short health questionnaire helps the artist tattoo you safely. Some conditions or medications affect healing or bleeding, and a good artist may ask you to check with your GP first. Be honest - it's for your safety.",
        ],
      },
      {
        h2: "What to bring",
        body: ["Bring photo ID to prove your age, and arrive having eaten and hydrated. If you're nervous, that's normal - tell your artist."],
      },
    ],
    faqs: [
      { q: "Can I get a tattoo at 16 with parental consent?", a: "No. In the UK it is illegal to tattoo anyone under 18, even with a parent's permission." },
      { q: "Do I need ID for a tattoo?", a: "Yes - bring photo ID. Studios must confirm you're over 18." },
      { q: "Will they ask about medical conditions?", a: "Yes, a short questionnaire. It helps the artist tattoo you safely and decide if you need to check with your GP first." },
    ],
  },
  {
    slug: "how-long-does-a-tattoo-take-to-heal",
    title: "How long does a tattoo take to heal?",
    category: "Aftercare",
    excerpt:
      "A fresh tattoo looks healed long before it actually is. The healing stages, typical timelines and how to care for it.",
    readTime: "5 min read",
    updated: "16 June 2026",
    imageAlt: "A healing tattoo on a forearm a week after the session",
    intro:
      "The surface of a tattoo heals in a couple of weeks, but the deeper skin keeps recovering for months. Knowing the stages helps you care for it and keep the colours sharp.",
    sections: [
      {
        h2: "The healing stages",
        body: ["Roughly, healing goes like this:"],
        list: [
          "Days 1-6: oozing and redness, then it starts to dry",
          "Days 7-14: flaking and itching as the surface peels (don't pick!)",
          "Weeks 2-4: looks healed but feels slightly raised or shiny",
          "Months 1-3: deeper layers finish healing and the tattoo settles",
        ],
      },
      {
        h2: "How to care for a new tattoo",
        body: ["Follow your artist's specific advice, but generally:"],
        list: [
          "Keep the wrap on as long as your artist says, then wash gently with clean hands and fragrance-free soap",
          "Apply a thin layer of recommended aftercare balm",
          "Don't pick or scratch scabs",
          "No swimming, baths, saunas or soaking for 2-3 weeks",
          "Keep it out of direct sun, and use SPF once healed",
        ],
      },
      {
        h2: "When to seek advice",
        body: [
          "Some redness and swelling early on is normal. But spreading redness, heat, pus, or a fever can signal infection - contact your studio and, if needed, a pharmacist or GP.",
        ],
      },
    ],
    faqs: [
      { q: "How long until I can swim after a tattoo?", a: "Wait until it's fully surface-healed - usually 2-3 weeks - before swimming or soaking." },
      { q: "Why is my tattoo peeling?", a: "Peeling and flaking around days 7-14 is a normal part of healing. Don't pick it - let it shed naturally." },
      { q: "How do I keep my tattoo looking sharp?", a: "Moisturise during healing, avoid sun exposure, and use SPF on it once healed." },
    ],
  },
  {
    slug: "how-to-choose-a-tattoo-artist",
    title: "How to choose the right tattoo artist",
    category: "Before you book",
    excerpt:
      "Portfolio, style, reviews and hygiene - how to pick a tattoo artist you'll trust with permanent work.",
    readTime: "4 min read",
    updated: "16 June 2026",
    imageAlt: "A client browsing a tattoo artist's portfolio on a tablet in a studio",
    intro:
      "The right artist makes all the difference. Here's how to choose someone whose work, style and standards fit what you want.",
    sections: [
      {
        h2: "Match the artist to your style",
        body: [
          "Most artists specialise. Someone brilliant at fine line may not be your best choice for bold traditional or colour realism. Look for an artist whose portfolio is full of the style you want.",
        ],
      },
      {
        h2: "Look at healed work, not just fresh photos",
        body: [
          "Fresh tattoos always look crisp. Healed photos show how the work holds up over time - ask to see some, or look for them on the artist's profile.",
        ],
      },
      {
        h2: "Check reviews and credentials",
        body: ["Read reviews from real clients, and make sure the studio is licensed, insured and hygienic. On Quote My Tattoo, reviews can only be left by customers who booked through the platform."],
      },
      {
        h2: "Get a few quotes and compare",
        body: [
          "Posting your idea once and comparing a few artists side by side beats messaging studios one at a time. Compare their work, prices and how they communicate before you decide.",
        ],
      },
    ],
    faqs: [
      { q: "Should I pick an artist by price or portfolio?", a: "Portfolio first. For permanent work, the quality and style fit matter far more than a small price difference." },
      { q: "What questions should I ask a tattoo artist?", a: "Ask about their experience with your style, the design process, aftercare, hygiene, and the total cost including any deposit." },
      { q: "How do I compare tattoo artists easily?", a: "Post your idea on Quote My Tattoo and compare matched artists' portfolios, reviews and quotes in one place." },
    ],
  },
  {
    slug: "tattoo-styles-explained",
    title: "Tattoo styles explained",
    category: "Styles",
    excerpt:
      "Fine line, realism, traditional, blackwork and more - a quick tour of popular tattoo styles to help you choose.",
    readTime: "6 min read",
    updated: "16 June 2026",
    imageAlt: "A grid of tattoos in different styles - fine line, realism, traditional and blackwork",
    intro:
      "Knowing the main tattoo styles helps you describe what you want and find an artist who specialises in it. Here's a quick tour of the most popular ones.",
    sections: [
      {
        h2: "Popular styles at a glance",
        body: ["A few of the most-requested styles:"],
        list: [
          "Fine line - delicate, single-needle linework; great for small, detailed pieces",
          "Black & grey - shading in greys for soft, realistic depth",
          "Realism - photographic detail, portraits and nature",
          "Traditional - bold outlines and a classic colour palette",
          "Neo-traditional - traditional roots with more detail and colour",
          "Japanese (irezumi) - dragons, koi and waves in a flowing composition",
          "Blackwork - heavy solid black, patterns and bold graphic designs",
          "Dotwork & geometric - stippled shading and precise geometry",
          "Lettering / script - typography and quotes",
          "Watercolour - soft, painterly colour washes",
        ],
      },
      {
        h2: "How to choose a style",
        body: [
          "Think about the subject, the level of detail and how you want it to age. Bolder styles tend to hold up best over decades; very fine detail may need a touch-up sooner. Your artist can advise on what suits your idea and placement.",
        ],
      },
      {
        h2: "Find a specialist",
        body: [
          "Once you know the style, find an artist who specialises in it. You can filter the directory by style and area, or post your idea and get matched automatically.",
        ],
      },
    ],
    faqs: [
      { q: "Which tattoo style lasts the longest?", a: "Bolder styles with solid lines and shading (like traditional and blackwork) generally age best. Very fine detail can soften over time." },
      { q: "What's the difference between black & grey and realism?", a: "Black & grey refers to the palette (shades of grey); realism refers to the photographic approach, which can be in colour or black & grey." },
      { q: "How do I find an artist for a specific style?", a: "Filter the Quote My Tattoo directory by style and area, or post your idea to get matched with specialists." },
    ],
  },
];

export const getGuide = (slug: string) => GUIDES.find((g) => g.slug === slug);
