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
        entities: loadEntities
      }
    });
}]);


var loadEntities = function($http) {
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


entityman.directive('entityListing', function () {
  return {
    restrict: 'E',
    scope: {
      entities: '='
    },
    templateUrl: 'entity_listing.html',
    link: function (scope, element, attrs, model) {
      scope.shownEntities = [];

      scope.$watch('entities', function(entities) {
        if (!entities) return;

        var matching = [];
        entities.forEach(function(e) {
          if (['Fact', 'IngestedFile'].indexOf(e.type) == -1) {
            matching.push(e);
          }
        });

        scope.shownEntities = matching.sort(function(a, b) {
          var dist = b.fileIds.length - a.fileIds.length;
          if (dist == 0) {
            return a.label.localeCompare(b.label);
          }
          return dist;
        });
      });
    }
  };
});


entityman.controller('BaseController', function ($scope, $rootScope, $modal) {
  $rootScope.routeLoading = true;

  $rootScope.$on("$routeChangeStart", function (event, next, current) {
    $rootScope.routeLoading = true;
  });

  $rootScope.$on("$routeChangeSuccess", function (event, next, current) {
    $rootScope.routeLoading = false;
  });

  $scope.uploadFile = function() {
    var d = $modal.open({
      templateUrl: 'upload.html',
      controller: 'UploadController'
    });
  };
});


entityman.controller('UploadController', function($scope, $location, $modalInstance, Upload) {
  $scope.files = [];
  $scope.filenames = '';
  $scope.uploadMessage = null;

  $scope.close = function() {
    $modalInstance.dismiss('cancel');
  };

  $scope.setFiles = function(files) {
    $scope.files = files;
    $scope.uploadMessage = null;
    var names = $scope.files.map(function(f) {
      return f.name;
    });
    $scope.filenames = names.join(', ');
  };

  $scope.upload = function() {
    Upload.upload({
      url: baseUrl + '/entities/ingestSync/default',
      file: $scope.files
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
        }
      }
      $modalInstance.close('ok');
    }).error(function (data, status, headers, conf) {
      $scope.setFiles([]);
    });
  };
});


entityman.controller('IndexController', function ($scope, $location, entities) {
  var results = [];
  angular.forEach(entities.data.o, function(entities, type) {
    if (angular.isArray(entities)) {
      angular.forEach(entities, function(entity) {
        if (entity.fileIds && entity.fileIds.length > 1) {
          entity.type = type;
          results.push(entity);
        }
      });
    };
  });
  $scope.entities = results;
  $scope.files = entities.data.o.IngestedFile;
});


entityman.controller('FileController', function ($scope, $location, $routeParams, entities) {
  var fileId = $routeParams.id;
  var results = [];
  angular.forEach(entities.data.o, function(entities, type) {
    if (angular.isArray(entities)) {
      angular.forEach(entities, function(entity) {
        if (entity.fileIds.indexOf(fileId) != -1) {
          entity.type = type;
          results.push(entity);
        }
        if (entity.id == fileId) {
          $scope.file = entity;
        }
      });
    };
  });
  $scope.entities = results;
});


entityman.controller('EntityController', function ($scope, $location, $routeParams, entities) {
  var entityId = $routeParams.id, entityType = $routeParams.type;
  var results = [];
  $scope.entity = {};
  angular.forEach(entities.data.o, function(objs, type) {
    if (angular.isArray(objs)) {
      angular.forEach(objs, function(obj) {
        if (obj.id == entityId) {
          $scope.entity = obj;
          angular.forEach(entities.data.o.IngestedFile, function(file) {
            if (obj.fileIds.indexOf(file.id) != -1) {
              results.push(file);
            }
          });
        }
      });
    };
  });
  $scope.files = results;
});
