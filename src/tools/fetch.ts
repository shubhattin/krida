type str_dict = {
  [x in string]: string;
};

type options = Parameters<typeof fetch>[1] & {
  json?: any;
  form?: str_dict;
  params?: str_dict;
  headers?: str_dict;
  locale?: string;
};

/**
 * PreDefined and Specialized POST request maker
 * @param url Request url
 * @param op Options to pass into the `fetch` function
 * @returns `Promise<fetch_response>`
 */
const AharaNam = (url: string, op: options = {}) => {
  if (!op.headers) op.headers = {};
  if ('params' in op) {
    let params = [] as string[];
    for (let prm in op.params) params.push(`${prm}=${encodeURIComponent(op.params[prm])}`);
    url += `?${params.join('&')}`;
    delete op.params;
  } else if ('json' in op) {
    op.body = JSON.stringify(op.json);
    delete op.json;
    op.headers['content-type'] = 'application/json';
  } else if ('form' in op) {
    const data = new FormData();
    for (let pair in op.form) {
      data.append(pair, op.form[pair]);
    }
    delete op.form;
    op.body = data;
  }
  if (typeof document !== 'undefined') {
    const htmlID = document.querySelector('html')?.lang;
    if (!op.locale && htmlID) op.locale = htmlID;
  }
  if (op.locale) {
    op.headers['X-bhAShA'] = op.locale;
    // op.headers['Accept-Language'] = op.locale;
  }
  // url = (!url.startsWith('http') && !op.noUrlAdd ? URL : '') + url;
  // ^ this can be used when we want to prefix the request with some external url
  return fetch(url, op);
};
export const fetch_post = (url: string, op: options = {}) => {
  op.method = 'POST';
  return AharaNam(url, op);
};
export const fetch_get = (url: string, op: options = {}) => {
  op.method = 'GET';
  return AharaNam(url, op);
};
export const Fetch = (url: string, op: options = {}) => {
  return AharaNam(url, op);
};
