const path = require("path");
const { pathToFileURL } = require("url");
const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

// Legătura cu pagina testată: ../payment/index.html, relativ la acest fișier
const PAYMENT_URL = pathToFileURL(path.resolve(__dirname, "../payment/index.html")).href;
const BRAVE = "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";

let driver;

beforeAll(async () => {
  const optiuni = new chrome.Options().setChromeBinaryPath(BRAVE);
  driver = await new Builder().forBrowser("chrome").setChromeOptions(optiuni).build();
});

afterAll(async () => {
  await driver.quit();
});

test("TC1 – transfer valid în RON", async () => {
  // Precondiții: pagina de plată e deschisă
  await driver.get(PAYMENT_URL);

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
  // Precondiții: pagina de plată e deschisă
  await driver.get(PAYMENT_URL);

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
  // Precondiții: pagina de plată e deschisă
  await driver.get(PAYMENT_URL);

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