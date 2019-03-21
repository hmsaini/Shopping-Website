const fs = require("fs");
const path = require("path");

// Set your secret key: remember to change this to your live secret key in production
// See your keys here: https://dashboard.stripe.com/account/apikeys
var stripe = require("stripe")("sk_test_A3LjBI8NZuvTYGrqia1OzcGM");

const PDFDocument = require("pdfkit");

const Product = require("../models/product");
const Order = require("../models/order");

const ITEMS_PER_PAGE = 2;

exports.getProducts = (req, res, next) => {
  console.log(req.session.isLoggedIn);
  Product.find()
    .then(products => {
      res.render("shop/product-list", {
        title: "All products",
        products: products
        // isAuthenticated: req.session.isLoggedIn
      });
    })
    .catch(err => console.log(err));
};

exports.getProduct = (req, res, next) => {
  const prodId = req.params.id;
  Product.findById(prodId)
    .then(product => {
      res.render("shop/product-details", {
        product: product,
        title: "Single Product"
        // isAuthenticated: req.session.isLoggedIn
      });
    })
    .catch(err => console.log(err));
};

exports.getIndex = (req, res, next) => {
  const page = +req.query.page || 1;
  let totalItems;

  Product.find()
    .countDocuments()
    .then(numProducts => {
      totalItems = numProducts;
      return Product.find();
      // .skip((page - 1) * ITEMS_PER_PAGE)
      // .limit(ITEMS_PER_PAGE);
    })
    .then(products => {
      res.render("shop/index", {
        title: "shop",
        products: products
        // totalProducts: totalItems,
        // currentPage: page,
        // hasNextPage: ITEMS_PER_PAGE * page < totalItems,
        // hasPreviousPage: page > 1,
        // nextPage: page + 1,
        // previousPage: page - 1,
        // lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)
      });
    })
    .catch(err => console.log(err));
};

exports.getCart = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .execPopulate()
    .then(user => {
      // console.log(user.cart.items);
      const products = user.cart.items;
      res.render("shop/cart", {
        title: "Cart",
        products: products
        // isAuthenticated: req.session.isLoggedIn
      });
    })
    .catch(err => console.log(err));
};

exports.postCart = (req, res, next) => {
  const isAuthenticated = req.session.isLoggedIn;
  if (isAuthenticated) {
    const prodId = req.body._id;
    Product.findById(prodId)
      .then(product => {
        return req.user.addToCart(product);
      })
      .then(result => {
        console.log(result);
        res.redirect("/cart");
      });
  } else {
    res.redirect("/login");
  }
};

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  req.user
    .removeFromCart(prodId)
    .then(result => {
      console.log(result);
      res.redirect("/cart");
    })
    .catch(err => console.log(err));
};

exports.postOrder = (req, res, next) => {
  // Token is created using Checkout or Elements!
  // Get the payment token ID submitted by the form:
  const token = req.body.stripeToken; // Using Express
  let totalSum = 0;

  req.user
    .populate("cart.items.productId")
    .execPopulate()
    .then(user => {
      user.cart.items.forEach(p => {
        totalSum += p.quantity * p.productId.price;
      });
      const products = user.cart.items.map(i => {
        return {
          quantity: i.quantity,
          product: {
            ...i.productId._doc
          }
        };
      });
      const order = new Order({
        user: {
          name: req.user.name,
          email: req.user.email,
          userId: req.user // mongoose can access the userId from req.user directly
        },
        products: products
      });
      return order.save();
    })
    .then(result => {
      const charge = stripe.charges.create({
        // amount: totalSum * 100,
        amount: totalSum,
        currency: "usd",
        description: "Your Order",
        source: token,
        metadata: {
          order_id: result._id.toString()
        }
      });
      return req.user.clearCart(); // when order is placed , clear the cart
    })
    .then(() => {
      res.redirect("/orders");
    })
    .catch(err => console.log(err));
};

exports.getOrders = (req, res, next) => {
  Order.find({
    "user.userId": req.user._id
  })
    .sort({
      date: -1
    })
    .then(orders => {
      console.log(orders);
      res.render("shop/orders", {
        title: "Your Orders",
        orders: orders
        // isAuthenticated: req.session.isLoggedIn
      });
    })
    .catch(err => {
      console.log(err);
    });
};

exports.getCheckout = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .execPopulate()
    .then(user => {
      // console.log(user.cart.items);
      const products = user.cart.items;
      var total = 0;
      products.forEach(p => {
        total += p.quantity * p.productId.price;
      });
      // total = Math.round(total);
      total = parseInt(total);
      console.log(typeof total);

      res.render("shop/checkout", {
        title: "Checkout",
        products: products,
        totalSum: total
        // isAuthenticated: req.session.isLoggedIn
      });
    })
    .catch(err => console.log(err));
};

exports.getInvoice = (req, res, next) => {
  const orderId = req.params.orderId;
  Order.findById(orderId)
    .then(order => {
      if (!order) {
        return next(new Error("No order found."));
      }
      if (order.user.userId.toString() !== req.user._id.toString()) {
        return next(new Error("Unauthorized"));
      }
      const invoiceName = "invoice" + orderId + ".pdf";
      const invoicePath = path.join("data", "invoices", invoiceName);

      const pdfDoc = new PDFDocument();
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        'inline; filename="' + invoiceName + '"'
      );
      pdfDoc.pipe(fs.createWriteStream(invoicePath));
      pdfDoc.pipe(res);

      pdfDoc.fontSize(26).text("Invoice", {
        underline: true
      });
      pdfDoc.text("-------------------------------------");
      let totalPrice = 0;
      order.products.forEach(prod => {
        totalPrice += prod.quantity * prod.product.price;
        pdfDoc.fontSize(16).text("=================");
        pdfDoc.fontSize(14).text("Title :" + prod.product.title);
        pdfDoc.fontSize(14).text("Quantity :" + prod.quantity);
        pdfDoc
          .fontSize(14)
          .text("price :" + prod.quantity + " x " + " $" + prod.product.price);
        pdfDoc.fontSize(16).text("=================");
        pdfDoc.fontSize(16).text("\n");
      });
      pdfDoc.text("-------");
      pdfDoc.fontSize(20).text("Total Price: $" + totalPrice.toFixed(2));
      pdfDoc.end();

      // fs.readFile(invoicePath, (err, data) => {
      //   if (err) {
      //     return next(err);
      //   }
      //   res.setHeader('Content-Type', 'application/pdf');
      //   res.setHeader('Content-Disposition', 'inline; filename="' + invoiceName + '"');
      //   res.send(data);
      // });
      // const file = fs.createReadStream(invoicePath);

      // file.pipe(res);
    })
    .catch(err => next(err));
};
