const axios = require('axios');
const BugModel = require('../models/bug-model');
const DomainModel = require('../models/domain-model');
const PageModel = require('../models/page-model');
const UserModel = require('../models/user-model');
const parentKeyModel = require('../models/parentKey-model');
const UrlHelper = require('../helpers/urlHelper');
const FindParentKey = require('../helpers/findParentKey');
const BugDTO = require('../dtos/bug-dto');
const ApiError = require('../exceptions/api-error');

class bugStatusUpdateService {
  async getSubtasksFromParent(parentKey, trackerID) {
    try {
      console.log("ВЫВОДИМ КАКОЙ ТУТ parentKey: " + parentKey);
      const response = await axios.get(`${process.env.TRACKER_URL}/v2/issues/${parentKey}/links`, {
        headers: {
          'Authorization': `Bearer ${trackerID}`,
          'X-Org-ID': process.env.TRACKER_ORG_ID
        }
      });

      const subtasks = response.data.filter(item => item.type.inward === 'Подзадача').map(item => ({
        taskKey: item.object.key,
        display: item.object.display,
        status: item.status.display
      }));

      if (subtasks.length === 0) {
        throw ApiError.NotFound('Не найдено ни одной подзадачи для указанного parentKey.');
      }

      return subtasks;
    } catch (error) {
      console.error(error);
      if (error.response && error.response.status === 404) {
        throw ApiError.NotFound('Запрашиваемый ресурс не найден.');
      }
      throw error; // Перебрасываем оригинальную ошибку дальше
    }
  }

  async getBugsFromDatabase(parentKey) {
    try {
      console.log("ФУНКЦИЯ getBugsFromDatabase сработала " + parentKey);
      return await BugModel.find({ parentKey }).exec();
    } catch (error) {
      console.error(error);
      throw ApiError.BadRequest('Ошибка при получении списка багов из базы данных');
    }
  }

  async getBugsUrlFromDatabase(parentKey, url) {
    try {
      console.log("Выводим начало getBugsUrlFromDatabase" + parentKey + " " + url);
      const { domain, path } = await UrlHelper.getDomainAndPath(url);
      console.log("ВЫВОДИМ getBugsUrlFromDatabase - domain, path" + domain + " | " + path);
      const findDomain = await DomainModel.findOne({ name: domain }).exec();
      console.log("ВЫВОДИМ getBugsUrlFromDatabase - findDomain" + findDomain);
      if (!findDomain) return [];

      const domainId = findDomain._id;
      const pages = await PageModel.find({ domainId, path }).exec();
      console.log("ВЫВОДИМ getBugsUrlFromDatabase - pages" + pages);
      if (pages.length === 0) return [];

      const pageId = pages[0]._id;
      const bugs = await BugModel.find({ parentKey, domainId, pageId }).exec();
      console.log("Выводим список багов getBugsUrlFromDatabase" + JSON.stringify(bugs));
      return bugs;
    } catch (error) {
      console.error(error);
      throw ApiError.BadRequest('Ошибка при получении списка багов по URL из базы данных');
    }
  }

  async updateBugStatuses(subtasks, bugs) {
    const updatedBugs = [];

    for (let bug of bugs) {
      const subtask = subtasks.find(subtask => subtask.taskKey === bug.taskKey);
      if (subtask && subtask.status !== bug.status) {
        await BugModel.updateOne({ _id: bug._id }, { $set: { status: subtask.status } });
        bug.status = subtask.status;
      }
      updatedBugs.push(new BugDTO(bug));
    }

    return updatedBugs;
  }

  async getTrackerIDByUserID(userID) {
    try {
      const user = await UserModel.findById(userID);
      if (!user) throw ApiError.NotFound('Пользователь не найден');
      return user.trackerID;
    } catch (error) {
      throw ApiError.BadRequest('Ошибка при получении trackerID: ' + error.message);
    }
  }

  async getUpdatedFullBugsFromTask(parentKey, userID) {
    try {
      const finalParent = UrlHelper.extractParent(parentKey);
      const trackerID = await this.getTrackerIDByUserID(userID);
      console.log("ВЫВОДИМ trackerID в getUpdatedBugList " + trackerID);

      const subtasks = await this.getSubtasksFromParent(finalParent, trackerID);

      console.log("ИСПОЛЬЗУЕМ остальное");
      const parentKeyID = await FindParentKey.getparentKeyIdByParentKey(finalParent);
      const bugsFromDB = await this.getBugsFromDatabase(parentKeyID);
      const updatedBugs = await this.updateBugStatuses(subtasks, bugsFromDB);

      console.log("ВЫВОДИМ СПИСОК updatedBugs " + JSON.stringify(updatedBugs));
      return updatedBugs;
    } catch (error) {
      console.error(error);
      throw error; // Перебрасываем оригинальную ошибку дальше
    }
  }

  async getUpdatedBugsForUrl(parentKey, userID, url) {
    try {
      const finalParent = UrlHelper.extractParent(parentKey);
      const trackerID = await this.getTrackerIDByUserID(userID);
      console.log("ВЫВОДИМ trackerID в getUpdatedBugList " + trackerID);

      const subtasks = await this.getSubtasksFromParent(finalParent, trackerID);

      console.log("ИСПОЛЬЗУЕМ url !== null");
      const parentKeyID = await FindParentKey.getparentKeyIdByParentKey(finalParent);
      const bugsFromDB = await this.getBugsUrlFromDatabase(parentKeyID, url);
      const updatedBugs = await this.updateBugStatuses(subtasks, bugsFromDB);

      console.log("ВЫВОДИМ СПИСОК updatedBugs " + JSON.stringify(updatedBugs));
      return updatedBugs;
    } catch (error) {
      console.error(error);
      throw error; // Перебрасываем оригинальную ошибку дальше
    }
  }

  async getUpdatedBugs(parentKey, userID, bugs) {
    try {
      const finalParent = UrlHelper.extractParent(parentKey);
      const trackerID = await this.getTrackerIDByUserID(userID);
      console.log("ВЫВОДИМ trackerID в getUpdatedBugList " + trackerID);

      const subtasks = await this.getSubtasksFromParent(finalParent, trackerID);

      console.log("ИСПОЛЬЗУЕМ bugs !== null");
      const updatedBugs = await this.updateBugStatuses(subtasks, bugs);

      console.log("ВЫВОДИМ СПИСОК updatedBugs " + JSON.stringify(updatedBugs));
      return updatedBugs;
    } catch (error) {
      console.error(error);
      throw error; // Перебрасываем оригинальную ошибку дальше
    }
  }
}

module.exports = new bugStatusUpdateService();
