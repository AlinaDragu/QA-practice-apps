const path = require("path");
const { pathToFileURL } = require("url");
const { Builder, By } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");


// Legătura cu pagina testată: ../bills/index.html, relativ la acest fișier
const BILLS_URL = pathToFileURL(path.resolve(__dirname, "../bills/index.html")).href;
const BRAVE = "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";

let driver;

beforeAll(async () => {
  const optiuni = new chrome.Options()
    .setChromeBinaryPath(BRAVE)
    // Brave se închide brusc dacă driverul îi trimite setarea --test-type=webdriver,
    // așa că îi spunem driverului să n-o mai trimită.
    .excludeSwitches("test-type");
  // Brave rulează ascuns, fără fereastră pe ecran.
  // Ca să-l vezi, pune HEADED=1 în fața comenzii: HEADED=1 npx jest bills
  if (!process.env.HEADED) optiuni.addArguments("--headless=new");
  driver = await new Builder().forBrowser("chrome").setChromeOptions(optiuni).build();
});

afterAll(async () => {
  await driver.quit();
});

beforeEach(async () => {
  await driver.get(BILLS_URL);
});

test("TC1 - plată integrală a facturii Enel", async () => {
  // Precondiții: pagina „Plată facturi” e deschisă (în beforeEach)

  // Pași
  await driver.findElement(By.css("span[data-open='EN-4471']")).click();
  await driver.findElement(By.id("payBtn")).click();

  // Rezultat așteptat
  const mesaj = await driver.findElement(By.id("msg"));
  expect(await mesaj.getText()).toContain("Plată efectuată");
  expect(await mesaj.getAttribute("class")).toContain("success");
  const lista = await driver.findElement(By.id("histList"));
  expect(await lista.getText()).toContain("214,50 RON");

});

test("TC2- panoul de plata se deschide si se inchide", async () => {
  // preconditii: pagina "plata facturi" e deschisa (in beforeEach)

  // pasi
  // 1. ma uit la pagina abia deschisa

  // rezultat asteptat
  const panou = await driver.findElement(By.id("payPanel"));
  expect(await panou.isDisplayed()).toBe(false);

  // pas 2
  await driver.findElement(By.css("span[data-open='GZ-8823']")).click();

  // rezultat asteptat
  expect(await panou.isDisplayed()).toBe(true);
  const penalitate = await driver.findElement(By.id("ppPenaltyRow"));
  expect(await penalitate.isDisplayed()).toBe(true);

  //pas 3
  await driver.findElement(By.id("ppClose")).click();

  // rezultat asteptat
  expect(await panou.isDisplayed()).toBe(false);

});


test("TC3 - totalul de plata =. factura + penalitatea(Vodafone)", async () => {
  // preconditii: pagina "plata facturi" e deschisa (in beforeEach)

  // pasi
  await driver.findElement(By.css("span[data-open='VF-2231']")).click();

  // rezultat asteptat 
  const textFactura = await driver.findElement(By.id("ppPrincipal")).getText();
  const factura = parseFloat(textFactura.replace(",", "."));
  const textPenalty = await driver.findElement(By.id("ppPenalty")).getText();
  const penalty= parseFloat(textPenalty.replace(",", "."));
  const textTotal = await driver.findElement(By.id("ppTotal")).getText();
  const total = parseFloat(textTotal.replace(",", "."));
  expect(total).toBeCloseTo( factura + penalty , 2);

});

test("TC4 - penalitatea din totalul de plata se incaseaza efectiv (Engie)", async () => {
  // preconditii: pagina "plata facturi" e deschisa (in beforeEach)

  // pasi
  await driver.findElement(By.css("span[data-open='GZ-8823']")).click();
  const totalPlataInainte = await driver.findElement(By.id("ppTotal")).getText();
  await driver.findElement(By.id("payBtn")).click();

  // rezultat asteptat
  const totalPlataDupa = await driver.findElement(By.id("histList")).getText();
  expect(totalPlataDupa).toContain(totalPlataInainte);
});

test("TC5 - antetul total de plata n facturi se actualizeaza dupa o plata", async () => {
  // preconditii: pagina "plata facturi" e deschisa (in beforeEach)

  // pasi
  await driver.findElement(By.css("span[data-open='EN-4471']")).click();
  await driver.findElement(By.id("payBtn")).click();

  // rezultat asteptat
  const lista = await driver.findElements(By.css("#billList li"));
  const textAntet = await driver.findElement(By.id("billCount")).getText();
  const antet = parseFloat(textAntet);
  expect(antet).toBe(lista.length);
});