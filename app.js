var entityman = angular.module('entityman', ['ngRoute', 'ngFileUpload', 'ui.bootstrap']),
    baseUrl = 'http://entityman.pudo.org/ws';

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
        file: loadFile,
        entities: loadFileEntities
      }
    })
    .when('/entity/:type/:id', {
      templateUrl: 'entity.html',
      controller: 'EntityController',
      reloadOnSearch: true,
      resolve: {
        data: loadEntityFiles
      }
    });
}]);


var loadEntities = function($http) {
  return $http.get(baseUrl + '/entities/workspace/default');
};


var loadFileEntities = function($http, $route) {
  var fileId = $route.current.params.id;
  return $http.get(baseUrl + '/entities/AllByFileId/' + fileId);
};


var loadFile = function($http, $route) {
  var fileId = $route.current.params.id;
  return $http.get(baseUrl + '/entities/byId/IngestedFile/' + fileId);
};


var loadEntityFiles = function($http, $q, $route, $sce) {
  var entityId = $route.current.params.id,
      entityType = $route.current.params.type,
      result = {files: []},
      done = $q.defer();
  $q.all([
    $http.get(baseUrl + '/entities/byId/' + entityType + '/' + entityId),
    $http.get(baseUrl + '/entities/getFacts/' + entityType + '/' + entityId)
  ]).then(function(res) {
    result.entity = res[0].data.o;
    result.facts = res[1].data.o.map(function(fact) {
      var excerpt = fact.data.excerpt
      excerpt = excerpt.replace(result.entity.label, '<span class="hlt">' + result.entity.label + '</span>');
      if (fact.position > 0) {
        excerpt = '<span class="ell">...</span> ' + excerpt;
      }
      excerpt = excerpt + ' <span class="ell">...</span>';
      fact.snippet = $sce.trustAsHtml(excerpt);
      return fact;
    });
    var https = result.entity.fileIds.map(function(fileId) {
      return $http.get(baseUrl + '/entities/byId/IngestedFile/' + fileId);
    });
    $q.all(https).then(function(files) {
      files.forEach(function(file) {
        result.files.push(file.data.o);
      });
      done.resolve(result);
    });
  });
  return done.promise;
};


entityman.directive('fileListing', function () {
  return {
    restrict: 'E',
    scope: {
      files: '=',
      facts: '='
    },
    templateUrl: 'file_listing.html',
    link: function (scope, element, attrs, model) {

      scope.getDownloadUrl = function(fileId) {
        return baseUrl + '/entities/getFile/' + fileId;
      };

      scope.getFacts = function(fileId) {
        var facts = [];
        scope.facts.forEach(function(fact) {
          if (fact.fileIds.indexOf(fileId) != -1) {
            facts.push(fact);
          }
        });
        return facts;
      };

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
        if (entity.fileIds) {
          entity.type = type;
          results.push(entity);
        }
      });
    };
  });
  $scope.entities = results;
  $scope.facts = [];
  $scope.files = entities.data.o.IngestedFile;
});


entityman.controller('FileController', function ($scope, $location, $routeParams, file, entities) {
  var fileId = $routeParams.id;
  $scope.file = file.data.o;

  var results = [];
  angular.forEach(entities.data.o, function(entities, type) {
    if (angular.isArray(entities)) {
      angular.forEach(entities, function(entity) {
        entity.type = type;
        results.push(entity);
      });
    };
  });
  $scope.entities = results;
});


entityman.controller('EntityController', function ($scope, $location, $routeParams, data) {
  var entityId = $routeParams.id;
  $scope.entityType = $routeParams.type;
  $scope.entity = data.entity;
  $scope.facts = data.facts;
  $scope.files = data.files;
});
