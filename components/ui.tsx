import type { BookingStatus } from "@/lib/types"; import { cls } from "@/lib/utils";
export function StatusBadge({status}:{status:BookingStatus}){return <span className={cls("badge",`badge-${status}`)}>{status}</span>}
export function Empty({title,detail}:{title:string;detail:string}){return <div className="card p-10 text-center"><div className="mb-2 text-lg font-bold">{title}</div><p className="text-stone-500">{detail}</p></div>}
export function Alert({type="error",children}:{type?:"error"|"success";children:React.ReactNode}){return <div role="alert" className={cls("rounded-lg border p-3 text-sm",type==="error"?"border-red-200 bg-red-50 text-red-800":"border-green-200 bg-green-50 text-green-800")}>{children}</div>}
