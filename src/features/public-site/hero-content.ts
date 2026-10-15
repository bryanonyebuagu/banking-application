import type { HeroAction, HeroSlide } from "@/components/marketing/hero-carousel";

type SlideCopy = Omit<HeroSlide, "actions">;

export const homeHeroSlides: SlideCopy[] = [
  { eyebrow:"Everyday banking", title:"Banking that moves with your life.", description:"Keep everyday money, payments and personal goals together in one secure experience.", image:"/images/heroes/home-everyday.webp", alt:"A couple managing their finances together at home", objectPosition:"67% center" },
  { eyebrow:"Financial independence", title:"Build toward what matters most.", description:"Use clear account tools and practical insights to plan the next step for you and your family.", image:"/images/heroes/home-goals.webp", alt:"A family planning personal financial goals together", objectPosition:"72% center" },
  { eyebrow:"Banking together", title:"A clearer way to manage every goal.", description:"Bring daily banking and long-term plans into one secure place built around your life.", image:"/images/bank-hero-v1.png", alt:"A couple reviewing their finances together at home", objectPosition:"72% center" },
];

export const productHeroSlides: Record<string, SlideCopy[]> = {
  checking: [
    { eyebrow:"Personal banking",title:"Checking for everyday money",description:"Manage deposits, payments and everyday spending from one clear account view.",image:"/images/heroes/checking-everyday.webp",alt:"A customer reviewing everyday finances on her phone",objectPosition:"72% center" },
    { eyebrow:"Pay with confidence",title:"Everyday payments made simple",description:"Keep purchases, transfers and daily account activity within easy reach.",image:"/images/heroes/checking-mobile.webp",alt:"A customer making a secure mobile payment at a cafe",objectPosition:"74% center" },
    { eyebrow:"Money in motion",title:"Stay close to every transaction",description:"Review spending, deposits and account activity wherever the day takes you.",image:"/images/everyday-banking-v1.webp",alt:"A customer reviewing everyday banking on her phone",objectPosition:"74% center" },
  ],
  savings: [
    { eyebrow:"Personal banking",title:"Savings built around clear goals",description:"Keep money set aside while maintaining a clear view of account activity.",image:"/images/heroes/savings-family.webp",alt:"A parent and teenager building a savings plan together",objectPosition:"73% center" },
    { eyebrow:"Plan with purpose",title:"Turn today’s plan into tomorrow’s progress",description:"Organize the goals that matter and follow your savings journey over time.",image:"/images/heroes/savings-goals.webp",alt:"A customer planning personal savings goals at home",objectPosition:"72% center" },
    { eyebrow:"Make progress",title:"Save with your next milestone in view",description:"Build a steady plan and keep each savings goal visible as it grows.",image:"/images/investing-v1.webp",alt:"A customer planning her next financial milestone",objectPosition:"72% center" },
  ],
  "credit-cards": [
    { eyebrow:"Personal banking",title:"Credit cards with controls built in",description:"Manage purchases, payments, spending limits and card security in one place.",image:"/images/heroes/credit-cards-premium.webp",alt:"A selection of premium unbranded payment cards",objectPosition:"74% center" },
    { eyebrow:"Travel and purchases",title:"A card experience ready for the journey",description:"Review activity and manage card controls before your next purchase or trip.",image:"/images/heroes/credit-cards-travel.webp",alt:"A traveler making a card payment at a hotel",objectPosition:"76% center" },
    { eyebrow:"Choose your card",title:"Credit options designed for real life",description:"Explore card choices and keep the controls for spending and payments close at hand.",image:"/images/credit-cards-v1.webp",alt:"Three unbranded payment cards displayed on stone steps",objectPosition:"76% center" },
  ],
  mortgage: [
    { eyebrow:"Home lending",title:"A clearer mortgage journey",description:"Explore applications, amortization, escrow and payments with each step explained.",image:"/images/heroes/mortgage-home.webp",alt:"A family celebrating outside their modern home",objectPosition:"72% center" },
    { eyebrow:"A place of your own",title:"Move forward with a home plan",description:"Follow your application and understand the details behind your home financing.",image:"/images/heroes/mortgage-keys.webp",alt:"A couple receiving the keys to a modern home",objectPosition:"75% center" },
    { eyebrow:"Homeownership",title:"Plan for the home that comes next",description:"Keep financing details, milestones and payments organized throughout the journey.",image:"/images/home-lending-v1.png",alt:"A family standing together outside their new home",objectPosition:"76% center" },
  ],
  "auto-financing": [
    { eyebrow:"Auto financing",title:"Plan and manage an auto loan",description:"Follow a vehicle loan from opening through regular payments.",image:"/images/heroes/auto-dealership.webp",alt:"A couple receiving keys beside a modern vehicle",objectPosition:"74% center" },
    { eyebrow:"Your next vehicle",title:"See the road ahead more clearly",description:"Review financing details and payment information before making your decision.",image:"/images/heroes/auto-planning.webp",alt:"A customer reviewing vehicle financing beside a modern car",objectPosition:"77% center" },
    { eyebrow:"Finance with clarity",title:"Keep your vehicle plan within reach",description:"Compare the numbers, follow payments and stay informed from application to payoff.",image:"/images/bank-hero-v1.png",alt:"A couple reviewing financing options together at home",objectPosition:"72% center" },
  ],
  investing: [
    { eyebrow:"Investing",title:"Invest with a complete account view",description:"Review holdings, prices, cash and performance from one dashboard.",image:"/images/heroes/investing-planning.webp",alt:"A customer planning long-term financial goals",objectPosition:"72% center" },
    { eyebrow:"Wealth planning",title:"Put your financial goals in perspective",description:"Bring thoughtful planning, account information and investment activity together.",image:"/images/heroes/investing-adviser.webp",alt:"A financial adviser discussing investment planning with a client",objectPosition:"75% center" },
    { eyebrow:"Your financial future",title:"Turn a long-term vision into a plan",description:"Follow investments and broader goals with a focused view of your progress.",image:"/images/investing-v1.webp",alt:"A customer considering her long-term investment plan",objectPosition:"72% center" },
  ],
  education: [
    { eyebrow:"Financial education",title:"Learn how your banking works",description:"Understand balances, transactions, security and responsible money management.",image:"/images/heroes/education-campus.webp",alt:"University students studying together on campus",objectPosition:"74% center" },
    { eyebrow:"Plan for learning",title:"Prepare for education with a clearer view",description:"Explore practical guidance for education costs and long-term financial planning.",image:"/images/heroes/education-planning.webp",alt:"A parent and college student planning education costs",objectPosition:"74% center" },
    { eyebrow:"Learn together",title:"Build confident money habits for the future",description:"Use practical guidance to discuss education costs, saving and responsible banking.",image:"/images/heroes/savings-family.webp",alt:"A parent and teenager discussing a financial plan together",objectPosition:"73% center" },
  ],
  security: [
    { eyebrow:"Account security",title:"Security designed into every layer",description:"Chaze Bank combines verified access, session controls and protected account data.",image:"/images/heroes/security-biometric.webp",alt:"A customer securely using facial recognition on a mobile device",objectPosition:"75% center" },
    { eyebrow:"Fraud prevention",title:"Protection backed by clear controls",description:"Review account activity, strengthen sign-in security and respond to suspicious events.",image:"/images/heroes/security-fraud-team.webp",alt:"Bank security specialists reviewing fraud alerts",objectPosition:"76% center" },
    { eyebrow:"Secure access",title:"Stay informed wherever you bank",description:"Use secure sign-in and account monitoring to keep control close on every device.",image:"/images/everyday-banking-v1.webp",alt:"A customer securely reviewing her bank account on a phone",objectPosition:"74% center" },
  ],
  "business-banking": [
    { eyebrow:"Business banking",title:"Banking built around your business day",description:"Keep business balances, payments and account activity organized in one clear experience.",image:"/images/business-banking-v1.png",alt:"A small business owner working in her bakery",objectPosition:"72% center" },
    { eyebrow:"Manage cash flow",title:"Stay close to the money moving through your business",description:"Review deposits, expenses and account activity with tools designed for daily decisions.",image:"/images/heroes/checking-everyday.webp",alt:"A business owner reviewing account activity on her phone",objectPosition:"72% center" },
    { eyebrow:"Plan what comes next",title:"Give your business goals room to grow",description:"Bring everyday banking and longer-term planning together as your business develops.",image:"/images/heroes/home-everyday.webp",alt:"Business partners reviewing financial plans together",objectPosition:"67% center" },
  ],
  commercial: [
    { eyebrow:"Commercial banking",title:"A connected view for complex business needs",description:"Organize account activity, payments and financial priorities across your operation.",image:"/images/business-banking-v1.png",alt:"A business owner using digital tools in her workplace",objectPosition:"72% center" },
    { eyebrow:"Strategic planning",title:"Make informed decisions with a broader view",description:"Keep financial information and business priorities visible as your organization grows.",image:"/images/heroes/investing-adviser.webp",alt:"Business leaders discussing a financial plan with an adviser",objectPosition:"75% center" },
    { eyebrow:"Business protection",title:"Secure access for important financial work",description:"Use strong account controls and activity monitoring across commercial banking tasks.",image:"/images/heroes/security-fraud-team.webp",alt:"Financial security specialists monitoring business account activity",objectPosition:"76% center" },
  ],
  "wealth-management": [
    { eyebrow:"Wealth management",title:"A thoughtful view of your financial future",description:"Bring goals, investments and planning conversations together in one place.",image:"/images/investing-v1.webp",alt:"A customer considering her long-term financial plans",objectPosition:"72% center" },
    { eyebrow:"Long-term goals",title:"See how each decision supports the bigger picture",description:"Follow progress across investments and personal milestones with a focused account view.",image:"/images/heroes/investing-planning.webp",alt:"A customer reviewing long-term financial goals",objectPosition:"72% center" },
    { eyebrow:"Personal guidance",title:"Build a plan around what matters to you",description:"Connect financial information with clear conversations about your priorities and next steps.",image:"/images/heroes/investing-adviser.webp",alt:"A financial adviser discussing a wealth plan with a client",objectPosition:"75% center" },
  ],
  "help-center": [
    { eyebrow:"Help center",title:"Find the banking help you need",description:"Get practical guidance for accounts, payments, security and common service questions.",image:"/images/everyday-banking-v1.webp",alt:"A customer accessing banking help on her phone",objectPosition:"74% center" },
    { eyebrow:"Account assistance",title:"Clear support for secure account access",description:"Learn how to manage sign-in, recovery and the protections available for your account.",image:"/images/heroes/security-biometric.webp",alt:"A customer using secure mobile account access",objectPosition:"75% center" },
    { eyebrow:"Security support",title:"Know what to do when activity looks unfamiliar",description:"Review security guidance and contact support when an account needs attention.",image:"/images/heroes/security-fraud-team.webp",alt:"Support specialists reviewing account security alerts",objectPosition:"76% center" },
  ],
  faq: [
    { eyebrow:"Frequently asked questions",title:"Straightforward answers about Chaze Bank",description:"Explore clear information about accounts, payments, security and online banking.",image:"/images/investing-v1.webp",alt:"A customer reviewing helpful banking information",objectPosition:"72% center" },
    { eyebrow:"Learn about banking",title:"Understand each feature before you use it",description:"Find practical explanations for the services and account tools available to you.",image:"/images/heroes/education-campus.webp",alt:"Customers learning about financial services together",objectPosition:"74% center" },
    { eyebrow:"Everyday questions",title:"Get guidance while managing your account",description:"Use concise answers to move through common banking tasks with confidence.",image:"/images/everyday-banking-v1.webp",alt:"A customer reading banking guidance on her phone",objectPosition:"74% center" },
  ],
  contact: [
    { eyebrow:"Contact Chaze Bank",title:"Reach the right support for your question",description:"Connect with Chaze Bank about account service, security and general banking needs.",image:"/images/business-banking-v1.png",alt:"A customer preparing to contact banking support",objectPosition:"72% center" },
    { eyebrow:"Customer support",title:"Help is available when you need it",description:"Start with secure support and keep your account information protected during every conversation.",image:"/images/heroes/home-everyday.webp",alt:"Customers contacting support together from home",objectPosition:"67% center" },
    { eyebrow:"Security concerns",title:"Act quickly when your account needs attention",description:"Use secure support channels for unfamiliar activity, access problems and urgent account questions.",image:"/images/heroes/security-fraud-team.webp",alt:"Bank support specialists responding to a security concern",objectPosition:"76% center" },
  ],
};

export function withHeroActions(slides: SlideCopy[], actions: HeroAction[]): HeroSlide[] {
  return slides.map((slide) => ({ ...slide, actions }));
}
