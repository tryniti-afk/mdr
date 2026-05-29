function showEditor() {
  document.getElementById("screen-setup").style.display  = "none";
  document.getElementById("screen-editor").style.display = "block";
  document.getElementById("pesan-simpan").innerText = "";
  document.getElementById("inputSoal").value = soalLokal.map(s => `${s.pertanyaan} | ${s.kunci}`).join("\n");
}
function showSetup() {
  document.getElementById("screen-editor").style.display = "none";
  document.getElementById("screen-setup").style.display  = "block";
}
function simpanSoalLokal() {
  const baru = document.getElementById("inputSoal").value.trim().split("\n").map(b => {
    const bg = b.split("|");
    return (bg.length >= 2 && bg[0].trim()) ? { pertanyaan: bg[0].trim(), kunci: bg.slice(1).join("|").trim() } : null;
  }).filter(Boolean);

  if (!baru.length) {
    document.getElementById("pesan-simpan").style.color = "red";
    document.getElementById("pesan-simpan").innerText = "⚠️ Format salah. Gunakan: Pertanyaan | jawaban";
    return;
  }
  soalLokal = baru;
  document.getElementById("pesan-simpan").style.color = "green";
  document.getElementById("pesan-simpan").innerText   = `✅ ${baru.length} soal disimpan!`;
}



