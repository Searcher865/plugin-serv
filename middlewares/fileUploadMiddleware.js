const fs = require('fs');
const path = require('path');
const uuid = require('uuid');
const ApiError = require('../exceptions/api-error');

const fileUploadMiddleware = (actualScreenshot, expectedScreenshot) => {
  return (req, res, next) => {
    // Проверка наличия файла actualScreenshot
    if (!req.body || !req.body[actualScreenshot]) {
      return next(ApiError.BadRequest('Скриншот окна браузера не был отправлен на сервер'));
    }

    const actualScreenshotBase64 = req.body[actualScreenshot];
    const uploadDir = path.join(__dirname, '../upload');
    const fileName = `${uuid.v4()}.jpeg`; // Указываем расширение файла
    const filePath = path.join(uploadDir, fileName);

    const base64Data = actualScreenshotBase64.replace(/^data:image\/jpeg;base64,/, "");
    fs.writeFile(filePath, base64Data, 'base64', (error) => {
      if (error) {
        console.error('Ошибка записи файла:', error);
        return res.status(500).json({ error: 'Ошибка записи файла.' });
      }

      req.body[actualScreenshot] = fileName; // сохраняем имя файла в объекте запроса для дальнейшего использования
      console.log("ФАКТИЧЕСКИЙ " + req.body[actualScreenshot]);

      // Обрабатываем второй файл, если предоставлен
      if (req.body[expectedScreenshot]) {
        const expectedScreenshotBase64 = req.body[expectedScreenshot];
        const optionalFileName = `${uuid.v4()}.jpeg`;
        const optionalFilePath = path.join(uploadDir, optionalFileName);

        const optionalBase64Data = expectedScreenshotBase64.replace(/^data:image\/jpeg;base64,/, "");
        fs.writeFile(optionalFilePath, optionalBase64Data, 'base64', (optionalError) => {
          if (optionalError) {
            console.error('Ошибка записи второго файла:', optionalError);
            return res.status(500).json({ error: 'Ошибка записи второго файла.' });
          }

          req.body[expectedScreenshot] = optionalFileName; // сохраняем имя второго файла в объекте запроса
          console.log("ОЖИДАЕМЫЙ " + req.body[expectedScreenshot]);

          next();
        });
      } else {
        console.log("Это должно выполнится если ОР ОТСУТСТВУЕТ");
        req.body[expectedScreenshot] = null;
        next();
      }
    });
  };
};

module.exports = fileUploadMiddleware;
