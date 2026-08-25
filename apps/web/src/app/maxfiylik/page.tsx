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
import { Inter, JetBrains_Mono } from 'next/font/google';
import u from './maxfiylik.module.css';

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin', 'latin-ext'],
  weight: ['400'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ZumSavdo — Maxfiylik',
  description: 'Qanday maʼlumot yigʻiladi, qayerda saqlanadi va nima yigʻilmaydi.',
};

/** Sahifa oxirgi marta qachon tekshirilgani. */
const YANGILANDI = '2026-08-25';

export default function Maxfiylik() {
  return (
    <div className={`${u.sahifa} ${inter.variable} ${mono.variable}`}>
      <header className={u.tepa}>
        <div className={u.tepaIchi}>
          <a className={u.nishon} href="/" aria-label="Bosh sahifa">Z</a>
          <a className={u.nom} href="/">ZumSavdo</a>
          <a className={u.orqaga} href="/">Bosh sahifa</a>
        </div>
      </header>

      <main className={u.ichi}>
        <h1>Maxfiylik</h1>
        <p className={u.sana}>Oxirgi tekshiruv: {YANGILANDI}</p>

        <div className={u.urgu}>
          <p>
            <strong>Ism, telefon va elektron pochta soʻralmaydi.</strong> Roʻyxatdan
            oʻtish yoʻq. Siz savollarga javob berasiz, tizim tavsiya beradi — bu
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
                  Oʻn ikki savol javobi: tajriba sohalari, oila ishi,
                  qiziqish, byudjet, pulning bogʻlanishi, haftasiga necha
                  soat, shahar, onlayn tajriba, Uzumda doʻkon bormi,
                  Xitoydan tovar keltirganmisiz, sertifikat tajribasi,
                  risk munosabati
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
            </tbody>
          </table>
        </div>

        <p>
          Har savol <strong>ixtiyoriy</strong>. Javob bermasangiz maydon boʻsh
          qoladi — tizim taxmin qilmaydi va nol qoʻymaydi. Bu shunchaki
          xushmuomalalik emas: boʻsh maydonni nolga aylantirish tavsiyani
          buzadi.
        </p>

        <h2>Nima yigʻilmaydi</h2>
        <ul>
          <li>Ism, telefon raqami, elektron pochta.</li>
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
          vositasi <strong>yoʻq</strong>. Shriftlar va rasmlar ham tashqi
          xizmatdan emas, oʻzimizning serverdan yuklanadi — yaʼni sahifani
          ochganingizni uchinchi tomon bilmaydi.
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
            Ichki oʻlchov paneli (<code>/olchov</code>) — parol bilan yopiq va
            u yerda <strong>umumiy sonlar</strong> koʻrinadi: nechta odam
            boshladi, nechtasi uchinchi qadamga yetdi. Alohida odamning
            javoblari emas.
          </li>
        </ul>
        <p>Maʼlumot sotilmaydi va reklama uchun berilmaydi.</p>

        <h2>Oʻchirish</h2>
        <p>
          Brauzeringizdagi <code>so_sessiya</code> cookie sini oʻchirsangiz,
          javoblaringiz bogʻlanishi uziladi va ularni hech kim — siz ham —
          topa olmaydi.
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
