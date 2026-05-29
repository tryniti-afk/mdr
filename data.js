const SHEET_ID = "1QozIKvWjISQmFK15mvjk9maH3FfDENGhmrIRS5BoHiE";

const dataFallback = {
  Hsk: [
    { pertanyaan: "Ibu kota Indonesia?", kunci: "jakarta" },
    { pertanyaan: "Warna darah?",        kunci: "merah/darah || warna merah" },
    { pertanyaan: "是的 artinya apa?",    kunci: "ya" },
  ],
  Hsk4: [
    { pertanyaan: "Planet terbesar di tata surya?", kunci: "jupiter" },
  ]
};

let soalLokal = [
  { pertanyaan: "Warna darah?", kunci: "merah/darah || warna merah" },
  { pertanyaan: "Cara memisahkan air dan minyak?", kunci: "(mati/matikan)+kompor || sampai api tidak ada" },
  { pertanyaan: "爱情", kunci: "àiqíng || (kecepatan)" }
];

let daftarSoal = [];
let config = { soal: "suara", jawab: "suara", mode: "sekali" };
let state  = { nomor:0, skor:0, salah:0, putaran:1, maxPutaran:1, streak:0, ulangiSoal:-1 };
let modeUlangiCallback = null;
