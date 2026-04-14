document.addEventListener("DOMContentLoaded", () => {

const supabase = window.supabase.createClient(
  "https://zfznefbhgdccrpvlkyso.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpmem5lZmJoZ2RjY3JwdmxreXNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3ODYzMTEsImV4cCI6MjA5MTM2MjMxMX0.1r_EyUu58Xn9cgjpf3vE6k0h7P_mABOnwe_LT2-9Bek"
);

// ================= STATE =================
let selected = new Set();
let dbMap = {};
let selectedSlot = null;

const harga = 100000;

const nama = document.getElementById("nama");
const tanggal = document.getElementById("tanggal");
const jamGrid = document.getElementById("jamGrid");
const total = document.getElementById("total");
const myBookingUI = document.getElementById("myBooking");

const today = new Date().toISOString().split('T')[0];
tanggal.value = today;
tanggal.min = today;

// ================= LOAD =================
async function loadData(){

  const { data, error } = await supabase
    .from("booking")
    .select("id,jam,status,tanggal")
    .eq("tanggal", tanggal.value);

  if(error){
    console.error(error);
    return;
  }

  dbMap = {};
  
  data.forEach(d => {
  let jamFix = String(d.jam).padStart(5, "0");

dbMap[jamFix] = d;
dbMap[jamFix.replace(/^0/, '')] = d; // 🔥 tambahan penting
});

  render();
}

// ================= RENDER =================
function render(){

  jamGrid.innerHTML = "";
  let now = new Date().getHours();

  for(let i=7;i<=24;i++){

    let jam = (i<10?'0'+i:i)+":00";

    // 🔥 FIX: ambil item dengan aman
    let item = dbMap[jam] || dbMap[jam.replace(/^0/, '')];

    let isPast = (tanggal.value===today && i<=now);

    let btn = document.createElement("div");
    btn.dataset.jam = jam;

    btn.className = "slot " + (
      item?.status==="paid" ? "red" :
      item?.status==="dp" ? "dp" :
      isPast ? "gray" : "green"
    );

    if(selected.has(jam)){
      btn.classList.add("selected");
    }

    btn.innerText = jam;

    btn.onclick = function(){

      let jam = this.dataset.jam;

      // 🔥 FIX WAJIB (sebelumnya error di sini)
      let item = dbMap[jam] || dbMap[jam.replace(/^0/, '')];

      let jamNum = parseInt(jam);
      let now = new Date().getHours();

      if(tanggal.value===today && jamNum<=now){
        alert("Jam lewat");
        return;
      }

      // 🔴 SLOT TERISI → POPUP NAMA
      if(item && (item.status === "paid" || item.status === "dp")){
        console.log("Slot ditemukan:", item);

        selectedSlot = item;
        document.getElementById("lihatNamaPopup").classList.add("show");
        return;
      }

      // SELECT
      if(selected.has(jam)){
        selected.delete(jam);
        this.classList.remove("selected");
      }else{
        selected.add(jam);
        this.classList.add("selected");
      }

      updateTotal();
    }

    jamGrid.appendChild(btn);
  }

  renderMyBooking();
}

// ================= TOTAL =================
function updateTotal(){
  total.innerText = "Rp" + (selected.size * harga).toLocaleString();
}

// ================= RESET =================
window.clearSelect = function(){
  selected.clear();
  document.querySelectorAll(".selected").forEach(el=>{
    el.classList.remove("selected");
  });
  updateTotal();
}

// ================= POPUP =================
window.openPopup = function(){
  if(!nama.value || selected.size===0){
    alert("Isi nama & pilih jam");
    return;
  }

  document.getElementById("popupTotal").innerText =
    "Total: Rp" + (selected.size * harga).toLocaleString();

  document.getElementById("popupBayar").classList.add("show");
}

window.closePopupBayar = function(){
  document.getElementById("popupBayar").classList.remove("show");
}

// ================= BAYAR =================
window.prosesBayar = async function(status){

  const payload = Array.from(selected).map(j => ({
    nama: nama.value,
    tanggal: tanggal.value,
    jam: j,
    status: status
  }));

  const { error } = await supabase
    .from("booking")
    .insert(payload);

  if(error){
    alert("Gagal booking: " + error.message);
    return;
  }

  selected.clear();
  updateTotal();

  closePopupBayar();
  loadData();
}

// ================= LIHAT NAMA (AMAN) =================
window.cekNamaSlot = async function(){

  let input = document.getElementById("cekNamaSlot").value;

  // 🔥 cegah error kosong
  if(!selectedSlot){
    alert("Slot tidak ditemukan");
    return;
  }

  try{
    const { data, error } = await supabase
      .from("booking")
      .select("nama")
      .eq("jam", selectedSlot.jam)
      .eq("tanggal", tanggal.value)
      .single();

    if(error || !data){
      alert("Data tidak ditemukan");
      return;
    }

    if(input.toLowerCase() !== data.nama.toLowerCase()){
      alert("Nama tidak cocok");
      return;
    }

    alert("Dibooking oleh: " + data.nama);

    closeLihatNama();

  }catch(err){
    console.error(err);
    alert("Terjadi error");
  }
}

// ================= CLOSE POPUP =================
window.closeLihatNama = function(){
  const popup = document.getElementById("lihatNamaPopup");
  if(popup){
    popup.classList.remove("show");
  }
}

// ================= SENSOR =================
function sensorNama(nama){
  if(!nama) return "-";
  return nama[0].toUpperCase() + "****";
}

// ================= RIWAYAT (SUPABASE) =================
async function renderMyBooking(){

  const search = document.getElementById("searchNama")?.value.toLowerCase() || "";
  const filterTgl = document.getElementById("filterTanggal")?.value || "";

  const { data, error } = await supabase
    .from("booking")
    .select("*")
    .order("id", { ascending: false });

  if(error){
    console.error(error);
    return;
  }

  let filtered = data.filter(b => {
    let cocokNama = (b.nama || "").toLowerCase().includes(search);
    let cocokTanggal = filterTgl ? b.tanggal === filterTgl : true;
    return cocokNama && cocokTanggal;
  });

  myBookingUI.innerHTML = filtered.map(b => {

    let btn = "";

    if(b.status === "dp"){
      btn = `<button onclick="lunasiBookingDB('${b.nama}','${b.tanggal}','${b.jam}')" class="text-green-600">Lunasi</button>`;
    }

    return `
    <div class="flex justify-between border-b py-2">
      <div>
        ${sensorNama(b.nama)}<br>
        <span class="text-xs">${b.tanggal}</span><br>
        <span class="text-xs">${b.jam}</span>
      </div>
      ${btn}
    </div>
    `;
  }).join("");
}

// ================= LUNASI =================
window.lunasiBookingDB = async function(nama, tanggal, jam){

  const { error } = await supabase
    .from("booking")
    .update({ status: "paid" })
    .eq("nama", nama)
    .eq("tanggal", tanggal)
    .eq("jam", jam);

  if(error){
    alert("Gagal lunasi");
    return;
  }

  alert("Berhasil dilunasi ✅");

  loadData();
  renderMyBooking();
}

// ================= NAV =================
window.goPage = function(i){

  document.getElementById("pageBooking").classList.remove("active-page");
  document.getElementById("pageSaya").classList.remove("active-page");

  if(i === 0){
    document.getElementById("pageBooking").classList.add("active-page");
  }else{
    document.getElementById("pageSaya").classList.add("active-page");
  }
}

// ================= INIT =================
tanggal.onchange = loadData;

loadData();
renderMyBooking();

document.getElementById("searchNama").addEventListener("input", renderMyBooking);
document.getElementById("filterTanggal").addEventListener("change", renderMyBooking);

// default page
goPage(0);

});
