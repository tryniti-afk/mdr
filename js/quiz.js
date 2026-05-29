// ================================================================
//  DETEKSI BAHASA OTOMATIS
// ================================================================
function deteksiBahasa(teks) {
  if (/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/.test(teks)) return "zh-CN";
  if (/[\u0600-\u06ff\u0750-\u077f]/.test(teks))               return "ar-SA";
  if (/[\u0900-\u097f]/.test(teks))                            return "hi-IN";
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(teks))               return "ja-JP";
  if (/[\uac00-\ud7af\u1100-\u11ff]/.test(teks))               return "ko-KR";
  if (/[\u0400-\u04ff]/.test(teks))                            return "ru-RU";
  if (/[\u0e00-\u0e7f]/.test(teks))                            return "th-TH";
  return "id-ID";
}

// ================================================================
//  NORMALISASI TEKS (PENTING: / + () TIDAK BOLEH DIHAPUS)
// ================================================================
function normalisasi(teks) {
  return (teks || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s\/\+\(\)]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ================================================================
//  CEK KUNCI JAWABAN
//  Support:
//    merah/darah
//    mati+kompor
//    (mati/matikan)+kompor
// ================================================================
function cekJawaban(jawabanUser, aturanKunci) {
  const user = normalisasi(jawabanUser);
  const aturan = normalisasi(aturanKunci);

  // Handle OR di dalam tanda kurung: (a/b)
  let pola = aturan;

  // Jika ada tanda kurung, ubah menjadi list opsi OR
  // contoh: (mati/matikan)+kompor
  // menjadi: ["mati+kompor", "matikan+kompor"]
  if (pola.includes("(") && pola.includes(")")) {
    const match = pola.match(/\((.*?)\)/);
    if (match) {
      const isiKurung = match[1]; // contoh: mati/matikan
      const opsiOR = isiKurung.split("/").map(x => x.trim()).filter(Boolean);

      // bentuk final dari setiap opsi
      const hasilList = opsiOR.map(op => {
        return pola.replace("(" + isiKurung + ")", op);
      });

      // jika salah satu opsi AND/OR benar -> true
      return hasilList.some(p => cekJawaban(user, p));
    }
  }

  // OR
  if (pola.includes("/")) {
    const opsi = pola.split("/").map(x => x.trim()).filter(Boolean);
    return opsi.some(k => user.includes(k));
  }

  // AND
  if (pola.includes("+")) {
    const wajib = pola.split("+").map(x => x.trim()).filter(Boolean);
    return wajib.every(k => user.includes(k));
  }

  // Default
  return user.includes(pola);
}

// ================================================================
//  SETUP
// ================================================================
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

// ================================================================
//  MULAI KUIS
// ================================================================
async function mulaiKuis() {
  const sheet = document.getElementById("pilihSheet").value;
  if (sheet === "lokal") {
    daftarSoal = [...soalLokal];
  } else {
    const data = await fetchSheet(sheet);
    daftarSoal = (data && data.length > 0) ? data : (dataFallback[sheet] || []);
  }
  if (!daftarSoal.length) { alert("Tidak ada soal!"); return; }

  state = { nomor:0, skor:0, salah:0, streak:0, ulangiSoal:-1, putaran:1,
    maxPutaran: config.mode === "bebas" ? (parseInt(document.getElementById("jmlPutaran").value)||1) : 1 };

  document.getElementById("screen-setup").style.display = "none";
  document.getElementById("screen-kuis").style.display  = "block";
  document.getElementById("label-sheet").innerText = "📋 " + sheet;
  document.getElementById("label-mode").innerText  =
    config.mode === "sekali" ? "1× Sekali" :
    config.mode === "bebas"  ? `🔢 ${state.maxPutaran}× Putaran` : "∞ Terus";

  tampilSoal();
}

// ================================================================
//  TAMPIL SOAL
// ================================================================
function tampilSoal() {
  modeUlangiCallback = null;
  const soalObj = daftarSoal[state.nomor];
  const total   = daftarSoal.length;

  document.getElementById("nomor-soal").innerText =
    `Soal ${state.nomor+1} dari ${total}` +
    (config.mode === "bebas" ? ` | Putaran ${state.putaran}/${state.maxPutaran}` : "");
  document.getElementById("soal").innerText   = (state.ulangiSoal >= 0 ? "🔄 Ulangi: " : "") + soalObj.pertanyaan;
  document.getElementById("hasil").innerText  = "";
  document.getElementById("streak").innerText = state.streak > 1 ? `🔥 Streak: ${state.streak}` : "";
  document.getElementById("progress").style.width = ((state.nomor / total) * 100) + "%";
  updateSkor();

  const btnJawab   = document.getElementById("btnJawab");
  const btnSkip    = document.getElementById("btnSkip");
  const inputJawab = document.getElementById("inputJawab");
  const kbEl       = document.getElementById("keyboard-pinyin");

  inputJawab.style.display = "none";
  kbEl.style.display       = "none";
  btnJawab.style.display   = "inline-block";
  btnSkip.style.display    = "inline-block";
  btnJawab.disabled        = true;
  btnJawab.onclick         = dengarJawaban;
  btnJawab.innerText       = "🎤 Jawab";

  if (config.jawab === "ketik") {
    inputJawab.style.display = "block";
    inputJawab.value = "";
    inputJawab.focus();
    inputJawab.onkeydown = (e) => { if (e.key === "Enter") submitJawaban(); };
    btnJawab.innerText = "✅ Submit";
    btnJawab.onclick   = submitJawaban;
    btnJawab.disabled  = false;
  } else if (config.jawab === "pinyin") {
    kbEl.style.display       = "block";
    btnJawab.style.display   = "none";
    kbReset();
    document.querySelector("#keyboard-pinyin .kb-submit").onclick = submitJawaban;
  } else {
    btnJawab.disabled = config.soal === "suara" ? true : false;
  }

  if (config.soal === "suara") {
    bacakanSoal(soalObj.pertanyaan);
  } else {
    const petunjuk = config.jawab === "suara" ? "Tekan 🎤 lalu bicara." :
                     config.jawab === "pinyin" ? "Ketik jawaban dengan keyboard Pinyin lalu Submit." :
                     "Ketik jawaban dan tekan Enter.";
    document.getElementById("hasil").innerText = petunjuk;
  }
}

function bacakanSoal(teks) {
  const btnJawab = document.getElementById("btnJawab");
  if (config.jawab === "suara") btnJawab.disabled = true;
  document.getElementById("hasil").innerText = "⏳ Membacakan soal...";
  speechSynthesis.cancel();
  const u  = new SpeechSynthesisUtterance(teks);
  u.lang   = deteksiBahasa(teks);
  u.rate   = 0.9;
  speechSynthesis.speak(u);
  u.onend = () => {
    const petunjuk = config.jawab === "suara"  ? "Tekan 🎤 lalu bicara." :
                     config.jawab === "pinyin" ? "Ketik jawaban dengan keyboard Pinyin lalu Submit." :
                     "Ketik jawaban dan tekan Enter.";
    document.getElementById("hasil").innerText = petunjuk;
    if (config.jawab === "suara") btnJawab.disabled = false;
  };
}

function ulangiSoal() {
  if (config.soal === "suara") bacakanSoal(daftarSoal[state.nomor].pertanyaan);
}

// ================================================================
//  SKIP SOAL — dihitung sebagai BENAR
// ================================================================
function skipSoal() {
  speechSynthesis.cancel();

  const soalObj = daftarSoal[state.nomor];
  const full    = soalObj.kunci || "";
  const parts   = full.split("||");
  const aturanKunci = (parts[0] || "").trim();
  const tambahan    = (parts[1] || "").trim();

  state.skor++;
  state.streak++;
  state.ulangiSoal = -1;
  modeUlangiCallback = null;

  document.getElementById("hasil").innerText =
    `⏭ Di-skip! (dihitung benar)\nJawaban: ${aturanKunci}` +
    (tambahan ? `\n📌 Info: ${tambahan}` : "");

  document.getElementById("streak").innerText = state.streak > 1 ? `🔥 Streak: ${state.streak}` : "";
  document.getElementById("btnSkip").style.display  = "none";
  document.getElementById("btnJawab").disabled      = true;
  document.getElementById("btnUlangi").style.display = "none";
  updateSkor();

  setTimeout(() => lanjut(), 1800);
}

// ================================================================
//  JAWAB SUARA (FIX HP: onend + error detail)
// ================================================================
function dengarJawaban() {
  const btnJawab = document.getElementById("btnJawab");
  btnJawab.disabled = true;

  speechSynthesis.cancel();

  document.getElementById("hasil").innerText = "🎙️ Silakan bicara...";

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    document.getElementById("hasil").innerText = "❌ SpeechRecognition tidak tersedia. Gunakan Chrome.";
    btnJawab.disabled = false;
    return;
  }

  const rec = new SR();
  rec.lang  = deteksiBahasa(daftarSoal[state.nomor].pertanyaan);
  rec.interimResults = false;
  rec.maxAlternatives = 1;

  let sudahAdaHasil = false;

  rec.onstart = () => {
    document.getElementById("hasil").innerText = "🎙️ Mendengarkan...";
  };

  rec.onresult = (e) => {
    sudahAdaHasil = true;
    const jawaban = e.results[0][0].transcript.toLowerCase();

    if (modeUlangiCallback) modeUlangiCallback(jawaban);
    else prosesJawaban(jawaban);
  };

  rec.onerror = (e) => {
    document.getElementById("hasil").innerText = "❌ SpeechRecognition Error: " + e.error;
    btnJawab.disabled = false;
  };

  rec.onend = () => {
    btnJawab.disabled = false;

    if (!sudahAdaHasil) {
      document.getElementById("hasil").innerText = "⚠️ Tidak ada suara terdeteksi. Coba bicara lebih dekat.";
    }
  };

  rec.start();
}

// ================================================================
//  SUBMIT KETIK / PINYIN
// ================================================================
function submitJawaban() {
  let jawaban = "";
  if (config.jawab === "pinyin") {
    jawaban = (document.getElementById("kb-display").innerText || "").replace(/\u200b/g,"").trim().toLowerCase();
  } else {
    jawaban = document.getElementById("inputJawab").value.trim().toLowerCase();
  }
  if (!jawaban) return;
  if (modeUlangiCallback) modeUlangiCallback(jawaban);
  else prosesJawaban(jawaban);
}

// ================================================================
//  PROSES JAWABAN (SUPPORT || INFO TAMBAHAN)
// ================================================================
function prosesJawaban(jawaban) {
  const soalObj = daftarSoal[state.nomor];

  // contoh: "merah/darah || warna merah"
  const full = soalObj.kunci || "";
  const parts = full.split("||");

  const aturanKunci = (parts[0] || "").trim();
  const tambahan    = (parts[1] || "").trim();

  const benar = cekJawaban(jawaban, aturanKunci);

  if (benar) {
    state.skor++;
    state.streak++;
    state.ulangiSoal = -1;

    document.getElementById("hasil").innerText =
      `✅ Benar! "${jawaban}"` +
      (tambahan ? `\n📌 Info: ${tambahan}` : "");

    document.getElementById("streak").innerText = state.streak > 1 ? `🔥 Streak: ${state.streak}` : "";
    updateSkor();
    setTimeout(() => lanjut(), 1800);

  } else {
    state.salah++;
    state.streak = 0;
    document.getElementById("streak").innerText = "";

    document.getElementById("hasil").innerText =
      `❌ Salah! Kamu: "${jawaban}"\nJawaban: ${aturanKunci}` +
      (tambahan ? `\n📌 Info: ${tambahan}` : "");

    updateSkor();

    if (config.mode === "infinity") {
      state.ulangiSoal = state.nomor;
      document.getElementById("btnUlangi").style.display = "inline-block";
      setTimeout(() => {
        document.getElementById("hasil").innerText += "\n\n🔄 Jawab ulang soal ini dulu...";
        setTimeout(() => tampilUlangi(), 1500);
      }, 1500);
    } else {
      setTimeout(() => lanjut(), 2200);
    }
  }
}

// ================================================================
//  MODE INFINITY — ULANGI
// ================================================================
function tampilUlangi() {
  const soalObj = daftarSoal[state.nomor];

  const full = soalObj.kunci || "";
  const parts = full.split("||");
  const aturanKunci = (parts[0] || "").trim();
  const tambahan    = (parts[1] || "").trim();

  document.getElementById("hasil").innerText = "Jawab lagi dengan benar.";

  if (config.jawab === "pinyin") kbReset();
  if (config.jawab === "ketik") {
    document.getElementById("inputJawab").value = "";
    document.getElementById("inputJawab").focus();
  }
  document.getElementById("btnJawab").disabled = false;

  modeUlangiCallback = function(jawaban) {
    const benar = cekJawaban(jawaban, aturanKunci);

    if (benar) {
      document.getElementById("hasil").innerText =
        `✅ Benar! Kembali ke soal 1...` +
        (tambahan ? `\n📌 Info: ${tambahan}` : "");

      state.ulangiSoal = -1;
      modeUlangiCallback = null;
      document.getElementById("btnUlangi").style.display = "none";
      setTimeout(() => { state.nomor = 0; state.streak = 0; tampilSoal(); }, 1800);

    } else {
      document.getElementById("hasil").innerText =
        `❌ Masih salah!\nJawaban: ${aturanKunci}` +
        (tambahan ? `\n📌 Info: ${tambahan}` : "") +
        `\nCoba lagi...`;

      setTimeout(() => tampilUlangi(), 2000);
    }
  };
}

// ================================================================
//  LANJUT / SELESAI
// ================================================================
function lanjut() {
  state.nomor++;
  if (state.nomor >= daftarSoal.length) {
    if (config.mode === "sekali") {
      tampilSelesai();
    } else if (config.mode === "bebas") {
      if (state.putaran < state.maxPutaran) { state.putaran++; state.nomor = 0; tampilSoal(); }
      else tampilSelesai();
    } else {
      state.nomor = 0;
      document.getElementById("hasil").innerText = "🎉 Semua benar! Mulai dari soal 1 lagi...";
      setTimeout(() => tampilSoal(), 2000);
    }
  } else {
    tampilSoal();
  }
}

function tampilSelesai() {
  speechSynthesis.cancel();
  document.getElementById("soal").innerText    = "🏁 Kuis Selesai!";
  document.getElementById("hasil").innerText   = `Skor: ${state.skor} benar, ${state.salah} salah`;
  document.getElementById("progress").style.width = "100%";
  document.getElementById("btnJawab").disabled = true;
  document.getElementById("btnSkip").style.display = "none";
  document.getElementById("keyboard-pinyin").style.display = "none";
  const total = state.skor + state.salah;
  document.getElementById("skor").innerText = `Nilai: ${total ? Math.round((state.skor/total)*100) : 0}%`;
}

function updateSkor() {
  document.getElementById("skor").innerText = `✅ Benar: ${state.skor}  ❌ Salah: ${state.salah}`;
}

function selesai() {
  speechSynthesis.cancel();
  modeUlangiCallback = null;
  document.getElementById("screen-kuis").style.display  = "none";
  document.getElementById("screen-setup").style.display = "block";
  document.getElementById("btnUlangi").style.display    = "none";
}
