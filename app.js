var entityman = angular.module('entityman', ['ngRoute', 'ngFileUpload', 'ui.bootstrap']),
    baseUrl = 'http://entityman.pudo.org';

entityman.config(['$routeProvider',
  function($routeProvider) {
  $routeProvider
    .when('/', {
      templateUrl: 'index.html',
      controller: 'IndexController',
      reloadOnSearch: true,
      resolve: {
        entities: loadEntities
      }
    })
    .when('/file/:id', {
      templateUrl: 'file.html',
      controller: 'FileController',
      reloadOnSearch: true,
      resolve: {
        entities: loadEntities
      }
    })
    .when('/entity/:type/:id', {
      templateUrl: 'entity.html',
      controller: 'EntityController',
      reloadOnSearch: true,
      resolve: {
        entity: loadEntity
      }
    });
}]);


var loadEntities = function($http) {
  return $http.get(baseUrl + '/entities/workspace/default');
};


var loadEntity = function($http) {
  return $http.get(baseUrl + '/entities/workspace/default');
};


entityman.directive('fileListing', function () {
  return {
    restrict: 'E',
    scope: {
      files: '='
    },
    templateUrl: 'file_listing.html',
    link: function (scope, element, attrs, model) {
      //console.log(scope);
    }
  };
});


entityman.controller('BaseController', function ($scope, $modal) {

  $scope.uploadFile = function() {
    var d = $modal.open({
      templateUrl: 'upload.html',
      controller: 'UploadController'
    });
  };

});


entityman.controller('UploadController', function($scope, $location, $modalInstance, Upload) {
  $scope.file = {};
  $scope.uploadMessage = null;

  $scope.close = function() {
    $modalInstance.dismiss('cancel');
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
      for (var i in data.o) {
        var entity = data.o[i];
        if (entity['class'].indexOf('IngestedFile') != -1) {
          $location.path('/file/' + entity.id);
          $modalInstance.close('ok');
        }
      }
      $scope.file = {};
      $scope.uploadMessage = null;
    }).error(function (data, status, headers, conf) {
      $scope.file = {};
      $scope.uploadMessage = null;
    });
  };

});


entityman.controller('IndexController', function ($scope, $location, entities) {
  var skipGroups = ['Fact', 'IngestedFile'];

  $scope.files = entities.data.o.IngestedFile;

  console.log($scope.files);

  $scope.getEntities = function() {
    var results = [];
    angular.forEach(entities.data.o, function(entities, type) {
      if (skipGroups.indexOf(type) != -1) {
        return;
      }
      // console.log(entities);
      if (!angular.isArray(entities)) {
        return;
      };
      angular.forEach(entities, function(entity) {
        // console.log(entity);
        entity.type = type;
        results.push(entity);
      });
    });
    return results;
  };

});


entityman.controller('FileController', function ($scope, $location, $routeParams, entities) {
  console.log(entities);
  console.log($routeParams);
});


entityman.controller('EntityController', function ($scope, $location, $routeParams, entities) {
  console.log(entities);
  console.log($routeParams);
});
