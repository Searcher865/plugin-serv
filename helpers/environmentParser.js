const UAParser = require('ua-parser-js');


class EnvironmentParser {
  async parseEnvironment(environment) {
    // Регулярные выражения для поиска ОС и браузер
    let parsedOsVersion =  this.getOsVersion(environment)
    let browser =  this.getBrowser(environment)
    return { parsedOsVersion, browser }
  }

  
  getOsVersion(environment) {
    console.log("ВЫВОДИМ ДЛЯ ПАРСЕНГА ОС: " + environment);
    const parser = new UAParser();
    const result = parser.setUA(environment).getResult();

    console.log(JSON.stringify(result.device, null, 2));

    if (environment.includes("Windows NT 10.0")) {
      return "Windows 11";
    } else if (result.device.type === 'mobile' || result.device.type === 'tablet') {
        return `${result.device.model}; ${result.os.name} ${result.os.version}`;
    } else {
        return `${result.os.name} ${result.os.version}`;
    }

  }

  getBrowser(environment) {
    let browserInfo = "Неизвестный браузер"; // По умолчанию, если браузер не определен
  
    // Регулярные выражения для поиска названия браузера и его версии
    const regexChrome = /Chrome\/([\d.]+)/;
    const regexFirefox = /Firefox\/([\d.]+)/;
    const regexSafari = /Version\/([\d.]+).*Safari/;
    const regexEdge = /Edg\/([\d.]+)/;
    const regexIE = /MSIE ([\d.]+)/;
    const regexYandex = /YaBrowser\/([\d.]+)/; // Для Яндекс.Браузера
    const regexMI = /MiuiBrowser\/([\d.]+)/; // Для MI Browser
    const regexSamsung = /SamsungBrowser\/([\d.]+)/; // Для Samsung Browser
    const regexOpera = /OPR\/([\d.]+)/; // Для Opera
  
    if (regexChrome.test(environment)) {
      browserInfo = `Chrome ${environment.match(regexChrome)[1]}`;
    } else if (regexFirefox.test(environment)) {
      browserInfo = `Firefox ${environment.match(regexFirefox)[1]}`;
    } else if (regexSafari.test(environment)) {
      browserInfo = `Safari ${environment.match(regexSafari)[1]}`;
    } else if (regexEdge.test(environment)) {
      browserInfo = `Microsoft Edge ${environment.match(regexEdge)[1]}`;
    } else if (regexIE.test(environment)) {
      browserInfo = `Internet Explorer ${environment.match(regexIE)[1]}`;
    } else if (regexYandex.test(environment)) {
      browserInfo = `Яндекс.Браузер ${environment.match(regexYandex)[1]}`;
    } else if (regexMI.test(environment)) {
      browserInfo = `MI Browser ${environment.match(regexMI)[1]}`;
    } else if (regexSamsung.test(environment)) {
      browserInfo = `Samsung Browser ${environment.match(regexSamsung)[1]}`;
    } else if (regexOpera.test(environment)) {
      browserInfo = `Opera ${environment.match(regexOpera)[1]}`;
    }
  
    return browserInfo;
}
}

module.exports = new EnvironmentParser()