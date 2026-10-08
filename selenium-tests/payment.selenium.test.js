const path = require("path");
const { pathToFileURL } = require("url");
const { Builder, By, until, Select } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

// Legătura cu pagina testată: ../payment/index.html, relativ la acest fișier
const PAYMENT_URL = pathToFileURL(path.resolve(__dirname, "../payment/index.html")).href;
const BRAVE = "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";

let driver;

beforeAll(async () => {
  const optiuni = new chrome.Options()
    .setChromeBinaryPath(BRAVE)
    // Brave se închide brusc dacă driverul îi trimite setarea --test-type=webdriver,
    // așa că îi spunem driverului să n-o mai trimită.
    .excludeSwitches("test-type");
  // Brave rulează ascuns, fără fereastră pe ecran.
  // Ca să-l vezi, pune HEADED=1 în fața comenzii: HEADED=1 npx jest payment
  if (!process.env.HEADED) optiuni.addArguments("--headless=new");
  driver = await new Builder().forBrowser("chrome").setChromeOptions(optiuni).build();
});

afterAll(async () => {
  await driver.quit();
});

beforeEach(async () => {
  await driver.get(PAYMENT_URL);
});

test("TC1 – transfer valid în RON", async () => {
  // Precondiții: pagina de plată e deschisă (in beforeEach)

  // Pași
  await driver.findElement(By.id("ibanField")).sendKeys("RO49AAAA1B31007593840000"); // 1. IBAN
  await driver.findElement(By.id("amountField")).sendKeys("100"); // 2. Sumă
  // 3. Moneda rămâne RON: e deja selectată, deci nu scriem nimic
  await driver.findElement(By.id("pinField")).sendKeys("1234"); // 4. PIN
  await driver.findElement(By.id("payBtn")).click(); // 5. Confirmă plata

  // Rezultat așteptat
  const mesaj = await driver.findElement(By.id("message"));
  await driver.wait(until.elementIsVisible(mesaj), 5000);
  expect(await mesaj.getText()).toBe("Plată confirmată către RO49AAAA1B31007593840000.");
});

test("TC2 - suma peste sold", async () => {
  // Precondiții: pagina de plată e deschisă (in beforeEach)

  // Pași
  await driver.findElement(By.id("ibanField")).sendKeys("RO49AAAA1B31007593840000");
  await driver.findElement(By.id("amountField")).sendKeys("5000");
  await driver.findElement(By.id("pinField")).sendKeys("1234");
  await driver.findElement(By.id("payBtn")).click();

  // Rezultat așteptat
  const mesaj = await driver.findElement(By.id("message"));
  await driver.wait(until.elementIsVisible(mesaj), 5000);
  expect(await mesaj.getText()).toContain("Fonduri insuficiente");
  const istoric = await driver.findElement(By.id("logList"));
  expect(await istoric.getText()).toBe("Nicio plată încă.");
});

test("TC3 - plata apare in istoric", async () => {
  // Precondiții: pagina de plată e deschisă (in beforeEach)

  // Pași
  await driver.findElement(By.id("ibanField")).sendKeys("RO49AAAA1B31007593840000"); // 1. IBAN
  await driver.findElement(By.id("amountField")).sendKeys("100"); // 2. Sumă
  // 3. Moneda rămâne RON: e deja selectată, deci nu scriem nimic
  await driver.findElement(By.id("pinField")).sendKeys("1234"); // 4. PIN
  await driver.findElement(By.id("payBtn")).click(); // 5. Confirmă plata

  // Rezultat așteptat
  const mesaj = await driver.findElement(By.id("message"));
  await driver.wait(until.elementIsVisible(mesaj), 5000);
  const istoric = await driver.findElement(By.id("logList"));
  expect(await istoric.getText()).toContain("100.00 RON");
  expect(await istoric.getText()).toContain("RO49AAAA1B31007593840000");
});

// ===== Setul 2 de exerciții (2026-10-05) =====

test("TC4 - campul PIN ascunde cifrele introduse", async () => {
  // Precondiții pagina e deschisă (în beforeEach)


  // Pași
  const pin = await driver.findElement(By.id("pinField"));
  await pin.sendKeys("1234");

  // Rezultat așteptat
  expect(await pin.getAttribute("type")).toBe("password");

});

test("TC5 - plata valida in EUR ", async () => {
  // Precondiții pagina e deschisă (în beforeEach)

  // Pași
  await driver.findElement(By.id("ibanField")).sendKeys("RO49AAAA1B31007593840000"); 
  await driver.findElement(By.id("amountField")).sendKeys("100"); 
  const moneda = new Select(await driver.findElement(By.id("currencyField")));
  await moneda.selectByVisibleText("EUR");
  await driver.findElement(By.id("pinField")).sendKeys("1234");
  await driver.findElement(By.id("payBtn")).click();

  // Rezultat așteptat
  const mesaj = await driver.findElement(By.id("message"));
  await driver.wait(until.elementIsVisible(mesaj), 5000);
  expect(await mesaj.getText()).toBe("Plată confirmată către RO49AAAA1B31007593840000."); 
  const istoricplati = await driver.findElement(By.id("logList"));
  expect(await istoricplati.getText()).toContain("EUR");
  
});

test("TC6 - previzualizarea arata suma in EUR inainte de plata", async () => {
  // Precondiții pagina e deschisă (în beforeEach)

  // Pași
  const monede = new Select(await driver.findElement(By.id("currencyField")));
  await monede.selectByVisibleText("EUR");
  await driver.findElement(By.id("amountField")).sendKeys("100");

  // Rezultat așteptat 
  const previzualizare = await driver.findElement(By.id("preview")); 
  expect(await previzualizare.getText()).toContain("20.00 EUR");

});

test("TC7 - previzualizarea se actualizeaza cand schimbi moneda dupa ce ai scris suma", async () => {
  // Precondiții pagina e deschisă (în beforeEach)

  // Pași
  await driver.findElement(By.id("amountField")).sendKeys("100");
  const moneds = new Select(await driver.findElement(By.id("currencyField")));
  await moneds.selectByVisibleText("EUR");

  // Rezultat așteptat
  const previz = await driver.findElement(By.id("preview")); 
  expect(await previz.getText()).toContain("20.00 EUR");

});

test("TC8 - plata nu se dubleaza la dublu-click pe 'Confirma plata' ", async () => {
  // Precondiții pagina e deschisă (în beforeEach)

  // Pași
  await driver.findElement(By.id("ibanField")).sendKeys("RO49AAAA1B31007593840000");
  
  await driver.findElement(By.id("amountField")).sendKeys("100");
  await driver.findElement(By.id("pinField")).sendKeys("1234");
  const buton = await driver.findElement(By.id("payBtn"));
  await buton.click();
  await buton.click();



  // Rezultat așteptat
  const randuri = await driver.findElements(By.css("#logList li"));
  expect(randuri.length).toBe(1);
  

});


