const path = require("path");
const { pathToFileURL } = require("url");
const { Builder, By , Select} = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

// Legătura cu pagina testată: ../exchange/index.html, relativ la acest fișier
const EXCHANGE_URL = pathToFileURL(path.resolve(__dirname, "../exchange/index.html")).href;
const BRAVE = "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";

let driver;

beforeAll(async () => {
  const optiuni = new chrome.Options()
    .setChromeBinaryPath(BRAVE)
    // Brave se închide brusc dacă driverul îi trimite setarea --test-type=webdriver,
    // așa că îi spunem driverului să n-o mai trimită.
    .excludeSwitches("test-type");
  // Brave rulează ascuns, fără fereastră pe ecran.
  // Ca să-l vezi, pune HEADED=1 în fața comenzii: HEADED=1 npx jest exchange
  if (!process.env.HEADED) optiuni.addArguments("--headless=new");
  driver = await new Builder().forBrowser("chrome").setChromeOptions(optiuni).build();
});

afterAll(async () => {
  await driver.quit();
});

beforeEach(async () => {
  await driver.get(EXCHANGE_URL);
});

test("TC1 - schimb valid EUR → RON", async () => {
  // Precondiții: pagina „Schimb valutar” e deschisă (în beforeEach)

  // Pași
  //suma 100 e deha cinoektata
  const monedae = new Select(await driver.findElement(By.id("fromCur")));
  await monedae.selectByValue("EUR");
  const monedar = new Select(await driver.findElement(By.id("toCur")));
  await monedar.selectByValue("RON");
  await driver.findElement(By.id("fxBtn")).click();

  // Rezultat așteptat
  const mesaj = await driver.findElement(By.id("message"));
  expect(await mesaj.getText()).toContain("Schimb efectuat");
  expect(await mesaj.getAttribute("class")).toContain("success");
  const schimburi = await driver.findElement(By.id("logList"));
  expect(await schimburi.getText()).toContain("100 EUR → 497.18 RON");

});


test("TC2 - conversia RON->EUR e corecta", async () => {
  // preconditii: pagina "schimb valutar" e deschisa (in beforeEach)

  // pasi
  await driver.findElement(By.id("amountField")).clear();
  await driver.findElement(By.id("amountField")).sendKeys("250");
  

  // rezultat asteptat
  const textSchimb = await driver.findElement(By.id("receiveOut")).getText();
  const schimb = parseFloat(textSchimb);
  expect(schimb).toBeCloseTo(50.28, 2);
});


test("TC3 - butonul ⇅ inversează monedele", async () => {
  // preconditii: pagina "schimb valutar" e deschisa (in beforeEach)

  // pasi
  await driver.findElement(By.id("swapBtn")).click();

  // rezultat asteptat 
  const monedae = await driver.findElement(By.id("fromCur"));
  expect(await monedae.getAttribute("value")).toBe("EUR");
  const monedar = await driver.findElement(By.id("toCur"));
  expect(await monedar.getAttribute("value")).toBe("RON");
  const primit = await driver.findElement(By.id("receiveOut"));
  expect(await primit.getText()).toContain("RON");

});

test("TC4 - comisionul se percepe", async() => {
  // preconditii: pagina "schimb valutar" e deschisa (in beforeEach)

  // pasi
  //suma 100 deja completata
  const eurInainte = parseFloat(await driver.findElement(By.id("balEUR")).getText());
  const monedae = new Select(await driver.findElement(By.id("fromCur")));
  await monedae.selectByValue("EUR");
  const monedar = new Select(await driver.findElement(By.id("toCur")));
  await monedar.selectByValue("RON");
  await driver.findElement(By.id("fxBtn")).click();

  // rezultat asteptat
  const eurDupa = parseFloat(await driver.findElement(By.id("balEUR")).getText());
  expect(eurDupa).toBeCloseTo(eurInainte - 100.50 , 2);

});

test("TC5 - referinta se afiseaza ca text, nu ca cod", async () => {
  // preconditii: pagina "schimb valutar" e deschisa ("in beforeEach")

  // pasi 
  await driver.findElement(By.id("refField")).sendKeys("<b>test</b>");
  await driver.findElement(By.id("fxBtn")).click();

  // rezultat asteptat
  const schimburief = await driver.findElement(By.id("logList"));
  expect(await schimburief.getText()).toContain("<b>test</b>");

});