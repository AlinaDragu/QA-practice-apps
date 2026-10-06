const path = require("path");
const { pathToFileURL } = require("url");
const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

// Legătura cu pagina testată: ../login/index.html, relativ la acest fișier
const LOGIN_URL = pathToFileURL(path.resolve(__dirname, "../login/index.html")).href;
const BRAVE = "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";

let driver;

beforeAll(async () => {
  const optiuni = new chrome.Options()
    .setChromeBinaryPath(BRAVE)
    // Brave se închide brusc dacă driverul îi trimite setarea --test-type=webdriver,
    // așa că îi spunem driverului să n-o mai trimită.
    .excludeSwitches("test-type");
  driver = await new Builder().forBrowser("chrome").setChromeOptions(optiuni).build();
});

afterAll(async () => {
  await driver.quit();
});

beforeEach(async () => {
  await driver.get(LOGIN_URL);
});

test("TC1 - autentificare valida ", async () => {
  // Precondiții: pagina de login e deschisă (în beforeEach)

  // Pași
  await driver.findElement(By.id("emailField")).sendKeys("client@meridian.ro");
  await driver.findElement(By.id("passwordField")).sendKeys("Parola123");
  await driver.findElement(By.id("submitBtn")).click();

  // Rezultat așteptat
  const mesaj = await driver.findElement(By.id("message"));
  await driver.wait(until.elementIsVisible(mesaj), 5000);
  expect(await mesaj.getText()).toBe("Autentificare reușită. Te redirecționăm..."); 

});


test("TC2 - autentificare fara email introdus", async () => {
  // Precondiții: pagina de login e deschisă (în beforeEach)

  await driver.findElement(By.id("passwordField")).sendKeys("Parola123");
  await driver.findElement(By.id("submitBtn")).click();

  const mesaj = await driver.findElement(By.id("message"));
  await driver.wait(until.elementIsVisible(mesaj), 5000);
  expect(await mesaj.getText()).toBe("Adresa de email este obligatorie.");
  expect(await mesaj.getAttribute("class")).toContain("error");
});