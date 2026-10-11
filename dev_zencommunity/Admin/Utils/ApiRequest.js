import request from './Request.js';
request.setBaseUrl(`${zencommunitySettings.root}zencommunity/v1`)
request.setHeader({
  'X-WP-Nonce': zencommunitySettings.nonce,
});
export default request;