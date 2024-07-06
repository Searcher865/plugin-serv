module.exports = class BugDTO {
    constructor({
      domainId,
      pageId,
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
      bugNumber
    }) {
      this.domainId = domainId,
      this.pageId = pageId,
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





    }
  }