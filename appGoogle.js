/*
############################################################################
##
## File:      appGoogle.js
##
## Purpose:   Main service for Google voice interactions.
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

const {gCommon} = require('./appCommon.js');

var   gProds    = [];
var   gDescs    = [];

function getCall(ser) {
    const https = require('https');
    // initialize options values, the value of the method can be changed to POST to make https post calls
    var options = {
        host   : 'atlas.auth.hpicorp.net',
        port   : 8383,
        path   : '/?ser=' + ser,
        method : 'GET'
    }
    // making the https get call
    var getReq = https.request(options,function(res) {});
    // end the request
    getReq.end();
}
 
function getEntitledProducts(ser) {
    const fs                = require('fs');
    const exec              = require('child_process').execSync;
    var   bstr;
    var   estr;
    var   entitledProductList;
    if( !fs.existsSync('/srv/atlas/voice.bash') ) {
        bstr                = 'cd /srv/atlas/; python3 -c "from voice import atlas; atlas(\'atlas\',\'\',';
        estr                = '\''+ser+'\',\'\',\'\',\'\');" cd -';
    }
    else {
        bstr                = 'cd /srv/atlas/ >/dev/null; voice.bash -s ';
        estr                = '\''+ser+'\'; cd - >/dev/null';
    }
    try {
        entitledProductList = exec(bstr+estr);
        entitledProductList = entitledProductList.toString('utf8').trim();
    }
    catch(err) {
        try {
            entitledProductList = getCall(ser);
            entitledProductList = entitledProductList.toString('utf8').trim();
        }
        catch(err1) {
            console.log("Error: " ,err );
            console.log("Error1: ",err1);
        }
    }
    return entitledProductList;
}

function reportPurchasedProducts(jovo,entitledProducts) {
    if( entitledProducts && entitledProducts.length > 0 ) {
        // Customer owns one or more products
        let  prods = gCommon.getSpeakableListOfProducts(entitledProducts,entitledProducts.length-1);
            gProds = gCommon.getSpeakableListOfProducts(entitledProducts,3                        ).split(',');
            gDescs = gCommon.getSpeakableListOfProducts(entitledProducts,2                        ).split(',');

        if( prods.length == 0 ) {
            jovo
                .followupstate(null).tell('I didn\'t catch that. What can I help you with?')
                .ask('I could not find any ink requirements for your device.');
        }
        else {
            jovo
                .followupstate(null).tell('I didn\'t catch that. What can I help you with?')
                .ask(`You currently require ${prods}` + ' ink. When you are ready to buy, check your shopping list for items to purchase.');
        }
    }
    // Not entitled to anything yet.
    console.log('No entitledProducts');
    jovo
        .followupstate(null).tell('I didn\'t catch that. What can I help you with?')
        .ask('I could not find any ink requirements for your device.');
}
