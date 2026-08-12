# 08 — ERD (Entity Relationship Diagram)

Diagram dibuat dengan **Mermaid**, yang dirender otomatis di GitHub, GitLab, VS Code (dengan ekstensi Markdown Preview Mermaid), Obsidian, dan [mermaid.live](https://mermaid.live).

Karena skema memiliki 33 tabel, dokumen ini menyajikan:

1. **ERD Global** — semua tabel dan relasinya (tanpa atribut, agar terbaca)
2. **ERD Per Domain** — 7 diagram dengan atribut lengkap
3. **Tabel Semua Relasi** — daftar lengkap FK, kardinalitas, dan aturan `onDelete`
4. **Catatan pembacaan diagram**

Penjelasan fungsi tiap tabel dan kolom ada di [07-tabel-database.md](./07-tabel-database.md).

---

## 1. ERD Global

```mermaid
erDiagram
    User ||--o{ Session : "punya"
    User ||--o{ PasswordResetToken : "punya"
    User |o--o| Cart : "punya"
    User ||--o{ Receiver : "punya"
    User |o--o| AffiliateProfile : "punya"
    User ||--o{ Order : "membeli"
    User ||--o{ Order : "merujuk (afiliasi)"
    User ||--o{ Order : "melayani (kasir POS)"
    User ||--o{ OrderStatusHistory : "mengubah"
    User ||--o{ AffiliateCommissionRate : "memperbarui"
    User ||--o{ POSSession : "membuka shift"
    User ||--o{ Notification : "penerima terkait"
    User ||--o{ Voucher : "membuat"
    User ||--o{ VoucherRedemption : "menukarkan"

    Category |o--o{ Category : "induk-anak"
    Category ||--o{ CategoryProduct : ""
    Product ||--o{ CategoryProduct : ""
    Tag ||--o{ ProductTag : ""
    Product ||--o{ ProductTag : ""
    Product ||--o{ ProductImage : "galeri"
    Product ||--o{ CartItem : ""
    Product ||--o{ OrderItem : ""
    Product |o--o| AffiliateCommissionRate : "tarif komisi"
    Product ||--o{ AffiliateProductSelection : ""
    Product ||--o{ AffiliateClick : ""
    Product ||--o{ HomepageSectionProduct : ""
    Product ||--o{ KidsSectionProduct : ""

    Cart ||--o{ CartItem : "berisi"

    City ||--o{ Receiver : "lokasi"

    Order ||--o{ OrderItem : "berisi"
    Order ||--o{ OrderStatusHistory : "riwayat"
    Order |o--o| AffiliateConversion : "komisi"
    Order |o--o| VoucherRedemption : "penukaran"
    Order |o--o| PaymentSession : "sesi bayar"
    Order ||--o{ Notification : "notifikasi"
    Voucher ||--o{ Order : "dipakai di"

    AffiliateProfile ||--o{ AffiliateProductSelection : "memilih"
    AffiliateProfile ||--o{ AffiliateClick : "menerima klik"
    AffiliateProfile ||--o{ AffiliateConversion : "menghasilkan"
    AffiliateProfile ||--o{ AffiliatePayout : "dibayar via"

    Voucher ||--o{ VoucherRedemption : "ditukarkan"

    StoreSetting {
        int id "singleton = 1"
    }
    HomepageConfig {
        int id "singleton = 1"
    }
    KidsConfig {
        int id "singleton = 1"
    }
    WebhookLog {
        string providerEventId "unique - idempotensi"
    }
```

Empat tabel di bagian bawah (`StoreSetting`, `HomepageConfig`, `KidsConfig`, `WebhookLog`) **tidak memiliki relasi FK apa pun** — tiga yang pertama adalah singleton konfigurasi, yang terakhir adalah log webhook yang berdiri sendiri.

---

## 2. ERD Per Domain

### 2.1 Domain Autentikasi & Pengguna

```mermaid
erDiagram
    User ||--o{ Session : "1..N"
    User ||--o{ PasswordResetToken : "1..N"

    User {
        string id PK "uuid"
        string email UK "identitas login"
        string passwordHash "bcrypt cost 12"
        string name "nullable"
        string phone "nullable"
        string whatsappNumber "nullable"
        string avatarUrl "nullable"
        Role role "BUYER | AFFILIATE | ADMIN"
        datetime emailVerifiedAt "nullable - belum dipakai"
        datetime createdAt
        datetime updatedAt
    }

    Session {
        string id PK "uuid - jadi klaim sid di JWT"
        string userId FK "Cascade"
        datetime expiresAt "diperiksa setiap request"
        string ipAddress "nullable - audit"
        string userAgent "nullable - audit"
        datetime createdAt
        datetime updatedAt
    }

    PasswordResetToken {
        string id PK "uuid"
        string userId FK "Cascade"
        string tokenHash "SHA-256 dari token mentah"
        datetime expiresAt "now + 1 jam"
        datetime usedAt "nullable - sekali pakai"
        datetime createdAt
        datetime updatedAt
    }
```

### 2.2 Domain Katalog Produk

```mermaid
erDiagram
    Category |o--o{ Category : "parentId (SetNull)"
    Category ||--o{ CategoryProduct : ""
    Product ||--o{ CategoryProduct : ""
    Product ||--o{ ProductTag : ""
    Tag ||--o{ ProductTag : ""
    Product ||--o{ ProductImage : "maks 8"

    Category {
        string id PK "uuid"
        string name
        string slug UK
        string parentId FK "nullable - self, SetNull"
        int position "urutan menu"
        boolean isActive "soft delete"
    }

    Tag {
        string id PK "uuid"
        string name
        string slug UK
    }

    Product {
        string id PK "uuid"
        string sku UK
        string slug UK "stabil - tidak ikut judul"
        string title
        string subtitle
        string author "dicari full-text"
        string imprint "nullable - API: publisher"
        string description "dicari full-text"
        string tocText "nullable - multi-baris"
        string highlightsText "nullable - multi-baris"
        int price "rupiah"
        int discountPercent "0-90"
        int finalPrice "turunan - dihitung server"
        int stock
        int weightGram
        CoverType coverType "SOFTCOVER|HARDCOVER|EBOOK"
        int pageCount
        int publishYear
        boolean isActive "soft delete"
        int position "belum dipakai query"
        RibbonType ribbonType "nullable - NEW|BEST|DISCOUNT"
        string ribbonText "nullable"
        datetime createdAt
        datetime updatedAt
    }

    ProductImage {
        string id PK "uuid"
        string productId FK "Cascade"
        string url "lokal atau R2"
        string altText "nullable"
        int position
        boolean isPrimary "1 per produk (dijaga endpoint)"
    }

    CategoryProduct {
        string productId PK "bagian composite PK, FK ke Product, Cascade"
        string categoryId PK "bagian composite PK, FK ke Category, Cascade"
    }

    ProductTag {
        string productId PK "bagian composite PK, FK ke Product, Cascade"
        string tagId PK "bagian composite PK, FK ke Tag, Cascade"
    }
```

### 2.3 Domain Keranjang

```mermaid
erDiagram
    User |o--o| Cart : "unique userId"
    Cart ||--o{ CartItem : "1..N"
    Product ||--o{ CartItem : "Cascade"

    Cart {
        string id PK "uuid"
        string userId UK "nullable - keranjang member"
        string guestToken UK "nullable - cookie gsb_cart_guest"
        datetime createdAt
        datetime updatedAt "diindeks untuk pembersihan"
    }

    CartItem {
        string id PK "uuid"
        string cartId FK "Cascade"
        string productId FK "Cascade"
        int quantity "min 1"
        int priceSnapshot "deteksi price_changed"
        datetime createdAt "urutan tampil"
        datetime updatedAt
    }
```

Constraint yang menjaga invarian: `Cart.userId` unique, `Cart.guestToken` unique, dan `CartItem[cartId, productId]` unique.

### 2.4 Domain Pesanan (inti)

```mermaid
erDiagram
    User |o--o{ Order : "userId (SetNull)"
    User |o--o{ Order : "affiliateUserId (SetNull)"
    User |o--o{ Order : "posCashierUserId (SetNull)"
    Voucher |o--o{ Order : "voucherId (SetNull)"
    Order ||--o{ OrderItem : "1..N Cascade"
    Order ||--o{ OrderStatusHistory : "1..N Cascade"
    Product |o--o{ OrderItem : "productId (SetNull)"
    User |o--o{ OrderStatusHistory : "changedByUserId (SetNull)"
    Order |o--o| PaymentSession : "1..1 Cascade"

    Order {
        string id PK "uuid"
        string orderNumber UK "ORD-YYYYMMDD-NNNNNN - dikirim ke Midtrans"
        string userId FK "nullable - null untuk guest & POS"
        string receiverName "snapshot"
        string receiverPhone "snapshot"
        string receiverEmail "snapshot - POS pakai '-'"
        string receiverAddress "snapshot - POS pakai '-'"
        string receiverCity "snapshot nama kota, bukan FK"
        string receiverNote "nullable"
        int subtotal
        int shippingCost "0 untuk POS"
        int discount "voucherDiscount + manualDiscount"
        int total "max(0, subtotal + shipping - discount)"
        PaymentMethod paymentMethod
        OrderSource source "ONLINE | POS"
        OrderStatus status "default AWAITING_PAYMENT"
        string affiliateUserId FK "nullable"
        string affiliateCode "nullable - salinan kode"
        string posCashierUserId FK "nullable"
        datetime posReceiptPrintedAt "nullable"
        string voucherId FK "nullable"
        string voucherCode "nullable - salinan kode"
        int voucherDiscount
        int manualDiscount "POS saja"
        string manualDiscountReason "nullable"
        datetime createdAt
        datetime updatedAt
    }

    OrderItem {
        string id PK "uuid"
        string orderId FK "Cascade"
        string productId FK "nullable - SetNull"
        string titleSnapshot
        int priceSnapshot
        int discountPercentSnapshot
        int quantity
        int lineTotal "priceSnapshot x quantity"
    }

    OrderStatusHistory {
        string id PK "uuid"
        string orderId FK "Cascade"
        OrderStatus fromStatus
        OrderStatus toStatus
        string changedByUserId FK "nullable - null = otomatis"
        string note "nullable"
        datetime createdAt "append-only"
    }

    PaymentSession {
        string id PK "uuid"
        string orderId UK "1-1 Cascade"
        string snapToken
        string snapRedirectUrl
        string vaNumber "nullable"
        string lastTransactionStatus "nullable - status mentah Midtrans"
        datetime expiresAt "nullable - now + 24 jam"
        datetime createdAt
        datetime updatedAt
    }
```

### 2.5 Domain Pengiriman & Alamat

```mermaid
erDiagram
    User ||--o{ Receiver : "Cascade"
    City ||--o{ Receiver : "RESTRICT"

    City {
        string id PK "uuid"
        string name
        string province
        int shippingCost "tarif flat per kota"
        boolean isActive
    }

    Receiver {
        string id PK "uuid"
        string userId FK "Cascade"
        string label "Rumah, Kantor, ..."
        string name
        string phone
        string email "nullable"
        string address
        string cityId FK "RESTRICT"
        boolean isDefault "maks 1 per user (dijaga transaksi)"
        datetime createdAt
        datetime updatedAt "penentu default pengganti"
    }
```

`Restrict` pada `cityId` adalah satu-satunya `Restrict` selain `Voucher.createdByUser`. Kota yang masih dipakai alamat tersimpan tidak boleh dihapus, dan endpoint admin membalas `409` dengan pesan yang jelas.

Perhatikan bahwa `Order` **tidak** punya FK ke `Receiver` — pesanan menyimpan salinan datar, sehingga mengubah/menghapus alamat tidak mempengaruhi pesanan lama.

### 2.6 Domain Afiliasi

```mermaid
erDiagram
    User |o--o| AffiliateProfile : "unique userId, Cascade"
    AffiliateProfile ||--o{ AffiliateProductSelection : "Cascade"
    AffiliateProfile ||--o{ AffiliateClick : "Cascade"
    AffiliateProfile ||--o{ AffiliateConversion : "Cascade"
    AffiliateProfile ||--o{ AffiliatePayout : "Cascade"
    Product ||--o{ AffiliateProductSelection : "Cascade"
    Product |o--o{ AffiliateClick : "SetNull"
    Product |o--o| AffiliateCommissionRate : "unique productId, Cascade"
    User |o--o{ AffiliateCommissionRate : "updatedByUserId SetNull"
    Order |o--o| AffiliateConversion : "unique orderId, Cascade"

    AffiliateProfile {
        string id PK "uuid"
        string userId UK "1-1 dengan User"
        string code UK "kode referral - dipakai di /r/code"
        string payoutBankName "kosong bila dipromosikan admin"
        string payoutBankAccount
        string payoutBankHolder
        boolean isActive "false = link berhenti melacak"
        datetime joinedAt
    }

    AffiliateProductSelection {
        string id PK "uuid"
        string affiliateProfileId FK "Cascade"
        string productId FK "Cascade"
        datetime createdAt "reset tiap simpan"
    }

    AffiliateCommissionRate {
        string id PK "uuid"
        string productId UK "1-1 dengan Product"
        decimal percent "Decimal(5,2)"
        int fixedAmount "nullable - menang atas percent"
        boolean isActive "false = produk tanpa komisi"
        string updatedByUserId FK "nullable"
        datetime updatedAt
    }

    AffiliateClick {
        string id PK "uuid"
        string affiliateProfileId FK "Cascade"
        string productId FK "nullable - SetNull"
        string sourceUrl "nullable - header Referer"
        string ipAddress "x-forwarded-for atau 'unknown'"
        string userAgent
        string cookieId "cookie gsb_cid - 365 hari"
        datetime createdAt
    }

    AffiliateConversion {
        string id PK "uuid"
        string affiliateProfileId FK "Cascade"
        string orderId UK "1-1 - cegah komisi ganda"
        int commissionAmount "dibekukan saat dibuat"
        AffiliateConversionStatus status "PENDING|APPROVED|PAID|REJECTED"
        datetime approvedAt "nullable - saat order COMPLETED"
        datetime paidAt "nullable - saat masuk payout"
        datetime createdAt
    }

    AffiliatePayout {
        string id PK "uuid"
        string affiliateProfileId FK "Cascade"
        datetime periodStart
        datetime periodEnd
        int totalAmount "sum komisi APPROVED di periode"
        AffiliatePayoutStatus status "PENDING|PAID|CANCELLED"
        datetime paidAt "nullable"
        string notes "nullable"
        datetime createdAt
    }
```

Perhatikan **tidak ada FK** dari `AffiliateConversion` ke `AffiliatePayout`. Keterkaitannya implisit: `affiliateProfileId` + rentang `periodStart..periodEnd` + `status = PAID`. Bila kelak butuh pelacakan eksak "konversi ini masuk batch mana", perlu menambahkan kolom `payoutId` pada `AffiliateConversion`.

### 2.7 Domain Voucher, Notifikasi, Konfigurasi & POS

```mermaid
erDiagram
    User ||--o{ Voucher : "createdByUserId RESTRICT"
    Voucher ||--o{ VoucherRedemption : "Cascade"
    Voucher |o--o{ Order : "voucherId SetNull"
    Order |o--o| VoucherRedemption : "unique orderId, Cascade"
    User |o--o{ VoucherRedemption : "userId SetNull"
    Order |o--o{ Notification : "relatedOrderId SetNull"
    User |o--o{ Notification : "relatedUserId SetNull"
    Product ||--o{ HomepageSectionProduct : "Cascade"
    Product ||--o{ KidsSectionProduct : "Cascade"
    User ||--o{ POSSession : "Cascade - belum dipakai"

    Voucher {
        string id PK "uuid"
        string code UK "selalu uppercase, maks 30"
        string description "nullable"
        VoucherType type "PERCENT | FIXED"
        int value "persen (<=100) atau rupiah"
        int maxDiscount "nullable - hanya untuk PERCENT"
        int minPurchase "default 0"
        VoucherChannel channel "ALL | ONLINE | POS"
        int quota "nullable = tanpa batas"
        int usedCount "increment dalam transaksi + row lock"
        int perUserLimit "nullable - tidak berlaku untuk guest"
        datetime startsAt "nullable"
        datetime expiresAt "nullable"
        boolean isActive
        string createdByUserId FK "RESTRICT"
        datetime createdAt
        datetime updatedAt
    }

    VoucherRedemption {
        string id PK "uuid"
        string voucherId FK "Cascade"
        string orderId UK "1-1 - satu voucher per pesanan"
        string userId FK "nullable - null untuk guest & POS"
        int discountAmount
        datetime createdAt
    }

    Notification {
        string id PK "uuid"
        NotificationChannel channel "EMAIL | WHATSAPP"
        string recipient "email tujuan (disalin)"
        NotificationTemplate template
        string relatedOrderId FK "nullable"
        string relatedUserId FK "nullable"
        json payloadJson "variabel template"
        NotificationStatus status "PENDING | SENT | FAILED"
        string providerId "nullable - id Resend"
        string providerResponse "nullable - belum diisi"
        string error "nullable"
        int attempts "maks 3"
        datetime nextRetryAt "nullable - null = menyerah"
        datetime sentAt "nullable"
        datetime createdAt
    }

    HomepageSectionProduct {
        string id PK "uuid"
        HomepageSectionKey sectionKey "NEWEST|BESTSELLER|INTERNATIONAL|KIWARI|KLASIK|OTHERS"
        string productId FK "Cascade"
        int position "indeks array saat disimpan"
    }

    KidsSectionProduct {
        string id PK "uuid"
        KidsSectionKey sectionKey "POPULAR | DISCOUNT"
        string productId FK "Cascade"
        int position
    }

    POSSession {
        string id PK "uuid"
        string cashierUserId FK "Cascade"
        datetime openedAt
        datetime closedAt "nullable"
        int openingCash
        int closingCash "nullable"
        string notes "nullable"
    }

    StoreSetting {
        int id PK "singleton = 1"
        string name "kop struk POS"
        string email
        string phone
        string address
        int defaultShippingCost "belum dipakai"
        int freeShippingMinTotal "belum dipakai"
        string bank1Name
        string bank1Number
        string bank1Holder
        string bank2Name
        string bank2Number
        string bank2Holder
        decimal defaultCommissionPercent "Decimal(5,2) default 5 - DIPAKAI"
        datetime updatedAt
    }

    HomepageConfig {
        int id PK "singleton = 1"
        string heroMainImageUrl
        string heroSideImage1Url
        string heroSideImage2Url
        string sectionNewestPromoImageUrl
        string sectionBestsellerPromoImageUrl
        string sectionInternationalPromoImageUrl
        string sectionKiwariPromoImageUrl
        string sectionKlasikPromoImageUrl
        datetime updatedAt
    }

    KidsConfig {
        int id PK "singleton = 1"
        string heroBadge
        string heroTitle
        string heroDescription
        string heroImageUrl
        string promoBadge
        string promoTitle
        string promoDescription
        string promoImageUrl
        datetime updatedAt
    }

    WebhookLog {
        string id PK "uuid"
        string provider "'midtrans'"
        string providerEventId UK "transaction_id:transaction_status"
        json payload "body mentah"
        datetime processedAt "nullable - null = gagal di tengah"
        datetime createdAt
    }
```

---

## 3. Tabel Semua Relasi

### 3.1 Relasi one-to-one (1—1)

| Induk     | Anak                      | Kolom FK    | Constraint | onDelete  | Makna                                                  |
| --------- | ------------------------- | ----------- | ---------- | --------- | ------------------------------------------------------ |
| `User`    | `Cart`                    | `userId`    | `@unique`  | `Cascade` | Satu member = satu keranjang tetap                     |
| `User`    | `AffiliateProfile`        | `userId`    | `@unique`  | `Cascade` | Satu user maksimal satu profil afiliasi                |
| `Product` | `AffiliateCommissionRate` | `productId` | `@unique`  | `Cascade` | Satu produk maksimal satu tarif komisi                 |
| `Order`   | `AffiliateConversion`     | `orderId`   | `@unique`  | `Cascade` | Satu pesanan maksimal satu komisi (cegah komisi ganda) |
| `Order`   | `VoucherRedemption`       | `orderId`   | `@unique`  | `Cascade` | Satu pesanan maksimal satu voucher                     |
| `Order`   | `PaymentSession`          | `orderId`   | `@unique`  | `Cascade` | Satu pesanan satu sesi Snap (di-`upsert`)              |

### 3.2 Relasi one-to-many (1—N)

| Induk              | Anak                        | Kolom FK             | onDelete       | Catatan                                    |
| ------------------ | --------------------------- | -------------------- | -------------- | ------------------------------------------ |
| `User`             | `Session`                   | `userId`             | `Cascade`      |                                            |
| `User`             | `PasswordResetToken`        | `userId`             | `Cascade`      |                                            |
| `User`             | `Receiver`                  | `userId`             | `Cascade`      |                                            |
| `User`             | `Order`                     | `userId`             | `SetNull`      | relasi `OrderToUser` — pembeli             |
| `User`             | `Order`                     | `affiliateUserId`    | `SetNull`      | relasi `OrderToAffiliateUser` — perujuk    |
| `User`             | `Order`                     | `posCashierUserId`   | `SetNull`      | relasi `OrderToPosCashierUser` — kasir     |
| `User`             | `OrderStatusHistory`        | `changedByUserId`    | `SetNull`      | null = perubahan otomatis                  |
| `User`             | `AffiliateCommissionRate`   | `updatedByUserId`    | `SetNull`      | audit siapa mengubah tarif                 |
| `User`             | `POSSession`                | `cashierUserId`      | `Cascade`      | tabel belum dipakai                        |
| `User`             | `Notification`              | `relatedUserId`      | `SetNull`      |                                            |
| `User`             | `Voucher`                   | `createdByUserId`    | **`Restrict`** | admin pembuat voucher tidak bisa dihapus   |
| `User`             | `VoucherRedemption`         | `userId`             | `SetNull`      | null untuk guest & POS                     |
| `Category`         | `Category`                  | `parentId`           | `SetNull`      | self-relation; anak naik jadi root         |
| `Category`         | `CategoryProduct`           | `categoryId`         | `Cascade`      |                                            |
| `Tag`              | `ProductTag`                | `tagId`              | `Cascade`      |                                            |
| `Product`          | `ProductImage`              | `productId`          | `Cascade`      |                                            |
| `Product`          | `ProductTag`                | `productId`          | `Cascade`      |                                            |
| `Product`          | `CategoryProduct`           | `productId`          | `Cascade`      |                                            |
| `Product`          | `CartItem`                  | `productId`          | `Cascade`      | keranjang sementara                        |
| `Product`          | `OrderItem`                 | `productId`          | `SetNull`      | pesanan permanen — snapshot tetap          |
| `Product`          | `AffiliateProductSelection` | `productId`          | `Cascade`      |                                            |
| `Product`          | `AffiliateClick`            | `productId`          | `SetNull`      | log klik tetap ada                         |
| `Product`          | `HomepageSectionProduct`    | `productId`          | `Cascade`      |                                            |
| `Product`          | `KidsSectionProduct`        | `productId`          | `Cascade`      |                                            |
| `Cart`             | `CartItem`                  | `cartId`             | `Cascade`      |                                            |
| `City`             | `Receiver`                  | `cityId`             | **`Restrict`** | kota terpakai tidak bisa dihapus           |
| `Order`            | `OrderItem`                 | `orderId`            | `Cascade`      |                                            |
| `Order`            | `OrderStatusHistory`        | `orderId`            | `Cascade`      |                                            |
| `Order`            | `Notification`              | `relatedOrderId`     | `SetNull`      |                                            |
| `Voucher`          | `Order`                     | `voucherId`          | `SetNull`      | `voucherCode` tetap sebagai salinan        |
| `Voucher`          | `VoucherRedemption`         | `voucherId`          | `Cascade`      | alasan voucher terpakai tidak bisa dihapus |
| `AffiliateProfile` | `AffiliateProductSelection` | `affiliateProfileId` | `Cascade`      |                                            |
| `AffiliateProfile` | `AffiliateClick`            | `affiliateProfileId` | `Cascade`      |                                            |
| `AffiliateProfile` | `AffiliateConversion`       | `affiliateProfileId` | `Cascade`      |                                            |
| `AffiliateProfile` | `AffiliatePayout`           | `affiliateProfileId` | `Cascade`      |                                            |

### 3.3 Relasi many-to-many (N—N)

| Kiri      | Kanan      | Tabel pivot       | Primary key               | Kolom tambahan |
| --------- | ---------- | ----------------- | ------------------------- | -------------- |
| `Product` | `Category` | `CategoryProduct` | `[productId, categoryId]` | tidak ada      |
| `Product` | `Tag`      | `ProductTag`      | `[productId, tagId]`      | tidak ada      |

Kedua pivot memakai composite primary key (bukan `id` sintetis) karena tidak punya atribut sendiri. Ini sekaligus mencegah duplikat tanpa index tambahan.

Relasi N—N lain yang **tidak** memakai pivot murni karena punya atribut sendiri:

- `AffiliateProfile` ↔ `Product` lewat `AffiliateProductSelection` (punya `id` + `createdAt`)
- `Product` ↔ section beranda/kids lewat `HomepageSectionProduct` / `KidsSectionProduct` (punya `position`)

### 3.4 Tabel tanpa relasi FK

| Tabel            | Alasan                                                                    |
| ---------------- | ------------------------------------------------------------------------- |
| `StoreSetting`   | Singleton konfigurasi global (id = 1)                                     |
| `HomepageConfig` | Singleton konfigurasi global (id = 1)                                     |
| `KidsConfig`     | Singleton konfigurasi global (id = 1)                                     |
| `WebhookLog`     | Log mandiri; tertaut ke pesanan hanya lewat `payload.order_id` (bukan FK) |

---

## 4. Catatan Pembacaan Diagram

### Notasi kardinalitas Mermaid yang dipakai

| Notasi      | Artinya                                                      |
| ----------- | ------------------------------------------------------------ |
| `\|\|--o{`  | Tepat satu di kiri, nol atau lebih di kanan (1—N wajib)      |
| `\|o--o{`   | Nol atau satu di kiri, nol atau lebih di kanan (FK nullable) |
| `\|o--o\|`  | Nol atau satu di kedua sisi (1—1 opsional)                   |
| `\|\|--o\|` | Tepat satu di kiri, nol atau satu di kanan (1—1)             |

### Kenapa `User` muncul tiga kali menuju `Order`

Prisma mewajibkan nama relasi eksplisit bila dua model terhubung lebih dari sekali. Ketiga peran itu:

| Nama relasi Prisma      | Kolom              | Peran                                  |
| ----------------------- | ------------------ | -------------------------------------- |
| `OrderToUser`           | `userId`           | pembeli (null untuk guest & POS)       |
| `OrderToAffiliateUser`  | `affiliateUserId`  | afiliasi yang merujuk pembelian        |
| `OrderToPosCashierUser` | `posCashierUserId` | admin/kasir yang membuat transaksi POS |

Satu pesanan POS bisa punya `posCashierUserId` terisi sementara `userId` null. Satu pesanan online lewat link afiliasi punya `userId` dan `affiliateUserId` terisi (dan bisa saja keduanya user yang berbeda).

### Kolom snapshot yang sengaja bukan FK

Beberapa nilai disalin datar alih-alih dijadikan foreign key, agar dokumen historis tidak berubah saat data referensinya berubah:

| Tabel          | Kolom snapshot                                                                      | Menggantikan FK ke |
| -------------- | ----------------------------------------------------------------------------------- | ------------------ |
| `Order`        | `receiverName`, `receiverPhone`, `receiverEmail`, `receiverAddress`, `receiverCity` | `Receiver`, `City` |
| `Order`        | `affiliateCode`                                                                     | `AffiliateProfile` |
| `Order`        | `voucherCode`                                                                       | `Voucher`          |
| `OrderItem`    | `titleSnapshot`, `priceSnapshot`, `discountPercentSnapshot`                         | `Product`          |
| `Notification` | `recipient`                                                                         | `User.email`       |

Sebagian di antaranya tetap **punya** FK berdampingan dengan salinannya (`voucherId` + `voucherCode`, `affiliateUserId` + `affiliateCode`, `productId` + `titleSnapshot`). FK dipakai untuk join dan pelaporan; salinan dipakai agar baris tetap bermakna setelah induknya hilang (`SetNull`).

### Cara meng-generate ulang diagram

Bila skema berubah, diagram di dokumen ini perlu diperbarui manual. Alternatifnya, generator otomatis dari `prisma/schema.prisma`:

```bash
# Contoh: prisma-erd-generator (belum dipasang di proyek ini)
pnpm add -D prisma-erd-generator @mermaid-js/mermaid-cli
# lalu tambahkan generator di prisma/schema.prisma dan jalankan prisma generate
```

Untuk saat ini, sumber kebenaran tetap `prisma/schema.prisma`; dokumen ini adalah representasi terbacanya.
