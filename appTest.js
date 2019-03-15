/*
############################################################################
##
## File:      appTest.js
##
## Purpose:   Main service for testing parts of the voice interactions.
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

var atest = require('./app');
var ret   = null;

//ret = atest.gc('10_CHAR_SN',null);
ret = atest.gep('10_CHAR_SN',null);
ret = atest.rnp(null,ret);

console.log(ret);
