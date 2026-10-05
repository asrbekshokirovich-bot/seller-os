/**
 * Maxfiylik — nima yigʻiladi va nima yigʻilmaydi.
 *
 * BU HUQUQIY HUJJAT EMAS. Bu — kodning ROST tavsifi. Har jumla
 * ortida aniq fayl yoki jadval turadi va ular sahifada nomi bilan
 * koʻrsatilgan, tekshirib koʻrish mumkin boʻlsin deb.
 *
 * Yuridik matn (oferta) alohida va uni nazoratchi beradi. Uni
 * oʻzim yozsam — toʻqigan boʻlardim.
 *
 * Sahifa oʻzgarganda SANA ham oʻzgarishi kerak: eskirgan maxfiylik
 * bayonoti yoʻqidan battar, chunki u ishonchni notoʻgʻri joyga
 * qoʻyadi.
 */

import type { Metadata } from 'next';
import { SahifaTepa } from '../SahifaTepa';
import u from './maxfiylik.module.css';

export const metadata: Metadata = {
  title: 'ZumSavdo — Maxfiylik',
  description: 'Qanday maʼlumot yigʻiladi, qayerda saqlanadi va nima yigʻilmaydi.',
};

/** Sahifa oxirgi marta qachon tekshirilgani. */
const YANGILANDI = '2026-10-05';

export default function Maxfiylik() {
  return (
    // Matn faqat oʻzbekcha (huquqiy tavsif) — `lang` shunga mos; ranglar va shrift — sayt mavzusidan.
    <div className={`zs-mavzu ${u.sahifa}`} lang="uz">
      <SahifaTepa til="uz" havola={{ href: '/', uz: 'Bosh sahifa', ru: 'Главная' }} />

      <main className={u.ichi}>
        <h1>Maxfiylik</h1>
        <p className={u.sana}>Oxirgi tekshiruv: {YANGILANDI}</p>

        <div className={u.urgu}>
          <p>
            <strong>Ism va elektron pochta soʻralmaydi, telefon raqam saqlanmaydi.</strong>{' '}
            Roʻyxatdan oʻtish yoʻq. Siz savollarga javob berasiz, tizim tavsiya beradi — bu
            uchun kim ekaningizni bilish shart emas.
          </p>
        </div>

        <h2>Sayt sizni qanday eslab qoladi</h2>
        <p>
          Birinchi tashrifda brauzeringizga <code>so_sessiya</code> nomli cookie
          qoʻyiladi. Ichida tasodifiy belgilar qatori boʻladi — bu sizning
          javoblaringizni topish uchun kalit.
        </p>
        <ul>
          <li>
            <strong>HttpOnly</strong> — sahifadagi JavaScript uni oʻqiy olmaydi.
            Saytga begona skript tushsa ham kalitni oʻgʻirlay olmaydi.
          </li>
          <li>
            <strong>SameSite=Lax</strong> — boshqa saytdan yuborilgan soʻrovga
            bu cookie qoʻshilmaydi.
          </li>
          <li><strong>Muddati</strong> — bir yil.</li>
          <li>
            Bazada kalitning <strong>oʻzi emas, </strong>
            <code>sha256</code> xeshi saqlanadi. Baza sizib ketsa ham hech
            kimning sessiyasini oʻgʻirlab boʻlmaydi.
          </li>
        </ul>
        <p>
          Cookie ni oʻchirsangiz sayt sizni tanimaydi va javoblaringiz
          koʻrinmay qoladi.
        </p>
        <p>Brauzerda yana ikkita sozlama turadi — ularda siz haqingizda hech narsa yoʻq:</p>
        <ul>
          <li>
            <code>so_til</code> cookie — tanlagan tilingiz (<code>uz</code> yoki{' '}
            <code>ru</code>), bir yil. Sahifa birinchi chizilishidanoq shu tilda
            chiqishi uchun serverga boradi; <code>SameSite=None; Partitioned</code>{' '}
            — kengaytma yon panelida ham ishlashi uchun.
          </li>
          <li>
            Brauzer xotirasida (<code>localStorage</code>) — <code>so_til</code>{' '}
            (til) va <code>so_mavzu</code> (yorugʻ yoki tungi mavzu). Xotiradagi
            yozuvlar serverga yuborilmaydi.
          </li>
        </ul>

        <h2>Chrome kengaytmasi</h2>
        <p>
          Kengaytmaning yon panelida sayt ramka ichida ochiladi va u yerda cookie
          ishlamaydi. Shuning uchun kalitni kengaytmaning oʻzi saqlaydi
          (<code>chrome.storage</code>) va sahifaga manzilning <code>#</code> dan
          keyingi qismida beradi (<code>#sessiya=…</code>).
        </p>
        <ul>
          <li>
            Bu qism manzil bilan birga serverga <strong>yuborilmaydi</strong>.
            Sahifadagi JavaScript uni oʻqiydi va har soʻrovga{' '}
            <code>x-sessiya</code> sarlavhasi bilan qoʻshadi.
          </li>
          <li>
            Usta sahifasi kalitni shu panel varagʻi yopilguncha brauzer
            xotirasida ham saqlaydi (<code>sessionStorage</code>): panel ichida
            boshqa sahifaga oʻtib qaytsangiz ham suhbat oʻsha qoladi. Varaq
            yopilganda u yerdan oʻchadi.
          </li>
          <li>
            Yaʼni kengaytmada yuqoridagi <strong>HttpOnly</strong> himoyasi yoʻq:
            sahifaga begona skript tushsa, u kalitni oʻqiy oladi.
          </li>
          <li>
            Uzum sahifasidagi «Xitoydan top» tugmasi bosilgandagina tovar raqami va
            uning asosiy rasmi manzili yuboriladi (pastda — Apify). Batafsil —
            kengaytmaning oʻz maxfiylik siyosatida (omborda <code>PRIVACY.md</code>).
          </li>
        </ul>

        <h2>Nima saqlanadi</h2>
        <p>Faqat oʻzingiz kiritgan javoblar va tizim bergan tavsiyalar.</p>

        <div className={u.oralik}>
          <table className={u.jadval}>
            <thead>
              <tr><th>Nima</th><th>Qayerda</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  Profil: byudjet, Uzumda doʻkoningiz bormi va yuk keladigan
                  shahar — hozirgi suhbat shu uchtasini yozadi. Ustaning
                  oldingi shaklida (2026-09-25 gacha) yana soʻralgan: tajriba
                  sohalari, oila ishi, qiziqish, pulning bogʻlanishi, haftasiga
                  necha soat, onlayn tajriba, Xitoydan tovar keltirganmisiz,
                  sertifikat tajribasi, risk munosabati
                </td>
                <td><code>user_profiles</code></td>
              </tr>
              <tr>
                <td>
                  Tavsiya jurnali: qaysi yoʻnalish yoki tovar koʻrsatilgan,
                  qaysi ball bilan, ball qanday qismlardan chiqqan, qaysi
                  tuzoq bayrogʻi bor edi va qachon
                </td>
                <td><code>recommendations</code></td>
              </tr>
              <tr>
                <td>Sessiya kalitining xeshi va oxirgi tashrif vaqti</td>
                <td><code>user_session</code></td>
              </tr>
              <tr>
                <td>
                  Usta suhbati: savol-javoblar (oʻzingiz yozgan erkin xabarlar
                  ham), qaysi qadamdasiz va har qadamda kod hisoblagan natija
                  (yoʻnalish, tovar, 1688 takliflari, varaqa, suratlar roʻyxati)
                </td>
                <td><code>suhbat_xabar</code>, <code>yol</code></td>
              </tr>
              <tr>
                <td>
                  Usta haqidagi fikr: «mantiqli / mantiqsiz» belgisi va izoh
                  matni — Ustaning oldingi shaklida soʻralgan; hozirgi suhbat
                  soʻramaydi
                </td>
                <td><code>events</code></td>
              </tr>
              <tr>
                <td>
                  Ochiq ishlar: «keyinroq» degan qadamlaringiz va yuk yoki
                  Uzum qabulini kutish muddati
                </td>
                <td><code>ochiq_ish</code></td>
              </tr>
              <tr>
                <td>
                  Oʻz Uzum kartochkangiz raqami (11-qadamda yuborsangiz) —
                  narx, zaxira va sotuvni kuzatish uchun. Oy hisobotiga
                  yozgan sotuv va komissiya summasi suhbat holatida turadi.
                </td>
                <td><code>sotuvchi_tovar</code>, <code>yol</code></td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          Savolni <strong>oʻtkazib yuborsangiz</strong> (bunday tugmasi bor
          savollarda) maydon boʻsh qoladi — tizim taxmin qilmaydi va nol
          qoʻymaydi. Bu shunchaki xushmuomalalik emas: boʻsh maydonni nolga
          aylantirish tavsiyani buzadi.
        </p>

        <h2>Nima yigʻilmaydi</h2>
        <ul>
          <li>
            Ism, telefon raqami, elektron pochta. «Kirish» sahifasida telefon raqam
            maydoni bor, lekin SMS orqali kirish hali ulanmagan: u yerga yozilgan
            raqam faqat sahifada turadi — hech qayerga yuborilmaydi va saqlanmaydi.
          </li>
          <li>
            Toʻlov maʼlumoti — toʻlov tizimi hali ulanmagan, karta raqami
            hech qayerda soʻralmaydi.
          </li>
          <li>Joylashuv (GPS). Shahar — bu siz tanlaydigan roʻyxatdan bitta qator.</li>
          <li>Boshqa saytlardagi harakatingiz.</li>
        </ul>

        <h2>Kuzatuvchi skriptlar yoʻq</h2>
        <p>
          Sahifada Google Analytics, Facebook piksel yoki boshqa kuzatuv
          vositasi <strong>yoʻq</strong>. Shriftlar oʻzimizning serverdan
          yuklanadi.
        </p>
        <p>
          <strong>Tovar rasmlari</strong> esa oʻz manbasidan koʻrsatiladi:
          Uzum (<code>images.uzum.uz</code>), 1688 (<code>alicdn.com</code>),
          9-qadamda studiya (Cloudflare) va surat topilgan sayt. Bu serverlar,
          har qanday sayt kabi, rasmni soʻragan IP manzilni koʻradi. Rasm
          soʻrovida qaysi sahifadan kelgani (<code>Referer</code>) yuborilmaydi.
        </p>

        <h2>Uzum maʼlumoti — sizniki emas</h2>
        <p>
          Tizim Uzumning <strong>ochiq</strong> sahifalaridan tovar nomi, narxi,
          sotuvchisi va qoldigʻini oʻlchaydi. Bu bozor maʼlumoti, shaxsiy
          maʼlumot emas, va u sizning javoblaringizga bogʻlanmaydi.
        </p>

        <h2>Kim koʻra oladi</h2>
        <ul>
          <li>
            <strong>Supabase</strong> — baza va API shu yerda ishlaydi.
          </li>
          <li>
            <strong>Vercel</strong> — sayt shu yerda joylashgan.
          </li>
          <li>
            <strong>Apify</strong> — 5-qadamda tovar <strong>rasmi</strong>{' '}
            (1688 qidiruvi), 9-qadamda tanlangan 1688 taklifining raqami (uning
            suratlarini olish uchun) yuboriladi. Javoblaringiz va sessiya kaliti
            yuborilmaydi.
          </li>
          <li>
            <strong>Cloudflare</strong> — 9-qadamda tovar suratini oq fonga
            oʻtkazadi: unga faqat rasm manzili boradi, tayyor surat Cloudflare
            keshida 30 kungacha turadi.
          </li>
          <li>
            <strong>Google Gemini</strong> (ulangan boʻlsa) — ikki holatda.
            Birinchisi: menejer savolini tabiiyroq qilish uchun kod yozgan jumla
            yuboriladi; unda raqamlar boʻlishi mumkin (masalan, dona soni).
            Ikkinchisi: savolga javob oʻrniga boshqa narsa yozsangiz (savol, salom
            va h.k.) va u javob sifatida qabul qilinmasa —{' '}
            <strong>oʻzingiz yozgan matn</strong> (500 belgigacha), joriy savol va
            uning variantlari hamda mahsulot haqidagi tayyor faktlar yuboriladi:
            javobni Gemini soʻzlaydi. Ikkala holatda ham javobni kod tekshiradi —
            yangi raqam yoki kafolat soʻzi boʻlsa, u tashlanadi va kodning oʻz
            jumlasi ketadi. Sessiya kaliti yuborilmaydi. Shuning uchun suhbatga
            pasport, telefon kabi shaxsiy maʼlumot yozmang.
          </li>
          <li>
            Ichki oʻlchov paneli (<code>/olchov</code>) — parol bilan yopiq. U
            yerda asosan <strong>umumiy sonlar</strong> koʻrinadi: nechta odam
            boshladi, nechtasi uchinchi qadamga yetdi. Bitta istisno — fikr
            izohlari: Ustaning oldingi shaklida qoldirilgan «mantiqli /
            mantiqsiz» belgisi va izoh matni roʻyxat boʻlib chiqadi (kimniki
            ekani koʻrsatilmaydi).
          </li>
        </ul>
        <p>Maʼlumot sotilmaydi va reklama uchun berilmaydi.</p>

        <h2>Oʻchirish</h2>
        <p>
          Brauzeringizdagi <code>so_sessiya</code> cookie sini oʻchirsangiz,
          javoblaringiz bogʻlanishi uziladi va ularni hech kim — siz ham —
          topa olmaydi. Kengaytmadagi kalit kengaytma oʻchirilganda yoʻqoladi.
        </p>

        <div className={u.ochiq}>
          <p>
            <strong>Hal qilinmagan:</strong> bazadagi qatorlarni butunlay
            oʻchiradigan tugma hali yoʻq. Sabab shundaki tavsiya jurnali
            ataylab <strong>oʻzgarmas</strong> qilingan — «nega aynan shu
            tovar tavsiya qilingan?» degan savolga bir oydan keyin ham javob
            boʻlishi kerak. Oʻchirish huquqi bilan buni qanday birlashtirish
            — huquqiy qaror va u hali qabul qilinmagan.
          </p>
          <p>
            Bu yerda yashirilmayapti: sahifa nima borligini emas, nima
            <strong> yoʻqligini</strong> ham aytishi kerak.
          </p>
        </div>

        <h2>Bu sahifa haqida</h2>
        <p>
          Bu yuridik hujjat emas — kodning tavsifi. Har jumla ortida aniq
          jadval yoki fayl turadi va ular yuqorida nomi bilan koʻrsatilgan.
          Ommaviy oferta alohida hujjat va u alohida chiqariladi.
        </p>
      </main>
    </div>
  );
}
