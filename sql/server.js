// DemoShop — a small online-shop admin with planted bugs, for SQL and database-testing
// practice. No dependencies: it uses Node's built-in SQLite, in memory. The data goes
// back to its starting state on every start (or with POST /api/reset).
//
//   node sql/server.js        → http://localhost:3100
//
// The rules to test against are in README.md next to this file.
// Every planted bug is marked with a "BUG N" comment; the key is in BUGS.md.

var http = require("http");
var fs = require("fs");
var path = require("path");
var sqlite = require("node:sqlite");

var PORT = Number(process.env.PORT) || 3100;
var TODAY = "2026-10-30"; // pinned, and printed on the page
var MAX_ROWS = 1000;
var LOG_ROWS = 5; // small results are printed in the server log too
var PAY_DELAY_MS = 500;
var SHIPPING_FEE = 15;
var FREE_SHIPPING_FROM = 200;

var SEED = fs.readFileSync(path.join(__dirname, "seed.sql"), "utf8");
var db;

function reset() {
  if (db) db.close();
  db = new sqlite.DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true });

  // The same date functions as MySQL, so queries written that way work here too.
  db.function("NOW", function () { return TODAY + " 10:00:00"; });
  db.function("CURDATE", function () { return TODAY; });
  db.function("YEAR", function (d) { return d === null ? null : Number(String(d).slice(0, 4)); });
  db.function("MONTH", function (d) { return d === null ? null : Number(String(d).slice(5, 7)); });
  db.function("DAY", function (d) { return d === null ? null : Number(String(d).slice(8, 10)); });
  db.function("DATEDIFF", function (a, b) {
    if (a === null || b === null) return null;
    return Math.round((Date.parse(String(a).slice(0, 10)) - Date.parse(String(b).slice(0, 10))) / 86400000);
  });

  db.exec(SEED);
}

// ---------- helpers ----------

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function all(sql) {
  var stmt = db.prepare(sql);
  return stmt.all.apply(stmt, Array.prototype.slice.call(arguments, 1));
}

function one(sql) {
  var stmt = db.prepare(sql);
  return stmt.get.apply(stmt, Array.prototype.slice.call(arguments, 1));
}

function run(sql) {
  var stmt = db.prepare(sql);
  return stmt.run.apply(stmt, Array.prototype.slice.call(arguments, 1));
}

// Splits a script on the semicolons outside quotes, and drops comments.
function splitStatements(text) {
  var parts = [], cur = "", i = 0, quote = null;
  while (i < text.length) {
    var ch = text[i];
    if (quote) {
      cur += ch;
      if (ch === quote) quote = null;
      i++;
    } else if (ch === "'" || ch === '"' || ch === "`") {
      quote = ch;
      cur += ch;
      i++;
    } else if (text.substr(i, 2) === "--") {
      while (i < text.length && text[i] !== "\n") i++;
    } else if (text.substr(i, 2) === "/*") {
      var end = text.indexOf("*/", i + 2);
      i = end === -1 ? text.length : end + 2;
      cur += " ";
    } else if (ch === ";") {
      parts.push(cur);
      cur = "";
      i++;
    } else {
      cur += ch;
      i++;
    }
  }
  parts.push(cur);
  return parts.map(function (s) { return s.trim(); }).filter(Boolean);
}

// ---------- SQL console ----------

function schema(ctx) {
  var tables = all("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY rowid");
  send(ctx.res, 200, {
    tabele: tables.map(function (t) {
      return {
        nume: t.name,
        randuri: one('SELECT COUNT(*) AS n FROM "' + t.name + '"').n,
        coloane: all('PRAGMA table_info("' + t.name + '")').map(function (c) { return c.name; })
      };
    })
  });
}

function refuse(ctx, message) {
  ctx.sqlResult = "REFUZAT: " + message;
  send(ctx.res, 400, { eroare: message });
}

function query(ctx) {
  var text = String(ctx.body.sql || "");
  var statements = splitStatements(text);
  ctx.sql = text.replace(/\s+/g, " ").trim() || "(gol)";
  if (statements.length === 0) return refuse(ctx, "Scrie o interogare.");
  if (statements.length > 1) return refuse(ctx, "Rulează o singură interogare o dată.");
  if (/^(ATTACH|DETACH|VACUUM)\b/i.test(statements[0])) return refuse(ctx, "Comanda asta nu e disponibilă aici.");

  try {
    var stmt = db.prepare(statements[0]);
    var columns = stmt.columns().map(function (c) { return c.name; });
    if (columns.length === 0) {
      var result = stmt.run();
      ctx.sqlResult = result.changes + " rânduri modificate";
      return send(ctx.res, 200, { modificate: result.changes });
    }
    stmt.setReturnArrays(true);
    var rows = stmt.all();
    ctx.sqlResult = rows.length + " rânduri" + (rows.length > 0 && rows.length <= LOG_ROWS ? ": " + JSON.stringify(rows) : "");
    send(ctx.res, 200, { coloane: columns, randuri: rows.slice(0, MAX_ROWS), total: rows.length });
  } catch (e) {
    ctx.sqlResult = "EROARE: " + e.message;
    send(ctx.res, 400, { eroare: e.message });
  }
}

function resetRoute(ctx) {
  reset();
  send(ctx.res, 200, { mesaj: "Baza a revenit la datele de pornire." });
}

// ---------- shop ----------

function dashboard(ctx) {
  send(ctx.res, 200, {
    azi: TODAY,
    // BUG 17: the inner join drops the orders whose customer no longer exists.
    comenzi: one("SELECT COUNT(*) AS n FROM orders o JOIN customers c ON c.id = o.customer_id").n,
    // BUG 18: cancelled orders are counted as revenue.
    venituri: one("SELECT COALESCE(SUM(total), 0) AS s FROM orders WHERE status IN ('paid', 'shipped', 'delivered', 'cancelled')").s,
    // BUG 19: counts every customer, active or not.
    clientiActivi: one("SELECT COUNT(*) AS n FROM customers").n,
    faraStoc: one("SELECT COUNT(*) AS n FROM products WHERE stock <= 0").n
  });
}

function listOrders(ctx) {
  // BUG 17: same inner join as on the dashboard.
  send(ctx.res, 200, all(
    "SELECT o.id, o.order_date, o.status, o.total, c.first_name, c.last_name " +
    "FROM orders o JOIN customers c ON c.id = o.customer_id ORDER BY o.id DESC"
  ));
}

function getOrder(ctx) {
  var order = one(
    "SELECT o.*, c.first_name, c.last_name FROM orders o LEFT JOIN customers c ON c.id = o.customer_id WHERE o.id = ?",
    Number(ctx.params[0])
  );
  if (!order) return send(ctx.res, 404, { eroare: "Comanda nu există." });
  // BUG 20: shows today's product price, not the price paid (order_items.unit_price).
  order.linii = all(
    "SELECT p.name, i.quantity, p.price FROM order_items i JOIN products p ON p.id = i.product_id WHERE i.order_id = ?",
    order.id
  );
  send(ctx.res, 200, order);
}

function createOrder(ctx) {
  var b = ctx.body;
  var quantity = Number(b.quantity);
  var customer = one("SELECT id FROM customers WHERE id = ?", Number(b.customerId));
  var product = one("SELECT id, price, stock FROM products WHERE id = ? AND is_active = 1", Number(b.productId));
  if (!customer) return send(ctx.res, 400, { eroare: "Alege un client." });
  if (!product) return send(ctx.res, 400, { eroare: "Alege un produs." });
  if (!Number.isInteger(quantity) || quantity < 1) return send(ctx.res, 400, { eroare: "Cantitatea trebuie să fie cel puțin 1." });
  // BUG 25: the stock is never checked, so an order can take it below zero.

  var subtotal = product.price * quantity;
  // BUG 23: "<=" also charges shipping on exactly 200 lei (the rule is "sub 200").
  var shipping = subtotal <= FREE_SHIPPING_FROM ? SHIPPING_FEE : 0;
  var result = run(
    "INSERT INTO orders (customer_id, order_date, status, shipping, total) VALUES (?, ?, 'new', ?, ?)",
    customer.id, TODAY, shipping, subtotal + shipping
  );
  run(
    "INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)",
    result.lastInsertRowid, product.id, quantity, product.price
  );
  // BUG 24: takes 1 off the stock, whatever the quantity.
  run("UPDATE products SET stock = stock - 1 WHERE id = ?", product.id);
  send(ctx.res, 201, { id: result.lastInsertRowid, shipping: shipping, total: subtotal + shipping });
}

function payOrder(ctx) {
  var id = Number(ctx.params[0]);
  var order = one("SELECT id, total FROM orders WHERE id = ?", id);
  if (!order) return send(ctx.res, 404, { eroare: "Comanda nu există." });
  // BUG 26: no check that the order is still unpaid, so a double click pays it twice.
  setTimeout(function () {
    run("UPDATE orders SET status = 'paid' WHERE id = ?", id);
    run(
      "INSERT INTO payments (order_id, amount, method, status, paid_at) VALUES (?, ?, 'card', 'success', ?)",
      id, order.total, TODAY + " 10:00:00"
    );
    send(ctx.res, 200, { mesaj: "Plata a fost înregistrată." });
  }, PAY_DELAY_MS);
}

function cancelOrder(ctx) {
  var id = Number(ctx.params[0]);
  if (!one("SELECT id FROM orders WHERE id = ?", id)) return send(ctx.res, 404, { eroare: "Comanda nu există." });
  // BUG 27: only the status changes: the stock isn't given back and the payment isn't refunded.
  run("UPDATE orders SET status = 'cancelled' WHERE id = ?", id);
  send(ctx.res, 200, { mesaj: "Comanda a fost anulată." });
}

function listProducts(ctx) {
  // BUG 21: a negative stock is shown as 0.
  send(ctx.res, 200, all(
    "SELECT id, name, category, price, MAX(stock, 0) AS stock FROM products WHERE is_active = 1 ORDER BY name"
  ));
}

function listCustomers(ctx) {
  var q = ctx.url.searchParams.get("q") || "";
  try {
    // BUG 22: the search text is pasted into the SQL (SQL injection).
    send(ctx.res, 200, all(
      "SELECT id, first_name, last_name, email, city FROM customers WHERE last_name LIKE '%" + q + "%' ORDER BY id"
    ));
  } catch (e) {
    send(ctx.res, 500, { eroare: e.message });
  }
}

// ---------- server ----------

var routes = [
  ["GET", /^\/api\/schema$/, schema],
  ["POST", /^\/api\/query$/, query],
  ["POST", /^\/api\/reset$/, resetRoute],
  ["GET", /^\/api\/dashboard$/, dashboard],
  ["GET", /^\/api\/orders$/, listOrders],
  ["POST", /^\/api\/orders$/, createOrder],
  ["GET", /^\/api\/orders\/(\d+)$/, getOrder],
  ["POST", /^\/api\/orders\/(\d+)\/pay$/, payOrder],
  ["POST", /^\/api\/orders\/(\d+)\/cancel$/, cancelOrder],
  ["GET", /^\/api\/products$/, listProducts],
  ["GET", /^\/api\/customers$/, listCustomers]
];

var pages = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/consola": ["console.html", "text/html; charset=utf-8"],
  "/styles.css": ["styles.css", "text/css; charset=utf-8"],
  "/script.js": ["script.js", "text/javascript; charset=utf-8"],
  "/console.js": ["console.js", "text/javascript; charset=utf-8"]
};

function handle(req, res) {
  var start = Date.now();
  var url = new URL(req.url, "http://localhost");
  var ctx = { req: req, res: res, url: url, body: {} };

  res.on("finish", function () {
    if (url.pathname.indexOf("/api/") !== 0) return;
    if (url.pathname === "/api/schema" || (req.method === "GET" && url.pathname !== "/api/customers")) return;
    var ora = new Date().toTimeString().slice(0, 8);
    var what = ctx.sql ? "SQL  " + ctx.sql + "  →  " + ctx.sqlResult : req.method + " " + req.url + "  →  " + res.statusCode;
    console.log(ora + "  " + what + "  (" + (Date.now() - start) + " ms)");
  });

  if (url.pathname.indexOf("/api/") !== 0) {
    var page = req.method === "GET" && pages[url.pathname];
    if (!page) return send(res, 404, { eroare: "Nu există." });
    res.writeHead(200, { "Content-Type": page[1] });
    return res.end(fs.readFileSync(path.join(__dirname, page[0])));
  }

  // The API is for this app's own pages: other sites can't call it from a browser.
  if (req.method === "POST") {
    var contentType = req.headers["content-type"] || "";
    var origin = req.headers.origin;
    if (contentType.indexOf("application/json") !== 0 || (origin && origin !== "http://localhost:" + PORT && origin !== "http://127.0.0.1:" + PORT)) {
      return send(res, 403, { eroare: "Cerere refuzată." });
    }
  }

  var route = null, match = null;
  for (var i = 0; i < routes.length; i++) {
    match = routes[i][0] === req.method ? url.pathname.match(routes[i][1]) : null;
    if (match) { route = routes[i]; break; }
  }
  if (!route) return send(res, 404, { eroare: "Nu există." });
  ctx.params = match.slice(1);

  var raw = "";
  req.on("data", function (chunk) { raw += chunk; });
  req.on("end", function () {
    try {
      ctx.body = raw ? JSON.parse(raw) : {};
    } catch (e) {
      return send(res, 400, { eroare: "JSON invalid." });
    }
    route[2](ctx);
  });
}

reset();

var main = http.createServer(handle);
main.listen(PORT, "127.0.0.1", function () {
  console.log("DemoShop pornit pe http://localhost:" + PORT + "  (Ctrl+C ca să-l oprești)");
});

// Browsers may resolve "localhost" to the IPv6 address.
var v6 = http.createServer(handle);
v6.on("error", function () {});
v6.listen(PORT, "::1");
