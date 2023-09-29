const BugModel = require("../models/bug-model")
const DomainModel = require("../models/domain-model")
const PageModel = require("../models/page-model")
const axios = require('axios');
const FormData = require('form-data');
const ApiError = require('../exceptions/api-error')
const fs = require('fs');


class BugService {
    async createBug(url, xpath, heightRatio, widthRatio, summary, description, environment, fileData) {
        const {domain, path} = await this.getDomainAndPath(url)
        const domainId = await this.getDomainId(domain)
        const pageId = await this.getPageId(path, domainId)
        const task = await this.createTaskInTracker(summary, description, environment, fileData)
        await this.attachFilesToTask(task.id, "ФР", fileData)
        const bugNumber = await this.getBugNumber(domainId, pageId, xpath, heightRatio, widthRatio, task.id, task.key, summary, environment)
        return bugNumber
        
    }

    async getDomainAndPath(url) {
        if (!url || url.trim() === "") {
            throw ApiError.BadRequest(`URL is empty or null`)
          }
        if (url.startsWith('http://')) {
          url = url.slice('http://'.length);
        } else if (url.startsWith('https://')) {
          url = url.slice('https://'.length);
        }
        const parts = url.split('/').filter(part => part !== '');
      
        const domain = parts.shift();
        const path = parts.join('/');

        return {domain, path};
      }

    async getDomainId(domain) {
        try {
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

    async getBugNumber(domainId, pageId, xpath, heightRatio, widthRatio, taskId, taskKey, summary, environment) {
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
                environment
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
                environment: bug.environment
              }));
    
            return filteredBugs;

            } catch (error) {
                console.error("Ошибка:", error);
                throw ApiError.BadRequest('Задача успешно создана в баг трекере, но произошла ошибка при сохранении в БД плагина', error)
            }
    }

    async createTaskInTracker(summary, description, environment) {
        try {
            const requestBody = {
                "summary": summary,
                "description": description,
                "queue": {
                    "id": 1,
                    "key": "TESTFORPLUGIN"
                }
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

    async attachFilesToTask(taskId, filename, fileData) {
        const fileDataPath = `./upload/${fileData}`;
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
          const response = await axios.post(`https://api.tracker.yandex.net/v2/issues/${taskId}/attachments/`, formData, {
            headers,
          });
      
          if (response.status === 201) {
            fs.unlinkSync(fileDataPath);
            return console.log("Все хорошо, файл прикреплен и удален");
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
            environment: bug.environment
          }));

        return filteredBugs;
      }
      

      

      
}

module.exports = new BugService()