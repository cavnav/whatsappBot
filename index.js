const fs = require('fs');
const puppeteer = require('puppeteer');

const credentialsFile = 'credentials.json';

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
  const searchInput = await page.$('label .copyable-text.selectable-text'); // new Promise((r) => setTimeout(() => r(), 15000));
  
  if (searchInput === null) return;
  
  await searchInput.click();
  await page.keyboard.type('любимая');
  await delay(3000);
  const matchedRow = await page.$('[style*="transform: translateY(72px)"');
  await matchedRow.click();
  await delay(1000);
  await page.keyboard.type('извини, тест!');
  const btnAttach = await page.$('div[role="button"][title="Attach"]');
  await btnAttach.click();
  await delay(1000);
  const attachImage = await page.$('span[data-icon="attach-image-old"] +input[type=file][multiple]');
  // await attachImage.click();
  // await delay(1000);
  // await page.waitForSelector('.file-dialog-trigger')
  // await page.click('.file-dialog-trigger')
  // const input = await page.$('input[type="file"]')
  await input.uploadFile('./content.csv');

})();

async function delay(time) {
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