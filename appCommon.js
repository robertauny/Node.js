/*
############################################################################
##
## File:      appCommon.js
##
## Purpose:   Main service for Common voice interactions.
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

var   prods    = [];
var   descs    = [];

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

function getSpeakableListOfProducts(entitleProductsList,position) {
    var productNameList   = [];
    var productListSpeech = [];
    const prds           = entitleProductsList.split('|');
    if( prds.length > 1 ) {
        productNameList   = prds[position].split(',').filter(function(elem,pos) {
            return myArray.indexOf(elem) == pos;
        });
        if( position === productNameList.length - 1 ) {
            var i;
            for( i = 0; i < productNameList.length; i++ ) { 
                productNameList[i] = productNameList[i].replace(/xmy/gi,"color combo pack");
                productNameList[i] = productNameList[i].replace( /lk/gi,"large black"     );
                productNameList[i] = productNameList[i].replace(  /k/gi,"black"           );
                productNameList[i] = productNameList[i].replace(  /c/gi,"cyan"            );
                productNameList[i] = productNameList[i].replace(  /m/gi,"magenta"         );
                productNameList[i] = productNameList[i].replace(  /y/gi,"yellow"          );
            }
        }
        productListSpeech = productNameList[0]; // Generate a single string with comma separated product names
        if(productNameList.length > 1) {
            productListSpeech = productNameList.join(', '); // Generate a single string with comma separated product names
        }
    }
    return productListSpeech;
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
        let  prds  = gCommon.getSpeakableListOfProducts(entitledProducts,entitledProducts.length-1);
             prods = gCommon.getSpeakableListOfProducts(entitledProducts,3                        ).split(',');
             descs = gCommon.getSpeakableListOfProducts(entitledProducts,2                        ).split(',');

        if( prds.length == 0 ) {
            jovo
                .followupstate(null).tell('I didn\'t catch that. What can I help you with?')
                .ask('I could not find any ink requirements for your device.');
        }
        else {
            jovo
                .followupstate(null).tell('I didn\'t catch that. What can I help you with?')
                .ask(`You currently require ${prds}` + '. Adding to your shopping list.');
        }
    }
    jovo
        .followupstate(null).tell('I didn\'t catch that. What can I help you with?')
        .ask('I could not find any ink requirements for your device.');
}
