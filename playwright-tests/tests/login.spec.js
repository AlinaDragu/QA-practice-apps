const { test, expect } = require("@playwright/test");
const path = require("path");
const { pathToFileURL } = require("url");

// Legătura cu pagina testată: ../../login/index.html, relativ la acest fișier
const LOGIN_URL = pathToFileURL(path.resolve(__dirname, "../../login/index.html")).href;

test("TC1 - autentificare valida", async ({ page }) => {
  // Precondiții: pagina de login e deschisă
  await page.goto(LOGIN_URL);

  // Pași
  await page.locator("#emailField").fill("client@meridian.ro");
  await page.locator("#passwordField").fill("Parola123");
  await page.locator("#loginBtn").click();

  // Rezultat așteptat
  await expect(page.locator("#message")).toHaveText("Autentificare reușită. Te redirecționăm...");
});



test("TC2 - autentificare fara email introdus", async ({ page }) => {
  // Precondiții: pagina de login e deschisă (în beforeEach)
  await page.goto(LOGIN_URL);
  
  // Pasi
  await page.locator("#passwordField").fill("Parola123");
  await page.locator("#loginBtn").click();

  // Rezultat asteptat
  const mesaj = page.locator("#message");
  await expect(mesaj).toHaveText("Adresa de email este obligatorie.");
  await expect(mesaj).toHaveClass(/error/);
});



test("TC3 - autentificare cu parola gresita", async ({ page }) => {
  // Precondiții: pagina de login e deschisă (în beforeEach)
  await page.goto(LOGIN_URL);

  // Pasi
  await page.locator("#emailField").fill("client@meridian.ro");
  await page.locator("#passwordField").fill("Parola999");
  await page.locator("#loginBtn").click();


  // Rezultat asteptat
  const mesajp = page.locator("#message");
  await expect(mesajp).toHaveText("Parola introdusă este greșită.");
  await expect(mesajp).toHaveClass(/error/);
});


test("TC4 - Pagina de login afișează elementele principale", async ({ page }) => {
  // preconditii: pagina de login e deschisa (in beforeEach)
  await page.goto(LOGIN_URL);


  //  pasi: niciunul , doar deschidem pagina
  
  // rezultat asteptat
  const titlu = page.getByRole("heading", { name: "Bine ai revenit" });
  await expect(titlu).toBeVisible();

  const buton = page.getByRole("button", { name: "Autentificare"});
  await expect(buton).toBeVisible();

  const link = page.getByRole("link", { name: "Ai uitat parola?" });
  await expect(link).toBeVisible();

  const contDemo = page.getByText("Cont demo: client@meridian.ro / Parola123");
  await expect(contDemo).toBeVisible();

});



test("TC5 - Autentificare validă cu locatori după etichetă", async ({ page }) => {
  // preconditii: pagina de login e deschisa (in beforeEach)
  await page.goto(LOGIN_URL);

   // Pasi
  await page.getByLabel("Adresă de email").fill("client@meridian.ro");
  await page.getByLabel("Parolă").fill("Parola123");
  await page.getByRole("button", { name: "Autentificare" }).click();

  // Rezultat asteptat
  const mesajj = page.locator("#message");
  await expect(mesajj).toHaveText("Autentificare reușită. Te redirecționăm...");

});