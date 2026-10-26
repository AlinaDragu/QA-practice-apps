// Meridian Bank API — a small REST API with planted bugs, for API-testing practice
// (Postman, curl, ...). No dependencies, no database: data lives in memory and goes
// back to its starting state on every start (or with POST /api/reset).
//
//   node api/server.js        → http://localhost:3000
//
// The documentation to test against is README.md next to this file.
// Every planted bug is marked with a "BUG N" comment; the key is in BUGS.md.

var http = require("http");
var crypto = require("crypto");

var PORT = Number(process.env.PORT) || 3000;
var TOKEN_TTL_SECONDS = 900;

var db;
var tokens;

function seed() {
  return {
    utilizatori: [
      { id: 1, nume: "Ana Pop", email: "client@meridian.ro", parola: "Parola123" },
      { id: 2, nume: "Ion Ionescu", email: "alt.client@meridian.ro", parola: "Parola456" }
    ],
    conturi: [
      { id: 101, userId: 1, tip: "curent", iban: "RO55MERI0000000000000101", valuta: "RON", sold: 2500 },
      { id: 102, userId: 1, tip: "economii", iban: "RO28MERI0000000000000102", valuta: "RON", sold: 10000 },
      { id: 201, userId: 2, tip: "curent", iban: "RO71MERI0000000000000201", valuta: "RON", sold: 1800 }
    ],
    tranzactii: [
      { id: "T-1001", contId: 101, data: "2026-10-01", descriere: "Salariu octombrie SC ALFA SRL", suma: 4200, tip: "credit" },
      { id: "T-1002", contId: 101, data: "2026-10-03", descriere: "ENEL ENERGIE factura 09/2026", suma: -318.45, tip: "debit" },
      { id: "T-1003", contId: 101, data: "2026-10-07", descriere: "KAUFLAND BUCURESTI 042", suma: -247.9, tip: "debit" },
      { id: "T-1004", contId: 101, data: "2026-10-12", descriere: "Retragere numerar ATM MERIDIAN", suma: -400, tip: "debit" },
      { id: "T-1005", contId: 101, data: "2026-10-18", descriere: "Transfer de la Pop Maria", suma: 150, tip: "credit" },
      { id: "T-1006", contId: 101, data: "2026-10-22", descriere: "EMAG.RO comanda 90412", suma: -1249, tip: "debit" },
      { id: "T-1007", contId: 102, data: "2026-10-01", descriere: "Depunere economii", suma: 1000, tip: "credit" },
      { id: "T-1008", contId: 102, data: "2026-10-15", descriere: "Dobândă cont economii", suma: 12.5, tip: "credit" },
      { id: "T-1009", contId: 102, data: "2026-10-20", descriere: "Retragere în contul curent", suma: -500, tip: "debit" },
      { id: "T-1010", contId: 201, data: "2026-10-02", descriere: "Salariu octombrie SC BETA SRL", suma: 3900, tip: "credit" },
      { id: "T-1011", contId: 201, data: "2026-10-09", descriere: "Chirie octombrie", suma: -1500, tip: "debit" },
      { id: "T-1012", contId: 201, data: "2026-10-21", descriere: "MEGA IMAGE 0217", suma: -96.4, tip: "debit" }
    ],
    beneficiari: [
      { id: 1, userId: 1, nume: "Maria Pop", iban: "RO31BTRL0123456789012345", alias: "Mama" },
      { id: 2, userId: 1, nume: "Popescu Ion", iban: "RO95RNCB0090000123456789", alias: "Chirie" },
      { id: 3, userId: 2, nume: "Elena Ionescu", iban: "RO96INGB0001000000123456", alias: "Soția" }
    ],
    transferuri: [],
    urmTransfer: 5001,
    urmTranzactie: 1013,
    urmBeneficiar: 4
  };
}

function reset() {
  db = seed();
  tokens = {};
}

// ---------- helpers ----------

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body, null, 2));
}

function round2(x) {
  return Math.round(x * 100) / 100;
}

function userById(id) {
  return db.utilizatori.filter(function (u) { return u.id === id; })[0];
}

function contById(id) {
  return db.conturi.filter(function (c) { return c.id === id; })[0];
}

function publicCont(c) {
  return { id: c.id, tip: c.tip, iban: c.iban, valuta: c.valuta, sold: c.sold, titular: userById(c.userId).nume };
}

function publicBeneficiar(b) {
  return { id: b.id, nume: b.nume, iban: b.iban, alias: b.alias };
}

function publicTransfer(t) {
  return {
    id: t.id, contSursa: t.contSursa, ibanDestinatie: t.ibanDestinatie, suma: t.suma,
    descriere: t.descriere, stare: t.stare, data: t.data, soldNou: t.soldNou
  };
}

function normalizeIban(iban) {
  return typeof iban === "string" ? iban.replace(/\s+/g, "").toUpperCase() : "";
}

// Romanian IBAN: RO + 2 check digits + 4-letter bank code + 16 characters, MOD-97 == 1
function ibanValid(iban) {
  var s = normalizeIban(iban);
  if (!/^RO\d{2}[A-Z]{4}[A-Z0-9]{16}$/.test(s)) return false;
  var digits = (s.slice(4) + s.slice(0, 4)).replace(/[A-Z]/g, function (ch) {
    return String(ch.charCodeAt(0) - 55);
  });
  var rest = 0;
  for (var i = 0; i < digits.length; i++) rest = (rest * 10 + Number(digits[i])) % 97;
  return rest === 1;
}

function requireUser(ctx) {
  var header = ctx.req.headers["authorization"] || "";
  var m = /^Bearer\s+(\S+)$/i.exec(header);
  var sesiune = m && tokens[m[1]];
  if (!sesiune) {
    send(ctx.res, 401, { eroare: "Neautentificat. Trimite un token valid în headerul Authorization." });
    return null;
  }
  if (Date.now() > sesiune.expira) {
    delete tokens[m[1]];
    send(ctx.res, 401, { eroare: "Sesiunea a expirat. Autentifică-te din nou." });
    return null;
  }
  return { user: userById(sesiune.userId), token: m[1] };
}

// ---------- handlers ----------

function info(ctx) {
  send(ctx.res, 200, {
    nume: "Meridian Bank API",
    versiune: "1.0",
    documentatie: "api/README.md",
    exemplu: "GET /api/health"
  });
}

function health(ctx) {
  send(ctx.res, 200, { stare: "ok" });
}

function resetData(ctx) {
  reset();
  send(ctx.res, 200, { mesaj: "Datele au fost resetate la starea inițială." });
}

function login(ctx) {
  var body = ctx.body;
  var email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  var parola = typeof body.parola === "string" ? body.parola : "";
  if (!email || !parola) return send(ctx.res, 400, { eroare: "Emailul și parola sunt obligatorii." });

  var u = db.utilizatori.filter(function (x) { return x.email === email; })[0];
  // BUG 1: an unknown email gets its own status code and message (account enumeration)
  if (!u) return send(ctx.res, 404, { eroare: "Nu există niciun client cu acest email." });
  // BUG 3: no failed-attempt counter, so the 5-attempt lockout (423) never happens
  if (u.parola !== parola) return send(ctx.res, 401, { eroare: "Email sau parolă greșită." });

  var token = crypto.randomBytes(16).toString("hex");
  tokens[token] = { userId: u.id, expira: Date.now() + TOKEN_TTL_SECONDS * 1000 };
  // BUG 2: the whole user record goes into the response, password included
  send(ctx.res, 200, { token: token, tip: "Bearer", expiraIn: TOKEN_TTL_SECONDS, utilizator: u });
}

function logout(ctx) {
  var s = requireUser(ctx);
  if (!s) return;
  // BUG 4: the token is never removed from the session store, so it keeps working
  send(ctx.res, 200, { mesaj: "Te-ai delogat." });
}

function listaConturi(ctx) {
  var s = requireUser(ctx);
  if (!s) return;
  var ale = db.conturi.filter(function (c) { return c.userId === s.user.id; });
  send(ctx.res, 200, { conturi: ale.map(publicCont) });
}

function unCont(ctx) {
  var s = requireUser(ctx);
  if (!s) return;
  var c = contById(Number(ctx.params[0]));
  if (!c) return send(ctx.res, 404, { eroare: "Cont inexistent." });
  // BUG 5: no ownership check (c.userId !== s.user.id → 403) — any client can read any account
  send(ctx.res, 200, publicCont(c));
}

function tranzactiiCont(ctx) {
  // BUG 6: this route never calls requireUser — it answers without a token, for any account
  var c = contById(Number(ctx.params[0]));
  if (!c) return send(ctx.res, 404, { eroare: "Cont inexistent." });

  var tip = ctx.query.get("tip");
  if (tip !== null && tip !== "debit" && tip !== "credit") {
    return send(ctx.res, 400, { eroare: "Parametrul tip poate fi doar debit sau credit." });
  }
  var lista = db.tranzactii
    .filter(function (t) { return t.contId === c.id; })
    .sort(function (a, b) { return a.data < b.data ? 1 : a.data > b.data ? -1 : (a.id < b.id ? 1 : -1); });
  // BUG 7: the tip filter is validated above but never applied to the list
  var raspuns = {
    contId: c.id,
    numar: lista.length,
    tranzactii: lista.map(function (t) {
      return { id: t.id, data: t.data, descriere: t.descriere, suma: t.suma, tip: t.tip };
    })
  };
  // BUG 8: the savings account's history takes ~2.5 s to answer
  if (c.tip === "economii") {
    setTimeout(function () { send(ctx.res, 200, raspuns); }, 2500);
  } else {
    send(ctx.res, 200, raspuns);
  }
}

function adaugaTranzactie(contId, descriere, suma) {
  db.tranzactii.push({
    id: "T-" + db.urmTranzactie++,
    contId: contId,
    data: new Date().toISOString().slice(0, 10),
    descriere: descriere,
    suma: suma,
    tip: suma < 0 ? "debit" : "credit"
  });
}

function creeazaTransfer(ctx) {
  var s = requireUser(ctx);
  if (!s) return;
  var body = ctx.body;
  // BUG 12: the Idempotency-Key header is read but never looked up — a resend makes a second transfer
  var cheie = ctx.req.headers["idempotency-key"];

  if (body.contSursa === undefined || body.contSursa === null || body.contSursa === "") {
    return send(ctx.res, 400, { eroare: "Câmpul contSursa este obligatoriu." });
  }
  var cont = contById(Number(body.contSursa));
  if (!cont) return send(ctx.res, 404, { eroare: "Contul sursă nu există." });
  if (cont.userId !== s.user.id) return send(ctx.res, 403, { eroare: "Nu ai acces la acest cont." });

  if (!ibanValid(body.ibanDestinatie)) return send(ctx.res, 400, { eroare: "IBAN destinatar invalid." });
  var iban = normalizeIban(body.ibanDestinatie);
  if (iban === cont.iban) {
    return send(ctx.res, 400, { eroare: "Contul sursă și cel destinatar sunt identice." });
  }

  var suma = body.suma;
  if (suma === undefined || suma === null || suma === "") {
    return send(ctx.res, 400, { eroare: "Câmpul suma este obligatoriu." });
  }
  // BUG 11: no type check — text like "abc" slips through the comparison below (NaN) and
  //         corrupts both balances; a numeric string like "100" is concatenated on the credit side
  // BUG 9: no check that suma > 0 — zero and negative amounts are accepted
  // BUG 10: >= instead of > — a transfer of exactly the full balance is refused
  if (suma >= cont.sold) return send(ctx.res, 400, { eroare: "Fonduri insuficiente." });

  cont.sold = round2(cont.sold - suma);
  var descriere = typeof body.descriere === "string" ? body.descriere : "";
  adaugaTranzactie(cont.id, "Transfer către " + iban + (descriere ? " - " + descriere : ""), -suma);

  var dest = db.conturi.filter(function (c) { return c.iban === iban; })[0];
  if (dest) {
    dest.sold = round2(dest.sold + suma);
    adaugaTranzactie(dest.id, "Transfer de la " + cont.iban + (descriere ? " - " + descriere : ""), suma);
  }

  var t = {
    id: db.urmTransfer++, userId: s.user.id, cheie: cheie,
    contSursa: cont.id, ibanDestinatie: iban, suma: suma, descriere: descriere,
    stare: "efectuat", data: new Date().toISOString(), soldNou: cont.sold
  };
  db.transferuri.push(t);
  send(ctx.res, 201, publicTransfer(t));
}

function unTransfer(ctx) {
  var s = requireUser(ctx);
  if (!s) return;
  var id = Number(ctx.params[0]);
  var t = db.transferuri.filter(function (x) { return x.id === id && x.userId === s.user.id; })[0];
  if (!t) return send(ctx.res, 404, { eroare: "Transfer inexistent." });
  send(ctx.res, 200, publicTransfer(t));
}

function beneficiariiMei(userId) {
  return db.beneficiari.filter(function (b) { return b.userId === userId; });
}

function listaBeneficiari(ctx) {
  var s = requireUser(ctx);
  if (!s) return;
  send(ctx.res, 200, { beneficiari: beneficiariiMei(s.user.id).map(publicBeneficiar) });
}

function adaugaBeneficiar(ctx) {
  var s = requireUser(ctx);
  if (!s) return;
  var body = ctx.body;
  var nume = typeof body.nume === "string" ? body.nume.trim() : "";
  if (!nume) return send(ctx.res, 400, { eroare: "Câmpul nume este obligatoriu." });

  var iban = typeof body.iban === "string" ? body.iban.replace(/\s+/g, "") : "";
  // BUG 15: only the "RO" prefix is checked — length, characters and check digits are not
  if (iban.indexOf("RO") !== 0) return send(ctx.res, 400, { eroare: "IBAN invalid." });

  var exista = beneficiariiMei(s.user.id).some(function (b) { return b.iban === iban; });
  if (exista) return send(ctx.res, 409, { eroare: "Ai deja un beneficiar cu acest IBAN." });

  var b = {
    id: db.urmBeneficiar++, userId: s.user.id, nume: nume, iban: iban,
    alias: typeof body.alias === "string" ? body.alias.trim() : ""
  };
  db.beneficiari.push(b);
  // BUG 14: answers 200 instead of 201 Created
  send(ctx.res, 200, publicBeneficiar(b));
}

function modificaBeneficiar(ctx) {
  var s = requireUser(ctx);
  if (!s) return;
  var id = Number(ctx.params[0]);
  var b = beneficiariiMei(s.user.id).filter(function (x) { return x.id === id; })[0];
  if (!b) return send(ctx.res, 404, { eroare: "Beneficiar inexistent." });

  var body = ctx.body;
  if (body.iban !== undefined && String(body.iban).indexOf("RO") !== 0) {
    return send(ctx.res, 400, { eroare: "IBAN invalid." });
  }
  // BUG 16: the record is rebuilt from the request body alone — fields not sent are lost
  var nou = { id: b.id, userId: b.userId };
  ["nume", "iban", "alias"].forEach(function (k) {
    if (body[k] !== undefined) nou[k] = body[k];
  });
  db.beneficiari[db.beneficiari.indexOf(b)] = nou;
  send(ctx.res, 200, publicBeneficiar(nou));
}

function stergeBeneficiar(ctx) {
  var s = requireUser(ctx);
  if (!s) return;
  var id = Number(ctx.params[0]);
  var b = beneficiariiMei(s.user.id).filter(function (x) { return x.id === id; })[0];
  if (b) db.beneficiari.splice(db.beneficiari.indexOf(b), 1);
  // BUG 17: answers 200 even when nothing matched (unknown id, or another client's beneficiary)
  send(ctx.res, 200, { mesaj: "Beneficiar șters." });
}

// ---------- routing ----------

var routes = [
  ["GET", /^\/$/, info],
  ["GET", /^\/api\/health$/, health],
  ["POST", /^\/api\/reset$/, resetData],
  ["POST", /^\/api\/login$/, login],
  ["POST", /^\/api\/logout$/, logout],
  ["GET", /^\/api\/conturi$/, listaConturi],
  ["GET", /^\/api\/conturi\/(\d+)$/, unCont],
  ["GET", /^\/api\/conturi\/(\d+)\/tranzactii$/, tranzactiiCont],
  ["POST", /^\/api\/transferuri$/, creeazaTransfer],
  ["GET", /^\/api\/transferuri\/(\d+)$/, unTransfer],
  ["GET", /^\/api\/beneficiari$/, listaBeneficiari],
  ["POST", /^\/api\/beneficiari$/, adaugaBeneficiar],
  ["PATCH", /^\/api\/beneficiari\/(\d+)$/, modificaBeneficiar],
  ["DELETE", /^\/api\/beneficiari\/(\d+)$/, stergeBeneficiar]
];

function handle(req, res) {
  var start = Date.now();
  res.on("finish", function () {
    var ora = new Date().toTimeString().slice(0, 8);
    console.log(ora + "  " + req.method + " " + req.url + "  →  " + res.statusCode + "  (" + (Date.now() - start) + " ms)");
  });

  var url = new URL(req.url, "http://localhost");
  var path = url.pathname.replace(/\/+$/, "") || "/";

  var chunks = [];
  req.on("data", function (c) { chunks.push(c); });
  req.on("end", function () {
    var text = Buffer.concat(chunks).toString("utf8");
    var body = {};
    if ((req.method === "POST" || req.method === "PATCH") && text.trim() !== "") {
      try {
        body = JSON.parse(text);
      } catch (e) {
        // BUG 13: malformed JSON → 500 with the raw exception and stack trace (should be 400)
        return send(res, 500, { eroare: "Internal Server Error", detalii: e.message, stack: e.stack });
      }
      if (body === null || typeof body !== "object" || Array.isArray(body)) {
        return send(res, 400, { eroare: "Corpul cererii trebuie să fie un obiect JSON." });
      }
    }

    var metodePermise = [];
    for (var i = 0; i < routes.length; i++) {
      var m = routes[i][1].exec(path);
      if (!m) continue;
      if (routes[i][0] !== req.method) {
        metodePermise.push(routes[i][0]);
        continue;
      }
      try {
        return routes[i][2]({ req: req, res: res, params: m.slice(1), query: url.searchParams, body: body });
      } catch (e) {
        console.error(e);
        return send(res, 500, { eroare: "Eroare internă a serverului." });
      }
    }
    if (metodePermise.length) {
      res.setHeader("Allow", metodePermise.join(", "));
      return send(res, 405, { eroare: "Metoda " + req.method + " nu este permisă pe " + path + "." });
    }
    send(res, 404, { eroare: "Endpoint inexistent: " + req.method + " " + path });
  });
}

// ---------- start ----------

reset();

// Listen on loopback only (IPv4 + IPv6), so "localhost" works whichever one Postman picks.
var main = http.createServer(handle);
main.on("error", function (e) {
  if (e.code === "EADDRINUSE") {
    console.error("Portul " + PORT + " e deja folosit — probabil serverul rulează deja în alt terminal.");
  } else {
    console.error(e);
  }
  process.exit(1);
});
main.listen(PORT, "127.0.0.1", function () {
  console.log("Meridian Bank API pornit pe http://localhost:" + PORT + "  (Ctrl+C ca să-l oprești)");
});
var v6 = http.createServer(handle);
v6.on("error", function () {});
v6.listen(PORT, "::1");
