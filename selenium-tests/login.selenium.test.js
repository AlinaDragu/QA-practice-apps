const path = require("path");
const { pathToFileURL } = require("url");
const { Builder, By, until, Key } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const { addUncaughtExceptionCaptureCallback } = require("process");

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
  // Cu HEADLESS=1 în fața comenzii, Brave rulează ascuns, fără fereastră pe ecran.
  if (process.env.HEADLESS) optiuni.addArguments("--headless=new");
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


test("TC3 - autentificare cu parola gresita" ,async () => {
  // Precondiții: pagina de login e deschisă (în beforeEach)

  // Pasi
  await driver.findElement(By.id("emailField")).sendKeys("client@meridian.ro");
  await driver.findElement(By.id("passwordField")).sendKeys("Parola999");
  await driver.findElement(By.id("submitBtn")).click();

  // Rezultat asteptat
  const mesajp = await driver.findElement(By.id("message"));
  await driver.wait(until.elementIsVisible(mesajp), 5000);
  expect(await mesajp.getText()).toBe("Parola introdusă este greșită.");
  expect(await mesajp.getAttribute("class")).toContain("error");

});


test("TC4 - Link-ul „Ai uitat parola?” duce la pagina de resetare a parolei " , async () => {
  //preconditii: pagina de login e deschisa (in beforeEach)

  //  pasi
  await driver.findElement(By.id("forgotLink")).click();

  // rezultat asteptat
  const url = await driver.getCurrentUrl();
  expect(url).not.toBe(LOGIN_URL);
});


test("TC5 - Butonul „Autentificare” se dezactivează în timpul verificării" , async () => {
  // preconditii: pagina de login e deschisa (in beforeEach)

  //pasi
  await driver.findElement(By.id("emailField")).sendKeys("client@meridian.ro");
  await driver.findElement(By.id("passwordField")).sendKeys("Parola123");
  const buton = await driver.findElement(By.id("submitBtn"));   
  await buton.click();                                           

  //rezultat asteptat
  const enabled = await buton.isEnabled();
  
  expect(await buton.getText()).toBe("Se verifică...");
  expect(enabled).toBe(false);

});


test("TC6 - Autentificarea e refuzată când emailul conține caractere de SQL injection " , async () => {
  //preconditii: pagina de login e deschisa (in beforeEach)

  //pasi 
  await driver.findElement(By.id("emailField")).sendKeys("client@meridian.ro'--");
  await driver.findElement(By.id("passwordField")).sendKeys("abc123");
  await driver.findElement(By.id("submitBtn")).click();

  //rezultat asteptat
  const mesaja = await driver.findElement(By.id("message"));
  await driver.wait(until.elementIsVisible(mesaja), 5000);
  expect(await mesaja.getText()).toBe("Cont inexistent.");
  expect(await mesaja.getAttribute("class")).toContain("error");

});

test("TC7 - Tasta Tab mută cursorul din câmpul de email în câmpul de parolă", async () => {
  //perconditii: pagina de login e deshisa (in beforeEach)
  
  //pasi 
  await driver.findElement(By.id("emailField")).click(); 
  await driver.findElement(By.id("emailField")).sendKeys(Key.TAB); 
  
  //rezultat asteptat
  const activ = await driver.switchTo().activeElement();
  expect(await activ.getAttribute("id")).toBe("passwordField");   
  

});