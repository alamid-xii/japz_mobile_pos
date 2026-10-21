import urllib.request,re,json
pages=['https://sequelize.org/','https://vite.dev/','https://www.typescriptlang.org/branding/','https://nodejs.org/en/about/branding','https://expressjs.com/','https://www.mysql.com/about/legal/logos.html']
for url in pages:
    try:
        req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
        s=urllib.request.urlopen(req,timeout=25).read().decode()
        links=sorted(set(re.findall(r'(?:src|href)=[\"\']([^\"\']+(?:svg|png|zip))',s)))
        print(url,links[:35])
    except Exception as e: print(url,str(e))
