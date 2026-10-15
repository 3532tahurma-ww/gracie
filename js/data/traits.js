/*
 * Karakter oluşturma seçenekleri: hazır kişilik ve yazım tarzı özellikleri, burçlar, renkler
 * Listeye yeni özellik eklemek için ilgili gruba yazman yeterli.
 */
window.Stories = window.Stories || {};

Stories.Traits = (() => {
  const groups = [
    {
      id: 'personality', label: '💫 Kişilik',
      items: ['Neşeli', 'Utangaç', 'Alaycı', 'Soğuk', 'Flörtöz', 'Romantik', 'Kıskanç', 'Asi', 'Sakin', 'Gergin',
        'Meraklı', 'Gizemli', 'Dürüst', 'Sadık', 'İnatçı', 'Şımarık', 'Olgun', 'Çocuksu', 'Kibirli', 'Alçakgönüllü',
        'Duygusal', 'Mantıklı', 'Komik', 'Ciddi', 'Korumacı', 'Manipülatif', 'Güvensiz', 'Özgüvenli']
    },
    {
      id: 'style', label: '⌨️ Yazım tarzı',
      items: ['Kısa yazar', 'Uzun yazar', 'Hep küçük harf', 'Emoji sever', 'Emoji kullanmaz', 'Harf uzatır (canımmm)',
        'Noktalama kullanmaz', 'Resmi konuşur', 'Argo kullanır', 'Çok güler (sjsjsj)', 'Geç cevap verir', 'Sesli mesaj sever']
    },
    {
      // Kendi özelliklerin: tırnak içinde, virgülle ayırarak ekle. Örnek:
      //   items: ['Gece kuşu', 'Kahve bağımlısı', 'Kitap kurdu']
      // Liste boşken Oluştur ekranında görünmez; ilk özelliği ekleyince kendi kartıyla çıkar.
      // Başlığı değiştirmek için label'ı düzenle. Aynı şekilde yeni gruplar da ekleyebilirsin (id'leri farklı olsun).
      id: 'extra', label: '🌟 Ekstra özellikler',
      items: ['Vaginal','Anal','Oral Sex','Deepthroat','Cunnilingus','Paizuri','Titfuck','Footjob','Handjob','Buttjob','Blowjob','Huge Dick','Belly Bulge','Masturbation','Sex toys','Lactation','Creampie','Cumshot','Squirt','Cumflation','Female domination','Facesitting','Pregnant','Exhibitionism','Voyeurism','Iseme','Tutma' , 'Virginity','Cowgirl','Missionary','Ondesk','Anal','Doggy','Full Nelson','Public','BDSM','69']
    }
  ];

  const zodiacs = ['Koç', 'Boğa', 'İkizler', 'Yengeç', 'Aslan', 'Başak', 'Terazi', 'Akrep', 'Yay', 'Oğlak', 'Kova', 'Balık'];

  // Avatar ve profil kapağı için renk çiftleri
  const colors = [
    ['#ff6fa8', '#ff3d8b'], ['#a78bfa', '#7b5cff'], ['#5fb4ff', '#2f6bff'], ['#34e3a8', '#0e9f8e'],
    ['#ffb72b', '#ff7a3d'], ['#c86bff', '#ff5fb0'], ['#8b9bb4', '#4b5670'], ['#ff8a65', '#e0334f']
  ];

  const all = groups.reduce((a, g) => a.concat(g.items), []);

  return { groups, zodiacs, colors, all };
})();
