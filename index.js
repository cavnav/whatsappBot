const fs = require('fs');
const find = require('find');
const puppeteer = require('puppeteer');

const credentialsFile = 'credentials.json';

(async () => {
  const recipientsList = await new Promise((resolve) => {
    process.on('message', (params) => resolve(params));  
  });

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--start-maximized'],
  }); // default is true
  
  browser.on('disconnected', () => process.send(-1));

  const page = await browser.newPage();
  await page.goto('https://web.whatsapp.com');
  await restoreLocalStorage(page, credentialsFile);
  await page.reload({ waitUntil: ["networkidle0", "domcontentloaded"] });

  const isQRcode = await checkQRcode({ page });
  
	if (isQRcode) {
		setTimeout(async () => {
      const isQRcode = await checkQRcode({ page });
      if (isQRcode === null) {
        await saveLocalStorage(page, credentialsFile); 
        page.evaluate(() => alert('data has been saved'));       
      }
    }, 35000);
    page.evaluate(() => alert('you have 30s to enter'));

    return;
  }
  
  await saveLocalStorage(page, credentialsFile); 
  
  await delay(10000);

  const searchInput = await page.$('label .copyable-text.selectable-text');    
  if (searchInput === null) return;

  const recipNames = recipientsList.names;
  for (let recipIndex = 0; recipIndex < recipNames.length; recipIndex++) {
    const recipient = recipNames[recipIndex];
    
    await delay(1000);
    await searchInput.click();
    await delay(300);
    await searchInput.click();
    await delay(300);

    await pressKeys(page, 'Control', 'A');
    await page.keyboard.press('Delete');
    await delay(300);
    await page.keyboard.type(recipient.name);
    await delay(3000);
    
    const matchedRowId = await page.evaluate((recName) => new Promise((resolve) => {
        const res = [...document.querySelectorAll(`span[title="${recName}"]`)].reduce((resE, e) => {
          const top = e.getBoundingClientRect().top;
            return (top < resE.top) ? ({ e, top }) : resE;
          }, { top: 10000 });
        
        if (!res.e) resolve('');          
        const matchedRowId = getCurMoment();        
        res.e.setAttribute('matched-row', matchedRowId);
        resolve(matchedRowId);
        
        function getCurMoment() {
          const dateISO = new Date().toISOString();
          return dateISO.slice(0, dateISO.indexOf('.')).replace(/:/g, '');
        }
      }),
      recipient.name,
    );

    if (!matchedRowId) return;

    const matchedRowWithId = await page.$(`span[matched-row="${matchedRowId}"]`);
    await matchedRowWithId.click();

    await delay(1000);
    await pressKeys(page, 'Control', 'A');
    await page.keyboard.press('Delete');
    await page.keyboard.type(recipient.title);
    const btnAttach = await page.$('div[role="button"][title="Attach"]');
    await btnAttach.click();
    await delay(1000);
    const attachInput = await page.$('span[data-icon="attach-image"] +input[type=file][multiple]');
    
    find.file('', recipientsList.sharedFolder, async (files) => {
      for (let index = 0; index < files.length; index++) {
        const filePath = files[index];
        await attachInput.uploadFile(filePath);
      }
    });

    await delay(3000);
    // await page.keyboard.press('Enter');
  } 

  await browser.close();
  process.exit(0);
})();

async function pressKeys(page, ...keys) {
  for (let keyInd = 0; keyInd < keys.length; keyInd++) {
    const key = keys[keyInd];
    await page.keyboard.down(key);
    await delay();
  }
  for (let keyInd = 0; keyInd < keys.length; keyInd++) {
    const key = keys[keyInd];
    await page.keyboard.up(key);
    await delay();
  }
}

async function delay(time = 0) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

async function checkQRcode({ page }) {
  const isQRcode = await page.evaluate(() => {
    return document.querySelector('canvas');
  });
  return isQRcode;
}

async function saveLocalStorage(page, filePath) {
  const json = await page.evaluate(() => {
    const json = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      json[key] = localStorage.getItem(key);
    }
    return json;
  });
  fs.writeFileSync(filePath, JSON.stringify(json), 'utf8');
}

async function restoreLocalStorage(page, filePath) {
  const json = JSON.parse(fs.readFileSync(filePath, 'utf8') || '{}');
  await page.evaluate(json => {
    localStorage.clear();
    for (let key in json)
      localStorage.setItem(key, json[key]);
  }, json);
}