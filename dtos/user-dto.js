module.exports = class UserDto {
    email;
    id;
    parentTaskForForm;
    isActivated;

    constructor(model) {
        this.email = model.email;
        this.id = model._id;
        this.parentTaskForForm = model.parentTaskForForm;
        this.isActivated = model.isActivated;
    }
}
