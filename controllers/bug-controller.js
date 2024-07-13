
const bugService = require('../service/bug-service');
const bugStatusUpdate = require('../service/bugStatusUpdate-service');
const fs = require('fs');
const path = require('path');
const uuid = require('uuid');
const userService = require('../service/user-service')
const urlHelper = require("../helpers/urlHelper")

const ApiError = require('../exceptions/api-error')


class BugController {
     // Функция парсинга environment
   
  async createBug(req, res, next) {
    try {
      const { url, xpath, heightRatio, widthRatio, summary, description, actualResult, expectedResult, priority, tags, OsVersion, environment, pageResolution, actualScreenshot, expectedScreenshot, parentKeyForForm} = req.body;
      const userID = req.user.id
      console.log("Данные пользователя 0"+ JSON.stringify(req.user, null, 2));
      console.log("ЭТО В СЕРВИСЕ "+ actualScreenshot+"ОЖИДАЕМЫЙ "+expectedScreenshot );
      const bugsData = await bugService.createBug(url, xpath, heightRatio, widthRatio, summary, description, actualResult, expectedResult, priority, tags, OsVersion, environment, pageResolution, actualScreenshot, expectedScreenshot, userID, parentKeyForForm);
     
      const parentKey = await urlHelper.extractParent(parentKeyForForm)
      const newparentKeyForForm = await userService.updateparentKeyForForm(userID, parentKey)
      console.log("Данные пользователя 1"+ JSON.stringify(req.user.parentKeyForForm));
        res.json({ bugs: bugsData, parentKeyForForm: newparentKeyForForm });
    } catch (error) {
      next(error);
    }
  }

 

  // async getBugs(req, res, next) {
  //   try {
      
  //     const { url } = req.query;
  //     const bugsData = await bugService.getBugs(url);

  //     if (bugsData === null) {
  //       res.status(404).json({ error: 'Страница не найдена' });
  //     } 
  //     console.log("Данные пользователя 2"+req.user.id);
  //     const userID = req.user.id
  //     const newparentKey = await userService.getparentKeyForForm(userID)
  //     const bugsList = await bugService.getUpdatedBugList(bugsData, newparentKey, userID);
  //     res.json({ bugs: bugsList, parentKeyForForm: newparentKey  });
      
  //   } catch (error) {
  //     next(error);
  //   }
  // }


  async getBug(req, res, next) {
    try {
      const { idBug } = req.query;
      const bugData = await bugService.getBug(idBug);
      if (bugData === null) {
        res.status(404).json({ error: 'Баг не найден' });
      } 
        res.json(bugData);
      
    } catch (error) {
      next(error);
    }
  }

  async getAttachments(req, res, next) {
    try {
      const { idBug } = req.query;
      const attachmentsData = await bugService.getAttachments(idBug);
      if (attachmentsData === null) {
        res.status(404).json({ error: 'Вложения к багу не найдены' });
      } 
        res.json(attachmentsData);
      
    } catch (error) {
      next(error);
    }
  }

  async getBugs(req, res, next) {
    try {
      const userID = req.user.id
      const { parentKey, url } = req.query;
      const bugsListData = await bugStatusUpdate.getUpdatedBugsForUrl(parentKey, userID, url);
      if (bugsListData === null) {
        res.status(404).json({ error: 'Список багов не найден' });
      } 
      console.log("СПИСОК БАГОВ"+JSON.stringify(bugsListData));

        const parentKeyForForm = await userService.getparentKeyForForm(userID)
        console.log("Данные пользователя 1"+ JSON.stringify(req.user.parentKeyForForm));
          res.json({ bugs: bugsListData, parentKeyForForm: parentKeyForForm });

    } catch (error) {
      next(error);
    }
  }

  async getBugList(req, res, next) {
    try {
      const userID = req.user.id
      const { parentKey, url } = req.query;
      const bugsListData = await bugStatusUpdate.getUpdatedFullBugsFromTask(parentKey, userID, url);
      if (bugsListData === null) {
        res.status(404).json({ error: 'Список багов не найден' });
      } 
      console.log("СПИСОК БАГОВ"+JSON.stringify(bugsListData));
      const parentKeyForForm = await userService.getparentKeyForForm(userID)
      console.log("Данные пользователя 1"+ JSON.stringify(req.user.parentKeyForForm));
        res.json({ bugs: bugsListData, parentKeyForForm: parentKeyForForm });
      
    } catch (error) {
      next(error);
    }
  }


}

module.exports = new BugController();
