const fs = require('fs');
const find = require('find');
const puppeteer = require('puppeteer');

const credentialsFile = 'credentials.json';
const folderShared = 'E:\\projects\\docsF-photo2\\shared';
const recipientsList = ['любимая', 'мама'];

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--start-maximized'],
  }); // default is true
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

  for (let recipIndex = 0; recipIndex < recipientsList.length; recipIndex++) {
    const recipient = recipientsList[recipIndex];
    
    await delay(1000);
    await searchInput.click();
    await delay(300);
    await searchInput.click();
    await delay(300);

    await pressKeys(page, 'Control', 'A');
    await page.keyboard.press('Delete');
    await delay(300);
    await page.keyboard.type(recipient);
    await delay(3000);
    const matchedRow = await page.$('[style*="transform: translateY(72px)"');
    await matchedRow.click();
    await delay(1000);
    await pressKeys(page, 'Control', 'A');
    await page.keyboard.press('Delete');
    await page.keyboard.type('извини, тест!');
    const btnAttach = await page.$('div[role="button"][title="Attach"]');
    await btnAttach.click();
    await delay(1000);
    const attachInput = await page.$('span[data-icon="attach-image"] +input[type=file][multiple]');

    
    find.file('', folderShared, async (files) => {
      for (let index = 0; index < files.length; index++) {
        const filePath = files[index];
        await attachInput.uploadFile(filePath);
      }
    });

    await delay(3000);
    await page.keyboard.press('Enter');
  }    
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