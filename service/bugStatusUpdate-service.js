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
const Project = require('../models/project-model');

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


// Метод для поиска проекта по parentKey
async findProjectByParentKey(parentKey) {
  const bug = await BugModel.findOne({ parentKey }).exec();
  return bug ? bug.project : null;
}

// Модифицированная функция getBugsFromDatabase
async getBugsFromDatabase(parentKey, url) {
  console.log("ВЫводим из getBugsFromDatabase наш url "+url);
  try {
    console.log("ФУНКЦИЯ getBugsFromDatabase сработала " + parentKey);
    const { domain, path } = await UrlHelper.getDomainAndPath(url);
    // Находим проект, связанный с parentKey
    const project = await this.findProjectByParentKey(parentKey);
    console.log("Проект найден: " + project);

    // Находим все страницы, связанные с проектом
    const pages = await PageModel.find({ project }).exec();
    console.log("Страницы проекта: " + JSON.stringify(pages));

    // Находим баги по parentKey и заполняем их pageId
    const bugs = await BugModel.find({ parentKey }).populate('pageId').exec();
    console.log("Баги найдены: " + JSON.stringify(bugs));

    // Добавляем path в каждый баг
    const bugsWithPath = bugs.map(bug => {
      const bugPage = pages.find(page => page._id.equals(bug.pageId._id));
      return {
        ...bug.toObject(),
        path: bugPage ? bugPage.path : null,
        existsOnPage: bugPage && bugPage.path === path
      };
    });

    console.log("Баги с path: " + JSON.stringify(bugsWithPath));
    return bugsWithPath;
  } catch (error) {
    console.error(error);
    throw new Error('Ошибка при получении списка багов из базы данных');
  }
}

async getBugsUrlFromDatabase(parentKey, url) {
  try {
    console.log("Выводим начало getBugsUrlFromDatabase: " + parentKey + " " + url);
    const { domain, path } = await UrlHelper.getDomainAndPath(url);
    console.log("Выводим domain getBugsUrlFromDatabase: " + domain);
    const project = await this.findProjectByDomain(domain);
    console.log("ВЫВОДИМ getBugsUrlFromDatabase - domain, path " + domain + " | " + path);

    console.log("ВЫВОДИМ getBugsUrlFromDatabase - project и path: " + project + " | " + path);
    const pages = await PageModel.find({ project }).exec();
    console.log("ВЫВОДИМ getBugsUrlFromDatabase - pages: " + JSON.stringify(pages));

    // Находим страницу с совпадающим path
    const matchingPage = pages.find(page => page.path === path);

    // Если совпадающей страницы нет, вернуть пустой массив
    if (!matchingPage) return [];

    const bugs = await BugModel.find({ parentKey, project }).exec();
    console.log("Выводим список багов getBugsUrlFromDatabase: " + JSON.stringify(bugs));

    // Фильтруем баги, относящиеся к странице с совпадающим path
    const bugsWithMatchingPage = bugs.filter(bug => matchingPage._id.equals(bug.pageId));

    // Добавляем path в каждый баг
    const bugsWithPageInfo = bugsWithMatchingPage.map(bug => ({
      ...bug.toObject(),
      path: matchingPage.path,
      existsOnPage: true
    }));

    console.log("Выводим список багов с информацией о странице getBugsUrlFromDatabase: " + JSON.stringify(bugsWithPageInfo));
    return bugsWithPageInfo;
  } catch (error) {
    console.error("Ошибка в getBugsUrlFromDatabase: " + error.message);
    throw error; // Перебрасываем оригинальную ошибку дальше
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

  async getUpdatedFullBugsFromTask(parentKey, userID, url) {
    try {
      const finalParent = UrlHelper.extractParent(parentKey);
      const trackerID = await this.getTrackerIDByUserID(userID);
      console.log("ВЫВОДИМ trackerID в getUpdatedBugList " + trackerID);

      const subtasks = await this.getSubtasksFromParent(finalParent, trackerID);

      console.log("ИСПОЛЬЗУЕМ остальное");
      const parentKeyID = await FindParentKey.getparentKeyIdByParentKey(finalParent);
      const bugsFromDB = await this.getBugsFromDatabase(parentKeyID, url);
      const updatedBugs = await this.updateBugStatuses(subtasks, bugsFromDB);

      console.log("ВЫВОДИМ СПИСОК updatedBugs " + JSON.stringify(updatedBugs));
      return updatedBugs;
    } catch (error) {
      console.error(error);
      throw error; // Перебрасываем оригинальную ошибку дальше
    }
  }

  async findProjectByDomain(domain) {
    try {
      console.log("ВЫВОДИМ domain из findProjectByDomain " + domain);
      const project = await Project.findOne({ domains: domain });
      if (!project) {
        throw ApiError.NotFound('Данный url не привязан ни к одному проекту');
      }
      return project.name;
    } catch (error) {
      console.error("Ошибка в findProjectByDomain: " + error.message);
      throw ApiError.InternalServerError('Ошибка при поиске проекта по домену: ' + error.message);
    }
  }

  async getUpdatedBugsForUrl(parentKey, userID, url) {
    try {
      const finalParent = UrlHelper.extractParent(parentKey);
      const trackerID = await this.getTrackerIDByUserID(userID);
      console.log("ВЫВОДИМ trackerID в getUpdatedBugList " + trackerID);
  
      const subtasks = await this.getSubtasksFromParent(finalParent, trackerID);
      
      const parentKeyID = await FindParentKey.getparentKeyIdByParentKey(finalParent);
  
      console.log("Выводим url and parentKeyID in getUpdatedBugsForUrl: "+url +" "+parentKeyID);
      const bugsFromDB = await this.getBugsUrlFromDatabase(parentKeyID, url);
      console.log("Список багов которые нашли в getBugsUrlFromDatabase из getUpdatedBugsForUrl: " + JSON.stringify(bugsFromDB));
      const updatedBugs = await this.updateBugStatuses(subtasks, bugsFromDB);
  
      console.log("ВЫВОДИМ СПИСОК updatedBugs " + JSON.stringify(updatedBugs));
      return updatedBugs;
    } catch (error) {
      console.error("Ошибка в getUpdatedBugsForUrl: " + error.message);
      if (error instanceof ApiError) {
        throw error; // Перебрасываем ApiError дальше
      }
      throw ApiError.InternalServerError('Неизвестная ошибка: ' + error.message);
    }
  }

  async getUpdatedBugs(parentKey, userID, bugs) {
    try {
      const finalParent = UrlHelper.extractParent(parentKey);
      const trackerID = await this.getTrackerIDByUserID(userID);
      console.log("ВЫВОДИМ trackerID в getUpdatedBugList " + trackerID);

      const subtasks = await this.getSubtasksFromParent(finalParent, trackerID);

      console.log("ИСПОЛЬЗУЕМ bugs !== null");
      console.log("ВЫВОДИМ СПИСОК БАГОВ из getUpdatedBugs "+JSON.stringify(bugs));
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
