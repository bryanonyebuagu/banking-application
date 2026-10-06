"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
export function AppChrome({children,showPreview}:{children:ReactNode;showPreview:boolean}){const pathname=usePathname();if(pathname==='/staff'||pathname.startsWith('/staff/'))return children;return <><SiteHeader showPreview={showPreview}/>{children}<SiteFooter/></>}
