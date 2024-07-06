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

    extractParent(parent) {
        // Регулярное выражение для поиска шаблона <PROJECT>-<NUMBER>
        const regex = /([A-ZА-Я]+-\d+)/;
        
        // Применяем регулярное выражение к входной строке
        const match = parent.match(regex);
        
        // Если найдено соответствие, возвращаем его, иначе возвращаем null
        return match ? match[0] : null;
      }
}

module.exports = new UrlHelper ();