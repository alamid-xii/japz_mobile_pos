import urllib.request,re
for url in ['https://dev.mysql.com/','https://www.mysql.com/common/logos/logo-mysql-170x115.png?diagram=1']:
 try:
  data=urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=20).read()
  if data.startswith(b'\x89PNG'):
   from pathlib import Path
   Path('output/architecture-options/assets/mysql.png').write_bytes(data);print('saved MySQL',url)
  else:print(url,sorted(set(re.findall(r'(?:src|href)=[\"\']([^\"\']+(?:svg|png))',data.decode())))[:15])
 except Exception as e:print(url,str(e))
