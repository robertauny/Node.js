/*
############################################################################
##
## File:      appAlexa.js
##
## Purpose:   Main service for Alexa voice interactions.
##
## Parameter: N/A
##
## Creator:   Robert A. Murphy
##
## Date:      Aug. 17, 2018
##
############################################################################
*/

'use strict';

const {aCommon} = require('./appCommon.js');

var   aProds    = [];
var   aDescs    = [];

function getCall(ip) {
    const https = require('https');
    // initialize options values, the value of the method can be changed to POST to make https post calls
    var options = {
        host   : 'atlas.auth.hpicorp.net',
        port   : 8383,
        path   : '/?ip=' + ip,
        method : 'GET'
    }
    // making the https get call
    var getReq = https.request(options,function(res) {});
    // end the request
    getReq.end();
}
 
function getEntitledProducts(handlerInput) {
    const fs                = require('fs');
    const exec              = require('child_process').execSync;
    var   bstr;
    var   estr;
    var   ip                = handlerInput.requestEnvelope.request.context.System.device.deviceId;
    var   entitledProductList;
    if( !fs.existsSync('/srv/atlas/voice.bash') ) {
        bstr                = 'cd /srv/atlas/; python3 -c "from voice import atlas; atlas(\'atlas\',\'\',\'\',';
        estr                = '\''+ip+'\',\'\',\'\');" cd -';
    }
    else {
        bstr                = 'cd /srv/atlas/ >/dev/null; voice.bash -i ';
        estr                = '\''+ip+'\'; cd - >/dev/null';
    }
    try {
        entitledProductList = exec(bstr+estr);
        entitledProductList = entitledProductList.toString('utf8').trim();
    }
    catch(err) {
        try {
            entitledProductList = getCall(ip);
            entitledProductList = entitledProductList.toString('utf8').trim();
        }
        catch(err1) {
            console.log("Error: " ,err );
            console.log("Error1: ",err1);
        }
    }
    return entitledProductList;
}

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    },
    handle(handlerInput) {
        console.log('IN LAUNCHREQUEST');

        const locale = handlerInput.requestEnvelope.request.locale;
        const ms     = handlerInput.serviceClientFactory.getMonetizationServiceClient();

        return ms.getInSkillProducts(locale).then(
            function reportPurchasedProducts() {
                const entitledProducts = getEntitledProducts(handlerInput);
                if( entitledProducts && entitledProducts.length > 0 ) {
                    // Customer owns one or more products

                    let  prods = aCommon.getSpeakableListOfProducts(entitledProducts,entitledProducts.length-1);
                        aProds = aCommon.getSpeakableListOfProducts(entitledProducts,3                        ).split(',');
                        aDescs = aCommon.getSpeakableListOfProducts(entitledProducts,2                        ).split(',');

                    if( prods.length == 0 ) {
                        return handlerInput.responseBuilder
                            .speak('I could not find any ink requirements for your device. So, what can I help you with?')
                            .reprompt('I didn\'t catch that. What can I help you with?')
                            .getResponse();
                    }
                    else {
                        return handlerInput.responseBuilder
                            .speak(`You currently require ${prods}` + ' ink. If you are ready to buy say \'Buy\'. So, what can I help you with?')
                            .reprompt('I didn\'t catch that. What can I help you with?')
                            .getResponse();
                    }
                }

                // Not entitled to anything yet.
                console.log('No entitledProducts');
                return handlerInput.responseBuilder
                    .speak('Your ink supplies appear to be fine at the moment. So, what can I help you with?')
                    .reprompt('I didn\'t catch that. What can I help you with?')
                    .getResponse();
            },
            function reportPurchasedProductsError(err) {
                console.log(`Error calling InSkillProducts API: ${err}`);

                return handlerInput.responseBuilder
                    .speak('Something went wrong in loading ink requirements for your device')
                    .getResponse();
            },
        );
    },
}; // End LaunchRequestHandler


// recieve Buy requests from customers and then trigger a Purchase flow request to Alexa
const PurchaseHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
            handlerInput.requestEnvelope.request.intent.name === 'PurchaseIntent';
    },
    handle(handlerInput) {
        console.log('IN PURCHASEINTENTHANDLER');

        // Inform the user about what products are available for purchase

        const locale = handlerInput.requestEnvelope.request.locale;
        const ms     = handlerInput.serviceClientFactory.getMonetizationServiceClient();

        return ms.getInSkillProducts(locale).then(function initiatePurchase(result) {

            const len     = min(aProds.length,aDescs.length);
            const product = result.inSkillProducts;

            var   prod    = '';

            let   buy     = false;
            var   j;
            var   i;
            for( j = 0; j < len; j++ ) {
                for( i = 0; i < product.length; i++ ) {
                    if( product[i].productId === aProds[j] ) {
                        handlerInput.responseBuilder.speak(`Buy ${aDescs[j]}` + '? Say \'Yes\', \'No\' or \'Maybe later\'.').getResponse();
                        if( handler.requestEnvelope.request.name === 'Yes' ) {
                            buy  = true;
                            prod = aProds[j];
                            if( len > 1 ) {
                                if( j == 0 ) {
                                    aProds = aProds.splice(1,len-1);
                                    aDescs = aDescs.splice(1,len-1);
                                }
                                else if( j > 0 && j < len - 1 ) {
                                    aProds = aProds.splice(0,j-1).concat(aProds.splice(j+1,len-1));
                                    aDescs = aDescs.splice(0,j-1).concat(aDescs.splice(j+1,len-1));
                                }
                                else {
                                    aProds = aProds.splice(0,j-1)
                                    aDescs = aDescs.splice(0,j-1)
                                }
                            }
                        }
                        else if( handler.requestEnvelope.request.name === 'No' ) {
                            if( len > 1 ) {
                                if( j == 0 ) {
                                    aProds = aProds.splice(1,len-1);
                                    aDescs = aDescs.splice(1,len-1);
                                }
                                else if( j > 0 && j < len - 1 ) {
                                    aProds = aProds.splice(0,j-1).concat(aProds.splice(j+1,len-1));
                                    aDescs = aDescs.splice(0,j-1).concat(aDescs.splice(j+1,len-1));
                                }
                                else {
                                    aProds = aProds.splice(0,j-1)
                                    aDescs = aDescs.splice(0,j-1)
                                }
                            }
                        }
                        else
                            // do nothing ... save this one for the to-do list
                        break;
                    }
                }
                if( buy === true )
                    break;
                else {
                    if( i == product.length )
                        handlerInput.responseBuilder.speak(`Product ${aDescs[j]}` + ' is not available for purchase.');
                }
            }
            if( buy === true )
                return handlerInput.responseBuilder
                    .addDirective({
                        type: 'Connections.SendRequest',
                        name: 'Buy',
                        payload: {
                            InSkillProduct: {
                                productId: prod,
                            },
                        },
                        token: 'correlationToken',
                    })
                    .getResponse();
        });
    },
};

// THIS HANDLES THE CONNECTIONS.RESPONSE EVENT AFTER A BUY OCCURS.
const PurchaseResponseHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'Connections.Response' &&
            handlerInput.requestEnvelope.request.name === 'Buy';
    },
    handle(handlerInput) {
        console.log('IN PURCHASERESPONSEHANDLER');

        const locale    = handlerInput.requestEnvelope.request.locale;
        const ms        = handlerInput.serviceClientFactory.getMonetizationServiceClient();
        const productId = handlerInput.requestEnvelope.request.payload.productId;

        return ms.getInSkillProducts(locale).then(function handlePurchaseResponse(result) {
            const product = result.inSkillProducts.filter(record => record.productId === productId);
            console.log(`PRODUCT = ${JSON.stringify(product)}`);
            if (handlerInput.requestEnvelope.request.status.code === '200') {
                if (handlerInput.requestEnvelope.request.payload.purchaseResult === 'ACCEPTED') {
                    const speakResponse    = `You have chosen to purchase the ${product[0].name}.`;
                    const repromptResponse = 'Would you like to make another purchase?'
                    return handlerInput.responseBuilder
                        .speak(speakResponse)
                        .reprompt(repromptResponse)
                        .getResponse();
                }
                if (handlerInput.requestEnvelope.request.payload.purchaseResult === 'DECLINED') {
                    const speakResponse    = `Thanks for your interest in the ${product[0].name}.`;
                    const repromptResponse = 'Would you like to make another purchase?'
                    return handlerInput.responseBuilder
                        .speak(speakResponse)
                        .reprompt(repromptResponse)
                        .getResponse();
                }
            }
            // Something failed.
            console.log(`Connections.Response indicated failure. error: ${handlerInput.requestEnvelope.request.status.message}`);

            return handlerInput.responseBuilder
                .speak('There was an error handling your purchase request. Please try again or contact us for help.')
                .getResponse();
        });
    },
};

const SessionEndedHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest' ||
            (handlerInput.requestEnvelope.request.type === 'IntentRequest' && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent') ||
            (handlerInput.requestEnvelope.request.type === 'IntentRequest' && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent');
    },
    handle(handlerInput) {
        console.log('IN SESSIONENDEDHANDLER');
        return handlerInput.responseBuilder
            .speak(getRandomGoodbye())
            .getResponse();
    },
};

const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log(`Error handled: ${JSON.stringify(error.message)}`);
        console.log(`handlerInput: ${JSON.stringify(handlerInput)}`);
        return handlerInput.responseBuilder
            .speak('Sorry, I can\'t understand the command. Please try again.')
            .getResponse();
    },
};

function getResolvedValue(requestEnvelope, slotName) {
    if (requestEnvelope &&
        requestEnvelope.request &&
        requestEnvelope.request.intent &&
        requestEnvelope.request.intent.slots &&
        requestEnvelope.request.intent.slots[slotName] &&
        requestEnvelope.request.intent.slots[slotName].resolutions &&
        requestEnvelope.request.intent.slots[slotName].resolutions.resolutionsPerAuthority &&
        requestEnvelope.request.intent.slots[slotName].resolutions.resolutionsPerAuthority[0] &&
        requestEnvelope.request.intent.slots[slotName].resolutions.resolutionsPerAuthority[0].values &&
        requestEnvelope.request.intent.slots[slotName].resolutions.resolutionsPerAuthority[0]
            .values[0] &&
        requestEnvelope.request.intent.slots[slotName].resolutions.resolutionsPerAuthority[0].values[0]
            .value &&
        requestEnvelope.request.intent.slots[slotName].resolutions.resolutionsPerAuthority[0].values[0]
            .value.name) {
        return requestEnvelope.request.intent.slots[slotName].resolutions
            .resolutionsPerAuthority[0].values[0].value.name;
    }
    return undefined;
}

function getSpokenValue(requestEnvelope, slotName) {
    if (requestEnvelope &&
        requestEnvelope.request &&
        requestEnvelope.request.intent &&
        requestEnvelope.request.intent.slots &&
        requestEnvelope.request.intent.slots[slotName] &&
        requestEnvelope.request.intent.slots[slotName].value) {
        return requestEnvelope.request.intent.slots[slotName].value;
    }
    return undefined;
}

function isProduct(product) {
    return product &&
        product.length > 0;
}

function isEntitled(product) {
    return isProduct(product) &&
        product[0].entitled === 'ENTITLED';
}

const RequestLog = {
    process(handlerInput) {
        console.log(`REQUEST ENVELOPE = ${JSON.stringify(handlerInput.requestEnvelope)}`);
    },
};

const ResponseLog = {
    process(handlerInput) {
        console.log(`RESPONSE BUILDER = ${JSON.stringify(handlerInput)}`);
    },
};
