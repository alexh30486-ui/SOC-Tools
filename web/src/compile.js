const path=require("path"),fs=require("fs");
let ts;
for(const c of ["typescript",path.join(process.env.HOME||"",".npm-global/lib/node_modules/typescript/lib/typescript.js"),path.join(__dirname,"..","node_modules/typescript/lib/typescript.js")]){try{ts=require(c);break}catch(e){}}
if(!ts){console.error("TypeScript is not installed, so the web app was not rebuilt. To rebuild after editing app.tsx, run: cd web && npm install --no-save typescript@5");process.exit(2)}
const src=["gemma-research.ts","soc-hash.ts","soc-dashboard.tsx","soc-model-lab.tsx","soc-linux-library.tsx","soc-network-lab.tsx","app.tsx"].map(n=>fs.readFileSync(path.join(__dirname,n),"utf8")).join("\n");
if(!ts.transpileModule){console.error("This TypeScript version is not supported. Run: cd web && npm install --no-save typescript@5");process.exit(2)}
const out=ts.transpileModule(src,{compilerOptions:{jsx:2,target:7,module:5,removeComments:true},reportDiagnostics:true,fileName:"app.tsx"});
const d=out.diagnostics||[];
if(d.length){d.forEach(x=>{const p=x.file?x.file.getLineAndCharacterOfPosition(x.start):{line:-1};console.log("ERR",p.line+1,ts.flattenDiagnosticMessageText(x.messageText,""))});process.exit(1)}
fs.writeFileSync(process.argv[2]||path.join(__dirname,"app.js"),out.outputText);console.log("compiled OK");
