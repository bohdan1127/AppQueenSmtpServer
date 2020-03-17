var verifier = require('email-verify');

verifier.verify( 'swoonoo@outlook.com', function( err, info ){
    if( err ) console.log(err);
    else{
        console.log( "Success (T/F): " + info.success );
        console.log( "Info: " + info.info );
    }
});