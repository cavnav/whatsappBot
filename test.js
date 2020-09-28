const params = {
  names: [
    {
      name: 'Любимая',
      title: 'извини, тест!'
    }, 
    {
      name: 'Мама',
      title: 'тест, извини!'
    },
    {
      name: 'Мамао',
      title: 'тест, не обращай!'
    },
    {
      name: 'Минаев',
      title: 'тестирую!'
    }
  ],
  sharedFolder: 'E:\\projects\\docsF-photo2\\shared',
};

const { fork } = require('child_process');

const child = fork('index.js', null, { silent: true });

child.send(params); 
  
child.stderr.on('data', (data) => console.log('err1: ', data));

child.on('close', (code) => {
  console.log(`close, child process close all stdio with code ${code}`);
});

child.on('exit', (code, signal) => {
  console.log('exit', code, signal);
});

child.unref();