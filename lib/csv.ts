export const csvCell=(v:unknown)=>`"${String(v??"").replaceAll('"','""')}"`;
export function toCsv(headers:string[],rows:unknown[][]){return "\uFEFF"+[headers,...rows].map(r=>r.map(csvCell).join(",")).join("\r\n");}
