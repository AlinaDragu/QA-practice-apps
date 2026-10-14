const path = require("path");
const { pathToFileURL } = require("url");
const { Builder, By, Key } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

// Legătura cu pagina testată: ../loan/index.html, relativ la acest fișier
const LOAN_URL = pathToFileURL(path.resolve(__dirname, "../loan/index.html")).href;
const BRAVE = "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";

let driver;

beforeAll(async () => {
  const optiuni = new chrome.Options()
    .setChromeBinaryPath(BRAVE)
    // Brave se închide brusc dacă driverul îi trimite setarea --test-type=webdriver,
    // așa că îi spunem driverului să n-o mai trimită.
    .excludeSwitches("test-type");
  // Brave rulează ascuns, fără fereastră pe ecran.
  // Ca să-l vezi, pune HEADED=1 în fața comenzii: HEADED=1 npx jest loan
  if (!process.env.HEADED) optiuni.addArguments("--headless=new");
  driver = await new Builder().forBrowser("chrome").setChromeOptions(optiuni).build();
});

afterAll(async () => {
  await driver.quit();
});

beforeEach(async () => {
  await driver.get(LOAN_URL);
});

test("TC1 - simulare cu date valide", async () => {
  // Precondiții: pagina „Simulare credit” e deschisă (în beforeEach)

  // Pași
  await driver.findElement(By.id("amountField")).clear();
  await driver.findElement(By.id("amountField")).sendKeys("30000");
  await driver.findElement(By.id("monthsField")).clear();
  await driver.findElement(By.id("monthsField")).sendKeys("48");
  await driver.findElement(By.id("incomeField")).sendKeys("6000");
  await driver.findElement(By.id("calcBtn")).click();

  // Rezultat așteptat
  const mesaj = await driver.findElement(By.id("message"));
  expect(await mesaj.getText()).toBe("Simulare efectuată.");
  expect(await mesaj.getAttribute("class")).toContain("success");
  const log = await driver.findElement(By.id("logList"));
  expect(await log.getText()).toContain("30000 RON / 48 luni");

});

test("TC2 - rata lunara e calculata corect", async () => {
  //preconditii: pagina "simulare credit" e deschisa (in beforeEach)

  //pasi
  // 1. suma 20000 și perioada 36 rămân cele deja completate
  await driver.findElement(By.id("incomeField")).sendKeys("5000");
  await driver.findElement(By.id("calcBtn")).click();

  //rezultat asteptat
  const textRata = await driver.findElement(By.id("rataOut")).getText();
  const rata = parseFloat(textRata);
  expect(rata).toBeCloseTo(640.57, 2);

});


test("TC3 - asigurarea de viata se adauga la rata lunara", async () => {
  //preconditii: pagina "simulare credit" e deschisa (in beforeEach)
  
  //pasi 
  // 1. suma 20000 și perioada 36 rămân cele deja completate
  await driver.findElement(By.id("incomeField")).sendKeys("5000");
  await driver.findElement(By.id("calcBtn")).click();
  const rataFara = parseFloat(await driver.findElement(By.id("rataOut")).getText());
  await driver.findElement(By.id("insurance")).click();
  await driver.findElement(By.id("calcBtn")).click();


  //rezultat asteptat
  const rataCu = parseFloat(await driver.findElement(By.id("rataOut")).getText());
  expect(rataCu).toBeGreaterThan(rataFara);
  
});

test("TC4 - totalul de plata e egal cu rata lunara x numarul de luni", async () => {
  //preconditii: pagina "simulare credit" e deschisa (in beforeEach)

  //pasi
  // 1. suma 20000 și perioada 36 rămân cele deja completate
  await driver.findElement(By.id("incomeField")).sendKeys("5000");
  await driver.findElement(By.id("calcBtn")).click();
  

  //rezultatul asteptat
  const rataLunara = parseFloat(await driver.findElement(By.id("rataOut")).getText());
  const totalPlata = parseFloat(await driver.findElement(By.id("totalOut")).getText());
  expect(totalPlata).toBeCloseTo(rataLunara * 36, 0);

});


test("TC5 - sumele sunt afisate in format romanesc", async () => {
  //preconditii: pagina "simulare credit" e deschisa (in beforeEach)

  //pasi
  // 1. suma 20000 și perioada 36 rămân cele deja completate
  await driver.findElement(By.id("incomeField")).sendKeys("5000");
  await driver.findElement(By.id("calcBtn")).click();

  //rezultat asteptat
  expect(await driver.findElement(By.id("comOut")).getText()).toBe("200,00 RON");
});

test.each([
  // [suma, clasa asteptata]
  ["999", "error"],   
  ["1000", "success"], 
  ["150000", "success"],  
  ["150001", "error"],
  ["-5000", "error"]    
]) ("TC6 - suma creditului e acceptata doar intre 1.000 si 150.000  RON %s / %s", async (suma, clasaAsteptata) => {
  //preconditii: pagina "simulare credit" e deschisa (in beforeEach)

  //pasi 
  await driver.findElement(By.id("amountField")).clear();
  await driver.findElement(By.id("amountField")).sendKeys(suma);
  await driver.findElement(By.id("incomeField")).sendKeys("5000");
  await driver.findElement(By.id("calcBtn")).click();
  
  //rezultat asteptat 
  const mesajj = await driver.findElement(By.id("message"));
  expect(await mesajj.getAttribute("class")).toContain(clasaAsteptata);

});

test("TC7 - sliderul actualizeaza campul", async () => {
  //preconditii: pagina "simulare credit" e deschisa (in beforeEach)

  //pasi
  await driver.findElement(By.id("amountRange")).sendKeys(Key.END);

  //rezultat asteptat
  const suma = await driver.findElement(By.id("amountField"));
  expect(await suma.getAttribute("value")).toBe("150000");

});

test("TC8 - campul actualizeaza sliderul", async () => {
  //preconditii: pagina "simulare credit" e deschisa (in beforeEach)

  //pasi
  await driver.findElement(By.id("amountField")).clear();
  await driver.findElement(By.id("amountField")).sendKeys("100000");

  //rezultat asteptat
  const sume = await driver.findElement(By.id("amountRange"));
  expect(await sume.getAttribute("value")).toBe("100000");
});


test("TC9 - rezuultatele vechi raman pe ecran", async () => {
  //preconditii: pagina "simulare credit" e deschisa (in beforeEach)

  //pasi 
  // suma 20000 si perioada 36 raman cele deja completate
  await driver.findElement(By.id("incomeField")).sendKeys("5000");
  await driver.findElement(By.id("calcBtn")).click();
  const ratalun = await driver.findElement(By.id("rataOut")).getText();
  await driver.findElement(By.id("amountRange")).sendKeys(Key.END);

  //rezultatul asteptat
  const rataNoua = await driver.findElement(By.id("rataOut")).getText();
  expect(rataNoua).not.toBe(ratalun);

});