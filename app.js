document.addEventListener("DOMContentLoaded", () => {

const supabase = window.supabase.createClient(
  "https://zfznefbhgdccrpvlkyso.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpmem5lZmJoZ2RjY3JwdmxreXNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3ODYzMTEsImV4cCI6MjA5MTM2MjMxMX0.1r_EyUu58Xn9cgjpf3vE6k0h7P_mABOnwe_LT2-9Bek"
);

// STATE
let selected = new Set();
let dbMap = {};

const harga = 100000;

const nama = document.getElementById("nama");
const tanggal = document.getElementById("tanggal");
const jamGrid = document.getElementById("jamGrid");
const total = document.getElementById("total");

const today = new Date().toISOString().split('T')[0];
tanggal.value = today;

// LOAD DATA
async function loadData(){
  const { data } = await supabase
    .from("booking")
    .select("*")
    .eq("tanggal", tanggal.value);

  dbMap = {};
  data?.forEach(d => dbMap[d.jam] = d);

  render();
}

// RENDER
function render(){
  jamGrid.innerHTML = "";

  for(let i=7;i<=24;i++){
    let jam = (i<10?'0'+i:i)+":00";
    let item = dbMap[jam];

    let btn = document.createElement("div");

    btn.className = "slot " + (
      item?.status==="paid" ? "red" : "green"
    );

    if(selected.has(jam)) btn.classList.add("selected");

    btn.innerText = jam;

    btn.onclick = () => {
      if(item) return alert("Sudah dibooking");

      if(selected.has(jam)){
        selected.delete(jam);
      }else{
        selected.add(jam);
      }

      updateTotal();
      render();
    }

    jamGrid.appendChild(btn);
  }
}

// TOTAL
function updateTotal(){
  total.innerText = "Rp" + (selected.size * harga).toLocaleString();
}

// POPUP
window.openPopup = function(){
  if(!nama.value || selected.size===0){
    alert("Isi nama & pilih jam");
    return;
  }

  document.getElementById("popupBayar").classList.add("show");
}

window.closePopupBayar = function(){
  document.getElementById("popupBayar").classList.remove("show");
}

// BAYAR
window.prosesBayar = async function(status){

  const payload = Array.from(selected).map(j => ({
    nama: nama.value,
    tanggal: tanggal.value,
    jam: j,
    status
  }));

  const { error } = await supabase.from("booking").insert(payload);

  if(error){
    alert("Gagal: " + error.message);
    return;
  }

  selected.clear();
  updateTotal();

  closePopupBayar();
  loadData();
}

// NAV
window.goPage = function(i){
  document.getElementById("pageBooking").classList.remove("active-page");
  document.getElementById("pageSaya").classList.remove("active-page");

  if(i===0){
    document.getElementById("pageBooking").classList.add("active-page");
  }else{
    document.getElementById("pageSaya").classList.add("active-page");
  }
}

// INIT
tanggal.onchange = loadData;
goPage(0);
loadData();

});