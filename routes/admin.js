var express = require('express');
var router = express.Router();

const adminController = require('../controllers/admin');
const isAuth = require('../middleware/is-auth');
const {
  body
} = require('express-validator/check');

/* GET users listing. */
router.get('/', function (req, res, next) {
  res.send('respond with a resource');
});

// add product
router.get('/add-product', isAuth, adminController.getAddProduct);

router.post('/add-product',
  [
    body('title')
    .isString()
    .isLength({
      min: 3
    })
    .trim(),
    // body('imageUrl').isURL(),
    body('price').isFloat(),
    body('description')
    .isLength({
      min: 5,
      max: 400
    })
    .trim()
  ],
  isAuth, adminController.postAddProduct);

router.get('/products', isAuth, adminController.getProducts);

router.get('/edit-product/:id', isAuth, adminController.getEditProduct);

router.post('/edit-product/:id',
[
  body('title')
  .isString()
  .isLength({
    min: 3
  })
  .trim(),
  // body('imageUrl').isURL(),
  body('price').isFloat(),
  body('description')
  .isLength({
    min: 5,
    max: 400
  })
  .trim()
],
 isAuth, adminController.postEditProduct);

router.post('/delete-product/:id', isAuth, adminController.postDeleteProduct);

module.exports = router;