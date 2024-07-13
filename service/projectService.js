const Project = require('../models/project-model');

class ProjectService {
  async createProject(name, domains) {
    try {
      const project = new Project({ name, domains });
      await project.save();
      return project;
    } catch (error) {
      console.error(error);
      throw new Error('Ошибка при создании проекта: ' + error.message);
    }
  }

  
}

module.exports = new ProjectService();
