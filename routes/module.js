/*global require,module*/
var express = require('express');
var router = express.Router();
var conf = require('./config');
var monk = require('monk');
var db = monk(conf.mongoUrl);
var q = require('q');
var request = require('request');
var _ = require('underscore');
var jsen = require('jsen');
var debug = require('debug')('module');
var util = require('./util');
var cMod = db.get('modules');
var cInt = db.get('interfaces');
var jwt = require('jsonwebtoken');
var token;
var crypto = require('crypto');
function md5 (text) {
  return crypto.createHash('md5').update(text).digest('hex');
};
router.get('/index.html', function (req, res) {
  res.render('module', {
    editable: req.session.user.editable,
    js: ['/lib/jquery/dist/jquery.min.js', '/lib/bootstrap/dist/js/bootstrap.min.js', '/lib/underscore/underscore-min.js', '/lib/angular-validation/dist/angular-validation.min.js', '/javascripts/rule.js', '/javascripts/module.js']
  });
}).get('/test/:id', function (req, res) {
  function testInterface(data, headers) {
    /*console.log(req.params.id+'2626262626');
     cInt.findById(req.params.id, function (err, data) {
        console.log(data);
     });*/
    var def = q.defer();
    var inObject = data.inObject ? JSON.parse(data.inObject) : {};
    var outSchema = JSON.parse(data.outSchema || '{}');
    if(!user[req.query.pid] || !user[req.query.pid].backendUrl) {
      res.json({
        code: -1,
        message: '请先配置测试接口服务器地址'
      });
      return;
    }
    if(!req.headers['fesco-token']&& (req.query.bLogin == 'true')) {
      res.json({
        code: -1,
        message: '请先获取token！'
      });
      return;
    }
    var option = {
      json: true,
      method: data.method.toUpperCase(),
      url: user[req.query.pid].backendUrl + data.url,
      forever: true,
      //headers: headers || {},
      headers:{
        'Fesco-Token' : req.headers['fesco-token'],
        'Fesco-Time': ''+(parseInt(req.headers['fesco-offset']) + Date.parse(new Date())),
        'Fesco-Sign': md5('fescoApp' + req.headers['fesco-login'] + (parseInt(req.headers['fesco-offset']) + Date.parse(new Date())) + JSON.stringify(inObject))
      },
      timeout: 5000
    };

    if ('get' === data.method) {
      option.qs = inObject;
    } else {
      option.body = inObject;
    }
    var begin = _.now();
    console.log(option.headers);
    request(option, function (e, r, body) {
      if (e || 200 !== r.statusCode) {
        def.resolve({
          code: -1,
          message: '服务器出错：\n' + JSON.stringify(e || body, null, 2),
          time: _.now() - begin
        });
      } else {
        try {
          var validate = jsen(outSchema);
          var check = validate(body);
          var message = '\n校验结果：\n' + (check ? '成功' : JSON.stringify(validate.errors, null, 2)) + '\n\n校验规则：\n' + data.outSchema + '\n\n返回值：\n' + JSON.stringify(body, null, 2);
          if (check) {
            def.resolve({
              code: 1,
              message: message,
              time: _.now() - begin
            });

          } else {
            def.resolve({
              code: -1,
              message: message,
              time: _.now() - begin
            });
          }
        } catch (er) {
          console.error(er);
          def.reject(er);
        }
      }
    });
    return def.promise;
  }

  function auth() {
    var def = q.defer();
    var obj = user[req.query.pid];
    var option = {
      url: obj.backendUrl + obj.loginUrl,
      method: 'POST',
      json: true,
      forever: true,
      form: obj.loginObj,
      request: 5000
    };
    request(option, function (e, r, body) {
      if (e) {
        def.reject(e);
      } else {
         /*token = jwt.sign(obj.loginObj, 'app.get(superSecret)', {
                         'expiresIn': 1440 // 设置过期时间
        });*/
         /*var headers = _.extend({
          Cookie : cookie
        }, _.extend(obj.inObject, body))*/
        //console.log(token);
        var cookie = r.headers['set-cookie'] ? r.headers['set-cookie'].join('; ') : '';
        var headers = _.extend({
          Cookie : cookie
        }, _.extend(obj.inObject, body));
        def.resolve(headers);
      }
    });
    return def.promise;
  }
  var user = req.session.user;
  cInt.findById(req.params.id, function (err, data) {
    if (err) {
      res.status(500).json({
        code: -1,
        message: '查询接口出错'
      });
    } else {
      if ('true' === data.login) {
        q.when(auth()).then(function (result) {
          return testInterface(data, result);
        }, function (error) {
          console.log(error);
          res.status(500).json(error);
        }).then(function (result) {
          res.json(result);
        }, function (error) {
          res.status(500).json(error);
        });
      } else {
        q.when(testInterface(data)).then(function (result) {
          res.json(result);
        }, function (error) {
          res.status(500).json(error);
        });
      }
    }
  });
}).get('/:pid', function (req, res) {
  var pId = req.params.pid;

  function gm(pId) {
    var def = q.defer();
    cMod.find({
      pid: pId
    }, {
      sort: {
        _id: 1
      }
    }, function (err, data) {
      if (err) def.reject(err);
      else def.resolve(data || []);
    });
    return def.promise;
  }

  function gi(pId) {
    var def = q.defer();
    var orderby = {
      sort: {
        oid: 1
      }
    };
    if ('name' === req.query.sort) {
      orderby = {
        sort: {
          name: 1
        }
      };
    } else if ('updateDate' === req.query.sort) {
      orderby = {
        sort: {
          updateDate: -1
        }
      };
    }
    cInt.find({
      pid: pId
    }, orderby, function (err, data) {
      if (err) {
        def.reject(err);
      } else {
        var map = {};
        _.each(data, function (i) {
          map[i._id.toString()] = i.name;
        });
        _.each(_.filter(data, function (it) {
          return it.referenceId;
        }), function (ref) {
          ref.referenceName = map[ref.referenceId];
        });
        def.resolve(data || []);
      }
    });
    return def.promise;
  }

  function gp(id) {
    var def = q.defer();
    var cPro = db.get('projects');
    cPro.findById(id, function (err, data) {
      if (err) {
        console.error(err);
        def.reject(err);
      } else {
        def.resolve(data.name);
      }
    });
    return def.promise;
  }
  q.all([gm(pId), gi(pId), gp(pId)]).then(function (result) {
    var obj = req.session.user[req.params.pid] || {};
    var project = {
      projectName: result[2],
      backendUrl: obj.backendUrl,
      loginUrl: obj.loginUrl,
      loginObj: obj.loginObj,
      modules: result[0]
    };
    var interfaces = result[1];
    _.each(project.modules, function (mod) {
      mod.interfaces = _.filter(interfaces, function (face) {
        return face.mid === mod._id.toString();
      });
    });
    res.json(project);
  }, function (err) {
    res.status(500).json(err);
  });
}).post('', function (req, res) {
  cMod.insert(req.body, function (err, data) {
    if (err) {
      console.error(err);
      res.status(500).json(err);
    } else {
      util.rewrite();
      res.json(data);
    }
  });
}).put('/url', function (req, res) {
  if (!req.session || !req.session.user) {
    res.status(401).json({
      code: -1,
      message: '请先登录！'
    });
  } else {
    console.log('ttttttttttt');
    var cUsr = db.get('users');
    var urlObj = {};
    urlObj[req.body.pid] = _.omit(req.body, req.body.pid);
    var tempId = req.session.user._id;
    cUsr.update({
      _id: req.session.user._id
    }, {
      $set: urlObj
    }, function (err, data) {
      console.log('aaaa');
      if (err) {
        res.status(500).json(err);
      } else {
         req.session.user = null;
          


         var option = {
            json: true,
            method: 'POST',
            url: req.body.backendUrl + req.body.loginUrl,
            //forever: true,
            //timeout: 5000,
            headers: {
              "content-type": "application/json",
            }
         };
         if (option.method == 'GET') {
             option.qs = req.body.loginObj;
         }
         else {
             option.body =  req.body.loginObj;
         }
         //console.log(option);
         request(option, function (e, r, body) {
           // console.log(r.statusCode);
            //console.log(r.body);
            if (e || 200 !== r.statusCode) {
              if(r){
                console.log(r.statusCode);
                res.json(r.statusCode);
              }
            } else {
                res.json(r.body);
            }
         });



        /*var str1 = $scope.loginObj.replace(/[\r\n]/g,"").replace(/[ ]/g,"");
        var str2 = JSON.stringify({"name":"guest","password":"11111"})
        var bLoginUrl = $scope.loginUrl.trim() == '/getToken';
        var bBackendUrl = $scope.backendUrl.trim() == 'http://localhost:2016';
        var bLoginObj = str1 == str2;
        function  paramCheck(){
           return bLoginUrl && bBackendUrl && bLoginObj;
        }
*/  

        /*if(req.body.loginObj&&req.body.loginUrl&&req.body.backendUrl){
           console.log(JSON.stringify);
           var str1 = JSON.stringify(req.body.loginObj).replace(/[\r\n]/g,"").replace(/[ ]/g,"");
           var str2 = JSON.stringify({"code":"111111","phone":"13912345675"});
           var bLoginUrl = req.body.loginUrl.trim() == '/login';
           var bBackendUrl = req.body.backendUrl.trim() == 'http://fws.fesco.com.cn/appserver/';
           //var bBackendUrl = $scope.backendUrl.trim() == 'http://localhost:2016';
           var bLoginObj = str1 == str2;
           if(bLoginUrl && bBackendUrl && bLoginObj){
               token = jwt.sign(req.body.loginObj, 'app.get(superSecret)', {
                             'expiresIn': 1440 // 设置过期时间
               });
               res.json({
                  success: true,
                  message: 'access token success!',
                  token: token
               })
           }*/


        /*cUsr.update({
          _id: req.session.user._id
        }, {
          $set: token
        },function(err,data){
            if (err) {
               res.status(500).json(err);
            } else {
               console.log(data);
            }
        })*/
       
      /*}else{
          console.log(data);
      }*/
      }
    });
  }
}).put('/save', function (req, res) {
  cInt.update({
    _id: req.body.id
  }, {
    $set: {
      testStatus: req.body.result,
      costTime: req.body.costTime,
      testUser: req.session.user.name,
      testTime: (new Date()).toLocaleDateString()
    }
  }, function (err, data) {
    if (err) {
      res.status(500).json({
        code: -1,
        message: err
      });
    } else {
      res.json(data);
    }
  });
}).put('/:_id', function (req, res) {
  cMod.update({
    _id: req.params._id
  }, req.body, function (err, data) {
    if (err) {
      console.error(err);
      res.status(500).json(err);
    } else {
      util.rewrite();
      res.json(data);
    }
  });
}).delete('/:_id', function (req, res) {
  cMod.remove({
    _id: req.params._id
  }, function (err, data) {
    if (err) {
      console.error(err);
      res.status(500).json(err);
    } else {
      util.rewrite();
      res.json(data);
      cInt.remove({
        mid: req.params._id
      });
    }
  });
});
module.exports = router;
