var STATUSES = {
  "new": "Nouă",
  paid: "Plătită",
  shipped: "Expediată",
  delivered: "Livrată",
  cancelled: "Anulată"
};
var MONTHS = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];
var DAYS = ["duminică", "luni", "marți", "miercuri", "joi", "vineri", "sâmbătă"];

function el(id) {
  return document.getElementById(id);
}

function esc(value) {
  var div = document.createElement("div");
  div.textContent = value === null || value === undefined ? "" : value;
  return div.innerHTML;
}

function lei(value) {
  return Number(value).toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " lei";
}

function statusLabel(status) {
  return STATUSES[status] || status;
}

function getJson(url) {
  return fetch(url).then(function (res) {
    return res.json().then(function (data) {
      if (!res.ok) throw new Error(data.eroare || "Eroare");
      return data;
    });
  });
}

function postJson(url, body) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {})
  }).then(function (res) {
    return res.json().then(function (data) {
      if (!res.ok) throw new Error(data.eroare || "Eroare");
      return data;
    });
  });
}

// ---------- pages ----------

function loadDashboard() {
  return getJson("/api/dashboard").then(function (d) {
    var date = new Date(d.azi + "T12:00:00");
    el("azi").textContent = "Azi: " + DAYS[date.getDay()] + ", " + date.getDate() + " " + MONTHS[date.getMonth()] + " " + date.getFullYear();
    el("cardComenzi").textContent = d.comenzi;
    el("cardVenituri").textContent = lei(d.venituri);
    el("cardClienti").textContent = d.clientiActivi;
    el("cardStoc").textContent = d.faraStoc;
  });
}

function loadOrders() {
  return getJson("/api/orders").then(function (orders) {
    el("nrComenzi").textContent = orders.length;
    el("randuriComenzi").innerHTML = orders.map(function (o) {
      return "<tr tabindex=\"0\" class=\"link\" data-id=\"" + o.id + "\"><td>" + o.id + "</td><td>" + esc(o.order_date) + "</td><td>" +
        esc(o.first_name + " " + o.last_name) + "</td><td>" + esc(statusLabel(o.status)) + "</td><td class=\"num\">" + lei(o.total) + "</td></tr>";
    }).join("");
  });
}

function showOrder(id) {
  return getJson("/api/orders/" + id).then(function (o) {
    var client = o.first_name ? o.first_name + " " + o.last_name : "—";
    var rows = o.linii.map(function (l) {
      return "<tr><td>" + esc(l.name) + "</td><td class=\"num\">" + l.quantity + "</td><td class=\"num\">" + lei(l.price) +
        "</td><td class=\"num\">" + lei(l.quantity * l.price) + "</td></tr>";
    }).join("");
    var actions = "";
    if (o.status === "new") actions += "<button type=\"button\" class=\"button\" id=\"plateste\">Plătește</button> ";
    if (o.status === "new" || o.status === "paid") actions += "<button type=\"button\" class=\"button secondary\" id=\"anuleaza\">Anulează comanda</button>";

    var box = el("detaliu");
    box.hidden = false;
    box.innerHTML = "<h3>Comanda " + o.id + "</h3><p class=\"muted\">" + esc(client) + " · " + esc(o.order_date) + " · " + esc(statusLabel(o.status)) + "</p>" +
      "<div class=\"scroll\"><table><thead><tr><th>Produs</th><th class=\"num\">Cantitate</th><th class=\"num\">Preț</th><th class=\"num\">Valoare</th></tr></thead><tbody>" + rows + "</tbody></table></div>" +
      "<p class=\"sum\">Transport: " + lei(o.shipping) + "<br><strong>Total: " + lei(o.total) + "</strong></p>" +
      "<div class=\"row\">" + actions + "</div>";

    if (el("plateste")) el("plateste").addEventListener("click", function () { act(o.id, "pay"); });
    if (el("anuleaza")) el("anuleaza").addEventListener("click", function () { act(o.id, "cancel"); });
    box.scrollIntoView({ block: "nearest" });
  });
}

function act(id, action) {
  postJson("/api/orders/" + id + "/" + action).then(function () {
    return Promise.all([loadOrders(), loadDashboard(), showOrder(id)]);
  }).catch(function (e) {
    window.alert(e.message);
  });
}

function loadProducts() {
  return getJson("/api/products").then(function (products) {
    el("randuriProduse").innerHTML = products.map(function (p) {
      return "<tr><td>" + esc(p.name) + "</td><td>" + esc(p.category) + "</td><td class=\"num\">" + lei(p.price) + "</td><td class=\"num\">" + p.stock + "</td></tr>";
    }).join("");
    el("produs").innerHTML = products.map(function (p) {
      return "<option value=\"" + p.id + "\">" + esc(p.name) + " · " + lei(p.price) + "</option>";
    }).join("");
  });
}

function searchCustomers() {
  var box = el("eroareCautare");
  box.hidden = true;
  return getJson("/api/customers?q=" + encodeURIComponent(el("q").value)).then(function (rows) {
    el("randuriClienti").innerHTML = rows.map(function (c) {
      return "<tr><td>" + esc(c.id) + "</td><td>" + esc(c.first_name) + "</td><td>" + esc(c.last_name) + "</td><td>" + esc(c.email) + "</td><td>" + esc(c.city) + "</td></tr>";
    }).join("");
  }).catch(function (e) {
    el("randuriClienti").innerHTML = "";
    box.textContent = e.message;
    box.hidden = false;
  });
}

function loadCustomerOptions() {
  return getJson("/api/customers").then(function (rows) {
    el("client").innerHTML = rows.map(function (c) {
      return "<option value=\"" + c.id + "\">" + esc(c.first_name + " " + c.last_name) + " (" + c.id + ")</option>";
    }).join("");
  });
}

// ---------- events ----------

var tabs = document.querySelectorAll(".tabs button");
Array.prototype.forEach.call(tabs, function (tab) {
  tab.addEventListener("click", function () {
    Array.prototype.forEach.call(tabs, function (other) {
      other.classList.toggle("active", other === tab);
      el(other.getAttribute("data-tab")).hidden = other !== tab;
    });
    var name = tab.getAttribute("data-tab");
    if (name === "panou") loadDashboard();
    if (name === "comenzi") loadOrders();
    if (name === "produse") loadProducts();
    if (name === "clienti") searchCustomers();
  });
});

el("randuriComenzi").addEventListener("click", function (e) {
  var row = e.target.closest("tr");
  if (row) showOrder(row.getAttribute("data-id"));
});

el("randuriComenzi").addEventListener("keydown", function (e) {
  var row = e.target.closest("tr");
  if (row && e.key === "Enter") showOrder(row.getAttribute("data-id"));
});

el("cautare").addEventListener("submit", function (e) {
  e.preventDefault();
  searchCustomers();
});

el("formular").addEventListener("submit", function (e) {
  e.preventDefault();
  var box = el("mesajComanda");
  postJson("/api/orders", {
    customerId: el("client").value,
    productId: el("produs").value,
    quantity: el("cantitate").value
  }).then(function (r) {
    box.className = "ok";
    box.textContent = "Comanda " + r.id + " a fost plasată. Transport: " + lei(r.shipping) + ". Total: " + lei(r.total) + ".";
    box.hidden = false;
    return loadProducts();
  }).catch(function (err) {
    box.className = "error";
    box.textContent = err.message;
    box.hidden = false;
  });
});

loadDashboard();
loadProducts();
loadCustomerOptions();
