/* Build a small, fully bundled Tailwind v4 utility sheet from dashboard JSX.
 * Runs offline with a local Tailwind package; the committed CSS is the fallback. */
const fs=require('fs'),path=require('path');
let tailwind;
try{tailwind=require('tailwindcss')}catch(e){console.log('Tailwind package unavailable; keeping generated dashboard CSS');process.exit(0)}
const source=fs.readFileSync(path.join(__dirname,'soc-dashboard.tsx'),'utf8');
const parts=[...source.matchAll(/(?:className|class)=\s*(?:"([^"]*)"|'([^']*)'|\{([^}]{1,800})\})/g)].map(m=>m[1]||m[2]||m[3]||'');
// Include classes from expressions (conditional literals and responsive utilities).
const candidates=new Set(parts.flatMap(p=>p.split(/[\s'"`+?!{}()]+/)).filter(s=>s&&s.length<90));
const theme=`@theme {
 --spacing:0.25rem; --breakpoint-sm:40rem; --breakpoint-md:48rem; --breakpoint-lg:64rem; --breakpoint-xl:80rem;
 --color-white:#fff; --color-cyan-300:#67e8f9; --color-slate-200:#e2e8f0; --color-slate-300:#cbd5e1; --color-slate-400:#94a3b8; --color-slate-500:#64748b;
 --text-xs:0.75rem; --text-xs--line-height:1rem; --text-sm:0.875rem; --text-sm--line-height:1.25rem; --text-2xl:1.5rem; --text-3xl:1.875rem; --text-4xl:2.25rem;
 --radius-lg:0.5rem; --radius-xl:0.75rem; --radius-2xl:1rem; --radius-full:9999px;
 --font-weight-medium:500; --font-weight-semibold:600; --font-weight-bold:700;
 --tracking-tight:-.025em; --tracking-wide:.025em; --tracking-widest:.1em;
}`;
(async()=>{const build=await tailwind.compile(theme+'\n@tailwind utilities;');const css=build.build([...candidates]);fs.writeFileSync(path.join(__dirname,'tailwind.output.css'),css);console.log('Tailwind CSS compiled',css.length,'bytes',candidates.size,'candidates')})().catch(e=>{console.error(e);process.exit(2)});
