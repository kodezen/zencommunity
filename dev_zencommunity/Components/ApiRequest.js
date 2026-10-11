
import request from '../Admin/Utils/Request.js';
request.setBaseUrl(`${ZencommunityGlobal.rest_url}zencommunity/v1`)
request.setHeader({
  'X-WP-Nonce': ZencommunityGlobal.nonce,
});
export default request;