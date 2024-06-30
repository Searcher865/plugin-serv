const { URL } = require('url');
const ApiError = require('../exceptions/api-error')

class UrlHelper {
    async getDomainAndPath(url) {
        if (!url || url.trim() === "") {
            throw ApiError.BadRequest(`URL is empty or null`);
        }

        const parsedUrl = new URL(url.startsWith('http://') || url.startsWith('https://') ? url : `http://${url}`);
        parsedUrl.searchParams.delete('fbr');
        const cleanUrl = parsedUrl.toString();
        const relativeUrl = cleanUrl.replace(/^https?:\/\//, '').replace(parsedUrl.hostname, '');
        const parts = relativeUrl.split('/').filter(part => part !== '');
        const domain = parsedUrl.hostname;
        const path = parts.join('/');

        return { domain, path };
    }
}

module.exports = new UrlHelper ();