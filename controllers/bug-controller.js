
const bugService = require('../service/bug-service');
const fs = require('fs');
const path = require('path');
const uuid = require('uuid');

const ApiError = require('../exceptions/api-error')


class BugController {
     // Функция парсинга environment
   
  async createBug(req, res, next) {
    try {
      const { url, xpath, heightRatio, widthRatio, summary, description, actualResult, expectedResult, priority, executor, OsVersion, environment, pageResolution, actualScreenshot, expectedScreenshot } = req.body;
      console.log("ЭТО В СЕРВИСЕ "+ actualScreenshot+"ОЖИДАЕМЫЙ "+expectedScreenshot );

      const bugData = await bugService.createBug(url, xpath, heightRatio, widthRatio, summary, description, actualResult, expectedResult, priority, executor, OsVersion, environment, pageResolution, actualScreenshot, expectedScreenshot);
        res.json(bugData);
    } catch (error) {
      next(error);
    }
  }

 

  async getBugs(req, res, next) {
    try {
      const { url } = req.query;
      const bugsData = await bugService.getBugs(url);
      if (bugsData === null) {
        res.status(404).json({ error: 'Страница не найдена' });
      } 
        res.json(bugsData);
      
    } catch (error) {
      next(error);
    }
  }


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

  async getBugList(req, res, next) {
    try {
      const body = req.body;
      const bugsListData = await bugService.getBugListData(body);
      if (bugsListData === null) {
        res.status(404).json({ error: 'Список багов не найден' });
      } 
        res.json(bugsListData);
      
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new BugController();
