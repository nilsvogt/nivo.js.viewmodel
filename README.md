# Implementation Of a Model View Binding

Syncronizes the model with the view and vice versa so every change in the model gets automatically reflected in the view.

```
	// Create the controller
	new nivo.Controller('MainCtrl', function($scope) {
		// Assign some defaults to the scope
		$scope.title = "Implementation Of a Model View Binding";
		$scope.contents = {
			copy: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam'
		}

		// Alter some models to see some changes
		setTimeout(function(){
			// whenever you want a model to be reflected in the view you need to call the set-method
			$scope.title += ' ...got extended'; // alter the model
			$scope.set('title'); // and trigger the update
		}, 1000	);

		setTimeout(function(){
			$scope.set('title', 'Some totally new title'); // or just pass a new value directly to the model
		}, 2000);
	});
```