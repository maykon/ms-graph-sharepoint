
/**
 * Normalize utils class
 * 
 * Helper methods to allow normalize, encode and decode texts based on sharepoint patterns
 * 
 * @class
 */
export default class NormalizeUtils {

  /**
   * Remove links in text
   * 
   * @param {string} text 
   * @returns {string}
   */
  static removeLinks(text) {
    return text.replace(/https?:\/\/[^ ~]+/g, '');
  }  
  
  /**
   * Normalize the text to put on sharepoint
   * 
   * @static
   * @param {string} text - Text to be normalized
   * @returns 
   */
  static normalize(text) {
    const normalizedTxt = NormalizeUtils.removeLinks(text).replace(/\*/g, '')
      .replace(/"|\{|\}|\*|:|<|>|\?|\/|\%|\+|\|/g, '')
      .replace(/\r|\t/g, '')
      .replace(/\n/g, ' - ')
      .replace(/\&/g, 'and')
      .replace(/\.+/, '.')
      .replace(/^~/, '')
      .replace(/^\.|\.$/, '')
      .replace(/\s+/, ' ')
      .trim();
    return NormalizeUtils.replaceOutlookInvalidNames(normalizedTxt);
  }

  /**
   * Replace the invalid names from sharepoint
   * 
   * @static
   * @param {string} str 
   * @returns {string}
   */
  static replaceOutlookInvalidNames(str) {
    const invalidNames = ['.lock','CON','PRN','AUX','NUL','_vti_','desktop.ini',
      ...[...Array(10)].map((_, i) => `COM${i}`),
      ...[...Array(10)].map((_, i) => `LPT${i}`),
      ];
    const numberTxt = (Math.random() * 1000).toFixed(0);
    if (/_vti_/.test(str)) {
      return 'vti'.concat(numberTxt);
    }
    if (invalidNames.includes(str)) {
      return str.concat(numberTxt);
    }
    return str;
  }

  /**
   * Normalize and encode the text using RFC 3986
   * 
   * @static
   * @param {string} text 
   * @returns {string}
   */
  static encode(text) {
    return NormalizeUtils.encodeRFC3986URIComponent(NormalizeUtils.normalize(text));
  }

  /**
   * Encode text using RFC 3986
   * 
   * @static
   * @param {string} str 
   * @returns {string}
   */
  static encodeRFC3986URIComponent(str) {
    return encodeURIComponent(str).replace(
      /[!'()*]/g,
      (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
    );
  }

  /**
   * Normalize and decode text
   * 
   * @static
   * @param {string} text
   * @returns {string}
   */
  static decode(text) {
    return decodeURIComponent(NormalizeUtils.normalize(text));
  }
}