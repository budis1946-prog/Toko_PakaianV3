/************************************************
 * URL GOOGLE APPS SCRIPT
 ************************************************/

const API_URL =
  "https://script.google.com/macros/s/AKfycbzCOpWakkHP8R1exPll71FvxzuzOMV3AdoQregVHuJSxVW9QYcoOycigwFD5E2VWOvU/exec";

/************************************************
 * DATA
 ************************************************/

let products = [];

let editId = null;

/************************************************
 * FORMAT RUPIAH
 ************************************************/

function rupiah(number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(number) || 0);
}

/************************************************
 * LOAD DATA
 ************************************************/

async function loadProducts() {
  const loading = document.getElementById("loading");

  loading.style.display = "block";

  try {
    const response = await fetch(API_URL + "?action=list");

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message);
    }

    products = result.data || [];

    renderProducts();
  } catch (error) {
    console.error(error);

    alert("Gagal memuat data.\n\n" + error.message);
  } finally {
    loading.style.display = "none";
  }
}

/************************************************
 * RENDER
 ************************************************/

function renderProducts() {
  const container = document.getElementById("productContainer");

  const search = document
    .getElementById("searchInput")
    .value.toLowerCase()
    .trim();

  const status = document.getElementById("statusFilter").value;

  let filtered = products.filter(function (product) {
    const cocokNama = product.nama.toLowerCase().includes(search);

    const cocokStatus = status === "ALL" || product.status === status;

    return cocokNama && cocokStatus;
  });

  if (filtered.length === 0) {
    container.innerHTML = `

            <div class="empty">

                <div style="font-size:50px">
                    👕
                </div>

                <h3>
                    Produk tidak ditemukan
                </h3>

                <p>
                    Belum ada produk yang sesuai.
                </p>

            </div>

        `;

    updateDashboard();

    return;
  }

  container.innerHTML = filtered
    .map(function (product) {
      return createProductHTML(product);
    })
    .join("");

  updateDashboard();
}

/************************************************
 * PRODUCT HTML
 ************************************************/

function createProductHTML(product) {
  const sold = product.status === "SOLD";

  const image = product.foto
    ? `
        <img
            src="${escapeHTML(product.foto)}"
            class="product-photo"
            onclick="showImage('${escapeJS(product.foto)}')"
            alt="${escapeHTML(product.nama)}"
            loading="lazy">
        `
    : `
        <div class="no-photo">
            👕
        </div>
        `;

  return `

        <article
            class="product ${sold ? "sold" : ""}">

            ${image}

            <div class="product-content">

                <h2 class="product-title">

                    ${escapeHTML(product.nama)}

                </h2>


                <div class="product-description">

                    ${escapeHTML(product.deskripsi || "Tidak ada deskripsi")}

                </div>


                <div class="price-row">

                    <span>
                        Harga Beli
                    </span>

                    <b>
                        ${rupiah(product.hargaBeli)}
                    </b>

                </div>


                <div class="price-row">

                    <span>
                        Harga Jual
                    </span>

                    <b>
                        ${rupiah(product.hargaJual)}
                    </b>

                </div>


                <div class="profit">

                    <span>
                        Profit
                    </span>

                    <span>
                        ${rupiah(product.profit)}
                    </span>

                </div>


                <span
                    class="status ${sold ? "status-sold" : "status-ready"}">

                    ${sold ? "🔴 SOLD" : "🟢 READY"}

                </span>


                <div class="product-actions">

                    ${
                      !sold
                        ? `
                        <button
                            class="btn-sold"
                            onclick="markSold('${escapeJS(product.id)}')">

                            SOLD

                        </button>
                        `
                        : ""
                    }


                    <button
                        class="btn-edit"
                        onclick="editProduct('${escapeJS(product.id)}')">

                        ✏️ Edit

                    </button>


                    <button
                        class="btn-delete"
                        onclick="deleteProduct('${escapeJS(product.id)}')">

                        🗑️ Hapus

                    </button>

                </div>

            </div>

        </article>

    `;
}

/************************************************
 * DASHBOARD
 ************************************************/

function updateDashboard() {
  const total = products.length;

  const ready = products.filter((p) => p.status === "READY").length;

  const sold = products.filter((p) => p.status === "SOLD").length;

  /*
   * Total modal seluruh barang,
   * termasuk barang yang sudah SOLD.
   */

  const totalModal = products.reduce(
    (sum, p) => sum + Number(p.hargaBeli || 0),
    0,
  );

  /*
   * Penjualan hanya barang SOLD.
   */

  const totalPenjualan = products
    .filter((p) => p.status === "SOLD")
    .reduce((sum, p) => sum + Number(p.hargaJual || 0), 0);

  /*
   * Profit hanya barang SOLD.
   */

  const totalProfit = products
    .filter((p) => p.status === "SOLD")
    .reduce((sum, p) => sum + Number(p.profit || 0), 0);

  document.getElementById("totalProduk").textContent = total;

  document.getElementById("totalReady").textContent = ready;

  document.getElementById("totalSold").textContent = sold;

  document.getElementById("totalModal").textContent = rupiah(totalModal);

  document.getElementById("totalPenjualan").textContent =
    rupiah(totalPenjualan);

  document.getElementById("totalProfit").textContent = rupiah(totalProfit);
}

/************************************************
 * OPEN MODAL
 ************************************************/

function openModal(product = null) {
  const modal = document.getElementById("productModal");

  const form = document.getElementById("productForm");

  form.reset();

  editId = null;

  document.getElementById("modalTitle").textContent = product
    ? "Edit Produk"
    : "Tambah Produk";

  document.getElementById("previewContainer").style.display = "none";

  if (product) {
    editId = product.id;

    document.getElementById("nama").value = product.nama;

    document.getElementById("deskripsi").value = product.deskripsi;

    document.getElementById("hargaBeli").value = product.hargaBeli;

    document.getElementById("hargaJual").value = product.hargaJual;

    if (product.foto) {
      const preview = document.getElementById("previewContainer");

      preview.innerHTML = `

                <img
                    src="${product.foto}"
                    alt="Preview">

            `;

      preview.style.display = "block";
    }
  }

  updateProfitPreview();

  modal.classList.add("show");
}

/************************************************
 * CLOSE MODAL
 ************************************************/

function closeModal() {
  document.getElementById("productModal").classList.remove("show");

  editId = null;
}

/************************************************
 * EDIT
 ************************************************/

function editProduct(id) {
  const product = products.find((p) => String(p.id) === String(id));

  if (!product) {
    alert("Produk tidak ditemukan");

    return;
  }

  openModal(product);
}

/************************************************
 * FORM SUBMIT
 ************************************************/

document
  .getElementById("productForm")
  .addEventListener("submit", async function (event) {
    event.preventDefault();

    const nama = document.getElementById("nama").value.trim();

    const deskripsi = document.getElementById("deskripsi").value.trim();

    const hargaBeli = Number(document.getElementById("hargaBeli").value);

    const hargaJual = Number(document.getElementById("hargaJual").value);

    const foto = document.getElementById("foto").files[0];

    if (!nama) {
      alert("Nama produk wajib diisi.");

      return;
    }

    if (hargaBeli < 0 || hargaJual < 0) {
      alert("Harga tidak boleh negatif.");

      return;
    }

    if (foto && foto.size > 5 * 1024 * 1024) {
      alert("Ukuran foto maksimal 5 MB.");

      return;
    }

    const submitButton = event.target.querySelector('button[type="submit"]');

    submitButton.disabled = true;

    submitButton.textContent = "Menyimpan...";

    try {
      let fotoBase64 = "";

      if (foto) {
        fotoBase64 = await compressImage(foto);
      }

      const action = editId ? "update" : "add";

      const data = {
        action: action,

        id: editId,

        nama: nama,

        deskripsi: deskripsi,

        hargaBeli: hargaBeli,

        hargaJual: hargaJual,

        fotoBase64: fotoBase64,
      };

      const result = await postData(data);

      if (!result.success) {
        throw new Error(result.message);
      }

      closeModal();

      await loadProducts();

      alert(
        editId ? "Produk berhasil diperbarui." : "Produk berhasil ditambahkan.",
      );
    } catch (error) {
      console.error(error);

      alert("Gagal menyimpan produk:\n\n" + error.message);
    } finally {
      submitButton.disabled = false;

      submitButton.textContent = "Simpan Produk";
    }
  });

/************************************************
 * MARK SOLD
 ************************************************/

async function markSold(id) {
  const product = products.find((p) => String(p.id) === String(id));

  if (!product) {
    return;
  }

  const yakin = confirm('Apakah produk "' + product.nama + '" sudah terjual?');

  if (!yakin) {
    return;
  }

  try {
    const result = await postData({
      action: "sold",

      id: id,
    });

    if (!result.success) {
      throw new Error(result.message);
    }

    await loadProducts();
  } catch (error) {
    alert("Gagal mengubah status:\n\n" + error.message);
  }
}

/************************************************
 * DELETE
 ************************************************/

async function deleteProduct(id) {
  const product = products.find((p) => String(p.id) === String(id));

  if (!product) {
    return;
  }

  const yakin = confirm('Yakin ingin menghapus "' + product.nama + '"?');

  if (!yakin) {
    return;
  }

  try {
    const result = await postData({
      action: "delete",

      id: id,
    });

    if (!result.success) {
      throw new Error(result.message);
    }

    await loadProducts();
  } catch (error) {
    alert("Gagal menghapus produk:\n\n" + error.message);
  }
}

/************************************************
 * POST API
 ************************************************/

async function postData(data) {
  const response = await fetch(API_URL, {
    method: "POST",

    body: JSON.stringify(data),
  });

  return await response.json();
}

/************************************************
 * FOTO PREVIEW
 ************************************************/

document.getElementById("foto").addEventListener("change", function () {
  const file = this.files[0];

  if (!file) {
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    alert("Ukuran foto maksimal 5 MB.");

    this.value = "";

    return;
  }

  const reader = new FileReader();

  reader.onload = function (e) {
    const container = document.getElementById("previewContainer");

    container.innerHTML = `

                        <img
                            src="${e.target.result}"
                            alt="Preview">

                    `;

    container.style.display = "block";
  };

  reader.readAsDataURL(file);
});

/************************************************
 * COMPRESS IMAGE
 ************************************************/

function compressImage(file) {
  return new Promise(function (resolve, reject) {
    const reader = new FileReader();

    reader.onload = function (event) {
      const img = new Image();

      img.onload = function () {
        const maxWidth = 1200;

        let width = img.width;

        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;

          width = maxWidth;
        }

        const canvas = document.createElement("canvas");

        canvas.width = width;

        canvas.height = height;

        const ctx = canvas.getContext("2d");

        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };

      img.onerror = reject;

      img.src = event.target.result;
    };

    reader.onerror = reject;

    reader.readAsDataURL(file);
  });
}

/************************************************
 * PROFIT PREVIEW
 ************************************************/

document
  .getElementById("hargaBeli")
  .addEventListener("input", updateProfitPreview);

document
  .getElementById("hargaJual")
  .addEventListener("input", updateProfitPreview);

function updateProfitPreview() {
  const beli = Number(document.getElementById("hargaBeli").value) || 0;

  const jual = Number(document.getElementById("hargaJual").value) || 0;

  document.getElementById("profitPreview").textContent = rupiah(jual - beli);
}

/************************************************
 * IMAGE VIEWER
 ************************************************/

function showImage(src) {
  document.getElementById("largeImage").src = src;

  document.getElementById("imageViewer").classList.add("show");
}

function closeImage() {
  document.getElementById("imageViewer").classList.remove("show");
}

/************************************************
 * ESCAPE HTML
 ************************************************/

function escapeHTML(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeJS(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"');
}

/************************************************
 * CLOSE MODAL WHEN CLICK OUTSIDE
 ************************************************/

document
  .getElementById("productModal")
  .addEventListener("click", function (event) {
    if (event.target === this) {
      closeModal();
    }
  });

/************************************************
 * START
 ************************************************/

loadProducts();
