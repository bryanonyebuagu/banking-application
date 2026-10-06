"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireVerifiedIdentity } from "@/server/auth/identity";
import { requireSameOrigin } from "@/server/security/request";
function value(data:FormData,key:string){const item=data.get(key);return typeof item==="string"?item:""}async function client(){await requireSameOrigin();await requireVerifiedIdentity();return createServerSupabaseClient()}
export async function createSupportTicketAction(data:FormData){const parsed=z.object({subject:z.string().trim().min(3).max(200),body:z.string().trim().min(1).max(10000)}).safeParse({subject:value(data,"subject"),body:value(data,"body")});if(!parsed.success)redirect("/support/new?message=invalid");const supabase=await client();const result=await supabase.rpc("create_current_support_ticket",{p_subject:parsed.data.subject,p_body:parsed.data.body});if(result.error)redirect("/support/new?message=failed");revalidatePath("/support");redirect(`/support/${result.data}?message=created`)}
export async function replySupportTicketAction(data:FormData){const parsed=z.object({id:z.uuid(),body:z.string().trim().min(1).max(10000)}).safeParse({id:value(data,"ticketId"),body:value(data,"body")});if(!parsed.success)redirect("/support");const supabase=await client();const result=await supabase.rpc("reply_current_support_ticket",{p_ticket_id:parsed.data.id,p_body:parsed.data.body});revalidatePath(`/support/${parsed.data.id}`);redirect(`/support/${parsed.data.id}?message=${result.error?"failed":"sent"}`)}
export async function closeSupportTicketAction(data:FormData){const id=z.uuid().safeParse(value(data,"ticketId"));if(!id.success)redirect("/support");const supabase=await client();const result=await supabase.rpc("close_current_support_ticket",{p_ticket_id:id.data});revalidatePath("/support");redirect(`/support/${id.data}?message=${result.error?"failed":"closed"}`)}
