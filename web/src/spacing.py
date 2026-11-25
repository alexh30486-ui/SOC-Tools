import re,sys
APPLY='--apply' in sys.argv
SCALE=[0,4,8,12,16,20,24,32,40,48,56,64,80,96]
VH_BASE=900  # audit viewport height used to convert vh spacing to px
def snap(v):
    if v<0: return -snap(-v)
    best=min(SCALE,key=lambda s:(abs(s-v),-s))  # ties go to the larger step
    return best
log=[]
def fmt(x): return str(int(x)) if float(x).is_integer() else str(x)
def conv(token,where):
    m=re.fullmatch(r'(-?\d+(?:\.\d+)?)(px|vh)',token)
    if not m: return token
    val=float(m.group(1)); unit=m.group(2)
    px=val if unit=='px' else val/100*VH_BASE
    new=snap(px)
    if new==val and unit=='px': return token
    log.append((where,token,f'{fmt(new)}px'))
    return f'{fmt(new)}px'
# CSS (head.html)
h=open('src/head.html',encoding='utf-8').read()
def css_fix(m):
    prop,val=m.group(1),m.group(2)
    newv=re.sub(r'-?\d+(?:\.\d+)?(?:px|vh)',lambda t:conv(t.group(0),'css '+prop),val)
    return prop+':'+newv
h2=re.sub(r'((?:padding|margin|gap|row-gap|column-gap)(?:-(?:top|right|bottom|left))?)\s*:\s*([^;{}]+)',lambda m:css_fix(m).replace(m.group(1)+':',m.group(1)+': ',0) if False else css_fix(m),h)
# TSX (app.tsx) inline style numbers and strings
t=open('src/app.tsx',encoding='utf-8').read()
KEY=r'((?:padding|margin|gap|rowGap|columnGap)(?:Top|Right|Bottom|Left)?)'
def tsx_num(m):
    prop,v=m.group(1),float(m.group(2))
    new=snap(v)
    if new==v: return m.group(0)
    log.append(('tsx '+prop,fmt(v),fmt(new)))
    return f'{prop}:{fmt(new)}'
t2=re.sub(KEY+r':(-?\d+(?:\.\d+)?)(?![\d.])',tsx_num,t)
def tsx_str(m):
    prop,q,body=m.group(1),m.group(2),m.group(3)
    nb=re.sub(r'-?\d+(?:\.\d+)?(?:px|vh)',lambda x:conv(x.group(0),'tsx '+prop),body)
    return f'{prop}:{q}{nb}{q}'
t3=re.sub(KEY+r':([\'"])([^\'"]*)\2',tsx_str,t2)
print('CHANGES (before -> after):')
from collections import Counter
c=Counter((w,a,b) for w,a,b in log)
for (w,a,b),n in sorted(c.items(),key=lambda x:(x[0][0],x[0][1])):
    print(f'  {w:<28} {a:>9} -> {b:<8} x{n}')
print('total substitutions:',len(log))
if APPLY:
    open('src/head.html','w',encoding='utf-8').write(h2)
    open('src/app.tsx','w',encoding='utf-8').write(t3)
    print('applied')
