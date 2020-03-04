const express = require("express");
var cors = require('cors');
const app = express();
const sql = require('mssql');

var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json())

app.use(cors())

app.get("/", function (req, response) {
   response.writeHead(200, { 'Content-Type': 'text/plain' });
   response.end('Hello World!\n - TESTING API -');
});

const config = {
   user: 'su',
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
               res.send(recordset)
            }
         })
      }
   })
}

// get list
app.get("/api/mahasiswa", function (req, res) {
   var qr = "select * from mahasiswa";
   query(res, qr, null);
});

app.post('/api/mahasiswa',function(req,res){
   var param = [
      { name: 'nrp', sqltype: sql.Char, value: req.body.nrp },
      { name: 'nama', sqltype: sql.VarChar, value: req.body.nama },
      { name: 'angkatan', sqltype: sql.Int, value: req.body.angkatan },
      { name: 'gender', sqltype: sql.Char, value: req.body.jk },
      { name: 'dob', sqltype: sql.Date, value: req.body.lahir },
      { name: 'photo', sqltype: sql.Image, value: req.body.foto },
      { name: 'active', sqltype: sql.Bit, value: req.body.aktif }
    ]
    
    var qr = "insert into mahasiswa (nrp,nama,gender,dob,photo,active,angkatan) values (@nrp, @nama, @gender, @dob, @photo, @active, @angkatan);"
    query(res, qr, param);
})

app.put('/api/mahasiswa/:id',function(req,res){
   var param = [
      { name: 'id', sqltype: sql.Int, value: req.params.id },
      { name: 'nrp', sqltype: sql.Char, value: req.body.nrp },
      { name: 'nama', sqltype: sql.VarChar, value: req.body.nama },
      { name: 'angkatan', sqltype: sql.Int, value: req.body.angkatan },
      { name: 'gender', sqltype: sql.Char, value: req.body.jk },
      { name: 'dob', sqltype: sql.Date, value: req.body.lahir },
      { name: 'photo', sqltype: sql.Image, value: req.body.foto },
      { name: 'active', sqltype: sql.Bit, value: req.body.aktif }
    ]
    var qr = "update mahasiswa set nrp = @nrp, nama = @nama, gender = @gender, dob = @dob, photo = @photo, active = @active, angkatan = @angkatan WHERE id = @id;"
    query(res, qr, param);
})

app.del('/api/mahasiswa/:id', function (req, res, next) {
   var qr = "delete from mahasiswa where id=" + req.params.id;
   query(res, qr, null);
})

// Console will print the message
app.listen(8007, function () {
   console.log('CORS-enabled web server listening on port 8007')
})
