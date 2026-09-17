import {spawnSync} from 'node:child_process';

const npmCli=process.env.npm_execpath;
if(!npmCli)throw Error('找不到 npm CLI，請透過 npm run verify 執行。');
const steps=[
  ['語法檢查',['run','check','--silent']],
  ['Node 測試',['test','--silent']],
  ['瀏覽器測試',['run','test:e2e','--silent']]
];

for(const [name,args] of steps){
  const result=spawnSync(process.execPath,[npmCli,...args],{encoding:'utf8',env:process.env});
  if(result.status!==0){
    console.error(`${name}失敗`);
    if(result.error)console.error(result.error.message);
    if(result.stdout?.trim())console.error(result.stdout.trimEnd());
    if(result.stderr?.trim())console.error(result.stderr.trimEnd());
    process.exit(result.status??1);
  }
}

console.log('全部完成');
