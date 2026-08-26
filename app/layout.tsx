import type { Metadata } from "next"; import "./globals.css"; import { Header } from "@/components/header";
export const metadata:Metadata={title:"Khairatabad Ganesh Darshanam",description:"Official Darshan slot booking portal"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><Header/><main>{children}</main><footer className="mt-16 border-t bg-white py-8 text-center text-sm text-stone-500">Khairatabad Ganesh Darshanam Booking Portal · श्रद्धा · सेवा · सुव्यवस्था</footer></body></html>}
