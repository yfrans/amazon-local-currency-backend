const express = require('express');
const app = express();
const axios = require('axios').default;
const cors = require('cors');

const mongoose = require('mongoose');

const Exchange = mongoose.model('Exchange', mongoose.Schema({
    last_update: Date,
    rates: []
}));

const UPDATE_INTERVAL = 1000 * 60 * 60 * 12; // 12hrs

mongoose.connect(process.env.MONGO_CONNECTION_STRING, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false
}).then().catch(console.error);

app.use(cors());

app.get('/', async (req, res, next) => {
    try {
        let exchange = await Exchange.findOne();

        // exists in db, and newer then X hours
        if (exchange && (new Date() - exchange.last_update) < UPDATE_INTERVAL) {
            return res.send(exchange.rates);
        }

        // fetch from api
        let resp = await axios.get(`https://api.getgeoapi.com/api/v2/currency/convert?api_key=${process.env.EXCHANGE_API_KEY}&from=USD`);
        // convert rates object to array
        let data = resp.data;
        let rates = Object.keys(data.rates).map(key => ({
            currency_name: data.rates[key].currency_name,
            rate: data.rates[key].rate,
            currency_code: key
        }));

        // create or update the db with the new rates
        exchange = await Exchange.findOneAndUpdate({},
            { last_update: new Date(), rates },
            { new: true, upsert: true });

        return res.send(rates);

    } catch (error) {
        console.log(error.message);
        next(error)
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Started @ ${port}`));