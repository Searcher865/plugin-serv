module.exports = class UserDto {
    email;
    id;
    parentKeyForForm;
    isActivated;

    constructor(model) {
        this.email = model.email;
        this.id = model._id;
        this.parentKeyForForm = model.parentKeyForForm;
        this.isActivated = model.isActivated;
    }
}
