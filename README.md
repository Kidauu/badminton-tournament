# Turnamen Badminton Ganda Putra

Aplikasi web untuk mengelola turnamen badminton ganda putra dari awal sampai akhir: input peserta, undian pasangan tim, pembagian grup, jadwal pertandingan, input skor, klasemen, hingga penentuan juara. Dibangun dengan React + TypeScript + Vite, dan menyimpan progres secara otomatis di `localStorage` sehingga tidak hilang saat halaman di-refresh.

## Alur turnamen

1. **Peserta** — masukkan 14 nama peserta (unik, tidak boleh kosong).
2. **Undian** — spin wheel mengundi peserta secara acak menjadi 7 tim ganda, lalu mengundi setiap tim ke Grup A (4 tim) atau Grup B (3 tim).
3. **Tim** — menampilkan daftar tim yang terbentuk beserta pembagian grupnya.
4. **Bagan** — jadwal pertandingan: babak grup (round-robin per grup), lalu semifinal, lalu final.
5. **Skor** — input skor per set (standar hingga 21 poin dengan deuce, capped di 30) dan golden set (15 poin) bila set 1 dan 2 seri.
6. **Klasemen** — tabel klasemen tiap grup (main, menang, seri, kalah, poin, set menang).
7. **Juara** — layar perayaan pemenang dengan animasi confetti, otomatis tampil setelah seluruh pertandingan selesai.

Tab-tab di atas terkunci bertahap — sebuah tab baru bisa diakses setelah tahap sebelumnya selesai.

## Fitur lain

- **Export rekap** — unduh rekap turnamen sebagai CSV, atau cetak/simpan sebagai PDF.
- **Penyimpanan otomatis** — state turnamen tersimpan di `localStorage` browser.
- **Reset turnamen** — hapus semua data (peserta, tim, jadwal, skor) dengan konfirmasi, untuk memulai turnamen baru.

## Menjalankan secara lokal

```bash
npm install
npm run dev
```

Skrip lain yang tersedia: `npm run build` (build produksi), `npm run test` (unit test dengan Vitest), `npm run lint` (Oxlint).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
