const { URL } = require('url');
const ApiError = require('../exceptions/api-error')

class UrlHelper {
    async getDomainAndPath(url) {
        if (!url || url.trim() === "") {
            throw ApiError.BadRequest(`URL is empty or null`);
        }
    
        // Добавляем схему по умолчанию, если она отсутствует
        const formattedUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `http://${url}`;
        const parsedUrl = new URL(formattedUrl);
    
        parsedUrl.searchParams.delete('fbr');
        let domain = parsedUrl.hostname;
        
        // Добавляем порт к домену, если он существует и если домен является localhost
        if (parsedUrl.port) {
            domain += `:${parsedUrl.port}`;
        }
    
        // Используем свойство pathname объекта URL для получения пути без порта
        const path = parsedUrl.pathname.replace(/^\//, '');
    
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