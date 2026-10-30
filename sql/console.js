function el(id) {
  return document.getElementById(id);
}

function esc(value) {
  var div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

function showError(message) {
  el("eroare").textContent = message;
  el("eroare").hidden = false;
}

function post(url, body) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {})
  }).then(function (res) {
    return res.json();
  });
}

function loadSchema() {
  return fetch("/api/schema").then(function (res) {
    return res.json();
  }).then(function (data) {
    el("schema").innerHTML = data.tabele.map(function (t) {
      return "<div class=\"table-box\"><h3>" + esc(t.nume) + " <span class=\"muted\">(" + t.randuri + ")</span></h3><ul>" +
        t.coloane.map(function (c) { return "<li>" + esc(c) + "</li>"; }).join("") + "</ul></div>";
    }).join("");
  });
}

function showRows(data) {
  var head = "<thead><tr>" + data.coloane.map(function (c) { return "<th>" + esc(c) + "</th>"; }).join("") + "</tr></thead>";
  var body = "<tbody>" + data.randuri.map(function (row) {
    return "<tr>" + row.map(function (cell) {
      return cell === null ? "<td class=\"null\">NULL</td>" : "<td>" + esc(cell) + "</td>";
    }).join("") + "</tr>";
  }).join("") + "</tbody>";
  el("rezultat").innerHTML = head + body;
  el("stare").textContent = data.total === 1 ? "1 rând" : data.total + " rânduri";
  if (data.total > data.randuri.length) el("stare").textContent += " (se văd primele " + data.randuri.length + ")";
}

function runQuery() {
  el("eroare").hidden = true;
  el("stare").textContent = "";
  el("rezultat").innerHTML = "";
  post("/api/query", { sql: el("sql").value }).then(function (data) {
    if (data.eroare) return showError(data.eroare);
    if (data.coloane) return showRows(data);
    el("stare").textContent = data.modificate === 1 ? "1 rând modificat" : data.modificate + " rânduri modificate";
    return loadSchema();
  });
}

el("ruleaza").addEventListener("click", runQuery);

el("sql").addEventListener("keydown", function (e) {
  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    runQuery();
  }
});

el("reset").addEventListener("click", function () {
  if (!window.confirm("Readuci baza la datele de pornire? Tot ce ai schimbat se pierde.")) return;
  post("/api/reset").then(function (data) {
    el("rezultat").innerHTML = "";
    el("eroare").hidden = true;
    el("stare").textContent = data.mesaj;
    return loadSchema();
  });
});

loadSchema();
