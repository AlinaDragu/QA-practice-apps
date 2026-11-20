const path = require("path");
const fs = require("fs");
const { pathToFileURL } = require("url");
const { Builder, By, until, Key } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const { addUncaughtExceptionCaptureCallback } = require("process");

// Legătura cu pagina testată: ../login/index.html, relativ la acest fișier
const LOGIN_URL = pathToFileURL(path.resolve(__dirname, "../login/index.html")).href;
const BRAVE = "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";

let driver;

beforeAll(async () => {
  const optiuni = new chrome.Options();
    if(fs.existsSync(BRAVE)){
      optiuni.setChromeBinaryPath(BRAVE);
    // Brave se închide brusc dacă driverul îi trimite setarea --test-type=webdriver,
    // așa că îi spunem driverului să n-o mai trimită.
      optiuni.excludeSwitches("test-type");
    }
    
  // Brave rulează ascuns, fără fereastră pe ecran.
  // Ca să-l vezi, pune HEADED=1 în fața comenzii: HEADED=1 npx jest login
  if (!process.env.HEADED) optiuni.addArguments("--headless=new");
  driver = await new Builder().forBrowser("chrome").setChromeOptions(optiuni).build();
});

afterAll(async () => {
  await driver.quit();
});

beforeEach(async () => {
  await driver.get(LOGIN_URL);
});


async function login(email, parola) {
  // cei 3 pași, cu email și parola în loc de texte fixe
  await driver.findElement(By.id("emailField")).sendKeys(email);
  await driver.findElement(By.id("passwordField")).sendKeys(parola);
  await driver.findElement(By.id("loginBtn")).click();

};

test("TC1 - autentificare valida", async () => {
  // Precondiții: pagina de login e deschisă (în beforeEach)

  // Pași
  await login("client@meridian.ro", "Parola123");

  // Rezultat așteptat
  const mesaj = await driver.findElement(By.id("message"));
  await driver.wait(until.elementIsVisible(mesaj), 5000);
  expect(await mesaj.getText()).toBe("Autentificare reușită. Te redirecționăm..."); 

});

// bug1 - mesajele de camp gol sunt inversate
test.failing("TC2 - autentificare fara email introdus", async () => {
  // Precondiții: pagina de login e deschisă (în beforeEach)

  await driver.findElement(By.id("passwordField")).sendKeys("Parola123");
  await driver.findElement(By.id("loginBtn")).click();

  const mesaj = await driver.findElement(By.id("message"));
  await driver.wait(until.elementIsVisible(mesaj), 5000);
  expect(await mesaj.getText()).toBe("Adresa de email este obligatorie.");
  expect(await mesaj.getAttribute("class")).toContain("error");
});

// bug2 - parola gresita scrisa ca si "Cont inexistent"
test.failing("TC3 - autentificare cu parola gresita", async () => {
  // Precondiții: pagina de login e deschisă (în beforeEach)

  // Pasi
  await login("client@meridian.ro", "Parola999");


  // Rezultat asteptat
  const mesajp = await driver.findElement(By.id("message"));
  await driver.wait(until.elementIsVisible(mesajp), 5000);
  expect(await mesajp.getText()).toBe("Parola introdusă este greșită.");
  expect(await mesajp.getAttribute("class")).toContain("error");

});

// bug3 - "Ai uitat parola" - linkul e mort
test.failing("TC4 - Link-ul „Ai uitat parola?” duce la pagina de resetare a parolei", async () => {
  //preconditii: pagina de login e deschisa (in beforeEach)

  //  pasi
  await driver.findElement(By.id("forgotLink")).click();

  // rezultat asteptat
  const url = await driver.getCurrentUrl();
  expect(url).not.toBe(LOGIN_URL);
});

// bug6 - submit dublu neprevenit
test.failing("TC5 - Butonul „Autentificare” se dezactivează în timpul verificării", async () => {
  // preconditii: pagina de login e deschisa (in beforeEach)

  //pasi
  await driver.findElement(By.id("emailField")).sendKeys("client@meridian.ro");
  await driver.findElement(By.id("passwordField")).sendKeys("Parola123");
  const buton = await driver.findElement(By.id("loginBtn"));   
  await buton.click();                                           

  //rezultat asteptat
  const enabled = await buton.isEnabled();
  
  expect(await buton.getText()).toBe("Se verifică...");
  expect(enabled).toBe(false);

});

// bug4 - Ocolirea autentificării prin intermediul unor date de intrare de tip injecție SQL
test.failing("TC6 - Autentificarea e refuzată când emailul conține caractere de SQL injection", async () => {
  //preconditii: pagina de login e deschisa (in beforeEach)

  //pasi 
  await login("client@meridian.ro'--", "abc123");


  //rezultat asteptat
  const mesaja = await driver.findElement(By.id("message"));
  await driver.wait(until.elementIsVisible(mesaja), 5000);
  expect(await mesaja.getText()).toBe("Cont inexistent.");
  expect(await mesaja.getAttribute("class")).toContain("error");

});

// bug5 - Ordinea de navigare cu tastatura este defectuoasă
test.failing("TC7 - Tasta Tab mută cursorul din câmpul de email în câmpul de parolă", async () => {
  //perconditii: pagina de login e deshisa (in beforeEach)
  
  //pasi 
  await driver.findElement(By.id("emailField")).click(); 
  await driver.findElement(By.id("emailField")).sendKeys(Key.TAB); 
  
  //rezultat asteptat
  const activ = await driver.switchTo().activeElement();
  expect(await activ.getAttribute("id")).toBe("passwordField");   
  

});

// bug9 - Labels not associated with inputs
test.failing("TC8 - Click pe eticheta „Adresă de email” mută cursorul în câmpul de email", async () => {
  //preconditii: pagina de login e deschisa (in beforeEach)

  //pasi 
  await driver.findElement(By.xpath("//label[text() ='Adresă de email']")).click();

  //rezultat asteptat
  const act = await driver.switchTo().activeElement();
  expect(await act.getAttribute("id")).toBe("emailField");   
});


test.each([
  // [email, parola, mesajAsteptat]
  ["alt@meridian.ro", "Parola123", "Cont inexistent."]   

])("TC9 - login invalid cu %s / %s", async (email, parola, mesajAsteptat) => {
  //preconditii: pagina de login este deschisa (in beforeEach)
  // pași
  await login(email,parola);

  // rezultat așteptat
  const mesajj = await driver.findElement(By.id("message"));
  await driver.wait(until.elementIsVisible(mesajj), 5000);
  expect(await mesajj.getText()).toBe(mesajAsteptat);
  expect(await mesajj.getAttribute("class")).toContain("error");

});


// bug 1, bug 2, bug 4 – mesaje inversate / parolă greșită ca „Cont inexistent” / SQL injection
test.failing.each([
  // [email, parola, mesajAsteptat]
  ["", "Parola123", "Adresa de email este obligatorie."],    
  ["client@meridian.ro", "Parola999", "Parola introdusă este greșită."],  
  ["client@meridian.ro'--", "abc123", "Cont inexistent."],    

])("TC9 - login invalid cu %s / %s", async (email, parola, mesajAsteptat) => {
  //preconditii: pagina de login este deschisa (in beforeEach)
  // pași
  await login(email,parola);

  // rezultat așteptat
  const mesajj = await driver.findElement(By.id("message"));
  await driver.wait(until.elementIsVisible(mesajj), 5000);
  expect(await mesajj.getText()).toBe(mesajAsteptat);
  expect(await mesajj.getAttribute("class")).toContain("error");

});