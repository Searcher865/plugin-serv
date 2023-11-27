const fs = require('fs');
const path = require('path');
const uuid = require('uuid');

const fileUploadMiddleware = (actualScreenshot, expectedScreenshot) => {
  return (req, res, next) => {
    const file = req.files[actualScreenshot];
    
    if (!file) {
      return res.status(400).json({ error: 'Обязательный файл не был загружен.' });
    }

    const uploadDir = path.join(__dirname, '../upload');
    const fileExtension = path.extname(file.name); 
    const fileName = `${uuid.v4()}${fileExtension}`; 
    const filePath = path.join(uploadDir, fileName);

    const writeStream = fs.createWriteStream(filePath);
    writeStream.write(file.data, (error) => {
      if (error) {
        console.error('Ошибка записи файла:', error);
        return res.status(500).json({ error: 'Ошибка записи файла.' });
      }
    });
    writeStream.end();
    req.body[actualScreenshot] = fileName; // сохраняем имя файла в объекте запроса для дальнейшего использования
    console.log("ФАКТИЧЕСКИЙ "+ req.body[actualScreenshot]);

    // Обрабатываем второй файл, если предоставлен
    if (req.files[expectedScreenshot]) {
      const optionalFile = req.files[expectedScreenshot];
      console.log("Это должно выполнится если ОР есть " +optionalFile) ;

      if (optionalFile) {
        const optionalFileName = `${uuid.v4()}${path.extname(optionalFile.name)}`;
        const optionalFilePath = path.join(uploadDir, optionalFileName);

        const optionalWriteStream = fs.createWriteStream(optionalFilePath);
        optionalWriteStream.write(optionalFile.data, (optionalError) => {
          if (optionalError) {
            console.error('Ошибка записи второго файла:', optionalError);
            return res.status(500).json({ error: 'Ошибка записи второго файла.' });
          }
        });
        optionalWriteStream.end();
        req.body[expectedScreenshot] = optionalFileName; // сохраняем имя второго файла в объекте запроса
        console.log("ОЖИДАЕМЫЙ "+ req.body[expectedScreenshot]);
      }
    } else {
      console.log("Это должно выполнится если ОР ОТСУТСТВУЕТ");
      req.body[expectedScreenshot] =  null
    }

    next();
  };
};

module.exports = fileUploadMiddleware;
