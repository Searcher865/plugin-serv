const BugModel = require("../models/bug-model")
const DomainModel = require("../models/domain-model")
const PageModel = require("../models/page-model")
const UserModel = require("../models/user-model")
const ParentTaskModel = require("../models/parentTask-model")
const environmentParser = require("../helpers/environmentParser")
const urlHelper = require("../helpers/urlHelper")
const axios = require('axios');
const UAParser = require('ua-parser-js');
const FormData = require('form-data');
const ApiError = require('../exceptions/api-error')
const fs = require('fs');
const path = require('path');


class BugService {
    async createBug(url, xpath, heightRatio, widthRatio, summary, description, actualResult, expectedResult, priority, tags, OsVersion, environment, pageResolution, actualScreenshot, expectedScreenshot, userID, parentTaskForForm) {
      const {domain, path} = await urlHelper.getDomainAndPath(url)
        const domainId = await this.getDomainId(domain)
        const pageId = await this.getPageId(path, domainId)
        console.log("ОКРУЖЕНИЕ "+environment);
        console.log("ID юзера по которому будет поиск в БД "+userID);
        const trackerID = await this.getTrackerIDByUserID(userID)
        console.log("trackerID юзера по которому будет поиск в БД "+trackerID);
        const {parsedOsVersion, browser} = await environmentParser.parseEnvironment(environment)
        
        let finalOsVersion = this.processOsVersion(parsedOsVersion, OsVersion)

        console.log("ОКРУЖЕНИЕ ОС "+parsedOsVersion);
        console.log("ОКРУЖЕНИЕ БРАУЗЕР "+browser);
        console.log("ФАЙЛЫ "+actualScreenshot + "ЕЩЕ ОДИН ФАЙЛ "+ expectedScreenshot);

        const imgActualId = await this.attachFilesToTask("ФР", actualScreenshot, trackerID)
        let imgExpectedId
        console.log("ВЫВОДИМ ЧТО У НАС В ОР "+expectedScreenshot);
        
        if (expectedScreenshot !== null) {
            imgExpectedId = await this.attachFilesToTask("ОР", expectedScreenshot, trackerID);
        } else {
          imgExpectedId = null
        }
        const finalTags = this.getExecutor(tags)
        const parentAfterExtract = this.extractParent(parentTaskForForm)
        const parentAfterSave = await this.saveParentKey(parentAfterExtract)
        console.log("Что выводится в parentAfterExtract "+parentAfterExtract);
        console.log("Что выводится в parentAfterSave "+parentAfterSave);
        console.log("ВЫВОДИМ СУММАРИ ПЕРЕД ФУНКЦИЯМИ "+summary);
        const task = await this.createTaskInTracker(summary, description, actualResult, expectedResult, priority, finalTags, finalOsVersion, browser, pageResolution, url, imgActualId, imgExpectedId, trackerID, parentAfterExtract)
        const bugNumber1 = await this.getBugNumber(domainId, pageId, xpath, heightRatio, widthRatio, task.id, task.key, task.status, summary, finalOsVersion, browser, pageResolution, parentAfterSave)
        console.log("ВЫВОДИМ bugNumber1 "+JSON.stringify(bugNumber1));
        const bugNumber = await this.getUpdatedBugList(bugNumber1, parentAfterExtract, userID)
        return bugNumber       
    }

    extractParent(parent) {
      // Регулярное выражение для поиска шаблона <PROJECT>-<NUMBER>
      const regex = /([A-ZА-Я]+-\d+)/;
      
      // Применяем регулярное выражение к входной строке
      const match = parent.match(regex);
      
      // Если найдено соответствие, возвращаем его, иначе возвращаем null
      return match ? match[0] : null;
    }

    async getTrackerIDByUserID(userID) {
      try {
          const user = await UserModel.findById(userID);
          if (!user) {
              throw new Error('Пользователь не найден');
          }
          return user.trackerID;
      } catch (error) {
          throw new Error('Ошибка при получении trackerID: ' + error.message);
      }
  }

    processOsVersion(parsedOsVersion, OsVersion) {
      let finalOsVersion = '';
      if (OsVersion !== 'Unknown') {
          finalOsVersion = parsedOsVersion;
      } else {
          finalOsVersion = 'Unknown';
      }
      return finalOsVersion;
  }

    getExecutor(executor) {
      switch (executor) {
        case 'Frontend':
          return 'Frontend';
        case 'Backend':
          return 'Backend';
        case 'Both':
          return ['Frontend', 'Backend'];
        default:
          throw new Error('Invalid executor value');
      }
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
    // Определение функции getLastThreeNumbers
    getLastThreeNumbers(taskKey) {
      // Используем регулярное выражение для поиска всех цифр в строке
      const numbers = taskKey.match(/\d+/g);
    
      // Если цифры найдены
      if (numbers) {
          // Объединяем все найденные цифры в одну строку
          const allNumbers = numbers.join('');
      
          // Возвращаем последние три цифры или все цифры, если их меньше трех
          return allNumbers.slice(-3);
      } else {
          // Если цифр нет, возвращаем пустую строку
          return '';
      }
  }

  // Определение метода getBugNumber
  async getBugNumber(domainId, pageId, xpath, heightRatio, widthRatio, taskId, taskKey, status, summary, finalOsVersion, browser, pageResolution, parentAfterSave) {
      const bugNumber = this.getLastThreeNumbers(taskKey);
      console.log("Выводим номер бага из getLastThreeNumbers: " + bugNumber);
      console.log("Выводим summary из getLastThreeNumbers: " + summary);
      
      try {
        // Проверка наличия parentKey в таблице ParentTaskSchema
        console.log("ВЫВОДИМ parentKey перед parentTask"+parentAfterSave);

    
        // Использование _id найденного или созданного документа как parentKey для нового бага
        const newBug = new BugModel({
              domainId,
              pageId,
              xpath,
              heightRatio,
              widthRatio,
              taskId,
              taskKey,
              summary,
              status,
              finalOsVersion,
              browser,
              pageResolution,
              parentKey: parentAfterSave,
              bugNumber
          });
          await newBug.save();
          const bugs = await BugModel.find({ domainId, pageId }).exec();

          const filteredBugs = bugs.map(bug => ({
              xpath: bug.xpath,
              taskId: bug.taskId,
              heightRatio: bug.heightRatio,
              widthRatio: bug.widthRatio,
              bugNumber: bug.bugNumber,
              taskKey: bug.taskKey,
              summary: bug.summary,
              status: bug.status,
              finalOsVersion: bug.finalOsVersion,
              browser: bug.browser,
              pageResolution: bug.pageResolution,
          }));

          return filteredBugs;

      } catch (error) {
          console.error("Ошибка:", error);
          throw ApiError.BadRequest('Задача успешно создана в баг трекере, но произошла ошибка при сохранении в БД плагина', error);
      }
  }


    async createTaskInTracker(summary, description, actualResult, expectedResult, priority, finalTags, finalOsVersion, browser, pageResolution, url, imgActualId, imgExpectedId, trackerID, parent) {
    
      try {
            let fullDescription
            let attachmentIds
            console.log("ВЫВОДИМ ID ИЗОБРАЖЕНИЯ "+imgActualId);
            if (imgExpectedId === null) {
                fullDescription = `### Основные шаги: \n${description}#|||**Фактический результат**|**Ожидаемый результат**||||${actualResult} \n![image.png](/ajax/v2/attachments/${imgActualId}?inline=true =400x)|${expectedResult}|||||[figma](https://dev3.vaba.783630.ru/)|||#**Окружение:**#|||Устройство|Браузер|Разрешение экрана|Стенд||||${finalOsVersion}|${browser}|${pageResolution}|${url}|||#`;
                attachmentIds = [imgActualId]
              } else {
                fullDescription = `### Основные шаги: \n${description}#|||**Фактический результат**|**Ожидаемый результат**||||${actualResult} \n![image.png](/ajax/v2/attachments/${imgActualId}?inline=true =400x)|${expectedResult}\n![image.png](/ajax/v2/attachments/${imgExpectedId}?inline=true =400x)|||||[figma](https://dev3.vaba.783630.ru/)|||#**Окружение:**#|||Устройство|Браузер|Разрешение экрана|Стенд||||${finalOsVersion}|${browser}|${pageResolution}|${url}|||#`;
              }
            const requestBody = {
                "summary": summary,
                
                "description": fullDescription,
                "queue": {
                    "id":  process.env.TRACKER_ORDER_ID,
                    "key": process.env.TRACKER_ORDER_NAME
                },
                "priority": Number(priority),
                "tags": finalTags,
                "attachmentIds": attachmentIds,
                "parent": parent,
                "type": "bug"
            };
    
            const response = await axios.post(process.env.TRACKER_URL +'/v2/issues', requestBody, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer '+trackerID,
                    'X-Org-ID': process.env.TRACKER_ORG_ID
                },
            });
            
            if (response.status === 201) {
                const responseData = response.data;
                if (responseData && responseData.id) {
                    console.log('Задача успешно создана. ID задачи:', responseData.id);
                    return {id: responseData.id, key:responseData.key, status: responseData.status.display};
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


    

    async attachFilesToTask(filename, file, trackerID) {
      console.log("ЭТО ПРИКРПЛЕННЫЙ " + file);
      const fileDataPath = path.join(__dirname, '../upload', file);
  
      if (!fs.existsSync(fileDataPath)) {
          throw ApiError.BadRequest('Файл или директория не найдены');
      }
  
      const formData = new FormData();
      formData.append('file_data', fs.createReadStream(fileDataPath));
      formData.append('filename', filename);
  
      const headers = {
          'Authorization': 'OAuth ' + trackerID,
          'X-Org-ID': process.env.TRACKER_ORG_ID,
          ...formData.getHeaders(),
      };
  
      try {
          console.log("Отправка запроса на сервер");
          console.log("Headers:", headers);
          console.log("Form Data:", formData);
  
          const response = await axios.post(process.env.TRACKER_URL + '/v2/attachments/', formData, {
              headers,
          });
  
          if (response.status === 201) {
              fs.unlinkSync(fileDataPath);
              const parts = response.data.self.split('/');
              const lastPart = parts[parts.length - 1];
              console.log("Все хорошо, файл прикреплен и удален");
              return lastPart;
          } else {
              console.error("Ответ сервера:", response.status, response.data);
              throw ApiError.BadRequest('Ошибка при прикреплении файла');
          }
      } catch (error) {
          console.error("Ошибка при отправке файлов:", error);
          throw ApiError.BadRequest('Ошибка при отправке файлов');
      }
  }

    async getBug(idBug) {
      try {    
        const config = {
          headers: {
            'Authorization': 'Bearer '+trackerID,
            'X-Org-ID': process.env.TRACKER_ORG_ID
          }
        };
        
        const response = await axios.get(process.env.TRACKER_URL +`/v2/issues/${idBug}`, config);
        
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
            'Authorization': 'Bearer '+trackerID,
            'X-Org-ID': process.env.TRACKER_ORG_ID
          }
        };
        
        const response = await axios.get(process.env.TRACKER_URL +`/v2/issues/${idBug}/attachments`, config);
        
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
          'Authorization': 'Bearer '+trackerID,
          'X-Org-ID': process.env.TRACKER_ORG_ID
        };
    
        // Тело запроса с параметром keys
        const requestBody = body;
    
        // Отправляем POST-запрос на указанный URL
        const response = await axios.post(process.env.TRACKER_URL +'/v2/issues/_search', requestBody, { headers });
    
        // Возвращаем ответ клиенту
        const bugsListData = response.data
        return bugsListData
      } catch (error) {
        console.error('Ошибка при отправке запроса:', error);
        res.status(500).json({ error: 'Произошла ошибка при отправке запроса' });
      }

      return bugsListData;
    }
      
    async getBugListFromParent(parentKey, userID) {
      const trackerID = await this.getTrackerIDByUserID(userID);
      try {
        const response = await axios.get(`${process.env.TRACKER_URL}/v2/issues/${parentKey}/links`, {
          headers: {
            'Authorization': 'Bearer ' + trackerID,
            'X-Org-ID': process.env.TRACKER_ORG_ID
          }
        });
    
        const data = response.data;
    
        const filteredData = data
          .filter(item => item.type.inward === 'Подзадача')
          .map(item => ({
            key: item.object.key,
            display: item.object.display,
            status: item.status.display
          }));
    
        return filteredData;
      } catch (error) {
        console.error(error);
        throw new Error('Something went wrong!');
      }

    }

    async saveParentKey(parentKey) {
      try {
        // Проверка наличия parentKey в таблице ParentTaskSchema
        let parentTask = await ParentTaskModel.findOne({ parentKey }).exec();
    
        if (!parentTask) {
          // Если parentKey не найден, создаем новый документ
          parentTask = new ParentTaskModel({ parentKey });
          await parentTask.save();
        }
    
        // Возвращаем Id записи
        return parentTask._id;
      } catch (error) {
        console.error("Ошибка:", error);
        throw new Error('Произошла ошибка при сохранении parentKey в БД');
      }
    }

//=================================================================================================
async getSubtasksFromParent(parentKey, trackerID) {
  try {
    console.log("ВЫВОДИМ parentKey в getSubtasksFromParent "+parentKey);
    const response = await axios.get(`${process.env.TRACKER_URL}/v2/issues/${parentKey}/links`, {
      headers: {
        'Authorization': 'Bearer ' + trackerID,
        'X-Org-ID': process.env.TRACKER_ORG_ID
      }
    });

    const data = response.data;

    const filteredData = data
      .filter(item => item.type.inward === 'Подзадача')
      .map(item => ({
        taskKey: item.object.key,
        display: item.object.display,
        status: item.status.display
      }));

    return filteredData;
  } catch (error) {
    console.error(error);
    throw new Error('Ошибка при получении списка подзадач: ' + error.message);
  }
}

//Эта функция получает список багов из базы данных по parentKey
async getBugsFromDatabase(parentKey) {
  try {
    const bugs = await BugModel.find({ parentKey }).exec();
    return bugs;
  } catch (error) {
    console.error(error);
    throw new Error('Something went wrong while fetching bugs from database!');
  }
}

//Эта функция сравнивает статус подзадач и багов, обновляя статус багов, если они различаются.
async updateBugStatuses(subtasks, bugs) {
  const updatedBugs = [];

  for (let bug of bugs) {
    const subtask = subtasks.find(subtask => subtask.taskKey === bug.taskKey);
    if (subtask && subtask.status !== bug.status) {
      // Обновляем статус в базе данных
      await BugModel.updateOne({ _id: bug._id }, { $set: { status: subtask.status }});
      // Обновляем значение в объекте bug
      bug.status = subtask.status;
    }
    updatedBugs.push(bug);
  }

  return updatedBugs.map(bug => ({
    xpath: bug.xpath,
    taskId: bug.taskId,
    heightRatio: bug.heightRatio,
    widthRatio: bug.widthRatio,
    bugNumber: bug.bugNumber,
    taskKey: bug.taskKey,
    summary: bug.summary,
    status: bug.status, 
    finalOsVersion: bug.finalOsVersion,
    browser: bug.browser,
    pageResolution: bug.pageResolution
  }));
}



async getTrackerIDByUserID(userID) {
  try {
      const user = await UserModel.findById(userID);
      if (!user) {
          throw new Error('Пользователь не найден');
      }
      return user.trackerID;
  } catch (error) {
      throw new Error('Ошибка при получении trackerID: ' + error.message);
  }
}

async getParentTaskIdByParentKey(parentKey) {
try {
  const parentTask = await ParentTaskModel.findOne({ parentKey }).exec();
  if (!parentTask) {
    throw new Error('ParentTask not found!');
  }
  return parentTask._id;
} catch (error) {
  console.error(error);
  throw new Error('Something went wrong while fetching parent task ID!');
}
}

//Эта функция объединяет все предыдущие функции, возвращая список багов с актуализированными статусами и дополнительной информацией.
async getUpdatedBugList(bugs, parentTaskForList, userID) {
  const trackerID = await this.getTrackerIDByUserID(userID);
  console.log("ВЫВОДИМ trackerID в getUpdatedBugList "+trackerID);
  
  const subtasks = await this.getSubtasksFromParent(parentTaskForList, trackerID);
  const updatedBugs = await this.updateBugStatuses(subtasks, bugs);
  console.log("ВЫВОДИМ СПИСОК updatedBugs "+JSON.stringify(updatedBugs));
  return updatedBugs;
}

      
}

module.exports = new BugService()