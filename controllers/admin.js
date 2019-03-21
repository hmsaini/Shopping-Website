const mongodb = require('mongodb');
const mongoose = require('mongoose');
const fileHelper = require('../util/file');

const Product = require('../models/product');
const {
    validationResult
} = require('express-validator/check');

const ObjectId = mongodb.ObjectId;

exports.getAddProduct = (req, res, next) => {
    // if (!req.session.isLoggedIn) {
    //     return res.redirect('/login');
    // }
    res.render('admin/AddProduct', {
        title: 'Add Product',
        editing: false,
        hasError: false,
        errorMessage: null,
        oldInput: {
            title: '',
            imageUrl: '',
            price: '',
            description: ''
        },
        validationErrors: []
        // isAuthenticated: req.session.isLoggedIn
    });
}

exports.postAddProduct = (req, res, next) => {
    const title = req.body.title;
    // const imageUrl = req.body.imageUrl;
    const image = req.file;
    const price = req.body.price;
    const description = req.body.description;
    console.log(req.user);
    console.log(image);
    if (!image) {
        return res.status(422).render('admin/AddProduct', {
            title: 'Add Product',
            hasError: true,
            oldInput: {
                title: title,
                price: price,
                description: description
            },
            errorMessage: 'Attached file is not an image.',
            validationErrors: []
        });
    }

    const errors = validationResult(req);
    console.log(errors.array())
    if (!errors.isEmpty()) {
        return res.status(422).render('admin/AddProduct', {
            title: 'Add Product',
            hasError: true,
            oldInput: {
                title: title,
                imageUrl: imageUrl,
                price: price,
                description: description
            },
            errorMessage: errors.array()[0].msg,
            validationErrors: errors.array()
        });
    }

    const imageUrl = image.path;

    const product = new Product({
        title: title,
        price: price,
        description: description,
        imageUrl: imageUrl,
        userId: req.user
    });

    product
        .save()
        .then(result => {
            // console.log(result);
            console.log('Data Added Successfully!');
            res.redirect('/');
        })
        .catch(err => console.log(err));
}

exports.getEditProduct = (req, res, next) => {
    const prodId = req.params.id;
    Product.findById(prodId)
        .then(product => {
            if (!product) {
                return res.redirect('/');
            }
            res.render('admin/editProduct', {
                title: 'Edit',
                product: product,
                hasError: false,
                errorMessage: null,
                validationErrors: []
                // isAuthenticated: req.session.isLoggedIn
            });
        })
        .catch(err => console.log(err));
};

exports.postEditProduct = (req, res, next) => {
    const prodId = req.body.productId;
    const updatedTitle = req.body.title;
    const updatedPrice = req.body.price;
    // const updatedImageUrl = req.body.imageUrl;
    const image = req.file;
    const updatedDescription = req.body.description;

    const errors = validationResult(req);
    console.log(errors.array())
    if (!errors.isEmpty()) {
        return res.status(422).render('admin/editProduct', {
            title: 'Edit Product',
            hasError: true,
            product: {
                title: updatedTitle,
                price: updatedPrice,
                description: updatedDescription,
                _id: prodId // mandatory here
            },
            errorMessage: errors.array()[0].msg,
            validationErrors: errors.array()
        });
    }

    Product.findById(prodId)
        .then(product => {
            if (product.userId.toString() !== req.user._id.toString()) {
                // This means a wrong user is trying to update 
                return res.redirect('/');
            }
            product.title = updatedTitle;
            product.price = updatedPrice;
            product.description = updatedDescription;

            // if user picks a new image, then delete the old image and save the new image
            if (image) {
                fileHelper.deleteFile(product.imageUrl);
                product.imageUrl = image.path;
            }

            return product.save()
                .then(result => {
                    console.log('DATA UPDATED SUCCESSFULLY!!');
                    res.redirect('/admin/products');
                });
        })
        .catch(err => console.log(err));
};

exports.getProducts = (req, res, next) => {
    // only admin can list the products hence needs Authorization
    // when admin is loggedIn who has created all the products
    // then check for admin by userId
    Product
        .find({
            userId: req.user._id
        })
        // .select('title price -_id') // it will only select title & price & exclude id
        // .populate('userId')  // it will show complete userId
        // .populate('userId', 'name') // will show userId with name only
        .then(products => {
            console.log(products);
            res.render('admin/listProducts', {
                title: 'Admin Products',
                products: products,
                // isAuthenticated: req.session.isLoggedIn
            });
        })
        .catch(err => console.log(err));
}

exports.postDeleteProduct = (req, res, next) => {
    const prodId = req.params.id;
    Product.findById(prodId)
        .then(product => {
            if (!product) {
                return next(new Error('Product not found.'));
            }
            fileHelper.deleteFile(product.imageUrl);

            // Again only admin can delete the product
            // So check whether admin is trying to delete the product or some wrong user
            return Product.deleteOne({
                _id: prodId,
                userId: req.user._id
            });
        })
        .then(() => {
            console.log('DATA DELETED SUCCESSFULLY!');
            res.redirect('/admin/products');
        })
        .catch(err => console.log(err));
};