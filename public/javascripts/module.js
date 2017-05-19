/*global angular, _, Mock*/
(function (window, angular) {
  'use strict';
  angular.module('indexApp', ['validation.rule']).config(['$interpolateProvider', function ($interpolateProvider) {
    $interpolateProvider.startSymbol('//');
    $interpolateProvider.endSymbol('//');
  }]).controller('mainCtrl', ['$scope', '$http', '$timeout', function ($scope, $http, $timeout) {
    var pid = location.search.replace(/[\?|&]pid=(\S)/, '$1');
    $http.get('/module/' + pid).success(function (resp) {
      $scope.projectName = resp.projectName;
      $scope.backendUrl = resp.backendUrl;
      $scope.loginUrl = resp.loginUrl;
      $scope.loginObj = JSON.stringify(resp.loginObj, null, 2);
      $scope.modules = resp.modules;
    });
    $scope.$watch('api.inObject', function (nVal) {
      try {
        $scope.inObject = JSON.stringify(Mock.mock(JSON.parse(nVal)), null, '  ');
      } catch (e) {
        $scope.inObject = nVal;
      }
    });
    $scope.$watch('api.outObject', function (nVal) {
      try {
        $scope.outObject = JSON.stringify(Mock.mock(JSON.parse(nVal)), null, '  ');
      } catch (e) {}
    });
    $scope.sort = function (col) {
      $http.get('/module/' + pid + '?sort=' + col).success(function (resp) {
        $scope.projectName = resp.projectName;
        $scope.modules = resp.modules;
      });
    };
    $scope.sendRequest = function () {
      $http.post('/request', {
        method: $scope.api.method,
        hostport: $scope.hostport,
        url: $scope.api.url,
        param: $scope.inObject,
        referenceId: $scope.api.referenceId
      }).success(function (resp) {
        $scope.result = JSON.stringify(resp, null, '  ');
      }).error(function (resp) {
        $scope.result = JSON.stringify(resp, null, '  ');
      });
    };
    $scope.keydown = function ($event, module) {
      if (13 === $event.keyCode) $scope.save(module);
    };
    $scope.keyup = function (dom) {
      $scope.hostport = dom.target.innerText;
    };
    $scope.save = function (module) {
      if (module) {
        $http.put('/module/' + module._id, {
          pid: module.pid,
          interfaces: module.interfaces,
          name: module.text
        }).success(function (resp) {
          if (resp) {
            module.name = module.text;
            module.text = null;
          } else {
            $scope.hint('保存模块失败!\n' + resp);
          }
        });
      } else {
        $http.post('/module', {
          name: $scope.mod.name,
          pid: pid
        }).success(function (resp) {
          if (resp) {
            $scope.modules = $scope.modules || [];
            $scope.modules.push(resp);
            $scope.mod = null;
          } else {
            $scope.hint('保存模块失败!\n' + resp);
          }
        });
      }
    };
    $scope.remove = function (_id) {
      $http.delete('/module/' + _id).success(function (resp) {
        if (resp) {
          for (var i = $scope.modules.length - 1; i >= 0; i--) {
            if ($scope.modules[i]._id === _id) {
              $scope.modules.splice(i, 1);
              break;
            }
          }
        } else {
          $scope.hint('删除模块失败!');
        }
      });
    };
    $scope.cancel = function (module) {
      if (module) module.text = null;
      else $scope.mod = null;
    };
    $scope.showReference = function ($event, refering) {
      $event.stopPropagation();
      $scope.refering = refering;
    };
    $scope.setReference = function ($event, reference) {
      $event.stopPropagation();
      $http.put('/interface/' + $scope.refering._id + '/' + (reference ? 'reference._id' : '/1')).success(function (resp) {
        if (reference) {
          $scope.refering.referenceId = reference._id;
          $scope.refering.referenceName = reference.name;
        } else {
          $scope.refering.referenceId = null;
          $scope.refering.referenceName = null;
        }
        $scope.cancelRefer();
      });
    };
    $scope.cancelRefer = function () {
      $scope.refering = null;
    };
    $scope.showInterfaceDetail = function (_id) {
      window.open('/interface/' + _id);
    };
    $scope.edit = function (module) {
      if (module) {
        module.text = module.name;
        $timeout(function () {
          document.getElementById('_moduleName').focus();
        }, 0);
      } else {
        $scope.mod = $scope.mod || {};
        $timeout(function () {
          document.getElementById('moduleName').focus();
        }, 0);
      }
    };
    $scope.showParam = function (title, content) {
      $scope.xhr = false;
      $scope.modalTitle = title;
      try {
        $scope.modalContent = JSON.stringify(JSON.parse(content), null, '  ');
      } catch (e) {
        console.log(e);
        $scope.modalContent = content;
      }
    };
    $scope.copy = function () {
      document.getElementById("modalContent").select(); // 选择对象
      document.execCommand("Copy"); // 执行浏览器复制命令
      alert("已复制好，可贴粘。");
    };
    $scope.deleteInterface = function (_id, list) {
      $http.delete('/interface/' + _id).success(function (resp) {
        if (resp) {
          for (var i = list.length - 1; i >= 0; i--) {
            if (list[i]._id === _id) {
              list.splice(i, 1);
              break;
            }
          }
        } else {
          $scope.hint('删除接口失败');
        }
      });
    };
    $scope.hint = function (text) {
      $scope.message = text;
      $timeout(function () {
        $scope.message = '';
      }, 5000);
    };
    $scope.saveUrl = function (e) {
        //$scope.loginApi = 
        //var str1 = $scope.loginObj.replace(/[\r\n]/g,"").replace(/[ ]/g,"");
        //var str2 = JSON.stringify({"code":"111111","phone":"13912345675"})
        //var bLoginUrl = $scope.loginUrl.trim() == '/login';
        //var bBackendUrl = $scope.backendUrl.trim() == 'http://fws.fesco.com.cn/appserver/';
        //var bBackendUrl = $scope.backendUrl.trim() == 'http://localhost:2016';
        //var bLoginObj = str1 == str2;
        //function  paramCheck(){
      //     return bLoginUrl && bBackendUrl && bLoginObj;
        //}
       
        $timeout(function () {
          var dInfo = $(document.getElementById('dInfo'));
          var aInfo = $(document.getElementById('aInfo'));
          aInfo.click(function(){
              dInfo.addClass('hide');
          });
          dInfo.removeClass('hide');
        }, 0);       
        //console.log(JSON.stringify({"name":"guest","password":"11111"}));
       // console.log($scope.loginObj == JSON.stringify({"name":"guest","password":"11111"}));
        
        //console.log(str1 == str2);
        if ($scope.form.$valid) {
          if($scope.backendUrl.trim() != "http://fws.fesco.com.cn/appserver"){
                    $scope.tokenInfo = "服务器地址错误！"
                    return;
          };
          $http.put('/module/url', {
            pid: pid,
            backendUrl: $scope.backendUrl,
            loginUrl: $scope.loginUrl,
            loginObj: $scope.loginObj?JSON.parse($scope.loginObj):''
          }).success(function (res) {
            $scope.backendMessage = '1' === res ? '' : res;
            if(res.status == 0){
                $scope.tokenInfo = "token获取成功！";
                /*$scope.token = res.data.token;
                $scope.loginTime = res.data.logintime;                
                $scope.offsetTime = $scope.loginTime-Date.parse(new Date());*/
                sessionStorage.setItem("token", res.data.token);
                sessionStorage.setItem("loginTime", res.data.logintime);
                sessionStorage.setItem("offsetTime", res.data.logintime-Date.parse(new Date()));
            } else {
                $scope.tokenInfo = "token获取失败！"
                sessionStorage.setItem("token", "");
                sessionStorage.setItem("loginTime", "");
                sessionStorage.setItem("offsetTime", "");
            }
            //window.localStorage.setItem('token',res.token);
          }).error(function (res) {
            $scope.backendMessage = 'URL保存失败';
            //$scope.tokenInfo = "URL保存失败"；
            console.error(res);
          });
         /* $scope.address = $scope.backendUrl+$scope.loginUrl;
          $http.post($scope.address, {            
            loginObj: $scope.loginObj?JSON.parse($scope.loginObj):''
          }).success(function (res) {
            //window.localStorage.setItem('token',res.token);
            console.log('aaaaaaaa');
          }).error(function (res) {
            console.log('bbbbbbbb');
            console.error(res);
          });*/
        } else {
           $scope.tokenInfo = "服务器地址保存失败！";
        }
    };
    /**
     * 测试接口
     * @param  {String} id 接口_id
     * @return {[type]}    [description]
     */
    $scope.testInterface = function (id,bLogin) {
      // /$scope.bflag = true;
      if(!$scope.backendUrl) {
        $scope.backendMessage = '请填写URL';
      }
      $scope.xhr = true;
      //var bHeaders = bLogin==='true' ? { headers:{'token' : window.localStorage.getItem('token')}} : "";
      var bHeaders = bLogin==='true' ? { 
                                           headers:{
                                                 'Fesco-token' : sessionStorage.getItem("token")|| "",
                                                 'Fesco-offset' : sessionStorage.getItem("offsetTime" || ""),
                                                 'Fesco-login': sessionStorage.getItem("loginTime" || "")
                                                  }
                                      } : "";
      console.log(bHeaders);
      $http.get('/module/test/' + id + '?pid=' + pid + '&' + 'bLogin=' + bLogin,bHeaders).success(function (res) {
        $scope.test = {
          id: id,
          result: res.code,
          costTime: res.time + 'ms'
        };
        $scope.modalTitle = 1 === res.code ? '接口测试成功' : '接口返回值不符合校验规则';
        $scope.modalClass = 1 === res.code ? 'text-success' : 'text-danger';
        $scope.modalContent = '消耗时间：' + $scope.test.costTime + '\n' + res.message;
      }).error(function (res) {
        $scope.test = {
          id: id,
          result: res.code,
          costTime: res.time + 'ms'
        };
        $scope.modalTitle = '接口测试失败';
        $scope.modalContent = res.message;
      });
    };
    /**
     * 保存接口测试结果
     * @param  {String} id 接口_id
     * @return {[type]}    [description]
     */
    $scope.saveTest = function (id) {
      $http.put('/module/save', $scope.test).success(function (res){
        location.reload();
        console.log(res);
      });
    };
  }]);
  angular.bootstrap(document, ['indexApp']);
})(window, angular);
