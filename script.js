const API_URL =
  "https://script.google.com/macros/s/AKfycby-YlkfI-Z1bwiK0ujaY-ArD0BSgw5BlNVqYFmeB0IGA09DHUFOEDEjBVBmVFesZ3d_KQ/exec";
const $ = (id) => document.getElementById(id);
const rupiah = (n) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);
let products = [],
  counter = 0;

document.addEventListener("DOMContentLoaded", () => {
  openFormBtn.onclick = openAdd;
  closeFormBtn.onclick = closeModal;
  cancelBtn.onclick = closeModal;
  productForm.onsubmit = saveProduct;
  searchInput.oninput = render;
  hargaBeli.oninput = hargaJual.oninput = jumlahTerjual.oninput = updatePreview;
  foto.onchange = previewPhoto;
  photoCloseBtn.onclick = closePhoto;
  photoModal.onclick = (e) => {
    if (e.target === photoModal) closePhoto();
  };
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closePhoto();
      closeModal();
    }
  });
  createFrame();
  loadProducts();
});

function jsonp(params, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const cb = "cb_" + ++counter,
      s = document.createElement("script");
    let done = false;
    const clean = () => {
      delete window[cb];
      s.remove();
      clearTimeout(t);
    };
    const t = setTimeout(() => {
      if (done) return;
      done = true;
      clean();
      reject(Error("API tidak merespons. Periksa deployment Apps Script."));
    }, timeout);
    window[cb] = (r) => {
      if (done) return;
      done = true;
      clean();
      if (!r) reject(Error("Response API kosong."));
      else if (r.success === false) reject(Error(r.message || "API error."));
      else resolve(r);
    };
    s.onerror = () => {
      if (done) return;
      done = true;
      clean();
      reject(Error("Gagal menghubungi Google Apps Script."));
    };
    s.src =
      API_URL +
      "?" +
      new URLSearchParams({ ...params, callback: cb, _: Date.now() });
    document.body.appendChild(s);
  });
}

async function loadProducts() {
  productTableBody.innerHTML = '<tr><td colspan="11">Memuat data...</td></tr>';
  try {
    const r = await jsonp({ action: "list" });
    products = Array.isArray(r.data) ? r.data : [];
    render();
  } catch (e) {
    productTableBody.innerHTML =
      '<tr><td colspan="11">Gagal memuat data: ' +
      esc(e.message) +
      "</td></tr>";
    updateStats();
  }
}

function createFrame() {
  if ($("apiWriteFrame")) return;
  const f = document.createElement("iframe");
  f.name = "apiWriteFrame";
  f.id = "apiWriteFrame";
  f.style.display = "none";
  document.body.appendChild(f);
}
function post(action, payload) {
  return new Promise((resolve, reject) => {
    const f = document.createElement("form");
    f.method = "POST";
    f.action = API_URL;
    f.target = "apiWriteFrame";
    f.style.display = "none";
    Object.entries({ action, ...payload }).forEach(([k, v]) => {
      const i = document.createElement("input");
      i.type = "hidden";
      i.name = k;
      i.value = v ?? "";
      f.appendChild(i);
    });
    document.body.appendChild(f);
    try {
      f.submit();
    } catch (e) {
      f.remove();
      reject(e);
      return;
    }
    setTimeout(() => {
      f.remove();
      resolve();
    }, 1800);
  });
}

function fileId(v) {
  if (!v) return "";
  v = String(v).trim();
  if (/^[A-Za-z0-9_-]{20,}$/.test(v)) return v;
  let m = v.match(/[?&]id=([A-Za-z0-9_-]+)/i);
  if (m) return m[1];
  m = v.match(/\/file\/d\/([A-Za-z0-9_-]+)/i);
  if (m) return m[1];
  m = v.match(/\/d\/([A-Za-z0-9_-]+)/i);
  return m ? m[1] : "";
}
async function driveImage(v, img) {
  if (!v || !img) return;
  if (String(v).startsWith("data:image/")) {
    img.src = v;
    bindPhoto(img);
    return;
  }
  const id = fileId(v);
  if (!id) {
    img.classList.add("no-image");
    img.alt = "Foto tidak tersedia";
    return;
  }
  try {
    const r = await jsonp({ action: "image", id }, 30000);
    if (!r.data || !r.mimeType) throw Error("Data gambar kosong");
    img.src = "data:" + r.mimeType + ";base64," + r.data;
    bindPhoto(img);
  } catch (e) {
    img.classList.add("no-image");
    img.alt = "Foto tidak tersedia";
  }
}
function bindPhoto(img) {
  img.onclick = () => openPhoto(img.src, img.alt);
  img.classList.remove("no-image");
}
function render() {
  const q = searchInput.value.trim().toLowerCase();
  const list = products.filter((p) =>
    [p.nama, p.kategori, p.deskripsi].join(" ").toLowerCase().includes(q),
  );
  emptyState.style.display = list.length ? "none" : "block";
  productTableBody.innerHTML = list
    .map((p, i) => {
      const m = (+p.hargaJual || 0) - (+p.hargaBeli || 0),
        t = +p.terjual || 0;
      return `<tr><td>${p.gambar ? `<img id="img${i}" class="product-image" alt="${esc(p.nama || "Foto produk")}">` : `<div class="product-image no-image">-</div>`}</td><td><b>${esc(p.nama)}</b></td><td>${esc(p.kategori || "-")}</td><td>${rupiah(p.hargaBeli)}</td><td>${rupiah(p.hargaJual)}</td><td>${+p.stok || 0}</td><td>${t}</td><td>${rupiah(m)}</td><td>${rupiah(m * t)}</td><td>${esc(p.deskripsi || "-")}</td><td><button class="action-btn" onclick="openEdit('${esc(p.id)}')">Edit</button><button class="action-btn delete" onclick="deleteProduct('${esc(p.id)}')">Hapus</button></td></tr>`;
    })
    .join("");
  list.forEach((p, i) => p.gambar && driveImage(p.gambar, $("img" + i)));
  updateStats();
}
function updateStats() {
  totalProduk.textContent = products.length;
  totalTerjual.textContent = products.reduce(
    (s, p) => s + (+p.terjual || 0),
    0,
  );
  totalPenjualan.textContent = rupiah(
    products.reduce((s, p) => s + (+p.hargaJual || 0) * (+p.terjual || 0), 0),
  );
  totalLaba.textContent = rupiah(
    products.reduce(
      (s, p) =>
        s + ((+p.hargaJual || 0) - (+p.hargaBeli || 0)) * (+p.terjual || 0),
      0,
    ),
  );
  totalModal.textContent = rupiah(
    products.reduce((s, p) => s + (+p.hargaBeli || 0) * (+p.stok || 0), 0),
  );
}

function openAdd() {
  productForm.reset();
  editId.value = "";
  modalTitle.textContent = "Tambah Produk";
  photoPreview.src = "";
  photoPreview.classList.add("hidden");
  stok.value = 0;
  jumlahTerjual.value = 0;
  modal.classList.add("show");
  updatePreview();
}
function openEdit(id) {
  const p = products.find((x) => String(x.id) === String(id));
  if (!p) return;
  editId.value = p.id;
  modalTitle.textContent = "Edit Produk";
  nama.value = p.nama || "";
  kategori.value = p.kategori || "";
  hargaBeli.value = p.hargaBeli || 0;
  hargaJual.value = p.hargaJual || 0;
  stok.value = p.stok || 0;
  jumlahTerjual.value = p.terjual || 0;
  deskripsi.value = p.deskripsi || "";
  photoPreview.classList.toggle("hidden", !p.gambar);
  if (p.gambar) driveImage(p.gambar, photoPreview);
  modal.classList.add("show");
  updatePreview();
}
function closeModal() {
  modal.classList.remove("show");
}
async function saveProduct(e) {
  e.preventDefault();
  const b = productForm.querySelector('button[type="submit"]');
  b.disabled = true;
  b.textContent = "Menyimpan...";
  try {
    let gambar = "";
    const old = products.find((p) => String(p.id) === String(editId.value));
    if (foto.files[0]) gambar = await compress(foto.files[0]);
    else gambar = old?.gambar || "";
    const payload = {
      id: editId.value,
      nama: nama.value.trim(),
      kategori: kategori.value.trim(),
      hargaBeli: +hargaBeli.value || 0,
      hargaJual: +hargaJual.value || 0,
      stok: +stok.value || 0,
      terjual: +jumlahTerjual.value || 0,
      gambar,
      deskripsi: deskripsi.value.trim(),
    };
    if (!payload.nama) throw Error("Nama produk wajib diisi.");
    await post(payload.id ? "update" : "create", payload);
    closeModal();
    alert("Produk berhasil disimpan.");
    await new Promise((r) => setTimeout(r, 500));
    loadProducts();
  } catch (e) {
    alert(e.message || "Gagal menyimpan produk.");
  } finally {
    b.disabled = false;
    b.textContent = "Simpan";
  }
}
async function deleteProduct(id) {
  const p = products.find((x) => String(x.id) === String(id));
  if (!p || !confirm(`Hapus produk "${p.nama}"?`)) return;
  try {
    await post("delete", { id });
    alert("Produk berhasil dihapus.");
    await new Promise((r) => setTimeout(r, 500));
    loadProducts();
  } catch (e) {
    alert(e.message || "Gagal menghapus produk.");
  }
}

function updatePreview() {
  const m = (+hargaJual.value || 0) - (+hargaBeli.value || 0);
  previewMargin.textContent = rupiah(m);
  previewLaba.textContent = rupiah(m * (+jumlahTerjual.value || 0));
}
function previewPhoto() {
  const f = foto.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = (e) => {
    photoPreview.src = e.target.result;
    photoPreview.classList.remove("hidden");
  };
  r.readAsDataURL(f);
}
function compress(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => {
      const im = new Image();
      im.onload = () => {
        let w = im.naturalWidth,
          h = im.naturalHeight,
          max = 1000;
        if (w > max || h > max) {
          if (w > h) {
            h = Math.round((h / w) * max);
            w = max;
          } else {
            w = Math.round((w / h) * max);
            h = max;
          }
        }
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        c.getContext("2d").drawImage(im, 0, 0, w, h);
        let x = c.toDataURL("image/jpeg", 0.7);
        if (x.length > 1500000) x = c.toDataURL("image/jpeg", 0.55);
        if (x.length > 1500000)
          rej(Error("Foto masih terlalu besar setelah kompresi."));
        else res(x);
      };
      im.onerror = () => rej(Error("Foto tidak dapat dibaca."));
      im.src = r.result;
    };
    r.onerror = () => rej(Error("Gagal membaca foto"));
    r.readAsDataURL(file);
  });
}
function openPhoto(src, name) {
  if (!src) return;
  largePhoto.src = src;
  largePhotoName.textContent = name || "";
  photoModal.classList.add("show");
  document.body.style.overflow = "hidden";
}
function closePhoto() {
  photoModal.classList.remove("show");
  largePhoto.src = "";
  document.body.style.overflow = "";
}
function esc(v) {
  return String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[c],
  );
}
window.openEdit = openEdit;
window.deleteProduct = deleteProduct;
