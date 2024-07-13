module.exports = class BugDTO {
    constructor({
      domainId,
      path,
      xpath,
      heightRatio,
      widthRatio,
      taskId,
      taskKey,
      summary,
      status,
      finalOsVersion,
      browser,
      pageResolution,
      bugNumber, 
      existsOnPage,
      createdAt,
      author
    }) {
      this.domainId = domainId,
      this.path = path,
      this.xpath = xpath;
      this.heightRatio = heightRatio;
      this.widthRatio = widthRatio;
      this.taskId = taskId;
      this.taskKey = taskKey;
      this.summary = summary;
      this.status = status;
      this.finalOsVersion = finalOsVersion;
      this.browser = browser;
      this.pageResolution = pageResolution;
      this.bugNumber = bugNumber;
      this.existsOnPage = existsOnPage,
      this.createdAt = createdAt,
      this.author = author





    }
  }