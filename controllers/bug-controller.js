
const bugService = require('../service/bug-service');
const bugListService = require('../service/bugList-service');
const fs = require('fs');
const path = require('path');
const uuid = require('uuid');
const userService = require('../service/user-service')

const ApiError = require('../exceptions/api-error')


class BugController {
     // Функция парсинга environment
   
  async createBug(req, res, next) {
    try {
      const { url, xpath, heightRatio, widthRatio, summary, description, actualResult, expectedResult, priority, tags, OsVersion, environment, pageResolution, actualScreenshot, expectedScreenshot, parentTaskForForm} = req.body;
      const userID = req.user.id
      console.log("Данные пользователя 0"+ JSON.stringify(req.user, null, 2));
      console.log("ЭТО В СЕРВИСЕ "+ actualScreenshot+"ОЖИДАЕМЫЙ "+expectedScreenshot );
      const bugsData = await bugService.createBug(url, xpath, heightRatio, widthRatio, summary, description, actualResult, expectedResult, priority, tags, OsVersion, environment, pageResolution, actualScreenshot, expectedScreenshot, userID, parentTaskForForm);
      
      const newParentTaskForForm = await userService.updateParentTaskForForm(userID, parentTaskForForm)
      console.log("Данные пользователя 1"+ JSON.stringify(req.user.parentTaskForForm));
        res.json({ bugs: bugsData, parentTaskForForm: newParentTaskForForm });
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
  //     const newParentTask = await userService.getParentTaskForForm(userID)
  //     const bugsList = await bugService.getUpdatedBugList(bugsData, newParentTask, userID);
  //     res.json({ bugs: bugsList, parentTaskForForm: newParentTask  });
      
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
      const { parentTaskForList, url } = req.query;
      const bugsListData = await bugListService.getUpdatedBugs(parentTaskForList, userID, url);
      if (bugsListData === null) {
        res.status(404).json({ error: 'Список багов не найден' });
      } 
      console.log("СПИСОК БАГОВ"+JSON.stringify(bugsListData));

        const parentTaskForForm = await userService.getParentTaskForForm(userID)
        console.log("Данные пользователя 1"+ JSON.stringify(req.user.parentTaskForForm));
          res.json({ bugs: bugsListData, parentTaskForForm: parentTaskForForm });

    } catch (error) {
      next(error);
    }
  }

  async getBugList(req, res, next) {
    try {
      const userID = req.user.id
      const { parentTaskForList, url } = req.query;
      const bugsListData = await bugListService.getUpdatedBugList(parentTaskForList, userID);
      if (bugsListData === null) {
        res.status(404).json({ error: 'Список багов не найден' });
      } 
      console.log("СПИСОК БАГОВ"+JSON.stringify(bugsListData));
      const parentTaskForForm = await userService.getParentTaskForForm(userID)
      console.log("Данные пользователя 1"+ JSON.stringify(req.user.parentTaskForForm));
        res.json({ bugs: bugsListData, parentTaskForForm: parentTaskForForm });
      
    } catch (error) {
      next(error);
    }
  }


}

module.exports = new BugController();
