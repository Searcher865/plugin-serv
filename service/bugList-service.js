const BugModel = require("../models/bug-model")
const DomainModel = require("../models/domain-model")
const PageModel = require("../models/page-model")
const UserModel = require("../models/user-model")
const ParentTaskModel = require("../models/parentTask-model")
const axios = require('axios');
const UAParser = require('ua-parser-js');
const FormData = require('form-data');
const ApiError = require('../exceptions/api-error')
const fs = require('fs');
const path = require('path');


class BugListService {
//Эта функция получает список подзадач для parentKey из внешнего API.
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
          key: item.object.key,
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

  async getBugsUrlFromDatabase(parentKey, url) {
    try {
      const { domain, path } = await this.getDomainAndPath(url);
      const findDomain = await DomainModel.findOne({ name: domain }).exec();
      if (!findDomain) {
        return [];
      }
      const domainId = findDomain._id;
      const pages = await PageModel.find({ domainId: domainId, path: path }).exec();
      if (pages.length === 0) {
        return [];
      }
      const pageId = pages[0]._id;
      const bugs = await BugModel.find({ parentKey, domainId, pageId }).exec();
  
      return bugs;
    } catch (error) {
      console.error(error);
      throw new Error('Something went wrong while fetching bugs from database!');
    }
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
  
  //Эта функция сравнивает статус подзадач и багов, обновляя статус багов, если они различаются.
  async updateBugStatuses(subtasks, bugs) {
    for (let bug of bugs) {
      const subtask = subtasks.find(subtask => subtask.key === bug.taskKey);
      if (subtask && subtask.status !== bug.status) {
        bug.status = subtask.status;
        await bug.save();
      }
    }
  
    return bugs.map(bug => ({
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
  async getUpdatedBugList(parentTaskForList, userID) {
    const parentTask = await this.getParentTaskIdByParentKey(parentTaskForList)
    const trackerID = await this.getTrackerIDByUserID(userID);
    console.log("ВЫВОДИМ trackerID в getUpdatedBugList "+trackerID);
    
    const subtasks = await this.getSubtasksFromParent(parentTaskForList, trackerID);
    const bugs = await this.getBugsFromDatabase(parentTask);
    
    const updatedBugs = await this.updateBugStatuses(subtasks, bugs);
    
    return updatedBugs;
  }

  async getUpdatedBugs(parentTaskForList, userID, url) {
    try {
      const parentTask = await this.getParentTaskIdByParentKey(parentTaskForList);
      const trackerID = await this.getTrackerIDByUserID(userID);
      console.log("ВЫВОДИМ trackerID в getUpdatedBugList " + trackerID);
  
      const subtasks = await this.getSubtasksFromParent(parentTaskForList, trackerID);
      const bugs = await this.getBugsUrlFromDatabase(parentTask, url);
  
      const updatedBugs = await this.updateBugStatuses(subtasks, bugs);
  
      return updatedBugs;
    } catch (error) {
      console.error(error);
      throw new Error('Failed to get updated bugs list');
    }
  }
      
}

module.exports = new BugListService()