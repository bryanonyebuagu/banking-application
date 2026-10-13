import type { HeroAction, HeroSlide } from "@/components/marketing/hero-carousel";

type SlideCopy = Omit<HeroSlide, "actions">;

export const homeHeroSlides: SlideCopy[] = [
  { eyebrow:"Everyday banking", title:"Banking that moves with your life.", description:"Keep everyday money, payments and personal goals together in one secure experience.", image:"/images/heroes/home-everyday.webp", alt:"A couple managing their finances together at home", objectPosition:"67% center" },
  { eyebrow:"Financial independence", title:"Build toward what matters most.", description:"Use clear account tools and practical insights to plan the next step for you and your family.", image:"/images/heroes/home-goals.webp", alt:"A family planning personal financial goals together", objectPosition:"72% center" },
];

export const productHeroSlides: Record<string, SlideCopy[]> = {
  checking: [
    { eyebrow:"Personal banking",title:"Checking for everyday money",description:"Manage deposits, payments and everyday spending from one clear account view.",image:"/images/heroes/checking-everyday.webp",alt:"A customer reviewing everyday finances on her phone",objectPosition:"72% center" },
    { eyebrow:"Pay with confidence",title:"Everyday payments made simple",description:"Keep purchases, transfers and daily account activity within easy reach.",image:"/images/heroes/checking-mobile.webp",alt:"A customer making a secure mobile payment at a cafe",objectPosition:"74% center" },
  ],
  savings: [
    { eyebrow:"Personal banking",title:"Savings built around clear goals",description:"Keep money set aside while maintaining a clear view of account activity.",image:"/images/heroes/savings-family.webp",alt:"A parent and teenager building a savings plan together",objectPosition:"73% center" },
    { eyebrow:"Plan with purpose",title:"Turn today’s plan into tomorrow’s progress",description:"Organize the goals that matter and follow your savings journey over time.",image:"/images/heroes/savings-goals.webp",alt:"A customer planning personal savings goals at home",objectPosition:"72% center" },
  ],
  "credit-cards": [
    { eyebrow:"Personal banking",title:"Credit cards with controls built in",description:"Manage purchases, payments, spending limits and card security in one place.",image:"/images/heroes/credit-cards-premium.webp",alt:"A selection of premium unbranded payment cards",objectPosition:"74% center" },
    { eyebrow:"Travel and purchases",title:"A card experience ready for the journey",description:"Review activity and manage card controls before your next purchase or trip.",image:"/images/heroes/credit-cards-travel.webp",alt:"A traveler making a card payment at a hotel",objectPosition:"76% center" },
  ],
  mortgage: [
    { eyebrow:"Home lending",title:"A clearer mortgage journey",description:"Explore applications, amortization, escrow and payments with each step explained.",image:"/images/heroes/mortgage-home.webp",alt:"A family celebrating outside their modern home",objectPosition:"72% center" },
    { eyebrow:"A place of your own",title:"Move forward with a home plan",description:"Follow your application and understand the details behind your home financing.",image:"/images/heroes/mortgage-keys.webp",alt:"A couple receiving the keys to a modern home",objectPosition:"75% center" },
  ],
  "auto-financing": [
    { eyebrow:"Auto financing",title:"Plan and manage an auto loan",description:"Follow a vehicle loan from opening through regular payments.",image:"/images/heroes/auto-dealership.webp",alt:"A couple receiving keys beside a modern vehicle",objectPosition:"74% center" },
    { eyebrow:"Your next vehicle",title:"See the road ahead more clearly",description:"Review financing details and payment information before making your decision.",image:"/images/heroes/auto-planning.webp",alt:"A customer reviewing vehicle financing beside a modern car",objectPosition:"77% center" },
  ],
  investing: [
    { eyebrow:"Investing",title:"Invest with a complete account view",description:"Review holdings, prices, cash and performance from one dashboard.",image:"/images/heroes/investing-planning.webp",alt:"A customer planning long-term financial goals",objectPosition:"72% center" },
    { eyebrow:"Wealth planning",title:"Put your financial goals in perspective",description:"Bring thoughtful planning, account information and investment activity together.",image:"/images/heroes/investing-adviser.webp",alt:"A financial adviser discussing investment planning with a client",objectPosition:"75% center" },
  ],
  education: [
    { eyebrow:"Financial education",title:"Learn how your banking works",description:"Understand balances, transactions, security and responsible money management.",image:"/images/heroes/education-campus.webp",alt:"University students studying together on campus",objectPosition:"74% center" },
    { eyebrow:"Plan for learning",title:"Prepare for education with a clearer view",description:"Explore practical guidance for education costs and long-term financial planning.",image:"/images/heroes/education-planning.webp",alt:"A parent and college student planning education costs",objectPosition:"74% center" },
  ],
  security: [
    { eyebrow:"Account security",title:"Security designed into every layer",description:"Chaze Bank combines verified access, session controls and protected account data.",image:"/images/heroes/security-biometric.webp",alt:"A customer securely using facial recognition on a mobile device",objectPosition:"75% center" },
    { eyebrow:"Fraud prevention",title:"Protection backed by clear controls",description:"Review account activity, strengthen sign-in security and respond to suspicious events.",image:"/images/heroes/security-fraud-team.webp",alt:"Bank security specialists reviewing fraud alerts",objectPosition:"76% center" },
  ],
};

export function withHeroActions(slides: SlideCopy[], actions: HeroAction[]): HeroSlide[] {
  return slides.map((slide) => ({ ...slide, actions }));
}
