const path = require("path");
const fs = require("fs");
const { pathToFileURL } = require("url");
const { Builder, By, until, Select , Key} = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

// Legătura cu pagina testată: ../register/index.html, relativ la acest fișier
const BOOKING_URL = pathToFileURL(path.resolve(__dirname, "../booking/index.html")).href;
const BRAVE = "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";

let driver;

beforeAll(async () => {
  const optiuni = new chrome.Options();
  // Pe Mac folosim Brave; pe GitHub (Ubuntu) Brave nu există, așa că Selenium găsește singur Chrome.
  if (fs.existsSync(BRAVE)) {
    optiuni.setChromeBinaryPath(BRAVE);
    // Brave se închide brusc dacă driverul îi trimite setarea --test-type=webdriver,
    // așa că îi spunem driverului să n-o mai trimită.
    optiuni.excludeSwitches("test-type");
  }
  // Brave rulează ascuns, fără fereastră pe ecran.
  // Ca să-l vezi, pune HEADED=1 în fața comenzii: HEADED=1 npx jest register
  if (!process.env.HEADED) optiuni.addArguments("--headless=new");
  driver = await new Builder().forBrowser("chrome").setChromeOptions(optiuni).build();
});

afterAll(async () => {
  await driver.quit();
});

beforeEach(async () => {
  await driver.get(BOOKING_URL);
});


test("TC1 - pretul camerei pentru un weekend (vineri + sambata)", async () => {
    // preconditii: pagina e deschisa cu valorile implicite : Standard, 
    // 2 adulți, check-in 18.12.2026 (vineri), check-out 20.12.2026.

    // rezultat asteteptat:
    pret = await driver.findElement(By.id("sRoom")).getText();
    expect(pret).toBe("720,00 RON");
});




test("TC2 - dublu click pe Rezerva creeaza o singura rezervare", async () => {
    // preconditii: pagina e deschisa cu valorile implicite : Standard, 
    // 2 adulți, check-in 18.12.2026 (vineri), check-out 20.12.2026.

    //pasi
    await driver.findElement(By.id("name")).sendKeys("AnaMaria");
    await driver.findElement(By.id("email")).sendKeys("ana.maria12@yahoo.com");
    await driver.findElement(By.id("phone")).sendKeys("0734543756");
    await driver.findElement(By.id("bookBtn")).click();
    await driver.findElement(By.id("bookBtn")).click();

    //rezultat asteptat
    const mesaj = await driver.findElement(By.id("msg"));
    await driver.wait(until.elementTextContains(mesaj, "confirmată"), 5000);
    await driver.sleep(500);
    const rezervari = await driver.findElements(By.css("#bookingList li"));
    expect(rezervari.length).toBe(4);
});


test("TC3 - anularea la exact 2 zile", async () => {
  // preconditii: pagina e deschisa : "azi" e joi 10.12.2026 si 
  // rezervare RZ-1002 (Standard, 12.12–14.12.2026, total 680,00 RON) are check-in-ul peste exact 2 zile

  // pasi 
  
  await driver.findElement(By.css("button[data-id='RZ-1002']")).click();

  // rezultat asteptat
  const mesaj = await driver.findElement(By.id("msg"));
  await driver.wait(until.elementTextContains(mesaj, "Rezervarea RZ-1002 a fost anulată."), 5000);
  const rambursat = await driver.findElement(By.id("refundTotal")).getText();
  expect(rambursat).toBe("680,00 RON");
});