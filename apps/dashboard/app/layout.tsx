import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'JOCKY — Forensic Command Center',description:'Evidence-led endpoint investigation'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
