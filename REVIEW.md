# Review: the term list

This is everything in `app/data/terms.json` that I'd like a translator's eye on before Translit is
listed. The matching itself is well tested (every one of the 2,169 spellings is checked in Chrome to
find its own term and nothing else), so the open questions are about the **forms**: which spelling
each house style should produce.

Nothing here is broken. A term marked for review still finds all its spellings; the question is only
whether the spelling it writes for a given style is the one you'd choose. In the app these terms carry
a red "Qy" in the Terms screen, with the question next to them.

## How to settle one

Each term is one line in `app/data/terms.json`. Change the `forms` (and `plural.forms`) to what you'd
write, add any spelling you've seen to `variants`, then delete `"check": true` and the `"topic"`, and
either delete the `"note"` or turn it into a plain explanation. Then run:

```
tools/check_terms.py     # the data is consistent (no spelling claimed twice, every form is a spelling)
tools/test.py            # the matcher tests in headless Chrome, including every spelling round trip
```

`tools/check_terms.py --review` prints the tables below again from whatever is still marked.

## Decisions that settle many terms at once

These are the choices I made for whole styles. If you'd decide one differently, it's usually a quick
search-and-replace in the JSON.

1. **Academic צ.** I kept **tz** (mitzvah, tzedakah, Tzom Gedalyah), the same as the modern styles.
   Many journals write **ts** (mitsvah) and the Encyclopaedia Judaica uses **z** (zaddik). Which one?
2. **Academic dagesh doubling.** Academic forms double a letter with a dagesh forte where it's
   usual in scholarly writing (Ḥanukkah, Sukkot, Kabbalah, tefillah, kippah) and also in less usual
   places (Zikkaron, kavvanah, mazzal, segullah, hetter, muttar, Melavveh). The second group is
   marked under "doubling" below. Keep them, or double only where English already does?
3. **Ashkenazi kamatz as o.** The Ashkenazi style always writes ת without a dagesh as **s**
   (Shabbos, Sukkos, tallis, kashrus). For the kamatz I wrote **o** only where that's the usual
   written form (Shabbos, chometz, seforim, Yisroel, Moshiach, chosson, cholov, Yomim) and kept
   **a** where Orthodox publishers mostly do (yetzer hara, lashon hara, Yamim Noraim, haftarah,
   Gemara, Avraham). The o-forms are still caught and fixed. Do you want the spoken o throughout?
4. **Final ה in the modern styles.** Both modern styles write a final ה as **h** (halachah, yeshivah,
   shivah, Torah), like halachah and Chanukah. In practice yeshiva, shiva and halacha are more
   common without it.
5. **Exceptions in h/kh.** The h/kh style follows ח → h strictly (Pesah, hametz, hesed, shiddukh),
   except where English has settled on ch: **challah** and **chutzpah** stay as they are. Pesah and
   shiddukh are marked; maybe they should be exceptions too.
6. **Capitals.** Words that are both a name and an ordinary noun have lowercase forms (megillah,
   midrash, mishnah, gemara, chumash, rebbe, erev, olam haba, kedushah). Translit never lowercases a
   capital the text already has unless you ask it to, so "the Megillah" and "the whole megillah" both
   come out right. Holidays, months, prayers and books are capitalized.
7. **Plurals.** Where a Hebrew plural is the norm in Jewish English, the styles use it (mitzvot,
   brachot, sefarim, siddurim) and an English plural like mitzvahs is fixed to it. Where English
   plurals are normal (menorahs, Torahs, shuls, seders), there's no plural entry and the English -s
   is simply kept on whatever spelling you choose.
8. **Yiddish.** For Yiddish words the academic style is **YIVO** romanization (yarmlke, bobe,
   shtetlekh, tsholnt) and the other styles use the usual English spelling. Verbs (daven, bentch,
   schlep, kvetch, kvell) keep an English-style stem in every style, so davening and davened still
   work; the YIVO infinitive is noted in the data. The Hebrew column shows the Yiddish spelling,
   with pasekh and komets alefs and plain double yud and double vov rather than the ligatures.
9. **Left out on purpose.** Some spellings are never searched for because they're also ordinary
   English or names: Cohen, hag (h/kh for chag), shames, bench (for bentsh), moil, tales, din, get,
   goy, Rav and chai. (Nissan is in, as the Ashkenazi spelling of the month; it only clashes with
   the carmaker.) Bare personal
   names (Avraham, Moshe, Yitzchak) aren't in the list at all, so real people's names are never
   changed; only the fixed phrases are (Avraham Avinu, Moshe Rabbeinu).
10. **Told apart by capitals.** Sukkot (the festival) and sukkot (the booths) have the same letters,
    so Translit reads the capitalized one as the festival. brit, shiva and Av are only matched with
    the expected capitals (or at the start of a sentence), so a Brit in London, the Hindu god Shiva
    and an AV club are left alone.
11. **Tractate names** aren't separate entries. A capitalized Berakhot or Ketubot is treated like the
    plural it is, and because capitals are kept, "Berakhot 2a" becomes "Brachot 2a" in the modern ch
    style and "Brachos 2a" in the Ashkenazi one. If you'd rather tractate names were never touched,
    I can add them as fixed entries.

## Term by term

### Forms in the two modern styles (36)

| Term | Hebrew | Modern ch | Modern h/kh | Academic | Ashkenazi | Question |
|---|---|---|---|---|---|---|
| `pesach` | פֶּסַח | Pesach | Pesah | Pesaḥ | Pesach | h/kh style: Pesah follows the rule, but much general writing keeps Pesach or just says Passover. |
| `shiva-asar-btammuz` | שִׁבְעָה עָשָׂר בְּתַמּוּז | Shiva Asar B'Tammuz | Shiva Asar B'Tammuz | Shivah Asar be-Tammuz | Shivah Asar B'Tammuz | Shiva or Shivah here (the final ה); I followed each style's final-h habit loosely. |
| `asara-btevet` | עֲשָׂרָה בְּטֵבֵת | Asara B'Tevet | Asara B'Tevet | Asarah be-Tevet | Asarah B'Teves | Asara or Asarah (final ה); I used Asarah for academic and Ashkenazi. |
| `chag-sameach` | חַג שָׂמֵחַ | Chag Sameach | Hag Sameah | Ḥag Same'aḥ | Chag Sameach | h/kh: Hag Sameah or Hag Sameach? Academic with the furtive patach: Ḥag Same'aḥ. |
| `kol-nidre` | כָּל נִדְרֵי | Kol Nidrei | Kol Nidre | Kol Nidrei | Kol Nidrei | Kol Nidre is the common English spelling; Kol Nidrei is closer to the Hebrew. I gave Kol Nidre to h/kh only. |
| `kriat-shema` | קְרִיאַת שְׁמַע | Kriat Shema | Kriat Shema | Keri'at Shema | Krias Shema | Kriat or Keriat for the modern styles? |
| `shemoneh-esrei` | שְׁמוֹנֶה עֶשְׂרֵה | Shemoneh Esrei | Shemoneh Esreh | Shemoneh Esreh | Shemoneh Esrei | Esrei or Esreh for the final syllable (עֶשְׂרֵה)? I split it by style. |
| `bracha` | בְּרָכָה | brachah / pl. brachot | berakhah / pl. berakhot | berakhah / pl. berakhot | brachah / pl. brachos | Modern ch: brachah or berachah? Ashkenazi: brachah or brocha (spoken)? The plural is also the name of a tractate (Berakhot), which Translit treats like any other capitalized word. |
| `beit-knesset` | בֵּית כְּנֶסֶת | beit knesset | beit knesset | bet keneset | beis knesses | Academic bet keneset is a guess at strict usage; many academic texts write beit knesset. |
| `halachah` | הֲלָכָה | halachah / pl. halachot | halakhah / pl. halakhot | halakhah / pl. halakhot | halachah / pl. halachos | Modern ch: halachah (with the final h, like Chanukah) or the very common halacha? |
| `mussar` | מוּסָר | mussar | musar | musar | mussar | h/kh and academic: musar (no dagesh in the samekh); mussar is the common spelling. |
| `chassidut` | חֲסִידוּת | Chassidut | Hasidut | Ḥasidut | Chassidus | Modern ch: Chassidut or Chasidut? |
| `chavruta` | חַבְרוּתָא | chavruta / pl. chavrutot | havruta / pl. havrutot | ḥavruta / pl. ḥavrutot | chavrusa / pl. chavrusos | The plurals are Hebrew-style; many writers just say chavrutas / chavrusas. |
| `yeshiva` | יְשִׁיבָה | yeshivah / pl. yeshivot | yeshivah / pl. yeshivot | yeshivah / pl. yeshivot | yeshivah / pl. yeshivos | yeshivah follows the final-h rule, but yeshiva is far more common in practice. |
| `peshat` | פְּשָׁט | peshat | peshat | peshat | pshat | pshat (spoken) or peshat (with the vocal sheva)? |
| `derash` | דְּרָשׁ | derash | derash | derash | drash | drash (spoken) or derash (with the vocal sheva)? |
| `dvar-torah` | דְּבַר תּוֹרָה | d'var Torah / pl. divrei Torah | d'var Torah / pl. divrei Torah | devar Torah / pl. divrei Torah | dvar Torah / pl. divrei Torah | d'var, dvar or devar: all three are common. |
| `kal-vachomer` | קַל וָחֹמֶר | kal vachomer | kal vahomer | kal va-ḥomer | kal vachomer | kal vachomer or kal v'chomer? The niqqud (וָ) supports va-. |
| `parashah` | פָּרָשָׁה | parashah / pl. parashiyot | parashah / pl. parashiyot | parashah / pl. parashiyyot | parshah / pl. parshiyos | Two plurals exist (parashiyot, parashot); I chose parashiyot. |
| `bnai-mitzvah` | בְּנֵי מִצְוָה | b'nai mitzvah | b'nai mitzvah | benei mitzvah | bnei mitzvah | b'nai (Ashkenazi-American, usual in Reform and Conservative writing) or b'nei/benei? |
| `shidduch` | שִׁדּוּךְ | shidduch / pl. shidduchim | shiddukh / pl. shiddukhim | shiddukh / pl. shiddukhim | shidduch / pl. shidduchim | The h/kh form shiddukh is rare in practice; most general writing keeps shidduch. |
| `shiva` | שִׁבְעָה | shivah | shivah | shivah | shivah | shivah follows the final-h rule but shiva is far more common. Only matched in lowercase (or at the start of a sentence), so the Hindu god isn't touched. |
| `aveilut` | אֲבֵלוּת | aveilut | avelut | avelut | aveilus | Modern ch: aveilut (with the tsere as ei) or avelut? |
| `kriah` | קְרִיעָה | kriah | keriah | keri'ah | kriah | kriah or keriah for the modern styles? |
| `challah` | חַלָּה | challah / pl. challot | challah / pl. challot | ḥallah / pl. ḥallot | challah / pl. challos | The bread is spelled challah even in h/kh writing, so I made that the h/kh form too. Change it if a client really writes hallah. |
| `simchah` | שִׂמְחָה | simchah / pl. smachot | simhah / pl. semahot | simḥah / pl. semaḥot | simchah / pl. simchos | The plural is messy: Hebrew smachot, Ashkenazi simchos, and English simchas are all in use. |
| `nachat` | נַחַת | nachat | nahat | naḥat | nachas | nachas/naches (from Yiddish) is what most English writing uses; the modern styles follow the Hebrew. |
| `mazal-tov` | מַזָּל טוֹב | mazal tov | mazal tov | mazal tov | mazel tov | mazel tov is the usual American spelling, which I gave to Ashkenazi only. |
| `shalom-bayit` | שְׁלוֹם בַּיִת | shalom bayit | shalom bayit | shelom bayit | shalom bayis | Academic shelom bayit is the strict construct form; most writing says shalom bayit. |
| `aveirah` | עֲבֵרָה | aveirah / pl. aveirot | averah / pl. averot | averah / pl. averot | aveirah / pl. aveiros | Modern ch: aveirah or averah? |
| `tzaar-baalei-chayim` | צַעַר בַּעֲלֵי חַיִּים | tza'ar ba'alei chayim | tza'ar ba'alei hayim | tza'ar ba'alei ḥayyim | tzaar baalei chaim | chayim or chaim (חַיִּים)? I used chaim for Ashkenazi only. |
| `kibbud-av-vaem` | כִּבּוּד אָב וָאֵם | kibbud av va'em | kibbud av va'em | kibbud av va-em | kibbud av v'eim | va'em or v'em (וָאֵם)? |
| `bein-adam-lachavero` | בֵּין אָדָם לַחֲבֵרוֹ | bein adam lachavero | bein adam lahavero | bein adam la-ḥavero | bein adam lachaveiro | The vowel under the lamed is a patach (lacha-), but lechavero is what many people say and write. |
| `shaliach` | שָׁלִיחַ | shaliach / pl. shluchim | shaliah / pl. sheluhim | shaliaḥ / pl. sheluḥim | shliach / pl. shluchim | The plural here is shluchim (שְׁלוּחִים), the Chabad word, because that's nearly always what English texts mean. The regular plural of shaliach is shlichim (שְׁלִיחִים). Should the modern styles use that instead? |
| `baal-koreh` | בַּעַל קוֹרֵא | ba'al koreh | ba'al koreh | ba'al kore | baal korei | koreh, kore or korei for קוֹרֵא? |
| `moshe-rabbeinu` | מֹשֶׁה רַבֵּנוּ | Moshe Rabbeinu | Moshe Rabbenu | Moshe Rabbenu | Moshe Rabbeinu | Rabbeinu or Rabbenu (the tsere as ei or e)? |

### Ashkenazi: kamatz as o, or not (22)

| Term | Hebrew | Modern ch | Modern h/kh | Academic | Ashkenazi | Question |
|---|---|---|---|---|---|---|
| `yom-tov` | יוֹם טוֹב | Yom Tov / pl. Yamim Tovim | Yom Tov / pl. Yamim Tovim | Yom Tov / pl. Yamim Tovim | Yom Tov / pl. Yamim Tovim | Ashkenazi plural: I kept Yamim Tovim; yeshivish writing often has Yomim Tovim. |
| `yamim-noraim` | יָמִים נוֹרָאִים | Yamim Noraim | Yamim Noraim | Yamim Nora'im | Yamim Noraim | Ashkenazi: Yamim Noraim (as most Orthodox publishers) or Yomim Noraim (the spoken Ashkenazi kamatz)? |
| `kabbalat-shabbat` | קַבָּלַת שַׁבָּת | Kabbalat Shabbat | Kabbalat Shabbat | Kabbalat Shabbat | Kabbalas Shabbos | Ashkenazi: Kabbalas Shabbos or Kabbolas Shabbos (spoken kamatz)? |
| `shema-yisrael` | שְׁמַע יִשְׂרָאֵל | Shema Yisrael | Shema Yisrael | Shema Yisra'el | Shema Yisroel | Ashkenazi Yisroel (kamatz as o) is standard in yeshivish writing; ArtScroll-style books keep Yisrael. |
| `sefer` | סֵפֶר | sefer / pl. sefarim | sefer / pl. sefarim | sefer / pl. sefarim | sefer / pl. seforim | Ashkenazi plural seforim is everywhere in yeshivish writing; some Orthodox publishers use sefarim. |
| `gemara` | גְּמָרָא | gemara | gemara | gemara | gemara | Lowercase so “a gemara” (a passage or a volume) stays lowercase; “the Gemara” keeps its capital. Ashkenazi: Gemara or Gemora (spoken kamatz)? |
| `drasha` | דְּרָשָׁה | drashah / pl. drashot | derashah / pl. derashot | derashah / pl. derashot | drashah / pl. drashos | Ashkenazi: drashah or drosha (spoken)? |
| `haftarah` | הַפְטָרָה | haftarah / pl. haftarot | haftarah / pl. haftarot | haftarah / pl. haftarot | haftarah / pl. haftaros | Ashkenazi: haftarah (publishers) or haftorah (the classic spoken spelling)? |
| `beit-midrash` | בֵּית מִדְרָשׁ | beit midrash | beit midrash | bet midrash | beis medrash | Ashkenazi beis medrash (spoken) or beis midrash? |
| `tallit-katan` | טַלִּית קָטָן | tallit katan | tallit katan | tallit katan | tallis katan | Ashkenazi: tallis katan or tallis koton (spoken)? |
| `avel` | אָבֵל | avel / pl. aveilim | avel / pl. avelim | avel / pl. avelim | avel / pl. aveilim | Ashkenazi: avel or ovel (spoken kamatz)? |
| `chatan` | חָתָן | chatan | hatan | ḥatan | chosson | Ashkenazi: chosson (spoken) or chassan (ArtScroll)? |
| `chametz` | חָמֵץ | chametz | hametz | ḥametz | chometz | Ashkenazi: chometz (spoken kamatz, very common) or chametz (ArtScroll)? |
| `mashiach` | מָשִׁיחַ | Mashiach | Mashiah | Mashiaḥ | Moshiach | Ashkenazi: Moshiach (Chabad and yeshivish) or Mashiach (ArtScroll)? |
| `yetzer-hara` | יֵצֶר הָרָע | yetzer hara | yetzer hara | yetzer ha-ra | yetzer hara | Ashkenazi: yetzer hara (publishers) or yetzer hora (spoken kamatz, very common)? |
| `ayin-hara` | עַיִן הָרָע | ayin hara | ayin hara | ayin ha-ra | ayin hara | Ashkenazi: ayin hara or ayin hora? (The Yiddish kinehora is its own entry.) |
| `lashon-hara` | לָשׁוֹן הָרָע | lashon hara | lashon hara | lashon ha-ra | lashon hara | Ashkenazi: lashon hara (publishers) or loshon hora (spoken)? |
| `neshamah` | נְשָׁמָה | neshamah / pl. neshamot | neshamah / pl. neshamot | neshamah / pl. neshamot | neshamah / pl. neshamos | Ashkenazi: neshamah or neshomah (spoken)? |
| `talmid-chacham` | תַּלְמִיד חָכָם | talmid chacham / pl. talmidei chachamim | talmid hakham / pl. talmidei hakhamim | talmid ḥakham / pl. talmidei ḥakhamim | talmid chacham / pl. talmidei chachamim | Ashkenazi: talmid chacham or talmid chochom (spoken)? |
| `harav` | הָרַב | HaRav | HaRav | ha-Rav | HaRav | Ashkenazi HoRav (spoken kamatz) is common in yeshivish writing; I kept HaRav. |
| `avraham-avinu` | אַבְרָהָם אָבִינוּ | Avraham Avinu | Avraham Avinu | Avraham Avinu | Avraham Avinu | Ashkenazi: Avraham Avinu or Avrohom Avinu (spoken)? Bare personal names aren't in the list, so real people's names are never touched. |
| `yitzchak-avinu` | יִצְחָק אָבִינוּ | Yitzchak Avinu | Yitzhak Avinu | Yitzḥak Avinu | Yitzchak Avinu | Ashkenazi: Yitzchak or Yitzchok? |

### Other Ashkenazi forms (14)

| Term | Hebrew | Modern ch | Modern h/kh | Academic | Ashkenazi | Question |
|---|---|---|---|---|---|---|
| `tu-bishvat` | ט״ו בִּשְׁבָט | Tu Bishvat | Tu Bishvat | Tu bi-Shevat | Tu B'Shvat | Ashkenazi form: I used Tu B'Shvat; some Orthodox publishers write Tu B'Shevat. |
| `kapparot` | כַּפָּרוֹת | kapparot | kapparot | kapparot | kaparos | Ashkenazi: kaparos or kapparos (both common); Yiddish kapores also turns up. |
| `seder` | סֵדֶר | seder / pl. sedarim | seder / pl. sedarim | seder / pl. sedarim | Seder / pl. sedorim | Seder or seder: AP and Chicago lowercase it, many Jewish publishers capitalize it. Ashkenazi plural sedorim is a guess at yeshivish usage. |
| `shabbat` | שַׁבָּת | Shabbat / pl. Shabbatot | Shabbat / pl. Shabbatot | Shabbat / pl. Shabbatot | Shabbos / pl. Shabbosim | Ashkenazi plural: Shabbosim (the Yiddish-style plural) or Shabbosos (the Hebrew one)? |
| `muktzeh` | מֻקְצֶה | muktzeh | muktzeh | muktzeh | muktzeh | Ashkenazi writing often has muktzah; I used muktzeh everywhere. |
| `musaf` | מוּסָף | Musaf | Musaf | Musaf | Mussaf | Ashkenazi: Mussaf (ArtScroll) or Musaf? |
| `birkat-hamazon` | בִּרְכַּת הַמָּזוֹן | Birkat Hamazon | Birkat Hamazon | Birkat ha-Mazon | Bircas Hamazon | Ashkenazi: Bircas (ArtScroll's c for a kaf with dagesh), Birkas, or the common Birchas? |
| `tallit` | טַלִּית | tallit / pl. tallitot | tallit / pl. tallitot | tallit / pl. tallitot | tallis / pl. talleisim | Ashkenazi plural talleisim is the Yiddish-style plural; check your clients don't prefer tallises. |
| `kippah` | כִּפָּה | kippah / pl. kippot | kippah / pl. kippot | kippah / pl. kippot | kippah / pl. kippos | Ashkenazi writers mostly say yarmulke instead; kippah/kippos is my guess for when they don't. |
| `shofar` | שׁוֹפָר | shofar / pl. shofarot | shofar / pl. shofarot | shofar / pl. shofarot | shofar / pl. shofros | Ashkenazi plural shofros; English shofars is common in general writing. |
| `mikveh` | מִקְוֶה | mikveh / pl. mikvaot | mikveh / pl. mikvaot | mikveh / pl. mikva'ot | mikvah / pl. mikvaos | Ashkenazi: mikvah (very common in American usage) or mikveh (closer to the Hebrew)? |
| `matzevah` | מַצֵּבָה | matzevah / pl. matzevot | matzevah / pl. matzevot | matzevah / pl. matzevot | matzeivah / pl. matzeivos | Ashkenazi: matzeivah (tsere as ei) is a guess; matzevah is also common. |
| `matzah` | מַצָּה | matzah / pl. matzot | matzah / pl. matzot | matzah / pl. matzot | matzah / pl. matzos | Ashkenazi: matzah (Orthodox publishers) or matzo (American)? |
| `chafetz-chaim` | חָפֵץ חַיִּים | Chafetz Chaim | Hafetz Hayim | Ḥafetz Ḥayyim | Chofetz Chaim | Chofetz Chaim is the usual Ashkenazi spelling; check the modern forms. |

### Academic: doubling a letter for a dagesh (19)

| Term | Hebrew | Modern ch | Modern h/kh | Academic | Ashkenazi | Question |
|---|---|---|---|---|---|---|
| `yom-hazikaron` | יוֹם הַזִּכָּרוֹן | Yom Hazikaron | Yom Hazikaron | Yom ha-Zikkaron | Yom Hazikaron | Academic doubling: Zikkaron (dagesh in the kaf). |
| `chag` | חַג | chag / pl. chagim | hag / pl. hagim | ḥag / pl. ḥaggim | chag / pl. chagim | The h/kh form hag is never searched for (it's an English word), only written. Academic plural ḥaggim has the dagesh doubled; check you want that. |
| `iyar` | אִיָּר | Iyar | Iyar | Iyyar | Iyar | Academic doubling Iyyar (dagesh in the yod), as in the Encyclopaedia Judaica. |
| `melaveh-malkah` | מְלַוֶּה מַלְכָּה | Melaveh Malkah | Melaveh Malkah | Melavveh Malkah | Melaveh Malkah | Academic doubling Melavveh (dagesh in the vav) is pedantic; drop it if your academic clients don't double. |
| `kavanah` | כַּוָּנָה | kavanah / pl. kavanot | kavanah / pl. kavanot | kavvanah / pl. kavvanot | kavanah / pl. kavanos | Academic doubling kavvanah (dagesh in the vav). |
| `aliyah` | עֲלִיָּה | aliyah / pl. aliyot | aliyah / pl. aliyot | aliyah / pl. aliyyot | aliyah / pl. aliyos | Academic plural aliyyot (dagesh in the yod). |
| `chanukiyah` | חֲנֻכִּיָּה | chanukiyah | hanukkiyah | ḥanukkiyyah | chanukiyah | Academic ḥanukkiyyah doubles both dageshes; hanukkiyah / chanukiyah are the everyday forms. |
| `ketubah` | כְּתֻבָּה | ketubah / pl. ketubot | ketubah / pl. ketubot | ketubbah / pl. ketubbot | kesubah / pl. kesubos | Academic doubling ketubbah (dagesh in the bet). |
| `chevra-kadisha` | חֶבְרָה קַדִּישָׁא | chevra kadisha | hevra kadisha | ḥevra kaddisha | chevra kadisha | Academic kaddisha (dagesh in the dalet). |
| `chamin` | חַמִּין | chamin | hamin | ḥamin | chamin | Academic ḥammin (dagesh in the mem)? I left it single. |
| `bitachon` | בִּטָּחוֹן | bitachon | bitahon | bittaḥon | bitachon | Academic doubling bittaḥon (dagesh in the tet). |
| `mazal` | מַזָּל | mazal | mazal | mazzal | mazel | Academic doubling mazzal (dagesh in the zayin). |
| `sinat-chinam` | שִׂנְאַת חִנָּם | sinat chinam | sinat hinam | sin'at ḥinnam | sinas chinam | Academic doubling ḥinnam (dagesh in the nun). |
| `segulah` | סְגֻלָּה | segulah / pl. segulot | segulah / pl. segulot | segullah / pl. segullot | segulah / pl. segulos | Academic doubling segullah (dagesh in the lamed). |
| `kula` | קֻלָּא | kula / pl. kulot | kula / pl. kulot | kulla / pl. kullot | kula / pl. kulos | Academic doubling kulla (dagesh in the lamed). |
| `heter` | הֶתֵּר | heter | heter | hetter | heter | Academic doubling hetter (dagesh in the tav). |
| `mutar` | מֻתָּר | mutar | mutar | muttar | mutar | Academic doubling muttar (dagesh in the tav). |
| `mitnaged` | מִתְנַגֵּד | mitnaged / pl. mitnagdim | mitnaged / pl. mitnagdim | mitnagged / pl. mitnaggedim | misnaged / pl. misnagdim | Academic doubling mitnagged (dagesh in the gimel). |
| `sarah-imeinu` | שָׂרָה אִמֵּנוּ | Sarah Imeinu | Sarah Imenu | Sarah Immenu | Sarah Imeinu | Imeinu or Imenu; academic doubling Immenu. |

### Other academic forms (6)

| Term | Hebrew | Modern ch | Modern h/kh | Academic | Ashkenazi | Question |
|---|---|---|---|---|---|---|
| `bein-hametzarim` | בֵּין הַמְּצָרִים | Bein Hametzarim | Bein Hametzarim | Bein ha-Metzarim | Bein Hametzarim | Academic: Bein or Ben (בֵּין). I used Bein. |
| `tzom-gedaliah` | צוֹם גְּדַלְיָה | Tzom Gedaliah | Tzom Gedaliah | Tzom Gedalyah | Tzom Gedaliah | Academic: Gedalyah (closer to the Hebrew) or Gedaliah (the English Bible name)? |
| `arba-minim` | אַרְבָּעָה מִינִים | arba minim | arba minim | arba'ah minim | arba minim | Common speech says arba minim; the grammatical form is arba'ah minim, which I gave to academic. |
| `tishrei` | תִּשְׁרֵי | Tishrei | Tishrei | Tishri | Tishrei | Academic: Tishri (Encyclopaedia Judaica) or Tishrei? |
| `taharah` | טָהֳרָה | taharah | taharah | taharah | taharah | I'm not sure of the academic form (taharah or toharah); I used taharah everywhere. |
| `shehakol` | שֶׁהַכֹּל | shehakol | shehakol | she-ha-kol | shehakol | The academic hyphenation she-ha-kol is a guess. |

### Apostrophes (5)

| Term | Hebrew | Modern ch | Modern h/kh | Academic | Ashkenazi | Question |
|---|---|---|---|---|---|---|
| `lag-baomer` | ל״ג בָּעֹמֶר | Lag Ba'omer | Lag Ba'omer | Lag ba-Omer | Lag BaOmer | Very mixed in practice (Lag BaOmer, Lag B'Omer, Lag Ba'omer). Pick the one your clients use most. |
| `yom-haatzmaut` | יוֹם הָעַצְמָאוּת | Yom Ha'atzmaut | Yom Ha'atzmaut | Yom ha-Atzma'ut | Yom Ha'atzmaut | Apostrophe or none (Yom Ha'atzmaut / Yom Haatzmaut); both are common. |
| `neilah` | נְעִילָה | Ne'ilah | Neilah | Ne'ilah | Neilah | With or without the apostrophe (Ne'ilah / Neilah). |
| `maariv` | מַעֲרִיב | Ma'ariv | Maariv | Ma'ariv | Maariv | With or without the apostrophe (Ma'ariv / Maariv). |
| `daat` | דַּעַת | da'at | da'at | da'at | daas | With or without the apostrophe (da'at / daat). |

### Capitals (6)

| Term | Hebrew | Modern ch | Modern h/kh | Academic | Ashkenazi | Question |
|---|---|---|---|---|---|---|
| `shanah-tovah` | שָׁנָה טוֹבָה | Shanah Tovah | Shanah Tovah | shanah tovah | Shanah Tovah | Capitalized as a greeting in the modern and Ashkenazi styles, lowercase for academic. |
| `sefirat-haomer` | סְפִירַת הָעֹמֶר | Sefirat Haomer | Sefirat Haomer | Sefirat ha-Omer | Sefiras Haomer | Capital O or not in Haomer/HaOmer varies a lot; I went with Haomer. |
| `bar-mitzvah` | בַּר מִצְוָה | bar mitzvah | bar mitzvah | bar mitzvah | bar mitzvah | AP and Chicago lowercase bar mitzvah; many Jewish publishers capitalize it. |
| `hamotzi` | הַמּוֹצִיא | Hamotzi | Hamotzi | ha-Motzi | Hamotzi | Capital or not (Hamotzi / hamotzi) varies. |
| `chasid` | חָסִיד | chasid / pl. chasidim | hasid / pl. hasidim | ḥasid / pl. ḥasidim | chasid / pl. chasidim | Often capitalized (Chasid, Hasidim) when it means the movement; Translit keeps a capital the text has. Modern ch: chasid or chassid? |
| `chasidic` | חֲסִידִי | Chasidic | Hasidic | Ḥasidic | Chassidic | Capitalized, as in AP style (Hasidic). Modern ch: Chasidic or Chassidic? |

### Yiddish and YIVO (12)

| Term | Hebrew | Modern ch | Modern h/kh | Academic | Ashkenazi | Question |
|---|---|---|---|---|---|---|
| `hamantasch` | המן־טאַש | hamantasch / pl. hamantaschen | hamantasch / pl. hamantaschen | homentash / pl. homentashn | hamantasch / pl. hamantaschen | hamantaschen (the commonest American spelling) or hamantashen? |
| `blintz` | בלינצע | blintz | blintz | blintse | blintz | The singular is blintz or blintze; YIVO has blintse. |
| `pareve` | פּאַרעווע | pareve | pareve | parve | pareve | pareve or parve? Both are on kosher labels. |
| `treif` | טרייף | treif | treif | treyf | treif | The Yiddish spelling of the Hebrew word is uncertain here (טרייף or טרפֿ). |
| `shtetl` | שטעטל | shtetl / pl. shtetls | shtetl / pl. shtetls | shtetl / pl. shtetlekh | shtetl / pl. shtetlach | Plural: English shtetls for the modern styles, shtetlekh (YIVO) for academic, shtetlach for Ashkenazi. |
| `bentch` | בענטשן | bentch | bentch | bentsh | bentch | bench is left out on purpose (an English word). Academic bentsh is a guess at a YIVO-style stem. |
| `schlemiel` | שלומיאל | schlemiel | schlemiel | shlemil | schlemiel | Unsure of the Yiddish spelling (שלומיאל / שלעמיל). |
| `meshuga` | משוגע | meshuga | meshuga | meshuge | meshuga | meshuga, meshugga or meshugah: dictionaries disagree. |
| `yontif` | יום־טובֿ | yontif | yontif | yontef | yontif | YIVO form yontef: please confirm. |
| `shalach-manos` | שלח־מנות | shalach manos | shalach manos | shalakhmones | shalach manos | YIVO form unsure (shalakhmones / shalekhmones). |
| `purim-shpiel` | פּורים־שפּיל | Purim spiel | Purim spiel | purim-shpil | Purim spiel | Purim spiel (English) or Purim shpiel? |
| `kinehora` | קיין עין־הרע | kinehora | kinehora | keynehore | kinehora | Dozens of spellings exist. YIVO form unsure (keynehore / keyn eyn-hore). |

### Choices I made on purpose (28)

These aren't questions, just decisions you might want to know about.

- `sukkot` (Sukkot): Same letters as sukkot, the plural of sukkah. Translit tells them apart by the capital: Sukkot is the festival, sukkot the booths. A capitalized plural at the start of a sentence will be read as the festival.
- `erev` (erev): Mostly a question of the capital (Erev Shabbat or erev Shabbat). Lowercase here, and Translit keeps a capital the text already has.
- `nisan` (Nisan): Nissan is the usual Orthodox spelling. It's also a carmaker, which only matters if the text mentions cars.
- `shabbat-shalom` (Shabbat Shalom): Kept as Shabbat Shalom in every style, so the Ashkenazi style doesn't turn it into Shabbos Shalom (Ashkenazim say Gut Shabbos instead).
- `seudah-shlishit` (Seudah Shlishit): Seudat Shlishit (construct) is common but not quite right; it's listed as a spelling to fix.
- `shalosh-seudot` (Shalosh Seudot): A different name from Seudah Shlishit, so the two aren't merged.
- `kedushah` (kedushah): Lowercase as a concept, capitalized as the prayer. Translit keeps a capital the text already has.
- `hagbah` (hagbah): hagbah is the spoken form; hagbahah is the full word. I gave the full word to academic only.
- `navi` (navi): As the section of the Bible it's usually capitalized (Navi, Nevi'im); Translit keeps a capital the text has.
- `megillah` (megillah): Capitalized for the Book of Esther, lowercase as “the whole megillah.” The form is lowercase so the idiom isn't capitalized; a capital in the text is kept.
- `sukkah` (sukkah): The plural sukkot has the same letters as the festival Sukkot; see the note there.
- `aron-hakodesh` (aron hakodesh): aron kodesh (without the article) is also common; it's left alone, because it's a different phrase.
- `bris` (brit): Only matched in lowercase (or capitalized at the start of a sentence), because Brit also means a British person.
- `el-malei-rachamim` (El Malei Rachamim): Many Ashkenazim say Keil Malei Rachamim; that's a different word, so it's left alone.
- `matzo-ball` (matzo ball): Kept as the dish's usual English name in every style; make it matzah ball if a client wants it to match matzah. The Hebrew column shows the Yiddish kneidel, as there's no settled Hebrew name.
- `eretz-yisrael` (Eretz Yisrael): Eretz Israel (half English) is listed as a spelling to fix; take it out if a client uses it on purpose.
- `hashem` (Hashem): Academic writing usually just says God; ha-Shem is there for quotations.
- `olam-haba` (olam haba): Often capitalized (Olam Haba). Lowercase here, and a capital in the text is kept.
- `mesirut-nefesh` (mesirut nefesh): Ashkenazi mesiras nefesh is common but not quite right; it's listed as a spelling to fix.
- `assur` (assur): assur has a double s that the Hebrew doesn't (אָסוּר); asur is closer, but assur is how it's usually written.
- `rebbe` (rebbe): Lowercase so “my rebbe” (a teacher) stays lowercase; “the Rebbe” keeps its capital.
- `kohen` (kohen): Often capitalized (Kohen). Cohen isn't searched for, because it's a surname.
- `chasidism` (Chasidism): The English noun for the movement; Chassidus/Chassidut (the teaching) is its own entry.
- `shamash` (shamash): Ashkenazi writers often use the Yiddish shammes, which is listed as a spelling to fix. The Yiddish shames is left out because it is also an English word.
- `shaliach-tzibbur` (shaliach tzibbur): The Hebrew is sheliach (construct); shaliach tzibbur is how most people say it.
- `daven` (daven): Verbs keep the English-style stem in every style (davening, davened); YIVO has the infinitive davnen.
- `chutzpah` (chutzpah): English dictionaries spell it chutzpah, so I kept that for h/kh too.
- `reb` (Reb): Only matched exactly as Reb or reb, so it can't catch anything else.
