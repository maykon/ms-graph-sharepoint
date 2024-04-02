import fs from 'fs/promises';
import { BaseError, prompt } from '@maykoncapellari/cli-builder';
import NormalizeUtils from '../utils/normalize.js';

/**
 * Microsoft Graph Service
 * 
 * This class allow connect to ms graph, make the requests and upload some files to sharepoint folders.
 * 
 * @class
 * @example
 * const msService = new MsGraphService({ ...params });
 * await msService.signIn();
 * // Will read '~/attachmentsDir/myfile.pdf' and put on 'me/drive/root/My Sharepoint Docs/myfile.pdf' on sharepoint
 * await msService.uploadFile({ attachmentDir: '~/attachmentsDir', folderName: 'My Sharepoint Docs', file: 'myfile.pdf');
 * const profile = await msService.requestGraphGet('me'); // Get my profile data
 * await msService.logout();
 */
export default class MsGraphService {
  static #msRedirectUri = 'https://login.live.com/oauth20_desktop.srf';
  static #msGraphAuthUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/'
  static #msGraphUrl = 'https://graph.microsoft.com/v1.0/';
  static #msScopes = 'openid offline_access User.Read Files.ReadWrite.All';
  static #MAX_RETRIES = 3;
  static #msDomainUrl = 'https://%s.sharepoint.com/';

  #msDomain;
  #msClientId;
  #msClientSecret;
  #msCode;
  #msAccessToken;
  #msRefreshToken;
  #sharepointFolder;
  #sharepointFolderUrl;
  #isDebug;
  #shouldLogToken;

  /**
   * The Params MsGraphService.
   * 
   * @typedef {Object} MsGraphServiceParams
   * @property {string} domain - The Microsoft Sharepoint domain.
   * @property {string} client - The Microsoft APP ClientID.
   * @property {string} secret - The Microsoft APP ClientSecret.
   * @property {string} [token] - The Microsoft Access Token (When defined the client and secret is ignored)
   * @property {string} [sharepointFolder] - The Microsoft Sharepoint folder used on upload files (Default: 'me/drive/root').
   * @property {string} [sharepointFolderUrl] - The Microsoft Sharepoint folder URL used on upload files (Default: 'Shared Documents/').
   * @property {boolean} [debug] - Define debug mode (Default: false)
   * @property {boolean} [logToken] - Define if will log the access token after sigIn (Default: false)
   */

  /**
   * 
   * @constructor
   * @param {MsGraphServiceParams} params
   */
  constructor({ domain, client, secret, token, sharepointFolder, sharepointFolderUrl, debug, logToken }) {
    if (!client) {
      throw new BaseError('⚠️ The Microsoft APP ClientID is required!');
    }
    if (!secret) {
      throw new BaseError('⚠️ The Microsoft APP ClientSecret is required!');
    }

    this.#msDomain = domain;
    this.#sharepointFolderUrl = sharepointFolderUrl || 'Shared Documents/';
    this.#msClientId = client;
    this.#msClientSecret = secret;
    this.logout();
    this.#msAccessToken = token;
    this.#sharepointFolder = sharepointFolder || 'me/drive/root';
    this.#isDebug = debug || process.env.MS_GRAPH_DEBUG === 'true';
    this.#shouldLogToken = logToken === 'true';
  }

  #generateAuthorizeRequest() {
    return `${MsGraphService.#msGraphAuthUrl}authorize?client_id=${this.#msClientId}&response_type=code&redirect_uri=${MsGraphService.#msRedirectUri}&response_mode=query&scope=${encodeURIComponent(MsGraphService.#msScopes)}&state=12345`;
  }

  #debug(path, message) {
    if (this.#isDebug) {
      console.debug(`\n⚠️  ${path}`);
      console.debug(message);
      console.debug();
    }
  }

  #debugResponse(path, response) {
    const { url, status, statusText, body } = response;
    return this.#debug(path, { url, status, statusText, body });
  }

  async #requestAuthorizationToken(token, grant_type = 'authorization_code') {
    const tokenKey = grant_type === 'refresh_token' ? grant_type : 'code';
    try {
      const body = new FormData();
      body.append('client_id', this.#msClientId);
      body.append('client_secret', this.#msClientSecret);
      body.append('scope', MsGraphService.#msScopes);
      body.append('redirect_uri', MsGraphService.#msRedirectUri);
      body.append('grant_type', grant_type);
      body.append(tokenKey, token);

      const authorization = await fetch(`${MsGraphService.#msGraphAuthUrl}token`, {
          method: 'POST',
          'Content-Type': 'application/x-www-url-form-urlencoded',
          body,
        }).then((r) => {
          this.#debugResponse('RequestAuthorizationToken', r);
          return r.json();
        });
      this.#debug('RequestAuthorizationToken', authorization);
      if (authorization.error) {
        throw new BaseError(authorization.error?.message || 'Error in get authorization token');
      }
      this.#setAuthorizationTokens(authorization);
      return authorization;
    } catch (error) {
      this.#debug('RequestAuthorizationToken', error);
      throw new BaseError(`Cannot get the Sharepoint authorization ${tokenKey}`);
    }    
  }

  get sharepointFolder() {
    return this.#sharepointFolder;
  }

  #setAuthorizationTokens(authorization) {
    this.#msAccessToken = authorization.access_token;
    this.#msRefreshToken = authorization.refresh_token;
    if(this.#shouldLogToken) {
      console.info('🔑 MS Access Token: %s\n', this.#msAccessToken);
    }
  }

  async #getMyInfo() {
    return this.requestGraphGet('me');
  }

  #getResponseLog(response) {
    const { url, status, statusText } = response;
    return { url, status, statusText };
  }

  async #refreshToken() {
    try {
      this.#debug('RefreshToken', this.#msRefreshToken);
      return this.#requestAuthorizationToken(this.#msRefreshToken, 'refresh_token');
    } catch (error) {
      this.#debug('RefreshToken', error);
      throw new BaseError('Cannot renew the current token, please try login again!');
    }
  }

  async #internalRequest(url, method, body, headers) {
    return fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${this.#msAccessToken}`,
        ...headers,
      },
      body,
    });
  }

  async #renewTokenWithNeeded(url, method, body, headers) {
    try {
      let response = await this.#internalRequest(url, method, body, headers);
      if (response.status === 401) {
        await this.#refreshToken();
        response = await this.#internalRequest(url, method, body, headers);
      }
      this.#debug('RenewTokenWithNeeded', this.#getResponseLog(response));
      if (response.status === 401) {
        throw new BaseError(response.statusText);
      }
      return response.json();
    } catch (error) {
      this.#debug('RenewTokenWithNeeded Error', error);
      throw error;
    }
  }

  /**
   * The Params RequestConflictParams.
   * 
   * @typedef {Object} RequestConflictParams
   * @property {error|etag} type - The type to resolve the conflict
   * @property {string|random} itemNameResolver - The way will be resolve the item name - concat fixed text or random
   */

  /**
   * The Params RequestApiParams.
   * 
   * @typedef {Object} RequestApiParams
   * @property {string} url - The url that will be requested
   * @property {GET|POST|PUT|DELETE} method - The HTTP method for request
   * @property {*} [body] - The body used in the request
   * @property {*} [headers] - The headers used in the request
   * @property {RequestConflictParams} [conflict] - The conflict resolver config
   */

  /**
   * Request a Graph endpoint
   * 
   * @param {RequestApiParams} param 
   * @returns 
   */
  async #requestGraphApi({ url, method, body, headers = {}, conflict }) {
    let retry = 1;
    let response = null;
    while(retry <= MsGraphService.#MAX_RETRIES) {
      try {
        response = await this.#renewTokenWithNeeded(`${MsGraphService.#msGraphUrl}${url}`, method, body, headers);
        this.#debug('RequestGraphApi', response);
        if (response.error) {
          console.error('#requestGraphApi: ', url, response);
          if (/IO error during request payload read/.test(response.error.message)) {
            return null;
          }
          throw new BaseError(`Error in request [${method}]: ${url}`, response.error);
        }
        break;
      } catch(error) {
        this.#debug('RequestGraphApi', { url, error: `Retrying ${retry++} time(s)`, throwed: error });
      }
    }
    if (retry > MsGraphService.#MAX_RETRIES) {
      throw new BaseError(`Max retries error in request [${method}]: ${url}`);
    }
    return response;
  }

  /**
   * Make the GET request to a specific endpoint
   * 
   * @param {string} url 
   * @param {*} [headers]
   * @returns 
   */
  async requestGraphGet(url, headers) {
    return this.#requestGraphApi({ url, method: 'GET', headers });
  }

  /**
   * Make the POST request to a specific endpoint
   * 
   * @param {string} url 
   * @param {*} [body]
   * @param {*} [headers]
   * @returns 
   */
  async requestGraphPost(url, body, headers) {
    return this.#requestGraphApi({ url, method: 'POST', body, headers });
  }

  /**
   * Make the PUT request to a specific endpoint
   * 
   * @param {string} url 
   * @param {*} [body]
   * @param {*} [headers]
   * @param {RequestConflictParams} [conflict]
   * @returns 
   */
  async requestGraphPut(url, body, headers, conflict) {
    return this.#requestGraphApi({ url, method: 'PUT', body, headers, conflict });
  }

  /**
   * Make the DELETE request to a specific endpoint
   * 
   * @param {string} url 
   * @param {*} [body]
   * @param {*} [headers]
   * @returns 
   */
  async requestGraphDelete(url, body, headers) {
    return this.#requestGraphApi({ url, method: 'DELETE', body, headers });
  }

  async #fileExists(filename) {
    return fs.access(filename, fs.constants.F_OK)
      .then(() => true)
      .catch(() => false);
  }

  /**
   * The Params UploadFileParams.
   * 
   * @typedef {Object} UploadFileParams
   * @property {string} attachmentDir - The path to a directory that contains the file to be uploaded
   * @property {string} folderName - the URL Path that will be save the file on Sharepoint (If the folder/path not exists will be created)
   * @property {string} file - The filename from the file that is inside of `attachmentDir` and will be saved on Sharepoint
   * @property {RequestConflictParams} [conflict] - The conflict resolver config
   */

  /**
   * Upload some file to a specific folder on Sharepoint
   * 
   * @param {UploadFileParams} params - The params for upload file
   * @returns 
   * 
   * @example
   * // Will read '~/attachmentsDir/myfile.pdf' and put on 'me/drive/root/My Sharepoint Docs/myfile.pdf' on sharepoint
   * await msService.uploadFile({ attachmentDir: '~/attachmentsDir', folderName: 'My Sharepoint Docs', file: 'myfile.pdf' });
   */
  async uploadFile({ attachmentDir, folderName, file, conflict }) {
    const fileName = file.split('/').at(-1);
    const urlFile = this.#sharepointFolder.concat(`:/${folderName}/${NormalizeUtils.encode(fileName)}:/content`);
    try {
      const filePath = attachmentDir.concat(`/${file}`);
      const fileExist = await this.#fileExists(filePath);
      this.#debug('uploadFile', `File exists? ${fileExist}`);
      if (!fileExist) {
        this.#debug('uploadFile', `File ${filePath} not exists.`);
        return null;
      }
      const fileContent = await fs.readFile(attachmentDir.concat(`/${file}`));
      const response = await this.requestGraphPut(urlFile, fileContent, null, conflict);
      if (response?.error) {
        this.#debug('UploadFile', response.error);
        throw new BaseError(response.error?.message || 'Error in upload file', response?.error);
      }
      return response;
    } catch (error) {
      this.#debug('UploadFile', { urlFile, error });
      throw new BaseError(`Cannot upload a new file in ${urlFile}`, error);
    }    
  }

  /**
   * Sign In on Microsoft get the access token and refresh token
   * 
   * @returns 
   */
  async signIn() {
    console.info('💡 Sharepoint Authentication step\n');
    if (this.#msAccessToken) {
      console.info('🔑 Sharepoint access token already informed.\n');
      await this.#getMyInfo();
      return;
    }
    const authorizeUrl = this.#generateAuthorizeRequest();
    this.#msCode = await prompt.question(`📢 Please open the following URL in your browser and follow the steps until you see a blank page:
${authorizeUrl}
    
When ready, please enter the value of the code parameter (from the URL of the blank page) and press return...\n`);
    prompt.close();
    console.log();
    await this.#requestAuthorizationToken(this.#msCode);
  }

  /**
   * Log out - Clean all tokens
   */
  logout() {
    this.#msCode = null;
    this.#msAccessToken = null;
    this.#msRefreshToken = null;
  }

  /**
   * Return the complete Sharepoint Url from some partial URL file
   * 
   * @param {*} - Partial url file 
   * @returns Return the complete Sharepoint url
   */
  getSharepointUrl(url) {
    return MsGraphService.#msDomainUrl.replace(/%s/, this.#msDomain).concat(this.#sharepointFolderUrl).concat(url);
  }
}