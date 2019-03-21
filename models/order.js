const mongoose = require('mongoose');

const Schema = mongoose.Schema;
var moment = require('moment');
// var date = moment();

const orderSchema = new Schema({
    date: {
        type: Date,
        default: Date.now()
    },
    products: [{
        product: {
            type: Object,
            required: true
        },
        quantity: {
            type: Number,
            required: true
        }
        // date: {
        //     type: Date,
        //     default: Date.now()
        // }
    }],
    user: {
        name: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true
        },
        userId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'User'
        }
    }
});

module.exports = mongoose.model('Order', orderSchema);