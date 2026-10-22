const path = require("path");
const { pathToFileURL } = require("url");
const { Builder, By } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const { text } = require("stream/consumers");


// Legătura cu pagina testată: ../deposit/index.html, relativ la acest fișier
const DEPOSIT_URL = pathToFileURL(path.resolve(__dirname, "../deposit/index.html")).href;
const BRAVE = "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";

let driver;

beforeAll(async () => {
  const optiuni = new chrome.Options()
    .setChromeBinaryPath(BRAVE)
    // Brave se închide brusc dacă driverul îi trimite setarea --test-type=webdriver,
    // așa că îi spunem driverului să n-o mai trimită.
    .excludeSwitches("test-type");
  // Brave rulează ascuns, fără fereastră pe ecran.
  // Ca să-l vezi, pune HEADED=1 în fața comenzii: HEADED=1 npx jest deposit
  if (!process.env.HEADED) optiuni.addArguments("--headless=new");
  driver = await new Builder().forBrowser("chrome").setChromeOptions(optiuni).build();
});

afterAll(async () => {
  await driver.quit();
});

beforeEach(async () => {
  await driver.get(DEPOSIT_URL);
});

function inNumar(text) {
  return parseFloat(text.replaceAll(".", "").replace(",", "."));
}

test("TC1 - deschiderea unui depozit de 10.000 RON pe 12 luni", async () => {
  // Precondiții: pagina „Depozite la termen” e deschisă (în beforeEach)

  // Pași
  await driver.findElement(By.css("span[data-months='12']")).click();
  await driver.findElement(By.id("amountInput")).sendKeys("10000");
  await driver.findElement(By.id("depBtn")).click();

  // Rezultat așteptat
  const mesaj = await driver.findElement(By.id("msg"));
  expect(await mesaj.getText()).toContain("Depozit deschis");
  expect(await mesaj.getText()).toContain("pe 12 luni");
  expect(await mesaj.getAttribute("class")).toContain("success");
  const sold = await driver.findElement(By.id("balance"));
  expect(await sold.getText()).toBe("15.000,00 RON");

});


test("TC2 - valoare la scadenta din previzualizare include doar dobanda neta", async () => {
  // preconditii: pagina "depozite la termen" e deschisa (in beforeEach)

  // pasi
  await driver.findElement(By.id("amountInput")).sendKeys("10000");

  // rezultat asteptat
  const textSuma = await driver.findElement(By.id("pvPrincipal")).getText();   // "10.000,00 RON"
  const suma = parseFloat(textSuma.replaceAll(".", "").replace(",", "."));      // 10000
  const textNeta = await driver.findElement(By.id("pvNet")).getText();
  const neta = parseFloat(textNeta.replaceAll(".", "").replace(",", "."));
  const textScadenta = await driver.findElement(By.id("pvMaturity")).getText();
  const scadenta = parseFloat(textScadenta.replaceAll(".", "").replace(",", "."));

  expect(scadenta).toBeCloseTo(suma + neta, 2);
});


test("TC3 - previzualizarea dupa schimbarea termenului", async () => {
  // preconditii: pagina "depozite la termen" e deschisa (in beforeEach)

  // pasi
  await driver.findElement(By.id("amountInput")).sendKeys("10000");
  await driver.findElement(By.css("span[data-months='3']")).click();

  // rezultat asteptat
  const rata = await driver.findElement(By.id("pvRate"));
  expect(await rata.getText()).toBe("3,00%");
  const dobanda = await driver.findElement(By.id("pvGross"));
  expect(await dobanda.getText()).toBe("75,00 RON");
});


test("TC4 - data scadentei nu cade in weekend", async () => {
  // preconditii: pagina "depozit la termen" e deschisa (in beforeEach)

  // pasi
  await driver.findElement(By.css("span[data-months='1']")).click();
  await driver.findElement(By.id("amountInput")).sendKeys("10000");

  // rezultat asteptat
  
  const textData = await driver.findElement(By.id("pvDate")).getText();   // "2026-10-03"
  const zi = new Date(textData).getDay();
  expect(zi).not.toBe(0);   
  expect(zi).not.toBe(6);   

});

test("Tc5 - lichidare anticipata", async () => {
  // preconditii: pagina "depozit la termen" e deschisa (in beforeEach)

  // pasi
  const soldInainte = inNumar(await driver.findElement(By.id("balance")).getText());   
  await driver.findElement(By.css("span[data-liq='D-1003']")).click();
  const promis = inNumar(await driver.findElement(By.id("lpPayout")).getText());       
  await driver.findElement(By.id("liqBtn")).click();

  // rezultat asteptat
  const soldDupa = inNumar(await driver.findElement(By.id("balance")).getText());
  expect(soldDupa).toBeCloseTo(soldInainte + promis, 2);
});