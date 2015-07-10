var entityman = angular.module('entityman', ['ngRoute', 'ngFileUpload']),
    baseUrl = 'http://entityman.pudo.org';

entityman.config(['$routeProvider',
  function($routeProvider) {
  $routeProvider.
    when('/', {
      templateUrl: 'index.html',
      controller: 'IndexController',
      reloadOnSearch: true,
      resolve: {
        entities: loadEntities
      }
    });
}]);

var loadEntities = function($http) {
  return $http.get(baseUrl + '/entities/workspace/default');
};

entityman.controller('IndexController', function ($scope, $location, Upload, entities) {
  var skipGroups = ['Fact', 'IngestedFile'];

  $scope.files = entities.data.o.IngestedFile;
  $scope.file = {};
  $scope.uploadMessage = null;

  $scope.getEntities = function() {
    var results = [];
    angular.forEach(entities.data.o, function(entities, type) {
      if (skipGroups.indexOf(type) != -1) {
        return;
      }
      angular.forEach(entities, function(entity) {
        entity.type = type;
        results.push(entity);
      });
    });
    return results;
  };

  $scope.setFile = function(files) {
    for (var i in files) {
      $scope.file = files[i];
    }
  };

  $scope.upload = function() {
    Upload.upload({
      url: baseUrl + '/entities/ingestSync/default',
      file: $scope.file
    }).progress(function (evt) {
      var pct = parseInt((evt.loaded / evt.total) * 100);
      if (pct >= 99) {
        $scope.uploadMessage = 'Processing the document...';
      } else {
        $scope.uploadMessage = pct + '% uploaded';
      }
    }).success(function (data, status, headers, config) {
      console.log('ok!', data);
      $scope.file = {};
      $scope.uploadMessage = null;
    }).error(function (data, status, headers, conf) {
      $scope.file = {};
      $scope.uploadMessage = null;
    });
  };


});
