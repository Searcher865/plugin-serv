const {Router} = require('express')
const userController = require('../controllers/user-controller')
const router = new Router();
const {body} = require('express-validator')
const authMiddleware = require('../middlewares/auth-middleware')
const bugController = require('../controllers/bug-controller');


router.post('/registration', 
    body('email').isEmail(),
    body('password').isLength({min: 3, max: 32}),
    userController.registration);
router.post('/login', userController.login); //email:string *, password:string *
router.post('/logout', userController.logout); //refreshToken * в хедере
router.get('/activate/:link', userController.activate); 
router.get('/refresh', userController.refresh);
router.get('/users', authMiddleware, userController.getUsers); 
router.post('/bug', authMiddleware, bugController.createBug); // site:string * (вид вот такой http://www.test.ru/test именно с в начале http://www. или http://localhost:3000), xpath
router.get('/bugs', authMiddleware, bugController.getBugs);

module.exports = router