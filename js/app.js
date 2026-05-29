async function gantiSheet() {
  const sheet = document.getElementById("pilihSheet").value;
  const el    = document.getElementById("status-sheet");
  if (sheet === "lokal") { el.innerText = "Menggunakan soal lokal."; return; }
  el.innerText = "⏳ Mencoba mengambil data dari spreadsheet...";
  const data = await fetchSheet(sheet);
  if (data && data.length > 0) {
    el.innerHTML = `✅ Berhasil memuat <b>${data.length}</b> soal dari sheet <b>${sheet}</b>.`;
  } else {
    el.innerHTML = `⚠️ Gagal ambil spreadsheet (belum di-publish?). Pakai data fallback.`;
  }
}

async function fetchSheet(sheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return parseCSV(await res.text());
  } catch(e) { return null; }
}

function parseCSV(teks) {
  return teks.trim().split("\n").slice(1).map(b => {
    const col = b.split(",").map(s => s.replace(/^"|"$/g,"").trim());
    return (col.length >= 2 && col[0]) ? { pertanyaan: col[0], kunci: col[1] } : null;
  }).filter(Boolean);
}

function pilihOpsi(grup, nilai) {
  config[grup] = nilai;
  document.querySelectorAll(`[id^="opsi-${grup}-"]`).forEach(el => el.className = "opsi");
  const el = document.getElementById(`opsi-${grup}-${nilai}`);
  if (grup === "soal")  el.className = "opsi aktif";
  if (grup === "jawab") el.className = "opsi aktif-hijau aktif";
  if (grup === "mode")  el.className = "opsi aktif-ungu aktif";
  if (grup === "mode") {
    document.getElementById("input-putaran").style.display = nilai === "bebas"    ? "block" : "none";
    document.getElementById("info-infinity").style.display = nilai === "infinity" ? "block" : "none";
  }
  if (grup === "jawab") {
    document.getElementById("info-pinyin").style.display = nilai === "pinyin" ? "block" : "none";
  }
}

buildKeyboard();
gantiSheet();
