const UserModel = require("../models/user-model")
const bcrypt = require('bcrypt')
const uuid = require('uuid')
const mailService = require('./mail-service')
const tokenService = require('./token-service')
const UserDto = require('../dtos/user-dto')
const ApiError = require('../exceptions/api-error')

class UserService {
    async registration(email, password) {
        const candidate = await UserModel.findOne({email})
        if (candidate) {
            throw ApiError.BadRequest(`Пользователь с почтовым адресом ${email} уже существует`)
        }
        const hashPassword = await bcrypt.hash(password, 3)
        const activationLink = uuid.v4()
        const fullActivationLink = `${process.env.API_URL}/api/activate/${activationLink}`
        const user = await UserModel.create({email, password: hashPassword, activationLink})
        
        // await mailService.sendActivationMail(email, `${process.env.API_URL}/api/activate/${activationLink}`); //здесь отправка письма через email
        const userDto = new UserDto(user);
        const tokens = tokenService.generateTokens({...userDto})
        await tokenService.saveToken(userDto.id, tokens.refreshToken);

        return {...tokens, user: userDto, fullActivationLink}
    }

    async activate(activationLink) {
        const user = await UserModel.findOne({activationLink})
        if(!user) {
            throw ApiError.BadRequest('Неккоректная ссылка активации')
        }
        user.isActivated = true;
        await user.save()
    }

    async login (email, password) {
        const user = await UserModel.findOne({email})
        if (!user) {
            throw ApiError.BadRequest('Пользователь с таким email не найден')
        }
        const isPassEquals = await bcrypt.compare(password, user.password)
        if (!isPassEquals) {
            throw ApiError.BadRequest('Неверный пароль')
        }
        const userDto = new UserDto(user)
        const tokens = tokenService.generateTokens({...userDto});

        await tokenService.saveToken(userDto.id, tokens.refreshToken);
        return {...tokens, user: userDto}
    }

    async logout(refreshToken) {
        const token = await tokenService.removeToken(refreshToken);
        return token
    }

    async refresh(refreshToken) {
        if (!refreshToken) {
            throw ApiError.UnauthorizedError()            
        }
        const userData = tokenService.validateRefreshToken(refreshToken);
        const tokenFromData = await tokenService.findToken(refreshToken);
        if (!userData || !tokenFromData) {
            throw ApiError.UnauthorizedError()
        }
        
        const user = await UserModel.findById(userData.id)
        const userDto = new UserDto(user)
        const tokens = tokenService.generateTokens({...userDto});

        await tokenService.saveToken(userDto.id, tokens.refreshToken);
        return {...tokens, user: userDto}
    }

    async getAllUsers() {
        const users = await UserModel.find()
        return users
    }


    async getParentTaskForFormByUserId(userId) {
        try {
            const user = await UserModel.findById(userId);
            if (!user) {
                throw new Error('Пользователь не найден');
            }
            return user.parentTaskForForm;
        } catch (error) {
            throw error;
        }
    }

    async updateParentTaskForForm(userID, newParent) {
        try {
            // Находим пользователя по userID
            const user = await UserModel.findById(userID);
    
            if (!user) {
                throw new Error('Пользователь не найден');
            }
    
            // Проверяем, отличается ли новый parent от текущего значения
            if (user.parentTaskForForm === newParent) {
                console.log(`Значение parentTaskForForm для пользователя с ID ${userID} уже установлено на "${newParent}". Обновление не требуется.`);
                return user.parentTaskForForm; // Возвращаем текущего пользователя без изменений
            }
    
            // Обновляем значение parentTaskForForm у пользователя
            user.parentTaskForForm = newParent;
    
            // Сохраняем обновленного пользователя в базе данных
            await user.save();
    
            console.log(`Значение parentTaskForForm для пользователя с ID ${userID} успешно обновлено на "${newParent}".`);
            return user.parentTaskForForm; // Возвращаем обновленного пользователя, если это необходимо
        } catch (error) {
            console.error(`Ошибка при обновлении parentTaskForForm для пользователя с ID ${userID}:`, error.message);
            throw error; // Пробрасываем ошибку дальше, чтобы ее можно было обработать
        }
    }

    async getParentTaskForForm(userID) {
        try {
            // Находим пользователя по userID
            const user = await UserModel.findById(userID);
            console.log("УСПЕШНОЕ ВОЗВРАЩЕНИЕ "+user);
            if (!user) {
                throw new Error('Пользователь не найден');
            }
            console.log("УСПЕШНОЕ ВОЗВРАЩЕНИЕ "+user.parentTaskForForm);
            return user.parentTaskForForm; // Возвращаем обновленного пользователя, если это необходимо
        } catch (error) {
            console.error(`Ошибка при обновлении parentTaskForForm для пользователя с ID ${userID}:`, error.message);
            throw error; // Пробрасываем ошибку дальше, чтобы ее можно было обработать
        }
    }
}

module.exports = new UserService()