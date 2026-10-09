"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteNotice } from "@/components/layout/site-notice";
export function AppChrome({children}:{children:ReactNode}){const pathname=usePathname();if(pathname==='/staff'||pathname.startsWith('/staff/'))return children;return <><SiteHeader/><SiteNotice/>{children}<SiteFooter/></>}
