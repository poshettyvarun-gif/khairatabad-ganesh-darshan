import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
export async function getSessionProfile():Promise<Profile|null>{
 if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)return null;
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user)return null;
 const {data}=await supabase.from("profiles").select("*").eq("user_id",user.id).single(); return data as Profile|null;
}
export async function requireUser(role?:"user"|"admin"){ const p=await getSessionProfile(); if(!p)redirect("/login"); if(role&&p.role!==role)redirect(p.role==="admin"?"/admin":"/dashboard"); return p; }
