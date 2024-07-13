const projectService = require('../service/projectService');

class ProjectController {
  async createProject(req, res, next) {
    try {
      const { name, domains } = req.body;
      if (!name || !domains || !Array.isArray(domains)) {
        return res.status(400).json({ message: 'Название проекта и список доменов обязательны, и список доменов должен быть массивом' });
      }
      const project = await projectService.createProject(name, domains);
      return res.status(201).json(project);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ProjectController();
