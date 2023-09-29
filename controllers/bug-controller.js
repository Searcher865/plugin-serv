
const bugService = require('../service/bug-service');
const fs = require('fs');
const path = require('path');
const uuid = require('uuid');
const ApiError = require('../exceptions/api-error')

class BugController {
  async createBug(req, res, next) {
    try {
      const { url, xpath, heightRatio, widthRatio, summary, description, environment } = req.body;
      const file = req.files.file;
      if (!file) {
        return res.status(400).json({ error: 'Файл не был загружен.' });
      }
      const uploadDir = path.join(__dirname, '../upload');
      const fileExtension = path.extname(file.name); 
      const uniqueFileName = `${uuid.v4()}${fileExtension}`; 
      const filePath = path.join(uploadDir, uniqueFileName);
      const writeStream = fs.createWriteStream(filePath);
      writeStream.write(file.data, (error) => {
        if (error) {
          console.error('Ошибка записи файла:', error);
          return res.status(500).json({ error: 'Ошибка записи файла.' });
        }
      });
      writeStream.end();
      const bugData = await bugService.createBug(url, xpath, heightRatio, widthRatio, summary, description, environment, uniqueFileName);
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
}

module.exports = new BugController();
