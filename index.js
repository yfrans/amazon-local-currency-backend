const express = require('express');
const app = express();
const axios = require('axios').default;

const mongoose = require('mongoose');

const Exchange = mongoose.model('Exchange', mongoose.Schema({
    last_update: Date,
    rates: [{
        currency_name: String,
        currency_code: String,
        rate: Number
    }]
}));

mongoose.connect(process.env.MONGO_CONNECTION_STRING).then(() => {});

app.get('/', async (req, res) => {
    let exchange = await Exchange.findOne();
    if (!exchange || (new Date() - exchange.last_update) >= 1000 * 60 * 60 * 12) {
        let resp = await axios.get(`https://api.getgeoapi.com/api/v2/currency/convert?api_key=${process.env.EXCHANGE_API_KEY}&from=USD`);
        let data = resp.data;
        let v = [];
        Object.keys(data.rates).forEach(key => v.push({
            currency_name: data.rates[key].currency_name,
            rate: data.rates[key].rate,
            currency_code: key
        }));

        if (!exchange) {
            exchange = await Exchange.create({
                last_update: new Date(),
                rates: v
            });
        } else {
            exchange.last_update = new Date();
            rates = v;
            await exchange.save();
        }
    }
    res.send(exchange.rates);
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Started @ ${port}`));