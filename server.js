const express = require("express");
const cors = require('cors');
const fs = require('fs')
const sql = require('mssql');
const jwt = require('jsonwebtoken');
const https = require('https');
const app = express();
const port = 8007;
const hostname = '10.199.14.46';

var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json())

app.use(cors())
app.options('*', cors());

var jwtOptions = {}
jwtOptions.secretOrKey = '454545454545';

app.use(function (req, res, next) {
   //Enabling CORS 
   res.header("Access-Control-Allow-Origin", "*");
   res.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT,DELETE");
   res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, contentType,Content-Type, Accept, Authorization");
   next();
 });

app.get("/", function (req, response) {
   response.writeHead(200, { 'Content-Type': 'text/plain' });
   response.end('CURRENTLY TESTING API v2.X');
});

const config = {
   user: 'sa',
   password: 'SaSa1212',
   server: '10.199.13.253',
   database: 'nrp05111740000035'
};

var query = function (res, query, params) {
   sql.connect(config, function (err) {
      if (err) {
         res.end('Connection Error\n' + err)
      }
      else {
         var request = new sql.Request()
         if (params != null){
            params.forEach(function (p) {
               request.input(p.name, p.sqltype, p.value);
            });
         }
         request.query(query, function (err, recordset) {
            if (err) {
               console.log('Query Error\n' + err)
            }
            else {
               res.send(recordset.recordset)
               console.log('Query: ' + query + " executed successfully!\n")
            }
         })
      }
   })
}

app.post("/api/login", function (req, response) {
   var param = [
      { name: 'username', sqltype: sql.VarChar, value: req.body.username },
      { name: 'password', sqltype: sql.VarChar, value: req.body.password }
   ]
   qr = 'select 1 as res, nama, id_satker from SatuanKerja where email = @username AND email = @password'

   sql.connect(config, function (err) {
      login = null;
      if (err) {
         response.end('Connection Error\n' + err)
      }
      else {
         var request = new sql.Request()
         if (param != null){
            param.forEach(function (p) {
               request.input(p.name, p.sqltype, p.value);
            });
         }
         request.query(qr, function (err, recordset) {
            if (err) {
               console.log('Query Error\n' + err)
            }
            else {
               login = recordset.recordset

               if(login[0].res == 1){
                  var user = login[0].nama
                  var payload = {id: user};
                  var token = jwt.sign(payload, jwtOptions.secretOrKey);
                  response.json({status : 200, user: user, token: token, id_satker: login[0].id_satker});
                  console.log('User: ' + req.body.username + " has logged in.")
               }
               else{
                  response.json({status : 401});
                  console.log('Username/Password combination is incorrect.');
               }
            }
         })
      }
   })
});

app.get("/api/login", function (req, response) {
   response.writeHead(200, { 'Content-Type': 'text/plain' });
   response.end('LOGIN API\nPLEASE USE POST METHOD');
});

app.get("/api/indikator/:id", function(req, res){
   var param = [
      { name: 'id_satker', sqltype: sql.UniqueIdentifier, value: req.params.id }, 
   ]
   var qr = "SELECT T2.aspek, T2.komponen, T2.Master_nama, ROUND(Indikator_SatuanKerja.bobot, 3) as bobot, ROUND(Indikator_SatuanKerja.target, 3) as target, CONCAT(round(Indikator_SatuanKerja.capaian, 3), CONCAT(' (',CONCAT(round(Indikator_SatuanKerja.capaian/(Indikator_SatuanKerja.target+0.01),1),'%)'))) as capaian, Indikator_SatuanKerja.last_update FROM Indikator_SatuanKerja INNER JOIN (SELECT Aspek.aspek as aspek, Aspek.komponen_aspek as komponen, MasterIndikator.nama as Master_nama, MasterIndikator.id as Master_id FROM MasterIndikator INNER JOIN Aspek ON MasterIndikator.id_aspek=Aspek.id) AS T2 ON T2.Master_id=Indikator_SatuanKerja.id_master WHERE Indikator_SatuanKerja.id_satker = @id_satker";
   query(res, qr, param);
})

app.get("/api/konkin-list/:id", function(req, res){
   var param = [
      { name: 'id_satker', sqltype: sql.UniqueIdentifier, value: req.params.id }, 
   ]
   var qr = "SELECT DISTINCT T1.id_satker as id, T2.nama as name FROM Indikator_SatuanKerja AS T1 INNER JOIN SatuanKerja AS T2 \
            ON T1.id_satker=T2.id_satker WHERE ((T2.id_satker = @id_satker) OR (T2.id_induk_satker = @id_satker)) ORDER BY T2.nama DESC;"
   query(res, qr, param);
})

app.get("/api/nama-satker/:id", function(req, res){
   var param = [
      { name: 'id_satker', sqltype: sql.UniqueIdentifier, value: req.params.id }, 
   ]
   var qr = "SELECT nama as name FROM SatuanKerja WHERE id_satker = @id_satker "
   query(res, qr, param);
})

/*** 
 * API untuk table DataDasar
 */
app.get("/api/dasar-dropdown", function (req, res) {
   var qr = "select id, nama as name from DataDasar";
   query(res, qr, null);
});

app.get("/api/dasar", function (req, res) {
   var qr = "select * from DataDasar";
   query(res, qr, null);
});

app.get("/api/dasar/:id", cors(), function (req, res) {
   var qr = "select * from DataDasar where id = " + req.params.id;
   query(res, qr, null);
});

app.post('/api/dasar',function(req,res){
   var param = [
      { name: 'nama', sqltype: sql.VarChar, value: req.body.nama }, 
   ]
    
    var qr = "insert into DataDasar (nama, create_date, last_update) values (@nama, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);"
    query(res, qr, param);
})

app.put('/api/dasar/:id', cors(),function(req,res){
   var param = [
      { name: 'id', sqltype: sql.Int, value: req.params.id },
      { name: 'nama', sqltype: sql.VarChar, value: req.body.nama },
      { name: 'expired_date', sqltype: sql.VarChar, value: req.body.expired_date }
    ]
    //console.log(param)
    var qr = "update DataDasar set nama = @nama, last_update = CURRENT_TIMESTAMP, expired_date = @expired_date WHERE id = @id;"
    query(res, qr, param);
})

app.delete('/api/dasar/:id', function (req, res, next) {
   var qr = "delete from DataDasar where id=" + req.params.id;
   query(res, qr, null);
})

/*** 
 * API untuk table JenisSatker
 */
app.get("/api/jenis-satker-dropdown", function (req, res) {
   var qr = "select id, nama as name from JenisSatker";
   query(res, qr, null);
});

app.get("/api/jenis-satker", function (req, res) {
   var qr = "select * from JenisSatker";
   query(res, qr, null);
});

app.get("/api/jenis-satker/:id", cors(), function (req, res) {
   var qr = "select * from JenisSatker where id = " + req.params.id;
   query(res, qr, null);
});

app.post('/api/jenis-satker',function(req,res){
   var param = [
      { name: 'nama', sqltype: sql.VarChar, value: req.body.nama }, 
   ]
    
    var qr = "insert into JenisSatker (nama, create_date, last_update) values (@nama, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);"
    query(res, qr, param);
})

app.put('/api/jenis-satker/:id', cors(),function(req,res){
   var param = [
      { name: 'id', sqltype: sql.Int, value: req.params.id },
      { name: 'nama', sqltype: sql.VarChar, value: req.body.nama },
      { name: 'expired_date', sqltype: sql.VarChar, value: req.body.expired_date }
    ]
    //console.log(param)
    var qr = "update JenisSatker set nama = @nama, last_update = CURRENT_TIMESTAMP, expired_date = @expired_date WHERE id = @id;"
    query(res, qr, param);
})

app.delete('/api/jenis-satker/:id', function (req, res, next) {
   var qr = "delete from JenisSatker where id=" + req.params.id;
   query(res, qr, null);
})



/*** 
 * API untuk table MasterIndikator
 */
app.get("/api/master-indikator-dropdown", function (req, res) {
   var qr = "select id, nama as name from MasterIndikator";
   query(res, qr, null);
});

app.get("/api/master-indikator", function (req, res) {
   var qr = "select id, id_aspek, id_penyebut, id_pembilang, nama, deskripsi, default_bobot, create_date, last_update, expired_date from MasterIndikator";
   query(res, qr, null);
});

app.get("/api/master-indikator/:id", cors(), function (req, res) {
   var qr = "select * from MasterIndikator where id = " + req.params.id;
   query(res, qr, null);
});

app.post('/api/master-indikator',function(req,res){
   var param = [
      { name: 'id_penyebut', sqltype: sql.Int, value: req.body.id_penyebut },
      { name: 'id_pembilang', sqltype: sql.Int, value: req.body.id_pembilang },
      { name: 'id_aspek', sqltype: sql.Int, value: req.body.id_aspek },
      { name: 'nama', sqltype: sql.VarChar, value: req.body.nama }
   ]
    
    var qr = "insert into MasterIndikator  (id_penyebut, id_pembilang, nama, last_update, create_date, id_aspek) values (@id_penyebut, @id_pembilang, @nama, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, @id_aspek);"
    query(res, qr, param);
})

app.put('/api/master-indikator/:id', cors(),function(req,res){
   var param = [
      { name: 'id', sqltype: sql.Int, value: req.params.id },
      { name: 'id_penyebut', sqltype: sql.Int, value: req.body.id_penyebut },
      { name: 'id_pembilang', sqltype: sql.Int, value: req.body.id_pembilang },
      { name: 'nama', sqltype: sql.VarChar, value: req.body.nama },
      { name: 'deskripsi', sqltype: sql.VarChar, value: req.body.deskripsi },
      { name: 'default_bobot', sqltype: sql.Float, value: req.body.default_bobot },
      { name: 'expired_date', sqltype: sql.DateTime, value: req.body.expired_date },
      { name: 'id_aspek', sqltype: sql.Int, value: req.body.id_aspek },
    ]
   //console.log(param)
    var qr = "update MasterIndikator set id_aspek = @id_aspek, id_penyebut = @id_penyebut, id_pembilang = @id_pembilang, nama = @nama, deskripsi = @deskripsi, default_bobot = @default_bobot, expired_date = @expired_date, last_update = CURRENT_TIMESTAMP  WHERE id = @id;"
    query(res, qr, param);
})

app.delete('/api/master-indikator/:id', function (req, res, next) {
   var qr = "delete from MasterIndikator where id=" + req.params.id;
   query(res, qr, null);
})



/*** 
 * API untuk table Periode
 */
app.get("/api/periode-dropdown", function (req, res) {
   var qr = "select id, nama as name from Periode";
   query(res, qr, null);
});

app.get("/api/periode", function (req, res) {
   var qr = "select * from Periode";
   query(res, qr, null);
});

app.get("/api/periode/:id", cors(), function (req, res) {
   var qr = "select * from Periode where id = " + req.params.id;
   query(res, qr, null);
});

app.post('/api/periode',function(req,res){
   var param = [
      { name: 'nama', sqltype: sql.VarChar, value: req.body.nama }, 
   ]
    
    var qr = "insert into Periode (nama, create_date, last_update) values (@nama, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);"
    query(res, qr, param);
})

app.put('/api/periode/:id', cors(),function(req,res){
   var param = [
      { name: 'id', sqltype: sql.Int, value: req.params.id },
      { name: 'nama', sqltype: sql.VarChar, value: req.body.nama }
    ]
    //console.log(param)
    var qr = "update Periode set nama = @nama, last_update = CURRENT_TIMESTAMP WHERE id = @id;"
    query(res, qr, param);
})

app.delete('/api/periode/:id', function (req, res, next) {
   var qr = "delete from Periode where id=" + req.params.id;
   query(res, qr, null);
})

/*** 
 * API untuk table Indikator_Periode
 */
// app.get("/api/indikator-periode-dropdown", function (req, res) {
//    var qr = "select id, nama as name from Indikator_Periode";
//    query(res, qr, null);
// });

app.get("/api/indikator-periode", function (req, res) {
   var qr = "select * from Indikator_Periode";
   query(res, qr, null);
});

app.get('/api/indikator-periode/:id_master&:id_periode', function (req, res, next) {
   var qr = "select * from Indikator_Periode WHERE id_master = " + req.params.id_master + " AND id_periode = " + req.params.id_periode + " ;";
   query(res, qr, null);
})

app.post('/api/indikator-periode',function(req,res){
   var param = [
      { name: 'id_master', sqltype: sql.Int, value: req.body.id_master },
      { name: 'id_periode', sqltype: sql.Int, value: req.body.id_periode }
   ]
    
    var qr = "insert into Indikator_Periode (id_master, id_periode) values (@id_master, @id_periode);"
    query(res, qr, param);
})

app.put('/api/indikator-periode/:id_master&:id_periode', cors(),function(req,res){
   var param = [
      { name: 'id_master_old', sqltype: sql.Int, value: req.params.id_master },
      { name: 'id_periode_old', sqltype: sql.Int, value: req.params.id_periode },
      { name: 'id_master_new', sqltype: sql.Int, value: req.body.id_master },
      { name: 'id_periode_new', sqltype: sql.Int, value: req.body.id_periode },
      { name: 'bobot', sqltype: sql.Float, value: req.body.bobot }

    ]
    //console.log(param)
    var qr = "update Indikator_Periode set id_master = @id_master_new, id_periode = @id_periode_new, bobot = @bobot WHERE id_master = @id_master_old AND id_periode = @id_periode_old;"
    query(res, qr, param);
})

app.delete('/api/indikator-periode/:id_master&:id_periode', function (req, res, next) {
   var qr = "delete from Indikator_Periode WHERE id_master = " + req.params.id_master + " AND id_periode = " + req.params.id_periode + " ;";
   query(res, qr, null);
})



/*** 
 * API untuk table SatuanKerja
 */
// app.get("/api/satker-dropdown", function (req, res) {
//    var qr = "select id, nama as name from SatuanKerja";
//    query(res, qr, null);
// });

app.get("/api/satker", function (req, res) {
   var qr = "select * from SatuanKerja";
   query(res, qr, null);
});

app.get('/api/satker/:id', function (req, res, next) {
   var param = [
      { name: 'id_satker', sqltype: sql.UniqueIdentifier, value: req.params.id }
   ]
   var qr = "select * from SatuanKerja WHERE id_satker=@id_satker;"
   query(res, qr, param);
})

app.post('/api/satker',function(req,res){
   var param = [
      { name: 'id_induk_satker', sqltype: sql.UniqueIdentifier, value: req.body.id_induk_satker }
   ]
    
    var qr = "insert into SatuanKerja (id_induk_satker, create_date, last_update) values (@id_induk_satker, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);"
    query(res, qr, param);
})

app.put('/api/satker/:id_satker', cors(),function(req,res){
   var param = [
      { name: 'id_satker', sqltype: sql.UniqueIdentifier, value: req.params.id_satker },
      { name: 'id_jns_satker', sqltype: sql.Int, value: req.body.id_jns_satker },
      { name: 'id_induk_satker', sqltype: sql.UniqueIdentifier, value: req.body.id_induk_satker },
      { name: 'nama', sqltype: sql.VarChar, value: req.body.nama },
      { name: 'email', sqltype: sql.VarChar, value: req.body.email },
      { name: 'level_unit', sqltype: sql.Int, value: req.body.level_unit },
      { name: 'expired_date', sqltype: sql.DateTime, value: req.body.expired_date }

    ]
    console.log(param)
    var qr = "update SatuanKerja set id_jns_satker = @id_jns_satker, id_induk_satker = @id_induk_satker, nama = @nama, email = @email, level_unit = @level_unit, last_update = CURRENT_TIMESTAMP, expired_date = @expired_date  WHERE id_satker = @id_satker;"
    query(res, qr, param);
})

app.delete('/api/satker/:id_satker', function (req, res, next) {
   var param = [
      { name: 'id_satker', sqltype: sql.UniqueIdentifier, value: req.params.id_satker }
   ]
   var qr = "delete from SatuanKerja WHERE id_satker = @id_satker;"
   query(res, qr, param);
})



/*** 
 * API untuk table Capaian_Unit
 */

app.get("/api/capaian", function (req, res) {
   var qr = "select * from Capaian_Unit";
   query(res, qr, null);
});

app.get("/api/capaian/:id_satker&:id_datadasar", cors(), function (req, res) {
   var param = [
      { name: 'id_satker', sqltype: sql.UniqueIdentifier, value: req.params.id_satker },
      { name: 'id_datadasar', sqltype: sql.VarChar, value: req.params.id_datadasar }
   ]
   var qr = "select * from Capaian_Unit WHERE id_satker = @id_satker AND id_datadasar = @id_datadasar;"
   query(res, qr, param);
});

app.post('/api/capaian',function(req,res){
   var param = [
      { name: 'id_satker', sqltype: sql.UniqueIdentifier, value: req.body.id_satker },
      { name: 'id_datadasar', sqltype: sql.Int, value: req.body.id_datadasar },
      { name: 'capaian', sqltype: sql.Float, value: req.body.capaian },
      { name: 'waktu', sqltype: sql.DateTime, value: req.body.capaian }
   ]
    
    var qr = "insert into Capaian_Unit (id_satker, id_datadasar, capaian, waktu) values (@id_satker, @id_datadasar, @capaian, null);"
    query(res, qr, param);
})

app.put('/api/capaian/:id_satker&:id_datadasar', cors(),function(req,res){
   var param = [
      { name: 'id_satker_old', sqltype: sql.UniqueIdentifier, value: req.params.id_satker },
      { name: 'id_datadasar_old', sqltype: sql.Int, value: req.params.id_datadasar },
      { name: 'id_satker_new', sqltype: sql.VarChar, value: req.body.id_satker },
      { name: 'id_datadasar_new', sqltype: sql.Int, value: req.body.id_datadasar },
      { name: 'capaian', sqltype: sql.Float, value: req.body.capaian },
      { name: 'waktu', sqltype: sql.DateTime, value: req.body.waktu }
   ]
   console.log(param)
    var qr = "update Capaian_Unit set waktu = @waktu, capaian = @capaian, id_datadasar = @id_datadasar_new, id_satker = @id_satker_new WHERE id_satker = @id_satker_old AND id_datadasar = @id_datadasar_old ;"
    query(res, qr, param);
})

app.delete("/api/capaian/:id_satker&:id_datadasar", cors(), function (req, res) {
   var param = [
      { name: 'id_satker', sqltype: sql.UniqueIdentifier, value: req.params.id_satker },
      { name: 'id_datadasar', sqltype: sql.VarChar, value: req.params.id_datadasar }
   ]
   var qr = "delete from Capaian_Unit WHERE id_satker = @id_satker AND id_datadasar = @id_datadasar;"
   query(res, qr, param);
});



/*** 
 * API untuk table Indikator_SatuanKerja
 */

app.get("/api/indikator-satker", function (req, res) {
   var qr = "select * from Indikator_SatuanKerja";
   query(res, qr, null);
});

app.get("/api/indikator-satker/:id_satker&:id_master&:id_periode", cors(), function (req, res) {
   var param = [
      { name: 'id_satker', sqltype: sql.UniqueIdentifier, value: req.params.id_satker },
      { name: 'id_master', sqltype: sql.VarChar, value: req.params.id_master },
      { name: 'id_periode', sqltype: sql.VarChar, value: req.params.id_periode }
   ]
   var qr = "select * from Indikator_SatuanKerja WHERE id_satker = @id_satker AND id_master = @id_master AND id_periode = @id_periode ;"
   query(res, qr, param);
});

app.post('/api/indikator-satker',function(req,res){
   var param = [
      { name: 'id_periode', sqltype: sql.Int, value: req.body.id_periode },
      { name: 'id_master', sqltype: sql.Int, value: req.body.id_master },
      { name: 'id_satker', sqltype: sql.UniqueIdentifier, value: req.body.id_satker },
      { name: 'bobot', sqltype: sql.Float, value: req.body.bobot },
      { name: 'target', sqltype: sql.Float, value: req.body.target },
      { name: 'capaian', sqltype: sql.Float, value: req.body.capaian }
    ]
    console.log(param.id_periode)
    var qr = "insert into Indikator_SatuanKerja values( @id_periode, @id_master, @id_satker, @bobot, @target, @capaian, CURRENT_TIMESTAMP)"
    query(res, qr, param);
})

app.put('/api/indikator-satker/:id_periode&:id_master&:id_satker', cors(),function(req,res){
   var param = [
      { name: 'id_periode', sqltype: sql.Int, value: req.body.id_periode },
      { name: 'id_master', sqltype: sql.Int, value: req.body.id_master },
      { name: 'id_satker', sqltype: sql.UniqueIdentifier, value: req.body.id_satker },
      { name: 'bobot', sqltype: sql.Float, value: req.body.bobot },
      { name: 'target', sqltype: sql.Float, value: req.body.target },
      { name: 'capaian', sqltype: sql.Float, value: req.body.capaian },
      { name: 'id_periode_old', sqltype: sql.Int, value: req.params.id_periode },
      { name: 'id_master_old', sqltype: sql.Int, value: req.params.id_master },
      { name: 'id_satker_old', sqltype: sql.UniqueIdentifier, value: req.params.id_satker }
    ]

    var qr = "update Indikator_SatuanKerja set id_periode = @id_periode, id_master = @id_master, id_satker = @id_satker, bobot = @bobot, target = @target, capaian = @capaian, last_update = CURRENT_TIMESTAMP where id_periode = @id_periode_old and id_master = @id_master_old and id_satker = @id_satker_old"
    query(res, qr, param);
})

app.delete("/api/indikator-satker/:id_satker&:id_master&:id_periode", cors(), function (req, res) {
   var param = [
      { name: 'id_satker', sqltype: sql.UniqueIdentifier, value: req.params.id_satker },
      { name: 'id_master', sqltype: sql.VarChar, value: req.params.id_master },
      { name: 'id_periode', sqltype: sql.VarChar, value: req.params.id_periode }
   ]
   var qr = "delete from Indikator_SatuanKerja WHERE id_satker = @id_satker AND id_master = @id_master AND id_periode = @id_periode ;"
   query(res, qr, param);
});

//Log Indikator Satuan Kerja
	
app.get("/api/indikator-satker/log", function(req, res){
   var qr = "select * from Indikator_SatuanKerja_Log"
   query(res, qr, null)
 })

/*** 
 * API untuk table aspek
 */

app.get("/api/aspek/", function(req, res)
{
      var qr = "select * from Aspek"
      query(res, qr, null)
})

app.get("/api/aspek/:id", function(req, res)
{
      var qr = "select * from Aspek where id = " + req.params.id
      query(res, qr, null)
})

app.get("/api/aspek-dropdown", function(req, res)
{
   var qr = "select id, aspek as name from Aspek"
   query(res, qr, null)
})

app.post("/api/aspek/", function(req, res)
{
   var param = [
      { name: 'id', sqltype: sql.Int, value: req.body.id },
      { name: 'aspek', sqltype: sql.VarChar, value: req.body.aspek },
      { name: 'komponen_aspek', sqltype: sql.VarChar, value: req.body.komponen_aspek }
   ]

   var qr = "insert into Aspek( aspek, komponen_aspek ) values ( @aspek, @komponen_aspek )"
   query(res, qr, param)
})

app.put("/api/aspek/:id", function(req, res)
{
   var param = [
      { name: 'id', sqltype: sql.Int, value: req.params.id },
      { name: 'aspek', sqltype: sql.VarChar, value: req.body.aspek },
      { name: 'komponen_aspek', sqltype: sql.VarChar, value: req.body.komponen_aspek }
   ]

   var qr = "update Aspek set aspek = @aspek, komponen_aspek = @komponen_aspek where id = @id" 
   query(res, qr, param)
})

app.delete("/api/aspek/:id", function(req, res)
{
   var param = [
      { name: 'id', sqltype: sql.Int, value: req.params.id }
   ]
   var qr = "delete from Aspek where id = @id"
   query(res, qr, param)
})

/*** 
 * API untuk table dosen
 */

app.get("/api/dosen/", function(req, res)
{
      var qr = "select * from dosen"
      query(res, qr, null)
})

/*** 
* API untuk table abmas
*/

app.get("/api/abmas/", function(req, res)
{
     var qr = "select * from abmas"
     query(res, qr, null)
})

/*** 
* API untuk table penelitian
*/

app.get("/api/penelitian/", function(req, res)
{
     var qr = "select * from penelitian"
     query(res, qr, null)
})

/*** 
* API untuk table publikasi
*/

app.get("/api/publikasi/", function(req, res)
{
     var qr = "select * from publikasi"
     query(res, qr, null)
})

/*** 
 * API untuk table data_mhs
 */
app.get("/api/mahasiswa", function (req, res) {
   var qr = "select * from data_mhs";
   query(res, qr, null);
});

app.get("/api/mahasiswa/:id", cors(), function (req, res) {
   var qr = "select * from data_mhs where id = " + req.params.id;
   query(res, qr, null);
});

app.post('/api/mahasiswa',function(req,res){
   var param = [
      { name: 'nrp', sqltype: sql.Char, value: req.body.nrp },
      { name: 'nama', sqltype: sql.VarChar, value: req.body.nama },
      { name: 'angkatan', sqltype: sql.Int, value: req.body.angkatan },
      { name: 'gender', sqltype: sql.Char, value: req.body.gender },
      { name: 'dob', sqltype: sql.Date, value: req.body.dob },
      { name: 'photo', sqltype: sql.Image, value: req.body.photo },
      { name: 'active', sqltype: sql.Bit, value: req.body.active }
    ]
    
    var qr = "insert into data_mhs (nrp,nama,gender,dob,photo,active,angkatan) values (@nrp, @nama, @gender, @dob, @photo, @active, @angkatan);"
    query(res, qr, param);
})

app.put('/api/mahasiswa/:id', cors(),function(req,res){
   var param = [
      { name: 'id', sqltype: sql.Int, value: req.params.id },
      { name: 'nrp', sqltype: sql.Char, value: req.body.nrp },
      { name: 'nama', sqltype: sql.VarChar, value: req.body.nama },
      { name: 'angkatan', sqltype: sql.Int, value: req.body.angkatan },
      { name: 'gender', sqltype: sql.Char, value: req.body.gender },
      { name: 'dob', sqltype: sql.Date, value: req.body.dob },
      { name: 'photo', sqltype: sql.Image, value: req.body.photo },
      { name: 'active', sqltype: sql.Bit, value: req.body.active }
    ]
    console.log(param)
    var qr = "update data_mhs set nrp = @nrp, nama = @nama, angkatan = @angkatan, gender = @gender, dob = @dob, photo = @photo, active = @active WHERE id = @id;"
    query(res, qr, param);
})

app.delete('/api/mahasiswa/:id', function (req, res, next) {
   var qr = "delete from data_mhs where id=" + req.params.id + "; DBCC CHECKIDENT ('data_mhs', RESEED, 0)";
   query(res, qr, null);
})

// Console will print the message
// app.listen(8007, function () {
//    console.log('CORS-enabled web server listening on port 8007')
// })

https.createServer({
   key: fs.readFileSync(__dirname+'/izzud.github.io.key', 'utf8'),
   cert: fs.readFileSync(__dirname+'/izzud.github.io.cert', 'utf8')
 }, app)
 .listen(port, hostname, function () {
   console.log('HTTPs app listening on port 8007! Go to https://'+hostname+':'+port+'/')
 })
