import Link from "next/link";
import { BankLogo } from "@/components/ui/bank-logo";

const groups: Array<{ title: string; links: Array<[string,string]> }> = [
  {title:"Personal",links:[["Checking","/checking"],["Savings","/savings"],["Credit Cards","/credit-cards"],["Home Loans","/mortgage"],["Auto","/auto-financing"],["Investing","/investing"]]},
  {title:"Resources",links:[["Education","/education"],["Security","/security"],["Help center","/help-center"],["FAQ","/faq"],["Contact","/contact"]]},
  {title:"Audiences",links:[["Business","/business-banking"],["Commercial","/commercial"],["Wealth Management","/wealth-management"]]},
];
export function SiteFooter(){return <footer className="mt-auto border-t border-border bg-brand text-white"><div className="mx-auto grid max-w-public gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8"><div><BankLogo/><p className="mt-4 text-sm text-white/80">Clear, secure digital banking for everyday financial life.</p></div>{groups.map((group)=><nav key={group.title} aria-label={`${group.title} footer navigation`}><h2 className="font-semibold">{group.title}</h2><ul className="mt-3 space-y-2 text-sm">{group.links.map(([label,href])=><li key={href}><Link className="text-white/85 underline-offset-4 hover:underline" href={href}>{label}</Link></li>)}</ul></nav>)}</div></footer>}
