const VOKAL_NADA = {
  a: ["a","ā","á","ǎ","à"],
  e: ["e","ē","é","ě","è"],
  i: ["i","ī","í","ǐ","ì"],
  o: ["o","ō","ó","ǒ","ò"],
  u: ["u","ū","ú","ǔ","ù"],
  ü: ["ü","ǖ","ǘ","ǚ","ǜ"],
};
const KONSONAN = ["b","p","m","f","d","t","n","l","g","k","h","j","q","x","r","z","c","s","w","y"];


let nadaAktif = 0;
let kbTeks    = "";

function kbReset() {
  kbTeks = "";
  nadaAktif = 0;
  document.getElementById("kb-display").innerText = "\u200b";
  document.querySelectorAll(".kb-btn.nada").forEach(b => b.classList.remove("nada-aktif"));
  document.getElementById("nada-0").classList.add("nada-aktif");
}

function pilihNada(n) {
  nadaAktif = n;
  document.querySelectorAll(".kb-btn.nada").forEach(b => b.classList.remove("nada-aktif"));
  document.getElementById(`nada-${n}`).classList.add("nada-aktif");
}

function kbKetik(huruf) {
  kbTeks += huruf;
  document.getElementById("kb-display").innerText = kbTeks;
  nadaAktif = 0;
  document.querySelectorAll(".kb-btn.nada").forEach(b => b.classList.remove("nada-aktif"));
  document.getElementById("nada-0").classList.add("nada-aktif");
}

function kbVokal(v) {
  kbKetik(VOKAL_NADA[v][nadaAktif]);
}

function kbSpasi() { kbKetik(" "); }

function kbHapus() {
  const arr = [...kbTeks]; arr.pop();
  kbTeks = arr.join("");
  document.getElementById("kb-display").innerText = kbTeks || "\u200b";
}

function buildKeyboard() {
  const vokalEl = document.getElementById("kb-vokal");
  Object.keys(VOKAL_NADA).forEach(v => {
    const btn = document.createElement("button");
    btn.className = "kb-btn vokal";
    btn.innerText = v;
    btn.onclick   = () => kbVokal(v);
    vokalEl.appendChild(btn);
  });

  const konEl = document.getElementById("kb-konsonan");
  KONSONAN.forEach(k => {
    const btn = document.createElement("button");
    btn.className = "kb-btn";
    btn.innerText = k;
    btn.onclick   = () => kbKetik(k);
    konEl.appendChild(btn);
  });

  const khEl = document.getElementById("kb-khusus");
  SUKU_AKHIR.forEach(k => {
    const btn = document.createElement("button");
    btn.className = "kb-btn spesial";
    btn.innerText = k;
    btn.onclick   = () => kbKetik(k);
    khEl.appendChild(btn);
  });

  document.getElementById("nada-0").classList.add("nada-aktif");
}

buildKeyboard();
