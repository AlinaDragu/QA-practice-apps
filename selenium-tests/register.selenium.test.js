const path = require("path");
const { pathToFileURL } = require("url");
const { Builder, By, until, Select } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

// Legătura cu pagina testată: ../register/index.html, relativ la acest fișier
const REGISTER_URL = pathToFileURL(path.resolve(__dirname, "../register/index.html")).href;
const BRAVE = "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";

let driver;

beforeAll(async () => {
  const optiuni = new chrome.Options()
    .setChromeBinaryPath(BRAVE)
    // Brave se închide brusc dacă driverul îi trimite setarea --test-type=webdriver,
    // așa că îi spunem driverului să n-o mai trimită.
    .excludeSwitches("test-type");
  // Brave rulează ascuns, fără fereastră pe ecran.
  // Ca să-l vezi, pune HEADED=1 în fața comenzii: HEADED=1 npx jest register
  if (!process.env.HEADED) optiuni.addArguments("--headless=new");
  driver = await new Builder().forBrowser("chrome").setChromeOptions(optiuni).build();
});

afterAll(async () => {
  await driver.quit();
});

beforeEach(async () => {
  await driver.get(REGISTER_URL);
});

async function completeazaFormularValid() {
  // aici, pașii 1–10 din TC1
  await driver.findElement(By.id("nameField")).sendKeys("Ana Pop");
  await driver.findElement(By.id("emailField")).sendKeys("ana.pop@exemplu.ro");
  await driver.findElement(By.id("email2Field")).sendKeys("ana.pop@exemplu.ro");
  await driver.findElement(By.id("passField")).sendKeys("Parola123");
  await driver.findElement(By.id("pass2Field")).sendKeys("Parola123");
  await driver.findElement(By.id("cnpField")).sendKeys("2900101123456");
  await driver.findElement(By.id("dobField")).sendKeys("01011990");
  await driver.findElement(By.id("phoneField")).sendKeys("0722123456");
  const county = new Select(await driver.findElement(By.id("countyField")));
  await county.selectByVisibleText("Cluj");
};


test("TC1 - creare cont cu date valide", async () => {
  // Precondiții: pagina „Deschide cont curent” e deschisă (în beforeEach)

  // Pași
  await driver.findElement(By.id("nameField")).sendKeys("Ana Pop");
  await driver.findElement(By.id("emailField")).sendKeys("ana.pop@exemplu.ro");
  await driver.findElement(By.id("email2Field")).sendKeys("ana.pop@exemplu.ro");
  await driver.findElement(By.id("passField")).sendKeys("Parola123");
  await driver.findElement(By.id("pass2Field")).sendKeys("Parola123");
  await driver.findElement(By.id("cnpField")).sendKeys("2900101123456");
  await driver.findElement(By.id("dobField")).sendKeys("01011990");
  await driver.findElement(By.id("phoneField")).sendKeys("0722123456");
  const county = new Select(await driver.findElement(By.id("countyField")));
  await county.selectByVisibleText("Cluj");
  await driver.findElement(By.id("terms")).click();
  await driver.findElement(By.id("createBtn")).click();

  // Rezultat așteptat
  const mesaj = await driver.findElement(By.id("message"));
  expect(await mesaj.getText()).toBe("Cont creat pentru ana.pop@exemplu.ro.");
  expect(await mesaj.getAttribute("class")).toContain("success");

});

test("TC2 - bifa de marketing nu e bifată de la început", async () => {
  //preconditii: pagina "Deschide cont curent" e deschisa (in beforeEach)

  //pasi

  // rezultat asteptat
  expect(await driver.findElement(By.id("promo")).isSelected()).toBe(false);
});


test("TC3 - parole diferite",async () => {
  //preconditii: pagina "Deschide cont curent" e deschisa (in beforeEach)

  //pasi
  await driver.findElement(By.id("nameField")).sendKeys("Ana Pop");
  await driver.findElement(By.id("emailField")).sendKeys("ana.pop@exemplu.ro");
  await driver.findElement(By.id("passField")).sendKeys("Parola123");
  await driver.findElement(By.id("pass2Field")).sendKeys("Parola999");
  await driver.findElement(By.id("createBtn")).click();

  //rezultat asteptat
  const mesajp = await driver.findElement(By.id("message"));
  expect(await mesajp.getText()).toBe("Parolele nu coincid.");
  expect(await mesajp.getAttribute("class")).toContain("error");

});

test("TC4 - telefonul se formatează automat", async () => {
  //preconditii: pagina "Deschide cont curent" e deschisa (in beforeEach)

  //pasi
  await driver.findElement(By.id("phoneField")).sendKeys("0722123456");

  //rezultat asteptat
  const phone = await driver.findElement(By.id("phoneField"));
  expect(await phone.getAttribute("value")).toBe("0722 123 456");
});


test("TC5 - telefon cu o cifră în plus", async () => {
  //preconditii: pagina "Deschide cont curent" e deschisa (in beforeEach)

  //pasi 
  await driver.findElement(By.id("phoneField")).sendKeys("07221234567");

  //rezultat asteptat
  const phonep = await driver.findElement(By.id("phoneField"));
  expect(await phonep.getAttribute("value")).toBe("07221234567");
});


test("TC6 - email fara format valid", async () => {
  //preconditii: pagina "deschide cont curent" e deschisa (in beforeEach)

  //pasi 

});