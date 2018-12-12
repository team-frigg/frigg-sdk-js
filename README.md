```js
//optional events and delegates
var config = {
    'onProjectLoaded' : function(project) {},
    'onSceneLoaded' : function(scene, project){},
    'onMediaPlayed' : function(scene, project){},
    'onVariableChanged' : function(project, scene, variableName, variableValue){},

    "onTemplateLoaded" : {
        'livre': function(element, sceneData, frigg){},
        'chapitre': function(element, sceneData, frigg){},
        //others templates
    }
};

var frigg = new FRIGG.Client(config);
frigg.run(<project id>);
```