export class lipi_helper {
  constructor() {
    this.akSharAH = {
      Normal: {}
    };
    this.k = null;
    this.alph = ['ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'];
    this.lang_in = (x) => x in this.akSharAH;
    this.langs = [
      'Normal',
      'Assamese',
      'Bengali',
      'Brahmi',
      'Granth',
      'Gujarati',
      'Hindi',
      'Kannada',
      'Konkani',
      'Malayalam',
      'Marathi',
      'Modi',
      'Nepali',
      'Odia',
      'Punjabi',
      'Purna-Devanagari',
      'Romanized',
      'Sanskrit',
      'Sharada',
      'Siddham',
      'Sinhala',
      'Tamil-Extended',
      'Tamil',
      'Telugu',
      'Urdu',
      'Kashmiri',
      'Sindhi'
    ];
    this.alts = {
      en: 0,
      English: 0,
      as: 1,
      bn: 2,
      Bangla: 2,
      ben: 2,
      br: 3,
      gr: 4,
      gu: 5,
      guj: 5,
      hi: 6,
      hin: 6,
      kn: 7,
      kan: 7,
      ko: 8,
      kok: 8,
      ml: 9,
      mal: 9,
      mr: 10,
      mar: 10,
      mo: 11,
      mod: 11,
      ne: 12,
      nep: 12,
      Oriya: 13,
      or: 13,
      Odiya: 13,
      pa: 14,
      pan: 14,
      pn: 14,
      Gurumukhi: 14,
      guru: 14,
      'pu-de': 15,
      'pu-dev': 15,
      'pur-dev': 15,
      Romanised: 16,
      ro: 16,
      rom: 16,
      sa: 17,
      san: 17,
      dev: 17,
      Devanagari: 17,
      de: 17,
      sh: 18,
      shr: 18,
      sid: 19,
      si: 20,
      sin: 20,
      'ta-ex': 21,
      'tam-ex': 21,
      ta: 22,
      tam: 22,
      te: 23,
      tel: 23,
      ur: 24
    };

    this.pUrNasarve = this.alph[0] + this.alph[1] + "01234567890'$.#?";
  }
  normalize(ln) {
    // function to normalize the names of scripts
    let a = ln.trim().split('-');
    for (let x = 0; x < a.length; x++) a[x] = a[x].charAt(0).toUpperCase() + a[x].substring(1);
    let ln1 = a.join('-');
    if (this.in(this.langs, ln1)) return ln1;
    else if (ln in this.alts) return this.langs[this.alts[ln]];
    else return false;
  }
  async load_lang(lang, callback = null, block = false, norm = true, base_folder_path = './src') {
    if (norm) lang = this.normalize(lang);
    // for the current scenario the lang files dont pose a problem in 1mb size limit of
    // edge fucntions so ignore the loading it it fow now
    if (!(lang in this.akSharAH)) {
      // this part should be used fot vitest and svelte
      const data = (await import('./resources/dattAMsh/' + lang + '.json')).default[0];
      if (callback) callback();
      this.akSharAH[lang] = data;
    } else if (callback != null) callback();
  }
  in(in_what, what) {
    return in_what.indexOf(what) != -1;
  }
  reg_index(str, pattern) {
    let ind = [],
      mtch = 0;
    while ((mtch = pattern.exec(str)) != null) ind.push([mtch.index, mtch[0]]);
    return ind;
  }
  is_lower(b) {
    return this.in(this.alph[1], b);
  }
  is_null(k) {
    return k == null || k == undefined;
  }
  is_upper(b) {
    return this.in(this.alph[0], b);
  }
  to_lower(b) {
    return this.alph[1][this.alph[0].indexOf(b)];
  }
  to_upper(b) {
    return this.alph[0][this.alph[1].indexOf(b)];
  }
  time() {
    let a = new Date();
    return a.getTime() / 1000;
  }
  replace_all(str, replaceWhat, replaceTo) {
    replaceWhat = replaceWhat.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    var re = new RegExp(replaceWhat, 'g');
    return str.replace(re, replaceTo);
  }
  last(s, l = -1) {
    if (s == null || s == undefined) return '';
    let r = s[s.length + l];
    return r;
  }
  dict_rev(d) {
    let res = {};
    for (let x in d) {
      res[d[x]] = x;
    }
    return res;
  }
  substring(val, from, to = null) {
    if (to == null) to = val.length;
    if (to > 0) return val.substring(from, to);
    else if (to < 0) return val.substring(from, val.length + to);
  }
  format(val, l) {
    for (let x = 0; x < l.length; x++) val = this.replace_all(val, `{${x}}`, l[x]);
    return val;
  }
}
