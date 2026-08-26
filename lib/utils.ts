export const fmtDate=(v:string)=>new Intl.DateTimeFormat("en-IN",{day:"2-digit",month:"long",year:"numeric"}).format(new Date(v+"T00:00:00"));
export const fmtTime=(v:string)=>new Date(`2000-01-01T${v}`).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"});
export const cls=(...v:(string|false|undefined)[])=>v.filter(Boolean).join(" ");
