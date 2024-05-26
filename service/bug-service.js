const BugModel = require("../models/bug-model")
const DomainModel = require("../models/domain-model")
const PageModel = require("../models/page-model")
const axios = require('axios');
const FormData = require('form-data');
const ApiError = require('../exceptions/api-error')
const fs = require('fs');


class BugService {
    async createBug(url, xpath, heightRatio, widthRatio, summary, description, actualResult, expectedResult, priority, executor, OsVersion, environment, pageResolution, actualScreenshot, expectedScreenshot) {
        const {domain, path} = await this.getDomainAndPath(url)
        const domainId = await this.getDomainId(domain)
        const pageId = await this.getPageId(path, domainId)
        const {parsedOsVersion, browser} = await this.parseEnvironment(environment)
        const finalOsVersion = (OsVersion === 'Unknown') ? parsedOsVersion : OsVersion;

        console.log("ФАЙЛЫ "+actualScreenshot + "ЕЩЕ ОДИН ФАЙЛ "+ expectedScreenshot);

        const imgActualId = await this.attachFilesToTask("ФР", actualScreenshot)
        let imgExpectedId
        console.log("ВЫВОДИМ ЧТО У НАС В ОР "+expectedScreenshot);
        
        if (expectedScreenshot !== null) {
            imgExpectedId = await this.attachFilesToTask("ОР", expectedScreenshot);
        } else {
          imgExpectedId = null
        }

        const task = await this.createTaskInTracker(summary, description, actualResult, expectedResult, priority, executor, finalOsVersion, browser, pageResolution, url, imgActualId, imgExpectedId)
        const bugNumber = await this.getBugNumber(domainId, pageId, xpath, heightRatio, widthRatio, task.id, task.key, summary, finalOsVersion, browser, pageResolution)
        return bugNumber       
    }

    async parseEnvironment(environment) {
      // Регулярные выражения для поиска ОС и браузер
      let parsedOsVersion =  this.getOsVersion(environment)
      let browser =  this.getBrowser(environment)
      return { parsedOsVersion, browser }
    }

     getOsVersion(environment) {
      console.log("ВЫВОДИМ ДЛЯ ПАРСЕНГА БРАУЗЕР "+environment);
      if (environment.includes("Windows NT 10.0")) {
        return "Windows 10";
      } else if (environment.includes("Windows NT 6.3")) {
        return "Windows 8.1";
      } else if (environment.includes("Windows NT 6.2")) {
        return "Windows 8";
      } else if (environment.includes("Windows NT 6.1")) {
        return "Windows 7";
      } else if (environment.includes("Windows NT 6.0")) {
        return "Windows Vista";
      } else if (environment.includes("Windows NT 5.1")) {
        return "Windows XP";
      } else if (environment.includes("Mac OS X 10_15")) {
        return "macOS 10.15 (Catalina)";
      } else if (environment.includes("Mac OS X 10_14")) {
        return "macOS 10.14 (Mojave)";
      } else if (environment.includes("Linux")) {
        // Определение конкретных дистрибутивов Linux
        if (environment.includes("Ubuntu")) {
          const ubuntuVersion = environment.match(/Ubuntu\/([\d\.]+)/);
          if (ubuntuVersion) {
            return `Ubuntu ${ubuntuVersion[1]}`;
          }
          return "Ubuntu";
        }
        // Другие дистрибутивы Linux могут быть добавлены здесь
        
        return "Linux";
      } else if (environment.includes("Android")) {
        // Определение версии Android
        const androidVersion = environment.match(/Android\s([\d\.]+)/);
        if (androidVersion) {
          return `Android ${androidVersion[1]}`;
        }
        return "Android";
      } else if (environment.includes("iPhone")) {
        // Определение версии iOS (iPhone)
        const iOSVersion = environment.match(/iPhone OS\s([\d_]+)/);
        if (iOSVersion) {
          return `iOS ${iOSVersion[1].replace(/_/g, ".")}`;
        }
        return "iOS";
      } else if (environment.includes("iPad")) {
        // Определение версии iOS (iPad)
        const iOSVersion = environment.match(/CPU OS\s([\d_]+)/);
        if (iOSVersion) {
          return `iOS ${iOSVersion[1].replace(/_/g, ".")}`;
        }
        return "iOS";
      }
      
      // Вернуть "Неизвестно", если версия операционной системы не определена
      return "Неизвестная ОС";
    }

     getBrowser(environment) {
        let browserInfo = "Неизвестный браузер"; // По умолчанию, если браузер не определен
      
        // Регулярные выражения для поиска названия браузера и его версии
        const regexChrome = /Chrome\/([\d.]+)/;
        const regexFirefox = /Firefox\/([\d.]+)/;
        const regexSafari = /Version\/([\d.]+).*Safari/;
        const regexEdge = /Edg\/([\d.]+)/;
        const regexIE = /MSIE ([\d.]+)/;
        const regexYandex = /YaBrowser\/([\d.]+)/; // Для Яндекс.Браузера
        const regexMI = /MiuiBrowser\/([\d.]+)/; // Для MI Browser
        const regexSamsung = /SamsungBrowser\/([\d.]+)/; // Для Samsung Browser
        const regexOpera = /OPR\/([\d.]+)/; // Для Opera
      
        if (regexChrome.test(environment)) {
          browserInfo = `Chrome ${environment.match(regexChrome)[1]}`;
        } else if (regexFirefox.test(environment)) {
          browserInfo = `Firefox ${environment.match(regexFirefox)[1]}`;
        } else if (regexSafari.test(environment)) {
          browserInfo = `Safari ${environment.match(regexSafari)[1]}`;
        } else if (regexEdge.test(environment)) {
          browserInfo = `Microsoft Edge ${environment.match(regexEdge)[1]}`;
        } else if (regexIE.test(environment)) {
          browserInfo = `Internet Explorer ${environment.match(regexIE)[1]}`;
        } else if (regexYandex.test(environment)) {
          browserInfo = `Яндекс.Браузер ${environment.match(regexYandex)[1]}`;
        } else if (regexMI.test(environment)) {
          browserInfo = `MI Browser ${environment.match(regexMI)[1]}`;
        } else if (regexSamsung.test(environment)) {
          browserInfo = `Samsung Browser ${environment.match(regexSamsung)[1]}`;
        } else if (regexOpera.test(environment)) {
          browserInfo = `Opera ${environment.match(regexOpera)[1]}`;
        }
      
        return browserInfo;
    }


async getDomainAndPath(url) {
    if (!url || url.trim() === "") {
        throw ApiError.BadRequest(`URL is empty or null`);
    }

    // Создаем объект URL для анализа URL
    const parsedUrl = new URL(url.startsWith('http://') || url.startsWith('https://') ? url : `http://${url}`);

    // Удаляем параметр 'fbr' из строки запроса
    parsedUrl.searchParams.delete('fbr');

    // Получаем обновленный URL без параметра 'fbr'
    const cleanUrl = parsedUrl.toString();

    // Удаляем протокол и домен, оставляя только путь и параметры запроса (кроме 'fbr')
    const relativeUrl = cleanUrl.replace(/^https?:\/\//, '').replace(parsedUrl.hostname, '');

    // Разделяем оставшуюся часть URL на части
    const parts = relativeUrl.split('/').filter(part => part !== '');

    // Извлекаем домен
    const domain = parsedUrl.hostname;

    // Объединяем оставшиеся части для получения пути
    const path = parts.join('/');

    return { domain, path };
}

    async getDomainId(domain) {
  
        try {
          console.log("Начало выполнения getDomainId");
            const existingDomain = await DomainModel.findOne({ name: domain });

            if (existingDomain) {
            return existingDomain._id;
            } else {
            const savedDomain = await DomainModel.create({name: domain})

            return savedDomain._id;
            }
        } catch (error) {
            console.error('Ошибка:', error);
            throw error;
            }
    }
      
    async getPageId(path, domainId) {
        try {        
        const page = await PageModel.findOne({ path, domainId });
        if (page) {
            return page._id;
        } else {
            const savedPage = await PageModel.create({ path, domainId})
            return savedPage._id;
        }
        } catch (error) {
        console.error('Ошибка:', error);
        throw error;
        }
    }

    async getBugNumber(domainId, pageId, xpath, heightRatio, widthRatio, taskId, taskKey, summary, finalOsVersion, browser, pageResolution) {
        try {
            let bugNumber = 1;
            const maxBug = await BugModel.findOne({ domainId }).sort({ bugNumber: -1 });
            if (maxBug) {
            bugNumber = maxBug.bugNumber + 1;
            }
            const newBug = new BugModel({
                domainId,
                pageId, 
                xpath,
                heightRatio,
                widthRatio,
                bugNumber,
                taskId,
                taskKey,
                summary,
                finalOsVersion,
                browser,
                pageResolution
            });
            await newBug.save()
            const bugs = await BugModel.find({ domainId, pageId }).exec();

            const filteredBugs = bugs.map(bug => ({
                xpath: bug.xpath,
                taskId: bug.taskId,
                heightRatio: bug.heightRatio,
                widthRatio: bug.widthRatio,
                bugNumber: bug.bugNumber,
                taskKey: bug.taskKey, 
                summary: bug.summary,
                finalOsVersion: bug.finalOsVersion,
                browser: bug.browser,
                pageResolution: bug.pageResolution
              }));
    
            return filteredBugs;

            } catch (error) {
                console.error("Ошибка:", error);
                throw ApiError.BadRequest('Задача успешно создана в баг трекере, но произошла ошибка при сохранении в БД плагина', error)
            }
    }

    async createTaskInTracker(summary, description, actualResult, expectedResult, priority, executor, finalOsVersion, browser, pageResolution, url, imgActualId, imgExpectedId) {
    
      try {
            let fullDescription
            let attachmentIds
            if (imgExpectedId === null) {
                fullDescription = `### Основные шаги: \n${description}${priority}${executor} #|||**Фактический результат**|**Ожидаемый результат**||||${actualResult} \n![image.png](/ajax/v2/attachments/${imgActualId}?inline=true =400x)|${expectedResult}|||||[figma](https://dev3.vaba.783630.ru/)|||#**Окружение:**#|||Устройство|Браузер|Разрешение экрана|Стенд||||${finalOsVersion}|${browser}|${pageResolution}|${url}|||#`;
                attachmentIds = [imgActualId]
              } else {
                fullDescription = `### Основные шаги: \n${description}${priority}${executor} #|||**Фактический результат**|**Ожидаемый результат**||||${actualResult} \n![image.png](/ajax/v2/attachments/${imgActualId}?inline=true =400x)|${expectedResult}\n![image.png](/ajax/v2/attachments/${imgExpectedId}?inline=true =400x)|||||[figma](https://dev3.vaba.783630.ru/)|||#**Окружение:**#|||Устройство|Браузер|Разрешение экрана|Стенд||||${finalOsVersion}|${browser}|${pageResolution}|${url}|||#`;
              }
            const requestBody = {
                "summary": summary,
                
                "description": fullDescription,
                "queue": {
                    "id": 1,
                    "key": "TESTFORPLUGIN"
                },
                "priority": 3,
                "tags": ["frontend", "backend"],
                "attachmentIds": attachmentIds
            };
    
            const response = await axios.post('https://api.tracker.yandex.net/v2/issues', requestBody, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer y0_AgAAAAATFq7WAAqB_QAAAADs6FC29yntavQmQn2V4OoFOqiVNthFKVs',
                    'X-Org-ID': '5971090'
                },
            });
            
            if (response.status === 201) {
                const responseData = response.data;
                if (responseData && responseData.id) {
                    console.log('Задача успешно создана. ID задачи:', responseData.id);
                    return {id: responseData.id, key:responseData.key};
                } else {
                    throw ApiError.BadRequest('Не удалось получить ID задачи из ответа')
                }
            } else {
                throw ApiError.BadRequest('Ошибка при создании задачи')
            }
        } catch (error) {
            throw ApiError.BadRequest('Произошла ошибка при отправке запроса на создание задачи')
        }
    }

    async attachFilesToTask(filename, file) {
      console.log("ЭТО ПРИКРПЛЕННЫЙ "+ file);
        const fileDataPath = `./upload/${file}`;

        if (!fs.existsSync(fileDataPath)) {
            throw ApiError.BadRequest('Файл или директория не найдены')
        }
      
        const formData = new FormData();
        formData.append('file', fs.createReadStream(fileDataPath), { filename });
      
        const headers = {
          'Authorization': 'Bearer y0_AgAAAAATFq7WAAqB_QAAAADs6FC29yntavQmQn2V4OoFOqiVNthFKVs',
          'X-Org-ID': '5971090',
          ...formData.getHeaders(),
        };
      
        try {
          const response = await axios.post(`https://api.tracker.yandex.net/v2/attachments/`, formData, {
            headers,
          });
      
          if (response.status === 201) {
            fs.unlinkSync(fileDataPath);
            const parts = response.data.self.split('/');
            const lastPart = parts[parts.length - 1];
            console.log("Все хорошо, файл прикреплен и удален");
            return lastPart
          } else {
            throw ApiError.BadRequest('Ошибка при прикреплении файла')
          }
        } catch (error) {
          throw ApiError.BadRequest('Ошибка при отправке файлов')
        }
    }

    async getBugs(url) {
        const { domain, path } = await this.getDomainAndPath(url);
        const findDomain = await DomainModel.findOne({ name: domain }).exec();
        if (!findDomain) {
          return null
        }
        const domainId = findDomain._id;
        const pages = await PageModel.find({ domainId: domainId, path: path }).exec();
        if (pages.length === 0) {
          return null;
        }
        const pageId = pages[0]._id;
        const bugs = await BugModel.find({ domainId, pageId }).exec();

        const filteredBugs = bugs.map(bug => ({
            xpath: bug.xpath,
            taskId: bug.taskId,
            heightRatio: bug.heightRatio,
            widthRatio: bug.widthRatio,
            bugNumber: bug.bugNumber,
            taskKey: bug.taskKey, 
            summary: bug.summary,
            finalOsVersion: bug.finalOsVersion,
            browser: bug.browser,
            pageResolution: bug.pageResolution
          }));

        return filteredBugs;
      }

    async getBug(idBug) {
      try {    
        const config = {
          headers: {
            'Authorization': 'Bearer y0_AgAAAAATFq7WAAqB_QAAAADs6FC29yntavQmQn2V4OoFOqiVNthFKVs',
            'X-Org-ID': '5971090'
          }
        };
        
        const response = await axios.get(`https://api.tracker.yandex.net/v2/issues/${idBug}`, config);
        
        const bugData = response.data;
        
        return bugData
      } catch (error) {
        console.error('Ошибка при отправке запроса:', error);
        res.status(500).json({ error: 'Произошла ошибка при получении данных' });
      }

      return bugData;
    }

    async getAttachments(idBug) {
      try {    
        const config = {
          headers: {
            'Authorization': 'Bearer y0_AgAAAAATFq7WAAqB_QAAAADs6FC29yntavQmQn2V4OoFOqiVNthFKVs',
            'X-Org-ID': '5971090'
          }
        };
        
        const response = await axios.get(`https://api.tracker.yandex.net/v2/issues/${idBug}/attachments`, config);
        
        const attachmentsData = response.data;
        
        return attachmentsData
      } catch (error) {
        console.error('Ошибка при отправке запроса:', error);
        res.status(500).json({ error: 'Произошла ошибка при получении данных' });
      }

      return attachmentsData;
    }

    async getBugListData(body) {
      try { 
        // Заголовки запроса
        const headers = {
          'Authorization': 'Bearer y0_AgAAAAATFq7WAAqB_QAAAADs6FC29yntavQmQn2V4OoFOqiVNthFKVs',
          'X-Org-ID': '5971090'
        };
    
        // Тело запроса с параметром keys
        const requestBody = body;
    
        // Отправляем POST-запрос на указанный URL
        const response = await axios.post('https://api.tracker.yandex.net/v2/issues/_search', requestBody, { headers });
    
        // Возвращаем ответ клиенту
        const bugsListData = response.data
        return bugsListData
      } catch (error) {
        console.error('Ошибка при отправке запроса:', error);
        res.status(500).json({ error: 'Произошла ошибка при отправке запроса' });
      }

      return bugsListData;
    }
      

      

      
}

module.exports = new BugService()