import urllib.request,json
for repo in ['mysql/mysql-connector-nodejs','mysql/mysql-workbench']:
 try:
  url='https://api.github.com/repos/'+repo+'/git/trees/trunk?recursive=1'
  data=json.load(urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Codex'}),timeout=25))
  print(repo,[v['path'] for v in data['tree'] if ('logo' in v['path'].lower() or 'mysql' in v['path'].lower()) and v['path'].endswith(('.svg','.png'))][:30])
 except Exception as e:print(repo,str(e))
