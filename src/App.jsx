import React, { useEffect, useMemo, useState } from "react";

const CATEGORIES = ["casa", "personal", "ocio", "comida", "eventuales", "lolo"];

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

const formatARS = (n) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));

const todayISO = () => new Date().toISOString().slice(0, 10);

function downloadFile(filename, content, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [items, setItems] = useState([]);
  const [savedMonths, setSavedMonths] = useState({}); // { "Enero 2026": [...] }

  // formulario
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [cat, setCat] = useState("comida");
  const [date, setDate] = useState(todayISO());

  // filtros
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());

  // cargar
  useEffect(() => {
    const raw = localStorage.getItem("gastos_items_v1");
    const rawMonths = localStorage.getItem("gastos_months_v1");
    if (raw) setItems(JSON.parse(raw));
    if (rawMonths) setSavedMonths(JSON.parse(rawMonths));
  }, []);

  // guardar
  useEffect(() => {
    localStorage.setItem("gastos_items_v1", JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem("gastos_months_v1", JSON.stringify(savedMonths));
  }, [savedMonths]);

  const filtered = useMemo(() => {
    const f = new Date(from + "T00:00:00");
    const t = new Date(to + "T23:59:59");
    return items
      .filter((it) => {
        const d = new Date(it.date + "T12:00:00");
        return d >= f && d <= t;
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [items, from, to]);

  const total = useMemo(
    () => filtered.reduce((acc, it) => acc + Number(it.amount || 0), 0),
    [filtered]
  );

  const totalsByCat = useMemo(() => {
    const map = {};
    for (const c of CATEGORIES) map[c] = 0;
    for (const it of filtered) map[it.category] += Number(it.amount || 0);
    return map;
  }, [filtered]);

  function addExpense() {
    const val = Number(amount);
    if (!val || val <= 0) return alert("Poné un monto válido 🙂");
    const newItem = {
      id: uid(),
      amount: val,
      desc: desc.trim(),
      category: cat,
      date,
      createdAt: Date.now(),
    };
    setItems((prev) => [newItem, ...prev]);
    setAmount("");
    setDesc("");
    setCat("comida");
    setDate(todayISO());
  }

  function removeExpense(id) {
    if (!confirm("¿Borrar este gasto?")) return;
    setItems((prev) => prev.filter((x) => x.id !== id));
  }

  function exportJSON() {
    const data = {
      exportedAt: new Date().toISOString(),
      items,
    };
    downloadFile("gastos_export.json", JSON.stringify(data, null, 2), "application/json");
  }

  function exportCSV() {
    const header = ["date", "category", "amount", "desc"];
    const rows = items.map((it) => [
      it.date,
      it.category,
      String(it.amount).replace(".", ","),
      (it.desc || "").replaceAll('"', '""'),
    ]);
    const csv =
      header.join(",") +
      "\n" +
      rows.map((r) => `"${r[0]}","${r[1]}","${r[2]}","${r[3]}"`).join("\n");

    downloadFile("gastos_export.csv", csv, "text/csv");
  }

  function saveMonthSnapshot() {
    const name = prompt("Nombre del mes (ej: Enero 2026):");
    if (!name) return;
    setSavedMonths((prev) => ({
      ...prev,
      [name]: items,
    }));
    alert(`Guardado: ${name} ✅`);
  }

  function loadMonthSnapshot() {
    const keys = Object.keys(savedMonths);
    if (keys.length === 0) return alert("No tenés meses guardados todavía.");
    const name = prompt("¿Qué mes querés cargar?\n\n" + keys.join("\n"));
    if (!name || !savedMonths[name]) return alert("Mes inválido.");
    if (!confirm(`Esto va a reemplazar tus gastos actuales por "${name}". ¿Seguro?`)) return;
    setItems(savedMonths[name]);
  }

  function clearAll() {
    if (!confirm("¿Borrar TODOS los gastos?")) return;
    setItems([]);
  }

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <div className="logo">💙</div>
          <div>
            <h1>CONTROL DE GASTOS</h1>
            <p>simple, rápido y pensado para celular</p>
          </div>
        </div>
      </header>

      <main className="grid">
        <section className="card">
          <h2>➕ Ingresar gasto</h2>

          <div className="form">
            <label>
              Monto
              <input
                type="number"
                inputMode="numeric"
                placeholder="Ej: 1500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>

            <label>
              Descripción
              <input
                type="text"
                placeholder="Ej: supermercado"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
            </label>

            <div className="row2">
              <label>
                Categoría
                <select value={cat} onChange={(e) => setCat(e.target.value)}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c.toUpperCase()}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Fecha
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </label>
            </div>

            <button className="btn primary" onClick={addExpense}>
              Guardar gasto
            </button>
          </div>

          <div className="actions">
            <button className="btn" onClick={exportCSV}>Exportar CSV</button>
          </div>

          <div className="actions">
            <button className="btn" onClick={saveMonthSnapshot}>Guardar mes</button>
            <button className="btn" onClick={loadMonthSnapshot}>Cargar mes</button>
          </div>

          <button className="btn danger" onClick={clearAll}>
            Borrar todo
          </button>
        </section>

        <section className="card">
          <h2>📅 Resumen</h2>

          <div className="row2">
            <label>
              Desde
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label>
              Hasta
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
          </div>

          <div className="summary">
            <div className="big">
              Total: <span>{formatARS(total)}</span>
            </div>

            <div className="cats">
              {CATEGORIES.map((c) => (
                <div key={c} className="pill">
                  <div className="pillTitle">{c.toUpperCase()}</div>
                  <div className="pillValue">{formatARS(totalsByCat[c])}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="card full">
          <h2>🧾 Gastos</h2>

          {filtered.length === 0 ? (
            <div className="empty">No hay gastos en ese rango 🙂</div>
          ) : (
            <div className="list">
              {filtered.map((it) => (
                <div key={it.id} className="item">
                  <div className="left">
                    <div className="date">{it.date}</div>
                    <div className="desc">{it.desc || "—"}</div>
                    <div className="cat">{it.category.toUpperCase()}</div>
                  </div>

                  <div className="right">
                    <div className="amt">{formatARS(it.amount)}</div>
                    <button className="mini" onClick={() => removeExpense(it.id)}>
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="footerNote">Para jugar en familia (y no discutir 😄)</div>
        </section>
      </main>
    </div>
  );
}
