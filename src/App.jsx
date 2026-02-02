import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

const CATEGORIES = ["casa", "personal", "ocio", "comida", "eventuales", "lolo"];
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const todayISO = () => new Date().toISOString().slice(0, 10);

const formatARS = (n) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));

function exportResumenXLSX({ from, to, filtered, totalsByCat, total }) {
  const wb = XLSX.utils.book_new();

  // Hoja 1: Resumen
  const resumenData = [
    ["RESUMEN DE GASTOS"],
    ["Desde", from],
    ["Hasta", to],
    [""],
    ["TOTAL", total],
    [""],
    ["TOTALES POR CATEGORÍA"],
    ...Object.entries(totalsByCat).map(([cat, val]) => [cat.toUpperCase(), val]),
  ];
  const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
  XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");

  // Hoja 2: Detalle
  const detalle = filtered
    .slice()
    .sort((a, b) => (a.date > b.date ? 1 : -1))
    .map((it) => ({
      Fecha: it.date,
      Categoria: it.category.toUpperCase(),
      Monto: Number(it.amount || 0),
      Descripcion: it.desc || "",
    }));

  const wsDetalle = XLSX.utils.json_to_sheet(detalle);
  XLSX.utils.book_append_sheet(wb, wsDetalle, "Detalle");

  XLSX.writeFile(wb, `resumen_gastos_${from}_a_${to}.xlsx`);
}

export default function App() {
  const [items, setItems] = useState([]);
  const [savedMonths, setSavedMonths] = useState({});

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
    return items.filter((it) => {
      const d = new Date(it.date + "T12:00:00");
      return d >= f && d <= t;
    });
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

  function saveMonthSnapshot() {
    const name = prompt("Nombre del mes (ej: Enero 2026):");
    if (!name) return;
    setSavedMonths((prev) => ({ ...prev, [name]: items }));
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
    if (!confirm("¿Borrar TODOS los gastos? Esto es irreversible.")) return;
    setItems([]);
  }

  function exportResumen() {
    exportResumenXLSX({
      from,
      to,
      filtered,
      totalsByCat,
      total,
    });
  }

  return (
    <div className="app-wrapper">
      <header className="header">
        <div className="logo">💙</div>
        <div className="title-group">
          <h1>Control de Gastos</h1>
          <p>simple • rápido • pensado para vos</p>
        </div>
      </header>

      <main className="main-content">
        {/* Ingresar gasto */}
        <section className="card">
          <h2>➕ Ingresar gasto</h2>

          <div className="form-grid">
            <label className="form-field">
              Monto
              <input
                type="number"
                placeholder="1500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>

            <label className="form-field">
              Descripción
              <input
                type="text"
                placeholder="supermercado, nafta..."
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
            </label>

            <div className="form-row-double">
              <label className="form-field">
                Categoría
                <select value={cat} onChange={(e) => setCat(e.target.value)}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c.toUpperCase()}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-field">
                Fecha
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </label>
            </div>

            <button className="btn primary full-width" onClick={addExpense}>
              Guardar gasto
            </button>
          </div>
        </section>

        {/* Resumen */}
        <section className="card">
          <h2>📊 Resumen</h2>

          <div className="date-range">
            <label>
              Desde
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label>
              Hasta
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
          </div>

          <div className="total-highlight">
            <span className="total-label">Total</span>
            <span className="total-value">{formatARS(total)}</span>
          </div>

          <div className="categories-grid">
            {CATEGORIES.map((c) => (
              <div
                key={c}
                className={`category-pill ${totalsByCat[c] > 0 ? "active" : ""}`}
              >
                <div className="pill-title">{c.toUpperCase()}</div>
                <div className="pill-value">{formatARS(totalsByCat[c])}</div>
              </div>
            ))}
          </div>

          <button className="btn secondary full-width" onClick={exportResumen}>
            Exportar resumen a Excel (.xlsx)
          </button>
        </section>

        {/* Gastos */}
        <section className="card">
          <h2>🧾 Gastos ({from} → {to})</h2>

          {filtered.length === 0 ? (
            <div className="empty-state">No hay gastos en este rango 💙</div>
          ) : (
            <div className="expenses-list">
              {filtered
                .slice()
                .sort((a, b) => (a.date < b.date ? 1 : -1))
                .map((it) => (
                  <div key={it.id} className="expense-item">
                    <div className="expense-left">
                      <div className="exp-date">{it.date}</div>
                      <div className="exp-desc">{it.desc || "—"}</div>
                      <div className="exp-cat">{it.category.toUpperCase()}</div>
                    </div>
                    <div className="expense-right">
                      <div className="exp-amount">{formatARS(it.amount)}</div>
                      <button className="delete-btn" onClick={() => removeExpense(it.id)}>
                        🗑
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}

          <div className="month-actions">
            <button className="btn primary" onClick={saveMonthSnapshot}>
              GUARDAR MES
            </button>
            <button className="btn secondary" onClick={loadMonthSnapshot}>
              CARGAR MES
            </button>
          </div>

          {/* BOTÓN BORRAR TODO - ABAJO DE TODO */}
          <div className="danger-zone">
            <button className="btn danger large" onClick={clearAll}>
              Borrar TODOS los gastos
            </button>
          </div>

          <div className="footer-love">Hecho con amor para Lore 💙✨</div>
        </section>
      </main>
    </div>
  );
}