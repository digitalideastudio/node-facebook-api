import fetch, { Response as NodeResponse } from 'node-fetch';
import querystring, { ParsedUrlQueryInput } from 'querystring';
import crypto from 'crypto';

export interface NodeFacebookConfig {
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  scope: string;
  mobile?: boolean;
  version?: string;
  debug?: boolean;
}

// const fb = new NodeFacebook({ ... });
// const url = fb.getGraphUrl(); // auth & code & send to the frontend so user can see FB OAuth2 Consent window
// fb.authenticate('123456789'); // specify the code sent by frontend once user authenticated in FB OAuth2 Consent window
// const profile = await fb.get('/me');

export default class NodeFacebook {
  protected oAuthDialogUrl!: string;

  protected oAuthDialogUrlMobile!: string;

  protected defaultVersion = '8.0';

  protected graphUrl!: string;

  public accessToken: string = '';

  constructor(protected config: NodeFacebookConfig) {
    const version = config.version || this.defaultVersion;

    this.setVersion(version);
  }

  /**
   * Accepts an url an returns facebook json data
   *
   * if the response is an image
   * ( FB redirects profile image requests directly to the image )
   * We'll send back json containing  {image: true, location: imageLocation }
   *
   * Ex:
   *
   *    Passing params directly in the url
   *
   *      fb.get("zuck?fields=picture")
   *
   *    OR
   *
   *      const params = { fields: picture };
   *      fb.get("zuck", params);
   *
   *    GraphApi calls that redirect directly to an image
   *    will return a json response with relavant fields
   *
   *      fb.get("/zuck/picture");
   *
   *      {
   *        image: true,
   *        location: "http://profile.ak.fbcdn.net/hprofile-ak-snc4/157340_4_3955636_q.jpg"
   *      }
   *
   *
   * @param {object} params
   * @param {string} url
   */

  public async get(url: string, params?: ParsedUrlQueryInput) {
    const normalizedUrl = this.normalizeUrl(url, params);

    return fetch(normalizedUrl,{
      method: 'get',
      follow: 0,
    }).then(this.processResponse);
  }

  /**
   * Publish to the facebook graph
   * access token will be needed for posts
   * Ex:
   *
   *    const wallPost = { message: "heyooo budday" };
   *    fb.post(friendID + "/feed", wallPost);
   *
   * @param {string} url
   * @param {object} postData
   */

  public async post (url: string, postData: any) {
    // postData = url.indexOf('access_token') !== -1 ? {} : {access_token: this.accessToken};
    const normalizedUrl = this.normalizeUrl(url);

    return fetch(normalizedUrl, {
      method: 'post',
      follow: 0,
      body: JSON.stringify(postData)
    }).then(this.processResponse);
  }

  /**
   * Deletes an object from the graph api
   * by sending a "DELETE", which is really
   * a post call, along with a method=delete param
   *
   * @param {string} url
   * @param {object} postData (optional)
   */

  public async delete (url: string, postData?: any) {
    if (!url.match(/[?|&]method=delete/i)) {
      url += ~url.indexOf('?') ? '&' : '?';
      url += 'method=delete';
    }

      postData = url.indexOf('access_token') !== -1 ? {} : {access_token: this.accessToken};

    return this.post(url, postData);
  }


  /**
   * Perform a search on the graph api
   *
   * @param {object} options (search options)
   */

  public async search (options: ParsedUrlQueryInput) {
    const url = '/search?' + querystring.stringify(options || {});

    return this.get(url);
  }

  /**
   * Perform a batch query on the graph api
   *
   * @param  {Array}    reqs     An array containing queries
   * @param  {[Object]} additionalData Additional data to send, e.g. attachments or the `include_headers` parameter.
   *
   * @see https://developers.facebook.com/docs/graph-api/making-multiple-requests
   */

  public async batch (reqs: any[], additionalData: any) {
    return this.post('', Object.assign({}, {
      access_token: this.accessToken,
      batch: JSON.stringify(reqs)
    }, additionalData));
  };


  /**
   * Perform a fql query or multi-query
   * multi-queries are done by sending in
   * an object :
   *
   *     const query = {
   *         name:         "SELECT name FROM user WHERE uid = me()"
   *       , permissions:  "SELECT " + FBConfig.scope + " FROM permissions WHERE uid = me()"
   *     };
   *
   * @param {string/object} query
   * @param {object} params
   */
  public async fql (query: object, params?: any) {
    const url = '/fql?q=' + encodeURIComponent(JSON.stringify(query));

    return this.get(url, params);
  }


  /**
   * @returns the oAuthDialogUrl based on params
   */
  public async getOAuthUrl (): Promise<string> {
    const url = this.config?.mobile ? this.oAuthDialogUrlMobile : this.oAuthDialogUrl;

    return url + querystring.stringify({
      client_id: this.config.client_id,
      redirect_uri: this.config.redirect_uri,
      scope: this.config.scope,
    });
  }

  /**
   * Authorizes user and sets the
   * accessToken if everything worked out
   *
   * @param code
   */

  public async authorize(code: string) {
    const params = {
      client_id: this.config.client_id,
      redirect_uri: this.config.redirect_uri,
      scope: this.config.scope,
      code: code,
    }

    this.accessToken = await this.get("/oauth/access_token", params).then(response => response.access_token);

    return this.accessToken;
  }

  /**
   * Extends the expiration time of accessToken
   */

  public async extendAccessToken(access_token?: string) {
    const params = {
      grant_type: 'fb_exchange_token',
      fb_exchange_token: access_token || this.accessToken,
    }

    this.accessToken = await this.get("/oauth/access_token", params).then(response => response.access_token);

    return this.accessToken;
  }

  /**
   * Set's the Graph API version.
   * Note that you don't need to specify the 'v', just
   * add '2.1', '1.1' etc
   * @param {string} version
   */
  public setVersion (version: string) {
    this.config.version = version;
    this.oAuthDialogUrl = `https://www.facebook.com/v${version}/dialog/oauth?`;
    this.oAuthDialogUrlMobile = `https://m.www.facebook.com/v${version}/dialog/oauth?`;
    this.graphUrl = `https://graph.facebook.com/v${version}`;

    return this;
  }

  private normalizeUrl(rawUrl: string, params?: ParsedUrlQueryInput) {
    let url = rawUrl.trim();

    url += ~url.indexOf('?') ? '&' : '?';

    // add leading slash
    if (url.charAt(0) !== '/' && url.substr(0, 4) !== 'http') url = '/' + url;

    // add access token to url
    if (this.accessToken && url.indexOf('access_token=') === -1) {
      url += "access_token=" + this.accessToken;
    }

    // add appSecret_proof to the url
    if (this.accessToken && this.config.client_secret && url.indexOf('appsecret_proof') === -1) {
      const hmac = crypto.createHmac('sha256', this.config.client_secret);
      hmac.update(this.accessToken);
      url += ~url.indexOf('?') ? '&' : '?';
      url += "appsecret_proof=" + hmac.digest('hex');
    }

    if (params)  {
      url += ~url.indexOf('?') ? '&' : '?';
      url += querystring.stringify(params);
    }

    url = `${this.graphUrl}${url}`

    if (this.config.debug) {
      console.log(`Performing a call to URL: ${url}`);
    }

    return url;
  }

  protected processResponse(response: NodeResponse): Promise<any> {
    return response.json();
  }
}
