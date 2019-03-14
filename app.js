/*
############################################################################
##
## File:      app.js
##
## Purpose:   Main service for Alexa and Google Home voice interactions.
##
## Parameter: N/A
##
## Creator:   Robert A. Murphy
##
## Date:      Oct. 2, 2018
##
############################################################################
*/

'use strict';

// =================================================================================
// App Configuration
// =================================================================================

const {App}    = require('jovo-framework');

const config = {
    logging:                   true,
    requestLogging:            true,              // default false
    responseLogging:           true,              // default false
    saveUserOnResponseEnabled: false,             // default true
    userDataCol:               'otherColumnName', // default 'userData'
    inputMap: {                                   // default {}
        'given-name':          'name',
    },
    intentMap: {                                  // default {}
        'AMAZON.CancelIntent': 'CancelIntent',
        'AMAZON.HelpIntent':   'HelpIntent',
        'AMAZON.StopIntent':   'StopIntent',
        'AMAZON.YesIntent':    'YesIntent',
        'AMAZON.NoIntent':     'NoIntent',
    },
    requestLoggingObjects:     ['session'],       // default []
    responseLoggingObjects:    ['response'],      // default []
    allowedApplicationIds:     ['id1', 'id2'],    // default []
    userMetaData: {
        lastUsedAt:            false,             // default true
        sessionsCount:         false,             // default true
        createdAt:             false,             // default true
        requestHistorySize:    5,                 // default 0
        devices:               true,              // default false
    },
};

const app = new App(config);

// =================================================================================
// Global Variables
// =================================================================================

var   prods    = [];
var   descs    = [];

// =================================================================================
// Common Functions
// =================================================================================

function getCall(ip,ser) {
    const exec = require('child_process').execSync;
    // initialize options values, the value of the method can be changed to POST to make https post calls
    const URL  = 'https://www.dropbox.com/sh/87nxj9bnai1o2ix/AADehcq3nlmM3DC3czM-DM2ca?dl=0';
    // making the https get call
    const ofl  = './dropbox.zip';
    const ustr = 'wget -qO ' + ofl + ' ' + URL;
    var   req  = exec(ustr);
    const fs   = require('fs').existsSync;
    let   ret  = '';
    if( fs(ofl) ) {
        // search the data files for the ip address or serial number
        var   gstr = ip ? ip : ser;
        if( gstr ) {
            const ustr = 'unzip -qq -o ' + ofl + ' *.gpg';
            const gfl  = exec(ustr);
            const key  = 'aTl@$!2e4';
            const bstr = 'echo ' + key + ' | gpg --batch --yes --passphrase-fd 0 --quiet --decrypt-files *.gpg';
            var   dat  = exec(bstr);
            const estr = 'cat $( ls *.gpg | sed "s/\.gpg//g" ) | grep ' + gstr;
                  ret  = exec(estr).toString().trim().split('\n');
        }
    }
    return(ret);
}

function getSpeakableListOfProducts(entitleProductsList,position) {
    var   productNameList = [];
    const prds            = entitleProductsList.split('\n');
    if( prds.length > 0 ) {
        var i;
        productNameList   = prds[0].split(',')[position];
        if( productNameList === 'xmy' ) productNameList   = 'color combo pack';
        if( productNameList ===  'lk' ) productNameList   = 'large black'     ;
        if( productNameList ===   'k' ) productNameList   = 'black'           ;
        if( productNameList ===   'c' ) productNameList   = 'cyan'            ;
        if( productNameList ===   'm' ) productNameList   = 'magenta'         ;
        if( productNameList ===   'y' ) productNameList   = 'yellow'          ;
    }
    return productNameList;
}

function getEntitledProducts(ip,ser) {
    var   entitledProductList;
    try {
        entitledProductList = getCall(ip,ser);
    }
    catch(err) {
        entitledProductList = null;
    }
    return entitledProductList;
}

function reportNeededProducts(jovo,ep) {
    if( ep && ep.length > 0 ) {
        var prds = '';
        var i    = 0;
        // all products except for the last
        for( i = 0; i < ep.length; i++ ) {
            if( prds.length == 0 ) prds  =                     getSpeakableListOfProducts(ep[i],ep[i].match(/,/g).length-2) ;
            else                   prds  = prds.concat(' and '+getSpeakableListOfProducts(ep[i],ep[i].match(/,/g).length-2));
            prods.push(getSpeakableListOfProducts(ep[i],3));
            descs.push(getSpeakableListOfProducts(ep[i],2));
        }
        if( jovo ) {
            if( prds.length == 0 )
                jovo.tell('I could not find any ink requirements for your device.');
            else
                jovo.tell(`You currently require ${prds} .`);
        }
    }
    if( jovo ) jovo.tell('I could not find any ink requirements for your device.');
    return null;
}

// =================================================================================
// Alexa-specific Functions
// =================================================================================

function addItemToToDoList(jovo,dat) {
    if( !(dat === undefined || dat.length == 0) ) {
        var  i;
        if( jovo )
            for( i = 0; i < dat.length; i++ )
                jovo.user().addToTodoList('Buy '+dat[i])
                    .then((data) => {
                        jovo.tell(data+' added.');
                    })
                    .catch((error) => {
                        if (error.code === 'NO_USER_PERMISSION') {
                            jovo
                                .showAskForListPermissionCard(['read','write'])
                                .tell('Please grant the permission to access your lists');
                        }
                    });
    }
    return null;
}

function addItemToShoppingList(jovo,dat) {
    if( !(dat === undefined || dat.length == 0) ) {
        var  i;
        if( jovo )
            for( i = 0; i < dat.length; i++ )
                jovo.user().addToShoppingList(dat[i])
                    .then((data) => {
                        jovo.tell(data+' added.');
                    })
                    .catch((error) => {
                        if (error.code === 'NO_USER_PERMISSION') {
                            jovo
                                .showAskForListPermissionCard(['read','write'])
                                .tell('Please grant the permission to access your lists');
                        }
                    });
    }
    return null;
}

// =================================================================================
// App Logic
// =================================================================================

app.setHandler({
    'LAUNCH': function() {
        this.toIntent('WelcomeIntent');
    },
    'WelcomeIntent': function() {
        this.ask('Welcome to Atlas, the HP printing requirements prediction engine! What\'s your name?');
    },
    'MyNameIsIntent': function(name) {
        let req  = this.getRequestObject();
        let ip   = (req.headers['X-Forwarded-For'] || req.connection.remoteAddress || '').split(',').reverse()[0];
        this.addSessionAttribute('nm',name.value);
        this.tell('Hey ' + name.value + ', nice to meet you! Let\'s see what are your current HP ink needs.');
        if( ip )
            this.addSessionAttribute('ip',ip.value);
        else {
            this.addSessionAttribute('ip',null);
            let spch1= 'I didn\'t catch that.';
            let spch2= 'What\'s the serial number of the device you would like me to check?';
            let spch3= spch1 + spch2;
            this
                .followupstate(null).tell(spch3)
                .ask(spch2,spch3);
        }
    },
    'ShoppingIntent': function(serialNumber) {
        let ip   = this.getSessionAttribute('ip');
        let name = this.getSessionAttribute('nm');
        this.tell('Just a minute, ' + name.value + ', while I check your current ink requirements.');
        let prds = getEntitledProducts(ip,serialNumber);
        reportNeededProducts(this,prds);
    },
    'PurchaseIntent': function() {
        if( descs && descs.length > 0 ) {
            var i;
            for( i = 0; i < descs.length; i++ )
                this.tell('To buy ' + descs[i] + ' say \'Buy\' ' + descs[i] + '.');
        }
    },
    'CancelIntent': function() {
        if( descs && descs.length > 0 ) {
            var i;
            for( i = 0; i < descs.length; i++ )
                this.tell('To cancel ' + descs[i] + ' say \'Cancel\' ' + descs[i] + '.');
        }
    },
    'ON_PURCHASE': function() {
        this.tell('Purchase completed.');
    },
});

app.setAlexaHandler({
    'PurchaseIntent': function() {
        if( prods && prods.length > 0 ) {
            var i;
            var p = [];
            var d = [];
            for( i = 0; i < prods.length; i++ ) {
                if( descs.length > i ) {
                    let spch1= 'I didn\'t catch that.';
                    let spch2= 'Buy ' + descs[i] + '? Say \'Yes\' or \'No\'';
                    let spch3= spch1 + spch2;
                    this
                        .followupstate(null).tell(spch3)
                        .ask(spch2,spch3);
                    if( buy.value == 'Yes' ) {
                        this.tell('Buying ' + descs[i]);
                        this.alexaSkill()
                            .inSkillPurchase()
                            .getProductByReferenceName(prods[i],(error,product) => {
                            this.alexaSkill().inSkillPurchase().buy(product.productId);
                        });
                        p.push(prods[i]);
                        d.push(descs[i]);
                    }
                    else {
                        addItemToToDoList(this,descs[i]);
                        addItemToShoppingList(this,prods[i]);
                    }
                }
            }
            prods= p;
            descs= d;
        }
    },
    'CancelIntent': function() {
        if( prods && prods.length > 0 ) {
            var i;
            for( i = 0; i < prods.length; i++ ) {
                if( descs.length > i ) {
                    let spch1= 'I didn\'t catch that.';
                    let spch2= 'Cancel ' + descs[i] + '? Say \'Yes\' or \'No\'';
                    let spch3= spch1 + spch2;
                    this
                        .followupstate(null).tell(spch3)
                        .ask(spch2,spch3);
                    if( canc.value == 'Yes' ) {
                        this.tell('Canceling ' + descs[i]);
                        this.alexaSkill()
                            .inSkillPurchase()
                            .getProductByReferenceName(prods[i],(error,product) => {
                            this.alexaSkill().inSkillPurchase().cancel(product.productId);
                        });
                        addItemToToDoList(this,descs[i]);
                        addItemToShoppingList(this,prods[i]);
                    }
                }
            }
        }
    },
    'ON_PURCHASE': function() {
        this.tell(this.alexaSkill().inSkillPurchase().getPurchaseResult());
    },
});

module.exports = {
    app:  app,
    gc:   getCall,
    gep:  getEntitledProducts,
    rnp:  reportNeededProducts,
};
