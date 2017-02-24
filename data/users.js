var db = require("../db");
var bcrypt = require('bcryptjs');

module.exports = {
    checkUsernameAndPassword: function(login_id, pwd, callback){
        
        var TYPES = require('tedious').TYPES; 
        var params = {column: 'login_id', type: TYPES.VarChar, value: login_id };
                
        db.getTuple('SELECT pwd from NON_IIS.users WHERE login_id=@login_id;', params, function(err, cols){
            
            //db.disconnect();
            
            if(err) return callback(err);
            if(cols === 0) return callback(null, false);

            var hash = cols.pwd.value;
            bcrypt.compare(pwd, hash, function(err, outcome) {
                return callback(null, outcome);
            });
        });
        
        /*
        var connection = db.connect();
        connection.on('connect', function(err) {
            if(err) return callback(err);
            
            var Request = require('tedious').Request;
            var TYPES = require('tedious').TYPES; 
            var bcrypt = require('bcryptjs');
            
            request = new Request("SELECT pwd from NON_IIS.users WHERE login_id=@login_id;", function(err, rowCount) {
                if (err) return callback(err);
                if(rowCount === 0) return callback(null, false)
            });
            
            request.addParameter('login_id', TYPES.VarChar, login_id);  

            request.on('row', function(columns) {
                var hash = columns[0].value;
                
                bcrypt.compare(pwd, hash, function(err, outcome) {
                    callback(null, outcome);
                });
            });

            connection.execSql(request);
        });
        */
    }
}