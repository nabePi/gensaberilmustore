export type BlogPost = {
  slug: string;
  tags: string[];
  title: string;
  excerpt: string;
  author: string;
  date: string;
  contentHtml: string;
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: '5-rekomendasi-buku-islami-ramadhan',
    tags: ['Resensi', 'Ramadhan', 'Buku'],
    title: '5 Rekomendasi Buku Islami untuk Menemani Ramadhan',
    excerpt: 'Kumpulan buku terbaik untuk mengisi bulan penuh berkah dengan ilmu dan hikmah.',
    author: 'Redaksi',
    date: '5 Jan 2026',
    contentHtml: `
      <p>Bulan Ramadhan adalah waktu terbaik untuk memperbanyak amal, termasuk menambah ilmu melalui bacaan yang bermanfaat. Berikut lima rekomendasi buku yang cocok menemani hari-hari puasa Anda.</p>
      <p>1. Tafsir Juz Amma — penjelasan ringkas dan mudah dipahami untuk surat-surat pendek yang sering dibaca saat shalat.</p>
      <p>2. Fiqih Puasa Praktis — membahas hukum-hukum puasa secara sederhana, lengkap dengan dalil dan contoh kasus sehari-hari.</p>
      <p>3. Kisah Para Nabi — cocok dibacakan untuk anak-anak sebagai pengantar sebelum berbuka atau menjelang tidur.</p>
      <p>4. Renungan Menuju Lailatul Qadar — kumpulan tulisan reflektif untuk menyambut malam seribu bulan.</p>
      <p>5. Doa dan Dzikir Harian — panduan praktis doa-doa yang dianjurkan sepanjang bulan Ramadhan.</p>
      <p>Semoga rekomendasi ini membantu Anda dan keluarga mengisi Ramadhan dengan lebih bermakna.</p>
    `,
  },
  {
    slug: 'tips-menumbuhkan-minat-baca-anak',
    tags: ['Resensi', 'Anak', 'Parenting'],
    title: 'Tips Menumbuhkan Minat Baca pada Anak Sejak Dini',
    excerpt: 'Strategi sederhana orang tua agar si kecil jatuh cinta pada buku.',
    author: 'Redaksi',
    date: '3 Jan 2026',
    contentHtml: `
      <p>Menumbuhkan kecintaan anak pada buku tidak harus rumit. Berikut beberapa strategi sederhana yang bisa diterapkan orang tua di rumah.</p>
      <p>Pertama, jadikan membaca sebagai rutinitas bersama, misalnya sebelum tidur. Konsistensi lebih penting daripada durasi.</p>
      <p>Kedua, biarkan anak memilih sendiri buku yang ingin dibaca. Minat yang tumbuh dari pilihan sendiri biasanya lebih tahan lama.</p>
      <p>Ketiga, jadilah contoh. Anak cenderung meniru kebiasaan orang tua, termasuk kebiasaan membaca.</p>
      <p>Keempat, sediakan buku bergambar dan berwarna untuk anak usia dini agar pengalaman membaca terasa menyenangkan.</p>
      <p>Dengan konsistensi dan kesabaran, minat baca anak akan tumbuh secara alami seiring waktu.</p>
    `,
  },
  {
    slug: 'karya-ulama-klasik-wajib-dibaca',
    tags: ['Resensi', 'Sejarah', 'Ulama'],
    title: 'Mengenal Karya-Karya Ulama Klasik yang Wajib Dibaca',
    excerpt: 'Panduan memilih rujukan Islam klasik yang relevan untuk kehidupan modern.',
    author: 'Redaksi',
    date: '17 Jan 2026',
    contentHtml: `
      <p>Karya-karya ulama klasik menyimpan kedalaman ilmu yang tetap relevan hingga saat ini. Berikut beberapa karya yang layak menjadi rujukan.</p>
      <p>Ihya Ulumuddin karya Imam Al-Ghazali membahas penyucian jiwa dan akhlak secara mendalam, cocok bagi yang ingin memperbaiki diri.</p>
      <p>Riyadhus Shalihin karya Imam An-Nawawi berisi kumpulan hadits pilihan seputar akhlak dan ibadah sehari-hari.</p>
      <p>Al-Hikam karya Ibnu Athaillah menawarkan renungan sufistik yang ringkas namun sarat makna.</p>
      <p>Bagi pemula, disarankan memilih edisi terjemahan dengan penjelasan tambahan agar lebih mudah dipahami konteksnya.</p>
      <p>Membaca karya klasik bukan sekadar bernostalgia, melainkan cara menyambungkan diri dengan warisan keilmuan Islam yang panjang.</p>
    `,
  },
  {
    slug: 'memilih-buku-anak-sesuai-usia',
    tags: ['Tips', 'Anak', 'Parenting'],
    title: 'Cara Memilih Buku Anak Sesuai Usia dan Tahap Perkembangan',
    excerpt: 'Panduan praktis memilih bacaan yang tepat untuk setiap tahap tumbuh kembang anak.',
    author: 'Redaksi',
    date: '22 Jan 2026',
    contentHtml: `
      <p>Memilih buku yang sesuai usia membantu anak menikmati proses membaca tanpa merasa kesulitan atau bosan.</p>
      <p>Untuk usia 0-2 tahun, pilih board book dengan gambar besar dan sedikit teks agar tahan terhadap gigitan dan tarikan.</p>
      <p>Untuk usia 3-5 tahun, cerita bergambar dengan alur sederhana dan pesan moral ringan sangat cocok diperkenalkan.</p>
      <p>Untuk usia 6-9 tahun, anak mulai bisa menikmati cerita bersambung dengan ilustrasi yang lebih sedikit dan teks lebih panjang.</p>
      <p>Untuk usia 10 tahun ke atas, novel anak dan buku pengetahuan populer dapat memperluas wawasan sekaligus melatih daya baca mandiri.</p>
      <p>Sesuaikan juga dengan minat anak, karena buku yang sesuai minat akan lebih mudah membuat mereka betah membaca.</p>
    `,
  },
  {
    slug: 'manfaat-sedekah-dalam-islam',
    tags: ['Renungan', 'Umat', 'Akhlak'],
    title: 'Manfaat Sedekah dalam Islam bagi Kehidupan Dunia dan Akhirat',
    excerpt: 'Mengulas keutamaan sedekah sebagai amalan yang tak pernah mengurangi harta.',
    author: 'Redaksi',
    date: '2 Feb 2026',
    contentHtml: `
      <p>Sedekah merupakan salah satu amalan yang sangat dianjurkan dalam Islam, bukan hanya untuk membantu sesama tetapi juga membersihkan harta dan jiwa.</p>
      <p>Rasulullah SAW bersabda bahwa sedekah tidak akan mengurangi harta, justru sebaliknya, Allah akan melipatgandakan rezeki bagi yang gemar bersedekah.</p>
      <p>Selain manfaat spiritual, sedekah juga memiliki dampak sosial yang nyata, seperti mempererat hubungan antar sesama dan mengurangi kesenjangan ekonomi.</p>
      <p>Sedekah dapat dilakukan kapan saja dan dalam bentuk apa saja, mulai dari harta, tenaga, hingga senyuman yang tulus.</p>
      <p>Semoga kita senantiasa dimudahkan untuk istiqomah dalam bersedekah, sekecil apa pun bentuknya.</p>
    `,
  },
  {
    slug: 'menjaga-adab-menuntut-ilmu',
    tags: ['Renungan', 'Umat', 'Peradaban'],
    title: 'Menjaga Adab dalam Menuntut Ilmu ala Ulama Terdahulu',
    excerpt: 'Adab yang perlu dijaga agar ilmu yang dipelajari membawa keberkahan.',
    author: 'Redaksi',
    date: '10 Feb 2026',
    contentHtml: `
      <p>Para ulama terdahulu sangat menekankan pentingnya adab sebelum ilmu. Bahkan dikatakan, adab menempati porsi yang lebih besar daripada ilmu itu sendiri.</p>
      <p>Salah satu adab penting adalah niat yang lurus, yaitu menuntut ilmu semata-mata karena Allah, bukan untuk kepentingan duniawi semata.</p>
      <p>Adab lainnya adalah menghormati guru, bersabar dalam proses belajar, serta senantiasa mengamalkan ilmu yang telah dipelajari.</p>
      <p>Ilmu yang dipelajari dengan adab yang baik akan lebih mudah dipahami dan membawa keberkahan bagi pemiliknya.</p>
      <p>Mari kita jadikan adab sebagai pondasi utama dalam setiap proses belajar yang kita jalani.</p>
    `,
  },
];

export function getBlogPostBySlug(slug: string) {
  return BLOG_POSTS.find((post) => post.slug === slug);
}
