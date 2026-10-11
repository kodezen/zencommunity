import axios from 'axios';
let globalHeaders = {};
let globalBaseUrl = '';

const combineUrls = (baseUrl, relativeUrl) => {
  if (!baseUrl) return relativeUrl || '';
  if (!relativeUrl) return baseUrl;
  if (!baseUrl.endsWith('/')) baseUrl += '/';
  if (relativeUrl.startsWith('/')) relativeUrl = relativeUrl.slice(1);
  return baseUrl + relativeUrl;
}

const appendFormData = (formData, data, parentKey = '') => {
  if (data && typeof data === 'object' && !(data instanceof File) && !(data instanceof Blob)) {
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        const fullKey = parentKey ? `${parentKey}[${key}]` : key;
        appendFormData(formData, data[key], fullKey);
      }
    }
  } else {
    formData.append(parentKey, data);
  }
}

export const request = (method, url, data = {}, isJson = true, headers = {}) => {
    const fullUrl = combineUrls(globalBaseUrl, url);
  
    const config = {
      method,
      url: fullUrl,
      headers: { ...globalHeaders, ...headers },
    };

    const isFormData = isJson === false;

    if (method === 'GET' || method === 'DELETE') {
      config.params = data;
    } else {
      if (isFormData) {
        const formData = data instanceof FormData ? data : new FormData();
        if (!(data instanceof FormData)) {
          appendFormData(formData, data);
        }
        config.data = formData;
        delete config.headers['Content-Type'];
      } else {
        config.data = data;
        config.headers['Content-Type'] = 'application/json';
      }
    }

  return axios(config)
    .then(res => res.data)
    .catch(err => {
      console.error(`${method} failed:`, err);
      throw err;
    });
}

export default {
    setHeader: (key, value) => {
        if (typeof key === 'string') {
        globalHeaders[key] = value;
        } else if (typeof key === 'object') {
        globalHeaders = { ...globalHeaders, ...key };
        }
    },
    setBaseUrl: (url) => {
        globalBaseUrl = url;
    },
    get: (url, data = {}, isJson = true, headers = {})    => request('GET', url, data, isJson, headers),
    delete: (url, data = {}, isJson = true, headers = {}) => request('DELETE', url, data, isJson, headers),
    post: (url, data = {}, isJson = true, headers = {})   => request('POST', url, data, isJson, headers),
    put: (url, data = {}, isJson = true, headers = {})    => request('PUT', url, data, isJson, headers),
    patch: (url, data = {}, isJson = true, headers = {})  => request('PATCH', url, data, isJson, headers)
}